/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import type { GeneratorContext } from "./context.ts";
import {
  calculateNetworkAddress,
  clampInt,
  escapeRosString,
  getCanaryHost,
  getWanGateway,
  getWanOutInterface,
  parseIpv4ToInt,
  sanitizeCidr,
  sanitizeRosIdentifier,
} from "./helpers.ts";

function lWeightOrOne(weight?: number): number {
  return typeof weight === "number" && Number.isFinite(weight) ? weight : 1;
}

/**
 * Generates Section 2 (VLANs, Bridge VLAN Filtering, HOTSPOT_LAN list),
 * Section 3 (WAN_LIST, NAT, PCC/NTH/Failover/ECMP + Recursive/PPPoE routes),
 * and Section 4 (Main LAN IP Pool & DHCP Server).
 */
export function generateVlansAndMultiWanSection(ctx: GeneratorContext): string {
  const {
    config,
    isV7,
    wanIface,
    effectiveLan,
    poolName,
    safeGatewayIp,
    safeSubnetMask,
    safePoolStart,
    safePoolEnd,
    networkAddress,
    hasVlans,
    resolvedVlans,
    hotspotEnabledVlans,
    isMultiWan,
  } = ctx;

  let script = "";

  // 2. VLANs Configuration
  if (hasVlans) {
    script += `# ---------------------------------------------------------------------\n`;
    script += `# 2. VLANs Configuration / إعدادات الشبكات الافتراضية بالفيلان (VLANs)\n`;
    script += `# ---------------------------------------------------------------------\n`;

    resolvedVlans.forEach((vlan) => {
      script += `/interface vlan remove [ find name="${vlan.safeVlanName}" ]\n`;
    });
    script += `/interface vlan\n`;
    resolvedVlans.forEach((vlan) => {
      const safeComment = escapeRosString(vlan.comment || `VLAN ${vlan.safeVlanId}`);
      script += `add name="${vlan.safeVlanName}" vlan-id=${vlan.safeVlanId} interface=${vlan.parentInterface} comment="${safeComment}"\n`;
    });
    script += `\n`;

    script += `/ip address\n`;
    resolvedVlans.forEach((vlan) => {
      script += `add address=${vlan.gatewayIp}/${vlan.subnetMask} interface="${vlan.safeVlanName}" network=${vlan.network} comment="IP Gateway for ${vlan.safeVlanName}"\n`;
    });
    script += `\n`;

    // VLAN Pools & DHCP Servers
    resolvedVlans.forEach((vlan) => {
      const poolNameVlan = `pool-${vlan.safeIdName}`;

      if (vlan.dhcpEnabled || vlan.enableHotspotOnVlan) {
        script += `/ip pool remove [ find name=${poolNameVlan} ]\n`;
        script += `/ip pool\n`;
        script += `add name=${poolNameVlan} ranges=${vlan.poolStart}-${vlan.poolEnd}\n`;
      }

      if (vlan.dhcpEnabled) {
        script += `/ip dhcp-server remove [ find name="dhcp-${vlan.safeVlanName}" ]\n`;
        script += `/ip dhcp-server\n`;
        script += `add address-pool=${poolNameVlan} disabled=no interface="${vlan.safeVlanName}" name="dhcp-${vlan.safeVlanName}" lease-time=1h\n`;

        script += `/ip dhcp-server network\n`;
        script += `add address=${vlan.network}/${vlan.subnetMask} dns-server=${vlan.gatewayIp} gateway=${vlan.gatewayIp} netmask=${vlan.subnetMask} comment="DHCP Network for ${vlan.safeVlanName}"\n\n`;
      } else if (vlan.enableHotspotOnVlan) {
        script += `\n`;
      }
    });

    // Optional Bridge VLAN Filtering
    if (config.useLanBridge && config.enableBridgeVlanFiltering) {
      const untaggedCommands: string[] = [];
      resolvedVlans.forEach((vlan) => {
        const untagged = (vlan.untaggedPorts || "").split(",").map((p) => sanitizeRosIdentifier(p, "")).filter(Boolean);
        untagged.forEach((port) => {
          untaggedCommands.push(`set [ find bridge="${escapeRosString(effectiveLan)}" interface=${port} ] pvid=${vlan.safeVlanId}`);
        });
      });
      if (untaggedCommands.length > 0) {
        script += `/interface bridge port\n`;
        untaggedCommands.forEach((cmd) => {
          script += `${cmd}\n`;
        });
      }

      script += `/interface bridge vlan\n`;
      resolvedVlans.forEach((vlan) => {
        const tagged = (vlan.taggedPorts || "").split(",").map((p) => sanitizeRosIdentifier(p, "")).filter(Boolean);
        const untagged = (vlan.untaggedPorts || "").split(",").map((p) => sanitizeRosIdentifier(p, "")).filter(Boolean);
        const taggedList = Array.from(new Set([effectiveLan, ...tagged])).join(",");
        const untaggedClause = untagged.length > 0 ? ` untagged=${untagged.join(",")}` : "";
        script += `add bridge="${escapeRosString(effectiveLan)}" vlan-ids=${vlan.safeVlanId} tagged=${taggedList}${untaggedClause}\n`;
      });

      script += `/interface bridge\n`;
      script += `set [ find name="${escapeRosString(effectiveLan)}" ] vlan-filtering=yes\n\n`;
    }

    // Create HOTSPOT_LAN interface list once for Multi-WAN and Inter-VLAN Isolation
    script += `/interface list remove [ find name=HOTSPOT_LAN ]\n`;
    script += `/interface list\n`;
    script += `add name=HOTSPOT_LAN comment="All LAN & VLAN interfaces"\n`;
    script += `/interface list member\n`;
    script += `add interface=${effectiveLan} list=HOTSPOT_LAN\n`;
    resolvedVlans.forEach((vlan) => {
      script += `add interface="${vlan.safeVlanName}" list=HOTSPOT_LAN\n`;
    });
    script += `\n`;
  }

  // 3. WAN Interface List, NAT & Multi-WAN Load Balancing
  const wanOutInterfaces = isMultiWan
    ? Array.from(new Set(config.wanLines.map(getWanOutInterface).filter(Boolean)))
    : [config.singleWanType === "pppoe" ? "pppoe-wan1" : wanIface];

  script += `# ---------------------------------------------------------------------\n`;
  script += `# 3. WAN Interface List, NAT & Load Balancing (${isMultiWan ? config.loadBalancingMethod.toUpperCase() : "SINGLE WAN"})\n`;
  script += `# ---------------------------------------------------------------------\n`;
  script += `/interface list remove [ find name=WAN_LIST ]\n`;
  script += `/interface list\n`;
  script += `add name=WAN_LIST comment="All active Internet WAN interfaces"\n`;
  script += `/interface list member\n`;
  wanOutInterfaces.forEach((iface) => {
    script += `add interface=${iface} list=WAN_LIST\n`;
  });
  script += `\n`;

  if (isMultiWan) {
    const lines = config.wanLines;

    // Firewall NAT for all WAN lines
    script += `/ip firewall nat\n`;
    lines.forEach((line) => {
      const outIface = getWanOutInterface(line);
      script += `add action=masquerade chain=srcnat out-interface=${outIface} comment="NAT Masquerade for ${escapeRosString(line.name)}"\n`;
    });
    script += `\n`;

    if (config.loadBalancingMethod === "pcc" || config.loadBalancingMethod === "nth") {
      const isPcc = config.loadBalancingMethod === "pcc";

      if (isV7) {
        script += `# RouterOS v7 Routing Tables (must exist before Mangle & Routes)\n`;
        lines.forEach((_, idx) => {
          script += `/routing table remove [ find name=to_WAN${idx + 1} ]\n`;
        });
        script += `/routing table\n`;
        lines.forEach((line, idx) => {
          script += `add disabled=no fib name=to_WAN${idx + 1} comment="Routing table for ${escapeRosString(line.name)}"\n`;
        });
        script += `\n`;
      }

      // Build LOCAL_SUBNETS address list to protect LAN, VLANs, and Modem subnets from policy routing
      const localSubnets = new Set<string>();
      localSubnets.add(`${networkAddress}/${safeSubnetMask}`);
      if (hasVlans) {
        resolvedVlans.forEach((vlan) => {
          localSubnets.add(`${vlan.network}/${vlan.subnetMask}`);
        });
      }
      lines.forEach((line) => {
        if (line.type === "pppoe") return;
        const staticIp = sanitizeCidr(line.staticIp || "", "");
        if (staticIp && staticIp.includes("/")) {
          const [ipOnly, prefixStr] = staticIp.split("/");
          const cidr = parseInt(prefixStr, 10);
          if (!isNaN(cidr)) {
            localSubnets.add(`${calculateNetworkAddress(ipOnly, cidr)}/${cidr}`);
            return;
          }
        }
        if (parseIpv4ToInt(line.gatewayIp) !== null) {
          localSubnets.add(`${calculateNetworkAddress(line.gatewayIp, 24)}/24`);
        }
      });

      script += `/ip firewall address-list\n`;
      localSubnets.forEach((subnet) => {
        script += `add address=${subnet} list=LOCAL_SUBNETS comment="Local/VLAN/Modem Subnet"\n`;
      });
      script += `\n`;

      const lanMatcher = hasVlans ? `in-interface-list=HOTSPOT_LAN` : `in-interface=${effectiveLan}`;
      let hotspotMatcher = `in-interface=${effectiveLan}`;
      if (hotspotEnabledVlans.length > 0) {
        script += `/interface list remove [ find name=HOTSPOT_AUTH_IFACES ]\n`;
        script += `/interface list\n`;
        script += `add name=HOTSPOT_AUTH_IFACES comment="Hotspot-enabled interfaces"\n`;
        script += `/interface list member\n`;
        script += `add interface=${effectiveLan} list=HOTSPOT_AUTH_IFACES\n`;
        hotspotEnabledVlans.forEach((vlan) => {
          script += `add interface="${vlan.safeVlanName}" list=HOTSPOT_AUTH_IFACES\n`;
        });
        script += `\n`;
        hotspotMatcher = `in-interface-list=HOTSPOT_AUTH_IFACES`;
      }

      script += isPcc
        ? `# PCC (Per Connection Classifier) Mangle Rules for High Stability & HTTPS Support\n`
        : `# NTH (Round-Robin Connection) Mangle Rules\n`;
      script += `/ip firewall mangle\n`;

      // Accept local/modem subnets & unauthenticated Hotspot portal traffic
      script += `add action=accept chain=prerouting dst-address-list=LOCAL_SUBNETS comment="Bypass Load Balancing for Local, VLAN & Modem Subnets"\n`;
      script += `add action=accept chain=prerouting ${hotspotMatcher} hotspot=!auth comment="Allow Unauthenticated Hotspot Clients to Reach Login Portal"\n`;

      // WAN Input connection marking
      lines.forEach((line, idx) => {
        const inIface = getWanOutInterface(line);
        const markName = `WAN${idx + 1}_conn`;
        script += `add action=mark-connection chain=input connection-mark=no-mark in-interface=${inIface} new-connection-mark=${markName} passthrough=yes comment="Mark incoming connection on ${escapeRosString(line.name)}"\n`;
      });

      // Output policy routing
      lines.forEach((line, idx) => {
        const markName = `WAN${idx + 1}_conn`;
        const routeMark = `to_WAN${idx + 1}`;
        script += `add action=mark-routing chain=output connection-mark=${markName} new-routing-mark=${routeMark} passthrough=no comment="Route output via ${escapeRosString(line.name)}"\n`;
      });

      if (isPcc) {
        const weights = lines.map((l) => clampInt(l.weight || 1, 1, 10, 1));
        const totalSlots = weights.reduce((acc, w) => acc + w, 0);
        const classifier = config.stickyConnections ? "both-addresses" : "both-addresses-and-ports";
        let slotIndex = 0;

        lines.forEach((line, idx) => {
          const connMark = `WAN${idx + 1}_conn`;
          const w = weights[idx];
          for (let s = 0; s < w; s++) {
            script += `add action=mark-connection chain=prerouting connection-mark=no-mark dst-address-type=!local ${lanMatcher} per-connection-classifier=${classifier}:${totalSlots}/${slotIndex} new-connection-mark=${connMark} passthrough=yes comment="PCC Rule ${slotIndex + 1}/${totalSlots} (${escapeRosString(line.name)})"\n`;
            slotIndex++;
          }
        });
      } else {
        const weightedLineIndices: number[] = [];
        lines.forEach((line, idx) => {
          const w = clampInt(lWeightOrOne(line.weight), 1, 10, 1);
          for (let s = 0; s < w; s++) {
            weightedLineIndices.push(idx);
          }
        });

        weightedLineIndices.forEach((lineIdx, k) => {
          const remaining = weightedLineIndices.length - k;
          const connMark = `WAN${lineIdx + 1}_conn`;
          const lineName = escapeRosString(lines[lineIdx].name);
          if (remaining > 1) {
            script += `add action=mark-connection chain=prerouting connection-state=new connection-mark=no-mark dst-address-type=!local ${lanMatcher} nth=${remaining},1 new-connection-mark=${connMark} passthrough=yes comment="NTH Rule ${k + 1}/${weightedLineIndices.length} (${lineName})"\n`;
          } else {
            script += `add action=mark-connection chain=prerouting connection-state=new connection-mark=no-mark dst-address-type=!local ${lanMatcher} new-connection-mark=${connMark} passthrough=yes comment="NTH Final Rule (${lineName})"\n`;
          }
        });
      }

      // Prerouting routing marks (one per WAN line)
      lines.forEach((_, idx) => {
        const connMark = `WAN${idx + 1}_conn`;
        const routeMark = `to_WAN${idx + 1}`;
        script += `add action=mark-routing chain=prerouting connection-mark=${connMark} ${lanMatcher} new-routing-mark=${routeMark} passthrough=no\n`;
      });
      script += `\n`;

      // Routes
      script += `/ip route\n`;
      const label = isPcc ? "PCC" : "NTH";
      const canaryScope = isV7 ? "scope=11 target-scope=10" : "scope=10 target-scope=10";
      const recTargetScope = isV7 ? "target-scope=12" : "target-scope=11";
      const routeAttr = isV7 ? "routing-table" : "routing-mark";

      if (config.enableRecursiveFailover) {
        lines.forEach((line, idx) => {
          if (line.type === "pppoe") return;
          const gw = getWanGateway(line);
          const canary = getCanaryHost(line, idx);
          script += `add dst-address=${canary}/32 gateway=${gw} ${canaryScope} comment="Recursive Canary for ${escapeRosString(line.name)}"\n`;
        });
        lines.forEach((line, idx) => {
          const routeMark = `to_WAN${idx + 1}`;
          if (line.type === "pppoe") {
            const gw = getWanGateway(line);
            script += `add dst-address=0.0.0.0/0 distance=1 gateway=${gw} ${routeAttr}=${routeMark} check-gateway=ping comment="${label} Direct Route for PPPoE ${escapeRosString(line.name)}"\n`;
          } else {
            const canary = getCanaryHost(line, idx);
            script += `add dst-address=0.0.0.0/0 distance=1 gateway=${canary} ${routeAttr}=${routeMark} check-gateway=ping scope=30 ${recTargetScope} comment="${label} Recursive Route for ${escapeRosString(line.name)}"\n`;
          }
        });
        lines.forEach((line, idx) => {
          if (line.type === "pppoe") {
            const gw = getWanGateway(line);
            script += `add dst-address=0.0.0.0/0 distance=${idx + 1} gateway=${gw} check-gateway=ping comment="Fallback direct route via PPPoE ${escapeRosString(line.name)}"\n`;
          } else {
            const canary = getCanaryHost(line, idx);
            script += `add dst-address=0.0.0.0/0 distance=${idx + 1} gateway=${canary} check-gateway=ping scope=30 ${recTargetScope} comment="Fallback recursive route via ${escapeRosString(line.name)}"\n`;
          }
        });
      } else {
        lines.forEach((line, idx) => {
          const gw = getWanGateway(line);
          const routeMark = `to_WAN${idx + 1}`;
          script += `add distance=1 gateway=${gw} ${routeAttr}=${routeMark} check-gateway=ping comment="${label} Route for ${escapeRosString(line.name)}"\n`;
        });
        lines.forEach((line, idx) => {
          const gw = getWanGateway(line);
          script += `add distance=${idx + 1} gateway=${gw} check-gateway=ping comment="Fallback route via ${escapeRosString(line.name)}"\n`;
        });
      }
      script += `\n`;
    } else if (config.loadBalancingMethod === "failover") {
      script += config.enableRecursiveFailover
        ? `# Recursive Internet Failover Routing (Tests Real Internet Reachability)\n`
        : `# Active/Passive Automatic Failover Routing\n`;
      script += `/ip route\n`;
      const canaryScope = isV7 ? "scope=11 target-scope=10" : "scope=10 target-scope=10";
      const recTargetScope = isV7 ? "target-scope=12" : "target-scope=11";
      if (config.enableRecursiveFailover) {
        lines.forEach((line, idx) => {
          if (line.type === "pppoe") return;
          const gw = getWanGateway(line);
          const canary = getCanaryHost(line, idx);
          script += `add dst-address=${canary}/32 gateway=${gw} ${canaryScope} comment="Recursive Canary for ${escapeRosString(line.name)}"\n`;
        });
        lines.forEach((line, idx) => {
          const dist = clampInt(line.distance || idx + 1, 1, 255, idx + 1);
          if (line.type === "pppoe") {
            const gw = getWanGateway(line);
            script += `add dst-address=0.0.0.0/0 distance=${dist} gateway=${gw} check-gateway=ping comment="Failover PPPoE Line ${idx + 1}: ${escapeRosString(line.name)}"\n`;
          } else {
            const canary = getCanaryHost(line, idx);
            script += `add dst-address=0.0.0.0/0 distance=${dist} gateway=${canary} check-gateway=ping scope=30 ${recTargetScope} comment="Recursive Failover Line ${idx + 1}: ${escapeRosString(line.name)}"\n`;
          }
        });
      } else {
        lines.forEach((line, idx) => {
          const gw = getWanGateway(line);
          const dist = clampInt(line.distance || idx + 1, 1, 255, idx + 1);
          script += `add distance=${dist} gateway=${gw} check-gateway=ping comment="Failover Line ${idx + 1}: ${escapeRosString(line.name)}"\n`;
        });
      }
      script += `\n`;
    } else if (config.loadBalancingMethod === "ecmp") {
      script += `# Equal Cost Multi-Path (ECMP) Default Route\n`;
      script += `/ip route\n`;
      const canaryScope = isV7 ? "scope=11 target-scope=10" : "scope=10 target-scope=10";
      const recTargetScope = isV7 ? "target-scope=12" : "target-scope=11";
      if (config.enableRecursiveFailover) {
        lines.forEach((line, idx) => {
          if (line.type === "pppoe") return;
          const gw = getWanGateway(line);
          const canary = getCanaryHost(line, idx);
          script += `add dst-address=${canary}/32 gateway=${gw} ${canaryScope} comment="Recursive Canary for ${escapeRosString(line.name)}"\n`;
        });
        if (isV7) {
          lines.forEach((line, idx) => {
            if (line.type === "pppoe") {
              const gw = getWanGateway(line);
              script += `add dst-address=0.0.0.0/0 distance=1 gateway=${gw} check-gateway=ping comment="ECMP Direct PPPoE Route ${idx + 1}: ${escapeRosString(line.name)}"\n`;
            } else {
              const canary = getCanaryHost(line, idx);
              script += `add dst-address=0.0.0.0/0 distance=1 gateway=${canary} check-gateway=ping scope=30 ${recTargetScope} comment="ECMP Recursive Route ${idx + 1}: ${escapeRosString(line.name)}"\n`;
            }
          });
        } else {
          const expandedGateways: string[] = [];
          lines.forEach((line, idx) => {
            const target = line.type === "pppoe" ? getWanGateway(line) : getCanaryHost(line, idx);
            const w = clampInt(line.weight || 1, 1, 10, 1);
            for (let s = 0; s < w; s++) {
              expandedGateways.push(target);
            }
          });
          script += `add distance=1 gateway=${expandedGateways.join(",")} check-gateway=ping scope=30 ${recTargetScope} comment="ECMP Recursive Combined Gateway Route"\n`;
        }
      } else if (isV7) {
        lines.forEach((line, idx) => {
          const gw = getWanGateway(line);
          script += `add dst-address=0.0.0.0/0 distance=1 gateway=${gw} check-gateway=ping comment="ECMP Route ${idx + 1}: ${escapeRosString(line.name)}"\n`;
        });
      } else {
        const expandedGateways: string[] = [];
        lines.forEach((line) => {
          const gw = getWanGateway(line);
          const w = clampInt(line.weight || 1, 1, 10, 1);
          for (let s = 0; s < w; s++) {
            expandedGateways.push(gw);
          }
        });
        script += `add distance=1 gateway=${expandedGateways.join(",")} check-gateway=ping comment="ECMP Combined Gateway Route"\n`;
      }
      script += `\n`;
    }
  } else {
    // Single WAN Default NAT
    script += `/ip firewall nat\n`;
    script += `add action=masquerade chain=srcnat out-interface=${wanOutInterfaces[0]} comment="NAT masquerade for single internet WAN"\n\n`;
  }

  // 4. DHCP Server & IP Pools for Main LAN
  script += `# ---------------------------------------------------------------------\n`;
  script += `# 4. DHCP Server & Main IP Pool Setup / إعدادات السيرفر الموزع لـ IP (DHCP)\n`;
  script += `# ---------------------------------------------------------------------\n`;
  script += `/ip pool remove [ find name=${poolName} ]\n`;
  script += `/ip pool\n`;
  script += `add name=${poolName} ranges=${safePoolStart}-${safePoolEnd}\n\n`;

  script += `/ip dhcp-server remove [ find name=dhcp-hs ]\n`;
  script += `/ip dhcp-server\n`;
  script += `add address-pool=${poolName} disabled=no interface=${effectiveLan} name=dhcp-hs lease-time=1h\n\n`;

  script += `/ip dhcp-server network\n`;
  script += `add address=${networkAddress}/${safeSubnetMask} dns-server=${safeGatewayIp} gateway=${safeGatewayIp} netmask=${safeSubnetMask} comment="Main Hotspot DHCP Network"\n\n`;

  return script;
}
