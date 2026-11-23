/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { SpeedProfile } from "../types";
import { Gauge, Plus, Trash2, Edit, RefreshCw, Zap, Database } from "lucide-react";

interface Props {
  profiles: SpeedProfile[];
  onAdd: (profile: SpeedProfile) => void;
  onUpdate: (index: number, profile: SpeedProfile) => void;
  onDelete: (index: number) => void;
  onReset: () => void;
  lang: "ar" | "en";
}

export default function SpeedProfilesTab({ profiles, onAdd, onUpdate, onDelete, onReset, lang }: Props) {
  const isAr = lang === "ar";
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempProfile, setTempProfile] = useState<SpeedProfile | null>(null);

  // New profile template defaults
  const handleAddNew = () => {
    const newId = `profile_${Date.now()}`;
    const newProf: SpeedProfile = {
      id: newId,
      name: "5M",
      displayName: "5 Mbps Limit",
      uploadLimit: "1M",
      downloadLimit: "5M",
      burstUpload: "2M",
      burstDownload: "10M",
      burstThresholdUpload: "768k",
      burstThresholdDownload: "3M",
      burstTime: "8s",
      priority: 8,
      dataQuotaMb: 0,
      sharedUsers: 1,
      sessionTimeout: "00:00:00",
      idleTimeout: "00:15:00",
      keepaliveTimeout: "00:02:00",
      price: 15,
      validity: "30d"
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

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <div className="border-b border-slate-800 pb-4 flex justify-between items-center flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Gauge className="w-5 h-5 text-emerald-400" />
            {isAr ? "بروفايلات السرعة، البيرست، وحد الكوتا" : "Speed Profiles, Burst & Quota Control"}
          </h3>
          <p className="text-slate-400 text-sm mt-1">
            {isAr 
              ? "إعداد السرعات الأساسية، السرعة الفائقة المؤقتة (Burst)، والحد الأقصى للتحميل (Data Quota)."
              : "Manage internet speeds, temporary burst acceleration, data limit quotas, and shared devices."}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onReset}
            type="button"
            className="flex items-center gap-1 text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {isAr ? "إعادة التعيين الافتراضية" : "Reset Defaults"}
          </button>
          <button
            onClick={handleAddNew}
            type="button"
            className="flex items-center gap-1 text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition"
          >
            <Plus className="w-4 h-4" />
            {isAr ? "إضافة بروفايل سرعة" : "Add Speed Profile"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {profiles.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl">
            <p className="text-slate-400 text-sm">{isAr ? "لم تقم بإضافة بروفايلات سرعة بعد." : "No speed profiles defined yet."}</p>
          </div>
        ) : (
          profiles.map((profile, idx) => {
            const isEditing = editingIndex === idx;
            const current = isEditing && tempProfile ? tempProfile : profile;

            return (
              <div 
                key={profile.id} 
                className={`border rounded-xl p-4 transition-all duration-200 ${
                  isEditing 
                    ? "bg-slate-800/80 border-emerald-500/50 shadow-md" 
                    : "bg-slate-900/40 border-slate-800 hover:bg-slate-900/60"
                }`}
              >
                {isEditing ? (
                  /* Editing Mode Form */
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">
                          {isAr ? "اسم البروفايل في ميكروتيك" : "Profile Name (Mikrotik)"}
                        </label>
                        <input
                          type="text"
                          className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-sm font-mono focus:outline-none"
                          value={current.name}
                          onChange={(e) => setTempProfile({ ...tempProfile!, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">
                          {isAr ? "الاسم المعروض للعملاء" : "Display Name"}
                        </label>
                        <input
                          type="text"
                          className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none"
                          value={current.displayName}
                          onChange={(e) => setTempProfile({ ...tempProfile!, displayName: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">
                          {isAr ? "الأجهزة المشتركة (Shared Users)" : "Shared Users Limit"}
                        </label>
                        <input
                          type="number"
                          min="1"
                          className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none"
                          value={current.sharedUsers}
                          onChange={(e) => setTempProfile({ ...tempProfile!, sharedUsers: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                    </div>

                    {/* Standard Limits */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                      <div>
                        <label className="text-xs text-slate-300 font-medium mb-1 block">
                          {isAr ? "سرعة التحميل (Download)" : "Download Speed"}
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 2M or 512k"
                          className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-sm font-mono focus:outline-none"
                          value={current.downloadLimit}
                          onChange={(e) => setTempProfile({ ...tempProfile!, downloadLimit: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-300 font-medium mb-1 block">
                          {isAr ? "سرعة الرفع (Upload)" : "Upload Speed"}
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 512k or 1M"
                          className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-sm font-mono focus:outline-none"
                          value={current.uploadLimit}
                          onChange={(e) => setTempProfile({ ...tempProfile!, uploadLimit: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-300 font-medium mb-1 block">
                          {isAr ? "صلاحية كارت المستخدم (User Manager)" : "Validity (User Manager)"}
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 30d, 1d, 12h"
                          className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-sm font-mono focus:outline-none"
                          value={current.validity}
                          onChange={(e) => setTempProfile({ ...tempProfile!, validity: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-300 font-medium mb-1 block">
                          {isAr ? "سعر الباقة (اختياري لليوزر مانجر)" : "Price (Optional for UM)"}
                        </label>
                        <input
                          type="number"
                          placeholder="e.g. 10"
                          className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none"
                          value={current.price}
                          onChange={(e) => setTempProfile({ ...tempProfile!, price: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    {/* Burst Configuration (Optional Burst Limit) */}
                    <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                        <Zap className="w-3.5 h-3.5" />
                        <span>{isAr ? "خصائص تسريع البيرست (Burst Rate - اختياري)" : "Burst Acceleration Features (Optional)"}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <label className="text-slate-400 mb-1 block">{isAr ? "تحميل البيرست (Burst DL)" : "Burst Download"}</label>
                          <input
                            type="text"
                            placeholder="e.g. 10M"
                            className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded px-2 py-1 font-mono text-xs"
                            value={current.burstDownload || ""}
                            onChange={(e) => setTempProfile({ ...tempProfile!, burstDownload: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 mb-1 block">{isAr ? "رفع البيرست (Burst UL)" : "Burst Upload"}</label>
                          <input
                            type="text"
                            placeholder="e.g. 2M"
                            className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded px-2 py-1 font-mono text-xs"
                            value={current.burstUpload || ""}
                            onChange={(e) => setTempProfile({ ...tempProfile!, burstUpload: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 mb-1 block">{isAr ? "وقت البيرست (Burst Time)" : "Burst Time"}</label>
                          <input
                            type="text"
                            placeholder="e.g. 8s"
                            className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded px-2 py-1 font-mono text-xs"
                            value={current.burstTime || "8s"}
                            onChange={(e) => setTempProfile({ ...tempProfile!, burstTime: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 mb-1 block">{isAr ? "سعة الكوتا بالـ ميجابايت (Quota MB)" : "Data Quota (MB)"}</label>
                          <input
                            type="number"
                            placeholder="0 = unlimited"
                            className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded px-2 py-1 font-mono text-xs"
                            value={current.dataQuotaMb || 0}
                            onChange={(e) => setTempProfile({ ...tempProfile!, dataQuotaMb: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Timeout configuration */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">
                          {isAr ? "زمن انتهاء الجلسة (Session Timeout)" : "Session Timeout"}
                        </label>
                        <input
                          type="text"
                          placeholder="HH:MM:SS (00:00:00 for unlimited)"
                          className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-sm font-mono focus:outline-none"
                          value={current.sessionTimeout}
                          onChange={(e) => setTempProfile({ ...tempProfile!, sessionTimeout: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">
                          {isAr ? "زمن الخمول (Idle Timeout)" : "Idle Timeout"}
                        </label>
                        <input
                          type="text"
                          placeholder="HH:MM:SS"
                          className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-sm font-mono focus:outline-none"
                          value={current.idleTimeout}
                          onChange={(e) => setTempProfile({ ...tempProfile!, idleTimeout: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">
                          {isAr ? "الاحتفاظ بالاتصال (Keepalive Timeout)" : "Keepalive Timeout"}
                        </label>
                        <input
                          type="text"
                          placeholder="HH:MM:SS"
                          className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-sm font-mono focus:outline-none"
                          value={current.keepaliveTimeout}
                          onChange={(e) => setTempProfile({ ...tempProfile!, keepaliveTimeout: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={cancelEdit}
                        type="button"
                        className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition"
                      >
                        {isAr ? "إلغاء" : "Cancel"}
                      </button>
                      <button
                        onClick={() => saveEdit(idx)}
                        type="button"
                        className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition"
                      >
                        {isAr ? "حفظ التعديلات" : "Save Changes"}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Display Mode View */
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono bg-slate-800 text-slate-200 px-2 py-0.5 rounded text-xs">
                          {profile.name}
                        </span>
                        <h4 className="font-semibold text-slate-200">
                          {profile.displayName}
                        </h4>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                        <div>
                          {isAr ? "الرفع:" : "Upload:"}{" "}
                          <span className="text-emerald-400 font-mono">{profile.uploadLimit}</span>
                        </div>
                        <div>
                          {isAr ? "التحميل:" : "Download:"}{" "}
                          <span className="text-emerald-400 font-mono">{profile.downloadLimit}</span>
                        </div>
                        {profile.burstDownload && (
                          <div className="flex items-center gap-1 text-amber-400">
                            <Zap className="w-3 h-3" />
                            <span>Burst: {profile.burstUpload}/{profile.burstDownload} ({profile.burstTime || "8s"})</span>
                          </div>
                        )}
                        {profile.dataQuotaMb && profile.dataQuotaMb > 0 ? (
                          <div className="flex items-center gap-1 text-cyan-400 font-mono">
                            <Database className="w-3 h-3" />
                            <span>{isAr ? "الكوتا:" : "Quota:"} {profile.dataQuotaMb >= 1024 ? `${(profile.dataQuotaMb / 1024).toFixed(1)} GB` : `${profile.dataQuotaMb} MB`}</span>
                          </div>
                        ) : null}
                        <div>
                          {isAr ? "المشتركون:" : "Shared:"}{" "}
                          <span className="text-slate-300 font-mono">{profile.sharedUsers}</span>
                        </div>
                        {profile.price > 0 && (
                          <div>
                            {isAr ? "السعر:" : "Price:"}{" "}
                            <span className="text-emerald-400 font-mono">{profile.price}</span>
                          </div>
                        )}
                        <div>
                          {isAr ? "الصلاحية:" : "Validity:"}{" "}
                          <span className="text-slate-300 font-mono">{profile.validity}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 self-end sm:self-center">
                      <button
                        onClick={() => startEdit(idx)}
                        className="p-2 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 rounded-lg transition"
                        title={isAr ? "تعديل" : "Edit"}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(idx)}
                        className="p-2 hover:bg-red-950/40 text-slate-500 hover:text-red-400 border border-transparent hover:border-red-900/50 rounded-lg transition"
                        title={isAr ? "حذف" : "Delete"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
