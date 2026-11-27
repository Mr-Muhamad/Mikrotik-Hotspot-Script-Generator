/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import type { HotspotUserProfile, WanLine } from "../../types";

export const DEFAULT_CANARIES = [
  "8.8.4.4",
  "1.0.0.1",
  "9.9.9.9",
  "208.67.222.222",
  "208.67.220.220",
  "149.112.112.112",
] as const;

export function escapeRosString(value: string): string {
  return value
    .replace(/[\r\n]+/g, " ")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\$/g, "\\$");
}

export function sanitizeRosIdentifier(value: string, fallback: string): string {
  const cleaned = (value || "").replace(/[\u0000-\u001f\u007f\s"'`;$\\[\]()=,]/g, "").trim();
  return cleaned || fallback;
}

export function sanitizeIpv4(ip: string, fallback: string): string {
  const trimmed = (ip || "").trim();
  return parseIpv4ToInt(trimmed) !== null ? trimmed : fallback;
}

export function sanitizeCidr(cidrStr: string, fallback: string): string {
  const trimmed = (cidrStr || "").trim();
  if (!trimmed) return fallback;
  const parts = trimmed.split("/");
  if (parts.length === 1) {
    return parseIpv4ToInt(parts[0]) !== null ? `${parts[0]}/24` : fallback;
  }
  if (parts.length === 2 && parseIpv4ToInt(parts[0]) !== null && /^\d+$/.test(parts[1])) {
    const mask = Number(parts[1]);
    if (mask >= 0 && mask <= 32) {
      return `${parts[0]}/${mask}`;
    }
  }
  return fallback;
}

export function clampInt(val: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(val)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(val)));
}

export function parseIpv4ToInt(ip: string): number | null {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return null;
  let result = 0;
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) return null;
    result = ((result << 8) | octet) >>> 0;
  }
  return result;
}

export function intToIpv4(num: number): string {
  const unsigned = num >>> 0;
  return [
    (unsigned >>> 24) & 0xff,
    (unsigned >>> 16) & 0xff,
    (unsigned >>> 8) & 0xff,
    unsigned & 0xff,
  ].join(".");
}

export function calculateNetworkAddress(
  ip: string,
  cidr: number,
  fallback = "192.168.80.0"
): string {
  const ipInt = parseIpv4ToInt(ip);
  if (ipInt === null) return fallback;
  const clampedCidr = Math.max(0, Math.min(32, Math.floor(cidr)));
  const mask = clampedCidr === 0 ? 0 : (0xffffffff << (32 - clampedCidr)) >>> 0;
  return intToIpv4((ipInt & mask) >>> 0);
}

export function calculateSubnetPool(
  ip: string,
  cidr: number
): { network: string; poolStart: string; poolEnd: string } | null {
  const ipInt = parseIpv4ToInt(ip);
  if (ipInt === null) return null;
  const clampedCidr = Math.max(0, Math.min(32, Math.floor(cidr)));
  const mask = clampedCidr === 0 ? 0 : (0xffffffff << (32 - clampedCidr)) >>> 0;
  const netInt = (ipInt & mask) >>> 0;
  const bcastInt = (netInt | (~mask >>> 0)) >>> 0;
  if (bcastInt - netInt < 3) return null;
  const firstHost = (netInt + 1) >>> 0;
  const lastHost = (bcastInt - 1) >>> 0;
  let startInt = netInt + 10 <= lastHost ? (netInt + 10) >>> 0 : (netInt + 2) >>> 0;
  let endInt = lastHost;

  if (ipInt === endInt && endInt > startInt) {
    endInt = (endInt - 1) >>> 0;
  } else if (ipInt >= startInt && ipInt <= endInt) {
    const lowerStart = ipInt - 1 >= startInt ? startInt : (netInt + 2 <= ipInt - 1 ? (netInt + 2) >>> 0 : firstHost);
    const lowerSize = ipInt > lowerStart ? ipInt - lowerStart : 0;
    const upperStart = (ipInt + 1) >>> 0;
    const upperSize = endInt >= upperStart ? endInt - upperStart + 1 : 0;
    if (lowerSize > upperSize && lowerSize > 0) {
      startInt = lowerStart;
      endInt = (ipInt - 1) >>> 0;
    } else if (upperSize > 0) {
      startInt = upperStart;
    }
  }

  return {
    network: intToIpv4(netInt),
    poolStart: intToIpv4(startInt),
    poolEnd: intToIpv4(endInt),
  };
}

export function isPhysicalInterface(iface: string): boolean {
  return Boolean(iface && !/^(bridge|vlan|wlan|wifi|pppoe|wg|l2tp|ovpn|sstp)/i.test(iface.trim()));
}

export function isBridgeAssignablePort(iface: string): boolean {
  return Boolean(iface && !/^(bridge|vlan|pppoe|wg|l2tp|ovpn|sstp)/i.test(iface.trim()));
}

export function getWanOutInterface(line: WanLine): string {
  const safeName = sanitizeRosIdentifier(line.name, "WAN");
  const safeIface = sanitizeRosIdentifier(line.interfaceName, "ether1");
  return line.type === "pppoe" ? `pppoe-${safeName}` : safeIface;
}

export function getWanGateway(line: WanLine): string {
  const safeName = sanitizeRosIdentifier(line.name, "WAN");
  const safeIface = sanitizeRosIdentifier(line.interfaceName, "ether1");
  if (line.type === "pppoe") {
    return `pppoe-${safeName}`;
  }
  const safeGw = sanitizeIpv4(line.gatewayIp, "192.168.1.1");
  if (line.useInterfaceGateway && safeIface) {
    return `${safeGw}%${safeIface}`;
  }
  return safeGw;
}

export function getCanaryHost(line: WanLine, idx: number): string {
  const fallback = DEFAULT_CANARIES[idx % DEFAULT_CANARIES.length];
  return sanitizeIpv4(line.checkHost || "", fallback);
}

// Convert speed string to RouterOS SI decimal bits-per-second (1k = 1000, 1M = 1,000,000)
export function speedToBps(speedStr: string): number {
  if (!speedStr) return 0;
  const clean = speedStr.trim().toLowerCase();
  const match = clean.match(/^(\d+(?:\.\d+)?)\s*([kmg]?)$/);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  if (isNaN(num)) return 0;
  const unit = match[2];
  if (unit === "g") return Math.round(num * 1_000_000_000);
  if (unit === "m") return Math.round(num * 1_000_000);
  if (unit === "k") return Math.round(num * 1_000);
  return Math.round(num);
}

/**
 * Normalizes a rate token into integer RouterOS syntax (e.g. "1.5M" -> "1500k"),
 * avoiding decimal suffixes that RouterOS CLI rejects in rate-limit strings.
 */
export function normalizeRosRate(speedStr: string): string {
  const trimmed = (speedStr || "").trim();
  if (!trimmed) return "";
  if (trimmed === "0") return "0";
  const bps = speedToBps(trimmed);
  if (bps <= 0) return "";
  if (bps >= 1_000_000_000 && bps % 1_000_000_000 === 0) return `${bps / 1_000_000_000}G`;
  if (bps >= 1_000_000 && bps % 1_000_000 === 0) return `${bps / 1_000_000}M`;
  if (bps >= 1_000 && bps % 1_000 === 0) return `${bps / 1_000}k`;
  return String(bps);
}

export function mbToBytes(mb: number): number {
  return Math.round(Math.max(0, mb) * 1024 * 1024);
}

export function normalizeBurstTimeSeconds(raw: string, fallback = "8"): string {
  const clean = (raw || "").trim().toLowerCase();
  if (!clean) return fallback;
  if (/^\d+$/.test(clean)) return String(parseInt(clean, 10));
  const secMatch = clean.match(/^(\d+)\s*s$/);
  if (secMatch) return String(parseInt(secMatch[1], 10));
  const minMatch = clean.match(/^(\d+)\s*m$/);
  if (minMatch) return String(parseInt(minMatch[1], 10) * 60);
  const hmsMatch = clean.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (hmsMatch) {
    const secs = parseInt(hmsMatch[1], 10) * 3600 + parseInt(hmsMatch[2], 10) * 60 + parseInt(hmsMatch[3], 10);
    return String(secs);
  }
  return fallback;
}

/**
 * Builds official RouterOS positional rate-limit string (router RX/TX perspective):
 * rx/tx [burst-rx/burst-tx [thresh-rx/thresh-tx [time-rx/time-tx [priority [min-rx/min-tx]]]]]
 */
export function buildRateLimitString(profile: HotspotUserProfile): string {
  const ul = normalizeRosRate(profile.uploadLimit);
  const dl = normalizeRosRate(profile.downloadLimit);
  if (!ul || !dl) return "";

  const baseRate = `${ul}/${dl}`;
  const hasBurst = Boolean(profile.burstUpload?.trim() || profile.burstDownload?.trim());
  const hasMin = Boolean(profile.minUpload?.trim() || profile.minDownload?.trim());
  const priority = Math.min(8, Math.max(1, Math.floor(profile.priority || 8)));
  const hasCustomPriority = priority !== 8;

  if (!hasBurst && !hasMin && !hasCustomPriority) {
    return baseRate;
  }

  const burstRx = hasBurst ? (normalizeRosRate(profile.burstUpload || "") || ul) : "0";
  const burstTx = hasBurst ? (normalizeRosRate(profile.burstDownload || "") || dl) : "0";
  const threshRx = hasBurst ? (normalizeRosRate(profile.burstThresholdUpload || "") || ul) : "0";
  const threshTx = hasBurst ? (normalizeRosRate(profile.burstThresholdDownload || "") || dl) : "0";
  const tUp = normalizeBurstTimeSeconds(profile.burstTimeUpload || "8", "8");
  const tDn = normalizeBurstTimeSeconds(profile.burstTimeDownload || profile.burstTimeUpload || "8", "8");
  const burstTime = hasBurst ? `${tUp}/${tDn}` : "0/0";

  let result = `${baseRate} ${burstRx}/${burstTx} ${threshRx}/${threshTx} ${burstTime} ${priority}`;
  if (hasMin) {
    const minRx = normalizeRosRate(profile.minUpload || "") || "0";
    const minTx = normalizeRosRate(profile.minDownload || "") || "0";
    result += ` ${minRx}/${minTx}`;
  }
  return result;
}

/**
 * Generates a RouterOS v6 & v7 compatible `on-login` script that creates a one-shot
 * `/system scheduler` job on the user's first login using `interval=<validity>`, avoiding
 * v6 (`jan/01/1970`) vs v7.10+ (`2026-01-01`) date-format incompatibilities.
 */
export function buildLocalExpiryOnLoginScript(
  validity: string,
  action: "remove" | "disable" = "remove"
): string {
  const cleanVal = sanitizeRosIdentifier(validity, "");
  if (!cleanVal || cleanVal === "0s") return "";
  const userOp = action === "disable" ? "disable" : "remove";
  return `:local u $user; :if ([:len [/system scheduler find name=("exp-" . $u)]] = 0) do={ :local d [/system clock get date]; :local t [/system clock get time]; :delay 1s; :local yr [:tonum [:pick $d 0 4]]; :if ([:typeof $yr] != "num" || $yr < 1970) do={ :set yr [:tonum [:pick $d 7 11]] }; :if ($yr >= 2024) do={ /system scheduler add name=("exp-" . $u) start-date=$d start-time=$t interval=${cleanVal} on-event=("/ip hotspot active remove [find user=\\"" . $u . "\\"]; /ip hotspot cookie remove [find user=\\"" . $u . "\\"]; /ip hotspot user ${userOp} [find name=\\"" . $u . "\\"]; /system scheduler remove [find name=\\"exp-" . $u . "\\"]") comment=("Auto-expire " . $u) } }`;
}
