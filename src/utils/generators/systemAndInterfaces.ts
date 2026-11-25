/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import type { GeneratorContext } from "./context.ts";
import {
  escapeRosString,
  isBridgeAssignablePort,
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
    mainDnsName,
    timeZoneName,
    safeGatewayIp,
    safeSubnetMask,
    networkAddress,
    dnsServersStr,
    hotspotEnabledVlans,
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
  script += `set time-zone-autodetect=no time-zone-name=${timeZoneName}\n\n`;

  if (config.enableNtp) {
    const ntpList = (config.ntpServers || []).map((s) => s.trim()).filter(Boolean);
    const activeNtp = ntpList.length > 0 ? ntpList : ["pool.ntp.org", "time.google.com"];
    script += `/system ntp client\n`;
    if (isV7) {
      script += `set enabled=yes\n`;
      activeNtp.forEach((srv) => {
        const addr = sanitizeRosIdentifier(srv, "pool.ntp.org");
        script += `/system ntp client servers remove [ find address=${addr} ]\n`;
      });
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

  const loopProtectClause =
    config.enableLoopProtect !== false
      ? " loop-protect=on loop-protect-send-interval=5s loop-protect-disable-time=5m"
      : " loop-protect=off";

  const commentedPhysicalIfaces = new Set<string>();
  if (isPhysicalInterface(wanIface)) {
    script += `:if ([:len [/interface ethernet find default-name="${wanIface}"]] > 0) do={ /interface ethernet set [ find default-name="${wanIface}" ] name=${wanIface} comment="Primary WAN Input / كارت دخول الإنترنت الرئيسي" }\n`;
    commentedPhysicalIfaces.add(wanIface);
  }
  const lanPhysicalPorts = config.useLanBridge
    ? bridgePorts.filter((port) => isPhysicalInterface(port) && !commentedPhysicalIfaces.has(port))
    : isPhysicalInterface(lanIface) && !commentedPhysicalIfaces.has(lanIface)
      ? [lanIface]
      : [];
  lanPhysicalPorts.forEach((port) => {
    const portComment = config.useLanBridge
      ? "Hotspot LAN Bridge Member"
      : "LAN - Hotspot Output / كارت خروج المشتركين";
    script += `:if ([:len [/interface ethernet find default-name="${port}"]] > 0) do={ /interface ethernet set [ find default-name="${port}" ] name=${port}${loopProtectClause} comment="${portComment}" }\n`;
    commentedPhysicalIfaces.add(port);
  });
  if (commentedPhysicalIfaces.size > 0) {
    script += `\n`;
  }

  if (config.useLanBridge) {
    const dhcpSnoopFlag = config.enableDhcpSnooping !== false ? "yes" : "no";
    const bridgeTrustedAttr = config.enableDhcpSnooping !== false ? " trusted=no" : "";
    script += `/interface bridge remove [ find name="${escapeRosString(effectiveLan)}" ]\n`;
    script += `/interface bridge\n`;
    script += `add name="${escapeRosString(effectiveLan)}" protocol-mode=rstp dhcp-snooping=${dhcpSnoopFlag} vlan-filtering=no comment="Hotspot LAN Bridge"\n`;
    if (bridgePorts.length > 0) {
      bridgePorts.forEach((port) => {
        script += `/interface bridge port remove [ find interface=${port} ]\n`;
      });
      script += `/interface bridge port\n`;
      bridgePorts.forEach((port) => {
        script += `add bridge="${escapeRosString(effectiveLan)}" interface=${port}${bridgeTrustedAttr}\n`;
      });
    }
    script += `\n`;
  } else if (isBridgeAssignablePort(lanIface)) {
    script += `/interface bridge port remove [ find interface=${lanIface} ]\n\n`;
  }

  // WAN Client / Static / PPPoE Configuration
  if (isMultiWan) {
    config.wanLines.forEach((line) => {
      const lineIface = sanitizeRosIdentifier(line.interfaceName, "ether1");
      const safeLineName = escapeRosString(line.name);
      if (isPhysicalInterface(lineIface) && !commentedPhysicalIfaces.has(lineIface)) {
        script += `:if ([:len [/interface ethernet find default-name="${lineIface}"]] > 0) do={ /interface ethernet set [ find default-name="${lineIface}" ] name=${lineIface} comment="WAN Line: ${safeLineName}" }\n`;
        commentedPhysicalIfaces.add(lineIface);
      }
      if (isBridgeAssignablePort(lineIface)) {
        script += `/interface bridge port remove [ find interface=${lineIface} ]\n`;
      }
      if (line.type !== "dhcp") {
        script += `/ip dhcp-client remove [ find interface=${lineIface} ]\n`;
      }
      const pppoeName = `pppoe-${sanitizeRosIdentifier(line.name, "WAN")}`;
      if (line.type !== "pppoe") {
        script += `/interface pppoe-client remove [ find name="${escapeRosString(pppoeName)}" ]\n`;
      }

      if (line.type === "dhcp") {
        script += `/ip dhcp-client remove [ find interface=${lineIface} ]\n`;
        script += `/ip dhcp-client\n`;
        script += `add interface=${lineIface} disabled=no add-default-route=no use-peer-dns=no comment="DHCP Client for ${safeLineName} (Multi-WAN managed routes)"\n\n`;
      } else if (line.type === "pppoe") {
        script += `/interface pppoe-client remove [ find name="${escapeRosString(pppoeName)}" ]\n`;
        script += `/interface pppoe-client\n`;
        script += `add name="${escapeRosString(pppoeName)}" interface=${lineIface} user="${escapeRosString(line.pppoeUser || "")}" password="${escapeRosString(line.pppoePass || "")}" disabled=no add-default-route=no use-peer-dns=no comment="PPPoE Client for ${safeLineName}"\n\n`;
      } else if (line.type === "static") {
        let staticCidr = sanitizeCidr(line.staticIp || "", "");
        if (!staticCidr && parseIpv4ToInt(line.gatewayIp || "") !== null) {
          const wanIpParts = sanitizeIpv4(line.gatewayIp, "192.168.1.1").split(".");
          if (wanIpParts.length === 4) {
            staticCidr = `${wanIpParts[0]}.${wanIpParts[1]}.${wanIpParts[2]}.2/24`;
          }
        }
        if (staticCidr) {
          script += `/ip address remove [ find where !dynamic and ((interface=${lineIface} and address="${staticCidr}") or comment="Static IP for ${safeLineName}") ]\n`;
          script += `/ip address\n`;
          script += `add address=${staticCidr} interface=${lineIface} comment="Static IP for ${safeLineName}"\n\n`;
        }
      }
    });
  } else {
    if (isBridgeAssignablePort(wanIface)) {
      script += `/interface bridge port remove [ find interface=${wanIface} ]\n`;
    }
    const singleType = config.singleWanType || "dhcp";
    if (singleType !== "dhcp") {
      script += `/ip dhcp-client remove [ find comment="Primary WAN DHCP Client" ]\n`;
    }
    if (singleType !== "pppoe") {
      script += `/interface pppoe-client remove [ find name="pppoe-wan1" ]\n`;
    }
    if (singleType === "dhcp") {
      script += `/ip dhcp-client remove [ find interface=${wanIface} ]\n`;
      script += `/ip dhcp-client\n`;
      script += `add interface=${wanIface} disabled=no add-default-route=yes use-peer-dns=no comment="Primary WAN DHCP Client"\n\n`;
    } else if (singleType === "static") {
      const wanAddr = sanitizeCidr(config.singleWanIp || "192.168.1.2/24", "192.168.1.2/24");
      const wanGw = sanitizeIpv4(config.singleWanGateway || "192.168.1.1", "192.168.1.1");
      script += `/ip address remove [ find where !dynamic and ((interface=${wanIface} and address="${wanAddr}") or comment="Primary WAN Static IP") ]\n`;
      script += `/ip address\n`;
      script += `add address=${wanAddr} interface=${wanIface} comment="Primary WAN Static IP"\n\n`;
      script += `/ip route remove [ find where !dynamic and comment="Primary WAN Default Route" ]\n`;
      script += `/ip route\n`;
      script += `add dst-address=0.0.0.0/0 gateway=${wanGw} check-gateway=ping comment="Primary WAN Default Route"\n\n`;
    } else if (singleType === "pppoe") {
      script += `/interface pppoe-client remove [ find name="pppoe-wan1" ]\n`;
      script += `/interface pppoe-client\n`;
      script += `add name="pppoe-wan1" interface=${wanIface} user="${escapeRosString(config.singleWanPppoeUser || "")}" password="${escapeRosString(config.singleWanPppoePass || "")}" disabled=no add-default-route=yes use-peer-dns=no comment="Primary WAN PPPoE Client"\n\n`;
    }
  }

  // IP Address for Primary LAN
  script += `/ip address remove [ find where !dynamic and ((interface=${effectiveLan} and address="${safeGatewayIp}/${safeSubnetMask}") or comment="Hotspot Main Gateway IP / عنوان جيتواي الهوتسبوت الرئيسي") ]\n`;
  script += `/ip address\n`;
  script += `add address=${safeGatewayIp}/${safeSubnetMask} interface=${effectiveLan} network=${networkAddress} comment="Hotspot Main Gateway IP / عنوان جيتواي الهوتسبوت الرئيسي"\n\n`;

  // DNS Cache & Portal Static DNS Setup
  script += `/ip dns\n`;
  script += `set allow-remote-requests=yes servers=${dnsServersStr} max-udp-packet-size=4096 cache-size=${config.enableDnsCache ? "8192KiB" : "2048KiB"}\n`;
  const dnsToIps = new Map<string, Set<string>>();
  const addPortalDns = (host: string, ip: string) => {
    if (!dnsToIps.has(host)) dnsToIps.set(host, new Set());
    dnsToIps.get(host)!.add(ip);
  };
  addPortalDns(mainDnsName, safeGatewayIp);
  hotspotEnabledVlans.forEach((vlan) => {
    const vlanDns = sanitizeRosIdentifier((vlan.hotspotDnsName || "").trim() || mainDnsName, mainDnsName);
    addPortalDns(vlanDns, vlan.gatewayIp);
  });
  script += `/ip dns static remove [ find where !dynamic and comment="Hotspot Portal DNS" ]\n`;
  const uniquePortalDns: Array<[string, string]> = [];
  dnsToIps.forEach((ips, host) => {
    if (ips.size === 1) {
      uniquePortalDns.push([host, Array.from(ips)[0]]);
    }
  });
  if (uniquePortalDns.length > 0) {
    uniquePortalDns.forEach(([host]) => {
      script += `/ip dns static remove [ find where !dynamic and name="${escapeRosString(host)}" ]\n`;
    });
    script += `/ip dns static\n`;
    uniquePortalDns.forEach(([host, ip]) => {
      script += `add name="${escapeRosString(host)}" address=${ip} comment="Hotspot Portal DNS"\n`;
    });
  }
  script += `\n`;

  return script;
}
