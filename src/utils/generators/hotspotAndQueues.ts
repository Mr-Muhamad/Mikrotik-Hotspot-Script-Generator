/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import type { GeneratorContext } from "./context.ts";
import {
  buildLocalExpiryOnLoginScript,
  buildRateLimitString,
  clampInt,
  escapeRosString,
  normalizeRosRate,
  sanitizeRosIdentifier,
} from "./helpers.ts";

/**
 * Generates Section 5 (CAKE/FQ-CoDel Queue Types, hs-parent-queue, /ip hotspot user profile),
 * Section 6 (Hotspot Server Profile, Server, per-VLAN Hotspots, IP Bindings),
 * and Section 7 (Walled Garden HTTP & IP).
 */
export function generateHotspotAndQueuesSection(ctx: GeneratorContext): string {
  const {
    config,
    hotspotProfiles,
    isV7,
    useRadius,
    emitLocalHotspotProfiles,
    effectiveLan,
    poolName,
    serverName,
    mainDnsName,
    effectiveHtmlDir,
    safeGatewayIp,
    safeSubnetMask,
    networkAddress,
    hasVlans,
    resolvedVlans,
    hotspotEnabledVlans,
    useAdvancedQueue,
    activeQueueName,
  } = ctx;

  let script = "";

  // 5. Queue Types & Hotspot User Profiles (MUST exist before Hotspot Server Profiles reference trial-profile)
  script += `# ---------------------------------------------------------------------\n`;
  script += `# 5. Hotspot User Profiles & Queue Type / بروفايلات الهوتسبوت وطوابير الانتظار\n`;
  script += `# ---------------------------------------------------------------------\n`;

  if (config.queueType === "cake" && isV7) {
    script += `/queue type remove [ find name=cake-hotspot ]\n`;
    script += `/queue type\n`;
    script += `add name=cake-hotspot kind=cake cake-bandwidth=0 cake-memlimit=16MiB cake-nat=yes cake-rtt=100ms comment="CAKE Queue Type for Bufferbloat Elimination"\n\n`;
  } else if (config.queueType === "fq_codel" && isV7) {
    script += `/queue type remove [ find name=fq-codel-hotspot ]\n`;
    script += `/queue type\n`;
    script += `add name=fq-codel-hotspot kind=fq-codel fq-codel-limit=10240 fq-codel-target=5ms fq-codel-interval=100ms comment="FQ-CoDel Queue Type"\n\n`;
  }

  script += `/queue simple remove [ find name="hs-parent-queue" ]\n`;
  if (useAdvancedQueue) {
    const queueTargets = [`${networkAddress}/${safeSubnetMask}`];
    if (hasVlans) {
      resolvedVlans.forEach((vlan) => {
        queueTargets.push(`${vlan.network}/${vlan.subnetMask}`);
      });
    }
    const rawMaxLimit = (config.parentQueueMaxLimit || "").trim();
    let maxLimitParam = "";
    if (rawMaxLimit && rawMaxLimit.includes("/")) {
      const [rxRaw = "", txRaw = ""] = rawMaxLimit.split("/");
      const rxNorm = normalizeRosRate(rxRaw);
      const txNorm = normalizeRosRate(txRaw);
      if (rxNorm && txNorm) {
        maxLimitParam = ` max-limit=${rxNorm}/${txNorm}`;
      }
    }
    script += `/queue simple\n`;
    script += `add name="hs-parent-queue" target=${queueTargets.join(",")} queue=${activeQueueName}/${activeQueueName}${maxLimitParam} comment="Hotspot Parent Queue (${config.queueType.toUpperCase()})"\n\n`;
  }

  const parentQueueParam = useAdvancedQueue ? `parent-queue="hs-parent-queue"` : "";
  // Keep child dynamic Hotspot queues lightweight under hs-parent-queue so CAKE does not allocate per-client 16MiB rings
  const advQueueTypeParam = "";

  script += `/ip hotspot user profile\n`;
  const nasIdle = sanitizeRosIdentifier(config.nasIdleTimeout || "00:15:00", "00:15:00");
  const nasKeepalive = sanitizeRosIdentifier(config.nasKeepaliveTimeout || "00:02:00", "00:02:00");
  const nasAutorefresh = sanitizeRosIdentifier(config.nasStatusAutorefresh || "1m", "1m");
  const nasAddMac = config.nasAddMacCookie !== false ? "yes" : "no";
  const nasMacTimeout = sanitizeRosIdentifier(config.nasMacCookieTimeout || "3d", "3d");

  script += `# ${useRadius ? "NAS Default Profile (Rates enforced by User Manager RADIUS)" : "Default Hotspot User Profile"}\n`;
  const defaultParams = [
    `[ find default=yes ]`,
    `name=default`,
    `idle-timeout=${nasIdle}`,
    `keepalive-timeout=${nasKeepalive}`,
    `status-autorefresh=${nasAutorefresh}`,
    `add-mac-cookie=${nasAddMac}`,
    nasAddMac === "yes" ? `mac-cookie-timeout=${nasMacTimeout}` : "",
    parentQueueParam,
    advQueueTypeParam,
    `insert-queue-before=first`,
  ].filter(Boolean).join(" ");
  script += `set ${defaultParams}\n`;

  if (config.enableTrial) {
    const [tRxRaw = "256k", tTxRaw = "512k"] = (config.trialRateLimit || "256k/512k").split("/");
    const trialRate = `${normalizeRosRate(tRxRaw) || "256k"}/${normalizeRosRate(tTxRaw) || "512k"}`;
    script += `# Dedicated Free Trial User Profile\n`;
    const trialSetParams = [
      `rate-limit="${trialRate}"`,
      `shared-users=1`,
      parentQueueParam,
      advQueueTypeParam,
    ].filter(Boolean).join(" ");
    script += `:if ([:len [find name="trial-profile"]] > 0) do={ set [find name="trial-profile"] ${trialSetParams} } else={ add name="trial-profile" ${trialSetParams} }\n`;
  }

  if (emitLocalHotspotProfiles) {
    hotspotProfiles.forEach((profile) => {
      const rateLimitStr = buildRateLimitString(profile);
      const rateParam = rateLimitStr ? `rate-limit="${rateLimitStr}"` : "";
      const sessionParam = profile.sessionTimeout && profile.sessionTimeout !== "00:00:00"
        ? `session-timeout=${sanitizeRosIdentifier(profile.sessionTimeout, "00:00:00")}`
        : "";
      const idleParam = profile.idleTimeout && profile.idleTimeout !== "00:00:00"
        ? `idle-timeout=${sanitizeRosIdentifier(profile.idleTimeout, "00:15:00")}`
        : "";
      const keepaliveParam = profile.keepaliveTimeout && profile.keepaliveTimeout !== "00:00:00"
        ? `keepalive-timeout=${sanitizeRosIdentifier(profile.keepaliveTimeout, "00:02:00")}`
        : "";
      const autorefreshParam = profile.statusAutorefresh
        ? `status-autorefresh=${sanitizeRosIdentifier(profile.statusAutorefresh, "1m")}`
        : "";
      const macCookieFlag = profile.addMacCookie ? "add-mac-cookie=yes" : "add-mac-cookie=no";
      const macTimeoutParam = profile.addMacCookie && profile.macCookieTimeout
        ? `mac-cookie-timeout=${sanitizeRosIdentifier(profile.macCookieTimeout, "3d")}`
        : "";
      const poolParam = profile.addressPool?.trim() && profile.addressPool.trim() !== "none"
        ? `address-pool="${escapeRosString(profile.addressPool.trim())}"`
        : "";
      const listParam = profile.addressList?.trim()
        ? `address-list="${escapeRosString(profile.addressList.trim())}"`
        : "";
      const customQueueType = profile.queueType?.trim()
        ? `queue-type="${escapeRosString(profile.queueType.trim())}"`
        : advQueueTypeParam;
      const insertParam = `insert-queue-before=${profile.insertQueueBefore || "first"}`;
      const proxyParam = profile.transparentProxy ? `transparent-proxy=yes` : "";
      const onLoginRaw = profile.localValidity?.trim()
        ? buildLocalExpiryOnLoginScript(profile.localValidity, profile.localExpiryAction || "remove")
        : "";
      const onLoginParam = onLoginRaw ? `on-login="${escapeRosString(onLoginRaw)}"` : "";
      const sharedParam = `shared-users=${Math.max(1, profile.sharedUsers || 1)}`;
      const safeProfName = escapeRosString(profile.name);

      const setParams = [
        rateParam,
        sharedParam,
        sessionParam,
        idleParam,
        keepaliveParam,
        autorefreshParam,
        macCookieFlag,
        macTimeoutParam,
        poolParam,
        listParam,
        parentQueueParam,
        customQueueType,
        insertParam,
        proxyParam,
        onLoginParam,
      ].filter(Boolean).join(" ");

      script += `# Hotspot Profile: ${escapeRosString(profile.displayName || profile.name)}\n`;
      script += `:if ([:len [find name="${safeProfName}"]] > 0) do={ set [find name="${safeProfName}"] ${setParams} } else={ add name="${safeProfName}" ${setParams} }\n`;
    });
  } else {
    script += `# (Local speed profiles omitted in User Manager RADIUS mode: User Manager controls speeds, quotas & validity in Section 9)\n`;
  }
  script += `\n`;

  // 6. Hotspot Server Profile & Server Setup
  script += `# ---------------------------------------------------------------------\n`;
  script += `# 6. Hotspot Server Profile & Login Methods / إعدادات سيرفر الهوتسبوت\n`;
  script += `# ---------------------------------------------------------------------\n`;

  const loginMethods: string[] = [];
  if (config.loginHttpChap) loginMethods.push("http-chap");
  if (config.loginHttpPap) loginMethods.push("http-pap");
  if (config.loginMacAuth) loginMethods.push("mac");
  if (config.enableCookie) loginMethods.push("cookie");
  if (config.loginMacCookie) loginMethods.push("mac-cookie");
  if (config.enableTrial) loginMethods.push("trial");
  if (loginMethods.length === 0) loginMethods.push("http-chap");

  const loginByStr = loginMethods.join(",");

  const buildHotspotProfileCmd = (profName: string, hotspotAddr: string, profDnsName: string): string => {
    let cmd = `add dns-name=${profDnsName} hotspot-address=${hotspotAddr} html-directory="${effectiveHtmlDir}" login-by=${loginByStr} name=${profName} \\\n`;
    if (config.enableTrial) {
      const trialUptime = sanitizeRosIdentifier(config.trialDuration || "00:30:00", "00:30:00");
      const trialReset = sanitizeRosIdentifier(config.trialResetTime || "1d", "1d");
      cmd += `    trial-uptime-limit=${trialUptime} trial-uptime-reset=${trialReset} trial-user-profile=trial-profile \\\n`;
    }
    if (config.enableCookie) {
      cmd += `    http-cookie-lifetime=${sanitizeRosIdentifier(config.cookieLifetime || "3d", "3d")} \\\n`;
    }
    if (useRadius && config.radiusAccounting) {
      cmd += `    radius-accounting=yes radius-interim-update=${sanitizeRosIdentifier(config.radiusInterimUpdate || "00:05:00", "00:05:00")} \\\n`;
    }
    cmd += `    use-radius=${useRadius ? "yes" : "no"}`;
    return cmd;
  };

  script += `/ip hotspot profile remove [ find name="hsprof1" ]\n`;
  script += `/ip hotspot profile\n`;
  script += `${buildHotspotProfileCmd("hsprof1", safeGatewayIp, mainDnsName)}\n\n`;

  const addrPerMac = clampInt(config.addressesPerMac || 2, 1, 20, 2);
  const mainHotspotPool = config.enableUniversalClient ? poolName : "none";
  script += `/ip hotspot remove [ find where name=${serverName} or interface=${effectiveLan} ]\n`;
  script += `/ip hotspot\n`;
  script += `add address-pool=${mainHotspotPool} addresses-per-mac=${addrPerMac} disabled=no interface=${effectiveLan} name=${serverName} profile=hsprof1\n\n`;

  // Dedicated Hotspot Profiles & Servers for Hotspot-enabled VLANs
  if (hotspotEnabledVlans.length > 0) {
    hotspotEnabledVlans.forEach((vlan) => {
      const vlanProfName = `hsprof-${vlan.safeIdName}`;
      const vlanDns = sanitizeRosIdentifier((vlan.hotspotDnsName || "").trim() || mainDnsName, mainDnsName);
      const vlanHotspotPool = config.enableUniversalClient ? `"pool-${vlan.safeIdName}"` : "none";
      script += `/ip hotspot profile remove [ find name="${vlanProfName}" ]\n`;
      script += `/ip hotspot profile\n`;
      script += `${buildHotspotProfileCmd(vlanProfName, vlan.gatewayIp, vlanDns)}\n`;
      script += `/ip hotspot remove [ find where name="hs-${vlan.safeVlanName}" or interface="${vlan.safeVlanName}" ]\n`;
      script += `/ip hotspot\n`;
      script += `add address-pool=${vlanHotspotPool} addresses-per-mac=${addrPerMac} disabled=no interface="${vlan.safeVlanName}" name="hs-${vlan.safeVlanName}" profile="${vlanProfName}" comment="Hotspot on VLAN ${vlan.safeVlanId}"\n\n`;
    });
  }

  // IP Bindings (Bypassed / Blocked / Regular devices)
  const validBindings = (config.ipBindings || []).filter(
    (b) => Boolean((b.macAddress || "").trim() || (b.ipAddress || "").trim())
  );
  if (validBindings.length > 0) {
    validBindings.forEach((b) => {
      const matchPredicates = [
        b.macAddress?.trim() ? `mac-address=${sanitizeRosIdentifier(b.macAddress, "")}` : "",
        b.ipAddress?.trim() ? `address=${sanitizeRosIdentifier(b.ipAddress, "")}` : "",
      ].filter(Boolean);
      if (matchPredicates.length > 0) {
        script += `/ip hotspot ip-binding remove [ find where !dynamic and ${matchPredicates.join(" and ")} ]\n`;
      }
    });
    script += `/ip hotspot ip-binding\n`;
    validBindings.forEach((b) => {
      const parts = [
        b.macAddress?.trim() ? `mac-address=${sanitizeRosIdentifier(b.macAddress, "")}` : "",
        b.ipAddress?.trim() ? `address=${sanitizeRosIdentifier(b.ipAddress, "")}` : "",
        b.toAddress?.trim() ? `to-address=${sanitizeRosIdentifier(b.toAddress, "")}` : "",
        `type=${b.type || "bypassed"}`,
        `comment="${escapeRosString(b.comment || "IP Binding")}"`
      ].filter(Boolean);
      script += `add ${parts.join(" ")}\n`;
    });
    script += `\n`;
  }

  // 7. Walled Garden Entries (HTTP & HTTPS IP)
  if (config.walledGardenDomains && config.walledGardenDomains.length > 0) {
    const domainEntries = config.walledGardenDomains.filter(
      (wg) => wg.domain.trim() && wg.entryType !== "ip"
    );
    const ipOrHttpsEntries = config.walledGardenDomains.filter(
      (wg) => wg.domain.trim() && (wg.entryType === "ip" || wg.includeHttpsIp)
    );

    if (domainEntries.length > 0 || ipOrHttpsEntries.length > 0) {
      script += `# ---------------------------------------------------------------------\n`;
      script += `# 7. Walled Garden / المواقع المسموح بتصفحها بدون تسجيل دخول\n`;
      script += `# ---------------------------------------------------------------------\n`;

      if (domainEntries.length > 0) {
        domainEntries.forEach((wg) => {
          script += `/ip hotspot walled-garden remove [ find where !dynamic and dst-host="${escapeRosString(wg.domain.trim())}" ]\n`;
        });
        script += `/ip hotspot walled-garden\n`;
        domainEntries.forEach((wg) => {
          script += `add action=allow dst-host="${escapeRosString(wg.domain.trim())}" comment="${escapeRosString(wg.comment || "Bypass Domain")}"\n`;
        });
        script += `\n`;
      }

      if (ipOrHttpsEntries.length > 0) {
        ipOrHttpsEntries.forEach((wg) => {
          const val = wg.domain.trim();
          const isIpOrCidr = /^\d{1,3}(\.\d{1,3}){3}(\/\d{1,2})?$/.test(val);
          if (wg.entryType === "ip" || isIpOrCidr) {
            script += `/ip hotspot walled-garden ip remove [ find where !dynamic and dst-address=${sanitizeRosIdentifier(val, val)} ]\n`;
          } else {
            const cleanHost = val.replace(/^\*\./, "");
            script += `/ip hotspot walled-garden ip remove [ find where !dynamic and dst-host="${escapeRosString(cleanHost)}" ]\n`;
          }
        });
        script += `/ip hotspot walled-garden ip\n`;
        ipOrHttpsEntries.forEach((wg) => {
          const val = wg.domain.trim();
          const isIpOrCidr = /^\d{1,3}(\.\d{1,3}){3}(\/\d{1,2})?$/.test(val);
          if (wg.entryType === "ip" || isIpOrCidr) {
            script += `add action=accept dst-address=${sanitizeRosIdentifier(val, val)} comment="${escapeRosString(wg.comment || "Bypass IP")}"\n`;
          } else {
            const cleanHost = val.replace(/^\*\./, "");
            script += `add action=accept dst-host="${escapeRosString(cleanHost)}" comment="${escapeRosString(wg.comment || "HTTPS Bypass")}"\n`;
          }
        });
        script += `\n`;
      }
    }
  }

  return script;
}
