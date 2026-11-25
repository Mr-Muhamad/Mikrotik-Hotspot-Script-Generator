import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import type { HotspotConfig, HotspotUserProfile } from "../../types";
import {
  ALL_UM_WEEKDAYS,
  DEFAULT_CONFIG,
  DEFAULT_HOTSPOT_PROFILES,
  hydrateConfig,
  hydrateHotspotProfiles,
} from "../../constants/defaults.ts";
import {
  buildLocalExpiryOnLoginScript,
  buildRateLimitString,
  calculateNetworkAddress,
  calculateSubnetPool,
  escapeRosString,
  generateMikrotikScript,
  normalizeBurstTimeSeconds,
  normalizeRosRate,
} from "../scriptGenerator.ts";
import {
  generateHotspotLoginPageHtml,
  generateHotspotPortalFiles,
  generateMd5JsFile,
  hexMD5,
} from "../htmlTemplateGenerator.ts";
import { validateConfiguration } from "../validation.ts";
import { buildDeploymentReadme, createZipBytes, stripConfigSecrets } from "../zipExporter.ts";

function makeBaseConfig(overrides: Partial<HotspotConfig> = {}): HotspotConfig {
  return {
    ...DEFAULT_CONFIG,
    ...overrides,
  };
}

const sampleHotspotProfiles: HotspotUserProfile[] = [
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
    burstThresholdDownload: "1.5M",
    burstTimeUpload: "8s",
    burstTimeDownload: "8s",
    priority: 6,
    sharedUsers: 2,
    sessionTimeout: "02:00:00",
    idleTimeout: "00:15:00",
    keepaliveTimeout: "00:02:00",
    statusAutorefresh: "1m",
    addMacCookie: true,
    macCookieTimeout: "5d",
    addressPool: "hs-pool-ether2",
    addressList: "vip_list",
    insertQueueBefore: "first",
    transparentProxy: false,
  },
];

test("normalizeRosRate converts fractional M rates and builds full rate-limit strings", () => {
  assert.equal(normalizeRosRate("1.5M"), "1500k");
  assert.equal(normalizeRosRate("512k"), "512k");
  assert.equal(normalizeRosRate("2M"), "2M");
  assert.equal(normalizeBurstTimeSeconds("8s"), "8");
  assert.equal(normalizeBurstTimeSeconds("1m"), "60");
  assert.equal(normalizeBurstTimeSeconds("00:00:12"), "12");
  assert.equal(
    buildRateLimitString(sampleHotspotProfiles[0]),
    "512k/2M 1M/4M 384k/1500k 8/8 6 256k/1M"
  );
  assert.equal(
    buildRateLimitString({
      ...sampleHotspotProfiles[0],
      burstUpload: "",
      burstDownload: "",
      priority: 6,
      minUpload: "128k",
      minDownload: "512k",
    }),
    "512k/2M 0/0 0/0 0/0 6 128k/512k"
  );
});

test("CIDR calculation supports /24, /23, /22, and /16 subnets", () => {
  assert.equal(calculateNetworkAddress("192.168.80.1", 24), "192.168.80.0");
  assert.equal(calculateNetworkAddress("192.168.81.1", 23), "192.168.80.0");
  assert.equal(calculateNetworkAddress("10.10.3.5", 22), "10.10.0.0");
  assert.equal(calculateNetworkAddress("172.16.45.1", 16), "172.16.0.0");

  const pool23 = calculateSubnetPool("192.168.80.1", 23);
  assert.deepEqual(pool23, {
    network: "192.168.80.0",
    poolStart: "192.168.80.10",
    poolEnd: "192.168.81.254",
  });

  const pool23Split = calculateSubnetPool("192.168.81.1", 23);
  assert.ok(pool23Split);
  assert.equal(pool23Split.network, "192.168.80.0");
  assert.equal(pool23Split.poolStart, "192.168.81.2");
  assert.equal(pool23Split.poolEnd, "192.168.81.254");
});

test("escapeRosString neutralizes quotes, backslashes, dollar signs, and newlines", () => {
  assert.equal(escapeRosString(`My "Router"\n/system reboot;$x\\y`), `My \\"Router\\" /system reboot;\\$x\\\\y`);

  const injected = generateMikrotikScript(
    makeBaseConfig({
      routerIdentity: `Cafe"1\n/ip firewall filter remove [find]`,
      radiusSecret: `sec$1"2`,
      singleWanType: "pppoe",
      singleWanPppoePass: `p@ss"$\nline2`,
    }),
    sampleHotspotProfiles
  );

  assert.match(injected, /set name="Cafe\\"1 \/ip firewall filter remove \[find\]"/);
  assert.match(injected, /secret="sec\\\$1\\"2"/);
  assert.match(injected, /password="p@ss\\"\\\$ line2"/);
});

test("System identity, timezone, and NTP syntax adapt between v7 and v6", () => {
  const v7 = generateMikrotikScript(makeBaseConfig({ rosVersion: "v7", routerIdentity: "Cafe-GW" }), sampleHotspotProfiles);
  assert.match(v7, /\/system identity\nset name="Cafe-GW"/);
  assert.match(v7, /\/system ntp client servers\nadd address=pool\.ntp\.org/);

  const v6 = generateMikrotikScript(makeBaseConfig({ rosVersion: "v6", routerIdentity: "Cafe-GW" }), sampleHotspotProfiles);
  assert.match(v6, /\/system ntp client\nset enabled=yes server-dns-names=pool\.ntp\.org,time\.google\.com/);
});

test("Single WAN and Multi-WAN PCC/NTH/ECMP generate valid RouterOS routes", () => {
  const wanLines = [
    { id: "wan_1", name: "WAN1", interfaceName: "ether1", gatewayIp: "192.168.1.1", staticIp: "192.168.1.5/30", checkHost: "8.8.8.8", useInterfaceGateway: true, distance: 1, weight: 2, type: "static" as const },
    { id: "wan_2", name: "WAN2", interfaceName: "ether3", gatewayIp: "192.168.2.1", checkHost: "1.1.1.1", useInterfaceGateway: false, distance: 2, weight: 1, type: "dhcp" as const },
  ];

  const v7Pcc = generateMikrotikScript(
    makeBaseConfig({ rosVersion: "v7", loadBalancingMethod: "pcc", wanLines, stickyConnections: true, enableRecursiveFailover: true }),
    sampleHotspotProfiles
  );
  assert.match(v7Pcc, /\/routing table\nadd disabled=no fib name=to_WAN1/);
  assert.match(v7Pcc, /hotspot=!auth/);
  assert.match(v7Pcc, /per-connection-classifier=both-addresses:3\/0/);
  assert.match(v7Pcc, /gateway=8\.8\.8\.8 routing-table=to_WAN1/);
});

test("Hotspot Server Profile uses official http-cookie-lifetime, mac-cookie, and trial parameters", () => {
  const script = generateMikrotikScript(
    makeBaseConfig({
      authMode: "hotspot_only",
      enableCookie: true,
      loginMacCookie: true,
      cookieLifetime: "7d",
      enableTrial: true,
      trialDuration: "30m",
      trialResetTime: "1d",
      trialRateLimit: "256k/512k",
    }),
    sampleHotspotProfiles
  );

  assert.match(script, /login-by=http-chap,http-pap,cookie,mac-cookie,trial/);
  assert.match(script, /http-cookie-lifetime=7d/);
  assert.match(script, /trial-uptime-limit=30m trial-uptime-reset=1d trial-user-profile=trial-profile/);
  assert.doesNotMatch(script, /\scookie-lifetime=/);
  assert.doesNotMatch(script, /trial-user-reset-limit/);
  assert.match(script, /add name="trial-profile" rate-limit="256k\/512k" shared-users=1/);
  // trial-profile must be created before /ip hotspot profile references it
  assert.ok(
    script.indexOf('add name="trial-profile"') < script.indexOf("trial-user-profile=trial-profile")
  );
  // /ip hotspot user profile does not support comment= in RouterOS
  const userProfBlock = script.slice(
    script.indexOf("/ip hotspot user profile"),
    script.indexOf("/ip hotspot profile")
  );
  assert.doesNotMatch(userProfBlock, /\bcomment=/);
});

test("hotspot_only mode emits separated local Hotspot profiles and omits RADIUS/User Manager", () => {
  const script = generateMikrotikScript(
    makeBaseConfig({
      authMode: "hotspot_only",
    }),
    sampleHotspotProfiles
  );

  assert.match(script, /use-radius=no/);
  assert.match(script, /name="hs-2M" rate-limit="512k\/2M 1M\/4M 384k\/1500k 8\/8 6 256k\/1M" shared-users=2/);
  assert.match(script, /add-mac-cookie=yes mac-cookie-timeout=5d address-pool="hs-pool-ether2" address-list="vip_list"/);
  assert.match(script, /insert-queue-before=first/);
  assert.match(script, /:local ftRule \(\[\/ip firewall filter find where action="fasttrack-connection"\]->0\)/);
  assert.match(script, /connection-state=established,related hotspot=from-client/);
  assert.doesNotMatch(script, /\/radius\n/);
  assert.doesNotMatch(script, /\/user-manager/);
});

test("userman_radius mode omits conflicting local profiles and emits official v7 & v6 User Manager commands", () => {
  const dayNightConfig = makeBaseConfig({
    rosVersion: "v7",
    authMode: "userman_radius",
    umGroups: [
      {
        id: "g1",
        name: "vip-group",
        outerAuths: ["pap", "chap", "mschap2"],
        innerAuths: ["peap-mschap2"],
        mikrotikGroup: "hs-2M",
        addressList: "um_vip",
        framedPool: "hs-pool-ether2",
      },
    ],
    umLimitations: [
      {
        id: "l_day",
        name: "lim_day",
        rateLimitRx: "512k",
        rateLimitTx: "2M",
        rateLimitMinRx: "256k",
        rateLimitMinTx: "1M",
        rateLimitBurstRx: "1M",
        rateLimitBurstTx: "4M",
        rateLimitBurstThresholdRx: "384k",
        rateLimitBurstThresholdTx: "1.5M",
        rateLimitBurstTimeRx: "8s",
        rateLimitBurstTimeTx: "8s",
        transferLimitMb: 5120,
        resetCountersInterval: "monthly",
        resetCountersStartTime: "00:00:00",
        v6GroupName: "hs-2M",
        v6IpPool: "hs-pool-ether2",
        v6AddressList: "um_vip",
      },
      {
        id: "l_night",
        name: "lim_night",
        rateLimitRx: "1M",
        rateLimitTx: "6M",
        resetCountersInterval: "disabled",
      },
    ],
    umProfiles: [
      {
        id: "p1",
        name: "UM-DayNight",
        nameForUsers: "2M Day / 6M Night",
        validity: "30d",
        price: 15,
        startsWhen: "first-auth",
        overrideSharedUsers: "2",
        limitations: [
          { id: "pl1", limitationId: "l_day", fromTime: "08:00:00", tillTime: "23:59:59", weekdays: ALL_UM_WEEKDAYS },
          { id: "pl2", limitationId: "l_night", fromTime: "00:00:00", tillTime: "07:59:59", weekdays: ALL_UM_WEEKDAYS },
        ],
      },
    ],
  });

  const v7 = generateMikrotikScript(dayNightConfig, sampleHotspotProfiles);
  assert.match(v7, /use-radius=yes/);
  assert.doesNotMatch(v7, /name="hs-2M" rate-limit=/);
  assert.doesNotMatch(v7, /set \[ find default=yes \] name=default rate-limit=/);
  assert.match(v7, /\/user-manager user group\n:if \(\[:len \[find name="vip-group"\]\] > 0\) do=\{ set \[find name="vip-group"\] outer-auths=pap,chap,mschap2 inner-auths=peap-mschap2 attributes="Mikrotik-Group:hs-2M,Mikrotik-Address-List:um_vip,Framed-Pool:hs-pool-ether2" \} else=\{ add name="vip-group" outer-auths=pap,chap,mschap2 inner-auths=peap-mschap2 attributes="Mikrotik-Group:hs-2M,Mikrotik-Address-List:um_vip,Framed-Pool:hs-pool-ether2" \}/);
  assert.match(v7, /name="lim_day" rate-limit-rx=512k rate-limit-tx=2M rate-limit-min-rx=256k rate-limit-min-tx=1M rate-limit-burst-rx=1M rate-limit-burst-tx=4M rate-limit-burst-threshold-rx=384k rate-limit-burst-threshold-tx=1500k rate-limit-burst-time-rx=8s rate-limit-burst-time-tx=8s rate-limit-priority=8 transfer-limit=5368709120 reset-counters-interval=monthly reset-counters-start-time=00:00:00/);
  assert.match(v7, /add profile="UM-DayNight" limitation="lim_day" from-time=08:00:00 till-time=23:59:59/);
  assert.match(v7, /add profile="UM-DayNight" limitation="lim_night" from-time=00:00:00 till-time=07:59:59/);
  assert.doesNotMatch(v7, /:rndstr/);

  const v6 = generateMikrotikScript({ ...dayNightConfig, rosVersion: "v6" }, sampleHotspotProfiles);
  assert.match(v6, /\/tool user-manager customer\n:if \(\[:len \[find login="admin"\]\] = 0\) do=\{ add login="admin"/);
  assert.match(v6, /use-coa=yes coa-port=3799/);
  assert.match(v6, /owner="admin" name="lim_day" rate-limit-rx=512k rate-limit-tx=2M .* rate-limit-burst-treshold-rx=384k rate-limit-burst-treshold-tx=1500k rate-limit-burst-time-rx=8s rate-limit-burst-time-tx=8s .* transfer-limit=5368709120 group-name="hs-2M" ip-pool="hs-pool-ether2" address-list="um_vip"/);
  assert.match(v6, /starts-at=logon override-shared-users=2/);
  assert.match(v6, /\/tool user-manager profile profile-limitation/);
  assert.doesNotMatch(v6, /% 65537/);
});

test("hybrid mode emits both local Hotspot profiles and User Manager setup", () => {
  const hybrid = generateMikrotikScript(
    makeBaseConfig({
      rosVersion: "v7",
      authMode: "hybrid",
    }),
    sampleHotspotProfiles
  );

  assert.match(hybrid, /add name="hs-2M" rate-limit=/);
  assert.match(hybrid, /\/user-manager\nset enabled=yes/);
});

test("LAN Bridge, Bridge VLAN Filtering, CAKE Queue, and Firewall rules remain valid", () => {
  const script = generateMikrotikScript(
    makeBaseConfig({
      rosVersion: "v7",
      authMode: "hybrid",
      useLanBridge: true,
      lanBridgeName: "bridge-lan",
      lanBridgePorts: "ether2,ether3",
      enableBridgeVlanFiltering: true,
      enableVlans: true,
      queueType: "cake",
      parentQueueMaxLimit: "50M/100M",
      vlans: [
        {
          id: "v10",
          name: "vlan10_guests",
          vlanId: 10,
          parentInterface: "bridge-lan",
          gatewayIp: "172.16.10.1",
          subnetMask: 24,
          dhcpEnabled: true,
          poolStart: "172.16.10.10",
          poolEnd: "172.16.10.254",
          enableHotspotOnVlan: true,
        },
      ],
    }),
    sampleHotspotProfiles
  );

  assert.match(script, /set \[ find name="bridge-lan" \] vlan-filtering=yes/);
  assert.match(script, /target=192\.168\.80\.0\/24,172\.16\.10\.0\/24 queue=cake-hotspot\/cake-hotspot max-limit=50M\/100M/);
  assert.match(script, /parent-queue="hs-parent-queue"/);
  assert.doesNotMatch(script, /queue-type=cake-hotspot/);
});

test("Login HTML generator escapes user inputs and drops user-scalable=no", () => {
  const html = generateHotspotLoginPageHtml(
    makeBaseConfig({
      loginTitle: `Net <script>alert("xss")</script>`,
      contactPhone: `010-123<script>`,
    })
  );

  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;alert\(&quot;xss&quot;\)&lt;\/script&gt;/);
  assert.match(html, /href="tel:010-123"/);
  assert.doesNotMatch(html, /user-scalable=no/);
});

test("validateConfiguration validates separated Hotspot and User Manager entities by authMode", () => {
  assert.equal(validateConfiguration(DEFAULT_CONFIG, DEFAULT_HOTSPOT_PROFILES).length, 0);

  const hsOnlyIssues = validateConfiguration(
    makeBaseConfig({
      authMode: "hotspot_only",
      loginHttpChap: false,
      loginHttpPap: false,
    }),
    [{ ...sampleHotspotProfiles[0], uploadLimit: "abc" }]
  );
  const hsIds = new Set(hsOnlyIssues.map((i) => i.id));
  assert.ok(hsIds.has("prof_rate_invalid_prof_2m"));
  assert.ok(hsIds.has("adv_no_voucher_login_method"));

  const umIssues = validateConfiguration(
    makeBaseConfig({
      rosVersion: "v7",
      authMode: "userman_radius",
      umGroups: [{ id: "g1", name: "empty-auth", outerAuths: [], innerAuths: [] }],
      umLimitations: [{ id: "l1", name: "bad", rateLimitRx: "xyz", rateLimitTx: "2M", resetCountersInterval: "disabled" }],
      umProfiles: [{ id: "p1", name: "P1", nameForUsers: "P1", validity: "30d", price: 5, startsWhen: "first-auth", overrideSharedUsers: "1", limitations: [{ id: "b1", limitationId: "deleted", fromTime: "00:00:00", tillTime: "23:59:59", weekdays: ALL_UM_WEEKDAYS }] }],
    }),
    sampleHotspotProfiles
  );
  const umIds = new Set(umIssues.map((i) => i.id));
  assert.ok(umIds.has("um_lim_rate_invalid_l1"));
  assert.ok(umIds.has("um_prof_broken_lim_p1_b1"));
  assert.ok(umIds.has("um_group_no_auth_g1"));
});

test("hydrateConfig and hydrateHotspotProfiles safely migrate legacy v2 JSON", () => {
  const hydrated = hydrateConfig({
    rosVersion: "v6",
    enableUserManager: false,
    gatewayIp: "10.10.0.1",
  });

  assert.equal(hydrated.rosVersion, "v6");
  assert.equal(hydrated.authMode, "hotspot_only");
  assert.equal(hydrated.enableUserManager, false);
  assert.ok(hydrated.umLimitations.length > 0);
  assert.ok(hydrated.umProfiles.length > 0);

  const migratedProfiles = hydrateHotspotProfiles([{ name: "3M", uploadLimit: "1M", downloadLimit: "1.5M", burstTime: "10s" }]);
  assert.equal(migratedProfiles[0].downloadLimit, "1500k");
  assert.equal(migratedProfiles[0].burstTimeUpload, "10s");
  assert.equal(migratedProfiles[0].addMacCookie, true);
});

test("buildLocalExpiryOnLoginScript emits RouterOS-safe scheduler auto-expiry script", () => {
  const rawScript = buildLocalExpiryOnLoginScript("7d", "remove");
  assert.match(rawScript, /interval=7d/);
  assert.match(rawScript, /start-date=\$d start-time=\$t/);
  assert.match(rawScript, /:local d \[\/system clock get date\]; :local t \[\/system clock get time\]; :delay 1s;/);
  assert.match(rawScript, /\/ip hotspot user remove/);

  const disableScript = buildLocalExpiryOnLoginScript("12h", "disable");
  assert.match(disableScript, /interval=12h/);
  assert.match(disableScript, /\/ip hotspot user disable/);

  const rosScript = generateMikrotikScript(
    makeBaseConfig({ authMode: "hotspot_only" }),
    [{ ...sampleHotspotProfiles[0], localValidity: "7d", localExpiryAction: "remove" }]
  );
  assert.match(rosScript, /on-login=":local u \\\$user; :if/);
  assert.match(rosScript, /interval=7d/);
});

test("createZipBytes and buildDeploymentReadme produce valid ZIP archive headers and entries", () => {
  const readme = buildDeploymentReadme(
    makeBaseConfig({ rosVersion: "v7", storageMode: "flash", serverName: "hs1" }),
    "hotspot_setup_v7_hs1.rsc"
  );
  assert.match(readme, /flash\/hotspot\/login\.html/);
  assert.match(readme, /\/import file-name=hotspot_setup_v7_hs1\.rsc verbose=yes/);
  assert.match(readme, /\/system backup save name=before-hotspot/);
  assert.match(readme, /\/user-manager router print/);

  const v6Readme = buildDeploymentReadme(
    makeBaseConfig({ rosVersion: "v6", authMode: "userman_radius", serverName: "hs1" }),
    "hotspot_setup_v6_hs1.rsc"
  );
  assert.match(v6Readme, /\/tool user-manager router print/);

  const zipBytes = createZipBytes([
    { path: "hotspot_setup_v7_hs1.rsc", content: "/system identity\nset name=\"MikroTik\"" },
    { path: "flash/hotspot/login.html", content: "<html><body>Hotspot</body></html>" },
    { path: "README_DEPLOY.txt", content: readme },
  ]);

  const view = new DataView(zipBytes.buffer, zipBytes.byteOffset, zipBytes.byteLength);
  // First Local File Header signature PK\x03\x04
  assert.equal(view.getUint32(0, true), 0x04034b50);
  // End of Central Directory signature PK\x05\x06 at tail (22 bytes)
  assert.equal(view.getUint32(zipBytes.length - 22, true), 0x06054b50);
  // Entry count = 3
  assert.equal(view.getUint16(zipBytes.length - 22 + 8, true), 3);
  assert.equal(view.getUint16(zipBytes.length - 22 + 10, true), 3);

  const decoded = new TextDecoder().decode(zipBytes);
  assert.ok(decoded.includes("hotspot_setup_v7_hs1.rsc"));
  assert.ok(decoded.includes("flash/hotspot/login.html"));
  assert.ok(decoded.includes("README_DEPLOY.txt"));
});

test("Firewall ordering places Drop Invalid & Inter-VLAN Isolation strictly before FastTrack Bypass and hardens input chain", () => {
  const script = generateMikrotikScript(
    makeBaseConfig({
      rosVersion: "v7",
      enableVlans: true,
      isolateVlans: true,
      bypassFasttrack: true,
      enableFirewallHardening: true,
      blockHotspotRouterAccess: true,
      blockWanManagement: true,
      radiusServerIp: "10.0.0.5",
      coaPort: 3799,
    }),
    sampleHotspotProfiles
  );

  const dropInvalidIdx = script.indexOf('comment="Drop Invalid Forward Packets"');
  const isolateIdx = script.indexOf('comment="Isolate VLANs & Main LAN from Each Other"');
  const ftUploadIdx = script.indexOf('comment="Bypass FastTrack for Hotspot Upload"');
  assert.ok(dropInvalidIdx > -1 && isolateIdx > -1 && ftUploadIdx > -1);
  assert.ok(dropInvalidIdx < ftUploadIdx && isolateIdx < ftUploadIdx);

  const sshDropIdx = script.indexOf('src-address-list=ssh_black_list comment="Drop SSH Brute Force Blacklist"');
  const sshStage1Idx = script.indexOf('address-list=ssh_stage1');
  assert.ok(sshDropIdx > -1 && sshStage1Idx > -1 && sshDropIdx < sshStage1Idx);

  assert.match(script, /dst-port=80,443 protocol=tcp dst-address-list=!HOTSPOT_GW_IPS hotspot=from-client/);
  assert.match(script, /protocol=udp src-address=10\.0\.0\.5 dst-port=3799 comment="Allow Incoming RADIUS CoA"/);
});

test("Command injection payloads in DNS, Gateway, Static WAN, Interface, and Group attributes are neutralized", () => {
  const malicious = generateMikrotikScript(
    makeBaseConfig({
      wanInterface: "ether1[/system/reboot]",
      gatewayIp: "192.168.80.1\n/user add name=evil group=full",
      dnsServers: ["8.8.8.8\n/system reboot", "1.1.1.1"],
      singleWanType: "static",
      singleWanIp: "192.168.1.2/24\n/quit",
      singleWanGateway: "192.168.1.1; /system reboot",
      umGroups: [
        {
          id: "g1",
          name: "grp",
          outerAuths: ["pap", "chap[/system/reboot]"],
          innerAuths: [],
          mikrotikGroup: "hs-2M[/quit]",
        },
      ],
    }),
    sampleHotspotProfiles
  );

  assert.doesNotMatch(malicious, /\/user add name=evil/);
  assert.doesNotMatch(malicious, /\/system reboot/);
  assert.doesNotMatch(malicious, /\[\/system\/reboot\]/);
  assert.doesNotMatch(malicious, /\[\/quit\]/);
  assert.match(malicious, /servers=1\.1\.1\.1/);
  assert.match(malicious, /address=192\.168\.80\.1\/24/);
});

test("Multi-WAN Recursive Failover skips recursive canary on PPPoE lines and uses v7 target-scope=12", () => {
  const script = generateMikrotikScript(
    makeBaseConfig({
      rosVersion: "v7",
      loadBalancingMethod: "pcc",
      enableRecursiveFailover: true,
      wanLines: [
        { id: "w1", name: "Fiber", interfaceName: "ether1", gatewayIp: "192.168.1.1", checkHost: "8.8.8.8", distance: 1, weight: 1, type: "dhcp" },
        { id: "w2", name: "DSL_PPPoE", interfaceName: "ether3", gatewayIp: "", pppoeUser: "u1", pppoePass: "p1", checkHost: "1.1.1.1", distance: 2, weight: 1, type: "pppoe" },
      ],
    }),
    sampleHotspotProfiles
  );

  assert.match(script, /dst-address=8\.8\.8\.8\/32 gateway=192\.168\.1\.1 scope=11 target-scope=10/);
  assert.match(script, /dst-address=0\.0\.0\.0\/0 distance=1 gateway=8\.8\.8\.8 routing-table=to_WAN1 check-gateway=ping scope=30 target-scope=12/);
  assert.doesNotMatch(script, /dst-address=1\.1\.1\.1\/32 gateway=pppoe-DSL_PPPoE/);
  assert.match(script, /dst-address=0\.0\.0\.0\/0 distance=1 gateway=pppoe-DSL_PPPoE routing-table=to_WAN2 check-gateway=ping/);
});

test("useLanBridge automatically binds VLANs configured on bridge slave ports to bridge-lan", () => {
  const script = generateMikrotikScript(
    makeBaseConfig({
      useLanBridge: true,
      lanBridgeName: "bridge-lan",
      lanBridgePorts: "ether2,ether3",
      enableVlans: true,
      vlans: [
        {
          id: "v10",
          name: "vlan10_staff",
          vlanId: 10,
          parentInterface: "ether2",
          gatewayIp: "172.16.10.1",
          subnetMask: 24,
          dhcpEnabled: true,
          poolStart: "172.16.10.10",
          poolEnd: "172.16.10.254",
          enableHotspotOnVlan: false,
        },
      ],
    }),
    sampleHotspotProfiles
  );

  assert.match(script, /add name="vlan10_staff" vlan-id=10 interface=bridge-lan/);
});

test("hexMD5 handles RFC 1321 and binary Latin-1 strings; login HTML supports EN and empty CHAP passwords", () => {
  assert.equal(hexMD5(""), "d41d8cd98f00b204e9800998ecf8427e");
  assert.equal(hexMD5("abc"), "900150983cd24fb0d6963f7d28e17f72");
  const binaryChallenge = "\x01secret\xff\x80\xaa";
  const expectedBinaryMd5 = createHash("md5").update(Buffer.from(binaryChallenge, "latin1")).digest("hex");
  assert.equal(hexMD5(binaryChallenge), expectedBinaryMd5);

  const enHtml = generateHotspotLoginPageHtml(makeBaseConfig({ loginTitle: "" }), "en");
  assert.match(enHtml, /<html lang="en" dir="ltr">/);
  assert.match(enHtml, /Voucher Code/);
  assert.doesNotMatch(enHtml, /if \(form\.password\.value\.length > 0\)/);
  assert.match(generateMd5JsFile(), /hexMD5/);
});

test("calculateSubnetPool excludes gateway IP and validation catches overlaps, duplicate canaries, and invalid limits", () => {
  const pool254 = calculateSubnetPool("192.168.80.254", 24);
  assert.deepEqual(pool254, {
    network: "192.168.80.0",
    poolStart: "192.168.80.10",
    poolEnd: "192.168.80.253",
  });

  const pool50 = calculateSubnetPool("192.168.80.50", 24);
  assert.deepEqual(pool50, {
    network: "192.168.80.0",
    poolStart: "192.168.80.51",
    poolEnd: "192.168.80.254",
  });

  const issues = validateConfiguration(
    makeBaseConfig({
      rosVersion: "v7",
      gatewayIp: "192.168.80.254",
      poolStart: "192.168.80.10",
      poolEnd: "192.168.80.254",
      enableVlans: true,
      vlans: [
        {
          id: "v_overlap",
          name: "vlan10",
          vlanId: 10,
          parentInterface: "ether2",
          gatewayIp: "192.168.80.2",
          subnetMask: 24,
          dhcpEnabled: true,
          poolStart: "192.168.80.10",
          poolEnd: "192.168.80.20",
          enableHotspotOnVlan: false,
        },
      ],
      loadBalancingMethod: "pcc",
      enableRecursiveFailover: true,
      wanLines: [
        { id: "w1", name: "W1", interfaceName: "ether1", gatewayIp: "192.168.1.1", checkHost: "8.8.8.8", distance: 1, weight: 1, type: "dhcp" },
        { id: "w2", name: "W2", interfaceName: "ether3", gatewayIp: "192.168.2.1", checkHost: "8.8.8.8", distance: 1, weight: 1, type: "dhcp" },
      ],
      queueType: "cake",
      parentQueueMaxLimit: "",
      ipBindings: [{ id: "ib1", macAddress: "invalid-mac", type: "bypassed" }],
      umLimitations: [{ id: "l1", name: "badmin", rateLimitRx: "512k", rateLimitTx: "2M", rateLimitMinRx: "1M", resetCountersInterval: "disabled" }],
      umProfiles: [{ id: "p1", name: "P1", nameForUsers: "P1", validity: "30d", price: 5, startsWhen: "first-auth", overrideSharedUsers: "1", limitations: [{ id: "b1", limitationId: "l1", fromTime: "18:00:00", tillTime: "08:00:00", weekdays: ALL_UM_WEEKDAYS }] }],
    }),
    [{ ...sampleHotspotProfiles[0], minDownload: "5M" }]
  );

  const ids = new Set(issues.map((i) => i.id));
  assert.ok(ids.has("net_pool_contains_gw"));
  assert.ok(ids.has("vlan_subnet_overlap_v_overlap"));
  assert.ok(ids.has("wan_dup_canary_8.8.8.8"));
  assert.ok(ids.has("adv_queue_max_limit_missing"));
  assert.ok(ids.has("adv_ip_binding_invalid_ib1"));
  assert.ok(ids.has("um_lim_min_exceeds_max_l1"));
  assert.ok(ids.has("um_sched_time_order_p1_b1"));
});

test("generateHotspotPortalFiles emits complete 5-file portal suite with escaping and RTL/LTR support", () => {
  const cfg = makeBaseConfig({ loginTitle: `Cafe <script>bad()</script>`, dnsName: "wifi.cafe" });
  const arFiles = generateHotspotPortalFiles(cfg, "ar");
  assert.deepEqual(Object.keys(arFiles).sort(), ["alogin.html", "login.html", "logout.html", "md5.js", "status.html"]);

  assert.match(arFiles["status.html"], /\$\(uptime\)/);
  assert.match(arFiles["status.html"], /\$\(bytes-in-nice\)/);
  assert.match(arFiles["status.html"], /action="\$\(link-logout\)"/);
  assert.doesNotMatch(arFiles["status.html"], /<script>bad/);
  assert.match(arFiles["logout.html"], /action="\$\(link-login\)"/);
  assert.match(arFiles["alogin.html"], /url=\$\(link-redirect\)/);

  const enFiles = generateHotspotPortalFiles(cfg, "en");
  assert.match(enFiles["status.html"], /<html lang="en" dir="ltr">/);
  assert.match(enFiles["logout.html"], /<html lang="en" dir="ltr">/);
  assert.match(enFiles["alogin.html"], /<html lang="en" dir="ltr">/);
});

test("stripConfigSecrets clears credentials without mutating original config and README covers 5 portal files", () => {
  const original = makeBaseConfig({
    singleWanPppoePass: "pppoe-secret",
    radiusSecret: "rad-secret",
    usermanAdminPass: "owner-secret",
    wanLines: [
      { id: "w1", name: "W1", interfaceName: "ether1", gatewayIp: "192.168.1.1", pppoePass: "w1-pass", distance: 1, weight: 1, type: "pppoe" },
    ],
  });

  const stripped = stripConfigSecrets(original);
  assert.equal(stripped.singleWanPppoePass, "");
  assert.equal(stripped.radiusSecret, "");
  assert.equal(stripped.usermanAdminPass, "");
  assert.equal(stripped.wanLines[0].pppoePass, "");

  // Original remains intact
  assert.equal(original.singleWanPppoePass, "pppoe-secret");
  assert.equal(original.radiusSecret, "rad-secret");
  assert.equal(original.wanLines[0].pppoePass, "w1-pass");

  const enReadme = buildDeploymentReadme(original, "hotspot.rsc", "en");
  const arReadme = buildDeploymentReadme(original, "hotspot.rsc", "ar");
  assert.match(enReadme, /status\.html/);
  assert.match(enReadme, /logout\.html/);
  assert.match(enReadme, /alogin\.html/);
  assert.match(arReadme, /status\.html/);
  assert.match(arReadme, /md5\.js/);
});

function assertValidRouterOsScript(script: string, label: string): void {
  assert.ok(!script.includes("\u2014"), `${label}: forbidden em-dash detected`);

  const rawLines = script.split(/\r?\n/);
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    assert.doesNotMatch(line, /\b(?:undefined|NaN|null)\b/, `${label} line ${i + 1}: unexpected JS token: ${line}`);
    assert.ok(!line.includes("[object Object]"), `${label} line ${i + 1}: [object Object] detected`);

    if (/\\$/.test(trimmed)) {
      const nextLine = (rawLines[i + 1] || "").trim();
      assert.ok(
        nextLine.length > 0 && !nextLine.startsWith("#"),
        `${label} line ${i + 1}: trailing line continuation followed by empty/comment line`
      );
    }
  }

  // Reconstruct logical statements via "\" continuations and multi-line "{ ... }" blocks,
  // then verify balanced quotes, brackets, braces, and parens.
  const logicalStatements: string[] = [];
  let buffer = "";
  let braceDepth = 0;
  let inMultilineString = false;

  const updateScanState = (chunk: string) => {
    for (let i = 0; i < chunk.length; i++) {
      const ch = chunk[i];
      if (inMultilineString) {
        if (ch === "\\") {
          i++;
          continue;
        }
        if (ch === '"') inMultilineString = false;
        continue;
      }
      if (ch === '"') {
        inMultilineString = true;
      } else if (ch === "{") {
        braceDepth++;
      } else if (ch === "}") {
        braceDepth = Math.max(0, braceDepth - 1);
      }
    }
  };

  for (const rawLine of rawLines) {
    const trimmedRight = rawLine.replace(/\s+$/, "");
    const trimmed = trimmedRight.trim();
    if (!buffer && braceDepth === 0 && (!trimmed || trimmed.startsWith("#"))) continue;
    if (/\\$/.test(trimmedRight)) {
      const part = trimmedRight.slice(0, -1) + " ";
      updateScanState(part);
      buffer += part;
    } else {
      updateScanState(trimmedRight);
      buffer += (buffer ? "\n" : "") + trimmedRight;
      if (braceDepth === 0 && !inMultilineString) {
        logicalStatements.push(buffer);
        buffer = "";
      }
    }
  }
  if (buffer) logicalStatements.push(buffer);

  for (const stmt of logicalStatements) {
    let inString = false;
    const stack: string[] = [];
    for (let i = 0; i < stmt.length; i++) {
      const ch = stmt[i];
      if (inString) {
        if (ch === "\\") {
          i++;
          continue;
        }
        if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') {
        inString = true;
      } else if (ch === "[") {
        stack.push("]");
      } else if (ch === "{") {
        stack.push("}");
      } else if (ch === "(") {
        stack.push(")");
      } else if (ch === "]" || ch === "}" || ch === ")") {
        const expected = stack.pop();
        assert.equal(ch, expected, `${label}: unbalanced "${ch}" in statement: ${stmt}`);
      }
    }
    assert.equal(inString, false, `${label}: unclosed string literal in statement: ${stmt}`);
    assert.equal(stack.length, 0, `${label}: unclosed delimiter(s) ${stack.join(",")} in statement: ${stmt}`);

    if (/^\/(?:ip firewall (?:filter|nat|mangle)|ip hotspot (?:walled-garden|ip-binding))\s+remove\b/.test(stmt)) {
      assert.match(stmt, /!dynamic/, `${label}: remove command missing !dynamic guard: ${stmt}`);
    }
  }

  // Definition-before-reference checks
  if (script.includes("in-interface-list=WAN_LIST")) {
    const defIdx = script.indexOf("add name=WAN_LIST");
    const refIdx = script.indexOf("in-interface-list=WAN_LIST");
    assert.ok(defIdx > -1 && defIdx < refIdx, `${label}: WAN_LIST referenced before definition`);
  }
  if (script.includes("in-interface-list=HOTSPOT_LAN")) {
    const defIdx = script.indexOf("add name=HOTSPOT_LAN");
    const refIdx = script.indexOf("in-interface-list=HOTSPOT_LAN");
    assert.ok(defIdx > -1 && defIdx < refIdx, `${label}: HOTSPOT_LAN referenced before definition`);
  }
  if (script.includes("in-interface-list=HOTSPOT_AUTH_IFACES")) {
    const defIdx = script.indexOf("add name=HOTSPOT_AUTH_IFACES");
    const refIdx = script.indexOf("in-interface-list=HOTSPOT_AUTH_IFACES");
    assert.ok(defIdx > -1 && defIdx < refIdx, `${label}: HOTSPOT_AUTH_IFACES referenced before definition`);
  }
  if (script.includes("dst-address-list=HOTSPOT_GW_IPS")) {
    const defIdx = script.indexOf("list=HOTSPOT_GW_IPS");
    const refIdx = script.indexOf("dst-address-list=HOTSPOT_GW_IPS");
    assert.ok(defIdx > -1 && defIdx < refIdx, `${label}: HOTSPOT_GW_IPS referenced before definition`);
  }
  if (script.includes("dst-address-list=LOCAL_SUBNETS")) {
    const defIdx = script.indexOf("list=LOCAL_SUBNETS");
    const refIdx = script.indexOf("dst-address-list=LOCAL_SUBNETS");
    assert.ok(defIdx > -1 && defIdx < refIdx, `${label}: LOCAL_SUBNETS referenced before definition`);
  }
  if (script.includes('parent-queue="hs-parent-queue"')) {
    const defIdx = script.indexOf('add name="hs-parent-queue"');
    const refIdx = script.indexOf('parent-queue="hs-parent-queue"');
    assert.ok(defIdx > -1 && defIdx < refIdx, `${label}: hs-parent-queue referenced before definition`);
  }
  assert.ok(script.indexOf("add name=hsprof1") > -1 || script.indexOf("name=hsprof1") > -1);
  assert.ok(script.indexOf("name=hsprof1") < script.indexOf("profile=hsprof1"), `${label}: hsprof1 must precede hotspot server`);
}

test("defconf compatibility, loopback RADIUS/DNS input ordering, wireless LAN bridge detachment, and portal static DNS", () => {
  const script = generateMikrotikScript(
    makeBaseConfig({
      rosVersion: "v7",
      authMode: "userman_radius",
      useLanBridge: false,
      lanInterface: "wifi1",
      dnsName: "wifi.cafe",
      enableVlans: true,
      vlans: [
        {
          id: "v10",
          name: "vlan10_guest",
          vlanId: 10,
          parentInterface: "ether2",
          gatewayIp: "172.16.10.1",
          subnetMask: 24,
          dhcpEnabled: true,
          poolStart: "172.16.10.10",
          poolEnd: "172.16.10.254",
          enableHotspotOnVlan: true,
          hotspotDnsName: "guest.wifi.cafe",
        },
      ],
      loadBalancingMethod: "pcc",
      wanLines: [
        { id: "w1", name: "W1", interfaceName: "ether1", gatewayIp: "192.168.1.1", distance: 1, weight: 1, type: "dhcp" },
        { id: "w2", name: "W2", interfaceName: "ether3", gatewayIp: "192.168.2.1", distance: 2, weight: 1, type: "dhcp" },
      ],
    }),
    sampleHotspotProfiles
  );

  // Standalone wifi1 LAN and Multi-WAN ether3 must be detached from defconf bridges without crashing /interface ethernet
  assert.doesNotMatch(script, /\[ find default-name="?wifi1"? \]/);
  assert.match(script, /\/interface bridge port remove \[ find interface=wifi1 \]/);
  assert.match(script, /\/interface bridge port remove \[ find interface=ether3 \]/);

  // defconf LAN & WAN interface lists synced so !LAN drop never locks out Hotspot/VLANs/Winbox
  assert.match(script, /:if \(\[:len \[\/interface list find name="LAN"\]\] > 0\) do=\{/);
  assert.match(script, /add list="LAN" interface="wifi1"/);
  assert.match(script, /add list="LAN" interface="vlan10_guest"/);
  assert.match(script, /:if \(\[:len \[\/interface list find name="WAN"\]\] > 0\) do=\{/);
  assert.match(script, /add list="WAN" interface="ether3"/);

  // Input chain places loopback, DNS/DHCP, and Captive Portal HTTP/HTTPS above defconf input drop
  assert.match(script, /src-address=127\.0\.0\.1 dst-address=127\.0\.0\.1 comment="Allow Localhost Loopback \(RADIUS & CoA\)" place-before=\$inDrop/);
  assert.match(script, /dst-port=53,67 in-interface-list=HOTSPOT_LAN comment="Allow Hotspot LAN\/VLAN DNS & DHCP" place-before=\$inDrop/);
  assert.match(script, /dst-port=80,443,64872-64875 dst-address-list=HOTSPOT_GW_IPS in-interface-list=HOTSPOT_LAN comment="Allow Hotspot Captive Portal HTTP\/HTTPS" place-before=\$inDrop/);

  // Static DNS records resolve portal hostnames cleanly even post-authentication
  assert.match(script, /\/ip dns static\nadd name="wifi\.cafe" address=192\.168\.80\.1 comment="Hotspot Portal DNS"/);
  assert.match(script, /add name="guest\.wifi\.cafe" address=172\.16\.10\.1 comment="Hotspot Portal DNS"/);
});

test("Idempotent re-import guards, non-destructive UM v6/v7 upserts, and Multi-WAN local FIB protection", () => {
  const baseMulti = makeBaseConfig({
    rosVersion: "v7",
    authMode: "userman_radius",
    loadBalancingMethod: "pcc",
    enableAutoCleanScript: false,
    enableScheduledReboot: false,
    preventSharingTtl: false,
    ipBindings: [{ id: "ib1", macAddress: "AA:BB:CC:DD:EE:FF", type: "bypassed", comment: "Printer" }],
    walledGardenDomains: [{ id: "wg1", domain: "*.pay.example", entryType: "domain", includeHttpsIp: true }],
  });

  const v7 = generateMikrotikScript(baseMulti, sampleHotspotProfiles);
  assert.match(v7, /\/system clock\nset time-zone-autodetect=no/);
  assert.match(v7, /\/system ntp client servers remove \[ find address=pool\.ntp\.org \]/);
  assert.match(v7, /\/ip dhcp-server network remove \[ find where address="192\.168\.80\.0\/24" or comment="Main Hotspot DHCP Network" \]/);
  assert.match(v7, /\/ip hotspot ip-binding remove \[ find where !dynamic and mac-address=AA:BB:CC:DD:EE:FF \]/);
  assert.match(v7, /\/ip hotspot walled-garden remove \[ find where !dynamic and dst-host="\*\.pay\.example" \]/);
  assert.match(v7, /\/ip hotspot walled-garden ip remove \[ find where !dynamic and dst-host="pay\.example" \]/);
  assert.match(v7, /\/routing rule remove \[ find comment="Keep Local Subnet in main FIB" \]/);
  assert.match(v7, /\/routing rule\nadd action=lookup dst-address=192\.168\.80\.0\/24 table=main comment="Keep Local Subnet in main FIB"/);
  assert.match(v7, /add action=mark-routing chain=prerouting connection-mark=WAN1_conn dst-address-type=!local dst-address-list=!LOCAL_SUBNETS/);
  assert.match(v7, /\/ip firewall nat remove \[ find where !dynamic and /);
  assert.match(v7, /\/ip firewall mangle remove \[ find where !dynamic and /);
  assert.match(v7, /\/ip firewall filter remove \[ find where !dynamic and /);
  assert.match(v7, /\/radius remove \[ find where comment="Radius link for User Manager" or comment="External RADIUS Server for Hotspot" \]/);
  assert.match(v7, /\/system scheduler remove \[ find name=schedule_weekly_reboot \]/);

  // RouterOS v6 must omit owner= and customer= in set[...] while keeping them in add[...]
  const v6 = generateMikrotikScript({ ...baseMulti, rosVersion: "v6" }, sampleHotspotProfiles);
  assert.match(v6, /\/ip route rule\nadd action=lookup dst-address=192\.168\.80\.0\/24 table=main comment="Keep Local Subnet in main FIB"/);
  assert.match(v6, /set \[find name="Router1"\] ip-address=/);
  assert.doesNotMatch(v6, /set \[find name="Router1"\] [^}]*customer=/);
  assert.match(v6, /else=\{ add customer="admin" name="Router1"/);
  assert.doesNotMatch(v6, /set \[find name="lim_1M"\] [^}]*owner=/);
  assert.match(v6, /else=\{ add owner="admin" name="lim_1M"/);
});

test("Cross-feature validation catches PPPoE blank users, UM group CHAP/PAP mismatches, and VLAN/voucher edge cases", () => {
  const issues = validateConfiguration(
    makeBaseConfig({
      rosVersion: "v7",
      authMode: "userman_radius",
      loadBalancingMethod: "none",
      singleWanType: "pppoe",
      singleWanPppoeUser: "",
      enableVlans: true,
      useLanBridge: false,
      enableBridgeVlanFiltering: true,
      vlans: [
        {
          id: "v10",
          name: "vlan10",
          vlanId: 10,
          parentInterface: "ether2",
          gatewayIp: "172.16.10.1",
          subnetMask: 24,
          dhcpEnabled: false,
          poolStart: "172.16.10.10",
          poolEnd: "172.16.10.254",
          enableHotspotOnVlan: true,
        },
      ],
      loginHttpChap: true,
      loginHttpPap: false,
      umGroups: [{ id: "g1", name: "bad-group", outerAuths: ["pap"], innerAuths: [] }],
    }),
    sampleHotspotProfiles
  );

  const ids = new Set(issues.map((i) => i.id));
  assert.ok(ids.has("single_wan_pppoe_user_empty"));
  assert.ok(ids.has("vlan_filtering_needs_bridge"));
  assert.ok(ids.has("vlan_hotspot_without_dhcp_v10"));
  assert.ok(ids.has("um_group_missing_chap_g1"));
});

test("End-to-End RouterOS .rsc structural & syntax verification across 24 feature combinations", () => {
  const versions: Array<"v6" | "v7"> = ["v6", "v7"];
  const authModes: Array<"hotspot_only" | "userman_radius" | "hybrid"> = ["hotspot_only", "userman_radius", "hybrid"];
  const wanScenarios: Array<{
    name: string;
    patch: Partial<HotspotConfig>;
  }> = [
    { name: "single-dhcp", patch: { loadBalancingMethod: "none", singleWanType: "dhcp" } },
    { name: "single-static", patch: { loadBalancingMethod: "none", singleWanType: "static", singleWanIp: "192.168.1.2/24", singleWanGateway: "192.168.1.1" } },
    { name: "single-pppoe", patch: { loadBalancingMethod: "none", singleWanType: "pppoe", singleWanPppoeUser: "isp_user", singleWanPppoePass: 'p@ss"1$2' } },
    {
      name: "pcc-recursive-pppoe",
      patch: {
        loadBalancingMethod: "pcc",
        enableRecursiveFailover: true,
        stickyConnections: true,
        wanLines: [
          { id: "w1", name: "Fiber", interfaceName: "ether1", gatewayIp: "192.168.1.1", checkHost: "8.8.8.8", useInterfaceGateway: true, distance: 1, weight: 2, type: "static", staticIp: "192.168.1.2/30" },
          { id: "w2", name: "DSL", interfaceName: "ether3", gatewayIp: "", pppoeUser: "dsl1", pppoePass: "sec1", checkHost: "1.1.1.1", distance: 2, weight: 1, type: "pppoe" },
        ],
      },
    },
    { name: "nth-direct", patch: { loadBalancingMethod: "nth", enableRecursiveFailover: false } },
    { name: "ecmp-failover", patch: { loadBalancingMethod: "ecmp", enableRecursiveFailover: true } },
  ];

  const baseRichProfiles: HotspotUserProfile[] = [
    ...sampleHotspotProfiles,
    { ...sampleHotspotProfiles[0], id: "prof_exp", name: "hs-weekly", localValidity: "7d", localExpiryAction: "disable" },
  ];

  let count = 0;
  for (const rosVersion of versions) {
    for (const authMode of authModes) {
      for (let i = 0; i < wanScenarios.length; i++) {
        const wanScenario = wanScenarios[i];
        const useBridge = i % 2 === 0;
        const cfg = makeBaseConfig({
          rosVersion,
          authMode,
          ...wanScenario.patch,
          useLanBridge: useBridge,
          lanBridgeName: "bridge-lan",
          lanBridgePorts: "ether2,ether4,wlan1",
          enableBridgeVlanFiltering: useBridge && i % 4 === 0,
          enableVlans: i % 2 === 0,
          isolateVlans: true,
          vlans: [
            {
              id: "v10",
              name: "vlan10_staff",
              vlanId: 10,
              parentInterface: "ether2",
              gatewayIp: "172.16.10.1",
              subnetMask: 24,
              dhcpEnabled: true,
              poolStart: "172.16.10.10",
              poolEnd: "172.16.10.254",
              enableHotspotOnVlan: true,
              hotspotDnsName: "staff.hotspot.local",
              taggedPorts: "ether4",
              untaggedPorts: "ether5",
            },
          ],
          queueType: rosVersion === "v7" && i % 2 === 0 ? "cake" : "simple",
          parentQueueMaxLimit: "50M/100M",
          enableTrial: i % 3 === 0,
          preventSharingTtl: i % 2 === 1,
          enableScheduledReboot: i % 3 === 1,
          walledGardenDomains: [
            { id: "wg1", domain: "*.whatsapp.com", entryType: "domain", includeHttpsIp: true },
            { id: "wg2", domain: "104.16.0.0/12", entryType: "ip", includeHttpsIp: false },
          ],
          ipBindings: [{ id: "ib1", macAddress: "AA:BB:CC:DD:EE:01", ipAddress: "192.168.80.5", type: "bypassed" }],
          radiusBackend: rosVersion === "v7" && i % 2 === 0 && authMode !== "hotspot_only" ? "external_radius" : "userman_local",
          radiusServerIp: rosVersion === "v7" && i % 2 === 0 && authMode !== "hotspot_only" ? "10.0.0.5" : "127.0.0.1",
          radiusAcctPort: 1813,
          radiusSrcAddress: rosVersion === "v7" && i % 2 === 0 && authMode !== "hotspot_only" ? "10.0.0.1" : "",
          serviceApi: i % 2 === 0,
          serviceFtp: i % 3 === 0,
          portalLoginMode: i % 3 === 0 ? "voucher_only" : i % 3 === 1 ? "user_pass_only" : "both",
          voucherPasswordMode: i % 2 === 0 ? "blank" : "same_as_user",
          dhcpLeaseTime: i % 3 === 0 ? "30m" : i % 3 === 1 ? "1h" : "12h",
          enableUniversalClient: i % 2 === 1,
          forceDnsRedirect: i % 3 !== 2,
          clampTcpMss: i % 4 !== 3,
        });

        const script = generateMikrotikScript(cfg, baseRichProfiles);
        assertValidRouterOsScript(script, `${rosVersion}/${authMode}/${wanScenario.name}`);
        count++;
      }
    }
  }
  assert.equal(count, 36);
});

test("Granular /ip service controls, 3 portal login credential modes, and legacy hydration work accurately", () => {
  const script = generateMikrotikScript(
    makeBaseConfig({
      serviceTelnet: false,
      serviceFtp: true,
      serviceWww: true,
      serviceSsh: true,
      serviceApi: true,
      serviceApiSsl: true,
    }),
    sampleHotspotProfiles
  );

  assert.match(script, /\/ip service\nset telnet disabled=yes\nset ftp disabled=no\nset www disabled=no\nset ssh disabled=no\nset api disabled=no\nset api-ssl disabled=no/);

  const migrated = hydrateConfig({ disableUnusedServices: false });
  assert.equal(migrated.serviceTelnet, true);
  assert.equal(migrated.serviceFtp, true);
  assert.equal(migrated.serviceApi, true);
  assert.equal(migrated.serviceApiSsl, true);
  assert.equal("disableUnusedServices" in (migrated as unknown as Record<string, unknown>), false);

  const blankVoucherHtml = generateHotspotLoginPageHtml(
    makeBaseConfig({ portalLoginMode: "voucher_only", voucherPasswordMode: "blank" }),
    "en"
  );
  assert.match(blankVoucherHtml, /id="loginMode" value="voucher"/);
  assert.match(blankVoucherHtml, /form\.password\.value = '';/);
  assert.doesNotMatch(blankVoucherHtml, /id="userPassGroup"/);
  assert.doesNotMatch(blankVoucherHtml, /id="tabUser"/);

  const userPassOnlyHtml = generateHotspotLoginPageHtml(
    makeBaseConfig({ portalLoginMode: "user_pass_only" }),
    "ar"
  );
  assert.match(userPassOnlyHtml, /id="loginMode" value="user"/);
  assert.match(userPassOnlyHtml, /id="userPassGroup"/);
  assert.doesNotMatch(userPassOnlyHtml, /id="voucherGroup"/);
  assert.doesNotMatch(userPassOnlyHtml, /id="tabVoucher"/);

  const bothHtml = generateHotspotLoginPageHtml(
    makeBaseConfig({ portalLoginMode: "both", voucherPasswordMode: "same_as_user" }),
    "en"
  );
  assert.match(bothHtml, /id="tabVoucher"/);
  assert.match(bothHtml, /id="tabUser"/);
  assert.match(bothHtml, /form\.password\.value = vCode;/);
});

test("Standalone External RADIUS backend omits local User Manager, sets src-address & CoA, and validates properly", () => {
  const extCfg = makeBaseConfig({
    rosVersion: "v7",
    authMode: "userman_radius",
    radiusBackend: "external_radius",
    radiusServerIp: "10.50.0.10",
    radiusPort: 1812,
    radiusAcctPort: 1813,
    radiusSrcAddress: "10.50.0.2",
    radiusSecret: "extSecret!1",
    coaPort: 3799,
  });

  const extScript = generateMikrotikScript(extCfg, sampleHotspotProfiles);
  assert.match(extScript, /add service=hotspot address=10\.50\.0\.10 secret="extSecret!1" authentication-port=1812 accounting-port=1813 timeout=3000ms src-address=10\.50\.0\.2 comment="External RADIUS Server for Hotspot"/);
  assert.match(extScript, /\/radius incoming\nset accept=yes port=3799/);
  assert.match(extScript, /protocol=udp src-address=10\.50\.0\.10 dst-port=3799 comment="Allow Incoming RADIUS CoA" place-before=\$inDrop/);
  assert.doesNotMatch(extScript, /\/user-manager/);
  assert.doesNotMatch(extScript, /\/tool user-manager/);

  assert.equal(validateConfiguration(extCfg, sampleHotspotProfiles).length, 0);

  const badExtIssues = validateConfiguration(
    { ...extCfg, radiusServerIp: "127.0.0.1", radiusSrcAddress: "bad-ip" },
    sampleHotspotProfiles
  );
  const badIds = new Set(badExtIssues.map((i) => i.id));
  assert.ok(badIds.has("ext_radius_loopback_ip"));
  assert.ok(badIds.has("um_radius_src_ip_invalid"));

  const wwwDisabledIssues = validateConfiguration(
    makeBaseConfig({ authMode: "userman_radius", radiusBackend: "userman_local", serviceWww: false }),
    sampleHotspotProfiles
  );
  assert.ok(wwwDisabledIssues.some((i) => i.id === "um_www_service_disabled"));

  const extReadme = buildDeploymentReadme(extCfg, "hotspot.rsc", "en");
  assert.doesNotMatch(extReadme, /user-manager \(extra package\)/);
  assert.match(extReadme, /Standalone External RADIUS Server at 10\.50\.0\.10:1812/);
});

test("TCP MSS clamping, forced DNS redirect, Universal Client address-pool=none, and configurable DHCP lease time", () => {
  const defaultScript = generateMikrotikScript(makeBaseConfig(), sampleHotspotProfiles);
  assert.match(
    defaultScript,
    /\/ip firewall mangle remove \[ find where !dynamic and comment="Clamp TCP MSS to PMTU" \]/
  );
  assert.match(
    defaultScript,
    /add action=change-mss chain=forward new-mss=clamp-to-pmtu passthrough=yes protocol=tcp tcp-flags=syn comment="Clamp TCP MSS to PMTU"/
  );
  assert.match(
    defaultScript,
    /add action=redirect chain=dstnat dst-port=53 in-interface=ether2 protocol=udp to-ports=53 comment="Force Hotspot DNS Redirect UDP"/
  );
  assert.match(
    defaultScript,
    /add action=redirect chain=dstnat dst-port=53 in-interface=ether2 protocol=tcp to-ports=53 comment="Force Hotspot DNS Redirect TCP"/
  );
  assert.match(
    defaultScript,
    /\/ip hotspot\nadd address-pool=none addresses-per-mac=2 disabled=no interface=ether2 name=hotspot1 profile=hsprof1/
  );
  assert.match(
    defaultScript,
    /add address-pool=hs-pool-ether2 disabled=no interface=ether2 name=dhcp-hs lease-time=1h/
  );

  // Hotspot VLAN + Non-Hotspot VLAN + PCC Multi-WAN + Universal Client enabled + custom lease time 6h
  const customScript = generateMikrotikScript(
    makeBaseConfig({
      rosVersion: "v7",
      dhcpLeaseTime: "6h",
      enableUniversalClient: true,
      forceDnsRedirect: true,
      clampTcpMss: true,
      enableVlans: true,
      vlans: [
        {
          id: "v10",
          name: "vlan10_staff",
          vlanId: 10,
          parentInterface: "ether2",
          gatewayIp: "172.16.10.1",
          subnetMask: 24,
          dhcpEnabled: true,
          poolStart: "172.16.10.10",
          poolEnd: "172.16.10.254",
          enableHotspotOnVlan: false,
        },
        {
          id: "v20",
          name: "vlan20_guests",
          vlanId: 20,
          parentInterface: "ether2",
          gatewayIp: "172.16.20.1",
          subnetMask: 24,
          dhcpEnabled: true,
          poolStart: "172.16.20.10",
          poolEnd: "172.16.20.254",
          enableHotspotOnVlan: true,
        },
      ],
      loadBalancingMethod: "pcc",
    }),
    sampleHotspotProfiles
  );

  assert.match(customScript, /add address-pool=pool-vlan10_staff disabled=no interface="vlan10_staff" name="dhcp-vlan10_staff" lease-time=6h/);
  assert.match(customScript, /add address-pool=pool-vlan20_guests disabled=no interface="vlan20_guests" name="dhcp-vlan20_guests" lease-time=6h/);
  assert.match(customScript, /add address-pool=hs-pool-ether2 disabled=no interface=ether2 name=dhcp-hs lease-time=6h/);
  assert.match(customScript, /add address-pool=hs-pool-ether2 addresses-per-mac=2 disabled=no interface=ether2 name=hotspot1/);
  assert.match(customScript, /add address-pool="pool-vlan20_guests" addresses-per-mac=2 disabled=no interface="vlan20_guests" name="hs-vlan20_guests"/);
  assert.match(customScript, /add interface="vlan20_guests" list=HOTSPOT_AUTH_IFACES/);
  assert.doesNotMatch(customScript, /add interface="vlan10_staff" list=HOTSPOT_AUTH_IFACES/);
  assert.match(customScript, /add action=redirect chain=dstnat dst-port=53 in-interface-list=HOTSPOT_AUTH_IFACES protocol=udp to-ports=53 comment="Force Hotspot DNS Redirect UDP"/);
  assert.match(customScript, /add action=accept chain=prerouting dst-port=53 in-interface-list=HOTSPOT_AUTH_IFACES protocol=udp comment="Bypass Load Balancing for Redirected DNS UDP"/);

  // Toggling both rules off omits adds while preserving idempotent !dynamic cleanup
  const disabledRulesScript = generateMikrotikScript(
    makeBaseConfig({ clampTcpMss: false, forceDnsRedirect: false }),
    sampleHotspotProfiles
  );
  assert.match(
    disabledRulesScript,
    /\/ip firewall mangle remove \[ find where !dynamic and comment="Clamp TCP MSS to PMTU" \]/
  );
  assert.doesNotMatch(disabledRulesScript, /action=change-mss/);
  assert.doesNotMatch(disabledRulesScript, /action=redirect chain=dstnat dst-port=53/);

  // Validation and hydration checks
  assert.equal(validateConfiguration(makeBaseConfig({ dhcpLeaseTime: "30m" }), sampleHotspotProfiles).length, 0);
  assert.equal(validateConfiguration(makeBaseConfig({ dhcpLeaseTime: "00:45:00" }), sampleHotspotProfiles).length, 0);
  const badLeaseIssues = validateConfiguration(
    makeBaseConfig({ dhcpLeaseTime: "invalid" }),
    sampleHotspotProfiles
  );
  assert.ok(badLeaseIssues.some((i) => i.id === "net_dhcp_lease_invalid"));
  const zeroLeaseIssues = validateConfiguration(
    makeBaseConfig({ dhcpLeaseTime: "0s" }),
    sampleHotspotProfiles
  );
  assert.ok(zeroLeaseIssues.some((i) => i.id === "net_dhcp_lease_invalid"));

  const defaultHydrated = hydrateConfig({});
  assert.equal(defaultHydrated.dhcpLeaseTime, "1h");
  assert.equal(defaultHydrated.enableUniversalClient, false);
  assert.equal(defaultHydrated.forceDnsRedirect, true);
  assert.equal(defaultHydrated.clampTcpMss, true);

  const customHydrated = hydrateConfig({
    dhcpLeaseTime: "12h",
    enableUniversalClient: true,
    forceDnsRedirect: false,
    clampTcpMss: false,
  });
  assert.equal(customHydrated.dhcpLeaseTime, "12h");
  assert.equal(customHydrated.enableUniversalClient, true);
  assert.equal(customHydrated.forceDnsRedirect, false);
  assert.equal(customHydrated.clampTcpMss, false);
});
