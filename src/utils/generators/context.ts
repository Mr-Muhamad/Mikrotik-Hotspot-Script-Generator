/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import type { AuthMode, HotspotConfig, HotspotUserProfile, VlanConfig } from "../../types";
import {
  calculateNetworkAddress,
  clampInt,
  escapeRosString,
  isBridgeAssignablePort,
  sanitizeIpv4,
  sanitizeRosIdentifier,
} from "./helpers.ts";

export interface ResolvedVlan extends VlanConfig {
  safeIdName: string;
  safeVlanName: string;
  safeVlanId: number;
  parentInterface: string;
  gatewayIp: string;
  subnetMask: number;
  poolStart: string;
  poolEnd: string;
  network: string;
}

export interface GeneratorContext {
  config: HotspotConfig;
  hotspotProfiles: HotspotUserProfile[];
  isV7: boolean;
  effectiveAuthMode: AuthMode;
  useRadius: boolean;
  isExternalRadius: boolean;
  emitLocalHotspotProfiles: boolean;
  wanIface: string;
  lanIface: string;
  effectiveLan: string;
  bridgePorts: string[];
  bridgePortSet: Set<string>;
  poolName: string;
  serverName: string;
  mainDnsName: string;
  timeZoneName: string;
  effectiveHtmlDir: string;
  safeGatewayIp: string;
  safeSubnetMask: number;
  safePoolStart: string;
  safePoolEnd: string;
  safeDhcpLeaseTime: string;
  networkAddress: string;
  dnsServersStr: string;
  hasVlans: boolean;
  resolvedVlans: ResolvedVlan[];
  hotspotEnabledVlans: ResolvedVlan[];
  isMultiWan: boolean;
  useAdvancedQueue: boolean;
  activeQueueName: string;
  radServerIpSafe: string;
  coaPortSafe: number;
}

/**
 * Resolves and sanitizes all RouterOS configuration inputs into a shared context
 * consumed by each domain script generator module.
 */
export function buildGeneratorContext(
  config: HotspotConfig,
  hotspotProfiles: HotspotUserProfile[]
): GeneratorContext {
  const isV7 = config.rosVersion === "v7";
  const effectiveAuthMode: AuthMode =
    config.authMode || (config.enableUserManager ? "userman_radius" : "hotspot_only");
  const useRadius = effectiveAuthMode !== "hotspot_only";
  const isExternalRadius = useRadius && config.radiusBackend === "external_radius";
  const emitLocalHotspotProfiles = effectiveAuthMode !== "userman_radius";
  const wanIface = sanitizeRosIdentifier(config.wanInterface, "ether1");
  const lanIface = sanitizeRosIdentifier(config.lanInterface, "ether2");
  const bridgeName = sanitizeRosIdentifier(config.lanBridgeName || "bridge-lan", "bridge-lan");
  const effectiveLan = config.useLanBridge ? bridgeName : lanIface;
  const isMultiWan = Boolean(config.loadBalancingMethod !== "none" && config.wanLines && config.wanLines.length > 0);
  const wanPhysicalSet = new Set<string>(
    isMultiWan
      ? config.wanLines.map((l) => sanitizeRosIdentifier(l.interfaceName, "ether1")).filter(Boolean)
      : [wanIface]
  );
  const hasVlans = Boolean(config.enableVlans && config.vlans && config.vlans.length > 0);

  let bridgePorts: string[] = [];
  let bridgePortSet = new Set<string>();
  if (config.useLanBridge) {
    const rawBridgePorts = (config.lanBridgePorts || "")
      .split(",")
      .map((p) => sanitizeRosIdentifier(p, ""))
      .filter((p) => Boolean(p) && isBridgeAssignablePort(p) && p !== bridgeName && !wanPhysicalSet.has(p));
    bridgePortSet = new Set<string>(rawBridgePorts);
    if (hasVlans && config.enableBridgeVlanFiltering && config.vlans) {
      config.vlans.forEach((v) => {
        [v.taggedPorts || "", v.untaggedPorts || ""].forEach((portStr) => {
          portStr
            .split(",")
            .map((p) => sanitizeRosIdentifier(p, ""))
            .filter((p) => Boolean(p) && isBridgeAssignablePort(p) && p !== bridgeName && !wanPhysicalSet.has(p))
            .forEach((p) => bridgePortSet.add(p));
        });
      });
    }
    bridgePorts = Array.from(bridgePortSet);
  }

  const poolName = sanitizeRosIdentifier(config.poolName, "hs-pool-ether2");
  const serverName = sanitizeRosIdentifier(config.serverName, "hotspot1");
  const mainDnsName = sanitizeRosIdentifier(config.dnsName, "hotspot.local");
  const timeZoneName = sanitizeRosIdentifier(config.timeZoneName || "Africa/Cairo", "Africa/Cairo");
  const effectiveHtmlDir = escapeRosString(
    config.storageMode === "flash" ? "flash/hotspot" : (config.htmlDirectory || "hotspot")
  );

  const safeGatewayIp = sanitizeIpv4(config.gatewayIp, "192.168.80.1");
  const safeSubnetMask = clampInt(config.subnetMask, 8, 30, 24);
  const safePoolStart = sanitizeIpv4(config.poolStart, "192.168.80.10");
  const safePoolEnd = sanitizeIpv4(config.poolEnd, "192.168.80.254");
  const rawLease = (config.dhcpLeaseTime || "1h").trim();
  const safeDhcpLeaseTime =
    /^(?:(?:\d+[wdhms])+|\d{1,2}:[0-5]\d:[0-5]\d)$/i.test(rawLease) &&
    !/^(?:0+[wdhms])+$|^00:00:00$/i.test(rawLease)
      ? rawLease
      : "1h";
  const networkAddress = calculateNetworkAddress(safeGatewayIp, safeSubnetMask, "192.168.80.0");
  const dnsServersStr =
    (config.dnsServers || []).map((s) => sanitizeIpv4(s, "")).filter(Boolean).join(",") || "8.8.8.8,1.1.1.1";
  const resolvedVlans: ResolvedVlan[] = hasVlans
    ? config.vlans.map((vlan, idx) => {
        const safeIdName = sanitizeRosIdentifier(
          vlan.name,
          `vlan${clampInt(vlan.vlanId, 1, 4094, (idx + 1) * 10)}`
        );
        const safeVlanId = clampInt(vlan.vlanId, 1, 4094, (idx + 1) * 10);
        const rawParent = sanitizeRosIdentifier(vlan.parentInterface || effectiveLan, effectiveLan);
        const parentInterface =
          config.useLanBridge && (config.enableBridgeVlanFiltering || bridgePortSet.has(rawParent))
            ? effectiveLan
            : rawParent;
        const gatewayIp = sanitizeIpv4(vlan.gatewayIp, `172.16.${Math.min(250, safeVlanId)}.1`);
        const subnetMask = clampInt(vlan.subnetMask, 8, 30, 24);
        const poolStart = sanitizeIpv4(vlan.poolStart, `172.16.${Math.min(250, safeVlanId)}.10`);
        const poolEnd = sanitizeIpv4(vlan.poolEnd, `172.16.${Math.min(250, safeVlanId)}.254`);
        return {
          ...vlan,
          safeIdName,
          safeVlanName: escapeRosString(vlan.name || safeIdName),
          safeVlanId,
          parentInterface,
          gatewayIp,
          subnetMask,
          poolStart,
          poolEnd,
          network: calculateNetworkAddress(gatewayIp, subnetMask, "10.0.0.0"),
        };
      })
    : [];
  const hotspotEnabledVlans = resolvedVlans.filter((v) => v.enableHotspotOnVlan);
  const useAdvancedQueue = isV7 && (config.queueType === "cake" || config.queueType === "fq_codel");
  const activeQueueName = config.queueType === "cake" ? "cake-hotspot" : "fq-codel-hotspot";
  const radServerIpSafe = sanitizeIpv4(config.radiusServerIp, "127.0.0.1");
  const coaPortSafe = clampInt(config.coaPort || 3799, 1, 65535, 3799);

  return {
    config,
    hotspotProfiles,
    isV7,
    effectiveAuthMode,
    useRadius,
    isExternalRadius,
    emitLocalHotspotProfiles,
    wanIface,
    lanIface,
    effectiveLan,
    bridgePorts,
    bridgePortSet,
    poolName,
    serverName,
    mainDnsName,
    timeZoneName,
    effectiveHtmlDir,
    safeGatewayIp,
    safeSubnetMask,
    safePoolStart,
    safePoolEnd,
    safeDhcpLeaseTime,
    networkAddress,
    dnsServersStr,
    hasVlans,
    resolvedVlans,
    hotspotEnabledVlans,
    isMultiWan,
    useAdvancedQueue,
    activeQueueName,
    radServerIpSafe,
    coaPortSafe,
  };
}
