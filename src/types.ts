/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RouterOSVersion = "v6" | "v7";

export interface WalledGardenEntry {
  id: string;
  domain: string;
  comment?: string;
}

export interface SpeedProfile {
  id: string;
  name: string;
  displayName: string;
  uploadLimit: string;       // e.g., "512k", "1M"
  downloadLimit: string;     // e.g., "1M", "4M"
  burstUpload?: string;      // e.g., "1M"
  burstDownload?: string;    // e.g., "8M"
  burstThresholdUpload?: string;   // e.g., "384k"
  burstThresholdDownload?: string; // e.g., "2M"
  burstTime?: string;        // e.g., "8s"
  priority?: number;         // 1 (highest) to 8 (lowest)
  dataQuotaMb?: number;      // e.g. 5000 MB (0 = unlimited)
  sharedUsers: number;
  sessionTimeout: string;    // e.g., "00:00:00" or "02:00:00"
  idleTimeout: string;       // e.g., "00:15:00"
  keepaliveTimeout: string;  // e.g., "00:02:00"
  price: number;             // for User Manager
  validity: string;          // e.g., "30d" for User Manager
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
  comment?: string;
}

export type LoadBalancingMethod = "none" | "pcc" | "nth" | "ecmp" | "failover";

export interface WanLine {
  id: string;
  name: string;              // e.g. "WAN1_Modem"
  interfaceName: string;      // e.g. "ether1"
  gatewayIp: string;         // e.g. "192.168.1.1"
  distance: number;          // e.g. 1
  weight: number;            // for PCC ratio e.g. 1 or 2
  type: "static" | "dhcp" | "pppoe";
  pppoeUser?: string;
  pppoePass?: string;
}

export interface HotspotConfig {
  rosVersion: RouterOSVersion; // "v6" or "v7"
  wanInterface: string;
  lanInterface: string;
  gatewayIp: string;         // e.g., "192.168.80.1"
  subnetMask: number;        // e.g., 24
  dnsName: string;           // e.g., "hotspot.local"
  serverName: string;        // e.g., "hs-ether2"
  poolName: string;          // e.g., "hs-pool-ether2"
  poolStart: string;         // e.g., "192.168.80.10"
  poolEnd: string;           // e.g., "192.168.80.254"
  dnsServers: string[];      // e.g., ["8.8.8.8", "1.1.1.1"]
  
  // VLANs
  enableVlans: boolean;
  vlans: VlanConfig[];

  // WAN Load Balancing & Multi-WAN
  loadBalancingMethod: LoadBalancingMethod;
  wanLines: WanLine[];
  stickyConnections: boolean; // For PCC HTTPS stability

  // Login Authentication Methods
  loginHttpChap: boolean;
  loginHttpPap: boolean;
  loginMacAuth: boolean;
  enableCookie: boolean;
  cookieLifetime: string;    // e.g., "3d"
  enableTrial: boolean;
  trialDuration: string;     // e.g., "00:30:00"
  trialResetTime: string;    // e.g., "1d"
  
  // RADIUS & User Manager
  enableUserManager: boolean;
  radiusSecret: string;
  radiusServerIp: string;
  radiusPort: number;
  coaPort: number;
  usermanAdminUser: string;
  usermanAdminPass: string;
  usermanRouterName: string;
  syncProfilesToUserman: boolean;

  // Walled Garden Domains
  walledGardenDomains: WalledGardenEntry[];

  // HTML Directory & Login Page Customization
  htmlDirectory: string;     // e.g. "hotspot"
  loginTitle: string;        // e.g. "شبكة الواي فاي"
  loginSubtitle: string;     // e.g. "سجل دخولك للاتصال بالإنترنت"
  contactPhone: string;      // e.g. "01000000000"
  loginTheme: "emerald" | "blue" | "dark" | "purple";

  // Advanced features & Scripts
  bypassFasttrack: boolean;
  enableAutoCleanScript: boolean; // Auto clean expired hosts/cookies nightly
  enableScheduledReboot: boolean; // Weekly maintenance reboot
  enableFirewallHardening: boolean; // Protection against DNS amplification & Brute Force
  enableDnsCache: boolean; // Optimized DNS cache
  queueType: "simple" | "cake" | "fq_codel"; // ROS v7 advanced queuing
  
  // Voucher Batch Generator Options
  generateVouchersBatch: boolean;
  voucherCount: number;
  voucherPrefix: string;
  voucherLength: number;
  voucherSelectedProfile: string;
}
