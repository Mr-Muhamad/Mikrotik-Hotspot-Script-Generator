/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from "react";
import type {
  HotspotConfig,
  HotspotUserProfile,
  ResetCountersInterval,
  UserManagerLimitation,
} from "../../types";
import type { ValidationIssue } from "../../utils/validation";
import { Plus, Trash2, Edit, Copy, Zap, ChevronDown, AlertTriangle } from "lucide-react";
import ConfirmDialog from "../ConfirmDialog";

interface Props {
  config: HotspotConfig;
  hotspotProfiles: HotspotUserProfile[];
  onChange: (updates: Partial<HotspotConfig>) => void;
  lang: "ar" | "en";
  onDirtyChange?: (dirty: boolean) => void;
  issues?: ValidationIssue[];
}

export default function UmLimitationsSubTab({
  config,
  hotspotProfiles,
  onChange,
  lang,
  onDirtyChange,
  issues = [],
}: Props) {
  const isAr = lang === "ar";
  const isV7 = config.rosVersion === "v7";
  const umLimitations = config.umLimitations || [];
  const umProfiles = config.umProfiles || [];

  const [editingLimId, setEditingLimId] = useState<string | null>(null);
  const [tempLim, setTempLim] = useState<UserManagerLimitation | null>(null);
  const [confirmDeleteLim, setConfirmDeleteLim] = useState<UserManagerLimitation | null>(null);

  useEffect(() => {
    onDirtyChange?.(editingLimId !== null);
  }, [editingLimId, onDirtyChange]);

  useEffect(() => {
    return () => {
      onDirtyChange?.(false);
    };
  }, [onDirtyChange]);

  const handleAddLimitation = () => {
    const nextNum = umLimitations.length + 1;
    const newLim: UserManagerLimitation = {
      id: `um_lim_${Date.now()}`,
      name: `lim_custom_${nextNum}`,
      rateLimitRx: "512k",
      rateLimitTx: "2M",
      rateLimitMinRx: "256k",
      rateLimitMinTx: "1M",
      rateLimitPriority: 7,
      transferLimitMb: 5120,
      downloadLimitMb: 0,
      uploadLimitMb: 0,
      uptimeLimit: "",
      resetCountersInterval: "disabled",
    };
    onChange({ umLimitations: [...umLimitations, newLim] });
    setEditingLimId(newLim.id);
    setTempLim(newLim);
  };

  const handleCloneFromHotspot = () => {
    const existingNames = new Set(umLimitations.map((l) => l.name.toLowerCase()));
    const cloned: UserManagerLimitation[] = [];
    hotspotProfiles.forEach((hp) => {
      const targetName = `lim_${hp.name}`;
      if (!existingNames.has(targetName.toLowerCase())) {
        cloned.push({
          id: `um_lim_${Date.now()}_${hp.id}`,
          name: targetName,
          rateLimitRx: hp.uploadLimit,
          rateLimitTx: hp.downloadLimit,
          rateLimitMinRx: hp.minUpload,
          rateLimitMinTx: hp.minDownload,
          rateLimitBurstRx: hp.burstUpload,
          rateLimitBurstTx: hp.burstDownload,
          rateLimitBurstThresholdRx: hp.burstThresholdUpload,
          rateLimitBurstThresholdTx: hp.burstThresholdDownload,
          rateLimitBurstTimeRx: hp.burstTimeUpload,
          rateLimitBurstTimeTx: hp.burstTimeDownload,
          rateLimitPriority: hp.priority || 8,
          transferLimitMb: 0,
          downloadLimitMb: 0,
          uploadLimitMb: 0,
          uptimeLimit: "",
          resetCountersInterval: "disabled",
        });
      }
    });
    if (cloned.length > 0) {
      onChange({ umLimitations: [...umLimitations, ...cloned] });
    }
  };

  const saveLimitation = () => {
    if (!tempLim) return;
    onChange({
      umLimitations: umLimitations.map((l) => (l.id === tempLim.id ? tempLim : l)),
    });
    setEditingLimId(null);
    setTempLim(null);
  };

  const deleteLimitation = (id: string) => {
    onChange({
      umLimitations: umLimitations.filter((l) => l.id !== id),
    });
    if (editingLimId === id) {
      setEditingLimId(null);
      setTempLim(null);
    }
  };

  const affectedProfiles = confirmDeleteLim
    ? umProfiles.filter((p) => p.limitations.some((pl) => pl.limitationId === confirmDeleteLim.id))
    : [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <p className="text-xs text-slate-300">
          {isAr
            ? "تذكر: في MikroTik يكون RX = سرعة الرفع للمشترك (Upload) و TX = سرعة التحميل (Download)."
            : "Router perspective: RX = Client Upload, TX = Client Download."}
        </p>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleCloneFromHotspot}
            className="min-h-[44px] sm:min-h-[38px] flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition"
          >
            <Copy className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            {isAr ? "استيراد سرعات الهوتسبوت" : "Clone Hotspot Speeds"}
          </button>
          <button
            type="button"
            onClick={handleAddLimitation}
            className="min-h-[44px] sm:min-h-[38px] flex items-center gap-1.5 text-xs px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg font-semibold transition"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            {isAr ? "إضافة قيد سرعة" : "Add Limitation"}
          </button>
        </div>
      </div>

      {umLimitations.map((lim, idx) => {
        const isEditing = editingLimId === lim.id;
        const cur = isEditing && tempLim ? tempLim : lim;
        const lid = `umlim-${lim.id}`;
        const nameIssues = issues.filter((i) => i.tab === 4 && i.field === `umLim_${idx}_name`);
        const rateIssues = issues.filter((i) => i.tab === 4 && i.field === `umLim_${idx}_rate`);
        const limIssues = [...nameIssues, ...rateIssues];
        const hasAdvConfigured = Boolean(
          cur.rateLimitMinRx ||
          cur.rateLimitMinTx ||
          cur.rateLimitBurstRx ||
          cur.rateLimitBurstTx ||
          cur.downloadLimitMb ||
          cur.uploadLimitMb ||
          (!isV7 && (cur.v6GroupName || cur.v6IpPool || cur.v6AddressList))
        );

        return (
          <div
            key={lim.id}
            className={`border rounded-xl p-4 transition-all ${
              isEditing
                ? "bg-slate-800/80 border-emerald-500/60"
                : limIssues.length > 0
                  ? "bg-slate-900/40 border-red-800/80"
                  : "bg-slate-900/40 border-slate-800"
            }`}
          >
            {isEditing && tempLim ? (
              <div className="space-y-4 text-xs">
                <div className="bg-amber-950/50 border border-amber-700/70 text-amber-200 rounded-lg px-3 py-2 text-xs">
                  {isAr
                    ? "تعديل غير محفوظ: اضغط حفظ لتطبيق التغيير على السكربت"
                    : "Unsaved edit: click Save to apply changes to the script"}
                </div>

                {/* Core Speeds */}
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                    <div>
                      <label htmlFor={`${lid}-name`} className="text-slate-300 mb-1 block">{isAr ? "اسم القيد (Limitation Name)" : "Limitation Name"}</label>
                      <input
                        id={`${lid}-name`}
                        name={`umLim_${idx}_name`}
                        dir="ltr"
                        type="text"
                        aria-invalid={nameIssues.length > 0}
                        className={`w-full min-h-[44px] sm:min-h-[38px] bg-slate-900 border text-slate-100 rounded-lg px-2.5 py-1.5 font-mono focus:ring-2 focus:ring-emerald-400 ${
                          nameIssues.length > 0 ? "border-red-500" : "border-slate-700"
                        }`}
                        value={cur.name}
                        onChange={(e) => setTempLim({ ...tempLim, name: e.target.value })}
                      />
                      {nameIssues.map((issue) => (
                        <p key={issue.id} className="text-[11px] text-red-300 mt-1">
                          {isAr ? issue.messageAr : issue.messageEn}
                        </p>
                      ))}
                    </div>
                    <div>
                      <label htmlFor={`${lid}-rx`} className="text-slate-300 mb-1 block">{isAr ? "الرفع (rate-limit-rx)" : "Upload RX (rate-limit-rx)"}</label>
                      <input
                        id={`${lid}-rx`}
                        name={`umLim_${idx}_rate`}
                        dir="ltr"
                        type="text"
                        aria-invalid={rateIssues.length > 0}
                        className={`w-full min-h-[44px] sm:min-h-[38px] bg-slate-900 border text-slate-100 rounded-lg px-2.5 py-1.5 font-mono focus:ring-2 focus:ring-emerald-400 ${
                          rateIssues.length > 0 ? "border-red-500" : "border-slate-700"
                        }`}
                        value={cur.rateLimitRx}
                        onChange={(e) => setTempLim({ ...tempLim, rateLimitRx: e.target.value })}
                      />
                    </div>
                    <div>
                      <label htmlFor={`${lid}-tx`} className="text-slate-300 mb-1 block">{isAr ? "التحميل (rate-limit-tx)" : "Download TX (rate-limit-tx)"}</label>
                      <input
                        id={`${lid}-tx`}
                        dir="ltr"
                        type="text"
                        aria-invalid={rateIssues.length > 0}
                        className={`w-full min-h-[44px] sm:min-h-[38px] bg-slate-900 border text-slate-100 rounded-lg px-2.5 py-1.5 font-mono focus:ring-2 focus:ring-emerald-400 ${
                          rateIssues.length > 0 ? "border-red-500" : "border-slate-700"
                        }`}
                        value={cur.rateLimitTx}
                        onChange={(e) => setTempLim({ ...tempLim, rateLimitTx: e.target.value })}
                      />
                    </div>
                  </div>
                  {rateIssues.map((issue) => (
                    <p key={issue.id} className="text-[11px] text-red-300">
                      {isAr ? issue.messageAr : issue.messageEn}
                    </p>
                  ))}
                </div>

                {/* Quotas & Uptime */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                  <div>
                    <label htmlFor={`${lid}-transfer`} className="text-slate-200 mb-1 block">
                      {isAr ? "كوتا إجمالية (Transfer MB)" : "Transfer Limit (MB)"}
                    </label>
                    <input
                      id={`${lid}-transfer`}
                      dir="ltr"
                      type="number"
                      min="0"
                      className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded px-2.5 py-1 font-mono focus:ring-2 focus:ring-emerald-400"
                      value={cur.transferLimitMb || 0}
                      onChange={(e) => setTempLim({ ...tempLim, transferLimitMb: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                    />
                  </div>
                  <div>
                    <label htmlFor={`${lid}-uptime`} className="text-slate-300 mb-1 block">
                      {isAr ? "رصيد الوقت التراكمي (Uptime)" : "Uptime Limit"}
                    </label>
                    <input
                      id={`${lid}-uptime`}
                      dir="ltr"
                      type="text"
                      placeholder="5h or 00:00:00"
                      className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded px-2.5 py-1 font-mono focus:ring-2 focus:ring-emerald-400"
                      value={cur.uptimeLimit || ""}
                      onChange={(e) => setTempLim({ ...tempLim, uptimeLimit: e.target.value })}
                    />
                  </div>
                </div>

                {/* v7 Auto Reset Counters */}
                {isV7 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end bg-emerald-950/20 p-3 rounded-lg border border-emerald-800/40">
                    <div>
                      <label htmlFor={`${lid}-reset-int`} className="text-emerald-300 mb-1 block">
                        {isAr ? "تجديد العدادات تلقائياً (v7 Reset Counters)" : "Auto Reset Counters Interval (v7)"}
                      </label>
                      <select
                        id={`${lid}-reset-int`}
                        dir="ltr"
                        className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-900 border border-slate-700 text-slate-100 rounded px-2 py-1 font-mono focus:ring-2 focus:ring-emerald-400"
                        value={cur.resetCountersInterval}
                        onChange={(e) => setTempLim({ ...tempLim, resetCountersInterval: e.target.value as ResetCountersInterval })}
                      >
                        <option value="disabled">disabled</option>
                        <option value="hourly">hourly</option>
                        <option value="daily">daily</option>
                        <option value="weekly">weekly</option>
                        <option value="monthly">monthly</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`${lid}-reset-start`} className="text-slate-300 mb-1 block">
                        {isAr ? "وقت بدء دورة التجديد" : "Reset Start Time"}
                      </label>
                      <input
                        id={`${lid}-reset-start`}
                        dir="ltr"
                        type="text"
                        placeholder="00:00:00"
                        disabled={cur.resetCountersInterval === "disabled"}
                        className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-900 border border-slate-700 text-slate-100 rounded px-2 py-1 font-mono disabled:opacity-50 focus:ring-2 focus:ring-emerald-400"
                        value={cur.resetCountersStartTime || ""}
                        onChange={(e) => setTempLim({ ...tempLim, resetCountersStartTime: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {/* Progressive Disclosure: Advanced Burst & MIR + Split DL/UL MB + v6 Attributes */}
                <details className="group bg-slate-900/50 border border-slate-700/70 rounded-xl">
                  <summary className="cursor-pointer select-none px-3.5 py-2.5 text-xs font-medium text-slate-200 flex items-center justify-between gap-2 min-h-[44px] list-none">
                    <span>
                      {isAr
                        ? "إعدادات متقدمة: البيرست، MIR، كوتا منفصلة وخصائص v6"
                        : "Advanced: Burst, MIR, Split DL/UL Quotas & v6 Attributes"}
                    </span>
                    <span className="flex items-center gap-2">
                      {hasAdvConfigured && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-700/60 text-emerald-300">
                          {isAr ? "مخصّص" : "Configured"}
                        </span>
                      )}
                      <ChevronDown className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
                    </span>
                  </summary>

                  <div className="p-3.5 pt-2 space-y-3 border-t border-slate-800/80">
                    {/* Min Rate & Burst */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                      <div>
                        <label htmlFor={`${lid}-min-rx`} className="text-slate-300 mb-1 block">{isAr ? "أدنى رفع (Min RX)" : "Min RX"}</label>
                        <input
                          id={`${lid}-min-rx`}
                          dir="ltr"
                          type="text"
                          placeholder="256k"
                          className="w-full min-h-[44px] sm:min-h-[36px] bg-slate-800 border border-slate-700 text-slate-100 rounded px-2 py-1 font-mono"
                          value={cur.rateLimitMinRx || ""}
                          onChange={(e) => setTempLim({ ...tempLim, rateLimitMinRx: e.target.value })}
                        />
                      </div>
                      <div>
                        <label htmlFor={`${lid}-min-tx`} className="text-slate-300 mb-1 block">{isAr ? "أدنى تحميل (Min TX)" : "Min TX"}</label>
                        <input
                          id={`${lid}-min-tx`}
                          dir="ltr"
                          type="text"
                          placeholder="1M"
                          className="w-full min-h-[44px] sm:min-h-[36px] bg-slate-800 border border-slate-700 text-slate-100 rounded px-2 py-1 font-mono"
                          value={cur.rateLimitMinTx || ""}
                          onChange={(e) => setTempLim({ ...tempLim, rateLimitMinTx: e.target.value })}
                        />
                      </div>
                      <div>
                        <label htmlFor={`${lid}-burst-rx`} className="text-slate-300 mb-1 block">{isAr ? "Burst رفع (RX)" : "Burst RX"}</label>
                        <input
                          id={`${lid}-burst-rx`}
                          dir="ltr"
                          type="text"
                          placeholder="1M"
                          className="w-full min-h-[44px] sm:min-h-[36px] bg-slate-800 border border-slate-700 text-slate-100 rounded px-2 py-1 font-mono"
                          value={cur.rateLimitBurstRx || ""}
                          onChange={(e) => setTempLim({ ...tempLim, rateLimitBurstRx: e.target.value })}
                        />
                      </div>
                      <div>
                        <label htmlFor={`${lid}-burst-tx`} className="text-slate-300 mb-1 block">{isAr ? "Burst تحميل (TX)" : "Burst TX"}</label>
                        <input
                          id={`${lid}-burst-tx`}
                          dir="ltr"
                          type="text"
                          placeholder="4M"
                          className="w-full min-h-[44px] sm:min-h-[36px] bg-slate-800 border border-slate-700 text-slate-100 rounded px-2 py-1 font-mono"
                          value={cur.rateLimitBurstTx || ""}
                          onChange={(e) => setTempLim({ ...tempLim, rateLimitBurstTx: e.target.value })}
                        />
                      </div>
                      <div>
                        <label htmlFor={`${lid}-thresh-rx`} className="text-slate-300 mb-1 block">{isAr ? "حد البيرست RX" : "Threshold RX"}</label>
                        <input
                          id={`${lid}-thresh-rx`}
                          dir="ltr"
                          type="text"
                          placeholder="384k"
                          className="w-full min-h-[44px] sm:min-h-[36px] bg-slate-800 border border-slate-700 text-slate-100 rounded px-2 py-1 font-mono"
                          value={cur.rateLimitBurstThresholdRx || ""}
                          onChange={(e) => setTempLim({ ...tempLim, rateLimitBurstThresholdRx: e.target.value })}
                        />
                      </div>
                      <div>
                        <label htmlFor={`${lid}-thresh-tx`} className="text-slate-300 mb-1 block">{isAr ? "حد البيرست TX" : "Threshold TX"}</label>
                        <input
                          id={`${lid}-thresh-tx`}
                          dir="ltr"
                          type="text"
                          placeholder="1500k"
                          className="w-full min-h-[44px] sm:min-h-[36px] bg-slate-800 border border-slate-700 text-slate-100 rounded px-2 py-1 font-mono"
                          value={cur.rateLimitBurstThresholdTx || ""}
                          onChange={(e) => setTempLim({ ...tempLim, rateLimitBurstThresholdTx: e.target.value })}
                        />
                      </div>
                      <div>
                        <label htmlFor={`${lid}-btime`} className="text-slate-300 mb-1 block">{isAr ? "زمن البيرست" : "Burst Time"}</label>
                        <input
                          id={`${lid}-btime`}
                          dir="ltr"
                          type="text"
                          placeholder="8s"
                          className="w-full min-h-[44px] sm:min-h-[36px] bg-slate-800 border border-slate-700 text-slate-100 rounded px-2 py-1 font-mono"
                          value={cur.rateLimitBurstTimeRx || "8s"}
                          onChange={(e) => setTempLim({ ...tempLim, rateLimitBurstTimeRx: e.target.value, rateLimitBurstTimeTx: e.target.value })}
                        />
                      </div>
                      <div>
                        <label htmlFor={`${lid}-prio`} className="text-slate-300 mb-1 block">{isAr ? "الأولوية (1-8)" : "Priority (1-8)"}</label>
                        <select
                          id={`${lid}-prio`}
                          className="w-full min-h-[44px] sm:min-h-[36px] bg-slate-800 border border-slate-700 text-slate-100 rounded px-2 py-1 font-mono"
                          value={cur.rateLimitPriority || 8}
                          onChange={(e) => setTempLim({ ...tempLim, rateLimitPriority: parseInt(e.target.value, 10) || 8 })}
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Split DL/UL Quotas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                      <div>
                        <label htmlFor={`${lid}-dlmb`} className="text-slate-300 mb-1 block">
                          {isAr ? "كوتا تحميل فقط (DL MB)" : "Download Limit (MB)"}
                        </label>
                        <input
                          id={`${lid}-dlmb`}
                          dir="ltr"
                          type="number"
                          min="0"
                          className="w-full min-h-[44px] sm:min-h-[36px] bg-slate-800 border border-slate-700 text-slate-100 rounded px-2 py-1 font-mono"
                          value={cur.downloadLimitMb || 0}
                          onChange={(e) => setTempLim({ ...tempLim, downloadLimitMb: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                        />
                      </div>
                      <div>
                        <label htmlFor={`${lid}-ulmb`} className="text-slate-300 mb-1 block">
                          {isAr ? "كوتا رفع فقط (UL MB)" : "Upload Limit (MB)"}
                        </label>
                        <input
                          id={`${lid}-ulmb`}
                          dir="ltr"
                          type="number"
                          min="0"
                          className="w-full min-h-[44px] sm:min-h-[36px] bg-slate-800 border border-slate-700 text-slate-100 rounded px-2 py-1 font-mono"
                          value={cur.uploadLimitMb || 0}
                          onChange={(e) => setTempLim({ ...tempLim, uploadLimitMb: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                        />
                      </div>
                    </div>

                    {/* v6 Attributes */}
                    {!isV7 && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                        <div>
                          <label htmlFor={`${lid}-v6grp`} className="text-slate-300 mb-1 block">{isAr ? "v6 Group Name (Mikrotik-Group)" : "v6 Group Name"}</label>
                          <input
                            id={`${lid}-v6grp`}
                            dir="ltr"
                            type="text"
                            placeholder="default"
                            className="w-full min-h-[44px] sm:min-h-[36px] bg-slate-800 border border-slate-700 text-slate-100 rounded px-2 py-1 font-mono"
                            value={cur.v6GroupName || ""}
                            onChange={(e) => setTempLim({ ...tempLim, v6GroupName: e.target.value })}
                          />
                        </div>
                        <div>
                          <label htmlFor={`${lid}-v6pool`} className="text-slate-300 mb-1 block">{isAr ? "v6 IP Pool" : "v6 IP Pool"}</label>
                          <input
                            id={`${lid}-v6pool`}
                            dir="ltr"
                            type="text"
                            placeholder="hs-pool-ether2"
                            className="w-full min-h-[44px] sm:min-h-[36px] bg-slate-800 border border-slate-700 text-slate-100 rounded px-2 py-1 font-mono"
                            value={cur.v6IpPool || ""}
                            onChange={(e) => setTempLim({ ...tempLim, v6IpPool: e.target.value })}
                          />
                        </div>
                        <div>
                          <label htmlFor={`${lid}-v6alist`} className="text-slate-300 mb-1 block">{isAr ? "v6 Address-List" : "v6 Address-List"}</label>
                          <input
                            id={`${lid}-v6alist`}
                            dir="ltr"
                            type="text"
                            placeholder="um_vip"
                            className="w-full min-h-[44px] sm:min-h-[36px] bg-slate-800 border border-slate-700 text-slate-100 rounded px-2 py-1 font-mono"
                            value={cur.v6AddressList || ""}
                            onChange={(e) => setTempLim({ ...tempLim, v6AddressList: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </details>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setEditingLimId(null); setTempLim(null); }}
                    className="min-h-[44px] sm:min-h-[38px] px-3 py-1.5 bg-slate-700 text-slate-100 rounded-lg"
                  >
                    {isAr ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    type="button"
                    onClick={saveLimitation}
                    className="min-h-[44px] sm:min-h-[38px] px-3.5 py-1.5 bg-emerald-500 text-slate-950 font-semibold rounded-lg"
                  >
                    {isAr ? "حفظ القيد" : "Save Limitation"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span dir="ltr" className="font-mono bg-slate-800 text-emerald-300 px-2 py-0.5 rounded text-xs font-semibold">
                      {lim.name}
                    </span>
                    {lim.resetCountersInterval !== "disabled" && isV7 && (
                      <span dir="ltr" className="text-[11px] bg-emerald-950 border border-emerald-700 text-emerald-300 px-2 py-0.5 rounded font-mono">
                        reset: {lim.resetCountersInterval}
                      </span>
                    )}
                    {limIssues.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-950/70 border border-red-700/80 text-red-200 text-[11px] font-medium">
                        <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                        <span>{isAr ? `${limIssues.length} خطأ` : `${limIssues.length} error`}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
                    <span>
                      {isAr ? "رفع RX:" : "RX:"} <bdi dir="ltr" className="text-emerald-400 font-mono">{lim.rateLimitRx}</bdi>
                    </span>
                    <span>
                      {isAr ? "تحميل TX:" : "TX:"} <bdi dir="ltr" className="text-emerald-400 font-mono">{lim.rateLimitTx}</bdi>
                    </span>
                    {lim.transferLimitMb ? (
                      <span>
                        {isAr ? "كوتا Transfer:" : "Transfer:"} <bdi dir="ltr" className="text-cyan-300 font-mono">{lim.transferLimitMb >= 1024 ? `${(lim.transferLimitMb / 1024).toFixed(1)} GB` : `${lim.transferLimitMb} MB`}</bdi>
                      </span>
                    ) : null}
                    {lim.uptimeLimit ? (
                      <span>
                        {isAr ? "رصيد وقت:" : "Uptime:"} <bdi dir="ltr" className="text-amber-300 font-mono">{lim.uptimeLimit}</bdi>
                      </span>
                    ) : null}
                    {lim.rateLimitBurstTx && (
                      <span className="flex items-center gap-1 text-amber-300">
                        <Zap className="w-3 h-3" aria-hidden="true" />
                        <bdi dir="ltr" className="font-mono">Burst: {lim.rateLimitBurstRx}/{lim.rateLimitBurstTx}</bdi>
                      </span>
                    )}
                  </div>
                  {limIssues.map((issue) => (
                    <p key={issue.id} className="text-[11px] text-red-300">
                      {isAr ? issue.messageAr : issue.messageEn}
                    </p>
                  ))}
                </div>

                <div className="flex gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => { setEditingLimId(lim.id); setTempLim({ ...lim }); }}
                    aria-label={isAr ? `تعديل ${lim.name}` : `Edit ${lim.name}`}
                    className="min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px] inline-flex items-center justify-center p-2 border border-slate-700 rounded-lg text-slate-300 hover:text-white"
                  >
                    <Edit className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteLim(lim)}
                    aria-label={isAr ? `حذف ${lim.name}` : `Delete ${lim.name}`}
                    className="min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px] inline-flex items-center justify-center p-2 border border-slate-800 hover:border-red-800 rounded-lg text-slate-300 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <ConfirmDialog
        open={confirmDeleteLim !== null}
        dir={isAr ? "rtl" : "ltr"}
        title={isAr ? "حذف قيد السرعة" : "Delete Limitation"}
        description={
          confirmDeleteLim
            ? affectedProfiles.length > 0
              ? isAr
                ? `هل أنت متأكد من حذف قيد السرعة "${confirmDeleteLim.name}"؟ تحذير: هذا القيد مستخدم حالياً في الباقات التالية: ${affectedProfiles.map((p) => p.name).join("، ")}.`
                : `Are you sure you want to delete limitation "${confirmDeleteLim.name}"? Warning: it is currently referenced by profiles: ${affectedProfiles.map((p) => p.name).join(", ")}.`
              : isAr
                ? `هل أنت متأكد من حذف قيد السرعة "${confirmDeleteLim.name}"؟`
                : `Are you sure you want to delete limitation "${confirmDeleteLim.name}"?`
            : ""
        }
        confirmLabel={isAr ? "حذف" : "Delete"}
        cancelLabel={isAr ? "إلغاء" : "Cancel"}
        onConfirm={() => {
          if (confirmDeleteLim) {
            deleteLimitation(confirmDeleteLim.id);
          }
          setConfirmDeleteLim(null);
        }}
        onCancel={() => setConfirmDeleteLim(null)}
      />
    </div>
  );
}
