/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HotspotConfig, SpeedProfile, VlanConfig, WanLine } from "../types";

// Helper to convert speed to bits or bytes for User Manager limitation
export function speedToBytes(speedStr: string): number {
  if (!speedStr) return 0;
  const clean = speedStr.trim().toLowerCase();
  const num = parseFloat(clean);
  if (isNaN(num)) return 0;
  if (clean.endsWith("g")) {
    return num * 1024 * 1024 * 1024;
  }
  if (clean.endsWith("m")) {
    return num * 1024 * 1024;
  }
  if (clean.endsWith("k")) {
    return num * 1024;
  }
  return num;
}

export function buildRateLimitString(profile: SpeedProfile): string {
  if (!profile.uploadLimit || !profile.downloadLimit) return "";

  const baseRate = `${profile.uploadLimit}/${profile.downloadLimit}`;

  if (!profile.burstUpload && !profile.burstDownload) {
    return baseRate;
  }

  const burstRate = `${profile.burstUpload || profile.uploadLimit}/${profile.burstDownload || profile.downloadLimit}`;
  const burstThresh = `${profile.burstThresholdUpload || profile.uploadLimit}/${profile.burstThresholdDownload || profile.downloadLimit}`;
  const burstTime = `${profile.burstTime || "8s"}/${profile.burstTime || "8s"}`;
  const priority = profile.priority || 8;

  return `${baseRate} ${burstRate} ${burstThresh} ${burstTime} ${priority}`;
}

export function generateMikrotikScript(config: HotspotConfig, profiles: SpeedProfile[]): string {
  const isV7 = config.rosVersion === "v7";
  const ipParts = config.gatewayIp.split(".");
  const networkAddress = ipParts.length === 4 ? `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.0` : "192.168.80.0";
  const dnsServersStr = config.dnsServers.filter(Boolean).join(",");

  let script = "";

  script += `# =====================================================================\n`;
  script += `#  MikroTik RouterOS ${isV7 ? "v7.x (v7.1+)" : "v6.x (v6.49+)"} Master Network & Hotspot Script\n`;
  script += `#  Generated on: ${new Date().toISOString().split('T')[0]}\n`;
  script += `#  Target Version: RouterOS ${config.rosVersion.toUpperCase()}\n`;
  script += `# =====================================================================\n\n`;

  // 1. Interfaces & WAN / PPPoE Setup
  script += `# ---------------------------------------------------------------------\n`;
  script += `# 1. Interface & WAN Lines Setup / إعدادات كروت الشبكة والإنترنت\n`;
  script += `# ---------------------------------------------------------------------\n`;
  script += `/interface ethernet\n`;
  script += `set [ find default-name=${config.wanInterface} ] name=${config.wanInterface} comment="Primary WAN Input / كارت دخول الإنترنت الرئيسي"\n`;
  script += `set [ find default-name=${config.lanInterface} ] name=${config.lanInterface} comment="LAN - Hotspot Output / كارت خروج المشتركين"\n\n`;

  // Additional WAN lines setup (Multi-WAN)
  if (config.loadBalancingMethod !== "none" && config.wanLines.length > 0) {
    config.wanLines.forEach((line) => {
      if (line.interfaceName && line.interfaceName !== config.wanInterface) {
        script += `/interface ethernet\n`;
        script += `set [ find default-name=${line.interfaceName} ] name=${line.interfaceName} comment="WAN Line: ${line.name}"\n\n`;
      }

      if (line.type === "pppoe" && line.pppoeUser) {
        script += `/interface pppoe-client\n`;
        script += `add name="pppoe-${line.name}" interface=${line.interfaceName} user="${line.pppoeUser}" password="${line.pppoePass || ""}" disabled=no add-default-route=no comment="PPPoE Client for ${line.name}"\n\n`;
      }
    });
  }

  // IP Address for Primary LAN
  script += `/ip address\n`;
  script += `add address=${config.gatewayIp}/${config.subnetMask} interface=${config.lanInterface} network=${networkAddress} comment="Hotspot Main Gateway IP / عنوان جيتواي الهوتسبوت الرئيسي"\n\n`;

  // Static WAN IP setups if applicable
  if (config.loadBalancingMethod !== "none" && config.wanLines.length > 0) {
    config.wanLines.forEach((line) => {
      if (line.type === "static" && line.gatewayIp) {
        // Assume /24 subnet for static WAN lines if provided as gateway
        const wanIpParts = line.gatewayIp.split(".");
        if (wanIpParts.length === 4) {
          const wanSubnet = `${wanIpParts[0]}.${wanIpParts[1]}.${wanIpParts[2]}.2`;
          script += `/ip address\n`;
          script += `add address=${wanSubnet}/24 interface=${line.interfaceName} comment="Static IP for ${line.name}"\n\n`;
        }
      }
    });
  }

  // DNS Cache Setup
  script += `/ip dns\n`;
  script += `set allow-remote-requests=yes servers=${dnsServersStr} max-udp-packet-size=4096 cache-size=${config.enableDnsCache ? "8192KiB" : "2048KiB"}\n\n`;

  // 2. VLANs Configuration
  if (config.enableVlans && config.vlans && config.vlans.length > 0) {
    script += `# ---------------------------------------------------------------------\n`;
    script += `# 2. VLANs Configuration / إعدادات الشبكات الافتراضية بالفيلان (VLANs)\n`;
    script += `# ---------------------------------------------------------------------\n`;
    
    script += `/interface vlan\n`;
    config.vlans.forEach((vlan) => {
      script += `add name="${vlan.name}" vlan-id=${vlan.vlanId} interface=${vlan.parentInterface} comment="${vlan.comment || "VLAN " + vlan.vlanId}"\n`;
    });
    script += `\n`;

    script += `/ip address\n`;
    config.vlans.forEach((vlan) => {
      const vParts = vlan.gatewayIp.split(".");
      const vNetwork = vParts.length === 4 ? `${vParts[0]}.${vParts[1]}.${vParts[2]}.0` : "10.0.0.0";
      script += `add address=${vlan.gatewayIp}/${vlan.subnetMask} interface="${vlan.name}" network=${vNetwork} comment="IP Gateway for ${vlan.name}"\n`;
    });
    script += `\n`;

    // VLAN Pools & DHCP Servers
    config.vlans.forEach((vlan) => {
      if (vlan.dhcpEnabled) {
        const poolName = `pool-${vlan.name}`;
        const vParts = vlan.gatewayIp.split(".");
        const vNetwork = vParts.length === 4 ? `${vParts[0]}.${vParts[1]}.${vParts[2]}.0` : "10.0.0.0";

        script += `/ip pool\n`;
        script += `add name=${poolName} ranges=${vlan.poolStart}-${vlan.poolEnd}\n`;

        script += `/ip dhcp-server\n`;
        script += `add address-pool=${poolName} disabled=no interface="${vlan.name}" name="dhcp-${vlan.name}" lease-time=1h\n`;

        script += `/ip dhcp-server network\n`;
        script += `add address=${vNetwork}/${vlan.subnetMask} dns-server=${vlan.gatewayIp} gateway=${vlan.gatewayIp} netmask=${vlan.subnetMask} comment="DHCP Network for ${vlan.name}"\n\n`;
      }
    });
  }

  // 3. Multi-WAN Load Balancing (PCC / NTH / ECMP / Failover)
  if (config.loadBalancingMethod !== "none" && config.wanLines.length > 0) {
    script += `# ---------------------------------------------------------------------\n`;
    script += `# 3. WAN Load Balancing (${config.loadBalancingMethod.toUpperCase()}) / دمج وتوزيع خطوط الإنترنت\n`;
    script += `# ---------------------------------------------------------------------\n`;

    const lines = config.wanLines;
    const totalLines = lines.length;

    // Firewall NAT for all WAN lines
    script += `/ip firewall nat\n`;
    lines.forEach((line) => {
      const outIface = line.type === "pppoe" ? `pppoe-${line.name}` : line.interfaceName;
      script += `add action=masquerade chain=srcnat out-interface=${outIface} comment="NAT Masquerade for ${line.name}"\n`;
    });
    script += `\n`;

    if (config.loadBalancingMethod === "pcc") {
      script += `# PCC (Per Connection Classifier) Mangle Rules for High Stability & HTTPS Support\n`;
      script += `/ip firewall mangle\n`;

      // Accept local traffic
      script += `add action=accept chain=prerouting dst-address-type=local comment="PCC: Accept Local Destination Traffic"\n`;

      // WAN Input connection marking
      lines.forEach((line, idx) => {
        const inIface = line.type === "pppoe" ? `pppoe-${line.name}` : line.interfaceName;
        const markName = `WAN${idx + 1}_conn`;
        script += `add action=mark-connection chain=input in-interface=${inIface} new-connection-mark=${markName} passthrough=yes comment="Mark incoming connection on ${line.name}"\n`;
      });

      // Output policy routing
      lines.forEach((line, idx) => {
        const markName = `WAN${idx + 1}_conn`;
        const routeMark = `to_WAN${idx + 1}`;
        script += `add action=mark-routing chain=output connection-mark=${markName} new-routing-mark=${routeMark} passthrough=no comment="Route output via ${line.name}"\n`;
      });

      // Prerouting PCC Distribution
      lines.forEach((line, idx) => {
        const connMark = `WAN${idx + 1}_conn`;
        const routeMark = `to_WAN${idx + 1}`;

        if (config.stickyConnections) {
          // Both addresses & ports for sticky SSL/HTTPS banking sites
          script += `add action=mark-connection chain=prerouting dst-address-type=!local in-interface=${config.lanInterface} per-connection-classifier=both-addresses-and-ports:${totalLines}/${idx} new-connection-mark=${connMark} passthrough=yes comment="PCC Rule ${idx + 1}/${totalLines}"\n`;
        } else {
          script += `add action=mark-connection chain=prerouting dst-address-type=!local in-interface=${config.lanInterface} per-connection-classifier=src-address-and-port:${totalLines}/${idx} new-connection-mark=${connMark} passthrough=yes comment="PCC Rule ${idx + 1}/${totalLines}"\n`;
        }

        script += `add action=mark-routing chain=prerouting connection-mark=${connMark} in-interface=${config.lanInterface} new-routing-mark=${routeMark} passthrough=no\n`;
      });
      script += `\n`;

      // Static Default Routes with Routing Marks
      script += `/ip route\n`;
      lines.forEach((line, idx) => {
        const gw = line.type === "pppoe" ? `pppoe-${line.name}` : line.gatewayIp;
        const routeMark = `to_WAN${idx + 1}`;
        if (isV7) {
          script += `add distance=1 gateway=${gw} routing-table=${routeMark} comment="PCC Route for ${line.name}"\n`;
        } else {
          script += `add distance=1 gateway=${gw} routing-mark=${routeMark} comment="PCC Route for ${line.name}"\n`;
        }
      });
      // Fallback routes
      lines.forEach((line, idx) => {
        const gw = line.type === "pppoe" ? `pppoe-${line.name}` : line.gatewayIp;
        script += `add distance=${idx + 1} gateway=${gw} comment="Fallback route via ${line.name}"\n`;
      });
      script += `\n`;

    } else if (config.loadBalancingMethod === "failover") {
      script += `# Active/Passive Automatic Failover Routing\n`;
      script += `/ip route\n`;
      lines.forEach((line, idx) => {
        const gw = line.type === "pppoe" ? `pppoe-${line.name}` : line.gatewayIp;
        const dist = line.distance || (idx + 1);
        if (isV7) {
          script += `add distance=${dist} gateway=${gw} check-gateway=ping comment="Failover Line ${idx + 1}: ${line.name}"\n`;
        } else {
          script += `add distance=${dist} gateway=${gw} check-gateway=ping comment="Failover Line ${idx + 1}: ${line.name}"\n`;
        }
      });
      script += `\n`;

    } else if (config.loadBalancingMethod === "ecmp") {
      script += `# Equal Cost Multi-Path (ECMP) Default Route\n`;
      const gatewaysList = lines.map(l => l.type === "pppoe" ? `pppoe-${l.name}` : l.gatewayIp).join(",");
      script += `/ip route\n`;
      script += `add gateway=${gatewaysList} check-gateway=ping comment="ECMP Combined Gateway Route"\n\n`;
    }
  } else {
    // Single WAN Default NAT
    script += `/ip firewall nat\n`;
    script += `add action=masquerade chain=srcnat out-interface=${config.wanInterface} comment="NAT masquerade for single internet WAN"\n\n`;
  }

  // 4. DHCP Server & IP Pools for Main LAN
  script += `# ---------------------------------------------------------------------\n`;
  script += `# 4. DHCP Server & Main IP Pool Setup / إعدادات السيرفر الموزع لـ IP (DHCP)\n`;
  script += `# ---------------------------------------------------------------------\n`;
  script += `/ip pool\n`;
  script += `add name=${config.poolName} ranges=${config.poolStart}-${config.poolEnd}\n\n`;

  script += `/ip dhcp-server\n`;
  script += `add address-pool=${config.poolName} disabled=no interface=${config.lanInterface} name=dhcp-hs lease-time=1h\n\n`;

  script += `/ip dhcp-server network\n`;
  script += `add address=${networkAddress}/${config.subnetMask} dns-server=${config.gatewayIp} gateway=${config.gatewayIp} netmask=${config.subnetMask} comment="Main Hotspot DHCP Network"\n\n`;

  // 5. Hotspot Server Profile & Server Setup
  script += `# ---------------------------------------------------------------------\n`;
  script += `# 5. Hotspot Server Profile & Login Methods / إعدادات سيرفر الهوتسبوت\n`;
  script += `# ---------------------------------------------------------------------\n`;
  
  const loginMethods: string[] = [];
  if (config.loginHttpChap) loginMethods.push("http-chap");
  if (config.loginHttpPap) loginMethods.push("http-pap");
  if (config.loginMacAuth) loginMethods.push("mac");
  if (config.enableCookie) loginMethods.push("cookie");
  if (config.enableTrial) loginMethods.push("trial");
  if (loginMethods.length === 0) loginMethods.push("http-chap");

  const loginByStr = loginMethods.join(",");

  script += `/ip hotspot profile\n`;
  script += `add dns-name=${config.dnsName} hotspot-address=${config.gatewayIp} html-directory="${config.htmlDirectory || "hotspot"}" login-by=${loginByStr} name=hsprof1 \\\n`;
  if (config.enableTrial) {
    script += `    trial-uptime-limit=${config.trialDuration} trial-user-profile=default trial-user-reset-limit=${config.trialResetTime} \\\n`;
  }
  if (config.enableCookie) {
    script += `    cookie-lifetime=${config.cookieLifetime} \\\n`;
  }
  script += `    use-radius=${config.enableUserManager ? "yes" : "no"}\n\n`;

  script += `/ip hotspot\n`;
  script += `add address-pool=${config.poolName} disabled=no interface=${config.lanInterface} name=${config.serverName} profile=hsprof1\n\n`;

  // Tie Hotspot to VLANs if configured
  if (config.enableVlans && config.vlans) {
    config.vlans.forEach((vlan) => {
      if (vlan.enableHotspotOnVlan) {
        script += `/ip hotspot\n`;
        script += `add address-pool="pool-${vlan.name}" disabled=no interface="${vlan.name}" name="hs-${vlan.name}" profile=hsprof1 comment="Hotspot on VLAN ${vlan.vlanId}"\n\n`;
      }
    });
  }

  // 6. Queue Types & Hotspot User Profiles
  script += `# ---------------------------------------------------------------------\n`;
  script += `# 6. Hotspot Speed Profiles & Queue Type / بروفايلات السرعة وطوابير الانتظار\n`;
  script += `# ---------------------------------------------------------------------\n`;
  
  if (config.queueType === "cake" && isV7) {
    script += `/queue type\n`;
    script += `add name=cake-hotspot kind=cake cake-ack-filter=filter cake-bandwidth=0 cake-memlimit=32MiB cake-nat=yes cake-rtt=100ms comment="CAKE Queue Type for Bufferbloat Elimination"\n\n`;
  } else if (config.queueType === "fq_codel" && isV7) {
    script += `/queue type\n`;
    script += `add name=fq-codel-hotspot kind=fq-codel fq-codel-limit=10240 fq-codel-target=5ms fq-codel-interval=100ms comment="FQ-CoDel Queue Type"\n\n`;
  }

  script += `/ip hotspot user profile\n`;
  const defaultTrialRate = config.enableTrial ? "256k/512k" : "128k/256k";
  script += `set [ find default=yes ] name=default rate-limit="${defaultTrialRate}" shared-users=1 comment="Default profile (trial)"\n`;

  profiles.forEach(profile => {
    const rateLimitStr = buildRateLimitString(profile);
    const rateParam = rateLimitStr ? `rate-limit="${rateLimitStr}"` : "";
    const sessionParam = profile.sessionTimeout && profile.sessionTimeout !== "00:00:00" ? `session-timeout=${profile.sessionTimeout}` : "";
    const idleParam = profile.idleTimeout && profile.idleTimeout !== "00:00:00" ? `idle-timeout=${profile.idleTimeout}` : "";
    const keepaliveParam = profile.keepaliveTimeout && profile.keepaliveTimeout !== "00:00:00" ? `keepalive-timeout=${profile.keepaliveTimeout}` : "";
    const sharedParam = `shared-users=${profile.sharedUsers}`;

    const params = [
      `name="${profile.name}"`,
      rateParam,
      sharedParam,
      sessionParam,
      idleParam,
      keepaliveParam
    ].filter(Boolean).join(" ");

    script += `add ${params} comment="Speed Profile: ${profile.displayName}"\n`;
  });
  script += `\n`;

  // 7. Walled Garden Entries
  if (config.walledGardenDomains && config.walledGardenDomains.length > 0) {
    script += `# ---------------------------------------------------------------------\n`;
    script += `# 7. Walled Garden / المواقع المسموح بتصفحها بدون تسجيل دخول\n`;
    script += `# ---------------------------------------------------------------------\n`;
    script += `/ip hotspot walled-garden\n`;
    config.walledGardenDomains.forEach(wg => {
      if (wg.domain.trim()) {
        script += `add action=allow dst-host="${wg.domain.trim()}" comment="${wg.comment || "Bypass Domain"}"\n`;
      }
    });
    script += `\n`;
  }

  // 8. Firewall Hardening & FastTrack Bypass
  script += `# ---------------------------------------------------------------------\n`;
  script += `# 8. Firewall Security & FastTrack Bypass / حماية الجدار الناري وتجاوز الفاست تراك\n`;
  script += `# ---------------------------------------------------------------------\n`;
  script += `/ip firewall filter\n`;
  if (config.bypassFasttrack) {
    script += `add action=accept chain=forward comment="Bypass FastTrack for Hotspot Upload" hotspot=from-client place-before=0\n`;
    script += `add action=accept chain=forward comment="Bypass FastTrack for Hotspot Download" hotspot=to-client place-before=0\n`;
  }

  if (config.enableFirewallHardening) {
    script += `# Block WAN DNS requests to avoid becoming an open resolver\n`;
    script += `add action=drop chain=input dst-port=53 in-interface=${config.wanInterface} protocol=udp comment="Drop WAN DNS UDP"\n`;
    script += `add action=drop chain=input dst-port=53 in-interface=${config.wanInterface} protocol=tcp comment="Drop WAN DNS TCP"\n`;

    script += `# Drop Invalid Connections\n`;
    script += `add action=drop chain=input connection-state=invalid comment="Drop Invalid Input Packets"\n`;
    script += `add action=drop chain=forward connection-state=invalid comment="Drop Invalid Forward Packets"\n`;

    script += `# Protect Router Winbox & SSH brute-force prevention\n`;
    script += `add action=add-src-to-address-list address-list=ssh_black_list address-list-timeout=1d chain=input dst-port=22 protocol=tcp connection-state=new src-address-list=ssh_stage2 comment="SSH Brute Force Blacklist"\n`;
    script += `add action=add-src-to-address-list address-list=ssh_stage2 address-list-timeout=1m chain=input dst-port=22 protocol=tcp connection-state=new src-address-list=ssh_stage1\n`;
    script += `add action=add-src-to-address-list address-list=ssh_stage1 address-list-timeout=1m chain=input dst-port=22 protocol=tcp connection-state=new\n`;
    script += `add action=drop chain=input dst-port=22 protocol=tcp src-address-list=ssh_black_list comment="Drop SSH Brute Force Blacklist"\n`;
  }
  script += `\n`;

  // 9. RADIUS & User Manager Setup
  if (config.enableUserManager) {
    script += `# ---------------------------------------------------------------------\n`;
    script += `# 9. RADIUS Client & User Manager Setup (${isV7 ? "RouterOS v7 Syntax" : "RouterOS v6 Syntax"})\n`;
    script += `# ---------------------------------------------------------------------\n`;
    script += `# MikroTik RADIUS Client Configuration\n`;
    script += `/radius\n`;
    script += `add service=hotspot address=${config.radiusServerIp} secret="${config.radiusSecret}" comment="Radius link for User Manager"\n\n`;

    script += `/radius incoming\n`;
    script += `set accept=yes port=${config.coaPort} comment="Accept CoA disconnect request from User Manager"\n\n`;

    if (isV7) {
      // RouterOS v7 User Manager Syntax (/user-manager ...)
      script += `# RouterOS v7 User Manager Configuration\n`;
      script += `/user-manager router\n`;
      script += `add name=${config.usermanRouterName} address=${config.radiusServerIp} shared-secret="${config.radiusSecret}"\n\n`;

      if (config.syncProfilesToUserman) {
        script += `# User Manager v7 Speed Limitations & Profiles Generation\n`;
        profiles.forEach(profile => {
          const dlBytes = speedToBytes(profile.downloadLimit);
          const ulBytes = speedToBytes(profile.uploadLimit);
          const totalQuotaBytes = (profile.dataQuotaMb || 0) * 1024 * 1024;
          
          script += `/user-manager limitation\n`;
          let limCmd = `add name="lim_${profile.name}" rate-limit-rx=${ulBytes || 0} rate-limit-tx=${dlBytes || 0}`;
          if (totalQuotaBytes > 0) {
            limCmd += ` download-limit=${totalQuotaBytes}`;
          }
          script += `${limCmd}\n`;

          script += `/user-manager profile\n`;
          let profCmd = `add name="${profile.name}" name-for-users="${profile.displayName}" price=${profile.price}`;
          if (profile.validity) {
            profCmd += ` validity=${profile.validity}`;
          }
          script += `${profCmd}\n`;

          script += `/user-manager profile-limitation\n`;
          script += `add profile="${profile.name}" limitation="lim_${profile.name}"\n\n`;
        });
      }
    } else {
      // RouterOS v6 User Manager Syntax (/tool user-manager ...)
      script += `# RouterOS v6 User Manager Local Configuration\n`;
      script += `/tool user-manager customer\n`;
      script += `add username=${config.usermanAdminUser} password="${config.usermanAdminPass}" permissions=owner comment="UM Master Account"\n\n`;

      script += `/tool user-manager router\n`;
      script += `add name=${config.usermanRouterName} ip-address=${config.radiusServerIp} shared-secret="${config.radiusSecret}" coa-port=${config.coaPort} comment="Connect UM Router"\n\n`;

      if (config.syncProfilesToUserman) {
        script += `# User Manager v6 Speed Limitations & Profiles Generation\n`;
        profiles.forEach(profile => {
          const dlBytes = speedToBytes(profile.downloadLimit);
          const ulBytes = speedToBytes(profile.uploadLimit);
          const totalQuotaBytes = (profile.dataQuotaMb || 0) * 1024 * 1024;
          const rateLimitStr = profile.uploadLimit && profile.downloadLimit ? `${profile.uploadLimit}/${profile.downloadLimit}` : "";
          
          script += `/tool user-manager profile limitation\n`;
          script += `add name="lim_${profile.name}" download-limit=${totalQuotaBytes || 0} upload-limit=0 \\\n`;
          if (rateLimitStr) {
            script += `    rate-limit-rx=${ulBytes || 0} rate-limit-tx=${dlBytes || 0} \\\n`;
          }
          if (profile.sessionTimeout && profile.sessionTimeout !== "00:00:00") {
            const [h, m, s] = profile.sessionTimeout.split(":").map(Number);
            const totalSeconds = (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
            script += `    uptime-limit=${totalSeconds} \\\n`;
          }
          script += `    comment="Speed: ${profile.uploadLimit} Upload / ${profile.downloadLimit} Download"\n`;

          script += `/tool user-manager profile\n`;
          script += `add name="${profile.name}" name-for-users="${profile.displayName}" validity=${profile.validity} price=${profile.price}\n`;

          script += `/tool user-manager profile profile-limitation\n`;
          script += `add profile="${profile.name}" limitation="lim_${profile.name}"\n\n`;
        });
      }
    }
  }

  // 10. Automated Maintenance & Scheduler
  if (config.enableAutoCleanScript || config.enableScheduledReboot) {
    script += `# ---------------------------------------------------------------------\n`;
    script += `# 10. System Scheduler & Housekeeping / سكربتات الصيانة والتنظيف التلقائي\n`;
    script += `# ---------------------------------------------------------------------\n`;

    if (config.enableAutoCleanScript) {
      script += `/system script\n`;
      script += `add name=clean_hotspot_hosts source=":foreach i in=[/ip hotspot host find where !authorized] do={ /ip hotspot host remove \\$i }"\n`;
      script += `/system scheduler\n`;
      script += `add name=schedule_clean_hosts interval=1d start-time=03:00:00 on-event=clean_hotspot_hosts comment="Clean unauthenticated host cache daily at 3 AM"\n\n`;
    }

    if (config.enableScheduledReboot) {
      script += `/system scheduler\n`;
      script += `add name=schedule_weekly_reboot interval=7d start-time=04:00:00 on-event="/system reboot" comment="Weekly router reboot for RAM refresh"\n\n`;
    }
  }

  // 11. Batch Voucher Cards Generator
  if (config.generateVouchersBatch && config.voucherCount > 0) {
    script += `# ---------------------------------------------------------------------\n`;
    script += `# 11. Batch Voucher Cards Generator / سكربت توليد الكروت العشوائية بالجملة\n`;
    script += `# ---------------------------------------------------------------------\n`;
    script += `# Generates ${config.voucherCount} randomized cards with prefix "${config.voucherPrefix}" for profile "${config.voucherSelectedProfile}"\n`;
    
    script += `:for i from=1 to=${config.voucherCount} do={\n`;
    script += `  :local randStr ""\n`;
    script += `  :for j from=1 to=${config.voucherLength} do={\n`;
    script += `    :set randStr ("\\$randStr" . [:pick "0123456789abcdefghijklmnopqrstuvwxyz" [:random 36]])\n`;
    script += `  }\n`;
    script += `  :local cardName ("${config.voucherPrefix}" . "\\$randStr")\n`;
    
    if (config.enableUserManager) {
      if (isV7) {
        script += `  /user-manager user add name="\\$cardName" password="\\$randStr"\n`;
        script += `  /user-manager user-profile add user="\\$cardName" profile="${config.voucherSelectedProfile}"\n`;
      } else {
        script += `  /tool user-manager user add username="\\$cardName" password="\\$randStr" customer="${config.usermanAdminUser}"\n`;
        script += `  /tool user-manager user create-and-activate-profile customer="${config.usermanAdminUser}" user="\\$cardName" profile="${config.voucherSelectedProfile}"\n`;
      }
    } else {
      script += `  /ip hotspot user add name="\\$cardName" password="\\$randStr" profile="${config.voucherSelectedProfile}"\n`;
    }
    script += `}\n\n`;
  }

  script += `# =====================================================================\n`;
  script += `#  Hotspot & Load Balancing script generation complete!\n`;
  script += `#  Copy and paste this script into Winbox > New Terminal.\n`;
  script += `# =====================================================================\n`;

  return script;
}
