/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import type { HotspotConfig, HotspotUserProfile } from "../types";
import { buildGeneratorContext } from "./generators/context.ts";
import { generateSystemAndInterfacesSection } from "./generators/systemAndInterfaces.ts";
import { generateVlansAndMultiWanSection } from "./generators/vlansAndMultiWan.ts";
import { generateHotspotAndQueuesSection } from "./generators/hotspotAndQueues.ts";
import { generateFirewallAndSecuritySection } from "./generators/firewallAndSecurity.ts";
import { generateUserManagerAndVouchersSection } from "./generators/userManagerAndVouchers.ts";

export {
  escapeRosString,
  sanitizeRosIdentifier,
  sanitizeIpv4,
  sanitizeCidr,
  clampInt,
  parseIpv4ToInt,
  intToIpv4,
  calculateNetworkAddress,
  calculateSubnetPool,
  isPhysicalInterface,
  isBridgeAssignablePort,
  getWanOutInterface,
  getWanGateway,
  getCanaryHost,
  speedToBps,
  normalizeRosRate,
  mbToBytes,
  normalizeBurstTimeSeconds,
  buildRateLimitString,
  buildLocalExpiryOnLoginScript,
} from "./generators/helpers.ts";

/**
 * Generates a complete, idempotent MikroTik RouterOS (v6 or v7) Hotspot, Multi-WAN,
 * VLAN, Queue, Firewall, User Manager, and Batch Voucher configuration script.
 */
export function generateMikrotikScript(
  config: HotspotConfig,
  hotspotProfiles: HotspotUserProfile[]
): string {
  const ctx = buildGeneratorContext(config, hotspotProfiles);
  return [
    generateSystemAndInterfacesSection(ctx),
    generateVlansAndMultiWanSection(ctx),
    generateHotspotAndQueuesSection(ctx),
    generateFirewallAndSecuritySection(ctx),
    generateUserManagerAndVouchersSection(ctx),
  ].join("");
}
