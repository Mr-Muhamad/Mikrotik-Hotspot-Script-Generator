/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import { useState } from "react";
import type { HotspotConfig } from "../types";
import type { ValidationIssue } from "../utils/validation";
import { calculateNetworkAddress, calculateSubnetPool } from "../utils/scriptGenerator";
import { Network, Globe, Server, Hash, KeyRound, Clock, HardDrive, Layers, Eye, EyeOff } from "lucide-react";

interface Props {
  config: HotspotConfig;
  onChange: (updates: Partial<HotspotConfig>) => void;
  lang: "ar" | "en";
  issues?: ValidationIssue[];
  onNavigateTab?: (tab: number) => void;
}

export default function NetworkConfigTab({ config, onChange, lang, issues = [], onNavigateTab }: Props) {
  const isAr = lang === "ar";
  const [showPppoePass, setShowPppoePass] = useState(false);
  const isMultiWanActive = config.loadBalancingMethod !== "none";

  const getFieldError = (fieldName: string) =>
    issues.find((i) => i.tab === 0 && i.field === fieldName);

  const gwError = getFieldError("gatewayIp");
  const poolStartError = getFieldError("poolStart");
  const poolEndError = getFieldError("poolEnd");
  const dhcpLeaseError = getFieldError("dhcpLeaseTime");
  const singleWanIpError = getFieldError("singleWanIp");
  const singleWanGwError = getFieldError("singleWanGateway");

  const leasePresets = [
    { value: "30m", ar: "30m (كافيهات مزدحمة)", en: "30m (High-turnover Cafes)" },
    { value: "1h", ar: "1h (افتراضي متوازن)", en: "1h (Balanced Default)" },
    { value: "6h", ar: "6h (متوسط)", en: "6h (Medium Stay)" },
    { value: "12h", ar: "12h (مكاتب وشركات)", en: "12h (Offices / Workspaces)" },
    { value: "1d", ar: "1d (شبكات سكنية)", en: "1d (Residential / Home)" },
    { value: "3d", ar: "3d (إقامة طويلة)", en: "3d (Long-stay Guests)" },
  ];
  const currentLease = (config.dhcpLeaseTime || "1h").trim() || "1h";
  const hasPresetLease = leasePresets.some((p) => p.value === currentLease);

  // Automatically update DHCP IP pool ranges when gateway IP or subnet mask changes
  const handleGatewayChange = (ip: string) => {
    const pool = calculateSubnetPool(ip, config.subnetMask);
    if (pool) {
      onChange({
        gatewayIp: ip,
        poolStart: pool.poolStart,
        poolEnd: pool.poolEnd,
      });
    } else {
      onChange({ gatewayIp: ip });
    }
  };

  const handleSubnetChange = (mask: number) => {
    const pool = calculateSubnetPool(config.gatewayIp, mask);
    if (pool) {
      onChange({
        subnetMask: mask,
        poolStart: pool.poolStart,
        poolEnd: pool.poolEnd,
      });
    } else {
      onChange({ subnetMask: mask });
    }
  };

  const computedNetwork = calculateNetworkAddress(config.gatewayIp, config.subnetMask, "192.168.80.0");

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <Network className="w-5 h-5 text-emerald-400" aria-hidden="true" />
          {isAr ? "إعدادات الشبكة والعناوين" : "Network & Interface Setup"}
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          {isAr
            ? "قم بتحديد منافذ الدخول والخروج وعناوين IP لشبكة الهوت سبوت."
            : "Define your WAN/LAN interfaces and Hotspot IP addressing structure."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* WAN Interface */}
        <div className={`flex flex-col gap-1.5 ${isMultiWanActive ? "opacity-70" : ""}`}>
          <label htmlFor="net-wan-iface" className="text-slate-200 text-sm font-medium flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-400" aria-hidden="true" />
            {isAr ? "منفذ دخول الإنترنت (WAN)" : "Internet Interface (WAN)"}
          </label>
          <input
            id="net-wan-iface"
            name="wanInterface"
            dir="ltr"
            type="text"
            disabled={isMultiWanActive}
            className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 font-mono disabled:cursor-not-allowed"
            value={config.wanInterface}
            onChange={(e) => onChange({ wanInterface: e.target.value })}
            placeholder="ether1"
          />
          <span className="text-xs text-slate-400">
            {isMultiWanActive
              ? (isAr
                  ? `منافذ الـ WAN مُدارة حالياً بواسطة دمج الخطوط (${config.loadBalancingMethod.toUpperCase()}) في التبويب المخصص.`
                  : `WAN interfaces are currently managed by Multi-WAN Load Balancing (${config.loadBalancingMethod.toUpperCase()}).`)
              : (isAr ? "الكارت المتصل بمودم الإنترنت" : "Interface connected to the external internet modem")}
          </span>
        </div>

        {/* LAN Interface */}
        <div className={`flex flex-col gap-1.5 ${config.useLanBridge ? "opacity-70" : ""}`}>
          <label htmlFor="net-lan-iface" className="text-slate-200 text-sm font-medium flex items-center gap-2">
            <Server className="w-4 h-4 text-slate-400" aria-hidden="true" />
            {isAr ? "منفذ خروج الهوت سبوت (LAN)" : "Hotspot Output Interface (LAN)"}
          </label>
          <input
            id="net-lan-iface"
            name="lanInterface"
            dir="ltr"
            type="text"
            disabled={config.useLanBridge}
            className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 font-mono disabled:cursor-not-allowed"
            value={config.useLanBridge ? config.lanBridgeName : config.lanInterface}
            onChange={(e) => onChange({ lanInterface: e.target.value })}
            placeholder="ether2"
          />
          <span className="text-xs text-slate-400">
            {config.useLanBridge
              ? (isAr ? "مُدار تلقائياً عبر LAN Bridge بالأسفل" : "Managed by LAN Bridge below")
              : (isAr ? "الكارت المتصل بالمشتركين أو الأكسس بوينت" : "Interface connected to local users or access points")}
          </span>
        </div>

        {/* Gateway IP */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="net-gateway-ip" className="text-slate-200 text-sm font-medium flex items-center gap-2">
            <Hash className="w-4 h-4 text-slate-400" aria-hidden="true" />
            {isAr ? "عنوان جيتواي الهوت سبوت (IP)" : "Hotspot Gateway IP"}
          </label>
          <input
            id="net-gateway-ip"
            name="gatewayIp"
            dir="ltr"
            type="text"
            aria-invalid={Boolean(gwError)}
            className={`w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 font-mono ${
              gwError ? "border-red-500" : "border-slate-700"
            }`}
            value={config.gatewayIp}
            onChange={(e) => handleGatewayChange(e.target.value)}
            placeholder="192.168.80.1"
          />
          {gwError ? (
            <span className="text-xs text-red-300">{isAr ? gwError.messageAr : gwError.messageEn}</span>
          ) : (
            <span className="text-xs text-slate-400">
              {isAr ? "أول عنوان للراوتر داخل شبكة الهوتسبوت" : "The local IP address assigned to the router"}
            </span>
          )}
        </div>

        {/* Subnet Mask */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="net-subnet-mask" className="text-slate-200 text-sm font-medium flex items-center gap-2">
            <Hash className="w-4 h-4 text-slate-400" aria-hidden="true" />
            {isAr ? "قناع الشبكة (Subnet Mask)" : "Subnet Mask Prefix"}
          </label>
          <select
            id="net-subnet-mask"
            name="subnetMask"
            dir="ltr"
            className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 font-mono"
            value={config.subnetMask}
            onChange={(e) => handleSubnetChange(parseInt(e.target.value, 10))}
          >
            <option value="24">/24 (254 IPs)</option>
            <option value="23">/23 (510 IPs)</option>
            <option value="22">/22 (1022 IPs)</option>
            <option value="16">/16 (65534 IPs)</option>
          </select>
          <span className="text-xs text-slate-400">
            {isAr ? "عنوان الشبكة المحسوب: " : "Calculated Subnet: "}
            <bdi dir="ltr" className="font-mono text-slate-300">
              {computedNetwork}/{config.subnetMask}
            </bdi>
          </span>
        </div>

        {/* DNS Server Name */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="net-dns-name" className="text-slate-200 text-sm font-medium flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-400" aria-hidden="true" />
            {isAr ? "رابط صفحة الدخول (DNS Name)" : "DNS Name"}
          </label>
          <input
            id="net-dns-name"
            name="dnsName"
            dir="ltr"
            type="text"
            className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 font-mono"
            value={config.dnsName}
            onChange={(e) => onChange({ dnsName: e.target.value })}
            placeholder="hotspot.local"
          />
          <span className="text-xs text-slate-400">
            {isAr ? "الرابط الذي يكتبه المستخدم لفتح صفحة تسجيل الدخول" : "URL written by users to trigger the login portal"}
          </span>
        </div>

        {/* Server Name */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="net-server-name" className="text-slate-200 text-sm font-medium flex items-center gap-2">
            <Server className="w-4 h-4 text-slate-400" aria-hidden="true" />
            {isAr ? "اسم سيرفر الهوت سبوت" : "Hotspot Server Name"}
          </label>
          <input
            id="net-server-name"
            name="serverName"
            dir="ltr"
            type="text"
            className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 font-mono"
            value={config.serverName}
            onChange={(e) => onChange({ serverName: e.target.value })}
            placeholder="hotspot1"
          />
          <span className="text-xs text-slate-400">
            {isAr ? "الاسم البرمجي داخل الميكروتيك" : "Internal identifier of the hotspot instance"}
          </span>
        </div>
      </div>

      {isMultiWanActive && (
        <div className="bg-emerald-950/30 border border-emerald-800/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-emerald-300 flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              {isAr
                ? `دمج الخطوط مفعّل (${config.loadBalancingMethod.toUpperCase()})`
                : `Multi-WAN Load Balancing Active (${config.loadBalancingMethod.toUpperCase()})`}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isAr
                ? `يتم إدارة منافذ وخطوط الإنترنت (${config.wanLines?.length || 0} خطوط) من تبويب دمج الخطوط بدلاً من إعدادات الخط الوحيد.`
                : `WAN interfaces and ISP links (${config.wanLines?.length || 0} lines) are configured in the Multi-WAN Load Balancing tab instead of Single WAN mode.`}
            </p>
          </div>
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab?.(2)}
              className="shrink-0 min-h-[44px] sm:min-h-[36px] px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold transition"
            >
              {isAr ? "دمج الخطوط (Multi-WAN)" : "Multi-WAN Load Balancing"}
            </button>
          )}
        </div>
      )}

      {/* System Identity, Timezone & NTP */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
        <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" aria-hidden="true" />
          {isAr ? "هوية الراوتر والوقت التلقائي (Identity & NTP)" : "Router Identity, Timezone & NTP"}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="net-identity" className="text-slate-300 text-xs">{isAr ? "اسم الراوتر (System Identity)" : "Router Identity"}</label>
            <input
              id="net-identity"
              name="routerIdentity"
              dir="ltr"
              type="text"
              className="min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-sm font-mono focus:ring-2 focus:ring-emerald-400"
              value={config.routerIdentity}
              onChange={(e) => onChange({ routerIdentity: e.target.value })}
              placeholder="MikroTik-Hotspot"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="net-timezone" className="text-slate-300 text-xs">{isAr ? "المنطقة الزمنية (Timezone)" : "Time Zone"}</label>
            <select
              id="net-timezone"
              name="timeZoneName"
              dir="ltr"
              className="min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-sm font-mono focus:ring-2 focus:ring-emerald-400"
              value={config.timeZoneName}
              onChange={(e) => onChange({ timeZoneName: e.target.value })}
            >
              <option value="Africa/Cairo">Africa/Cairo</option>
              <option value="Asia/Riyadh">Asia/Riyadh</option>
              <option value="Asia/Dubai">Asia/Dubai</option>
              <option value="Asia/Baghdad">Asia/Baghdad</option>
              <option value="Asia/Amman">Asia/Amman</option>
              <option value="Asia/Kuwait">Asia/Kuwait</option>
              <option value="Africa/Casablanca">Africa/Casablanca</option>
              <option value="Europe/Istanbul">Europe/Istanbul</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
        </div>

        <label htmlFor="net-enable-ntp" className="min-h-[44px] flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
          <input
            id="net-enable-ntp"
            name="enableNtp"
            type="checkbox"
            className="w-4 h-4 flex-shrink-0 accent-emerald-500"
            checked={config.enableNtp}
            onChange={(e) => onChange({ enableNtp: e.target.checked })}
          />
          <span>
            {isAr
              ? "مزامنة الوقت تلقائياً (NTP Client): ضروري لصلاحية كروت اليوزر مانجر وجدولة الصيانة"
              : "Enable Automatic Time Sync (NTP Client): essential for voucher expiry & schedulers"}
          </span>
        </label>

        {config.enableNtp && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="net-ntp-1" className="text-slate-300 text-xs">{isAr ? "خادم NTP الرئيسي" : "Primary NTP Server"}</label>
              <input
                id="net-ntp-1"
                name="ntpServerPrimary"
                dir="ltr"
                type="text"
                className="min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400"
                value={config.ntpServers?.[0] || ""}
                onChange={(e) => {
                  const next = [...(config.ntpServers || ["pool.ntp.org", "time.google.com"])];
                  next[0] = e.target.value;
                  onChange({ ntpServers: next });
                }}
                placeholder="pool.ntp.org"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="net-ntp-2" className="text-slate-300 text-xs">{isAr ? "خادم NTP الاحتياطي" : "Secondary NTP Server"}</label>
              <input
                id="net-ntp-2"
                name="ntpServerSecondary"
                dir="ltr"
                type="text"
                className="min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400"
                value={config.ntpServers?.[1] || ""}
                onChange={(e) => {
                  const next = [...(config.ntpServers || ["pool.ntp.org", "time.google.com"])];
                  next[1] = e.target.value;
                  onChange({ ntpServers: next });
                }}
                placeholder="time.google.com"
              />
            </div>
          </div>
        )}
      </div>

      {/* Single WAN Connection (only shown when Load Balancing is disabled) */}
      {config.loadBalancingMethod === "none" && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label htmlFor="net-single-wan-type" className="text-sm font-medium text-slate-200 flex items-center gap-2">
              <Globe className="w-4 h-4 text-slate-400" aria-hidden="true" />
              {isAr ? "نوع اتصال خط الإنترنت الرئيسي (Single WAN)" : "Single WAN Connection Mode"}
            </label>
            <select
              id="net-single-wan-type"
              name="singleWanType"
              aria-label={isAr ? "نوع اتصال خط الإنترنت الرئيسي" : "Single WAN Connection Type"}
              className="min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400"
              value={config.singleWanType}
              onChange={(e) => onChange({ singleWanType: e.target.value as "dhcp" | "static" | "pppoe" })}
            >
              <option value="dhcp">DHCP Client ({isAr ? "تلقائي من المودم" : "Auto from Modem"})</option>
              <option value="static">Static IP ({isAr ? "عنوان ثابت" : "Fixed IP/Gateway"})</option>
              <option value="pppoe">PPPoE Client ({isAr ? "اتصال برودباند" : "PPPoE Dialer"})</option>
            </select>
          </div>

          {config.singleWanType === "static" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="net-single-wan-ip" className="text-slate-300 text-xs">{isAr ? "عنوان IP للخط مع القناع (CIDR)" : "WAN IP/Mask (CIDR)"}</label>
                <input
                  id="net-single-wan-ip"
                  name="singleWanIp"
                  dir="ltr"
                  type="text"
                  aria-invalid={Boolean(singleWanIpError)}
                  className={`min-h-[44px] sm:min-h-[38px] bg-slate-800 border text-slate-100 rounded-lg px-3 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400 ${
                    singleWanIpError ? "border-red-500" : "border-slate-700"
                  }`}
                  value={config.singleWanIp}
                  onChange={(e) => onChange({ singleWanIp: e.target.value })}
                  placeholder="192.168.1.2/24"
                />
                {singleWanIpError && (
                  <span className="text-xs text-red-300">{isAr ? singleWanIpError.messageAr : singleWanIpError.messageEn}</span>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="net-single-wan-gw" className="text-slate-300 text-xs">{isAr ? "بوابة الإنترنت (WAN Gateway)" : "WAN Gateway IP"}</label>
                <input
                  id="net-single-wan-gw"
                  name="singleWanGateway"
                  dir="ltr"
                  type="text"
                  aria-invalid={Boolean(singleWanGwError)}
                  className={`min-h-[44px] sm:min-h-[38px] bg-slate-800 border text-slate-100 rounded-lg px-3 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400 ${
                    singleWanGwError ? "border-red-500" : "border-slate-700"
                  }`}
                  value={config.singleWanGateway}
                  onChange={(e) => onChange({ singleWanGateway: e.target.value })}
                  placeholder="192.168.1.1"
                />
                {singleWanGwError && (
                  <span className="text-xs text-red-300">{isAr ? singleWanGwError.messageAr : singleWanGwError.messageEn}</span>
                )}
              </div>
            </div>
          )}

          {config.singleWanType === "pppoe" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="net-single-pppoe-user" className="text-slate-300 text-xs">{isAr ? "اسم مستخدم PPPoE" : "PPPoE Username"}</label>
                <input
                  id="net-single-pppoe-user"
                  name="singleWanPppoeUser"
                  dir="ltr"
                  type="text"
                  className="min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400"
                  value={config.singleWanPppoeUser}
                  onChange={(e) => onChange({ singleWanPppoeUser: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="net-single-pppoe-pass" className="text-slate-300 text-xs">{isAr ? "كلمة سر PPPoE" : "PPPoE Password"}</label>
                <div className="relative flex items-center">
                  <input
                    id="net-single-pppoe-pass"
                    name="singleWanPppoePass"
                    dir="ltr"
                    type={showPppoePass ? "text" : "password"}
                    className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 pe-11 sm:pe-10 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400"
                    value={config.singleWanPppoePass}
                    onChange={(e) => onChange({ singleWanPppoePass: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPppoePass((prev) => !prev)}
                    aria-label={showPppoePass ? (isAr ? "إخفاء كلمة السر" : "Hide password") : (isAr ? "إظهار كلمة السر" : "Show password")}
                    className="absolute end-1 min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] inline-flex items-center justify-center text-slate-400 hover:text-slate-100 rounded"
                  >
                    {showPppoePass ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* LAN Bridge, Storage & Hotspot Limits */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            {isAr ? "دمج منافذ الخروج (LAN Bridge) وتخزين الهوتسبوت" : "LAN Bridge & Hotspot Storage"}
          </h3>
          <label htmlFor="net-use-lan-bridge" className="min-h-[44px] flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              id="net-use-lan-bridge"
              name="useLanBridge"
              type="checkbox"
              className="w-4 h-4 flex-shrink-0 accent-emerald-500"
              checked={config.useLanBridge}
              onChange={(e) => onChange({ useLanBridge: e.target.checked })}
            />
            <span>{isAr ? "تفعيل LAN Bridge" : "Enable LAN Bridge"}</span>
          </label>
        </div>

        {config.useLanBridge && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end bg-slate-950/50 p-3 rounded-lg border border-slate-800">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="net-bridge-name" className="text-slate-300 text-xs">{isAr ? "اسم الـ Bridge" : "Bridge Interface Name"}</label>
              <input
                id="net-bridge-name"
                name="lanBridgeName"
                dir="ltr"
                type="text"
                className="min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400"
                value={config.lanBridgeName}
                onChange={(e) => onChange({ lanBridgeName: e.target.value })}
                placeholder="bridge-lan"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="net-bridge-ports" className="text-slate-300 text-xs">{isAr ? "المنافذ المضمومة (مفصولة بفاصلة)" : "Member Ports (comma-separated)"}</label>
              <input
                id="net-bridge-ports"
                name="lanBridgePorts"
                dir="ltr"
                type="text"
                className="min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400"
                value={config.lanBridgePorts}
                onChange={(e) => onChange({ lanBridgePorts: e.target.value })}
                placeholder="ether2,ether3,ether4"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="net-storage-mode" className="text-slate-300 text-xs flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              {isAr ? "مسار ملفات صفحة الدخول (HTML Storage)" : "Hotspot HTML Storage Path"}
            </label>
            <select
              id="net-storage-mode"
              name="storageMode"
              dir="ltr"
              className="min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400"
              value={config.storageMode}
              onChange={(e) => {
                const mode = e.target.value as "standard" | "flash";
                onChange({
                  storageMode: mode,
                  htmlDirectory: mode === "flash" ? "flash/hotspot" : "hotspot",
                });
              }}
            >
              <option value="standard">hotspot ({isAr ? "راوترات عادية / CHR / x86" : "Standard RouterOS"})</option>
              <option value="flash">flash/hotspot ({isAr ? "أجهزة Flash مثل hEX / hAP / RB5009" : "Flash Routers e.g. hEX / RB5009"})</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="net-addr-per-mac" className="text-slate-300 text-xs">
              {isAr ? "أقصى عناوين IP لكل MAC (Addresses Per MAC)" : "Addresses Per MAC"}
            </label>
            <input
              id="net-addr-per-mac"
              name="addressesPerMac"
              dir="ltr"
              type="number"
              min="1"
              max="20"
              className="min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400"
              value={config.addressesPerMac}
              onChange={(e) => onChange({ addressesPerMac: Math.max(1, parseInt(e.target.value, 10) || 2) })}
            />
          </div>
        </div>
      </div>

      {/* Login Authentication Methods */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-emerald-400" aria-hidden="true" />
          {isAr ? "طرق تسجيل الدخول المسموحة (Login By)" : "Login Authentication Methods"}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
          <label htmlFor="net-login-chap" className="min-h-[44px] flex items-center gap-2 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60 cursor-pointer hover:bg-slate-800">
            <input
              id="net-login-chap"
              name="loginHttpChap"
              type="checkbox"
              className="w-4 h-4 flex-shrink-0 accent-emerald-500"
              checked={config.loginHttpChap}
              onChange={(e) => onChange({ loginHttpChap: e.target.checked })}
            />
            <span>HTTP CHAP ({isAr ? "مشفر" : "Encrypted"})</span>
          </label>

          <label htmlFor="net-login-pap" className="min-h-[44px] flex items-center gap-2 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60 cursor-pointer hover:bg-slate-800">
            <input
              id="net-login-pap"
              name="loginHttpPap"
              type="checkbox"
              className="w-4 h-4 flex-shrink-0 accent-emerald-500"
              checked={config.loginHttpPap}
              onChange={(e) => onChange({ loginHttpPap: e.target.checked })}
            />
            <span>HTTP PAP ({isAr ? "عادي" : "Plain"})</span>
          </label>

          <label htmlFor="net-login-cookie" className="min-h-[44px] flex items-center gap-2 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60 cursor-pointer hover:bg-slate-800">
            <input
              id="net-login-cookie"
              name="enableCookie"
              type="checkbox"
              className="w-4 h-4 flex-shrink-0 accent-emerald-500"
              checked={config.enableCookie}
              onChange={(e) => onChange({ enableCookie: e.target.checked })}
            />
            <span>HTTP Cookie</span>
          </label>

          <label htmlFor="net-login-mac-cookie" className="min-h-[44px] flex items-center gap-2 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60 cursor-pointer hover:bg-slate-800">
            <input
              id="net-login-mac-cookie"
              name="loginMacCookie"
              type="checkbox"
              className="w-4 h-4 flex-shrink-0 accent-emerald-500"
              checked={config.loginMacCookie}
              onChange={(e) => onChange({ loginMacCookie: e.target.checked })}
            />
            <span>MAC Cookie</span>
          </label>

          <label htmlFor="net-login-mac" className="min-h-[44px] flex items-center gap-2 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60 cursor-pointer hover:bg-slate-800">
            <input
              id="net-login-mac"
              name="loginMacAuth"
              type="checkbox"
              className="w-4 h-4 flex-shrink-0 accent-emerald-500"
              checked={config.loginMacAuth}
              onChange={(e) => onChange({ loginMacAuth: e.target.checked })}
            />
            <span>MAC Auth</span>
          </label>
        </div>

        {config.enableCookie && (
          <div className="pt-3 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center gap-2.5">
            <label htmlFor="net-cookie-lifetime" className="text-slate-200 text-xs font-medium shrink-0">
              {isAr ? "صلاحية كوكيز تسجيل الدخول (Cookie Lifetime)" : "Cookie Lifetime / Validity"}
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                id="net-cookie-lifetime"
                name="cookieLifetime"
                dir="ltr"
                type="text"
                className="min-h-[44px] sm:min-h-[36px] w-36 bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400"
                value={config.cookieLifetime}
                onChange={(e) => onChange({ cookieLifetime: e.target.value })}
                placeholder="3d"
              />
              <span className="text-xs text-slate-400">
                {isAr ? "(مثال: 3 أيام 3d أو يوم واحد 1d)" : "(e.g. 3d or 1d)"}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
        <h3 className="text-sm font-medium text-slate-200">
          {isAr ? "توزيع عناوين IP (DHCP IP Pool)" : "IP Pool & Range Allocation"}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="net-pool-start" className="text-slate-300 text-xs">
              {isAr ? "بداية مجال توزيع العناوين" : "IP Pool Start"}
            </label>
            <input
              id="net-pool-start"
              name="poolStart"
              dir="ltr"
              type="text"
              aria-invalid={Boolean(poolStartError)}
              className={`min-h-[44px] sm:min-h-[38px] bg-slate-800 border text-slate-100 rounded-lg px-3 py-1.5 text-sm font-mono focus:ring-2 focus:ring-emerald-400 ${
                poolStartError ? "border-red-500" : "border-slate-700"
              }`}
              value={config.poolStart}
              onChange={(e) => onChange({ poolStart: e.target.value })}
            />
            {poolStartError && (
              <span className="text-xs text-red-300">{isAr ? poolStartError.messageAr : poolStartError.messageEn}</span>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="net-pool-end" className="text-slate-300 text-xs">
              {isAr ? "نهاية مجال توزيع العناوين" : "IP Pool End"}
            </label>
            <input
              id="net-pool-end"
              name="poolEnd"
              dir="ltr"
              type="text"
              aria-invalid={Boolean(poolEndError)}
              className={`min-h-[44px] sm:min-h-[38px] bg-slate-800 border text-slate-100 rounded-lg px-3 py-1.5 text-sm font-mono focus:ring-2 focus:ring-emerald-400 ${
                poolEndError ? "border-red-500" : "border-slate-700"
              }`}
              value={config.poolEnd}
              onChange={(e) => onChange({ poolEnd: e.target.value })}
            />
            {poolEndError && (
              <span className="text-xs text-red-300">{isAr ? poolEndError.messageAr : poolEndError.messageEn}</span>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="net-dhcp-lease" className="text-slate-300 text-xs">
              {isAr ? "مدة حجز الـ IP (DHCP Lease Time)" : "DHCP Lease Time"}
            </label>
            <select
              id="net-dhcp-lease"
              name="dhcpLeaseTime"
              dir="ltr"
              aria-invalid={Boolean(dhcpLeaseError)}
              className={`min-h-[44px] sm:min-h-[38px] bg-slate-800 border text-slate-100 rounded-lg px-3 py-1.5 text-sm font-mono focus:ring-2 focus:ring-emerald-400 ${
                dhcpLeaseError ? "border-red-500" : "border-slate-700"
              }`}
              value={currentLease}
              onChange={(e) => onChange({ dhcpLeaseTime: e.target.value })}
            >
              {!hasPresetLease && (
                <option value={currentLease}>{currentLease}</option>
              )}
              {leasePresets.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {isAr ? opt.ar : opt.en}
                </option>
              ))}
            </select>
            {dhcpLeaseError ? (
              <span className="text-xs text-red-300">{isAr ? dhcpLeaseError.messageAr : dhcpLeaseError.messageEn}</span>
            ) : (
              <span className="text-[11px] text-slate-400">
                {isAr
                  ? "المدة المناسبة تمنع امتلاء الـ Pool في الموبايلات ذات MAC العشوائي."
                  : "Shorter leases prevent IP pool exhaustion from randomized phone MACs."}
              </span>
            )}
          </div>
        </div>

        <label
          htmlFor="net-universal-client"
          className="min-h-[44px] flex items-start gap-2.5 pt-2 border-t border-slate-800/60 text-xs text-slate-300 cursor-pointer"
        >
          <input
            id="net-universal-client"
            name="enableUniversalClient"
            type="checkbox"
            className="w-4 h-4 flex-shrink-0 mt-0.5 accent-emerald-500"
            checked={Boolean(config.enableUniversalClient)}
            onChange={(e) => onChange({ enableUniversalClient: e.target.checked })}
          />
          <span className="leading-relaxed">
            <strong className="text-slate-100 block">
              {isAr
                ? "تفعيل Universal Client ARP-NAT على الهوتسبوت (افتراضياً معطّل: address-pool=none)"
                : "Enable Hotspot Universal Client ARP-NAT (Default Off: address-pool=none)"}
            </strong>
            <span className="text-slate-400 block mt-0.5">
              {isAr
                ? "إبقاؤه معطلاً يمنع مشاكل التكرار والـ IP الوهمي (Address != To-Address) وتعارض الأكسس بوينت؛ فعّله فقط إذا أردت قبول أجهزة بـ IP يدوي مختلف (مثل الفنادق)."
                : "Keeping this off prevents ghost IP translation, AP IP hijacking, and double pool consumption. Enable only for venues expecting foreign static client IPs."}
            </span>
          </span>
        </label>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
        <h3 className="text-sm font-medium text-slate-200">
          {isAr ? "خوادم الـ DNS الموصى بها" : "DNS Servers Configuration"}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="net-dns-1" className="text-slate-300 text-xs">{isAr ? "خادم DNS الرئيسي" : "Primary DNS"}</label>
            <input
              id="net-dns-1"
              name="dnsPrimary"
              dir="ltr"
              type="text"
              className="min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-sm font-mono focus:ring-2 focus:ring-emerald-400"
              value={config.dnsServers[0] || ""}
              onChange={(e) => {
                const updated = [...config.dnsServers];
                updated[0] = e.target.value;
                onChange({ dnsServers: updated });
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="net-dns-2" className="text-slate-300 text-xs">{isAr ? "خادم DNS الاحتياطي" : "Secondary DNS"}</label>
            <input
              id="net-dns-2"
              name="dnsSecondary"
              dir="ltr"
              type="text"
              className="min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-sm font-mono focus:ring-2 focus:ring-emerald-400"
              value={config.dnsServers[1] || ""}
              onChange={(e) => {
                const updated = [...config.dnsServers];
                updated[1] = e.target.value;
                onChange({ dnsServers: updated });
              }}
            />
          </div>
        </div>

        <label
          htmlFor="net-force-dns-redirect"
          className="min-h-[44px] flex items-start gap-2.5 pt-2 border-t border-slate-800/60 text-xs text-slate-300 cursor-pointer"
        >
          <input
            id="net-force-dns-redirect"
            name="forceDnsRedirect"
            type="checkbox"
            className="w-4 h-4 flex-shrink-0 mt-0.5 accent-emerald-500"
            checked={config.forceDnsRedirect !== false}
            onChange={(e) => onChange({ forceDnsRedirect: e.target.checked })}
          />
          <span className="leading-relaxed">
            <strong className="text-slate-100 block">
              {isAr
                ? "إجبار توجيه طلبات DNS إلى الراوتر (Force DNS Redirect UDP/TCP 53)"
                : "Force Client DNS Redirect to Router (UDP/TCP 53 dst-nat)"}
            </strong>
            <span className="text-slate-400 block mt-0.5">
              {isAr
                ? "يضمن فتح صفحة الدخول والحالة والخروج (مثل hotspot.local/status) حتى إذا وضع العميل DNS يدوياً على هاتفه مثل 8.8.8.8."
                : "Ensures portal hostnames (hotspot.local/status) and router DNS caching work even if phones override DNS manually."}
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}
