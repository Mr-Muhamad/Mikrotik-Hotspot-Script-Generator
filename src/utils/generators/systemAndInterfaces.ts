/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import type { GeneratorContext } from "./context.ts";
import {
  escapeRosString,
  isPhysicalInterface,
  parseIpv4ToInt,
  sanitizeCidr,
  sanitizeIpv4,
  sanitizeRosIdentifier,
} from "./helpers.ts";

/**
 * Generates the header banner, Section 0 (Identity, Clock, NTP), and
 * Section 1 (Ethernet comments, LAN Bridge, WAN clients, Primary LAN IP, DNS cache).
 */
export function generateSystemAndInterfacesSection(ctx: GeneratorContext): string {
  const {
    config,
    isV7,
    wanIface,
    lanIface,
    effectiveLan,
    bridgePorts,
    timeZoneName,
    safeGatewayIp,
    safeSubnetMask,
    networkAddress,
    dnsServersStr,
    isMultiWan,
  } = ctx;

  let script = "";

  script += `# =====================================================================\n`;
  script += `#  MikroTik RouterOS ${isV7 ? "v7.x (v7.1+)" : "v6.x (v6.49+)"} Master Network & Hotspot Script\n`;
  script += `#  Generated on: ${new Date().toISOString().split('T')[0]}\n`;
  script += `#  Target Version: RouterOS ${config.rosVersion.toUpperCase()}\n`;
  script += `# =====================================================================\n\n`;

  // 0. System Identity, Timezone & NTP
  script += `# ---------------------------------------------------------------------\n`;
  script += `# 0. System Identity, Clock & NTP / هوية الراوتر والوقت التلقائي\n`;
  script += `# ---------------------------------------------------------------------\n`;
  script += `/system identity\n`;
  script += `set name="${escapeRosString(config.routerIdentity || "MikroTik-Hotspot")}"\n\n`;

  script += `/system clock\n`;
  script += `set time-zone-name=${timeZoneName}\n\n`;

  if (config.enableNtp) {
    const ntpList = (config.ntpServers || []).map((s) => s.trim()).filter(Boolean);
    const activeNtp = ntpList.length > 0 ? ntpList : ["pool.ntp.org", "time.google.com"];
    script += `/system ntp client\n`;
    if (isV7) {
      script += `set enabled=yes\n`;
      script += `/system ntp client servers\n`;
      activeNtp.forEach((srv) => {
        script += `add address=${sanitizeRosIdentifier(srv, "pool.ntp.org")}\n`;
      });
    } else {
      script += `set enabled=yes server-dns-names=${activeNtp.map((s) => sanitizeRosIdentifier(s, "pool.ntp.org")).join(",")}\n`;
    }
    script += `\n`;
  }

  // 1. Interfaces, LAN Bridge & WAN Lines Setup
  script += `# ---------------------------------------------------------------------\n`;
  script += `# 1. Interface, LAN Bridge & WAN Lines Setup / إعدادات الكروت والإنترنت\n`;
  script += `# ---------------------------------------------------------------------\n`;

  const commentedPhysicalIfaces = new Set<string>();
  if (isPhysicalInterface(wanIface)) {
    script += `/interface ethernet\n`;
    script += `set [ find default-name=${wanIface} ] name=${wanIface} comment="Primary WAN Input / كارت دخول الإنترنت الرئيسي"\n`;
    commentedPhysicalIfaces.add(wanIface);
  }
  if (!config.useLanBridge && isPhysicalInterface(lanIface) && !commentedPhysicalIfaces.has(lanIface)) {
    if (commentedPhysicalIfaces.size === 0) script += `/interface ethernet\n`;
    script += `set [ find default-name=${lanIface} ] name=${lanIface} comment="LAN - Hotspot Output / كارت خروج المشتركين"\n`;
    commentedPhysicalIfaces.add(lanIface);
  }
  if (commentedPhysicalIfaces.size > 0) {
    script += `\n`;
  }

  if (config.useLanBridge) {
    script += `/interface bridge remove [ find name="${escapeRosString(effectiveLan)}" ]\n`;
    script += `/interface bridge\n`;
    script += `add name="${escapeRosString(effectiveLan)}" vlan-filtering=no comment="Hotspot LAN Bridge"\n`;
    if (bridgePorts.length > 0) {
      bridgePorts.forEach((port) => {
        script += `/interface bridge port remove [ find interface=${port} ]\n`;
      });
      script += `/interface bridge port\n`;
      bridgePorts.forEach((port) => {
        script += `add bridge="${escapeRosString(effectiveLan)}" interface=${port}\n`;
      });
    }
    script += `\n`;
  } else if (isPhysicalInterface(lanIface)) {
    script += `/interface bridge port remove [ find interface=${lanIface} ]\n\n`;
  }

  // WAN Client / Static / PPPoE Configuration
  if (isMultiWan) {
    config.wanLines.forEach((line) => {
      const lineIface = sanitizeRosIdentifier(line.interfaceName, "ether1");
      const safeLineName = escapeRosString(line.name);
      if (isPhysicalInterface(lineIface) && !commentedPhysicalIfaces.has(lineIface)) {
        script += `/interface ethernet\n`;
        script += `set [ find default-name=${lineIface} ] name=${lineIface} comment="WAN Line: ${safeLineName}"\n\n`;
        commentedPhysicalIfaces.add(lineIface);
      }

      if (line.type === "dhcp") {
        script += `/ip dhcp-client remove [ find interface=${lineIface} ]\n`;
        script += `/ip dhcp-client\n`;
        script += `add interface=${lineIface} disabled=no add-default-route=no use-peer-dns=no comment="DHCP Client for ${safeLineName} (Multi-WAN managed routes)"\n\n`;
      } else if (line.type === "pppoe" && line.pppoeUser) {
        const pppoeName = `pppoe-${sanitizeRosIdentifier(line.name, "WAN")}`;
        script += `/interface pppoe-client remove [ find name="${escapeRosString(pppoeName)}" ]\n`;
        script += `/interface pppoe-client\n`;
        script += `add name="${escapeRosString(pppoeName)}" interface=${lineIface} user="${escapeRosString(line.pppoeUser)}" password="${escapeRosString(line.pppoePass || "")}" disabled=no add-default-route=no use-peer-dns=no comment="PPPoE Client for ${safeLineName}"\n\n`;
      } else if (line.type === "static") {
        let staticCidr = sanitizeCidr(line.staticIp || "", "");
        if (!staticCidr && parseIpv4ToInt(line.gatewayIp || "") !== null) {
          const wanIpParts = sanitizeIpv4(line.gatewayIp, "192.168.1.1").split(".");
          if (wanIpParts.length === 4) {
            staticCidr = `${wanIpParts[0]}.${wanIpParts[1]}.${wanIpParts[2]}.2/24`;
          }
        }
        if (staticCidr) {
          script += `/ip address remove [ find interface=${lineIface} address="${staticCidr}" ]\n`;
          script += `/ip address\n`;
          script += `add address=${staticCidr} interface=${lineIface} comment="Static IP for ${safeLineName}"\n\n`;
        }
      }
    });
  } else {
    const singleType = config.singleWanType || "dhcp";
    if (singleType === "dhcp") {
      script += `/ip dhcp-client remove [ find interface=${wanIface} ]\n`;
      script += `/ip dhcp-client\n`;
      script += `add interface=${wanIface} disabled=no add-default-route=yes use-peer-dns=no comment="Primary WAN DHCP Client"\n\n`;
    } else if (singleType === "static") {
      const wanAddr = sanitizeCidr(config.singleWanIp || "192.168.1.2/24", "192.168.1.2/24");
      const wanGw = sanitizeIpv4(config.singleWanGateway || "192.168.1.1", "192.168.1.1");
      script += `/ip address remove [ find interface=${wanIface} address="${wanAddr}" ]\n`;
      script += `/ip address\n`;
      script += `add address=${wanAddr} interface=${wanIface} comment="Primary WAN Static IP"\n\n`;
      script += `/ip route\n`;
      script += `add dst-address=0.0.0.0/0 gateway=${wanGw} check-gateway=ping comment="Primary WAN Default Route"\n\n`;
    } else if (singleType === "pppoe") {
      script += `/interface pppoe-client remove [ find name="pppoe-wan1" ]\n`;
      script += `/interface pppoe-client\n`;
      script += `add name="pppoe-wan1" interface=${wanIface} user="${escapeRosString(config.singleWanPppoeUser || "")}" password="${escapeRosString(config.singleWanPppoePass || "")}" disabled=no add-default-route=yes use-peer-dns=no comment="Primary WAN PPPoE Client"\n\n`;
    }
  }

  // IP Address for Primary LAN
  script += `/ip address remove [ find interface=${effectiveLan} address="${safeGatewayIp}/${safeSubnetMask}" ]\n`;
  script += `/ip address\n`;
  script += `add address=${safeGatewayIp}/${safeSubnetMask} interface=${effectiveLan} network=${networkAddress} comment="Hotspot Main Gateway IP / عنوان جيتواي الهوتسبوت الرئيسي"\n\n`;

  // DNS Cache Setup
  script += `/ip dns\n`;
  script += `set allow-remote-requests=yes servers=${dnsServersStr} max-udp-packet-size=4096 cache-size=${config.enableDnsCache ? "8192KiB" : "2048KiB"}\n\n`;

  return script;
}
