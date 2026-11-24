/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import type { UserManagerLimitation } from "../../types";
import { generateCryptoVoucherCodes } from "../../constants/defaults.ts";
import type { GeneratorContext } from "./context.ts";
import {
  clampInt,
  escapeRosString,
  mbToBytes,
  normalizeRosRate,
  sanitizeRosIdentifier,
} from "./helpers.ts";

/**
 * Generates Section 9 (RADIUS, Incoming CoA, User Manager v7 & v6),
 * Section 10 (Housekeeping script & Schedulers), Section 11 (CSPRNG Batch Voucher Cards),
 * and the closing footer banner.
 */
export function generateUserManagerAndVouchersSection(ctx: GeneratorContext): string {
  const {
    config,
    isV7,
    effectiveAuthMode,
    useRadius,
    radServerIpSafe,
    coaPortSafe,
  } = ctx;

  let script = "";

  // 9. RADIUS & User Manager Setup
  if (useRadius) {
    const authPort = clampInt(config.radiusPort || 1812, 1, 65535, 1812);
    const acctPort = Math.min(65535, authPort + 1);
    const coaPort = coaPortSafe;
    const radTimeout = sanitizeRosIdentifier(config.radiusTimeout || "3000ms", "3000ms");
    const radServerIp = radServerIpSafe;
    const safeRadSecret = escapeRosString(config.radiusSecret);
    const safeUmRouter = escapeRosString(config.usermanRouterName);
    const safeUmAdminUser = escapeRosString(config.usermanAdminUser);
    const safeUmAdminPass = escapeRosString(config.usermanAdminPass);
    const srcAddressParam = radServerIp === "127.0.0.1" ? " src-address=127.0.0.1" : "";

    const umLims = config.umLimitations || [];
    const limById = new Map<string, UserManagerLimitation>(umLims.map((l) => [l.id, l]));
    const umProfs = config.umProfiles || [];
    const umGroups = config.umGroups || [];

    script += `# ---------------------------------------------------------------------\n`;
    script += `# 9. RADIUS Client & User Manager Setup (${isV7 ? "RouterOS v7 Syntax" : "RouterOS v6 Syntax"})\n`;
    script += `# ---------------------------------------------------------------------\n`;
    script += `# MikroTik RADIUS Client Configuration\n`;
    script += `/radius\n`;
    script += `add service=hotspot address=${radServerIp} secret="${safeRadSecret}" authentication-port=${authPort} accounting-port=${acctPort} timeout=${radTimeout}${srcAddressParam} comment="Radius link for User Manager"\n\n`;

    script += `/radius incoming\n`;
    script += `set accept=yes port=${coaPort}\n\n`;

    if (isV7) {
      // RouterOS v7 User Manager Syntax (/user-manager ...)
      script += `# RouterOS v7 User Manager Configuration\n`;
      script += `/user-manager\n`;
      script += `set enabled=yes\n\n`;

      script += `/user-manager router remove [ find name="${safeUmRouter}" ]\n`;
      script += `/user-manager router\n`;
      script += `add name="${safeUmRouter}" address=${radServerIp} shared-secret="${safeRadSecret}" coa-port=${coaPort}\n\n`;

      if (umGroups.length > 0) {
        umGroups.forEach((grp) => {
          script += `/user-manager user group remove [ find name="${escapeRosString(grp.name)}" ]\n`;
        });
        script += `/user-manager user group\n`;
        umGroups.forEach((grp) => {
          const outerStr = (grp.outerAuths || []).map((a) => sanitizeRosIdentifier(a, "")).filter(Boolean).join(",");
          const innerStr = (grp.innerAuths || []).map((a) => sanitizeRosIdentifier(a, "")).filter(Boolean).join(",");
          const attrParts: string[] = [];
          const mg = sanitizeRosIdentifier(grp.mikrotikGroup || "", "");
          const al = sanitizeRosIdentifier(grp.addressList || "", "");
          const fp = sanitizeRosIdentifier(grp.framedPool || "", "");
          if (mg) attrParts.push(`Mikrotik-Group:${mg}`);
          if (al) attrParts.push(`Mikrotik-Address-List:${al}`);
          if (fp) attrParts.push(`Framed-Pool:${fp}`);

          const parts = [
            `name="${escapeRosString(grp.name)}"`,
            outerStr ? `outer-auths=${outerStr}` : "",
            innerStr ? `inner-auths=${innerStr}` : "",
            attrParts.length > 0 ? `attributes="${escapeRosString(attrParts.join(","))}"` : "",
          ].filter(Boolean);
          script += `add ${parts.join(" ")}\n`;
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
          const parts = [
            `name="${safeLimName}"`,
            `rate-limit-rx=${rx}`,
            `rate-limit-tx=${tx}`,
          ];

          const minRx = normalizeRosRate(lim.rateLimitMinRx || "");
          const minTx = normalizeRosRate(lim.rateLimitMinTx || "");
          if (minRx) parts.push(`rate-limit-min-rx=${minRx}`);
          if (minTx) parts.push(`rate-limit-min-tx=${minTx}`);

          if (lim.rateLimitBurstRx?.trim() || lim.rateLimitBurstTx?.trim()) {
            const bRx = normalizeRosRate(lim.rateLimitBurstRx || "") || rx;
            const bTx = normalizeRosRate(lim.rateLimitBurstTx || "") || tx;
            const btRx = normalizeRosRate(lim.rateLimitBurstThresholdRx || "") || rx;
            const btTx = normalizeRosRate(lim.rateLimitBurstThresholdTx || "") || tx;
            const bTimeRx = sanitizeRosIdentifier(lim.rateLimitBurstTimeRx || "8s", "8s");
            const bTimeTx = sanitizeRosIdentifier(lim.rateLimitBurstTimeTx || lim.rateLimitBurstTimeRx || "8s", "8s");
            parts.push(
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
            parts.push(`rate-limit-priority=${Math.min(8, Math.max(1, prio))}`);
          }

          if (lim.transferLimitMb && lim.transferLimitMb > 0) {
            parts.push(`transfer-limit=${mbToBytes(lim.transferLimitMb)}`);
          }
          if (lim.downloadLimitMb && lim.downloadLimitMb > 0) {
            parts.push(`download-limit=${mbToBytes(lim.downloadLimitMb)}`);
          }
          if (lim.uploadLimitMb && lim.uploadLimitMb > 0) {
            parts.push(`upload-limit=${mbToBytes(lim.uploadLimitMb)}`);
          }
          if (lim.uptimeLimit?.trim() && lim.uptimeLimit.trim() !== "00:00:00" && lim.uptimeLimit.trim() !== "0s") {
            parts.push(`uptime-limit=${sanitizeRosIdentifier(lim.uptimeLimit, "0s")}`);
          }
          if (lim.resetCountersInterval && lim.resetCountersInterval !== "disabled") {
            parts.push(`reset-counters-interval=${lim.resetCountersInterval}`);
            if (lim.resetCountersStartTime?.trim()) {
              parts.push(`reset-counters-start-time=${sanitizeRosIdentifier(lim.resetCountersStartTime, "00:00:00")}`);
            }
          }

          script += `add ${parts.join(" ")}\n`;
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

            script += `/user-manager profile\n`;
            script += `add name="${safeProfName}" name-for-users="${safeDisplayName}" price=${prof.price || 0} validity=${validity} starts-when=${startsWhen} override-shared-users=${overrideShared}\n`;

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

      script += `/tool user-manager router\n`;
      script += `add customer="${safeUmAdminUser}" name="${safeUmRouter}" ip-address=${radServerIp} shared-secret="${safeRadSecret}" use-coa=yes coa-port=${coaPort} comment="Connect UM Router"\n\n`;

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

          const parts = [
            `owner="${safeUmAdminUser}"`,
            `name="${safeLimName}"`,
            `rate-limit-rx=${rx}`,
            `rate-limit-tx=${tx}`,
          ];

          const minRx = normalizeRosRate(lim.rateLimitMinRx || "");
          const minTx = normalizeRosRate(lim.rateLimitMinTx || "");
          if (minRx) parts.push(`rate-limit-min-rx=${minRx}`);
          if (minTx) parts.push(`rate-limit-min-tx=${minTx}`);

          if (lim.rateLimitBurstRx?.trim() || lim.rateLimitBurstTx?.trim()) {
            const bRx = normalizeRosRate(lim.rateLimitBurstRx || "") || rx;
            const bTx = normalizeRosRate(lim.rateLimitBurstTx || "") || tx;
            const btRx = normalizeRosRate(lim.rateLimitBurstThresholdRx || "") || rx;
            const btTx = normalizeRosRate(lim.rateLimitBurstThresholdTx || "") || tx;
            const bTimeRx = sanitizeRosIdentifier(lim.rateLimitBurstTimeRx || "8s", "8s");
            const bTimeTx = sanitizeRosIdentifier(lim.rateLimitBurstTimeTx || lim.rateLimitBurstTimeRx || "8s", "8s");
            parts.push(
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
            parts.push(`rate-limit-priority=${Math.min(8, Math.max(1, prio))}`);
          }

          if (transferBytes > 0) parts.push(`transfer-limit=${transferBytes}`);
          if (dlBytes > 0) parts.push(`download-limit=${dlBytes}`);
          if (ulBytes > 0) parts.push(`upload-limit=${ulBytes}`);
          if (transferBytes === 0 && dlBytes === 0 && ulBytes === 0) {
            parts.push(`transfer-limit=0`);
          }

          if (lim.uptimeLimit?.trim() && lim.uptimeLimit.trim() !== "00:00:00" && lim.uptimeLimit.trim() !== "0s") {
            const up = lim.uptimeLimit.trim();
            if (/^\d{1,2}:\d{2}:\d{2}$/.test(up)) {
              const [h, m, s] = up.split(":").map(Number);
              parts.push(`uptime-limit=${(h || 0) * 3600 + (m || 0) * 60 + (s || 0)}s`);
            } else {
              parts.push(`uptime-limit=${sanitizeRosIdentifier(up, "0s")}`);
            }
          }

          if (lim.v6GroupName?.trim()) parts.push(`group-name="${escapeRosString(lim.v6GroupName.trim())}"`);
          if (lim.v6IpPool?.trim()) parts.push(`ip-pool="${escapeRosString(lim.v6IpPool.trim())}"`);
          if (lim.v6AddressList?.trim()) parts.push(`address-list="${escapeRosString(lim.v6AddressList.trim())}"`);

          script += `add ${parts.join(" ")}\n`;
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

            script += `/tool user-manager profile\n`;
            script += `add owner="${safeUmAdminUser}" name="${safeProfName}" name-for-users="${safeDisplayName}" validity=${v6Validity} price=${prof.price || 0} starts-at=${startsAt} override-shared-users=${overrideShared}\n`;

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
  if (config.enableAutoCleanScript || config.enableScheduledReboot) {
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
    }

    if (config.enableScheduledReboot) {
      script += `/system scheduler remove [ find name=schedule_weekly_reboot ]\n`;
      script += `/system scheduler\n`;
      script += `add name=schedule_weekly_reboot interval=7d start-time=04:00:00 on-event="/system reboot" comment="Weekly router reboot for RAM refresh"\n\n`;
    }
  }

  // 11. Batch Voucher Cards Generator (CSPRNG-generated in browser; works across all v6 & v7 versions)
  if (config.generateVouchersBatch && config.voucherCount > 0) {
    const voucherCount = clampInt(config.voucherCount, 1, 500, 20);
    const voucherLen = clampInt(config.voucherLength || 4, 3, 32, 4);
    const safePrefix = sanitizeRosIdentifier(config.voucherPrefix || "", "");
    const safeTargetProf = escapeRosString(config.voucherSelectedProfile);
    const safeUmCustomer = escapeRosString(config.usermanAdminUser);
    const voucherTarget =
      effectiveAuthMode === "hotspot_only"
        ? "hotspot"
        : effectiveAuthMode === "userman_radius"
          ? "userman"
          : (config.voucherTarget === "hotspot" ? "hotspot" : "userman");

    const precomputed = (config.voucherCodes || []).filter(
      (c) => typeof c === "string" && c.length === voucherLen && /^[0-9a-z]+$/i.test(c)
    );
    const suffixes =
      precomputed.length === voucherCount
        ? precomputed
        : generateCryptoVoucherCodes(voucherCount, voucherLen);

    const fullCodes = suffixes.map((s) => `${safePrefix}${s}`);

    script += `# ---------------------------------------------------------------------\n`;
    script += `# 11. Batch Voucher Cards Generator / سكربت توليد الكروت العشوائية بالجملة\n`;
    script += `# ---------------------------------------------------------------------\n`;
    script += `# Generates ${fullCodes.length} CSPRNG ${voucherTarget === "userman" ? "User Manager" : "Local Hotspot"} cards (username = password) for profile "${safeTargetProf}"\n`;

    for (let i = 0; i < fullCodes.length; i += 8) {
      script += `# Codes [${i + 1}-${Math.min(i + 8, fullCodes.length)}]: ${fullCodes.slice(i, i + 8).join(", ")}\n`;
    }

    const shared = clampInt(config.voucherSharedUsers || 1, 1, 100, 1);
    const groupAttr = config.voucherUmGroup?.trim()
      ? ` group="${escapeRosString(config.voucherUmGroup.trim())}"`
      : "";
    const limitUptime = config.voucherLocalLimitUptime?.trim() && config.voucherLocalLimitUptime.trim() !== "0s"
      ? ` limit-uptime=${sanitizeRosIdentifier(config.voucherLocalLimitUptime.trim(), "1d")}`
      : "";
    const limitBytes = config.voucherLocalLimitBytesMb && config.voucherLocalLimitBytesMb > 0
      ? ` limit-bytes-total=${mbToBytes(config.voucherLocalLimitBytesMb)}`
      : "";

    fullCodes.forEach((rawCode) => {
      const code = escapeRosString(rawCode);
      if (voucherTarget === "userman") {
        if (isV7) {
          script += `:if ([:len [/user-manager user find name="${code}"]] = 0) do={ /user-manager user add name="${code}" password="${code}"${groupAttr} shared-users=${shared}; /user-manager user-profile add user="${code}" profile="${safeTargetProf}" }\n`;
        } else {
          script += `:if ([:len [/tool user-manager user find username="${code}"]] = 0) do={ /tool user-manager user add username="${code}" password="${code}" customer="${safeUmCustomer}" shared-users=${shared}; /tool user-manager user create-and-activate-profile numbers=[find username="${code}"] customer="${safeUmCustomer}" profile="${safeTargetProf}" }\n`;
        }
      } else {
        script += `:if ([:len [/ip hotspot user find name="${code}"]] = 0) do={ /ip hotspot user add name="${code}" password="${code}" profile="${safeTargetProf}"${limitUptime}${limitBytes} }\n`;
      }
    });
    script += `\n`;
  }

  script += `# =====================================================================\n`;
  script += `#  Hotspot & Load Balancing script generation complete!\n`;
  script += `#  Copy and paste this script into Winbox > New Terminal.\n`;
  script += `# =====================================================================\n`;

  return script;
}
