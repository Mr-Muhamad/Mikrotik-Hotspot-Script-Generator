/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from "react";
import type {
  HotspotConfig,
  UmWeekday,
  UserManagerProfile,
  UserManagerProfileLimitation,
} from "../../types";
import { ALL_UM_WEEKDAYS } from "../../constants/defaults";
import { Plus, Trash2, Edit, CalendarClock, Moon } from "lucide-react";
import ToggleSwitch from "../ToggleSwitch";
import ConfirmDialog from "../ConfirmDialog";

interface Props {
  config: HotspotConfig;
  onChange: (updates: Partial<HotspotConfig>) => void;
  lang: "ar" | "en";
  onDirtyChange?: (dirty: boolean) => void;
}

const WEEKDAY_SHORT_AR: Record<UmWeekday, string> = {
  sunday: "أحد",
  monday: "إثنين",
  tuesday: "ثلاثاء",
  wednesday: "أربعاء",
  thursday: "خميس",
  friday: "جمعة",
  saturday: "سبت",
};

const WEEKDAY_SHORT_EN: Record<UmWeekday, string> = {
  sunday: "Sun",
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
};

export default function UmProfilesSubTab({ config, onChange, lang, onDirtyChange }: Props) {
  const isAr = lang === "ar";
  const isV7 = config.rosVersion === "v7";
  const umLimitations = config.umLimitations || [];
  const umProfiles = config.umProfiles || [];

  const [editingProfId, setEditingProfId] = useState<string | null>(null);
  const [tempProf, setTempProf] = useState<UserManagerProfile | null>(null);
  const [confirmDeleteProf, setConfirmDeleteProf] = useState<UserManagerProfile | null>(null);

  useEffect(() => {
    onDirtyChange?.(editingProfId !== null);
  }, [editingProfId, onDirtyChange]);

  useEffect(() => {
    return () => {
      onDirtyChange?.(false);
    };
  }, [onDirtyChange]);

  const handleAddProfile = () => {
    const firstLimId = umLimitations[0]?.id || "";
    const newProf: UserManagerProfile = {
      id: `um_prof_${Date.now()}`,
      name: `UM-Plan-${umProfiles.length + 1}`,
      nameForUsers: `Plan ${umProfiles.length + 1}`,
      validity: "30d",
      price: 10,
      startsWhen: "first-auth",
      overrideSharedUsers: "1",
      limitations: firstLimId
        ? [
            {
              id: `um_pl_${Date.now()}`,
              limitationId: firstLimId,
              fromTime: "00:00:00",
              tillTime: "23:59:59",
              weekdays: [...ALL_UM_WEEKDAYS],
            },
          ]
        : [],
    };
    onChange({ umProfiles: [...umProfiles, newProf] });
    setEditingProfId(newProf.id);
    setTempProf(newProf);
  };

  const saveProfile = () => {
    if (!tempProf) return;
    const oldName = umProfiles.find((p) => p.id === tempProf.id)?.name;
    const updates: Partial<HotspotConfig> = {
      umProfiles: umProfiles.map((p) => (p.id === tempProf.id ? tempProf : p)),
    };
    if (oldName && oldName !== tempProf.name && config.voucherSelectedProfile === oldName) {
      updates.voucherSelectedProfile = tempProf.name;
    }
    onChange(updates);
    setEditingProfId(null);
    setTempProf(null);
  };

  const deleteProfile = (id: string) => {
    const deletedProf = umProfiles.find((p) => p.id === id);
    const remaining = umProfiles.filter((p) => p.id !== id);
    const updates: Partial<HotspotConfig> = {
      umProfiles: remaining,
    };
    if (deletedProf && config.voucherSelectedProfile === deletedProf.name) {
      updates.voucherSelectedProfile = remaining[0]?.name || "";
    }
    onChange(updates);
    if (editingProfId === id) {
      setEditingProfId(null);
      setTempProf(null);
    }
  };

  const addScheduleRow = () => {
    if (!tempProf) return;
    const newRow: UserManagerProfileLimitation = {
      id: `um_pl_${Date.now()}`,
      limitationId: umLimitations[0]?.id || "",
      fromTime: "00:00:00",
      tillTime: "23:59:59",
      weekdays: [...ALL_UM_WEEKDAYS],
    };
    setTempProf({ ...tempProf, limitations: [...tempProf.limitations, newRow] });
  };

  const applyDayNightBoostPreset = () => {
    if (!tempProf || umLimitations.length === 0) return;
    const dayLimId = tempProf.limitations[0]?.limitationId || umLimitations[0].id;
    const nightLimId = umLimitations[umLimitations.length - 1]?.id || dayLimId;
    setTempProf({
      ...tempProf,
      limitations: [
        {
          id: `um_pl_day_${Date.now()}`,
          limitationId: dayLimId,
          fromTime: "08:00:00",
          tillTime: "23:59:59",
          weekdays: [...ALL_UM_WEEKDAYS],
        },
        {
          id: `um_pl_night_${Date.now() + 1}`,
          limitationId: nightLimId,
          fromTime: "00:00:00",
          tillTime: "07:59:59",
          weekdays: [...ALL_UM_WEEKDAYS],
        },
      ],
    });
  };

  const updateScheduleRow = (rowId: string, updates: Partial<UserManagerProfileLimitation>) => {
    if (!tempProf) return;
    setTempProf({
      ...tempProf,
      limitations: tempProf.limitations.map((r) => (r.id === rowId ? { ...r, ...updates } : r)),
    });
  };

  const toggleWeekday = (rowId: string, day: UmWeekday) => {
    if (!tempProf) return;
    const row = tempProf.limitations.find((r) => r.id === rowId);
    if (!row) return;
    const exists = row.weekdays.includes(day);
    const nextDays = exists
      ? row.weekdays.filter((d) => d !== day)
      : [...row.weekdays, day];
    updateScheduleRow(rowId, { weekdays: nextDays });
  };

  const removeScheduleRow = (rowId: string) => {
    if (!tempProf) return;
    setTempProf({
      ...tempProf,
      limitations: tempProf.limitations.filter((r) => r.id !== rowId),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ToggleSwitch
            id="um-sync-switch"
            size="sm"
            checked={config.syncProfilesToUserman}
            onChange={(checked) => onChange({ syncProfilesToUserman: checked })}
            ariaLabel={isAr ? "توليد الباقات والقيود في السكربت" : "Emit Profiles and Limitations"}
          />
          <span className="text-xs text-slate-200">
            {isAr ? "تضمين الباقات والقيود في السكربت المولد" : "Generate Profiles & Limitations in Script"}
          </span>
        </div>
        <button
          type="button"
          onClick={handleAddProfile}
          className="min-h-[44px] sm:min-h-[38px] flex items-center gap-1.5 text-xs px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg font-semibold transition"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          {isAr ? "إضافة باقة يوزر مانجر" : "Add UM Profile"}
        </button>
      </div>

      {umProfiles.map((prof) => {
        const isEditing = editingProfId === prof.id;
        const cur = isEditing && tempProf ? tempProf : prof;
        const pid = `umprof-${prof.id}`;
        return (
          <div
            key={prof.id}
            className={`border rounded-xl p-4 transition-all ${
              isEditing ? "bg-slate-800/80 border-emerald-500/60" : "bg-slate-900/40 border-slate-800"
            }`}
          >
            {isEditing && tempProf ? (
              <div className="space-y-4 text-xs">
                <div className="bg-amber-950/50 border border-amber-700/70 text-amber-200 rounded-lg px-3 py-2 text-xs">
                  {isAr
                    ? "تعديل غير محفوظ: اضغط حفظ لتطبيق التغيير على السكربت"
                    : "Unsaved edit: click Save to apply changes to the script"}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div>
                    <label htmlFor={`${pid}-name`} className="text-slate-300 mb-1 block">{isAr ? "اسم الباقة" : "Profile Name"}</label>
                    <input
                      id={`${pid}-name`}
                      dir="ltr"
                      type="text"
                      className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 font-mono"
                      value={cur.name}
                      onChange={(e) => setTempProf({ ...tempProf, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor={`${pid}-disp`} className="text-slate-300 mb-1 block">{isAr ? "الاسم الظاهر للمشترك" : "Name for Users"}</label>
                    <input
                      id={`${pid}-disp`}
                      dir="auto"
                      type="text"
                      className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5"
                      value={cur.nameForUsers}
                      onChange={(e) => setTempProf({ ...tempProf, nameForUsers: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor={`${pid}-val`} className="text-slate-300 mb-1 block">{isAr ? "مدة الصلاحية (Validity)" : "Validity"}</label>
                    <input
                      id={`${pid}-val`}
                      dir="ltr"
                      type="text"
                      placeholder="30d or unlimited"
                      className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 font-mono"
                      value={cur.validity}
                      onChange={(e) => setTempProf({ ...tempProf, validity: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor={`${pid}-price`} className="text-slate-300 mb-1 block">{isAr ? "السعر (Price)" : "Price"}</label>
                    <input
                      id={`${pid}-price`}
                      dir="ltr"
                      type="number"
                      min="0"
                      className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 font-mono"
                      value={cur.price}
                      onChange={(e) => setTempProf({ ...tempProf, price: Math.max(0, parseFloat(e.target.value) || 0) })}
                    />
                  </div>
                  <div>
                    <label htmlFor={`${pid}-starts`} className="text-slate-300 mb-1 block">
                      {isV7 ? (isAr ? "بدء الصلاحية (starts-when)" : "Starts When (v7)") : (isAr ? "بدء الصلاحية (starts-at)" : "Starts At (v6)")}
                    </label>
                    <select
                      id={`${pid}-starts`}
                      dir="ltr"
                      className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 font-mono"
                      value={cur.startsWhen}
                      onChange={(e) => setTempProf({ ...tempProf, startsWhen: e.target.value as "first-auth" | "assigned" })}
                    >
                      <option value="first-auth">{isV7 ? "first-auth" : "logon (first login)"}</option>
                      <option value="assigned">{isV7 ? "assigned" : "now (immediately)"}</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`${pid}-shared`} className="text-slate-300 mb-1 block">override-shared-users</label>
                    <input
                      id={`${pid}-shared`}
                      dir="ltr"
                      type="text"
                      placeholder="1, unlimited, or off"
                      className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 font-mono"
                      value={cur.overrideSharedUsers}
                      onChange={(e) => setTempProf({ ...tempProf, overrideSharedUsers: e.target.value })}
                    />
                  </div>
                </div>

                {/* Time-Scheduled Limitations */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-3">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                      <CalendarClock className="w-4 h-4" aria-hidden="true" />
                      {isAr ? "ربط القيود وجدول الأوقات (profile-limitation)" : "Attached Limitations & Time Windows"}
                    </span>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={applyDayNightBoostPreset}
                        className="min-h-[36px] inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg"
                      >
                        <Moon className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{isAr ? "قالب سرعة نهار/ليل" : "Day/Night Preset"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={addScheduleRow}
                        className="min-h-[36px] inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-950 border border-emerald-700 text-emerald-300 rounded-lg"
                      >
                        <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{isAr ? "إضافة فترة" : "Add Window"}</span>
                      </button>
                    </div>
                  </div>

                  {cur.limitations.map((row) => (
                    <div key={row.id} className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                        <div className="sm:col-span-5">
                          <label htmlFor={`${pid}-row-${row.id}-lim`} className="text-[11px] text-slate-400 block mb-1">Limitation</label>
                          <select
                            id={`${pid}-row-${row.id}-lim`}
                            dir="ltr"
                            className="w-full min-h-[40px] sm:min-h-[34px] bg-slate-800 border border-slate-700 text-slate-100 rounded px-2 py-1 font-mono"
                            value={row.limitationId}
                            onChange={(e) => updateScheduleRow(row.id, { limitationId: e.target.value })}
                          >
                            {umLimitations.map((l) => (
                              <option key={l.id} value={l.id}>
                                {l.name} ({l.rateLimitRx}/{l.rateLimitTx})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="sm:col-span-3">
                          <label htmlFor={`${pid}-row-${row.id}-from`} className="text-[11px] text-slate-400 block mb-1">from-time</label>
                          <input
                            id={`${pid}-row-${row.id}-from`}
                            dir="ltr"
                            type="text"
                            className="w-full min-h-[40px] sm:min-h-[34px] bg-slate-800 border border-slate-700 text-slate-100 rounded px-2 py-1 font-mono"
                            value={row.fromTime}
                            onChange={(e) => updateScheduleRow(row.id, { fromTime: e.target.value })}
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <label htmlFor={`${pid}-row-${row.id}-till`} className="text-[11px] text-slate-400 block mb-1">till-time</label>
                          <input
                            id={`${pid}-row-${row.id}-till`}
                            dir="ltr"
                            type="text"
                            className="w-full min-h-[40px] sm:min-h-[34px] bg-slate-800 border border-slate-700 text-slate-100 rounded px-2 py-1 font-mono"
                            value={row.tillTime}
                            onChange={(e) => updateScheduleRow(row.id, { tillTime: e.target.value })}
                          />
                        </div>
                        <div className="sm:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeScheduleRow(row.id)}
                            aria-label={isAr ? "حذف الفترة" : "Remove window"}
                            className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center text-slate-300 hover:text-red-300 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {ALL_UM_WEEKDAYS.map((day) => {
                          const on = row.weekdays.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => toggleWeekday(row.id, day)}
                              className={`min-h-[32px] px-2 py-0.5 rounded text-[11px] border transition ${
                                on
                                  ? "bg-emerald-950 border-emerald-600 text-emerald-300"
                                  : "bg-slate-950 border-slate-800 text-slate-500"
                              }`}
                            >
                              {isAr ? WEEKDAY_SHORT_AR[day] : WEEKDAY_SHORT_EN[day]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setEditingProfId(null); setTempProf(null); }}
                    className="min-h-[44px] sm:min-h-[38px] px-3 py-1.5 bg-slate-700 text-slate-100 rounded-lg"
                  >
                    {isAr ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    type="button"
                    onClick={saveProfile}
                    className="min-h-[44px] sm:min-h-[38px] px-3.5 py-1.5 bg-emerald-500 text-slate-950 font-semibold rounded-lg"
                  >
                    {isAr ? "حفظ الباقة" : "Save Profile"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span dir="ltr" className="font-mono bg-slate-800 text-emerald-300 px-2 py-0.5 rounded text-xs font-semibold">
                      {prof.name}
                    </span>
                    <h3 className="font-semibold text-slate-100 text-sm">
                      <bdi dir="auto">{prof.nameForUsers}</bdi>
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
                    <span>{isAr ? "الصلاحية:" : "Validity:"} <bdi dir="ltr" className="font-mono text-slate-100">{prof.validity}</bdi></span>
                    <span>{isAr ? "السعر:" : "Price:"} <span className="font-mono text-emerald-400">{prof.price}</span></span>
                    <span>{isAr ? "تبدأ:" : "Starts:"} <bdi dir="ltr" className="font-mono text-slate-200">{isV7 ? prof.startsWhen : (prof.startsWhen === "assigned" ? "now" : "logon")}</bdi></span>
                    <span>
                      {isAr ? "القيود المربوطة:" : "Windows:"}{" "}
                      <span className="font-mono text-cyan-300">
                        {prof.limitations
                          .map((b) => umLimitations.find((l) => l.id === b.limitationId)?.name || "?")
                          .join(" + ") || (isAr ? "لا يوجد" : "None")}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProfId(prof.id);
                      setTempProf({
                        ...prof,
                        limitations: prof.limitations.map((l) => ({ ...l, weekdays: [...l.weekdays] })),
                      });
                    }}
                    aria-label={isAr ? `تعديل ${prof.name}` : `Edit ${prof.name}`}
                    className="min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px] inline-flex items-center justify-center p-2 border border-slate-700 rounded-lg text-slate-300 hover:text-white"
                  >
                    <Edit className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteProf(prof)}
                    aria-label={isAr ? `حذف ${prof.name}` : `Delete ${prof.name}`}
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
        open={confirmDeleteProf !== null}
        dir={isAr ? "rtl" : "ltr"}
        title={isAr ? "حذف باقة اليوزر مانجر" : "Delete User Manager Profile"}
        description={
          confirmDeleteProf
            ? isAr
              ? `هل أنت متأكد من حذف باقة "${confirmDeleteProf.name}"؟`
              : `Are you sure you want to delete User Manager profile "${confirmDeleteProf.name}"?`
            : ""
        }
        confirmLabel={isAr ? "حذف" : "Delete"}
        cancelLabel={isAr ? "إلغاء" : "Cancel"}
        onConfirm={() => {
          if (confirmDeleteProf) {
            deleteProfile(confirmDeleteProf.id);
          }
          setConfirmDeleteProf(null);
        }}
        onCancel={() => setConfirmDeleteProf(null)}
      />
    </div>
  );
}
