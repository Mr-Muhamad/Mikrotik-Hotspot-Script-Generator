/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import type { HotspotConfig, HotspotUserProfile } from "../types";
import {
  calculateNetworkAddress,
  getCanaryHost,
  parseIpv4ToInt,
  speedToBps,
} from "./scriptGenerator.ts";

export interface ValidationIssue {
  id: string;
  severity: "error" | "warning";
  tab: number;
  field: string;
  messageAr: string;
  messageEn: string;
}

const RATE_REGEX = /^\d+(\.\d+)?[kKmMgG]?$/;
const DUAL_RATE_REGEX = /^\d+(\.\d+)?[kKmMgG]?\/\d+(\.\d+)?[kKmMgG]?$/;
const MAC_REGEX = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/;
const HOSTNAME_REGEX = /^[a-zA-Z0-9.-]+$/;
const ROS_LEASE_DURATION_REGEX = /^(?:(?:\d+[wdhms])+|\d{1,2}:[0-5]\d:[0-5]\d)$/i;
const ZERO_DURATION_REGEX = /^(?:0+[wdhms])+$|^00:00:00$/i;

function getSubnetRange(ip: string, cidr: number): { start: number; end: number; label: string } | null {
  const ipInt = parseIpv4ToInt(ip);
  if (ipInt === null) return null;
  const clampedCidr = Math.max(0, Math.min(32, Math.floor(cidr)));
  const mask = clampedCidr === 0 ? 0 : (0xffffffff << (32 - clampedCidr)) >>> 0;
  const start = (ipInt & mask) >>> 0;
  const end = (start | (~mask >>> 0)) >>> 0;
  return { start, end, label: `${calculateNetworkAddress(ip, clampedCidr)}/${clampedCidr}` };
}

function subnetsOverlap(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  return a.start <= b.end && b.start <= a.end;
}

function parseHmsToSeconds(val: string, allow24 = false): number | null {
  const match = (val || "").trim().match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  const s = Number(match[3]);
  if (allow24 && h === 24 && m === 0 && s === 0) return 86400;
  if (h < 0 || h > 23 || m < 0 || m > 59 || s < 0 || s > 59) return null;
  return h * 3600 + m * 60 + s;
}

function isValidCidrIp(value: string): boolean {
  const trimmed = value.trim();
  const [ipPart, maskPart] = trimmed.split("/");
  if (!ipPart || parseIpv4ToInt(ipPart) === null) return false;
  if (maskPart === undefined) return false;
  if (!/^\d+$/.test(maskPart)) return false;
  const cidr = Number(maskPart);
  return cidr >= 0 && cidr <= 32;
}

function isValidRate(value?: string): boolean {
  if (!value || !value.trim()) return true;
  return RATE_REGEX.test(value.trim());
}

export function validateConfiguration(
  config: HotspotConfig,
  hotspotProfiles: HotspotUserProfile[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const effectiveAuthMode = config.authMode || (config.enableUserManager ? "userman_radius" : "hotspot_only");

  // Tab 0: Network Setup
  const gwInt = parseIpv4ToInt(config.gatewayIp);
  const poolStartInt = parseIpv4ToInt(config.poolStart);
  const poolEndInt = parseIpv4ToInt(config.poolEnd);

  if (gwInt === null) {
    issues.push({
      id: "net_gateway_invalid",
      severity: "error",
      tab: 0,
      field: "gatewayIp",
      messageAr: `عنوان Gateway غير صالح: "${config.gatewayIp}"`,
      messageEn: `Invalid Gateway IP: "${config.gatewayIp}"`,
    });
  }
  if (poolStartInt === null) {
    issues.push({
      id: "net_pool_start_invalid",
      severity: "error",
      tab: 0,
      field: "poolStart",
      messageAr: `بداية مجال DHCP غير صالحة: "${config.poolStart}"`,
      messageEn: `Invalid DHCP Pool Start IP: "${config.poolStart}"`,
    });
  }
  if (poolEndInt === null) {
    issues.push({
      id: "net_pool_end_invalid",
      severity: "error",
      tab: 0,
      field: "poolEnd",
      messageAr: `نهاية مجال DHCP غير صالحة: "${config.poolEnd}"`,
      messageEn: `Invalid DHCP Pool End IP: "${config.poolEnd}"`,
    });
  }

  const effectiveLan = config.useLanBridge
    ? (config.lanBridgeName || "bridge-lan").trim()
    : (config.lanInterface || "").trim();
  const bridgePorts = new Set(
    (config.lanBridgePorts || "")
      .split(",")
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean)
  );
  const mainSubnetRange = getSubnetRange(config.gatewayIp, config.subnetMask);

  if (gwInt !== null && poolStartInt !== null && poolEndInt !== null) {
    const net = calculateNetworkAddress(config.gatewayIp, config.subnetMask);
    const startNet = calculateNetworkAddress(config.poolStart, config.subnetMask);
    const endNet = calculateNetworkAddress(config.poolEnd, config.subnetMask);
    if (startNet !== net || endNet !== net) {
      issues.push({
        id: "net_pool_outside_subnet",
        severity: "error",
        tab: 0,
        field: "poolStart",
        messageAr: `نطاق DHCP (${config.poolStart}-${config.poolEnd}) يقع خارج الشبكة ${net}/${config.subnetMask}`,
        messageEn: `DHCP Pool (${config.poolStart}-${config.poolEnd}) is outside subnet ${net}/${config.subnetMask}`,
      });
    } else if (poolStartInt > poolEndInt) {
      issues.push({
        id: "net_pool_reversed",
        severity: "error",
        tab: 0,
        field: "poolStart",
        messageAr: "بداية مجال DHCP أكبر من نهاية المجال",
        messageEn: "DHCP Pool Start IP must not exceed Pool End IP",
      });
    } else if (gwInt >= poolStartInt && gwInt <= poolEndInt) {
      issues.push({
        id: "net_pool_contains_gw",
        severity: "error",
        tab: 0,
        field: "poolStart",
        messageAr: `نطاق DHCP (${config.poolStart}-${config.poolEnd}) يتضمن عنوان البوابة ${config.gatewayIp}`,
        messageEn: `DHCP Pool (${config.poolStart}-${config.poolEnd}) includes Gateway IP ${config.gatewayIp}`,
      });
    }
  }

  const leaseStr = (config.dhcpLeaseTime || "").trim();
  if (!leaseStr || !ROS_LEASE_DURATION_REGEX.test(leaseStr) || ZERO_DURATION_REGEX.test(leaseStr)) {
    issues.push({
      id: "net_dhcp_lease_invalid",
      severity: "error",
      tab: 0,
      field: "dhcpLeaseTime",
      messageAr: `مدة حجز DHCP غير صالحة: "${config.dhcpLeaseTime}" (استخدم صيغة مثل 30m أو 1h أو 12h أو 1d)`,
      messageEn: `Invalid DHCP Lease Time: "${config.dhcpLeaseTime}" (use RouterOS duration like 30m, 1h, 12h, or 1d)`,
    });
  }

  (config.dnsServers || []).forEach((dns, idx) => {
    const trimmed = dns.trim();
    if (trimmed && parseIpv4ToInt(trimmed) === null) {
      issues.push({
        id: `net_dns_invalid_${idx}`,
        severity: "error",
        tab: 0,
        field: "dnsServers",
        messageAr: `عنوان DNS غير صالح: "${trimmed}"`,
        messageEn: `Invalid DNS Server IP: "${trimmed}"`,
      });
    }
  });

  if (config.enableNtp) {
    (config.ntpServers || []).forEach((srv, idx) => {
      const trimmed = srv.trim();
      if (trimmed && !HOSTNAME_REGEX.test(trimmed)) {
        issues.push({
          id: `net_ntp_invalid_${idx}`,
          severity: "error",
          tab: 0,
          field: "ntpServers",
          messageAr: `عنوان خادم NTP غير صالح: "${trimmed}"`,
          messageEn: `Invalid NTP Server host: "${trimmed}"`,
        });
      }
    });
  }

  if (config.loadBalancingMethod === "none") {
    const wanClean = (config.wanInterface || "").trim().toLowerCase();
    if (
      wanClean &&
      (wanClean === effectiveLan.toLowerCase() || (config.useLanBridge && bridgePorts.has(wanClean)))
    ) {
      issues.push({
        id: "net_iface_collision",
        severity: "error",
        tab: 0,
        field: "wanInterface",
        messageAr: `منفذ WAN (${config.wanInterface}) يتعارض مع منفذ LAN أو أحد منافذ الـ Bridge`,
        messageEn: `WAN interface (${config.wanInterface}) conflicts with LAN or Bridge ports`,
      });
    }
  }

  if (config.loadBalancingMethod === "none" && config.singleWanType === "pppoe" && !(config.singleWanPppoeUser || "").trim()) {
    issues.push({
      id: "single_wan_pppoe_user_empty",
      severity: "error",
      tab: 0,
      field: "singleWanPppoeUser",
      messageAr: "اسم مستخدم PPPoE مطلوب عند اختيار اتصال PPPoE في الخط الوحيد",
      messageEn: "PPPoE username is required when Single WAN Type is PPPoE",
    });
  }

  if (config.loadBalancingMethod === "none" && config.singleWanType === "static") {
    if (parseIpv4ToInt(config.singleWanGateway) === null) {
      issues.push({
        id: "single_wan_gw_invalid",
        severity: "error",
        tab: 0,
        field: "singleWanGateway",
        messageAr: `بوابة WAN الثابتة غير صالحة: "${config.singleWanGateway}"`,
        messageEn: `Invalid Static WAN Gateway: "${config.singleWanGateway}"`,
      });
    }
    if (!isValidCidrIp(config.singleWanIp)) {
      issues.push({
        id: "single_wan_ip_invalid",
        severity: "error",
        tab: 0,
        field: "singleWanIp",
        messageAr: `عنوان WAN Static IP يجب أن يكون بصيغة IP/Mask مثل 192.168.1.2/24`,
        messageEn: `Static WAN IP must use CIDR format (e.g. 192.168.1.2/24)`,
      });
    } else if (mainSubnetRange) {
      const [wanIpPart, wanMaskStr] = config.singleWanIp.trim().split("/");
      const wanRange = getSubnetRange(wanIpPart, Number(wanMaskStr));
      if (wanRange && subnetsOverlap(mainSubnetRange, wanRange)) {
        issues.push({
          id: "net_wan_subnet_overlap",
          severity: "error",
          tab: 0,
          field: "singleWanIp",
          messageAr: `شبكة WAN (${wanRange.label}) تتداخل مع شبكة الهوتسبوت (${mainSubnetRange.label})`,
          messageEn: `WAN subnet (${wanRange.label}) overlaps Hotspot LAN subnet (${mainSubnetRange.label})`,
        });
      }
    }
  }

  // Tab 1: VLANs
  if (config.enableVlans) {
    if (config.enableBridgeVlanFiltering && !config.useLanBridge) {
      issues.push({
        id: "vlan_filtering_needs_bridge",
        severity: "warning",
        tab: 1,
        field: "enableBridgeVlanFiltering",
        messageAr: "تفعيل Bridge VLAN Filtering يتطلب تفعيل خيار LAN Bridge أولاً ليُطبق في السكربت",
        messageEn: "Bridge VLAN Filtering requires LAN Bridge to be enabled",
      });
    }

    const seenIds = new Set<number>();
    const seenNames = new Set<string>();
    const seenVlanSubnets: { label: string; start: number; end: number; name: string }[] = [];

    (config.vlans || []).forEach((vlan, idx) => {
      if (!Number.isInteger(vlan.vlanId) || vlan.vlanId < 1 || vlan.vlanId > 4094) {
        issues.push({
          id: `vlan_id_range_${vlan.id}`,
          severity: "error",
          tab: 1,
          field: `vlan_${idx}_vlanId`,
          messageAr: `رقم VLAN (${vlan.vlanId}) يجب أن يكون بين 1 و 4094`,
          messageEn: `VLAN ID (${vlan.vlanId}) must be between 1 and 4094`,
        });
      } else if (seenIds.has(vlan.vlanId)) {
        issues.push({
          id: `vlan_id_dup_${vlan.id}`,
          severity: "error",
          tab: 1,
          field: `vlan_${idx}_vlanId`,
          messageAr: `رقم VLAN (${vlan.vlanId}) مكرر في أكثر من شبكة`,
          messageEn: `Duplicate VLAN ID (${vlan.vlanId})`,
        });
      }
      seenIds.add(vlan.vlanId);

      const normName = vlan.name.trim().toLowerCase();
      if (!normName) {
        issues.push({
          id: `vlan_name_empty_${vlan.id}`,
          severity: "error",
          tab: 1,
          field: `vlan_${idx}_name`,
          messageAr: `يوجد VLAN بدون اسم`,
          messageEn: `A VLAN entry has an empty interface name`,
        });
      } else if (seenNames.has(normName)) {
        issues.push({
          id: `vlan_name_dup_${vlan.id}`,
          severity: "error",
          tab: 1,
          field: `vlan_${idx}_name`,
          messageAr: `اسم واجهة VLAN مكرر: "${vlan.name}"`,
          messageEn: `Duplicate VLAN interface name: "${vlan.name}"`,
        });
      }
      seenNames.add(normName);

      if (config.useLanBridge && bridgePorts.has((vlan.parentInterface || "").trim().toLowerCase())) {
        issues.push({
          id: `vlan_slave_port_${vlan.id}`,
          severity: "warning",
          tab: 1,
          field: `vlan_${idx}_parentInterface`,
          messageAr: `VLAN "${vlan.name}" يشير إلى منفذ تابع للـ Bridge؛ سيتم ربطه تلقائياً بـ ${effectiveLan} في السكربت`,
          messageEn: `VLAN "${vlan.name}" targets a Bridge slave port; script will bind it to ${effectiveLan}`,
        });
      }

      const vGwInt = parseIpv4ToInt(vlan.gatewayIp);
      if (vGwInt === null) {
        issues.push({
          id: `vlan_gw_invalid_${vlan.id}`,
          severity: "error",
          tab: 1,
          field: `vlan_${idx}_gatewayIp`,
          messageAr: `بوابة VLAN "${vlan.name}" غير صالحة: "${vlan.gatewayIp}"`,
          messageEn: `Invalid Gateway IP on VLAN "${vlan.name}": "${vlan.gatewayIp}"`,
        });
      } else {
        const vlanRange = getSubnetRange(vlan.gatewayIp, vlan.subnetMask);
        if (vlanRange) {
          if (mainSubnetRange && subnetsOverlap(vlanRange, mainSubnetRange)) {
            issues.push({
              id: `vlan_subnet_overlap_${vlan.id}`,
              severity: "error",
              tab: 1,
              field: `vlan_${idx}_gatewayIp`,
              messageAr: `شبكة VLAN "${vlan.name}" (${vlanRange.label}) تتداخل مع شبكة الهوتسبوت الرئيسية (${mainSubnetRange.label})`,
              messageEn: `VLAN "${vlan.name}" subnet (${vlanRange.label}) overlaps main LAN (${mainSubnetRange.label})`,
            });
          } else {
            const colliding = seenVlanSubnets.find((prev) => subnetsOverlap(vlanRange, prev));
            if (colliding) {
              issues.push({
                id: `vlan_subnet_overlap_${vlan.id}`,
                severity: "error",
                tab: 1,
                field: `vlan_${idx}_gatewayIp`,
                messageAr: `شبكة VLAN "${vlan.name}" (${vlanRange.label}) تتداخل مع "${colliding.name}" (${colliding.label})`,
                messageEn: `VLAN "${vlan.name}" subnet (${vlanRange.label}) overlaps "${colliding.name}" (${colliding.label})`,
              });
            }
          }
          seenVlanSubnets.push({ ...vlanRange, name: vlan.name });
        }

        if (vlan.enableHotspotOnVlan && !vlan.dhcpEnabled) {
          issues.push({
            id: `vlan_hotspot_without_dhcp_${vlan.id}`,
            severity: "warning",
            tab: 1,
            field: `vlan_${idx}_dhcpEnabled`,
            messageAr: `الهوتسبوت مفعّل على VLAN "${vlan.name}" بينما خادم DHCP معطل؛ لن يحصل المشتركون على IP تلقائياً`,
            messageEn: `Hotspot is enabled on VLAN "${vlan.name}" while DHCP is disabled; clients will not receive an IP automatically`,
          });
        }

        if (vlan.dhcpEnabled || (vlan.enableHotspotOnVlan && config.enableUniversalClient)) {
          const vsInt = parseIpv4ToInt(vlan.poolStart);
          const veInt = parseIpv4ToInt(vlan.poolEnd);
          if (vsInt === null || veInt === null) {
            issues.push({
              id: `vlan_pool_invalid_${vlan.id}`,
              severity: "error",
              tab: 1,
              field: `vlan_${idx}_pool`,
              messageAr: `نطاق IP في VLAN "${vlan.name}" غير صالح`,
              messageEn: `Invalid DHCP pool range on VLAN "${vlan.name}"`,
            });
          } else {
            const vNet = calculateNetworkAddress(vlan.gatewayIp, vlan.subnetMask);
            if (
              calculateNetworkAddress(vlan.poolStart, vlan.subnetMask) !== vNet ||
              calculateNetworkAddress(vlan.poolEnd, vlan.subnetMask) !== vNet ||
              vsInt > veInt
            ) {
              issues.push({
                id: `vlan_pool_mismatch_${vlan.id}`,
                severity: "error",
                tab: 1,
                field: `vlan_${idx}_pool`,
                messageAr: `نطاق DHCP في VLAN "${vlan.name}" خارج شبكتها ${vNet}/${vlan.subnetMask}`,
                messageEn: `DHCP pool on VLAN "${vlan.name}" is outside ${vNet}/${vlan.subnetMask}`,
              });
            } else if (vGwInt >= vsInt && vGwInt <= veInt) {
              issues.push({
                id: `vlan_pool_contains_gw_${vlan.id}`,
                severity: "error",
                tab: 1,
                field: `vlan_${idx}_pool`,
                messageAr: `نطاق DHCP في VLAN "${vlan.name}" يتضمن عنوان البوابة ${vlan.gatewayIp}`,
                messageEn: `DHCP pool on VLAN "${vlan.name}" includes Gateway IP ${vlan.gatewayIp}`,
              });
            }
          }
        }
      }
    });
  }

  // Tab 2: Multi-WAN
  if (config.loadBalancingMethod !== "none") {
    const lines = config.wanLines || [];
    if (lines.length < 2) {
      issues.push({
        id: "wan_min_lines",
        severity: "warning",
        tab: 2,
        field: "wanLines",
        messageAr: "دمج الخطوط يحتاج إلى خطين (WAN) على الأقل ليعمل بفعالية",
        messageEn: "Multi-WAN load balancing typically requires at least 2 WAN lines",
      });
    }

    const unscopedGateways = new Map<string, number>();
    const canaryCounts = new Map<string, number>();
    lines.forEach((line, idx) => {
      const lineIfaceLower = (line.interfaceName || "").trim().toLowerCase();
      if (
        lineIfaceLower &&
        (lineIfaceLower === effectiveLan.toLowerCase() || (config.useLanBridge && bridgePorts.has(lineIfaceLower)))
      ) {
        issues.push({
          id: `wan_lan_iface_collision_${line.id}`,
          severity: "error",
          tab: 2,
          field: `wan_${idx}_interfaceName`,
          messageAr: `منفذ الخط "${line.name}" (${line.interfaceName}) يتعارض مع منفذ LAN أو الـ Bridge`,
          messageEn: `WAN line "${line.name}" interface (${line.interfaceName}) conflicts with LAN or Bridge ports`,
        });
      }

      if (line.type !== "pppoe") {
        if (parseIpv4ToInt(line.gatewayIp) === null) {
          issues.push({
            id: `wan_gw_invalid_${line.id}`,
            severity: "error",
            tab: 2,
            field: `wan_${idx}_gatewayIp`,
            messageAr: `بوابة الخط "${line.name}" غير صالحة: "${line.gatewayIp}"`,
            messageEn: `Invalid Gateway IP on "${line.name}": "${line.gatewayIp}"`,
          });
        } else if (!line.useInterfaceGateway) {
          const gw = line.gatewayIp.trim();
          unscopedGateways.set(gw, (unscopedGateways.get(gw) || 0) + 1);
        }

        if (line.type === "static" && line.staticIp?.trim() && !isValidCidrIp(line.staticIp)) {
          issues.push({
            id: `wan_static_invalid_${line.id}`,
            severity: "error",
            tab: 2,
            field: `wan_${idx}_staticIp`,
            messageAr: `عنوان Static IP على "${line.name}" يجب أن يكون بصيغة CIDR مثل 192.168.1.2/24`,
            messageEn: `Static IP on "${line.name}" must be CIDR format (e.g. 192.168.1.2/24)`,
          });
        }

        if (config.enableRecursiveFailover) {
          if (line.checkHost?.trim() && parseIpv4ToInt(line.checkHost) === null) {
            issues.push({
              id: `wan_canary_invalid_${line.id}`,
              severity: "error",
              tab: 2,
              field: `wan_${idx}_checkHost`,
              messageAr: `هدف الفحص المتكرر على "${line.name}" غير صالح: "${line.checkHost}"`,
              messageEn: `Invalid Recursive Ping Target on "${line.name}": "${line.checkHost}"`,
            });
          } else {
            const canary = getCanaryHost(line, idx);
            canaryCounts.set(canary, (canaryCounts.get(canary) || 0) + 1);
          }
        }
      } else if (line.type === "pppoe") {
        if (!(line.pppoeUser || "").trim()) {
          issues.push({
            id: `wan_pppoe_user_empty_${line.id}`,
            severity: "error",
            tab: 2,
            field: `wan_${idx}_pppoeUser`,
            messageAr: `اسم مستخدم PPPoE مطلوب على خط "${line.name}"`,
            messageEn: `PPPoE username is required on WAN line "${line.name}"`,
          });
        }
        if (config.enableRecursiveFailover && line.checkHost?.trim() && parseIpv4ToInt(line.checkHost) === null) {
          issues.push({
            id: `wan_canary_invalid_${line.id}`,
            severity: "error",
            tab: 2,
            field: `wan_${idx}_checkHost`,
            messageAr: `هدف الفحص المتكرر على "${line.name}" غير صالح: "${line.checkHost}"`,
            messageEn: `Invalid Recursive Ping Target on "${line.name}": "${line.checkHost}"`,
          });
        }
      }
    });

    canaryCounts.forEach((count, canary) => {
      if (count > 1) {
        issues.push({
          id: `wan_dup_canary_${canary}`,
          severity: "error",
          tab: 2,
          field: "checkHost",
          messageAr: `هدف الفحص المتكرر "${canary}" مكرر على أكثر من خط؛ خصص IP فحص مختلف لكل خط`,
          messageEn: `Recursive Ping Target "${canary}" is duplicated across WAN lines; each line needs a unique host`,
        });
      }
    });

    unscopedGateways.forEach((count, gw) => {
      if (count > 1) {
        issues.push({
          id: `wan_dup_gw_${gw}`,
          severity: "warning",
          tab: 2,
          field: "useInterfaceGateway",
          messageAr: `البوابة "${gw}" مكررة على أكثر من خط، فعّل خيار (IP%interface) لتفادي تعارض التوجيه`,
          messageEn: `Gateway "${gw}" is shared across multiple WAN lines; enable interface-scoped gateway (IP%interface)`,
        });
      }
    });
  }

  // Tab 3: Local Hotspot User Profiles (active in hotspot_only or hybrid mode)
  if (effectiveAuthMode !== "userman_radius") {
    const seenProfileNames = new Set<string>();
    hotspotProfiles.forEach((prof, idx) => {
      const cleanName = prof.name.trim();
      if (!cleanName) {
        issues.push({
          id: `prof_name_empty_${prof.id}`,
          severity: "error",
          tab: 3,
          field: `profile_${idx}_name`,
          messageAr: "يوجد بروفايل هوتسبوت بدون اسم",
          messageEn: "A Hotspot user profile has an empty name",
        });
      } else if (seenProfileNames.has(cleanName.toLowerCase())) {
        issues.push({
          id: `prof_name_dup_${prof.id}`,
          severity: "error",
          tab: 3,
          field: `profile_${idx}_name`,
          messageAr: `اسم بروفايل الهوتسبوت مكرر: "${cleanName}"`,
          messageEn: `Duplicate Hotspot profile name: "${cleanName}"`,
        });
      }
      seenProfileNames.add(cleanName.toLowerCase());

      if (
        !prof.uploadLimit.trim() ||
        !prof.downloadLimit.trim() ||
        !RATE_REGEX.test(prof.uploadLimit.trim()) ||
        !RATE_REGEX.test(prof.downloadLimit.trim()) ||
        !isValidRate(prof.minUpload) ||
        !isValidRate(prof.minDownload) ||
        !isValidRate(prof.burstUpload) ||
        !isValidRate(prof.burstDownload) ||
        !isValidRate(prof.burstThresholdUpload) ||
        !isValidRate(prof.burstThresholdDownload)
      ) {
        issues.push({
          id: `prof_rate_invalid_${prof.id}`,
          severity: "error",
          tab: 3,
          field: `profile_${idx}_rate`,
          messageAr: `صيغة السرعة في بروفايل الهوتسبوت "${prof.name}" غير صالحة (استخدم مثل 512k أو 2M)`,
          messageEn: `Invalid speed format on Hotspot profile "${prof.name}" (use values like 512k or 2M)`,
        });
      } else {
        const maxUl = speedToBps(prof.uploadLimit);
        const maxDl = speedToBps(prof.downloadLimit);
        const minUl = prof.minUpload?.trim() ? speedToBps(prof.minUpload) : 0;
        const minDl = prof.minDownload?.trim() ? speedToBps(prof.minDownload) : 0;
        if ((minUl > 0 && minUl > maxUl) || (minDl > 0 && minDl > maxDl)) {
          issues.push({
            id: `prof_min_exceeds_max_${prof.id}`,
            severity: "error",
            tab: 3,
            field: `profile_${idx}_rate`,
            messageAr: `الحد الأدنى المضمون (Min) في "${prof.name}" أكبر من السرعة القصوى`,
            messageEn: `Minimum guaranteed rate on "${prof.name}" exceeds max rate`,
          });
        }
      }
    });
  }

  // Tab 4: User Manager or External RADIUS (active in userman_radius or hybrid mode)
  if (effectiveAuthMode !== "hotspot_only") {
    const isExternalRadius = config.radiusBackend === "external_radius";

    if (parseIpv4ToInt(config.radiusServerIp) === null) {
      issues.push({
        id: "um_radius_ip_invalid",
        severity: "error",
        tab: 4,
        field: "radiusServerIp",
        messageAr: `عنوان خادم RADIUS غير صالح: "${config.radiusServerIp}"`,
        messageEn: `Invalid RADIUS Server IP: "${config.radiusServerIp}"`,
      });
    } else if (isExternalRadius && config.radiusServerIp.trim() === "127.0.0.1") {
      issues.push({
        id: "ext_radius_loopback_ip",
        severity: "error",
        tab: 4,
        field: "radiusServerIp",
        messageAr: "في وضع RADIUS الخارجي المستقل يجب إدخال عنوان IP الخادم الخارجي وليس 127.0.0.1",
        messageEn: "Standalone External RADIUS mode requires the remote server IP address (cannot be 127.0.0.1)",
      });
    }

    const srcIp = (config.radiusSrcAddress || "").trim();
    if (srcIp && parseIpv4ToInt(srcIp) === null) {
      issues.push({
        id: "um_radius_src_ip_invalid",
        severity: "error",
        tab: 4,
        field: "radiusSrcAddress",
        messageAr: `عنوان المصدر (Src-Address) لـ RADIUS غير صالح: "${srcIp}"`,
        messageEn: `Invalid RADIUS source IP (src-address): "${srcIp}"`,
      });
    }

    if (!config.radiusSecret.trim()) {
      issues.push({
        id: "um_radius_secret_empty",
        severity: "warning",
        tab: 4,
        field: "radiusSecret",
        messageAr: "كلمة سر RADIUS (Shared Secret) فارغة",
        messageEn: "RADIUS Shared Secret is empty",
      });
    } else if (config.radiusServerIp.trim() !== "127.0.0.1" && config.radiusSecret === "radius123") {
      issues.push({
        id: "um_weak_external_secret",
        severity: "warning",
        tab: 4,
        field: "radiusSecret",
        messageAr: "يوصى بتغيير كلمة سر RADIUS الافتراضية (radius123) عند الربط مع خادم خارجي",
        messageEn: "Change default RADIUS shared secret (radius123) when connecting an external server",
      });
    }

    if (!isExternalRadius) {
      if (config.serviceWww === false) {
        issues.push({
          id: "um_www_service_disabled",
          severity: "warning",
          tab: 5,
          field: "serviceWww",
          messageAr: "تعطيل خدمة WWW (Port 80) يوقف واجهة الويب الخاصة باليوزر مانجر (/um أو /userman) وWebFig",
          messageEn: "Disabling WWW service (Port 80) blocks the User Manager web portal (/um or /userman) and WebFig",
        });
      }

      if (config.rosVersion === "v6" && config.usermanAdminPass === "admin") {
        issues.push({
          id: "um_weak_v6_admin_pass",
          severity: "warning",
          tab: 4,
          field: "usermanAdminPass",
          messageAr: "كلمة مرور مدير اليوزر مانجر v6 الافتراضية (admin) ضعيفة، يوصى بتغييرها",
          messageEn: "User Manager v6 owner password is still default (admin); consider changing it",
        });
      }

    const lims = config.umLimitations || [];
    const limIds = new Set<string>();
    const seenLimNames = new Set<string>();

    lims.forEach((lim, idx) => {
      limIds.add(lim.id);
      const cleanName = lim.name.trim();
      if (!cleanName) {
        issues.push({
          id: `um_lim_name_empty_${lim.id}`,
          severity: "error",
          tab: 4,
          field: `umLim_${idx}_name`,
          messageAr: "يوجد قيد سرعة (Limitation) في اليوزر مانجر بدون اسم",
          messageEn: "A User Manager limitation has an empty name",
        });
      } else if (seenLimNames.has(cleanName.toLowerCase())) {
        issues.push({
          id: `um_lim_name_dup_${lim.id}`,
          severity: "error",
          tab: 4,
          field: `umLim_${idx}_name`,
          messageAr: `اسم قيد اليوزر مانجر مكرر: "${cleanName}"`,
          messageEn: `Duplicate User Manager limitation name: "${cleanName}"`,
        });
      }
      seenLimNames.add(cleanName.toLowerCase());

      if (
        !lim.rateLimitRx.trim() ||
        !lim.rateLimitTx.trim() ||
        !RATE_REGEX.test(lim.rateLimitRx.trim()) ||
        !RATE_REGEX.test(lim.rateLimitTx.trim()) ||
        !isValidRate(lim.rateLimitMinRx) ||
        !isValidRate(lim.rateLimitMinTx) ||
        !isValidRate(lim.rateLimitBurstRx) ||
        !isValidRate(lim.rateLimitBurstTx) ||
        !isValidRate(lim.rateLimitBurstThresholdRx) ||
        !isValidRate(lim.rateLimitBurstThresholdTx)
      ) {
        issues.push({
          id: `um_lim_rate_invalid_${lim.id}`,
          severity: "error",
          tab: 4,
          field: `umLim_${idx}_rate`,
          messageAr: `صيغة السرعة في قيد اليوزر مانجر "${lim.name}" غير صالحة (استخدم مثل 512k أو 2M)`,
          messageEn: `Invalid rate format on User Manager limitation "${lim.name}"`,
        });
      } else {
        const maxRx = speedToBps(lim.rateLimitRx);
        const maxTx = speedToBps(lim.rateLimitTx);
        const minRx = lim.rateLimitMinRx?.trim() ? speedToBps(lim.rateLimitMinRx) : 0;
        const minTx = lim.rateLimitMinTx?.trim() ? speedToBps(lim.rateLimitMinTx) : 0;
        if ((minRx > 0 && minRx > maxRx) || (minTx > 0 && minTx > maxTx)) {
          issues.push({
            id: `um_lim_min_exceeds_max_${lim.id}`,
            severity: "error",
            tab: 4,
            field: `umLim_${idx}_rate`,
            messageAr: `الحد الأدنى (Min) في قيد "${lim.name}" أكبر من السرعة القصوى`,
            messageEn: `Minimum rate on limitation "${lim.name}" exceeds max rate`,
          });
        }
      }
    });

    const umProfs = config.umProfiles || [];
    const seenUmProfNames = new Set<string>();
    umProfs.forEach((prof, idx) => {
      const cleanName = prof.name.trim();
      if (!cleanName) {
        issues.push({
          id: `um_prof_name_empty_${prof.id}`,
          severity: "error",
          tab: 4,
          field: `umProf_${idx}_name`,
          messageAr: "يوجد باقة يوزر مانجر بدون اسم",
          messageEn: "A User Manager profile has an empty name",
        });
      } else if (seenUmProfNames.has(cleanName.toLowerCase())) {
        issues.push({
          id: `um_prof_name_dup_${prof.id}`,
          severity: "error",
          tab: 4,
          field: `umProf_${idx}_name`,
          messageAr: `اسم باقة اليوزر مانجر مكرر: "${cleanName}"`,
          messageEn: `Duplicate User Manager profile name: "${cleanName}"`,
        });
      }
      seenUmProfNames.add(cleanName.toLowerCase());

      if ((prof.limitations || []).length === 0) {
        issues.push({
          id: `um_prof_no_lims_${prof.id}`,
          severity: "warning",
          tab: 4,
          field: `umProf_${idx}_lims`,
          messageAr: `باقة اليوزر مانجر "${prof.name}" غير مرتبطة بأي قيد سرعة/كوتا`,
          messageEn: `User Manager profile "${prof.name}" has no limitations attached`,
        });
      } else {
        prof.limitations.forEach((b) => {
          if (!limIds.has(b.limitationId)) {
            issues.push({
              id: `um_prof_broken_lim_${prof.id}_${b.id}`,
              severity: "error",
              tab: 4,
              field: `umProf_${idx}_lims`,
              messageAr: `باقة "${prof.name}" تشير إلى قيد سرعة محذوف أو غير موجود`,
              messageEn: `User Manager profile "${prof.name}" references a missing limitation`,
            });
          }
          const fromSec = parseHmsToSeconds(b.fromTime, false);
          const tillSec = parseHmsToSeconds(b.tillTime, true);
          if (fromSec === null || tillSec === null || fromSec >= tillSec) {
            issues.push({
              id: `um_sched_time_order_${prof.id}_${b.id}`,
              severity: "error",
              tab: 4,
              field: `umProf_${idx}_lims`,
              messageAr: `فترة الجدولة (${b.fromTime} - ${b.tillTime}) في باقة "${prof.name}" غير صالحة (يجب أن يكون البدء قبل الانتهاء بصيغة HH:MM:SS)`,
              messageEn: `Schedule window (${b.fromTime} - ${b.tillTime}) on "${prof.name}" is invalid (requires HH:MM:SS with from < till)`,
            });
          }
        });
      }
    });

    if (config.rosVersion === "v7") {
      (config.umGroups || []).forEach((grp, idx) => {
        if (!grp.outerAuths || grp.outerAuths.length === 0) {
          issues.push({
            id: `um_group_no_auth_${grp.id}`,
            severity: "warning",
            tab: 4,
            field: `umGrp_${idx}_auth`,
            messageAr: `مجموعة v7 "${grp.name}" لا تحتوي على طرق مصادقة (outer-auths) ولن يتمكن أعضاؤها من الدخول`,
            messageEn: `v7 User Group "${grp.name}" has no outer-auths enabled; members cannot authenticate`,
          });
        } else if (config.loginHttpChap && !grp.outerAuths.includes("chap")) {
          issues.push({
            id: `um_group_missing_chap_${grp.id}`,
            severity: "error",
            tab: 4,
            field: `umGrp_${idx}_auth`,
            messageAr: `الهوتسبوت يستخدم HTTP-CHAP، لذا يجب تفعيل chap في outer-auths لمجموعة "${grp.name}"`,
            messageEn: `Hotspot HTTP-CHAP login requires "chap" in outer-auths for group "${grp.name}"`,
          });
        } else if (!config.loginHttpChap && config.loginHttpPap && !grp.outerAuths.includes("pap")) {
          issues.push({
            id: `um_group_missing_pap_${grp.id}`,
            severity: "error",
            tab: 4,
            field: `umGrp_${idx}_auth`,
            messageAr: `الهوتسبوت يستخدم HTTP-PAP، لذا يجب تفعيل pap في outer-auths لمجموعة "${grp.name}"`,
            messageEn: `Hotspot HTTP-PAP login requires "pap" in outer-auths for group "${grp.name}"`,
          });
        }
      });
    }
    }
  }

  // Tab 5: Queue max-limit, IP Bindings & Login Methods
  if (config.rosVersion === "v7" && config.queueType !== "simple") {
    const rawLimit = (config.parentQueueMaxLimit || "").trim();
    if (!rawLimit) {
      issues.push({
        id: "adv_queue_max_limit_missing",
        severity: "warning",
        tab: 5,
        field: "parentQueueMaxLimit",
        messageAr: `طابور ${config.queueType.toUpperCase()} يحتاج إلى تحديد الحد الأقصى للخط (Parent Max-Limit مثل 50M/100M) ليعمل Anti-Bufferbloat بفاعلية`,
        messageEn: `${config.queueType.toUpperCase()} parent queue works best with Parent Max-Limit set (e.g. 50M/100M)`,
      });
    } else if (!DUAL_RATE_REGEX.test(rawLimit)) {
      issues.push({
        id: "adv_queue_max_limit_invalid",
        severity: "error",
        tab: 5,
        field: "parentQueueMaxLimit",
        messageAr: `صيغة Parent Max-Limit غير صالحة: "${rawLimit}" (استخدم upload/download مثل 50M/100M)`,
        messageEn: `Invalid Parent Max-Limit format: "${rawLimit}" (use upload/download like 50M/100M)`,
      });
    }
  }

  (config.ipBindings || []).forEach((b) => {
    const mac = (b.macAddress || "").trim();
    const ip = (b.ipAddress || "").trim();
    if ((mac && !MAC_REGEX.test(mac)) || (ip && parseIpv4ToInt(ip) === null)) {
      issues.push({
        id: `adv_ip_binding_invalid_${b.id}`,
        severity: "error",
        tab: 5,
        field: "ipBindings",
        messageAr: `قيمة MAC أو IP غير صالحة في IP Binding (${mac || ip})`,
        messageEn: `Invalid MAC or IP address in IP Binding (${mac || ip})`,
      });
    }
  });

  if (!config.loginHttpChap && !config.loginHttpPap) {
    issues.push({
      id: "adv_no_voucher_login_method",
      severity: "warning",
      tab: 5,
      field: "loginHttpChap",
      messageAr: "تم تعطيل HTTP-CHAP و HTTP-PAP معاً؛ لن يتمكن المشتركون من تسجيل الدخول عبر نموذج الكروت في الصفحة",
      messageEn: "Both HTTP-CHAP and HTTP-PAP are disabled; standard voucher/password logins will not work",
    });
  }

  return issues;
}
