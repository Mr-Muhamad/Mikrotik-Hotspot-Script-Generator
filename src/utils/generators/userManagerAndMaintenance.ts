/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import type { UserManagerLimitation } from "../../types";
import type { GeneratorContext } from "./context.ts";
import {
  clampInt,
  escapeRosString,
  mbToBytes,
  normalizeRosRate,
  parseIpv4ToInt,
  sanitizeIpv4,
  sanitizeRosIdentifier,
} from "./helpers.ts";

/**
 * Generates Section 9 (RADIUS, Incoming CoA, User Manager v7 & v6),
 * Section 10 (Housekeeping script & Schedulers),
 * and the closing footer banner.
 */
export function generateUserManagerAndMaintenanceSection(ctx: GeneratorContext): string {
  const {
    config,
    isV7,
    useRadius,
    isExternalRadius,
    radServerIpSafe,
    coaPortSafe,
  } = ctx;

  let script = "";

  // 9. RADIUS & User Manager Setup
  if (useRadius) {
    const authPort = clampInt(config.radiusPort || 1812, 1, 65535, 1812);
    const acctPort = clampInt(config.radiusAcctPort || (authPort + 1), 1, 65535, Math.min(65535, authPort + 1));
    const coaPort = coaPortSafe;
    const radTimeout = sanitizeRosIdentifier(config.radiusTimeout || "3000ms", "3000ms");
    const radServerIp = radServerIpSafe;
    const safeRadSecret = escapeRosString(config.radiusSecret);
    const safeUmRouter = escapeRosString(config.usermanRouterName);
    const safeUmAdminUser = escapeRosString(config.usermanAdminUser);
    const safeUmAdminPass = escapeRosString(config.usermanAdminPass);
    const trimmedSrcIp = (config.radiusSrcAddress || "").trim();
    const srcAddressParam = radServerIp === "127.0.0.1"
      ? " src-address=127.0.0.1"
      : (trimmedSrcIp && parseIpv4ToInt(trimmedSrcIp) !== null
          ? ` src-address=${sanitizeIpv4(trimmedSrcIp, "")}`
          : "");
    const radiusComment = isExternalRadius ? "External RADIUS Server for Hotspot" : "Radius link for User Manager";

    const umLims = config.umLimitations || [];
    const limById = new Map<string, UserManagerLimitation>(umLims.map((l) => [l.id, l]));
    const umProfs = config.umProfiles || [];
    const umGroups = config.umGroups || [];

    script += `# ---------------------------------------------------------------------\n`;
    script += `# 9. RADIUS Client & User Manager Setup (${isExternalRadius ? "Standalone External RADIUS" : isV7 ? "RouterOS v7 Syntax" : "RouterOS v6 Syntax"})\n`;
    script += `# ---------------------------------------------------------------------\n`;
    script += `# MikroTik RADIUS Client Configuration\n`;
    script += `/radius remove [ find where comment="Radius link for User Manager" or comment="External RADIUS Server for Hotspot" ]\n`;
    script += `/radius\n`;
    script += `add service=hotspot address=${radServerIp} secret="${safeRadSecret}" authentication-port=${authPort} accounting-port=${acctPort} timeout=${radTimeout}${srcAddressParam} comment="${radiusComment}"\n`;
    const parseSafeRadCmd = escapeRosString(`/radius set [ find where comment="${radiusComment}" ] require-message-auth=no`);
    script += `:do { [[:parse "${parseSafeRadCmd}"]] } on-error={}\n\n`;

    script += `/radius incoming\n`;
    script += `set accept=yes port=${coaPort}\n\n`;

    if (isExternalRadius) {
      script += `# Standalone External RADIUS mode: local MikroTik User Manager commands omitted\n\n`;
    } else if (isV7) {
      // RouterOS v7 User Manager Syntax (/user-manager ...)
      script += `# RouterOS v7 User Manager Configuration\n`;
      script += `/user-manager\n`;
      script += `set enabled=yes use-profiles=yes\n\n`;

      script += `/user-manager router\n`;
      script += `:if ([:len [find name="${safeUmRouter}"]] > 0) do={ set [find name="${safeUmRouter}"] address=${radServerIp} shared-secret="${safeRadSecret}" coa-port=${coaPort} } else={ :if ([:len [find address=${radServerIp}]] > 0) do={ set [find address=${radServerIp}] shared-secret="${safeRadSecret}" coa-port=${coaPort} } else={ add name="${safeUmRouter}" address=${radServerIp} shared-secret="${safeRadSecret}" coa-port=${coaPort} } }\n\n`;

      if (umGroups.length > 0) {
        script += `/user-manager user group\n`;
        umGroups.forEach((grp) => {
          const safeGrpName = escapeRosString(grp.name);
          const outerStr = (grp.outerAuths || []).map((a) => sanitizeRosIdentifier(a, "")).filter(Boolean).join(",");
          const innerStr = (grp.innerAuths || []).map((a) => sanitizeRosIdentifier(a, "")).filter(Boolean).join(",");
          const attrParts: string[] = [];
          const mg = sanitizeRosIdentifier(grp.mikrotikGroup || "", "");
          const al = sanitizeRosIdentifier(grp.addressList || "", "");
          const fp = sanitizeRosIdentifier(grp.framedPool || "", "");
          if (mg) attrParts.push(`Mikrotik-Group:${mg}`);
          if (al) attrParts.push(`Mikrotik-Address-List:${al}`);
          if (fp) attrParts.push(`Framed-Pool:${fp}`);

          const grpSetParts = [
            outerStr ? `outer-auths=${outerStr}` : "",
            innerStr ? `inner-auths=${innerStr}` : "",
            attrParts.length > 0 ? `attributes="${escapeRosString(attrParts.join(","))}"` : "",
          ].filter(Boolean);
          const setClause = grpSetParts.length > 0 ? `set [find name="${safeGrpName}"] ${grpSetParts.join(" ")}` : `:nothing`;
          const addClause = [`name="${safeGrpName}"`, ...grpSetParts].join(" ");
          script += `:if ([:len [find name="${safeGrpName}"]] > 0) do={ ${setClause} } else={ add ${addClause} }\n`;
        });
        script += `\n`;
      }

      if (config.syncProfilesToUserman && umLims.length > 0) {
        script += `# User Manager v7 Limitations (RX = Client Upload, TX = Client Download)\n`;
        script += `/user-manager limitation\n`;
        umLims.forEach((lim) => {
          const safeLimName = escapeRosString(lim.name);
          const rx = normalizeRosRate(lim.rateLimitRx) || "512k";
          const tx = normalizeRosRate(lim.rateLimitTx) || "2M";
          const limSetParts = [
            `rate-limit-rx=${rx}`,
            `rate-limit-tx=${tx}`,
          ];

          const minRx = normalizeRosRate(lim.rateLimitMinRx || "");
          const minTx = normalizeRosRate(lim.rateLimitMinTx || "");
          if (minRx) limSetParts.push(`rate-limit-min-rx=${minRx}`);
          if (minTx) limSetParts.push(`rate-limit-min-tx=${minTx}`);

          if (lim.rateLimitBurstRx?.trim() || lim.rateLimitBurstTx?.trim()) {
            const bRx = normalizeRosRate(lim.rateLimitBurstRx || "") || rx;
            const bTx = normalizeRosRate(lim.rateLimitBurstTx || "") || tx;
            const btRx = normalizeRosRate(lim.rateLimitBurstThresholdRx || "") || rx;
            const btTx = normalizeRosRate(lim.rateLimitBurstThresholdTx || "") || tx;
            const bTimeRx = sanitizeRosIdentifier(lim.rateLimitBurstTimeRx || "8s", "8s");
            const bTimeTx = sanitizeRosIdentifier(lim.rateLimitBurstTimeTx || lim.rateLimitBurstTimeRx || "8s", "8s");
            limSetParts.push(
              `rate-limit-burst-rx=${bRx}`,
              `rate-limit-burst-tx=${bTx}`,
              `rate-limit-burst-threshold-rx=${btRx}`,
              `rate-limit-burst-threshold-tx=${btTx}`,
              `rate-limit-burst-time-rx=${bTimeRx}`,
              `rate-limit-burst-time-tx=${bTimeTx}`
            );
          }

          const prio = lim.rateLimitPriority || 8;
          if (prio !== 8 || lim.rateLimitBurstRx?.trim() || lim.rateLimitBurstTx?.trim()) {
            limSetParts.push(`rate-limit-priority=${Math.min(8, Math.max(1, prio))}`);
          }

          if (lim.transferLimitMb && lim.transferLimitMb > 0) {
            limSetParts.push(`transfer-limit=${mbToBytes(lim.transferLimitMb)}`);
          }
          if (lim.downloadLimitMb && lim.downloadLimitMb > 0) {
            limSetParts.push(`download-limit=${mbToBytes(lim.downloadLimitMb)}`);
          }
          if (lim.uploadLimitMb && lim.uploadLimitMb > 0) {
            limSetParts.push(`upload-limit=${mbToBytes(lim.uploadLimitMb)}`);
          }
          if (lim.uptimeLimit?.trim() && lim.uptimeLimit.trim() !== "00:00:00" && lim.uptimeLimit.trim() !== "0s") {
            limSetParts.push(`uptime-limit=${sanitizeRosIdentifier(lim.uptimeLimit, "0s")}`);
          }
          if (lim.resetCountersInterval && lim.resetCountersInterval !== "disabled") {
            limSetParts.push(`reset-counters-interval=${lim.resetCountersInterval}`);
            if (lim.resetCountersStartTime?.trim()) {
              limSetParts.push(`reset-counters-start-time=${sanitizeRosIdentifier(lim.resetCountersStartTime, "00:00:00")}`);
            }
          }

          const limSetStr = limSetParts.join(" ");
          script += `:if ([:len [find name="${safeLimName}"]] > 0) do={ set [find name="${safeLimName}"] ${limSetStr} } else={ add name="${safeLimName}" ${limSetStr} }\n`;
        });
        script += `\n`;

        if (umProfs.length > 0) {
          script += `# User Manager v7 Profiles & Scheduled Profile-Limitations\n`;
          umProfs.forEach((prof) => {
            const safeProfName = escapeRosString(prof.name);
            const safeDisplayName = escapeRosString(prof.nameForUsers || prof.name);
            const validity = prof.validity?.trim() ? sanitizeRosIdentifier(prof.validity, "unlimited") : "unlimited";
            const startsWhen = prof.startsWhen || "first-auth";
            const overrideShared = sanitizeRosIdentifier(prof.overrideSharedUsers || "1", "1");
            const profSetParams = `name-for-users="${safeDisplayName}" price=${prof.price || 0} validity=${validity} starts-when=${startsWhen} override-shared-users=${overrideShared}`;

            script += `/user-manager profile\n`;
            script += `:if ([:len [find name="${safeProfName}"]] > 0) do={ set [find name="${safeProfName}"] ${profSetParams} } else={ add name="${safeProfName}" ${profSetParams} }\n`;
            script += `/user-manager profile-limitation remove [ find where profile="${safeProfName}" ]\n`;

            const validBindings = (prof.limitations || []).filter((b) => limById.has(b.limitationId));
            if (validBindings.length > 0) {
              script += `/user-manager profile-limitation\n`;
              validBindings.forEach((b) => {
                const lim = limById.get(b.limitationId)!;
                const safeLimName = escapeRosString(lim.name);
                const fromT = sanitizeRosIdentifier(b.fromTime || "00:00:00", "00:00:00");
                const tillT = sanitizeRosIdentifier(b.tillTime || "23:59:59", "23:59:59");
                const days = (b.weekdays && b.weekdays.length > 0
                  ? b.weekdays
                  : ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
                ).join(",");
                script += `add profile="${safeProfName}" limitation="${safeLimName}" from-time=${fromT} till-time=${tillT} weekdays=${days}\n`;
              });
            }
            script += `\n`;
          });
        }
      }
    } else {
      // RouterOS v6 User Manager Syntax (/tool user-manager ...)
      script += `# RouterOS v6 User Manager Local Configuration\n`;
      script += `/tool user-manager customer\n`;
      script += `:if ([:len [find login="${safeUmAdminUser}"]] = 0) do={ add login="${safeUmAdminUser}" password="${safeUmAdminPass}" permissions=owner comment="UM Master Account" }\n\n`;

      const v6RouterSet = `ip-address=${radServerIp} shared-secret="${safeRadSecret}" use-coa=yes coa-port=${coaPort} comment="Connect UM Router"`;
      script += `/tool user-manager router\n`;
      script += `:if ([:len [find name="${safeUmRouter}"]] > 0) do={ set [find name="${safeUmRouter}"] ${v6RouterSet} } else={ :if ([:len [find ip-address=${radServerIp}]] > 0) do={ set [find ip-address=${radServerIp}] ${v6RouterSet} } else={ add customer="${safeUmAdminUser}" name="${safeUmRouter}" ${v6RouterSet} } }\n\n`;

      if (config.syncProfilesToUserman && umLims.length > 0) {
        script += `# User Manager v6 Limitations (RX = Client Upload, TX = Client Download)\n`;
        script += `/tool user-manager profile limitation\n`;
        umLims.forEach((lim) => {
          const safeLimName = escapeRosString(lim.name);
          const rx = normalizeRosRate(lim.rateLimitRx) || "512k";
          const tx = normalizeRosRate(lim.rateLimitTx) || "2M";
          const transferBytes = lim.transferLimitMb && lim.transferLimitMb > 0 ? mbToBytes(lim.transferLimitMb) : 0;
          const dlBytes = lim.downloadLimitMb && lim.downloadLimitMb > 0 ? mbToBytes(lim.downloadLimitMb) : 0;
          const ulBytes = lim.uploadLimitMb && lim.uploadLimitMb > 0 ? mbToBytes(lim.uploadLimitMb) : 0;

          // Note: RouterOS v6 allows owner= on add, but NOT on set
          const v6LimSetParts = [
            `rate-limit-rx=${rx}`,
            `rate-limit-tx=${tx}`,
          ];

          const minRx = normalizeRosRate(lim.rateLimitMinRx || "");
          const minTx = normalizeRosRate(lim.rateLimitMinTx || "");
          if (minRx) v6LimSetParts.push(`rate-limit-min-rx=${minRx}`);
          if (minTx) v6LimSetParts.push(`rate-limit-min-tx=${minTx}`);

          if (lim.rateLimitBurstRx?.trim() || lim.rateLimitBurstTx?.trim()) {
            const bRx = normalizeRosRate(lim.rateLimitBurstRx || "") || rx;
            const bTx = normalizeRosRate(lim.rateLimitBurstTx || "") || tx;
            const btRx = normalizeRosRate(lim.rateLimitBurstThresholdRx || "") || rx;
            const btTx = normalizeRosRate(lim.rateLimitBurstThresholdTx || "") || tx;
            const bTimeRx = sanitizeRosIdentifier(lim.rateLimitBurstTimeRx || "8s", "8s");
            const bTimeTx = sanitizeRosIdentifier(lim.rateLimitBurstTimeTx || lim.rateLimitBurstTimeRx || "8s", "8s");
            v6LimSetParts.push(
              `rate-limit-burst-rx=${bRx}`,
              `rate-limit-burst-tx=${bTx}`,
              // RouterOS v6 User Manager limitation spells these properties without the first "h"
              `rate-limit-burst-treshold-rx=${btRx}`,
              `rate-limit-burst-treshold-tx=${btTx}`,
              `rate-limit-burst-time-rx=${bTimeRx}`,
              `rate-limit-burst-time-tx=${bTimeTx}`
            );
          }

          const prio = lim.rateLimitPriority || 8;
          if (prio !== 8 || lim.rateLimitBurstRx?.trim() || lim.rateLimitBurstTx?.trim()) {
            v6LimSetParts.push(`rate-limit-priority=${Math.min(8, Math.max(1, prio))}`);
          }

          if (transferBytes > 0) v6LimSetParts.push(`transfer-limit=${transferBytes}`);
          if (dlBytes > 0) v6LimSetParts.push(`download-limit=${dlBytes}`);
          if (ulBytes > 0) v6LimSetParts.push(`upload-limit=${ulBytes}`);
          if (transferBytes === 0 && dlBytes === 0 && ulBytes === 0) {
            v6LimSetParts.push(`transfer-limit=0`);
          }

          if (lim.uptimeLimit?.trim() && lim.uptimeLimit.trim() !== "00:00:00" && lim.uptimeLimit.trim() !== "0s") {
            const up = lim.uptimeLimit.trim();
            if (/^\d{1,2}:\d{2}:\d{2}$/.test(up)) {
              const [h, m, s] = up.split(":").map(Number);
              v6LimSetParts.push(`uptime-limit=${(h || 0) * 3600 + (m || 0) * 60 + (s || 0)}s`);
            } else {
              v6LimSetParts.push(`uptime-limit=${sanitizeRosIdentifier(up, "0s")}`);
            }
          }

          if (lim.v6GroupName?.trim()) v6LimSetParts.push(`group-name="${escapeRosString(lim.v6GroupName.trim())}"`);
          if (lim.v6IpPool?.trim()) v6LimSetParts.push(`ip-pool="${escapeRosString(lim.v6IpPool.trim())}"`);
          if (lim.v6AddressList?.trim()) v6LimSetParts.push(`address-list="${escapeRosString(lim.v6AddressList.trim())}"`);

          const v6LimSetStr = v6LimSetParts.join(" ");
          script += `:if ([:len [find name="${safeLimName}"]] > 0) do={ set [find name="${safeLimName}"] ${v6LimSetStr} } else={ add owner="${safeUmAdminUser}" name="${safeLimName}" ${v6LimSetStr} }\n`;
        });
        script += `\n`;

        if (umProfs.length > 0) {
          script += `# User Manager v6 Profiles & Scheduled Profile-Limitations\n`;
          umProfs.forEach((prof) => {
            const safeProfName = escapeRosString(prof.name);
            const safeDisplayName = escapeRosString(prof.nameForUsers || prof.name);
            const startsAt = prof.startsWhen === "assigned" ? "now" : "logon";
            const rawVal = (prof.validity || "").trim();
            const v6Validity = !rawVal || rawVal === "unlimited" ? "0s" : sanitizeRosIdentifier(rawVal, "30d");
            const overrideShared = sanitizeRosIdentifier(prof.overrideSharedUsers || "1", "1");
            const v6ProfSet = `name-for-users="${safeDisplayName}" validity=${v6Validity} price=${prof.price || 0} starts-at=${startsAt} override-shared-users=${overrideShared}`;

            script += `/tool user-manager profile\n`;
            script += `:if ([:len [find name="${safeProfName}"]] > 0) do={ set [find name="${safeProfName}"] ${v6ProfSet} } else={ add owner="${safeUmAdminUser}" name="${safeProfName}" ${v6ProfSet} }\n`;
            script += `/tool user-manager profile profile-limitation remove [ find where profile="${safeProfName}" ]\n`;

            const validBindings = (prof.limitations || []).filter((b) => limById.has(b.limitationId));
            if (validBindings.length > 0) {
              script += `/tool user-manager profile profile-limitation\n`;
              validBindings.forEach((b) => {
                const lim = limById.get(b.limitationId)!;
                const safeLimName = escapeRosString(lim.name);
                const fromT = sanitizeRosIdentifier(b.fromTime || "00:00:00", "00:00:00");
                const tillT = sanitizeRosIdentifier(b.tillTime || "23:59:59", "23:59:59");
                const days = (b.weekdays && b.weekdays.length > 0
                  ? b.weekdays
                  : ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
                ).join(",");
                script += `add profile="${safeProfName}" limitation="${safeLimName}" from-time=${fromT} till-time=${tillT} weekdays=${days}\n`;
              });
            }
            script += `\n`;
          });
        }
      }
    }
  }

  // 10. Automated Maintenance & Scheduler
  script += `# ---------------------------------------------------------------------\n`;
  script += `# 10. System Scheduler & Housekeeping / سكربتات الصيانة والتنظيف التلقائي\n`;
  script += `# ---------------------------------------------------------------------\n`;

  if (config.enableAutoCleanScript) {
    script += `/system script remove [ find name=clean_hotspot_hosts ]\n`;
    script += `/system script\n`;
    script += `add name=clean_hotspot_hosts source=":foreach i in=[/ip hotspot host find where !authorized] do={ /ip hotspot host remove \\$i }"\n`;
    script += `/system scheduler remove [ find name=schedule_clean_hosts ]\n`;
    script += `/system scheduler\n`;
    script += `add name=schedule_clean_hosts interval=1d start-time=03:00:00 on-event=clean_hotspot_hosts comment="Clean unauthenticated host cache daily at 3 AM"\n\n`;
  } else {
    script += `/system scheduler remove [ find name=schedule_clean_hosts ]\n`;
    script += `/system script remove [ find name=clean_hotspot_hosts ]\n`;
  }

  if (config.enableScheduledReboot) {
    script += `/system scheduler remove [ find name=schedule_weekly_reboot ]\n`;
    script += `/system scheduler\n`;
    script += `add name=schedule_weekly_reboot interval=7d start-time=04:00:00 on-event="/system reboot" comment="Weekly router reboot for RAM refresh"\n\n`;
  } else {
    script += `/system scheduler remove [ find name=schedule_weekly_reboot ]\n\n`;
  }

  script += `# =====================================================================\n`;
  script += `#  Hotspot & Load Balancing script generation complete!\n`;
  script += `#  Copy and paste this script into Winbox > New Terminal.\n`;
  script += `# =====================================================================\n`;

  return script;
}
