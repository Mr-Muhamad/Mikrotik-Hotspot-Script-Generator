/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { HotspotConfig, WalledGardenEntry } from "../types";
import { Sparkles, Cookie, AlertTriangle, Play, ShieldCheck, Globe, Clock, Ticket, Plus, Trash2, Shield, Cpu, Gauge } from "lucide-react";

interface Props {
  config: HotspotConfig;
  onChange: (updates: Partial<HotspotConfig>) => void;
  lang: "ar" | "en";
}

export default function AdvancedFeaturesTab({ config, onChange, lang }: Props) {
  const isAr = lang === "ar";
  const isV7 = config.rosVersion === "v7";
  const [newDomain, setNewDomain] = useState("");
  const [newDomainComment, setNewDomainComment] = useState("");

  const handleAddWalledGarden = () => {
    if (!newDomain.trim()) return;
    const entry: WalledGardenEntry = {
      id: `wg_${Date.now()}`,
      domain: newDomain.trim(),
      comment: newDomainComment.trim() || "Walled Garden Exception"
    };
    onChange({
      walledGardenDomains: [...(config.walledGardenDomains || []), entry]
    });
    setNewDomain("");
    setNewDomainComment("");
  };

  const handleRemoveWalledGarden = (id: string) => {
    onChange({
      walledGardenDomains: (config.walledGardenDomains || []).filter(e => e.id !== id)
    });
  };

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <div className="border-b border-slate-800 pb-4">
        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          {isAr ? "تخصيص الحماية، طوابير الانتظار وسكربتات الصيانة" : "Advanced Security, Queuing & Maintenance"}
        </h3>
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
              <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-emerald-400" />
                {isAr ? "خوارزمية طوابير التحكم بالسرعة (Queue Type)" : "Queue Engine Type"}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isAr
                  ? "اختر نوع طابور الانتظار لضبط الباندويث والقضاء على البطء عند الضغط (Bufferbloat)."
                  : "Select the queuing discipline used for managing client bufferbloat and latency."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <label className={`cursor-pointer border rounded-lg p-3 transition text-xs flex flex-col gap-1 ${config.queueType === "simple" ? "bg-emerald-950/60 border-emerald-500 text-slate-100" : "bg-slate-800/40 border-slate-700 text-slate-400"}`}>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="queueType"
                  className="accent-emerald-500"
                  checked={config.queueType === "simple" || !config.queueType}
                  onChange={() => onChange({ queueType: "simple" })}
                />
                <span className="font-bold text-slate-200">Standard Simple Queue</span>
              </div>
              <span className="text-[11px] text-slate-400">{isAr ? "الأنسب لراوترات v6 و v7 العادية." : "Default standard Mikrotik queue."}</span>
            </label>

            <label className={`cursor-pointer border rounded-lg p-3 transition text-xs flex flex-col gap-1 ${config.queueType === "cake" ? "bg-emerald-950/60 border-emerald-500 text-slate-100" : "bg-slate-800/40 border-slate-700 text-slate-400"}`}>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="queueType"
                  className="accent-emerald-500"
                  checked={config.queueType === "cake"}
                  onChange={() => onChange({ queueType: "cake" })}
                />
                <span className="font-bold text-emerald-400">CAKE Queue (v7 Only)</span>
              </div>
              <span className="text-[11px] text-slate-400">{isAr ? "أقوى تقنية لمكافحة الـ Bufferbloat في الألعاب والشات." : "Eliminates latency & gaming ping spikes."}</span>
            </label>

            <label className={`cursor-pointer border rounded-lg p-3 transition text-xs flex flex-col gap-1 ${config.queueType === "fq_codel" ? "bg-emerald-950/60 border-emerald-500 text-slate-100" : "bg-slate-800/40 border-slate-700 text-slate-400"}`}>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="queueType"
                  className="accent-emerald-500"
                  checked={config.queueType === "fq_codel"}
                  onChange={() => onChange({ queueType: "fq_codel" })}
                />
                <span className="font-bold text-sky-400">FQ-CoDel (v7 Only)</span>
              </div>
              <span className="text-[11px] text-slate-400">{isAr ? "خوارزمية توزيع العزم العادلة بين المستخدمين." : "Fair queueing active queue management."}</span>
            </label>
          </div>
        </div>

        {/* Firewall Security Hardening */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                {isAr ? "تأمين الجدار الناري ضد الهجمات (Firewall Hardening)" : "Security & Anti-Exploit Firewall Rules"}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isAr 
                  ? "إضافة قواعد لحظر ثغرات DNS المفتوحة من الخارج، هجمات التخمين Brute-Force على منفذ الـ SSH و Winbox، وتصفية حزم البيانات الفاسدة."
                  : "Injects anti-brute force, open resolver drop rules, and invalid connection filters."}
              </p>
            </div>
            <div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={config.enableFirewallHardening}
                  onChange={(e) => onChange({ enableFirewallHardening: e.target.checked })}
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Bypass FastTrack */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                {isAr ? "تجاوز فاست تراك لضمان عمل طوابير السرعة (Bypass FastTrack)" : "Bypass FastTrack (Critical)"}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isAr 
                  ? "تفعيل هذا الخيار يقوم بتجاوز فاست تراك لحزم بيانات الهوت سبوت. هام جداً لأن الفاست تراك يتخطى طوابير السرعات (Simple Queues)، مما يعطل تحديد السرعة للمشتركين."
                  : "Bypasses FastTrack routing for Hotspot clients. Critical because FastTrack bypasses Mikrotik Queues, disabling speed limit enforcement."}
              </p>
            </div>
            <div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={config.bypassFasttrack}
                  onChange={(e) => onChange({ bypassFasttrack: e.target.checked })}
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Walled Garden / Allowed Websites */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              {isAr ? "المواقع المسموحة بدون تسجيل دخول (Walled Garden)" : "Walled Garden Domains"}
            </h4>
            <span className="text-xs text-slate-400">
              {isAr ? "السماح بالوصول لروابط محددة مثل واتساب أو مواقع الدفع" : "Allow access to specific domains prior to login"}
            </span>
          </div>

          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <input
              type="text"
              placeholder={isAr ? "مثال: *.whatsapp.com" : "e.g., *.whatsapp.com"}
              className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-xs font-mono flex-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
            />
            <input
              type="text"
              placeholder={isAr ? "وصف (اختياري)" : "Description (optional)"}
              className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-xs flex-1 focus:outline-none"
              value={newDomainComment}
              onChange={(e) => setNewDomainComment(e.target.value)}
            />
            <button
              type="button"
              onClick={handleAddWalledGarden}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 font-medium transition"
            >
              <Plus className="w-3.5 h-3.5" />
              {isAr ? "إضافة" : "Add"}
            </button>
          </div>

          <div className="space-y-1.5 pt-2">
            {(!config.walledGardenDomains || config.walledGardenDomains.length === 0) ? (
              <p className="text-xs text-slate-500 italic">
                {isAr ? "لا توجد استثناءات مضافة بعد." : "No walled garden domain exceptions configured."}
              </p>
            ) : (
              config.walledGardenDomains.map(wg => (
                <div key={wg.id} className="flex justify-between items-center bg-slate-800/80 px-3 py-1.5 rounded-lg text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-cyan-300">{wg.domain}</span>
                    {wg.comment && <span className="text-slate-400 text-[11px]">({wg.comment})</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveWalledGarden(wg.id)}
                    className="text-slate-500 hover:text-red-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* System Scheduler & Housekeeping */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
          <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            {isAr ? "سكربتات الصيانة والتنظيف التلقائي (System Scheduler)" : "Scheduled Maintenance Scripts"}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-start gap-3 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 cursor-pointer hover:bg-slate-800 transition">
              <input
                type="checkbox"
                className="mt-1 accent-emerald-500"
                checked={config.enableAutoCleanScript}
                onChange={(e) => onChange({ enableAutoCleanScript: e.target.checked })}
              />
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-200 block">
                  {isAr ? "تنظيف الذاكرة المؤقتة يومياً" : "Daily Unauth Hosts Cleanup"}
                </span>
                <span className="text-[11px] text-slate-400 block leading-tight">
                  {isAr ? "مسح الأجهزة غير المسجلة من الذاكرة يومياً الساعة 3 فجراً لتحرير الـ RAM." : "Removes expired unauthenticated host caches daily at 3 AM."}
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 cursor-pointer hover:bg-slate-800 transition">
              <input
                type="checkbox"
                className="mt-1 accent-emerald-500"
                checked={config.enableScheduledReboot}
                onChange={(e) => onChange({ enableScheduledReboot: e.target.checked })}
              />
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-200 block">
                  {isAr ? "إعادة تشغيل أسبوعية أوتوماتيكية" : "Weekly Automatic Router Reboot"}
                </span>
                <span className="text-[11px] text-slate-400 block leading-tight">
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
              <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <Ticket className="w-4 h-4 text-emerald-400" />
                {isAr ? "مولد سكربت كروت المشتركين بالجملة (Batch Voucher Generator)" : "Batch Voucher Cards Generator"}
              </h4>
              <p className="text-xs text-slate-400">
                {isAr 
                  ? "تضمين أسطر برمجة لتوليد دفعة كروت عشوائية فور تنفيذ السكربت على الميكروتيك."
                  : "Generates terminal script commands to auto-create a batch of randomized vouchers."}
              </p>
            </div>
            <div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={config.generateVouchersBatch}
                  onChange={(e) => onChange({ generateVouchersBatch: e.target.checked })}
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:width-4 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white"></div>
              </label>
            </div>
          </div>

          {config.generateVouchersBatch && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/60 text-xs">
              <div>
                <label className="text-slate-300 mb-1 block">{isAr ? "عدد الكروت" : "Card Count"}</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 font-mono focus:outline-none"
                  value={config.voucherCount}
                  onChange={(e) => onChange({ voucherCount: parseInt(e.target.value) || 10 })}
                />
              </div>

              <div>
                <label className="text-slate-300 mb-1 block">{isAr ? "بادئة الاسم (Prefix)" : "Card Prefix"}</label>
                <input
                  type="text"
                  placeholder="e.g. VIP-"
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 font-mono focus:outline-none"
                  value={config.voucherPrefix}
                  onChange={(e) => onChange({ voucherPrefix: e.target.value })}
                />
              </div>

              <div>
                <label className="text-slate-300 mb-1 block">{isAr ? "طول الرمز العشوائي" : "Random Code Length"}</label>
                <input
                  type="number"
                  min="3"
                  max="12"
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 font-mono focus:outline-none"
                  value={config.voucherLength}
                  onChange={(e) => onChange({ voucherLength: parseInt(e.target.value) || 4 })}
                />
              </div>

              <div>
                <label className="text-slate-300 mb-1 block">{isAr ? "البروفايل المخصص" : "Target Profile"}</label>
                <input
                  type="text"
                  placeholder="e.g. 2M"
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 font-mono focus:outline-none"
                  value={config.voucherSelectedProfile}
                  onChange={(e) => onChange({ voucherSelectedProfile: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>

        {/* Free Trial Mode */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <Play className="w-4 h-4 text-emerald-400" />
                {isAr ? "تفعيل الخدمة التجريبية المجانية (Free Trial)" : "Enable Free Trial Mode"}
              </h4>
              <p className="text-xs text-slate-400">
                {isAr 
                  ? "السماح للزوار بتجربة الإنترنت مجاناً لفترة محددة دون الحاجة لامتلاك حساب."
                  : "Allow guests to trial the internet service for a short, restricted duration."}
              </p>
            </div>
            <div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={config.enableTrial}
                  onChange={(e) => onChange({ enableTrial: e.target.checked })}
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:width-4 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white"></div>
              </label>
            </div>
          </div>

          {config.enableTrial && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/60">
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-300 text-xs font-medium">
                  {isAr ? "مدة التجربة المجانية لكل مستخدم" : "Trial Uptime Duration"}
                </label>
                <input
                  type="text"
                  className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none"
                  value={config.trialDuration}
                  onChange={(e) => onChange({ trialDuration: e.target.value })}
                  placeholder="e.g. 00:30:00"
                />
                <span className="text-xs text-slate-500">HH:MM:SS ({isAr ? "مثال: نصف ساعة 00:30:00" : "example: 30 minutes"})</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-300 text-xs font-medium">
                  {isAr ? "فترة إعادة التجربة (Reset Time)" : "Trial Reset Cooldown"}
                </label>
                <input
                  type="text"
                  className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none"
                  value={config.trialResetTime}
                  onChange={(e) => onChange({ trialResetTime: e.target.value })}
                  placeholder="e.g. 1d"
                />
                <span className="text-xs text-slate-500">({isAr ? "مثال: يوم واحد 1d أو 12h" : "example: 1d for one day"})</span>
              </div>
            </div>
          )}
        </div>

        {/* Cookie / MAC Cookie Auto-login */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <Cookie className="w-4 h-4 text-emerald-400" />
                {isAr ? "حفظ تسجيل دخول المشتركين تلقائياً (Cookie Login)" : "Enable MAC Cookie Auto-Login"}
              </h4>
              <p className="text-xs text-slate-400">
                {isAr 
                  ? "تذكر أجهزة المشتركين حتى لا يضطروا لكتابة اسم المستخدم وكلمة المرور في كل مرة يقطع فيها الاتصال مؤقتاً."
                  : "Remember user devices dynamically so they don't have to re-authenticate during temporary disconnections."}
              </p>
            </div>
            <div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={config.enableCookie}
                  onChange={(e) => onChange({ enableCookie: e.target.checked })}
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:width-4 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white"></div>
              </label>
            </div>
          </div>

          {config.enableCookie && (
            <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800/60">
              <label className="text-slate-300 text-xs font-medium">
                {isAr ? "صلاحية كوكيز تسجيل الدخول (Lifetime)" : "Cookie Lifetime / Validity"}
              </label>
              <input
                type="text"
                className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none max-w-xs"
                value={config.cookieLifetime}
                onChange={(e) => onChange({ cookieLifetime: e.target.value })}
                placeholder="e.g. 3d"
              />
              <span className="text-xs text-slate-500">({isAr ? "مثال: 3 أيام 3d أو يوم واحد 1d" : "example: 3d for three days"})</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
