/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import { useState } from "react";
import type { HotspotConfig, HotspotUserProfile, IpBindingEntry, WalledGardenEntry } from "../types";
import { generateCryptoVoucherCodes } from "../constants/defaults";
import { generateVouchersCsv, generatePrintableVouchersHtml } from "../utils/voucherExport";
import { Lock, Cookie, AlertTriangle, Play, Globe, Clock, Ticket, Plus, Trash2, Shield, Gauge, Network, RefreshCw, FileSpreadsheet, Printer } from "lucide-react";
import ToggleSwitch from "./ToggleSwitch";

interface Props {
  config: HotspotConfig;
  profiles: HotspotUserProfile[];
  onChange: (updates: Partial<HotspotConfig>) => void;
  lang: "ar" | "en";
}

export default function AdvancedFeaturesTab({ config, profiles, onChange, lang }: Props) {
  const isAr = lang === "ar";
  const isV7 = config.rosVersion === "v7";
  const effectiveAuthMode = config.authMode || (config.enableUserManager ? "userman_radius" : "hotspot_only");
  const effectiveVoucherTarget =
    effectiveAuthMode === "hotspot_only"
      ? "hotspot"
      : effectiveAuthMode === "userman_radius"
        ? "userman"
        : (config.voucherTarget === "hotspot" ? "hotspot" : "userman");
  const umProfiles = config.umProfiles || [];
  const umGroups = config.umGroups || [];
  const [newDomain, setNewDomain] = useState("");
  const [newDomainComment, setNewDomainComment] = useState("");
  const [newEntryType, setNewEntryType] = useState<"domain" | "ip">("domain");
  const [newIncludeHttpsIp, setNewIncludeHttpsIp] = useState(false);

  const [newBindingMac, setNewBindingMac] = useState("");
  const [newBindingIp, setNewBindingIp] = useState("");
  const [newBindingType, setNewBindingType] = useState<"bypassed" | "blocked" | "regular">("bypassed");
  const [newBindingComment, setNewBindingComment] = useState("");

  const handleAddWalledGarden = () => {
    if (!newDomain.trim()) return;
    const entry: WalledGardenEntry = {
      id: `wg_${Date.now()}`,
      domain: newDomain.trim(),
      comment: newDomainComment.trim() || "Walled Garden Exception",
      entryType: newEntryType,
      includeHttpsIp: newEntryType === "domain" ? newIncludeHttpsIp : false
    };
    onChange({
      walledGardenDomains: [...(config.walledGardenDomains || []), entry]
    });
    setNewDomain("");
    setNewDomainComment("");
    setNewIncludeHttpsIp(false);
  };

  const handleRemoveWalledGarden = (id: string) => {
    onChange({
      walledGardenDomains: (config.walledGardenDomains || []).filter(e => e.id !== id)
    });
  };

  const handleAddIpBinding = () => {
    if (!newBindingMac.trim() && !newBindingIp.trim()) return;
    const entry: IpBindingEntry = {
      id: `ib_${Date.now()}`,
      macAddress: newBindingMac.trim() || undefined,
      ipAddress: newBindingIp.trim() || undefined,
      type: newBindingType,
      comment: newBindingComment.trim() || "Device Binding"
    };
    onChange({
      ipBindings: [...(config.ipBindings || []), entry]
    });
    setNewBindingMac("");
    setNewBindingIp("");
    setNewBindingComment("");
  };

  const handleRemoveIpBinding = (id: string) => {
    onChange({
      ipBindings: (config.ipBindings || []).filter(b => b.id !== id)
    });
  };

  const triggerBlobDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportVouchersCsv = () => {
    const csv = generateVouchersCsv(config, profiles);
    triggerBlobDownload(
      csv,
      `vouchers_${config.voucherSelectedProfile || "batch"}.csv`,
      "text/csv;charset=utf-8"
    );
  };

  const handlePrintVouchers = () => {
    const html = generatePrintableVouchersHtml(config, profiles, lang);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank", "noopener");
    if (win) {
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } else {
      const link = document.createElement("a");
      link.href = url;
      link.download = "vouchers_print.html";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <Lock className="w-5 h-5 text-emerald-400" aria-hidden="true" />
          {isAr ? "تخصيص الحماية، طوابير الانتظار وسكربتات الصيانة" : "Advanced Security, Queuing & Maintenance"}
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          {isAr
            ? "تأمين الراوتر بالجدار الناري، تحسين طوابير الانتظار (CAKE / FQ-CoDel)، والسكربتات المجدولة."
            : "Firewall security hardening, advanced queuing (CAKE / FQ-CoDel), and automated maintenance."}
        </p>
      </div>

      <div className="space-y-4">
        {/* RouterOS v7 Advanced Queuing */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-slate-100 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                {isAr ? "خوارزمية طوابير التحكم بالسرعة (Queue Type)" : "Queue Engine Type"}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isAr
                  ? "اختر نوع طابور الانتظار لضبط الباندويث والقضاء على البطء عند الضغط (Bufferbloat)."
                  : "Select the queuing discipline used for managing client bufferbloat and latency."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <label htmlFor="adv-queue-simple" className={`min-h-[44px] cursor-pointer border rounded-lg p-3 transition text-xs flex flex-col gap-1 ${config.queueType === "simple" ? "bg-emerald-950/60 border-emerald-500 text-slate-100" : "bg-slate-800/40 border-slate-700 text-slate-300"}`}>
              <div className="flex items-center gap-2">
                <input
                  id="adv-queue-simple"
                  type="radio"
                  name="queueType"
                  className="w-4 h-4 flex-shrink-0 accent-emerald-500"
                  checked={config.queueType === "simple" || !config.queueType}
                  onChange={() => onChange({ queueType: "simple" })}
                />
                <span className="font-bold text-slate-100">Standard Simple Queue</span>
              </div>
              <span className="text-[11px] text-slate-400">{isAr ? "الأنسب لراوترات v6 و v7 العادية." : "Default standard Mikrotik queue."}</span>
            </label>

            <label htmlFor="adv-queue-cake" className={`min-h-[44px] cursor-pointer border rounded-lg p-3 transition text-xs flex flex-col gap-1 ${config.queueType === "cake" ? "bg-emerald-950/60 border-emerald-500 text-slate-100" : "bg-slate-800/40 border-slate-700 text-slate-300"}`}>
              <div className="flex items-center gap-2">
                <input
                  id="adv-queue-cake"
                  type="radio"
                  name="queueType"
                  className="w-4 h-4 flex-shrink-0 accent-emerald-500"
                  checked={config.queueType === "cake"}
                  onChange={() => onChange({ queueType: "cake" })}
                />
                <span className="font-bold text-emerald-400">CAKE Queue (v7 Only)</span>
              </div>
              <span className="text-[11px] text-slate-400">{isAr ? "أقوى تقنية لمكافحة الـ Bufferbloat في الألعاب والشات." : "Eliminates latency & gaming ping spikes."}</span>
            </label>

            <label htmlFor="adv-queue-fq-codel" className={`min-h-[44px] cursor-pointer border rounded-lg p-3 transition text-xs flex flex-col gap-1 ${config.queueType === "fq_codel" ? "bg-emerald-950/60 border-emerald-500 text-slate-100" : "bg-slate-800/40 border-slate-700 text-slate-300"}`}>
              <div className="flex items-center gap-2">
                <input
                  id="adv-queue-fq-codel"
                  type="radio"
                  name="queueType"
                  className="w-4 h-4 flex-shrink-0 accent-emerald-500"
                  checked={config.queueType === "fq_codel"}
                  onChange={() => onChange({ queueType: "fq_codel" })}
                />
                <span className="font-bold text-sky-400">FQ-CoDel (v7 Only)</span>
              </div>
              <span className="text-[11px] text-slate-400">{isAr ? "خوارزمية توزيع العزم العادلة بين المستخدمين." : "Fair queueing active queue management."}</span>
            </label>
          </div>

          {isV7 && config.queueType !== "simple" && (
            <div className="pt-2 border-t border-slate-800/60 flex flex-col gap-1.5 max-w-xs">
              <label htmlFor="adv-parent-max-limit" className="text-slate-200 text-xs font-medium">
                {isAr ? "الحد الأقصى الكلي للشبكة (Parent Max-Limit - اختياري)" : "Parent Queue Max-Limit (Optional)"}
              </label>
              <input
                id="adv-parent-max-limit"
                name="parentQueueMaxLimit"
                dir="ltr"
                type="text"
                className="min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400"
                value={config.parentQueueMaxLimit}
                onChange={(e) => onChange({ parentQueueMaxLimit: e.target.value })}
                placeholder="50M/100M"
              />
            </div>
          )}

          {!isV7 && config.queueType !== "simple" && (
            <div className="flex items-start gap-2 bg-amber-950/40 border border-amber-700/60 text-amber-200 rounded-lg p-3 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-300 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                {isAr
                  ? "تنبيه: طوابير CAKE و FQ-CoDel مدعومة فقط في RouterOS v7. عند اختيار v6 سيتم استخدام Standard Simple Queue تلقائياً في السكربت."
                  : "Note: CAKE and FQ-CoDel queues are only generated in RouterOS v7 mode. In v6 mode, the script falls back to Standard Simple Queues."}
              </span>
            </div>
          )}
        </div>

        {/* Firewall Security Hardening */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-slate-100 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                {isAr ? "تأمين الجدار الناري والخدمات ومنع المشاركة" : "Security Hardening, Services & Anti-Sharing"}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isAr
                  ? "إضافة قواعد لحظر ثغرات DNS المفتوحة، تأمين منافذ الإدارة من الإنترنت والعملاء، تعطيل الخدمات غير الآمنة، ومنع مشاركة الكروت."
                  : "Protect management ports from WAN/clients, drop open DNS resolvers, disable legacy services, and prevent connection sharing."}
              </p>
            </div>
            <ToggleSwitch
              id="adv-firewall-switch"
              size="sm"
              checked={config.enableFirewallHardening}
              onChange={(checked) => onChange({ enableFirewallHardening: checked })}
              ariaLabel={isAr ? "تفعيل تأمين الجدار الناري" : "Enable Firewall Hardening"}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 text-xs text-slate-200">
            <label htmlFor="adv-fw-wan" className="min-h-[44px] sm:min-h-[32px] flex items-center gap-2 cursor-pointer">
              <input
                id="adv-fw-wan"
                name="blockWanManagement"
                type="checkbox"
                className="w-4 h-4 flex-shrink-0 accent-emerald-500"
                checked={config.blockWanManagement}
                onChange={(e) => onChange({ blockWanManagement: e.target.checked })}
              />
              <span>{isAr ? "حظر الدخول لإدارة الراوتر من الـ WAN" : "Drop Unsolicited WAN Input (Winbox/WebFig)"}</span>
            </label>

            <label htmlFor="adv-fw-hotspot" className="min-h-[44px] sm:min-h-[32px] flex items-center gap-2 cursor-pointer">
              <input
                id="adv-fw-hotspot"
                name="blockHotspotRouterAccess"
                type="checkbox"
                className="w-4 h-4 flex-shrink-0 accent-emerald-500"
                checked={config.blockHotspotRouterAccess}
                onChange={(e) => onChange({ blockHotspotRouterAccess: e.target.checked })}
              />
              <span>{isAr ? "منع عملاء الهوتسبوت من منافذ الإدارة" : "Block Hotspot Clients from Router Ports"}</span>
            </label>

            <label htmlFor="adv-fw-services" className="min-h-[44px] sm:min-h-[32px] flex items-center gap-2 cursor-pointer">
              <input
                id="adv-fw-services"
                name="disableUnusedServices"
                type="checkbox"
                className="w-4 h-4 flex-shrink-0 accent-emerald-500"
                checked={config.disableUnusedServices}
                onChange={(e) => onChange({ disableUnusedServices: e.target.checked })}
              />
              <span>{isAr ? "تعطيل خدمات Telnet / FTP / API" : "Disable Telnet / FTP / API Services"}</span>
            </label>

            <label htmlFor="adv-fw-ttl" className="min-h-[44px] sm:min-h-[32px] flex items-center gap-2 cursor-pointer">
              <input
                id="adv-fw-ttl"
                name="preventSharingTtl"
                type="checkbox"
                className="w-4 h-4 flex-shrink-0 accent-emerald-500"
                checked={config.preventSharingTtl}
                onChange={(e) => onChange({ preventSharingTtl: e.target.checked })}
              />
              <span>{isAr ? "منع مشاركة الإنترنت عبر الراوترات (TTL=1)" : "Anti-Sharing: Force TTL=1"}</span>
            </label>
          </div>
        </div>

        {/* Bypass FastTrack */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" aria-hidden="true" />
                {isAr ? "تجاوز فاست تراك لضمان عمل طوابير السرعة (Bypass FastTrack)" : "Bypass FastTrack (Critical)"}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isAr
                  ? "تفعيل هذا الخيار يقوم بتجاوز فاست تراك لحزم بيانات الهوت سبوت. هام جداً لأن الفاست تراك يتخطى طوابير السرعات (Simple Queues)، مما يعطل تحديد السرعة للمشتركين."
                  : "Bypasses FastTrack routing for Hotspot clients. Critical because FastTrack bypasses Mikrotik Queues, disabling speed limit enforcement."}
              </p>
            </div>
            <ToggleSwitch
              id="adv-fasttrack-switch"
              size="sm"
              checked={config.bypassFasttrack}
              onChange={(checked) => onChange({ bypassFasttrack: checked })}
              ariaLabel={isAr ? "تفعيل تجاوز FastTrack" : "Enable Bypass FastTrack"}
            />
          </div>
        </div>

        {/* Walled Garden / Allowed Websites */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-medium text-slate-100 flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" aria-hidden="true" />
              {isAr ? "المواقع المسموحة بدون تسجيل دخول (Walled Garden)" : "Walled Garden Domains"}
            </h3>
            <span className="text-xs text-slate-400">
              {isAr ? "السماح بالوصول لروابط محددة مثل واتساب أو مواقع الدفع" : "Allow access to specific domains prior to login"}
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
              <div className="sm:col-span-4">
                <label htmlFor="adv-wg-type" className="text-[11px] text-slate-300 mb-1 block">
                  {isAr ? "نوع الاستثناء" : "Entry Type"}
                </label>
                <select
                  id="adv-wg-type"
                  name="walledGardenType"
                  dir="ltr"
                  aria-label={isAr ? "نوع استثناء Walled Garden" : "Walled Garden Entry Type"}
                  className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400"
                  value={newEntryType}
                  onChange={(e) => setNewEntryType(e.target.value as "domain" | "ip")}
                >
                  <option value="domain">Domain</option>
                  <option value="ip">IP / CIDR</option>
                </select>
              </div>
              <div className="sm:col-span-8">
                <label htmlFor="adv-wg-host" className="text-[11px] text-slate-300 mb-1 block">
                  {newEntryType === "ip" ? (isAr ? "عنوان IP أو الشبكة" : "IP / CIDR") : (isAr ? "النطاق (مثال: *.whatsapp.com)" : "Domain (e.g. *.whatsapp.com)")}
                </label>
                <input
                  id="adv-wg-host"
                  name="walledGardenHost"
                  dir="ltr"
                  type="text"
                  aria-label={isAr ? "النطاق أو عنوان IP" : "Domain or IP address"}
                  placeholder={newEntryType === "ip" ? "192.168.50.0/24" : "*.whatsapp.com"}
                  className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="adv-wg-comment"
                name="walledGardenComment"
                type="text"
                aria-label={isAr ? "وصف الاستثناء" : "Exception description"}
                placeholder={isAr ? "وصف (اختياري)" : "Description (optional)"}
                className="flex-1 min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-emerald-400"
                value={newDomainComment}
                onChange={(e) => setNewDomainComment(e.target.value)}
              />
              <button
                type="button"
                onClick={handleAddWalledGarden}
                className="shrink-0 min-h-[44px] sm:min-h-[38px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs px-4 py-1.5 rounded-lg inline-flex items-center justify-center gap-1.5 font-semibold transition"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{isAr ? "إضافة" : "Add"}</span>
              </button>
            </div>

            {newEntryType === "domain" && (
              <label htmlFor="adv-wg-https" className="min-h-[44px] sm:min-h-[32px] flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  id="adv-wg-https"
                  name="walledGardenHttpsIp"
                  type="checkbox"
                  className="w-4 h-4 flex-shrink-0 accent-emerald-500"
                  checked={newIncludeHttpsIp}
                  onChange={(e) => setNewIncludeHttpsIp(e.target.checked)}
                />
                <span>{isAr ? "تضمين في Walled Garden IP أيضاً لدعم HTTPS (Port 443)" : "Also add to Walled Garden IP for HTTPS (Port 443)"}</span>
              </label>
            )}
          </div>

          <div className="space-y-1.5 pt-2">
            {(!config.walledGardenDomains || config.walledGardenDomains.length === 0) ? (
              <p className="text-xs text-slate-400 italic">
                {isAr ? "لا توجد استثناءات مضافة بعد." : "No walled garden domain exceptions configured."}
              </p>
            ) : (
              config.walledGardenDomains.map(wg => (
                <div key={wg.id} className="flex justify-between items-center bg-slate-800/80 px-3 py-1.5 rounded-lg text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-200 font-mono">
                      {wg.entryType === "ip" ? "IP" : "DNS"}
                    </span>
                    <span dir="ltr" className="font-mono text-cyan-300">{wg.domain}</span>
                    {wg.includeHttpsIp && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono">HTTPS</span>
                    )}
                    {wg.comment && <span className="text-slate-300 text-[11px]">({wg.comment})</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveWalledGarden(wg.id)}
                    aria-label={isAr ? `حذف ${wg.domain}` : `Remove ${wg.domain}`}
                    className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] inline-flex items-center justify-center text-slate-300 hover:text-red-300 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* IP Bindings (Bypassed / Blocked Devices) */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-medium text-slate-100 flex items-center gap-2">
              <Network className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              {isAr ? "استثناءات الأجهزة (IP Bindings / Bypassed APs)" : "IP Bindings (Bypassed / Blocked Devices)"}
            </h3>
            <span className="text-xs text-slate-400">
              {isAr ? "إخراج الأكسس بوينت أو الكاميرات من صفحة الدخول" : "Bypass Access Points, cameras, or admin devices"}
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                id="adv-ib-mac"
                name="ipBindingMac"
                dir="ltr"
                type="text"
                aria-label={isAr ? "عنوان MAC" : "MAC Address"}
                placeholder="AA:BB:CC:DD:EE:FF"
                className="min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 font-mono focus:ring-2 focus:ring-emerald-400"
                value={newBindingMac}
                onChange={(e) => setNewBindingMac(e.target.value)}
              />
              <input
                id="adv-ib-ip"
                name="ipBindingIp"
                dir="ltr"
                type="text"
                aria-label={isAr ? "عنوان IP للجهاز" : "Device IP Address"}
                placeholder="192.168.80.2"
                className="min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 font-mono focus:ring-2 focus:ring-emerald-400"
                value={newBindingIp}
                onChange={(e) => setNewBindingIp(e.target.value)}
              />
              <select
                id="adv-ib-type"
                name="ipBindingType"
                dir="ltr"
                aria-label={isAr ? "نوع الربط" : "Binding Type"}
                className="min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 font-mono focus:ring-2 focus:ring-emerald-400"
                value={newBindingType}
                onChange={(e) => setNewBindingType(e.target.value as "bypassed" | "blocked" | "regular")}
              >
                <option value="bypassed">bypassed</option>
                <option value="blocked">blocked</option>
                <option value="regular">regular</option>
              </select>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="adv-ib-comment"
                name="ipBindingComment"
                type="text"
                aria-label={isAr ? "ملاحظة الجهاز" : "Device comment"}
                placeholder={isAr ? "ملاحظة (مثل AP1)" : "Comment (e.g. AP1)"}
                className="flex-1 min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-400"
                value={newBindingComment}
                onChange={(e) => setNewBindingComment(e.target.value)}
              />
              <button
                type="button"
                onClick={handleAddIpBinding}
                className="shrink-0 min-h-[44px] sm:min-h-[38px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-1.5 rounded-lg inline-flex items-center justify-center gap-1.5 font-semibold transition"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{isAr ? "إضافة" : "Add"}</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            {(!config.ipBindings || config.ipBindings.length === 0) ? (
              <p className="text-xs text-slate-400 italic">
                {isAr ? "لا توجد استثناءات أجهزة مضافة بعد." : "No IP bindings configured yet."}
              </p>
            ) : (
              config.ipBindings.map((b) => (
                <div key={b.id} className="flex justify-between items-center bg-slate-800/80 px-3 py-1.5 rounded-lg text-xs">
                  <div className="flex items-center gap-2 flex-wrap font-mono">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${b.type === "blocked" ? "bg-red-950 text-red-300" : "bg-emerald-950 text-emerald-300"}`}>
                      {b.type}
                    </span>
                    {b.macAddress && <span dir="ltr" className="text-slate-100">{b.macAddress}</span>}
                    {b.ipAddress && <span dir="ltr" className="text-cyan-300">{b.ipAddress}</span>}
                    {b.comment && <span className="text-slate-300 font-sans text-[11px]">({b.comment})</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveIpBinding(b.id)}
                    aria-label={isAr ? `حذف استثناء ${b.comment || b.macAddress || b.ipAddress}` : `Remove binding ${b.comment || b.macAddress || b.ipAddress}`}
                    className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] inline-flex items-center justify-center text-slate-300 hover:text-red-300 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* System Scheduler & Housekeeping */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
          <h3 className="text-sm font-medium text-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            {isAr ? "سكربتات الصيانة والتنظيف التلقائي (System Scheduler)" : "Scheduled Maintenance Scripts"}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label htmlFor="adv-sched-clean" className="min-h-[44px] flex items-start gap-3 bg-slate-800/50 p-3 rounded-lg border border-slate-700/60 cursor-pointer hover:bg-slate-800 transition">
              <input
                id="adv-sched-clean"
                name="enableAutoCleanScript"
                type="checkbox"
                className="w-4 h-4 flex-shrink-0 mt-0.5 accent-emerald-500"
                checked={config.enableAutoCleanScript}
                onChange={(e) => onChange({ enableAutoCleanScript: e.target.checked })}
              />
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-100 block">
                  {isAr ? "تنظيف الذاكرة المؤقتة يومياً" : "Daily Unauth Hosts Cleanup"}
                </span>
                <span className="text-[11px] text-slate-300 block leading-tight">
                  {isAr ? "مسح الأجهزة غير المسجلة من الذاكرة يومياً الساعة 3 فجراً لتحرير الـ RAM." : "Removes expired unauthenticated host caches daily at 3 AM."}
                </span>
              </div>
            </label>

            <label htmlFor="adv-sched-reboot" className="min-h-[44px] flex items-start gap-3 bg-slate-800/50 p-3 rounded-lg border border-slate-700/60 cursor-pointer hover:bg-slate-800 transition">
              <input
                id="adv-sched-reboot"
                name="enableScheduledReboot"
                type="checkbox"
                className="w-4 h-4 flex-shrink-0 mt-0.5 accent-emerald-500"
                checked={config.enableScheduledReboot}
                onChange={(e) => onChange({ enableScheduledReboot: e.target.checked })}
              />
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-100 block">
                  {isAr ? "إعادة تشغيل أسبوعية أوتوماتيكية" : "Weekly Automatic Router Reboot"}
                </span>
                <span className="text-[11px] text-slate-300 block leading-tight">
                  {isAr ? "إعادة تشغيل الراوتر كل أسبوع الساعة 4 فجراً لتجديد كفاءة النظام." : "Reboots the router weekly at 4 AM to flush system memory."}
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Voucher Cards Batch Script Generator */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-slate-100 flex items-center gap-2">
                <Ticket className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                {isAr ? "مولد سكربت كروت المشتركين بالجملة (Batch Voucher Generator)" : "Batch Voucher Cards Generator"}
              </h3>
              <p className="text-xs text-slate-400">
                {isAr
                  ? "تضمين أسطر برمجة لتوليد دفعة كروت عشوائية فور تنفيذ السكربت على الميكروتيك."
                  : "Generates terminal script commands to auto-create a batch of randomized vouchers."}
              </p>
            </div>
            <ToggleSwitch
              id="adv-voucher-switch"
              size="sm"
              checked={config.generateVouchersBatch}
              onChange={(checked) => {
                if (checked) {
                  const updates: Partial<HotspotConfig> = { generateVouchersBatch: true };
                  if (!config.voucherCodes || config.voucherCodes.length !== (config.voucherCount || 20)) {
                    updates.voucherCodes = generateCryptoVoucherCodes(config.voucherCount || 20, config.voucherLength || 4);
                  }
                  const targetProfiles = effectiveVoucherTarget === "userman" ? umProfiles : profiles;
                  if (
                    targetProfiles.length > 0 &&
                    !targetProfiles.some((p) => p.name === config.voucherSelectedProfile)
                  ) {
                    updates.voucherSelectedProfile = targetProfiles[0].name;
                  }
                  onChange(updates);
                } else {
                  onChange({ generateVouchersBatch: false });
                }
              }}
              ariaLabel={isAr ? "تفعيل توليد دفعة الكروت" : "Enable Batch Voucher Generator"}
            />
          </div>

          {config.generateVouchersBatch && (
            <div className="space-y-3 pt-2 border-t border-slate-800/60 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                {effectiveAuthMode === "hybrid" ? (
                  <div className="max-w-xs flex-1">
                    <label htmlFor="adv-voucher-target" className="text-slate-200 mb-1 block">
                      {isAr ? "وجهة إنشاء الكروت" : "Voucher Target System"}
                    </label>
                    <select
                      id="adv-voucher-target"
                      name="voucherTarget"
                      className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5"
                      value={effectiveVoucherTarget}
                      onChange={(e) => {
                        const t = e.target.value as "hotspot" | "userman";
                        const firstProf = t === "userman" ? (umProfiles[0]?.name || "") : (profiles[0]?.name || "");
                        onChange({ voucherTarget: t, voucherSelectedProfile: firstProf });
                      }}
                    >
                      <option value="userman">{isAr ? "اليوزر مانجر (User Manager)" : "User Manager"}</option>
                      <option value="hotspot">{isAr ? "الهوتسبوت المحلي (/ip hotspot user)" : "Local Hotspot Users"}</option>
                    </select>
                  </div>
                ) : (
                  <span className="text-[11px] text-emerald-300">
                    {isAr
                      ? "تُنشأ الأكواد عشوائياً بتشفير المتصفح (CSPRNG) وتُطابق اسم المستخدم وكلمة المرور."
                      : "Codes are generated via browser CSPRNG with matching voucher username and password."}
                  </span>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        voucherCodes: generateCryptoVoucherCodes(config.voucherCount || 20, config.voucherLength || 4),
                      })
                    }
                    className="min-h-[44px] sm:min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-700/60 rounded-lg font-medium transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{isAr ? "توليد أكواد جديدة" : "Regenerate Codes"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportVouchersCsv}
                    className="min-h-[44px] sm:min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-lg font-medium transition"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
                    <span>{isAr ? "تصدير CSV" : "Export CSV"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintVouchers}
                    className="min-h-[44px] sm:min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg font-semibold transition"
                  >
                    <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{isAr ? "طباعة الكروت" : "Print Cards"}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
                <div className="sm:col-span-2">
                  <label htmlFor="adv-voucher-count" className="text-slate-200 mb-1 block">{isAr ? "عدد الكروت" : "Card Count"}</label>
                  <input
                    id="adv-voucher-count"
                    name="voucherCount"
                    dir="ltr"
                    type="number"
                    min="1"
                    max="500"
                    className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 font-mono focus:ring-2 focus:ring-emerald-400"
                    value={config.voucherCount}
                    onChange={(e) => {
                      const nextCount = Math.max(1, Math.min(500, parseInt(e.target.value, 10) || 10));
                      onChange({
                        voucherCount: nextCount,
                        voucherCodes: generateCryptoVoucherCodes(nextCount, config.voucherLength || 4),
                      });
                    }}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="adv-voucher-prefix" className="text-slate-200 mb-1 block">{isAr ? "بادئة الاسم (Prefix)" : "Card Prefix"}</label>
                  <input
                    id="adv-voucher-prefix"
                    name="voucherPrefix"
                    dir="ltr"
                    type="text"
                    placeholder="VIP-"
                    className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 font-mono focus:ring-2 focus:ring-emerald-400"
                    value={config.voucherPrefix}
                    onChange={(e) => onChange({ voucherPrefix: e.target.value })}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="adv-voucher-len" className="text-slate-200 mb-1 block">{isAr ? "طول الرمز العشوائي" : "Random Code Length"}</label>
                  <input
                    id="adv-voucher-len"
                    name="voucherLength"
                    dir="ltr"
                    type="number"
                    min="3"
                    max="12"
                    className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 font-mono focus:ring-2 focus:ring-emerald-400"
                    value={config.voucherLength}
                    onChange={(e) => {
                      const nextLen = Math.max(3, Math.min(12, parseInt(e.target.value, 10) || 4));
                      onChange({
                        voucherLength: nextLen,
                        voucherCodes: generateCryptoVoucherCodes(config.voucherCount || 20, nextLen),
                      });
                    }}
                  />
                </div>

                <div className="sm:col-span-6">
                  <label htmlFor="adv-voucher-profile" className="text-slate-200 mb-1 block">
                    {effectiveVoucherTarget === "userman"
                      ? (isAr ? "باقة اليوزر مانجر" : "User Manager Profile")
                      : (isAr ? "بروفايل الهوتسبوت" : "Hotspot Profile")}
                  </label>
                  <select
                    id="adv-voucher-profile"
                    name="voucherSelectedProfile"
                    dir="ltr"
                    className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 font-mono focus:ring-2 focus:ring-emerald-400"
                    value={config.voucherSelectedProfile}
                    onChange={(e) => onChange({ voucherSelectedProfile: e.target.value })}
                  >
                    {effectiveVoucherTarget === "userman" ? (
                      <>
                        {!umProfiles.some((p) => p.name === config.voucherSelectedProfile) && config.voucherSelectedProfile && (
                          <option value={config.voucherSelectedProfile}>{config.voucherSelectedProfile}</option>
                        )}
                        {umProfiles.map((p) => (
                          <option key={p.id} value={p.name}>
                            {p.name} ({p.nameForUsers})
                          </option>
                        ))}
                      </>
                    ) : (
                      <>
                        {!profiles.some((p) => p.name === config.voucherSelectedProfile) && config.voucherSelectedProfile && (
                          <option value={config.voucherSelectedProfile}>{config.voucherSelectedProfile}</option>
                        )}
                        {profiles.map((p) => (
                          <option key={p.id} value={p.name}>
                            {p.name} ({p.displayName})
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              </div>

              {effectiveVoucherTarget === "hotspot" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                  <div>
                    <label htmlFor="adv-voucher-uptime" className="text-slate-300 mb-1 block">
                      {isAr ? "حد وقت الكارت (limit-uptime على المستخدم)" : "User limit-uptime (Optional)"}
                    </label>
                    <input
                      id="adv-voucher-uptime"
                      name="voucherLocalLimitUptime"
                      dir="ltr"
                      type="text"
                      placeholder="1d or 5h or 0s"
                      className="w-full min-h-[44px] sm:min-h-[36px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1 font-mono"
                      value={config.voucherLocalLimitUptime}
                      onChange={(e) => onChange({ voucherLocalLimitUptime: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="adv-voucher-bytes" className="text-slate-300 mb-1 block">
                      {isAr ? "حد الجيجابايت بالميجابايت (limit-bytes-total)" : "User Data Limit MB (limit-bytes-total)"}
                    </label>
                    <input
                      id="adv-voucher-bytes"
                      name="voucherLocalLimitBytesMb"
                      dir="ltr"
                      type="number"
                      min="0"
                      className="w-full min-h-[44px] sm:min-h-[36px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1 font-mono"
                      value={config.voucherLocalLimitBytesMb || 0}
                      onChange={(e) => onChange({ voucherLocalLimitBytesMb: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                  <div>
                    <label htmlFor="adv-voucher-shared" className="text-slate-300 mb-1 block">
                      {isAr ? "الأجهزة المشتركة للكارت (shared-users)" : "User shared-users"}
                    </label>
                    <input
                      id="adv-voucher-shared"
                      name="voucherSharedUsers"
                      dir="ltr"
                      type="number"
                      min="1"
                      className="w-full min-h-[44px] sm:min-h-[36px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1 font-mono"
                      value={config.voucherSharedUsers || 1}
                      onChange={(e) => onChange({ voucherSharedUsers: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                    />
                  </div>
                  {isV7 && (
                    <div>
                      <label htmlFor="adv-voucher-umgrp" className="text-slate-300 mb-1 block">
                        {isAr ? "مجموعة v7 (User Group)" : "v7 User Group"}
                      </label>
                      <select
                        id="adv-voucher-umgrp"
                        name="voucherUmGroup"
                        dir="ltr"
                        className="w-full min-h-[44px] sm:min-h-[36px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1 font-mono"
                        value={config.voucherUmGroup}
                        onChange={(e) => onChange({ voucherUmGroup: e.target.value })}
                      >
                        <option value="">default</option>
                        {umGroups.map((g) => (
                          <option key={g.id} value={g.name}>{g.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Free Trial Mode */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-slate-100 flex items-center gap-2">
                <Play className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                {isAr ? "تفعيل الخدمة التجريبية المجانية (Free Trial)" : "Enable Free Trial Mode"}
              </h3>
              <p className="text-xs text-slate-400">
                {isAr
                  ? "السماح للزوار بتجربة الإنترنت مجاناً لفترة محددة دون الحاجة لامتلاك حساب."
                  : "Allow guests to trial the internet service for a short, restricted duration."}
              </p>
            </div>
            <ToggleSwitch
              id="adv-trial-switch"
              size="sm"
              checked={config.enableTrial}
              onChange={(checked) => onChange({ enableTrial: checked })}
              ariaLabel={isAr ? "تفعيل التجربة المجانية" : "Enable Free Trial"}
            />
          </div>

          {config.enableTrial && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end pt-2 border-t border-slate-800/60">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="adv-trial-duration" className="text-slate-200 text-xs font-medium">
                  {isAr ? "مدة التجربة المجانية لكل مستخدم" : "Trial Uptime Duration"}
                </label>
                <input
                  id="adv-trial-duration"
                  name="trialDuration"
                  dir="ltr"
                  type="text"
                  className="min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-sm font-mono focus:ring-2 focus:ring-emerald-400"
                  value={config.trialDuration}
                  onChange={(e) => onChange({ trialDuration: e.target.value })}
                  placeholder="00:30:00"
                />
                <span className="text-xs text-slate-400">HH:MM:SS ({isAr ? "مثال: نصف ساعة 00:30:00" : "example: 30 minutes"})</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="adv-trial-reset" className="text-slate-200 text-xs font-medium">
                  {isAr ? "فترة إعادة التجربة (Reset Time)" : "Trial Reset Cooldown"}
                </label>
                <input
                  id="adv-trial-reset"
                  name="trialResetTime"
                  dir="ltr"
                  type="text"
                  className="min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-sm font-mono focus:ring-2 focus:ring-emerald-400"
                  value={config.trialResetTime}
                  onChange={(e) => onChange({ trialResetTime: e.target.value })}
                  placeholder="1d"
                />
                <span className="text-xs text-slate-400">({isAr ? "مثال: يوم واحد 1d أو 12h" : "example: 1d for one day"})</span>
              </div>
            </div>
          )}
        </div>

        {/* Cookie / MAC Cookie Auto-login */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-slate-100 flex items-center gap-2">
                <Cookie className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                {isAr ? "حفظ تسجيل دخول المشتركين تلقائياً (Cookie Login)" : "Enable MAC Cookie Auto-Login"}
              </h3>
              <p className="text-xs text-slate-400">
                {isAr
                  ? "تذكر أجهزة المشتركين حتى لا يضطروا لكتابة اسم المستخدم وكلمة المرور في كل مرة يقطع فيها الاتصال مؤقتاً."
                  : "Remember user devices dynamically so they don't have to re-authenticate during temporary disconnections."}
              </p>
            </div>
            <ToggleSwitch
              id="adv-cookie-switch"
              size="sm"
              checked={config.enableCookie}
              onChange={(checked) => onChange({ enableCookie: checked })}
              ariaLabel={isAr ? "تفعيل حفظ تسجيل الدخول Cookie" : "Enable Cookie Login"}
            />
          </div>

          {config.enableCookie && (
            <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800/60">
              <label htmlFor="adv-cookie-lifetime" className="text-slate-200 text-xs font-medium">
                {isAr ? "صلاحية كوكيز تسجيل الدخول (Lifetime)" : "Cookie Lifetime / Validity"}
              </label>
              <input
                id="adv-cookie-lifetime"
                name="cookieLifetime"
                dir="ltr"
                type="text"
                className="min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-sm font-mono focus:ring-2 focus:ring-emerald-400 max-w-xs"
                value={config.cookieLifetime}
                onChange={(e) => onChange({ cookieLifetime: e.target.value })}
                placeholder="3d"
              />
              <span className="text-xs text-slate-400">({isAr ? "مثال: 3 أيام 3d أو يوم واحد 1d" : "example: 3d for three days"})</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
