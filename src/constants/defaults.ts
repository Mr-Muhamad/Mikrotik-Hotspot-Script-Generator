/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import type {
  AuthMode,
  HotspotConfig,
  HotspotUserProfile,
  IpBindingEntry,
  ResetCountersInterval,
  UmWeekday,
  UserManagerGroup,
  UserManagerLimitation,
  UserManagerProfile,
  UserManagerProfileLimitation,
  VlanConfig,
  WalledGardenEntry,
  WanLine,
} from "../types";

export const CONFIG_SCHEMA_VERSION = 3;

export const ALL_UM_WEEKDAYS: UmWeekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const VALID_WEEKDAYS = new Set<UmWeekday>(ALL_UM_WEEKDAYS);
const VALID_RESET_INTERVALS = new Set<ResetCountersInterval>([
  "disabled",
  "hourly",
  "daily",
  "weekly",
  "monthly",
]);

export const DEFAULT_HOTSPOT_PROFILES: HotspotUserProfile[] = [
  {
    id: "prof_1m",
    name: "hs-1M",
    displayName: "1 Mbps Local Plan",
    uploadLimit: "256k",
    downloadLimit: "1M",
    minUpload: "128k",
    minDownload: "512k",
    burstUpload: "512k",
    burstDownload: "2M",
    burstThresholdUpload: "192k",
    burstThresholdDownload: "768k",
    burstTimeUpload: "8s",
    burstTimeDownload: "8s",
    priority: 8,
    sharedUsers: 1,
    sessionTimeout: "00:00:00",
    idleTimeout: "00:15:00",
    keepaliveTimeout: "00:02:00",
    statusAutorefresh: "1m",
    addMacCookie: true,
    macCookieTimeout: "3d",
    insertQueueBefore: "first",
    transparentProxy: false,
  },
  {
    id: "prof_2m",
    name: "hs-2M",
    displayName: "2 Mbps Local Plan",
    uploadLimit: "512k",
    downloadLimit: "2M",
    minUpload: "256k",
    minDownload: "1M",
    burstUpload: "1M",
    burstDownload: "4M",
    burstThresholdUpload: "384k",
    burstThresholdDownload: "1500k",
    burstTimeUpload: "8s",
    burstTimeDownload: "8s",
    priority: 7,
    sharedUsers: 1,
    sessionTimeout: "00:00:00",
    idleTimeout: "00:15:00",
    keepaliveTimeout: "00:02:00",
    statusAutorefresh: "1m",
    addMacCookie: true,
    macCookieTimeout: "3d",
    insertQueueBefore: "first",
    transparentProxy: false,
  },
  {
    id: "prof_4m",
    name: "hs-4M",
    displayName: "4 Mbps Local Plan",
    uploadLimit: "1M",
    downloadLimit: "4M",
    minUpload: "512k",
    minDownload: "2M",
    burstUpload: "2M",
    burstDownload: "8M",
    burstThresholdUpload: "768k",
    burstThresholdDownload: "3M",
    burstTimeUpload: "8s",
    burstTimeDownload: "8s",
    priority: 6,
    sharedUsers: 2,
    sessionTimeout: "00:00:00",
    idleTimeout: "00:15:00",
    keepaliveTimeout: "00:02:00",
    statusAutorefresh: "1m",
    addMacCookie: true,
    macCookieTimeout: "3d",
    insertQueueBefore: "first",
    transparentProxy: false,
  },
  {
    id: "prof_8m",
    name: "hs-8M",
    displayName: "8 Mbps VIP Local Plan",
    uploadLimit: "2M",
    downloadLimit: "8M",
    minUpload: "1M",
    minDownload: "4M",
    burstUpload: "4M",
    burstDownload: "16M",
    burstThresholdUpload: "1500k",
    burstThresholdDownload: "6M",
    burstTimeUpload: "8s",
    burstTimeDownload: "8s",
    priority: 4,
    sharedUsers: 2,
    sessionTimeout: "00:00:00",
    idleTimeout: "00:15:00",
    keepaliveTimeout: "00:02:00",
    statusAutorefresh: "1m",
    addMacCookie: true,
    macCookieTimeout: "7d",
    insertQueueBefore: "first",
    transparentProxy: false,
  },
];

export const DEFAULT_UM_LIMITATIONS: UserManagerLimitation[] = [
  {
    id: "um_lim_1m",
    name: "lim_1M",
    rateLimitRx: "256k",
    rateLimitTx: "1M",
    rateLimitMinRx: "128k",
    rateLimitMinTx: "512k",
    rateLimitBurstRx: "512k",
    rateLimitBurstTx: "2M",
    rateLimitBurstThresholdRx: "192k",
    rateLimitBurstThresholdTx: "768k",
    rateLimitBurstTimeRx: "8s",
    rateLimitBurstTimeTx: "8s",
    rateLimitPriority: 8,
    uptimeLimit: "",
    transferLimitMb: 0,
    downloadLimitMb: 0,
    uploadLimitMb: 0,
    resetCountersInterval: "disabled",
  },
  {
    id: "um_lim_2m",
    name: "lim_2M_5GB",
    rateLimitRx: "512k",
    rateLimitTx: "2M",
    rateLimitMinRx: "256k",
    rateLimitMinTx: "1M",
    rateLimitBurstRx: "1M",
    rateLimitBurstTx: "4M",
    rateLimitBurstThresholdRx: "384k",
    rateLimitBurstThresholdTx: "1500k",
    rateLimitBurstTimeRx: "8s",
    rateLimitBurstTimeTx: "8s",
    rateLimitPriority: 7,
    uptimeLimit: "",
    transferLimitMb: 5120,
    downloadLimitMb: 0,
    uploadLimitMb: 0,
    resetCountersInterval: "disabled",
  },
  {
    id: "um_lim_4m",
    name: "lim_4M_10GB",
    rateLimitRx: "1M",
    rateLimitTx: "4M",
    rateLimitMinRx: "512k",
    rateLimitMinTx: "2M",
    rateLimitBurstRx: "2M",
    rateLimitBurstTx: "8M",
    rateLimitBurstThresholdRx: "768k",
    rateLimitBurstThresholdTx: "3M",
    rateLimitBurstTimeRx: "8s",
    rateLimitBurstTimeTx: "8s",
    rateLimitPriority: 6,
    uptimeLimit: "",
    transferLimitMb: 10240,
    downloadLimitMb: 0,
    uploadLimitMb: 0,
    resetCountersInterval: "monthly",
    resetCountersStartTime: "00:00:00",
  },
  {
    id: "um_lim_night",
    name: "lim_night_8M",
    rateLimitRx: "2M",
    rateLimitTx: "8M",
    rateLimitMinRx: "1M",
    rateLimitMinTx: "4M",
    rateLimitPriority: 5,
    uptimeLimit: "",
    transferLimitMb: 0,
    downloadLimitMb: 0,
    uploadLimitMb: 0,
    resetCountersInterval: "disabled",
  },
];

export const DEFAULT_UM_PROFILES: UserManagerProfile[] = [
  {
    id: "um_prof_1m",
    name: "UM-1M",
    nameForUsers: "1 Mbps Unlimited",
    validity: "30d",
    price: 5,
    startsWhen: "first-auth",
    overrideSharedUsers: "1",
    limitations: [
      {
        id: "um_pl_1m_all",
        limitationId: "um_lim_1m",
        fromTime: "00:00:00",
        tillTime: "23:59:59",
        weekdays: [...ALL_UM_WEEKDAYS],
      },
    ],
  },
  {
    id: "um_prof_2m",
    name: "UM-2M",
    nameForUsers: "2 Mbps (5 GB)",
    validity: "30d",
    price: 10,
    startsWhen: "first-auth",
    overrideSharedUsers: "1",
    limitations: [
      {
        id: "um_pl_2m_all",
        limitationId: "um_lim_2m",
        fromTime: "00:00:00",
        tillTime: "23:59:59",
        weekdays: [...ALL_UM_WEEKDAYS],
      },
    ],
  },
  {
    id: "um_prof_4m",
    name: "UM-4M",
    nameForUsers: "4 Mbps (10 GB Monthly)",
    validity: "30d",
    price: 15,
    startsWhen: "first-auth",
    overrideSharedUsers: "2",
    limitations: [
      {
        id: "um_pl_4m_day",
        limitationId: "um_lim_4m",
        fromTime: "00:00:00",
        tillTime: "23:59:59",
        weekdays: [...ALL_UM_WEEKDAYS],
      },
    ],
  },
];

export const DEFAULT_UM_GROUPS: UserManagerGroup[] = [
  {
    id: "um_grp_default",
    name: "hotspot-users",
    outerAuths: ["pap", "chap", "mschap1", "mschap2"],
    innerAuths: ["ttls-pap", "ttls-chap", "peap-mschap2"],
  },
];

export const DEFAULT_CONFIG: HotspotConfig = {
  rosVersion: "v7",
  authMode: "userman_radius",
  routerIdentity: "MikroTik-Hotspot",
  timeZoneName: "Africa/Cairo",
  enableNtp: true,
  ntpServers: ["pool.ntp.org", "time.google.com"],

  wanInterface: "ether1",
  singleWanType: "dhcp",
  singleWanIp: "192.168.1.2/24",
  singleWanGateway: "192.168.1.1",
  singleWanPppoeUser: "",
  singleWanPppoePass: "",

  lanInterface: "ether2",
  useLanBridge: false,
  lanBridgeName: "bridge-lan",
  lanBridgePorts: "ether2,ether3,ether4",
  enableBridgeVlanFiltering: false,
  isolateVlans: true,

  gatewayIp: "192.168.80.1",
  subnetMask: 24,
  dnsName: "hotspot.local",
  serverName: "hotspot1",
  addressesPerMac: 2,
  poolName: "hs-pool-ether2",
  poolStart: "192.168.80.10",
  poolEnd: "192.168.80.254",
  dhcpLeaseTime: "1h",
  enableUniversalClient: false,
  dnsServers: ["8.8.8.8", "1.1.1.1"],
  forceDnsRedirect: true,

  // VLANs
  enableVlans: false,
  vlans: [
    {
      id: "vlan_10",
      name: "vlan10_staff",
      vlanId: 10,
      parentInterface: "ether2",
      gatewayIp: "172.16.10.1",
      subnetMask: 24,
      dhcpEnabled: true,
      poolStart: "172.16.10.10",
      poolEnd: "172.16.10.254",
      enableHotspotOnVlan: false,
      comment: "Staff Subnet",
    },
  ],

  // WAN Load Balancing & Multi-WAN
  loadBalancingMethod: "none",
  wanLines: [
    {
      id: "wan_1",
      name: "WAN1_Line",
      interfaceName: "ether1",
      gatewayIp: "192.168.1.1",
      staticIp: "192.168.1.2/24",
      checkHost: "8.8.8.8",
      useInterfaceGateway: false,
      distance: 1,
      weight: 1,
      type: "dhcp",
    },
    {
      id: "wan_2",
      name: "WAN2_Line",
      interfaceName: "ether3",
      gatewayIp: "192.168.2.1",
      staticIp: "192.168.2.2/24",
      checkHost: "1.1.1.1",
      useInterfaceGateway: false,
      distance: 1,
      weight: 1,
      type: "dhcp",
    },
  ],
  stickyConnections: true,
  enableRecursiveFailover: true,

  // Login Methods
  loginHttpChap: true,
  loginHttpPap: true,
  loginMacAuth: false,
  enableCookie: true,
  loginMacCookie: true,
  cookieLifetime: "3d",
  enableTrial: false,
  trialDuration: "00:30:00",
  trialResetTime: "1d",
  trialRateLimit: "256k/512k",

  // NAS Default User Profile Settings
  nasIdleTimeout: "00:15:00",
  nasKeepaliveTimeout: "00:02:00",
  nasStatusAutorefresh: "1m",
  nasAddMacCookie: true,
  nasMacCookieTimeout: "3d",

  // RADIUS & User Manager
  enableUserManager: true,
  radiusBackend: "userman_local",
  radiusSecret: "radius123",
  radiusServerIp: "127.0.0.1",
  radiusPort: 1812,
  radiusAcctPort: 1813,
  radiusSrcAddress: "",
  coaPort: 3799,
  radiusAccounting: true,
  radiusInterimUpdate: "00:05:00",
  radiusTimeout: "3000ms",
  usermanAdminUser: "admin",
  usermanAdminPass: "admin",
  usermanRouterName: "Router1",
  usermanStartsWhen: "first-auth",
  syncProfilesToUserman: true,
  umLimitations: DEFAULT_UM_LIMITATIONS,
  umProfiles: DEFAULT_UM_PROFILES,
  umGroups: DEFAULT_UM_GROUPS,

  // Walled Garden & IP Bindings
  walledGardenDomains: [
    { id: "wg_1", domain: "*.whatsapp.com", comment: "WhatsApp Access", entryType: "domain", includeHttpsIp: false },
    { id: "wg_2", domain: "*.pay.com", comment: "Payment Gateway", entryType: "domain", includeHttpsIp: false },
  ],
  ipBindings: [],

  // HTML Directory & Login Page Customization
  storageMode: "standard",
  htmlDirectory: "hotspot",
  loginTitle: "أهلاً بك في شبكة الواي فاي",
  loginSubtitle: "سجل دخولك برقم الكارت أو الحساب للاتصال بالإنترنت",
  contactPhone: "01000000000",
  loginTheme: "emerald",
  portalLoginMode: "both",
  voucherPasswordMode: "same_as_user",

  // Advanced & Maintenance
  bypassFasttrack: true,
  clampTcpMss: true,
  enableAutoCleanScript: true,
  enableScheduledReboot: false,
  enableFirewallHardening: true,
  blockWanManagement: true,
  blockHotspotRouterAccess: true,
  serviceTelnet: false,
  serviceFtp: false,
  serviceWww: true,
  serviceSsh: true,
  serviceApi: false,
  serviceApiSsl: false,
  preventSharingTtl: false,
  enableDnsCache: true,
  queueType: "simple",
  parentQueueMaxLimit: "",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeRateToken(val: unknown): string | undefined {
  if (typeof val !== "string" || !val.trim()) return undefined;
  return val.trim().replace("1.5M", "1500k");
}

function hydrateUmLimitations(raw: unknown): UserManagerLimitation[] {
  if (!Array.isArray(raw)) {
    return DEFAULT_UM_LIMITATIONS;
  }
  return raw.filter(isRecord).map((l, idx): UserManagerLimitation => {
    const interval = typeof l.resetCountersInterval === "string" &&
      VALID_RESET_INTERVALS.has(l.resetCountersInterval as ResetCountersInterval)
      ? (l.resetCountersInterval as ResetCountersInterval)
      : "disabled";
    return {
      id: typeof l.id === "string" && l.id ? l.id : `um_lim_${idx + 1}`,
      name: typeof l.name === "string" && l.name ? l.name : `lim_${idx + 1}`,
      rateLimitRx: normalizeRateToken(l.rateLimitRx) || "512k",
      rateLimitTx: normalizeRateToken(l.rateLimitTx) || "2M",
      rateLimitMinRx: normalizeRateToken(l.rateLimitMinRx),
      rateLimitMinTx: normalizeRateToken(l.rateLimitMinTx),
      rateLimitBurstRx: normalizeRateToken(l.rateLimitBurstRx),
      rateLimitBurstTx: normalizeRateToken(l.rateLimitBurstTx),
      rateLimitBurstThresholdRx: normalizeRateToken(l.rateLimitBurstThresholdRx),
      rateLimitBurstThresholdTx: normalizeRateToken(l.rateLimitBurstThresholdTx),
      rateLimitBurstTimeRx: typeof l.rateLimitBurstTimeRx === "string" ? l.rateLimitBurstTimeRx : undefined,
      rateLimitBurstTimeTx: typeof l.rateLimitBurstTimeTx === "string" ? l.rateLimitBurstTimeTx : undefined,
      rateLimitPriority: typeof l.rateLimitPriority === "number" ? l.rateLimitPriority : 8,
      uptimeLimit: typeof l.uptimeLimit === "string" ? l.uptimeLimit : undefined,
      transferLimitMb: typeof l.transferLimitMb === "number" ? Math.max(0, l.transferLimitMb) : 0,
      downloadLimitMb: typeof l.downloadLimitMb === "number" ? Math.max(0, l.downloadLimitMb) : 0,
      uploadLimitMb: typeof l.uploadLimitMb === "number" ? Math.max(0, l.uploadLimitMb) : 0,
      resetCountersInterval: interval,
      resetCountersStartTime: typeof l.resetCountersStartTime === "string" ? l.resetCountersStartTime : undefined,
      v6GroupName: typeof l.v6GroupName === "string" ? l.v6GroupName : undefined,
      v6IpPool: typeof l.v6IpPool === "string" ? l.v6IpPool : undefined,
      v6AddressList: typeof l.v6AddressList === "string" ? l.v6AddressList : undefined,
    };
  });
}

function hydrateUmProfiles(raw: unknown): UserManagerProfile[] {
  if (!Array.isArray(raw)) {
    return DEFAULT_UM_PROFILES;
  }
  return raw.filter(isRecord).map((p, idx): UserManagerProfile => {
    const rawBindings = Array.isArray(p.limitations) ? p.limitations : [];
    const limitations = rawBindings
      .filter(isRecord)
      .map((b, bIdx): UserManagerProfileLimitation => {
        const weekdays = Array.isArray(b.weekdays)
          ? b.weekdays.filter((w): w is UmWeekday => VALID_WEEKDAYS.has(w as UmWeekday))
          : [...ALL_UM_WEEKDAYS];
        return {
          id: typeof b.id === "string" && b.id ? b.id : `um_pl_${idx + 1}_${bIdx + 1}`,
          limitationId: typeof b.limitationId === "string" ? b.limitationId : "",
          fromTime: typeof b.fromTime === "string" && b.fromTime ? b.fromTime : "00:00:00",
          tillTime: typeof b.tillTime === "string" && b.tillTime ? b.tillTime : "23:59:59",
          weekdays: weekdays.length > 0 ? weekdays : [...ALL_UM_WEEKDAYS],
        };
      });

    return {
      id: typeof p.id === "string" && p.id ? p.id : `um_prof_${idx + 1}`,
      name: typeof p.name === "string" && p.name ? p.name : `UM-Plan-${idx + 1}`,
      nameForUsers: typeof p.nameForUsers === "string" ? p.nameForUsers : `Plan ${idx + 1}`,
      validity: typeof p.validity === "string" && p.validity ? p.validity : "30d",
      price: typeof p.price === "number" ? Math.max(0, p.price) : 0,
      startsWhen: p.startsWhen === "assigned" ? "assigned" : "first-auth",
      overrideSharedUsers:
        typeof p.overrideSharedUsers === "string" && p.overrideSharedUsers ? p.overrideSharedUsers : "1",
      limitations,
    };
  });
}

function hydrateUmGroups(raw: unknown): UserManagerGroup[] {
  if (!Array.isArray(raw)) {
    return DEFAULT_UM_GROUPS;
  }
  return raw.filter(isRecord).map((g, idx): UserManagerGroup => ({
    id: typeof g.id === "string" && g.id ? g.id : `um_grp_${idx + 1}`,
    name: typeof g.name === "string" && g.name ? g.name : `group-${idx + 1}`,
    outerAuths: Array.isArray(g.outerAuths) ? g.outerAuths.map((s) => String(s)) : ["pap", "chap"],
    innerAuths: Array.isArray(g.innerAuths) ? g.innerAuths.map((s) => String(s)) : [],
    mikrotikGroup: typeof g.mikrotikGroup === "string" ? g.mikrotikGroup : undefined,
    addressList: typeof g.addressList === "string" ? g.addressList : undefined,
    framedPool: typeof g.framedPool === "string" ? g.framedPool : undefined,
  }));
}

export function hydrateConfig(raw: unknown): HotspotConfig {
  if (!isRecord(raw)) {
    return DEFAULT_CONFIG;
  }

  const rawAuthMode = raw.authMode;
  const authMode: AuthMode =
    rawAuthMode === "hotspot_only" || rawAuthMode === "userman_radius" || rawAuthMode === "hybrid"
      ? rawAuthMode
      : raw.enableUserManager === false
        ? "hotspot_only"
        : "userman_radius";

  const merged: HotspotConfig = {
    ...DEFAULT_CONFIG,
    ...(raw as Partial<HotspotConfig>),
    authMode,
    enableUserManager: authMode !== "hotspot_only",
  };

  merged.dnsServers = Array.isArray(raw.dnsServers) && raw.dnsServers.length > 0
    ? raw.dnsServers.map((s) => String(s ?? ""))
    : [...DEFAULT_CONFIG.dnsServers];

  merged.ntpServers = Array.isArray(raw.ntpServers) && raw.ntpServers.length > 0
    ? raw.ntpServers.map((s) => String(s ?? ""))
    : [...DEFAULT_CONFIG.ntpServers];

  merged.vlans = Array.isArray(raw.vlans)
    ? raw.vlans.filter(isRecord).map((v, idx): VlanConfig => ({
        id: typeof v.id === "string" && v.id ? v.id : `vlan_${idx + 1}`,
        name: typeof v.name === "string" && v.name ? v.name : `vlan${(idx + 1) * 10}`,
        vlanId: typeof v.vlanId === "number" ? v.vlanId : 10,
        parentInterface: typeof v.parentInterface === "string" && v.parentInterface ? v.parentInterface : merged.lanInterface,
        gatewayIp: typeof v.gatewayIp === "string" ? v.gatewayIp : "172.16.10.1",
        subnetMask: typeof v.subnetMask === "number" ? v.subnetMask : 24,
        dhcpEnabled: typeof v.dhcpEnabled === "boolean" ? v.dhcpEnabled : true,
        poolStart: typeof v.poolStart === "string" ? v.poolStart : "172.16.10.10",
        poolEnd: typeof v.poolEnd === "string" ? v.poolEnd : "172.16.10.254",
        enableHotspotOnVlan: Boolean(v.enableHotspotOnVlan),
        hotspotDnsName: typeof v.hotspotDnsName === "string" ? v.hotspotDnsName : undefined,
        taggedPorts: typeof v.taggedPorts === "string" ? v.taggedPorts : undefined,
        untaggedPorts: typeof v.untaggedPorts === "string" ? v.untaggedPorts : undefined,
        comment: typeof v.comment === "string" ? v.comment : undefined,
      }))
    : [...DEFAULT_CONFIG.vlans];

  merged.wanLines = Array.isArray(raw.wanLines)
    ? raw.wanLines.filter(isRecord).map((l, idx): WanLine => ({
        id: typeof l.id === "string" && l.id ? l.id : `wan_${idx + 1}`,
        name: typeof l.name === "string" && l.name ? l.name : `WAN${idx + 1}_Line`,
        interfaceName: typeof l.interfaceName === "string" && l.interfaceName ? l.interfaceName : `ether${idx + 1}`,
        gatewayIp: typeof l.gatewayIp === "string" ? l.gatewayIp : `192.168.${idx + 1}.1`,
        staticIp: typeof l.staticIp === "string" ? l.staticIp : `192.168.${idx + 1}.2/24`,
        checkHost: typeof l.checkHost === "string" ? l.checkHost : (idx % 2 === 0 ? "8.8.8.8" : "1.1.1.1"),
        useInterfaceGateway: Boolean(l.useInterfaceGateway),
        distance: typeof l.distance === "number" ? l.distance : idx + 1,
        weight: typeof l.weight === "number" ? Math.max(1, l.weight) : 1,
        type: l.type === "static" || l.type === "pppoe" ? l.type : "dhcp",
        pppoeUser: typeof l.pppoeUser === "string" ? l.pppoeUser : undefined,
        pppoePass: typeof l.pppoePass === "string" ? l.pppoePass : undefined,
      }))
    : [...DEFAULT_CONFIG.wanLines];

  merged.walledGardenDomains = Array.isArray(raw.walledGardenDomains)
    ? raw.walledGardenDomains.filter(isRecord).map((w, idx): WalledGardenEntry => ({
        id: typeof w.id === "string" && w.id ? w.id : `wg_${idx + 1}`,
        domain: typeof w.domain === "string" ? w.domain : "",
        comment: typeof w.comment === "string" ? w.comment : undefined,
        entryType: w.entryType === "ip" ? "ip" : "domain",
        includeHttpsIp: Boolean(w.includeHttpsIp),
      }))
    : [...DEFAULT_CONFIG.walledGardenDomains];

  merged.ipBindings = Array.isArray(raw.ipBindings)
    ? raw.ipBindings.filter(isRecord).map((b, idx): IpBindingEntry => ({
        id: typeof b.id === "string" && b.id ? b.id : `ib_${idx + 1}`,
        macAddress: typeof b.macAddress === "string" ? b.macAddress : undefined,
        ipAddress: typeof b.ipAddress === "string" ? b.ipAddress : undefined,
        toAddress: typeof b.toAddress === "string" ? b.toAddress : undefined,
        type: b.type === "blocked" || b.type === "regular" ? b.type : "bypassed",
        comment: typeof b.comment === "string" ? b.comment : undefined,
      }))
    : [];

  merged.umLimitations = hydrateUmLimitations(raw.umLimitations);
  merged.umProfiles = hydrateUmProfiles(raw.umProfiles);
  merged.umGroups = hydrateUmGroups(raw.umGroups);

  merged.radiusBackend = raw.radiusBackend === "external_radius" ? "external_radius" : "userman_local";
  merged.radiusAcctPort =
    typeof raw.radiusAcctPort === "number"
      ? raw.radiusAcctPort
      : ((typeof raw.radiusPort === "number" ? raw.radiusPort : 1812) + 1);
  merged.radiusSrcAddress = typeof raw.radiusSrcAddress === "string" ? raw.radiusSrcAddress : "";

  merged.portalLoginMode =
    raw.portalLoginMode === "voucher_only" || raw.portalLoginMode === "user_pass_only"
      ? raw.portalLoginMode
      : "both";
  merged.voucherPasswordMode = raw.voucherPasswordMode === "blank" ? "blank" : "same_as_user";

  merged.dhcpLeaseTime =
    typeof raw.dhcpLeaseTime === "string" && raw.dhcpLeaseTime.trim()
      ? raw.dhcpLeaseTime.trim()
      : DEFAULT_CONFIG.dhcpLeaseTime;
  merged.enableUniversalClient = Boolean(raw.enableUniversalClient);
  merged.forceDnsRedirect =
    typeof raw.forceDnsRedirect === "boolean" ? raw.forceDnsRedirect : DEFAULT_CONFIG.forceDnsRedirect;
  merged.clampTcpMss =
    typeof raw.clampTcpMss === "boolean" ? raw.clampTcpMss : DEFAULT_CONFIG.clampTcpMss;

  if (typeof raw.disableUnusedServices === "boolean" && typeof raw.serviceApi !== "boolean") {
    const enabledLegacy = !raw.disableUnusedServices;
    merged.serviceTelnet = enabledLegacy;
    merged.serviceFtp = enabledLegacy;
    merged.serviceApi = enabledLegacy;
    merged.serviceApiSsl = enabledLegacy;
    merged.serviceWww = true;
    merged.serviceSsh = true;
  }

  const legacyKeys = [
    "disableUnusedServices",
    "generateVouchersBatch",
    "voucherTarget",
    "voucherCount",
    "voucherPrefix",
    "voucherLength",
    "voucherCodes",
    "voucherSelectedProfile",
    "voucherLocalLimitUptime",
    "voucherLocalLimitBytesMb",
    "voucherUmGroup",
    "voucherSharedUsers",
  ];
  for (const key of legacyKeys) {
    delete (merged as unknown as Record<string, unknown>)[key];
  }

  if (merged.useLanBridge) {
    const bridgeName = merged.lanBridgeName || "bridge-lan";
    const bridgePortSet = new Set(
      (merged.lanBridgePorts || "")
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean)
    );
    merged.vlans = merged.vlans.map((v) => {
      const parent = (v.parentInterface || "").trim();
      if (!parent || parent === merged.lanInterface || bridgePortSet.has(parent)) {
        return { ...v, parentInterface: bridgeName };
      }
      return v;
    });
  }

  return merged;
}

export function hydrateHotspotProfiles(raw: unknown): HotspotUserProfile[] {
  if (!Array.isArray(raw)) {
    return DEFAULT_HOTSPOT_PROFILES;
  }

  return raw.filter(isRecord).map((p, idx): HotspotUserProfile => {
    const legacyBurstTime = typeof p.burstTime === "string" ? p.burstTime : undefined;
    return {
      id: typeof p.id === "string" && p.id ? p.id : `prof_${idx + 1}`,
      name: typeof p.name === "string" ? p.name : `hs-plan-${idx + 1}`,
      displayName: typeof p.displayName === "string" ? p.displayName : `Speed Plan ${idx + 1}`,
      uploadLimit: normalizeRateToken(p.uploadLimit) || "512k",
      downloadLimit: normalizeRateToken(p.downloadLimit) || "2M",
      minUpload: normalizeRateToken(p.minUpload),
      minDownload: normalizeRateToken(p.minDownload),
      burstUpload: normalizeRateToken(p.burstUpload),
      burstDownload: normalizeRateToken(p.burstDownload),
      burstThresholdUpload: normalizeRateToken(p.burstThresholdUpload),
      burstThresholdDownload: normalizeRateToken(p.burstThresholdDownload),
      burstTimeUpload: typeof p.burstTimeUpload === "string" ? p.burstTimeUpload : (legacyBurstTime || "8s"),
      burstTimeDownload: typeof p.burstTimeDownload === "string" ? p.burstTimeDownload : (legacyBurstTime || "8s"),
      priority: typeof p.priority === "number" ? p.priority : 8,
      sharedUsers: typeof p.sharedUsers === "number" ? Math.max(1, p.sharedUsers) : 1,
      sessionTimeout: typeof p.sessionTimeout === "string" ? p.sessionTimeout : "00:00:00",
      idleTimeout: typeof p.idleTimeout === "string" ? p.idleTimeout : "00:15:00",
      keepaliveTimeout: typeof p.keepaliveTimeout === "string" ? p.keepaliveTimeout : "00:02:00",
      statusAutorefresh: typeof p.statusAutorefresh === "string" ? p.statusAutorefresh : "1m",
      addMacCookie: typeof p.addMacCookie === "boolean" ? p.addMacCookie : true,
      macCookieTimeout: typeof p.macCookieTimeout === "string" ? p.macCookieTimeout : "3d",
      addressPool: typeof p.addressPool === "string" ? p.addressPool : undefined,
      addressList: typeof p.addressList === "string" ? p.addressList : undefined,
      queueType: typeof p.queueType === "string" ? p.queueType : undefined,
      insertQueueBefore: p.insertQueueBefore === "bottom" ? "bottom" : "first",
      transparentProxy: Boolean(p.transparentProxy),
      localValidity: typeof p.localValidity === "string" ? p.localValidity : undefined,
      localExpiryAction: p.localExpiryAction === "disable" ? "disable" : "remove",
    };
  });
}
