/**
 * @license
 * SPDX-License-Identifier: MIT
 */

export type RouterOSVersion = "v6" | "v7";

export type AuthMode = "hotspot_only" | "userman_radius" | "hybrid";

export type RadiusBackend = "userman_local" | "external_radius";

export type PortalLoginMode = "both" | "voucher_only" | "user_pass_only";

export type VoucherPasswordMode = "same_as_user" | "blank";

export type ResetCountersInterval = "disabled" | "hourly" | "daily" | "weekly" | "monthly";

export type UmWeekday =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

export interface WalledGardenEntry {
  id: string;
  domain: string;
  comment?: string;
  entryType?: "domain" | "ip";
  includeHttpsIp?: boolean;
}

export interface IpBindingEntry {
  id: string;
  macAddress?: string;
  ipAddress?: string;
  toAddress?: string;
  type: "bypassed" | "blocked" | "regular";
  comment?: string;
}

/**
 * Local Hotspot User Profile (`/ip hotspot user profile`).
 * Note: Hotspot user profiles do NOT have price, validity, or data quotas;
 * RX/TX values use MikroTik router perspective (rx = client upload, tx = client download).
 */
export interface HotspotUserProfile {
  id: string;
  name: string;
  displayName: string;
  uploadLimit: string;              // rx-rate (client upload), e.g. "512k", "1M"
  downloadLimit: string;            // tx-rate (client download), e.g. "2M", "4M"
  minUpload?: string;               // rx-rate-min (guaranteed MIR / limit-at)
  minDownload?: string;             // tx-rate-min (guaranteed MIR / limit-at)
  burstUpload?: string;             // rx-burst-rate
  burstDownload?: string;           // tx-burst-rate
  burstThresholdUpload?: string;    // rx-burst-threshold
  burstThresholdDownload?: string;  // tx-burst-threshold
  burstTimeUpload?: string;         // rx-burst-time, e.g. "8s"
  burstTimeDownload?: string;       // tx-burst-time, e.g. "8s"
  priority?: number;                // 1 (highest) to 8 (lowest)
  sharedUsers: number;
  sessionTimeout: string;           // e.g. "00:00:00" or "02:00:00"
  idleTimeout: string;              // e.g. "00:15:00"
  keepaliveTimeout: string;         // e.g. "00:02:00"
  statusAutorefresh: string;        // e.g. "1m" or "none"
  addMacCookie: boolean;
  macCookieTimeout: string;         // e.g. "3d"
  addressPool?: string;             // Optional override pool or "none"
  addressList?: string;             // Optional firewall address-list on login
  queueType?: string;               // Optional queue-type on user dynamic queue
  insertQueueBefore?: "first" | "bottom";
  transparentProxy?: boolean;
  localValidity?: string;           // Optional local on-login expiry (e.g. "7d", "12h")
  localExpiryAction?: "remove" | "disable";
}

/**
 * User Manager Limitation (`/user-manager limitation` in v7, `/tool user-manager profile limitation` in v6).
 */
export interface UserManagerLimitation {
  id: string;
  name: string;
  rateLimitRx: string;                  // Client Upload (router RX), e.g. "512k"
  rateLimitTx: string;                  // Client Download (router TX), e.g. "2M"
  rateLimitMinRx?: string;
  rateLimitMinTx?: string;
  rateLimitBurstRx?: string;
  rateLimitBurstTx?: string;
  rateLimitBurstThresholdRx?: string;
  rateLimitBurstThresholdTx?: string;
  rateLimitBurstTimeRx?: string;
  rateLimitBurstTimeTx?: string;
  rateLimitPriority?: number;           // 1-8
  uptimeLimit?: string;                 // Cumulative active session budget, e.g. "5h" or "1d"
  transferLimitMb?: number;             // Combined Upload + Download bytes limit
  downloadLimitMb?: number;
  uploadLimitMb?: number;
  resetCountersInterval: ResetCountersInterval; // v7 only
  resetCountersStartTime?: string;      // e.g. "00:00:00" or "jan/01/2026 00:00:00"
  v6GroupName?: string;                 // v6 only: Mikrotik-Group mapping
  v6IpPool?: string;                    // v6 only: Framed-Pool
  v6AddressList?: string;               // v6 only: Mikrotik-Address-List
}

export interface UserManagerProfileLimitation {
  id: string;
  limitationId: string;
  fromTime: string;                     // "00:00:00"
  tillTime: string;                     // "23:59:59"
  weekdays: UmWeekday[];
}

/**
 * User Manager Profile (`/user-manager profile` in v7, `/tool user-manager profile` in v6).
 */
export interface UserManagerProfile {
  id: string;
  name: string;
  nameForUsers: string;
  validity: string;                     // "unlimited" or time like "30d", "12h"
  price: number;
  startsWhen: "first-auth" | "assigned"; // Mapped to logon/now in v6
  overrideSharedUsers: string;          // "off", "unlimited", or integer string "1", "2"
  limitations: UserManagerProfileLimitation[];
}

/**
 * RouterOS v7 User Manager Group (`/user-manager user group`).
 */
export interface UserManagerGroup {
  id: string;
  name: string;
  outerAuths: string[];                 // pap, chap, mschap1, mschap2, etc.
  innerAuths: string[];                 // ttls-pap, ttls-chap, peap-mschap2, etc.
  mikrotikGroup?: string;               // Optional attribute Mikrotik-Group:<name>
  addressList?: string;                 // Optional attribute Mikrotik-Address-List:<name>
  framedPool?: string;                  // Optional attribute Framed-Pool:<name>
}

export interface VlanConfig {
  id: string;
  name: string;              // e.g. "vlan10_staff"
  vlanId: number;            // e.g. 10
  parentInterface: string;   // e.g. "ether2"
  gatewayIp: string;         // e.g. "172.16.10.1"
  subnetMask: number;        // e.g. 24
  dhcpEnabled: boolean;
  poolStart: string;         // e.g. "172.16.10.10"
  poolEnd: string;           // e.g. "172.16.10.254"
  enableHotspotOnVlan: boolean;
  hotspotDnsName?: string;
  taggedPorts?: string;
  untaggedPorts?: string;
  comment?: string;
}

export type LoadBalancingMethod = "none" | "pcc" | "nth" | "ecmp" | "failover";

export interface WanLine {
  id: string;
  name: string;              // e.g. "WAN1_Modem"
  interfaceName: string;     // e.g. "ether1"
  gatewayIp: string;         // e.g. "192.168.1.1"
  staticIp?: string;         // e.g. "192.168.1.2/24"
  checkHost?: string;        // e.g. "8.8.8.8" for recursive failover
  useInterfaceGateway?: boolean; // e.g. "192.168.1.1%ether1"
  distance: number;          // e.g. 1
  weight: number;            // for PCC/NTH/ECMP ratio e.g. 1 or 2
  type: "static" | "dhcp" | "pppoe";
  pppoeUser?: string;
  pppoePass?: string;
}

export interface HotspotConfig {
  rosVersion: RouterOSVersion; // "v6" or "v7"
  authMode: AuthMode;          // "hotspot_only" | "userman_radius" | "hybrid"
  routerIdentity: string;
  timeZoneName: string;
  enableNtp: boolean;
  ntpServers: string[];

  wanInterface: string;
  singleWanType: "dhcp" | "static" | "pppoe";
  singleWanIp: string;
  singleWanGateway: string;
  singleWanPppoeUser: string;
  singleWanPppoePass: string;

  lanInterface: string;
  useLanBridge: boolean;
  lanBridgeName: string;
  lanBridgePorts: string;
  enableBridgeVlanFiltering: boolean;
  isolateVlans: boolean;

  gatewayIp: string;         // e.g., "192.168.80.1"
  subnetMask: number;        // e.g., 24
  dnsName: string;           // e.g., "hotspot.local"
  serverName: string;        // e.g., "hs-ether2"
  addressesPerMac: number;
  poolName: string;          // e.g., "hs-pool-ether2"
  poolStart: string;         // e.g., "192.168.80.10"
  poolEnd: string;           // e.g., "192.168.80.254"
  dhcpLeaseTime: string;     // e.g., "1h"
  enableUniversalClient: boolean;
  dnsServers: string[];      // e.g., ["8.8.8.8", "1.1.1.1"]
  forceDnsRedirect: boolean;

  // VLANs
  enableVlans: boolean;
  vlans: VlanConfig[];

  // WAN Load Balancing & Multi-WAN
  loadBalancingMethod: LoadBalancingMethod;
  wanLines: WanLine[];
  stickyConnections: boolean; // For PCC HTTPS stability
  enableRecursiveFailover: boolean;

  // Login Authentication Methods
  loginHttpChap: boolean;
  loginHttpPap: boolean;
  loginMacAuth: boolean;
  enableCookie: boolean;
  loginMacCookie: boolean;
  cookieLifetime: string;    // e.g., "3d"
  enableTrial: boolean;
  trialDuration: string;     // e.g., "00:30:00"
  trialResetTime: string;    // e.g., "1d"
  trialRateLimit: string;    // e.g., "256k/512k"

  // NAS Default Hotspot User Profile (applied on `default` for RADIUS/NAS behavior)
  nasIdleTimeout: string;
  nasKeepaliveTimeout: string;
  nasStatusAutorefresh: string;
  nasAddMacCookie: boolean;
  nasMacCookieTimeout: string;

  // RADIUS & User Manager
  enableUserManager: boolean;
  radiusBackend: RadiusBackend;
  radiusSecret: string;
  radiusServerIp: string;
  radiusPort: number;
  radiusAcctPort: number;
  radiusSrcAddress: string;
  coaPort: number;
  radiusAccounting: boolean;
  radiusInterimUpdate: string;
  radiusTimeout: string;
  usermanAdminUser: string;
  usermanAdminPass: string;
  usermanRouterName: string;
  usermanStartsWhen: "first-auth" | "assigned";
  syncProfilesToUserman: boolean;
  umLimitations: UserManagerLimitation[];
  umProfiles: UserManagerProfile[];
  umGroups: UserManagerGroup[];

  // Walled Garden & IP Bindings
  walledGardenDomains: WalledGardenEntry[];
  ipBindings: IpBindingEntry[];

  // HTML Directory & Login Page Customization
  storageMode: "standard" | "flash";
  htmlDirectory: string;     // e.g. "hotspot" or "flash/hotspot"
  loginTitle: string;        // e.g. "شبكة الواي فاي"
  loginSubtitle: string;     // e.g. "سجل دخولك للاتصال بالإنترنت"
  contactPhone: string;      // e.g. "01000000000"
  loginTheme: "emerald" | "blue" | "dark" | "purple";
  portalLoginMode: PortalLoginMode;
  voucherPasswordMode: VoucherPasswordMode;

  // Advanced features & Scripts
  bypassFasttrack: boolean;
  clampTcpMss: boolean;
  enableAutoCleanScript: boolean;
  enableScheduledReboot: boolean;
  enableFirewallHardening: boolean;
  blockWanManagement: boolean;
  blockHotspotRouterAccess: boolean;
  serviceTelnet: boolean;
  serviceFtp: boolean;
  serviceWww: boolean;
  serviceSsh: boolean;
  serviceApi: boolean;
  serviceApiSsl: boolean;
  preventSharingTtl: boolean;
  enableDnsCache: boolean;
  queueType: "simple" | "cake" | "fq_codel";
  parentQueueMaxLimit: string;
}
