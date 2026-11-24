/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import type { GeneratorContext } from "./context.ts";

/**
 * Generates Section 8 (HOTSPOT_GW_IPS, Firewall forward & input chains,
 * /ip service hardening, and Anti-sharing TTL=1).
 */
export function generateFirewallAndSecuritySection(ctx: GeneratorContext): string {
  const {
    config,
    useRadius,
    effectiveLan,
    safeGatewayIp,
    hasVlans,
    hotspotEnabledVlans,
    radServerIpSafe,
    coaPortSafe,
  } = ctx;

  let script = "";

  // 8. Firewall Hardening, Isolation, Services & Anti-Sharing TTL
  script += `# ---------------------------------------------------------------------\n`;
  script += `# 8. Firewall Security & FastTrack Bypass / حماية الجدار الناري وتجاوز الفاست تراك\n`;
  script += `# ---------------------------------------------------------------------\n`;

  const hotspotGwIps = new Set<string>([safeGatewayIp]);
  hotspotEnabledVlans.forEach((vlan) => hotspotGwIps.add(vlan.gatewayIp));
  script += `/ip firewall address-list remove [ find list=HOTSPOT_GW_IPS ]\n`;
  script += `/ip firewall address-list\n`;
  hotspotGwIps.forEach((ip) => {
    script += `add address=${ip} list=HOTSPOT_GW_IPS comment="Hotspot Portal Gateway IP"\n`;
  });
  script += `\n`;

  // Clean previously generated firewall filter rules (!dynamic protects dynamic Hotspot chains)
  script += `/ip firewall filter remove [ find where !dynamic and (comment="Drop Invalid Forward Packets" or comment="Isolate VLANs & Main LAN from Each Other" or comment="Bypass FastTrack for Hotspot Upload" or comment="Bypass FastTrack for Hotspot Download" or comment="Bypass FastTrack for Multi-WAN Mangle") ]\n`;
  script += `/ip firewall filter remove [ find where !dynamic and (comment="Accept Established/Related Input" or comment="Drop Invalid Input Packets" or comment="Allow Localhost Loopback (RADIUS & CoA)" or comment="Allow Incoming RADIUS CoA" or comment="Block Hotspot Clients from Router Management Ports" or comment="Block Hotspot Clients from WebFig on Non-Portal IPs") ]\n`;
  script += `/ip firewall filter remove [ find where !dynamic and (comment="Allow Hotspot LAN/VLAN DNS & DHCP" or comment="Allow Hotspot LAN/VLAN DNS TCP" or comment="Allow Hotspot Captive Portal HTTP/HTTPS" or comment="Drop WAN DNS UDP" or comment="Drop WAN DNS TCP" or comment="Drop SSH Brute Force Blacklist" or comment="SSH Brute Force Blacklist" or comment="SSH Brute Force Stage 2" or comment="SSH Brute Force Stage 1" or comment="Drop All Unsolicited Input from WAN (Protects Winbox/WebFig/SSH)") ]\n`;

  script += `/ip firewall filter\n`;

  // Forward chain: Drop Invalid & Isolate VLANs MUST sit ABOVE FastTrack Bypass accepts
  const forwardSecurityAndBypassRules: string[] = [];
  if (config.enableFirewallHardening) {
    forwardSecurityAndBypassRules.push(
      `add action=drop chain=forward connection-state=invalid comment="Drop Invalid Forward Packets"`
    );
  }
  if (hasVlans && config.isolateVlans) {
    forwardSecurityAndBypassRules.push(
      `add action=drop chain=forward in-interface-list=HOTSPOT_LAN out-interface-list=HOTSPOT_LAN comment="Isolate VLANs & Main LAN from Each Other"`
    );
  }
  if (config.bypassFasttrack) {
    forwardSecurityAndBypassRules.push(
      `add action=accept chain=forward connection-state=established,related hotspot=from-client comment="Bypass FastTrack for Hotspot Upload"`,
      `add action=accept chain=forward connection-state=established,related hotspot=to-client comment="Bypass FastTrack for Hotspot Download"`
    );
    if (config.loadBalancingMethod === "pcc" || config.loadBalancingMethod === "nth") {
      forwardSecurityAndBypassRules.push(
        `add action=accept chain=forward connection-state=established,related connection-mark=!no-mark comment="Bypass FastTrack for Multi-WAN Mangle"`
      );
    }
  }

  if (forwardSecurityAndBypassRules.length > 0) {
    script += `:local ftRule ([/ip firewall filter find where action="fasttrack-connection"]->0);\n`;
    script += `:if ([:typeof $ftRule] = "id") do={\n`;
    forwardSecurityAndBypassRules.forEach((rule) => {
      script += `  ${rule} place-before=$ftRule\n`;
    });
    script += `} else={\n`;
    forwardSecurityAndBypassRules.forEach((rule) => {
      script += `  ${rule}\n`;
    });
    script += `}\n`;
  }

  // Input chain: essential loopback, RADIUS CoA, and LAN/VLAN Hotspot service accepts
  // MUST sit above any pre-existing defconf input drop rule.
  const inputPreDropRules: string[] = [];
  if (config.enableFirewallHardening || config.blockWanManagement) {
    inputPreDropRules.push(
      `add action=accept chain=input connection-state=established,related,untracked comment="Accept Established/Related Input"`,
      `add action=drop chain=input connection-state=invalid comment="Drop Invalid Input Packets"`
    );
  }
  if (useRadius || config.enableFirewallHardening || config.blockWanManagement) {
    inputPreDropRules.push(
      `add action=accept chain=input src-address=127.0.0.1 dst-address=127.0.0.1 comment="Allow Localhost Loopback (RADIUS & CoA)"`
    );
  }
  if (useRadius && radServerIpSafe !== "127.0.0.1" && (config.enableFirewallHardening || config.blockWanManagement)) {
    inputPreDropRules.push(
      `add action=accept chain=input protocol=udp src-address=${radServerIpSafe} dst-port=${coaPortSafe} comment="Allow Incoming RADIUS CoA"`
    );
  }
  if (config.blockHotspotRouterAccess) {
    inputPreDropRules.push(
      `add action=drop chain=input dst-port=21,22,23,2000,8291,8728,8729 protocol=tcp hotspot=from-client comment="Block Hotspot Clients from Router Management Ports"`,
      `add action=drop chain=input dst-port=80,443 protocol=tcp dst-address-list=!HOTSPOT_GW_IPS hotspot=from-client comment="Block Hotspot Clients from WebFig on Non-Portal IPs"`
    );
  }

  const lanInputMatcher = hasVlans ? `in-interface-list=HOTSPOT_LAN` : `in-interface=${effectiveLan}`;
  inputPreDropRules.push(
    `add action=accept chain=input protocol=udp dst-port=53,67 ${lanInputMatcher} comment="Allow Hotspot LAN/VLAN DNS & DHCP"`,
    `add action=accept chain=input protocol=tcp dst-port=53 ${lanInputMatcher} comment="Allow Hotspot LAN/VLAN DNS TCP"`,
    `add action=accept chain=input protocol=tcp dst-port=80,443,64872-64875 dst-address-list=HOTSPOT_GW_IPS ${lanInputMatcher} comment="Allow Hotspot Captive Portal HTTP/HTTPS"`
  );

  if (config.enableFirewallHardening) {
    inputPreDropRules.push(
      `add action=drop chain=input dst-port=53 in-interface-list=WAN_LIST protocol=udp comment="Drop WAN DNS UDP"`,
      `add action=drop chain=input dst-port=53 in-interface-list=WAN_LIST protocol=tcp comment="Drop WAN DNS TCP"`,
      `add action=drop chain=input dst-port=22 protocol=tcp src-address-list=ssh_black_list comment="Drop SSH Brute Force Blacklist"`,
      `add action=add-src-to-address-list address-list=ssh_black_list address-list-timeout=1d chain=input dst-port=22 protocol=tcp connection-state=new src-address-list=ssh_stage2 comment="SSH Brute Force Blacklist"`,
      `add action=add-src-to-address-list address-list=ssh_stage2 address-list-timeout=1m chain=input dst-port=22 protocol=tcp connection-state=new src-address-list=ssh_stage1 comment="SSH Brute Force Stage 2"`,
      `add action=add-src-to-address-list address-list=ssh_stage1 address-list-timeout=1m chain=input dst-port=22 protocol=tcp connection-state=new comment="SSH Brute Force Stage 1"`
    );
  }

  script += `:local inDrop ([/ip firewall filter find where chain="input" and !dynamic and action="drop"]->0);\n`;
  script += `:if ([:typeof $inDrop] = "id") do={\n`;
  inputPreDropRules.forEach((rule) => {
    script += `  ${rule} place-before=$inDrop\n`;
  });
  script += `} else={\n`;
  inputPreDropRules.forEach((rule) => {
    script += `  ${rule}\n`;
  });
  script += `}\n`;

  if (config.blockWanManagement) {
    script += `add action=drop chain=input in-interface-list=WAN_LIST comment="Drop All Unsolicited Input from WAN (Protects Winbox/WebFig/SSH)"\n`;
  }
  script += `\n`;

  if (config.disableUnusedServices) {
    script += `# Disable insecure / unused management services\n`;
    script += `/ip service\n`;
    script += `set telnet disabled=yes\n`;
    script += `set ftp disabled=yes\n`;
    script += `set api disabled=yes\n`;
    script += `set api-ssl disabled=yes\n\n`;
  }

  script += `/ip firewall mangle remove [ find where !dynamic and comment~"^Anti-Sharing: Force TTL=1" ]\n`;
  if (config.preventSharingTtl) {
    script += `# Anti-Sharing: Force TTL=1 to prevent client router/hotspot sharing\n`;
    script += `/ip firewall mangle\n`;
    script += `add action=change-ttl chain=postrouting new-ttl=set:1 out-interface=${effectiveLan} passthrough=yes comment="Anti-Sharing: Force TTL=1 on Hotspot LAN"\n`;
    hotspotEnabledVlans.forEach((vlan) => {
      script += `add action=change-ttl chain=postrouting new-ttl=set:1 out-interface="${vlan.safeVlanName}" passthrough=yes comment="Anti-Sharing: Force TTL=1 on ${vlan.safeVlanName}"\n`;
    });
    script += `\n`;
  }

  return script;
}
