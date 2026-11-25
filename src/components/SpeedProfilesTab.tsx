/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from "react";
import type { AuthMode, HotspotConfig, HotspotUserProfile } from "../types";
import type { ValidationIssue } from "../utils/validation";
import { Gauge, Plus, Trash2, Edit, RefreshCw, Zap, ShieldCheck, ArrowRight, ChevronDown, AlertTriangle } from "lucide-react";
import ToggleSwitch from "./ToggleSwitch";
import ConfirmDialog from "./ConfirmDialog";

interface Props {
  config: HotspotConfig;
  onConfigChange: (updates: Partial<HotspotConfig>) => void;
  profiles: HotspotUserProfile[];
  onAdd: (profile: HotspotUserProfile) => void;
  onUpdate: (index: number, profile: HotspotUserProfile) => void;
  onDelete: (index: number) => void;
  onReset: () => void;
  onNavigateTab: (tab: number) => void;
  lang: "ar" | "en";
  onDirtyChange?: (dirty: boolean) => void;
  issues?: ValidationIssue[];
}

export default function SpeedProfilesTab({
  config,
  onConfigChange,
  profiles,
  onAdd,
  onUpdate,
  onDelete,
  onReset,
  onNavigateTab,
  lang,
  onDirtyChange,
  issues = [],
}: Props) {
  const isAr = lang === "ar";
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempProfile, setTempProfile] = useState<HotspotUserProfile | null>(null);
  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState<number | null>(null);

  const authMode: AuthMode = config.authMode || (config.enableUserManager ? "userman_radius" : "hotspot_only");

  useEffect(() => {
    onDirtyChange?.(authMode !== "userman_radius" && editingIndex !== null);
  }, [authMode, editingIndex, onDirtyChange]);

  useEffect(() => {
    return () => {
      onDirtyChange?.(false);
    };
  }, [onDirtyChange]);

  const handleAddNew = () => {
    const newId = `prof_${Date.now()}`;
    const newProf: HotspotUserProfile = {
      id: newId,
      name: `hs-5M-${profiles.length + 1}`,
      displayName: "5 Mbps Local Plan",
      uploadLimit: "1M",
      downloadLimit: "5M",
      minUpload: "512k",
      minDownload: "2M",
      burstUpload: "2M",
      burstDownload: "10M",
      burstThresholdUpload: "768k",
      burstThresholdDownload: "3M",
      burstTimeUpload: "8s",
      burstTimeDownload: "8s",
      priority: 6,
      sharedUsers: 1,
      sessionTimeout: "00:00:00",
      idleTimeout: "00:15:00",
      keepaliveTimeout: "00:02:00",
      statusAutorefresh: "1m",
      addMacCookie: true,
      macCookieTimeout: "3d",
      insertQueueBefore: "first",
      transparentProxy: false,
    };
    onAdd(newProf);
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setTempProfile({ ...profiles[index] });
  };

  const saveEdit = (index: number) => {
    if (tempProfile) {
      onUpdate(index, tempProfile);
      setEditingIndex(null);
      setTempProfile(null);
    }
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setTempProfile(null);
  };

  const modes: { id: AuthMode; title: string; desc: string }[] = [
    {
      id: "userman_radius",
      title: isAr ? "يوزر مانجر (RADIUS)" : "User Manager (RADIUS)",
      desc: isAr
        ? "موصى به للكروت والأسعار والكوتا: الهوتسبوت يعمل كبوابة NAS والسرعات تُدار من تبويب اليوزر مانجر."
        : "Recommended for vouchers & quotas: Hotspot acts as NAS; speeds & limits come from User Manager.",
    },
    {
      id: "hotspot_only",
      title: isAr ? "هوتسبوت محلي فقط" : "Hotspot Local Only",
      desc: isAr
        ? "إدارة السرعات والجلسات محلياً عبر /ip hotspot user profile بدون RADIUS أو اليوزر مانجر."
        : "Manage user speeds & session timeouts directly in /ip hotspot user profile without RADIUS.",
    },
    {
      id: "hybrid",
      title: isAr ? "وضع هجين (الاثنين معاً)" : "Hybrid (Both)",
      desc: isAr
        ? "توليد بروفايلات هوتسبوت محلية مع اليوزر مانجر (مفيد لحسابات محلية أو ربط Mikrotik-Group)."
        : "Emit local Hotspot profiles alongside User Manager (useful for local users or Mikrotik-Group targets).",
    },
  ];

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <div className="border-b border-slate-800 pb-4 flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Gauge className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            {isAr ? "بروفايلات الهوتسبوت المحلية (Hotspot User Profiles)" : "Hotspot User Profiles"}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {isAr
              ? "إعدادات بوابة الهوتسبوت (RX=رفع / TX=تحميل)، الضمان الأدنى (MIR)، البيرست، والمهل الزمنية بدون خلطها مع اليوزر مانجر."
              : "Configure /ip hotspot user profile bandwidth (RX=Upload / TX=Download), Burst, MIR, timeouts, and MAC cookie rules."}
          </p>
        </div>

        {authMode !== "userman_radius" && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={onReset}
              type="button"
              className="min-h-[44px] sm:min-h-[40px] flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              {isAr ? "استعادة الافتراضية" : "Reset Defaults"}
            </button>
            <button
              onClick={handleAddNew}
              type="button"
              className="min-h-[44px] sm:min-h-[40px] flex items-center gap-1.5 text-xs px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg font-semibold transition"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              {isAr ? "إضافة بروفايل هوتسبوت" : "Add Hotspot Profile"}
            </button>
          </div>
        )}
      </div>

      {/* NAS Default Profile & Compact Operation Mode Control */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="pb-3 border-b border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-semibold text-slate-200">
              {isAr ? "نمط إدارة السرعات والمشتركين:" : "Subscriber & Rate-Limit Control Mode:"}
            </span>
            <div
              role="group"
              aria-label={isAr ? "نمط إدارة السرعات والمشتركين" : "Subscriber & Rate-Limit Control Mode"}
              className="grid grid-cols-1 sm:grid-cols-3 gap-1 bg-slate-950/90 border border-slate-800 p-1 rounded-xl w-full sm:w-auto"
            >
              {modes.map((m) => {
                const active = authMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    title={m.desc}
                    onClick={() => onConfigChange({ authMode: m.id })}
                    aria-pressed={active}
                    className={`min-h-[44px] sm:min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition text-center whitespace-nowrap ${
                      active
                        ? "bg-emerald-500 text-slate-950 shadow-sm"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/70"
                    }`}
                  >
                    {m.title}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            {modes.find((m) => m.id === authMode)?.desc}
          </p>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-medium text-slate-100">
              {isAr ? "إعدادات البروفايل الافتراضي للبوابة (NAS Default Profile)" : "NAS Default User Profile Settings"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {authMode === "userman_radius"
                ? (isAr
                    ? "يُطبّق على default بدون تحديد rate-limit كي لا يتعارض مع سرعة الكارت القادمة من اليوزر مانجر."
                    : "Applied to `default` without a static rate-limit so User Manager RADIUS enforces per-plan speeds.")
                : (isAr
                    ? "الخصائص الافتراضية للجلسات والـ MAC Cookie لبروفايل default وبروفايل التجربة."
                    : "Default session timers and MAC cookie defaults applied to `default` and trial profiles.")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ToggleSwitch
              id="hs-nas-mac-cookie"
              size="sm"
              checked={config.nasAddMacCookie}
              onChange={(checked) => onConfigChange({ nasAddMacCookie: checked })}
              ariaLabel={isAr ? "حفظ MAC Cookie عند الدخول" : "Add MAC Cookie on login"}
            />
            <span className="text-xs text-slate-200">{isAr ? "add-mac-cookie" : "add-mac-cookie"}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <label htmlFor="hs-nas-idle" className="text-xs text-slate-300 mb-1 block">
              {isAr ? "مهلة الخمول (Idle Timeout)" : "Idle Timeout"}
            </label>
            <input
              id="hs-nas-idle"
              name="nasIdleTimeout"
              dir="ltr"
              type="text"
              className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400"
              value={config.nasIdleTimeout}
              onChange={(e) => onConfigChange({ nasIdleTimeout: e.target.value })}
              placeholder="00:15:00"
            />
          </div>
          <div>
            <label htmlFor="hs-nas-keepalive" className="text-xs text-slate-300 mb-1 block">
              {isAr ? "Keepalive Timeout" : "Keepalive Timeout"}
            </label>
            <input
              id="hs-nas-keepalive"
              name="nasKeepaliveTimeout"
              dir="ltr"
              type="text"
              className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400"
              value={config.nasKeepaliveTimeout}
              onChange={(e) => onConfigChange({ nasKeepaliveTimeout: e.target.value })}
              placeholder="00:02:00"
            />
          </div>
          <div>
            <label htmlFor="hs-nas-autorefresh" className="text-xs text-slate-300 mb-1 block">
              {isAr ? "تحديث الحالة (Status Refresh)" : "Status Autorefresh"}
            </label>
            <input
              id="hs-nas-autorefresh"
              name="nasStatusAutorefresh"
              dir="ltr"
              type="text"
              className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400"
              value={config.nasStatusAutorefresh}
              onChange={(e) => onConfigChange({ nasStatusAutorefresh: e.target.value })}
              placeholder="1m"
            />
          </div>
          <div>
            <label htmlFor="hs-nas-mac-timeout" className="text-xs text-slate-300 mb-1 block">
              {isAr ? "صلاحية MAC Cookie" : "MAC Cookie Timeout"}
            </label>
            <input
              id="hs-nas-mac-timeout"
              name="nasMacCookieTimeout"
              dir="ltr"
              type="text"
              disabled={!config.nasAddMacCookie}
              className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400 disabled:opacity-50"
              value={config.nasMacCookieTimeout}
              onChange={(e) => onConfigChange({ nasMacCookieTimeout: e.target.value })}
              placeholder="3d"
            />
          </div>
        </div>

        {config.enableTrial && (
          <div className="pt-2.5 border-t border-slate-800/70 flex items-center justify-between flex-wrap gap-2 text-xs">
            <span className="text-slate-300">
              {isAr
                ? `التجربة المجانية مفعّلة (السرعة الحالية: ${config.trialRateLimit || "256k/512k"}).`
                : `Free Trial is enabled (current rate limit: ${config.trialRateLimit || "256k/512k"}).`}
            </span>
            <button
              type="button"
              onClick={() => onNavigateTab(5)}
              className="min-h-[44px] sm:min-h-[36px] inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 hover:underline font-medium"
            >
              <span>{isAr ? "تعديل سرعة وإعدادات التجربة في الأمان والميزات" : "Edit trial rate & settings in Security & Advanced"}</span>
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {/* Either redirect notice (userman_radius) OR full Hotspot User Profiles CRUD */}
      {authMode === "userman_radius" ? (
        <div className="bg-emerald-950/20 border border-emerald-800/60 rounded-xl p-6 text-center space-y-3">
          <div className="inline-flex p-3 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-400">
            <ShieldCheck className="w-6 h-6" aria-hidden="true" />
          </div>
          <h3 className="text-sm font-semibold text-slate-100">
            {isAr
              ? "السرعات والكوتا والصلاحيات تُدار حالياً من تبويب اليوزر مانجر"
              : "Speeds, Quotas & Validity are Managed in User Manager"}
          </h3>
          <p className="text-xs text-slate-300 max-w-lg mx-auto leading-relaxed">
            {isAr
              ? "في وضع اليوزر مانجر (RADIUS)، لا نضيف سرعات محلية مكررة على الهوتسبوت لأن RADIUS يرسل Mikrotik-Rate-Limit تلقائياً. يمكنك إضافة باقاتك وجدول الأوقات من تبويب اليوزر مانجر، أو التبديل إلى الوضع الهجين إذا احتجت بروفايلات محلية."
              : "In User Manager RADIUS mode, duplicate local speed profiles are omitted because RADIUS supplies Mikrotik-Rate-Limit automatically. Configure limitations and plans in User Manager, or switch to Hybrid mode."}
          </p>
          <div className="flex justify-center gap-2 flex-wrap pt-1">
            <button
              type="button"
              onClick={() => onNavigateTab(4)}
              className="min-h-[44px] sm:min-h-[40px] inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-semibold transition"
            >
              <span>{isAr ? "فتح إعدادات وباقات اليوزر مانجر" : "Open User Manager & Plans"}</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {profiles.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl">
              <p className="text-slate-300 text-sm">
                {isAr ? "لم تقم بإضافة بروفايلات هوتسبوت بعد." : "No Hotspot user profiles defined yet."}
              </p>
            </div>
          ) : (
            profiles.map((profile, idx) => {
              const isEditing = editingIndex === idx;
              const current = isEditing && tempProfile ? tempProfile : profile;
              const fid = `prof-${profile.id}`;
              const nameIssues = issues.filter((i) => i.tab === 3 && i.field === `profile_${idx}_name`);
              const rateIssues = issues.filter((i) => i.tab === 3 && i.field === `profile_${idx}_rate`);
              const profIssues = [...nameIssues, ...rateIssues];
              const hasAdvancedConfigured = Boolean(
                current.burstDownload ||
                current.burstUpload ||
                current.minDownload ||
                current.minUpload ||
                current.addressPool ||
                current.addressList ||
                current.transparentProxy
              );
              const advSummaryTags: string[] = [];
              if (current.burstDownload || current.burstUpload) {
                advSummaryTags.push(`Burst ${current.burstUpload || "-"}/${current.burstDownload || "-"}`);
              }
              if (current.minDownload || current.minUpload) {
                advSummaryTags.push(`MIR ${current.minUpload || "-"}/${current.minDownload || "-"}`);
              }
              if (current.addressList) {
                advSummaryTags.push(`List:${current.addressList}`);
              }
              if (current.priority && current.priority !== 8) {
                advSummaryTags.push(`P${current.priority}`);
              }

              return (
                <div
                  key={profile.id}
                  className={`border rounded-xl p-4 transition-all duration-200 ${
                    isEditing
                      ? "bg-slate-800/80 border-emerald-500/60 shadow-md"
                      : profIssues.length > 0
                        ? "bg-slate-900/40 border-red-800/80 hover:bg-slate-900/60"
                        : "bg-slate-900/40 border-slate-800 hover:bg-slate-900/60"
                  }`}
                >
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="bg-amber-950/50 border border-amber-700/70 text-amber-200 rounded-lg px-3 py-2 text-xs">
                        {isAr
                          ? "تعديل غير محفوظ: اضغط حفظ لتطبيق التغيير على السكربت"
                          : "Unsaved edit: click Save to apply changes to the script"}
                      </div>

                      {/* Core Identity & Shared Users */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                        <div>
                          <label htmlFor={`${fid}-name`} className="text-xs text-slate-300 mb-1 block">
                            {isAr ? "اسم البروفايل في ميكروتيك" : "Profile Name (MikroTik)"}
                          </label>
                          <input
                            id={`${fid}-name`}
                            name={`profile_${idx}_name`}
                            dir="ltr"
                            type="text"
                            aria-invalid={nameIssues.length > 0}
                            className={`w-full min-h-[44px] sm:min-h-[38px] bg-slate-900 border text-slate-100 rounded-lg px-2.5 py-1.5 text-sm font-mono focus:ring-2 focus:ring-emerald-400 ${
                              nameIssues.length > 0 ? "border-red-500" : "border-slate-700"
                            }`}
                            value={current.name}
                            onChange={(e) => setTempProfile({ ...tempProfile!, name: e.target.value })}
                          />
                          {nameIssues.map((issue) => (
                            <p key={issue.id} className="text-[11px] text-red-300 mt-1">
                              {isAr ? issue.messageAr : issue.messageEn}
                            </p>
                          ))}
                        </div>
                        <div>
                          <label htmlFor={`${fid}-display`} className="text-xs text-slate-300 mb-1 block">
                            {isAr ? "الوصف التعريفي" : "Description / Label"}
                          </label>
                          <input
                            id={`${fid}-display`}
                            name="profileDisplayName"
                            dir="auto"
                            type="text"
                            className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-emerald-400"
                            value={current.displayName}
                            onChange={(e) => setTempProfile({ ...tempProfile!, displayName: e.target.value })}
                          />
                        </div>
                        <div>
                          <label htmlFor={`${fid}-shared`} className="text-xs text-slate-300 mb-1 block">
                            {isAr ? "الأجهزة المتزامنة (Shared Users)" : "Shared Users"}
                          </label>
                          <input
                            id={`${fid}-shared`}
                            name="profileSharedUsers"
                            dir="ltr"
                            type="number"
                            min="1"
                            className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-sm font-mono focus:ring-2 focus:ring-emerald-400"
                            value={current.sharedUsers}
                            onChange={(e) => setTempProfile({ ...tempProfile!, sharedUsers: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                          />
                        </div>
                      </div>

                      {/* Core Speeds & Local Card Validity */}
                      <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                          <div>
                            <label htmlFor={`${fid}-ul`} className="text-xs text-slate-200 font-medium mb-1 block">
                              {isAr ? "الرفع RX (Upload Limit)" : "Upload RX (Client Upload)"}
                            </label>
                            <input
                              id={`${fid}-ul`}
                              name={`profile_${idx}_rate`}
                              dir="ltr"
                              type="text"
                              placeholder="512k"
                              aria-invalid={rateIssues.length > 0}
                              className={`w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border text-slate-100 rounded-lg px-2.5 py-1.5 text-sm font-mono focus:ring-2 focus:ring-emerald-400 ${
                                rateIssues.length > 0 ? "border-red-500" : "border-slate-700"
                              }`}
                              value={current.uploadLimit}
                              onChange={(e) => setTempProfile({ ...tempProfile!, uploadLimit: e.target.value })}
                            />
                          </div>
                          <div>
                            <label htmlFor={`${fid}-dl`} className="text-xs text-slate-200 font-medium mb-1 block">
                              {isAr ? "التحميل TX (Download Limit)" : "Download TX (Client Download)"}
                            </label>
                            <input
                              id={`${fid}-dl`}
                              name="profileDownload"
                              dir="ltr"
                              type="text"
                              placeholder="2M"
                              aria-invalid={rateIssues.length > 0}
                              className={`w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border text-slate-100 rounded-lg px-2.5 py-1.5 text-sm font-mono focus:ring-2 focus:ring-emerald-400 ${
                                rateIssues.length > 0 ? "border-red-500" : "border-slate-700"
                              }`}
                              value={current.downloadLimit}
                              onChange={(e) => setTempProfile({ ...tempProfile!, downloadLimit: e.target.value })}
                            />
                          </div>
                          <div>
                            <label htmlFor={`${fid}-local-val`} className="text-xs text-slate-200 mb-1 block">
                              {isAr ? "صلاحية الكارت محلياً (فارغ = معطّل)" : "Local Validity (empty = off)"}
                            </label>
                            <input
                              id={`${fid}-local-val`}
                              name="profileLocalValidity"
                              dir="ltr"
                              type="text"
                              placeholder="e.g. 7d, 12h, 30d"
                              className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400"
                              value={current.localValidity || ""}
                              onChange={(e) => setTempProfile({ ...tempProfile!, localValidity: e.target.value })}
                            />
                          </div>
                          <div>
                            <label htmlFor={`${fid}-local-act`} className="text-xs text-slate-200 mb-1 block">
                              {isAr ? "الإجراء عند انتهاء الصلاحية" : "Action on Expiry"}
                            </label>
                            <select
                              id={`${fid}-local-act`}
                              name="profileLocalExpiryAction"
                              disabled={!current.localValidity?.trim()}
                              className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs disabled:opacity-50"
                              value={current.localExpiryAction || "remove"}
                              onChange={(e) => setTempProfile({ ...tempProfile!, localExpiryAction: e.target.value as "remove" | "disable" })}
                            >
                              <option value="remove">{isAr ? "حذف المستخدم وطرده (remove)" : "Remove user & kick session"}</option>
                              <option value="disable">{isAr ? "تعطيل المستخدم فقط (disable)" : "Disable user & kick session"}</option>
                            </select>
                          </div>
                        </div>
                        {rateIssues.map((issue) => (
                          <p key={issue.id} className="text-[11px] text-red-300">
                            {isAr ? issue.messageAr : issue.messageEn}
                          </p>
                        ))}
                      </div>

                      {/* Progressive Disclosure: 15+ Advanced & Tuning Fields */}
                      <details className="group bg-slate-900/50 border border-slate-700/70 rounded-xl">
                        <summary className="cursor-pointer select-none px-3.5 py-2.5 text-xs font-medium text-slate-200 flex items-center justify-between gap-2 min-h-[44px] list-none">
                          <span>
                            {isAr
                              ? "إعدادات متقدمة: البيرست، MIR، المهلة الزمنية، وقوائم العناوين"
                              : "Advanced Settings: Burst, MIR, Timeouts & Address Lists"}
                          </span>
                          <span className="flex items-center gap-2">
                            {hasAdvancedConfigured && (
                              <span dir="ltr" className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-700/60 text-emerald-300">
                                {advSummaryTags.length > 0 ? advSummaryTags.slice(0, 2).join(" | ") : (isAr ? "مخصّص" : "Configured")}
                              </span>
                            )}
                            <ChevronDown className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
                          </span>
                        </summary>

                        <div className="p-3.5 pt-2 space-y-3 border-t border-slate-800/80">
                          {/* Minimum Guaranteed Rate (MIR / limit-at) */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                            <div>
                              <label htmlFor={`${fid}-min-ul`} className="text-xs text-slate-300 mb-1 block">
                                {isAr ? "أدنى رفع مضمون (Min RX)" : "Min Upload MIR (RX)"}
                              </label>
                              <input
                                id={`${fid}-min-ul`}
                                name="profileMinUpload"
                                dir="ltr"
                                type="text"
                                placeholder="256k"
                                className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-sm font-mono focus:ring-2 focus:ring-emerald-400"
                                value={current.minUpload || ""}
                                onChange={(e) => setTempProfile({ ...tempProfile!, minUpload: e.target.value })}
                              />
                            </div>
                            <div>
                              <label htmlFor={`${fid}-min-dl`} className="text-xs text-slate-300 mb-1 block">
                                {isAr ? "أدنى تحميل مضمون (Min TX)" : "Min Download MIR (TX)"}
                              </label>
                              <input
                                id={`${fid}-min-dl`}
                                name="profileMinDownload"
                                dir="ltr"
                                type="text"
                                placeholder="1M"
                                className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-sm font-mono focus:ring-2 focus:ring-emerald-400"
                                value={current.minDownload || ""}
                                onChange={(e) => setTempProfile({ ...tempProfile!, minDownload: e.target.value })}
                              />
                            </div>
                          </div>

                          {/* Burst Acceleration */}
                          <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-2.5">
                            <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                              <Zap className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>{isAr ? "تسريع البيرست (Burst - اختياري)" : "Burst Acceleration (Optional)"}</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end text-xs">
                              <div>
                                <label htmlFor={`${fid}-burst-ul`} className="text-slate-300 mb-1 block">{isAr ? "Burst رفع (RX)" : "Burst RX"}</label>
                                <input
                                  id={`${fid}-burst-ul`}
                                  name="profileBurstUl"
                                  dir="ltr"
                                  type="text"
                                  placeholder="1M"
                                  className="w-full min-h-[44px] sm:min-h-[36px] bg-slate-800 border border-slate-700 text-slate-100 rounded px-2 py-1 font-mono text-xs focus:ring-2 focus:ring-emerald-400"
                                  value={current.burstUpload || ""}
                                  onChange={(e) => setTempProfile({ ...tempProfile!, burstUpload: e.target.value })}
                                />
                              </div>
                              <div>
                                <label htmlFor={`${fid}-burst-dl`} className="text-slate-300 mb-1 block">{isAr ? "Burst تحميل (TX)" : "Burst TX"}</label>
                                <input
                                  id={`${fid}-burst-dl`}
                                  name="profileBurstDl"
                                  dir="ltr"
                                  type="text"
                                  placeholder="4M"
                                  className="w-full min-h-[44px] sm:min-h-[36px] bg-slate-800 border border-slate-700 text-slate-100 rounded px-2 py-1 font-mono text-xs focus:ring-2 focus:ring-emerald-400"
                                  value={current.burstDownload || ""}
                                  onChange={(e) => setTempProfile({ ...tempProfile!, burstDownload: e.target.value })}
                                />
                              </div>
                              <div>
                                <label htmlFor={`${fid}-thresh-ul`} className="text-slate-300 mb-1 block">{isAr ? "حد البيرست RX" : "Threshold RX"}</label>
                                <input
                                  id={`${fid}-thresh-ul`}
                                  name="profileThreshUl"
                                  dir="ltr"
                                  type="text"
                                  placeholder="384k"
                                  className="w-full min-h-[44px] sm:min-h-[36px] bg-slate-800 border border-slate-700 text-slate-100 rounded px-2 py-1 font-mono text-xs focus:ring-2 focus:ring-emerald-400"
                                  value={current.burstThresholdUpload || ""}
                                  onChange={(e) => setTempProfile({ ...tempProfile!, burstThresholdUpload: e.target.value })}
                                />
                              </div>
                              <div>
                                <label htmlFor={`${fid}-thresh-dl`} className="text-slate-300 mb-1 block">{isAr ? "حد البيرست TX" : "Threshold TX"}</label>
                                <input
                                  id={`${fid}-thresh-dl`}
                                  name="profileThreshDl"
                                  dir="ltr"
                                  type="text"
                                  placeholder="1500k"
                                  className="w-full min-h-[44px] sm:min-h-[36px] bg-slate-800 border border-slate-700 text-slate-100 rounded px-2 py-1 font-mono text-xs focus:ring-2 focus:ring-emerald-400"
                                  value={current.burstThresholdDownload || ""}
                                  onChange={(e) => setTempProfile({ ...tempProfile!, burstThresholdDownload: e.target.value })}
                                />
                              </div>
                              <div>
                                <label htmlFor={`${fid}-time-ul`} className="text-slate-300 mb-1 block">{isAr ? "زمن بيرست RX" : "Burst Time RX"}</label>
                                <input
                                  id={`${fid}-time-ul`}
                                  name="profileBurstTimeUl"
                                  dir="ltr"
                                  type="text"
                                  placeholder="8s"
                                  className="w-full min-h-[44px] sm:min-h-[36px] bg-slate-800 border border-slate-700 text-slate-100 rounded px-2 py-1 font-mono text-xs focus:ring-2 focus:ring-emerald-400"
                                  value={current.burstTimeUpload || "8s"}
                                  onChange={(e) => setTempProfile({ ...tempProfile!, burstTimeUpload: e.target.value })}
                                />
                              </div>
                              <div>
                                <label htmlFor={`${fid}-time-dl`} className="text-slate-300 mb-1 block">{isAr ? "زمن بيرست TX" : "Burst Time TX"}</label>
                                <input
                                  id={`${fid}-time-dl`}
                                  name="profileBurstTimeDl"
                                  dir="ltr"
                                  type="text"
                                  placeholder="8s"
                                  className="w-full min-h-[44px] sm:min-h-[36px] bg-slate-800 border border-slate-700 text-slate-100 rounded px-2 py-1 font-mono text-xs focus:ring-2 focus:ring-emerald-400"
                                  value={current.burstTimeDownload || "8s"}
                                  onChange={(e) => setTempProfile({ ...tempProfile!, burstTimeDownload: e.target.value })}
                                />
                              </div>
                              <div className="col-span-2">
                                <label htmlFor={`${fid}-priority`} className="text-slate-300 mb-1 block">{isAr ? "أولوية الطابور (Priority 1-8)" : "Queue Priority (1-8)"}</label>
                                <select
                                  id={`${fid}-priority`}
                                  name="profilePriority"
                                  className="w-full min-h-[44px] sm:min-h-[36px] bg-slate-800 border border-slate-700 text-slate-100 rounded px-2 py-1 font-mono text-xs focus:ring-2 focus:ring-emerald-400"
                                  value={current.priority || 8}
                                  onChange={(e) => setTempProfile({ ...tempProfile!, priority: parseInt(e.target.value, 10) || 8 })}
                                >
                                  {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                                    <option key={p} value={p}>
                                      {p} {p === 1 ? (isAr ? "(الأعلى)" : "(Highest)") : p === 8 ? (isAr ? "(الافتراضي)" : "(Default)") : ""}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* Hotspot Timeouts */}
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                            <div>
                              <label htmlFor={`${fid}-session-to`} className="text-xs text-slate-300 mb-1 block">
                                {isAr ? "مهلة الجلسة (Session Timeout)" : "Session Timeout"}
                              </label>
                              <input
                                id={`${fid}-session-to`}
                                name="profileSessionTimeout"
                                dir="ltr"
                                type="text"
                                placeholder="00:00:00"
                                className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400"
                                value={current.sessionTimeout}
                                onChange={(e) => setTempProfile({ ...tempProfile!, sessionTimeout: e.target.value })}
                              />
                            </div>
                            <div>
                              <label htmlFor={`${fid}-idle-to`} className="text-xs text-slate-300 mb-1 block">
                                {isAr ? "مهلة الخمول (Idle Timeout)" : "Idle Timeout"}
                              </label>
                              <input
                                id={`${fid}-idle-to`}
                                name="profileIdleTimeout"
                                dir="ltr"
                                type="text"
                                placeholder="00:15:00"
                                className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400"
                                value={current.idleTimeout}
                                onChange={(e) => setTempProfile({ ...tempProfile!, idleTimeout: e.target.value })}
                              />
                            </div>
                            <div>
                              <label htmlFor={`${fid}-keepalive-to`} className="text-xs text-slate-300 mb-1 block">
                                {isAr ? "Keepalive Timeout" : "Keepalive Timeout"}
                              </label>
                              <input
                                id={`${fid}-keepalive-to`}
                                name="profileKeepaliveTimeout"
                                dir="ltr"
                                type="text"
                                placeholder="00:02:00"
                                className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400"
                                value={current.keepaliveTimeout}
                                onChange={(e) => setTempProfile({ ...tempProfile!, keepaliveTimeout: e.target.value })}
                              />
                            </div>
                            <div>
                              <label htmlFor={`${fid}-autorefresh`} className="text-xs text-slate-300 mb-1 block">
                                {isAr ? "Status Autorefresh" : "Status Autorefresh"}
                              </label>
                              <input
                                id={`${fid}-autorefresh`}
                                name="profileAutorefresh"
                                dir="ltr"
                                type="text"
                                placeholder="1m"
                                className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400"
                                value={current.statusAutorefresh}
                                onChange={(e) => setTempProfile({ ...tempProfile!, statusAutorefresh: e.target.value })}
                              />
                            </div>
                          </div>

                          {/* Advanced Hotspot Policy: Pool, Address List, Queue Ordering, MAC Cookie */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                            <div>
                              <label htmlFor={`${fid}-pool`} className="text-xs text-slate-300 mb-1 block">
                                {isAr ? "Address Pool (اختياري)" : "Address Pool (Optional)"}
                              </label>
                              <input
                                id={`${fid}-pool`}
                                name="profileAddressPool"
                                dir="ltr"
                                type="text"
                                placeholder="none"
                                className="w-full min-h-[44px] sm:min-h-[36px] bg-slate-800 border border-slate-700 text-slate-100 rounded px-2 py-1 text-xs font-mono focus:ring-2 focus:ring-emerald-400"
                                value={current.addressPool || ""}
                                onChange={(e) => setTempProfile({ ...tempProfile!, addressPool: e.target.value })}
                              />
                            </div>
                            <div>
                              <label htmlFor={`${fid}-addrlist`} className="text-xs text-slate-300 mb-1 block">
                                {isAr ? "Firewall Address-List" : "Firewall Address-List"}
                              </label>
                              <input
                                id={`${fid}-addrlist`}
                                name="profileAddressList"
                                dir="ltr"
                                type="text"
                                placeholder="vip_clients"
                                className="w-full min-h-[44px] sm:min-h-[36px] bg-slate-800 border border-slate-700 text-slate-100 rounded px-2 py-1 text-xs font-mono focus:ring-2 focus:ring-emerald-400"
                                value={current.addressList || ""}
                                onChange={(e) => setTempProfile({ ...tempProfile!, addressList: e.target.value })}
                              />
                            </div>
                            <div>
                              <label htmlFor={`${fid}-insert-before`} className="text-xs text-slate-300 mb-1 block">
                                {isAr ? "ترتيب الطابور (Insert Queue)" : "Insert Queue Before"}
                              </label>
                              <select
                                id={`${fid}-insert-before`}
                                name="profileInsertQueueBefore"
                                dir="ltr"
                                className="w-full min-h-[44px] sm:min-h-[36px] bg-slate-800 border border-slate-700 text-slate-100 rounded px-2 py-1 text-xs font-mono focus:ring-2 focus:ring-emerald-400"
                                value={current.insertQueueBefore || "first"}
                                onChange={(e) => setTempProfile({ ...tempProfile!, insertQueueBefore: e.target.value as "first" | "bottom" })}
                              >
                                <option value="first">first</option>
                                <option value="bottom">bottom</option>
                              </select>
                            </div>
                            <div>
                              <label htmlFor={`${fid}-mac-to`} className="text-xs text-slate-300 mb-1 block">
                                {isAr ? "مدة MAC Cookie" : "MAC Cookie Timeout"}
                              </label>
                              <input
                                id={`${fid}-mac-to`}
                                name="profileMacCookieTimeout"
                                dir="ltr"
                                type="text"
                                placeholder="3d"
                                disabled={!current.addMacCookie}
                                className="w-full min-h-[44px] sm:min-h-[36px] bg-slate-800 border border-slate-700 text-slate-100 rounded px-2 py-1 text-xs font-mono focus:ring-2 focus:ring-emerald-400 disabled:opacity-50"
                                value={current.macCookieTimeout}
                                onChange={(e) => setTempProfile({ ...tempProfile!, macCookieTimeout: e.target.value })}
                              />
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-xs">
                            <label htmlFor={`${fid}-add-mac`} className="min-h-[44px] sm:min-h-[32px] flex items-center gap-2 cursor-pointer text-slate-200">
                              <input
                                id={`${fid}-add-mac`}
                                name="profileAddMacCookie"
                                type="checkbox"
                                className="w-4 h-4 accent-emerald-500"
                                checked={current.addMacCookie}
                                onChange={(e) => setTempProfile({ ...tempProfile!, addMacCookie: e.target.checked })}
                              />
                              <span>add-mac-cookie</span>
                            </label>
                            <label htmlFor={`${fid}-proxy`} className="min-h-[44px] sm:min-h-[32px] flex items-center gap-2 cursor-pointer text-slate-200">
                              <input
                                id={`${fid}-proxy`}
                                name="profileTransparentProxy"
                                type="checkbox"
                                className="w-4 h-4 accent-emerald-500"
                                checked={Boolean(current.transparentProxy)}
                                onChange={(e) => setTempProfile({ ...tempProfile!, transparentProxy: e.target.checked })}
                              />
                              <span>transparent-proxy</span>
                            </label>
                          </div>
                        </div>
                      </details>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={cancelEdit}
                          type="button"
                          className="min-h-[44px] sm:min-h-[38px] text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg transition"
                        >
                          {isAr ? "إلغاء" : "Cancel"}
                        </button>
                        <button
                          onClick={() => saveEdit(idx)}
                          type="button"
                          className="min-h-[44px] sm:min-h-[38px] text-xs px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg font-semibold transition"
                        >
                          {isAr ? "حفظ التعديلات" : "Save Changes"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display Mode View */
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span dir="ltr" className="font-mono bg-slate-800 text-slate-100 px-2 py-0.5 rounded text-xs">
                            {profile.name}
                          </span>
                          <h3 className="font-semibold text-slate-100">
                            <bdi dir="auto">{profile.displayName}</bdi>
                          </h3>
                          {profIssues.length > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-950/70 border border-red-700/80 text-red-200 text-[11px] font-medium">
                              <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                              <span>{isAr ? `${profIssues.length} خطأ` : `${profIssues.length} error`}</span>
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
                          <div>
                            {isAr ? "الرفع RX:" : "Upload RX:"}{" "}
                            <span dir="ltr" className="text-emerald-400 font-mono">{profile.uploadLimit}</span>
                          </div>
                          <div>
                            {isAr ? "التحميل TX:" : "Download TX:"}{" "}
                            <span dir="ltr" className="text-emerald-400 font-mono">{profile.downloadLimit}</span>
                          </div>
                          {(profile.minUpload || profile.minDownload) && (
                            <div>
                              {isAr ? "الأدنى MIR:" : "Min:"}{" "}
                              <span dir="ltr" className="text-cyan-300 font-mono">
                                {profile.minUpload || "0"}/{profile.minDownload || "0"}
                              </span>
                            </div>
                          )}
                          {profile.burstDownload && (
                            <div className="flex items-center gap-1 text-amber-300">
                              <Zap className="w-3 h-3" aria-hidden="true" />
                              <bdi dir="ltr" className="font-mono">
                                Burst: {profile.burstUpload}/{profile.burstDownload} ({profile.burstTimeDownload || "8s"})
                                {profile.priority ? ` · P${profile.priority}` : ""}
                              </bdi>
                            </div>
                          )}
                          <div>
                            {isAr ? "المشتركون:" : "Shared:"}{" "}
                            <span className="text-slate-200 font-mono">{profile.sharedUsers}</span>
                          </div>
                          {profile.addressList && (
                            <div>
                              {isAr ? "قائمة:" : "List:"}{" "}
                              <span dir="ltr" className="text-slate-200 font-mono">{profile.addressList}</span>
                            </div>
                          )}
                          {profile.localValidity?.trim() && (
                            <div>
                              <bdi dir="ltr" className="text-emerald-300 font-mono">
                                on-login: {profile.localValidity} ({profile.localExpiryAction || "remove"})
                              </bdi>
                            </div>
                          )}
                        </div>
                        {profIssues.map((issue) => (
                          <p key={issue.id} className="text-[11px] text-red-300">
                            {isAr ? issue.messageAr : issue.messageEn}
                          </p>
                        ))}
                      </div>

                      <div className="flex gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => startEdit(idx)}
                          aria-label={isAr ? `تعديل ${profile.name}` : `Edit ${profile.name}`}
                          className="min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px] inline-flex items-center justify-center p-2 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded-lg transition"
                          title={isAr ? "تعديل" : "Edit"}
                        >
                          <Edit className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteIdx(idx)}
                          aria-label={isAr ? `حذف ${profile.name}` : `Delete ${profile.name}`}
                          className="min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px] inline-flex items-center justify-center p-2 hover:bg-red-950/50 text-slate-300 hover:text-red-300 border border-slate-800 hover:border-red-800 rounded-lg transition"
                          title={isAr ? "حذف" : "Delete"}
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteIdx !== null && Boolean(profiles[confirmDeleteIdx])}
        dir={isAr ? "rtl" : "ltr"}
        title={isAr ? "حذف بروفايل الهوتسبوت" : "Delete Hotspot Profile"}
        description={
          confirmDeleteIdx !== null && profiles[confirmDeleteIdx]
            ? isAr
              ? `هل أنت متأكد من حذف بروفايل الهوتسبوت "${profiles[confirmDeleteIdx].name}"؟`
              : `Are you sure you want to delete Hotspot user profile "${profiles[confirmDeleteIdx].name}"?`
            : ""
        }
        confirmLabel={isAr ? "حذف" : "Delete"}
        cancelLabel={isAr ? "إلغاء" : "Cancel"}
        onConfirm={() => {
          if (confirmDeleteIdx !== null) {
            if (editingIndex === confirmDeleteIdx) {
              setEditingIndex(null);
              setTempProfile(null);
            } else if (editingIndex !== null && editingIndex > confirmDeleteIdx) {
              setEditingIndex(editingIndex - 1);
            }
            onDelete(confirmDeleteIdx);
          }
          setConfirmDeleteIdx(null);
        }}
        onCancel={() => setConfirmDeleteIdx(null)}
      />
    </div>
  );
}
