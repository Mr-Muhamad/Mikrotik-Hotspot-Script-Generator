/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from "react";
import type { HotspotConfig, UserManagerGroup } from "../../types";
import { Server, Key, Users, Hash, Plus, Trash2, Edit, Eye, EyeOff } from "lucide-react";
import ToggleSwitch from "../ToggleSwitch";
import ConfirmDialog from "../ConfirmDialog";

interface Props {
  config: HotspotConfig;
  onChange: (updates: Partial<HotspotConfig>) => void;
  lang: "ar" | "en";
  onDirtyChange?: (dirty: boolean) => void;
}

const OUTER_AUTH_OPTIONS = ["pap", "chap", "mschap1", "mschap2", "eap-tls", "eap-ttls", "eap-peap", "eap-mschap2"];

export default function UmServerSubTab({ config, onChange, lang, onDirtyChange }: Props) {
  const isAr = lang === "ar";
  const isV7 = config.rosVersion === "v7";
  const umGroups = config.umGroups || [];

  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [tempGroup, setTempGroup] = useState<UserManagerGroup | null>(null);
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState<UserManagerGroup | null>(null);
  const [showRadiusSecret, setShowRadiusSecret] = useState(false);
  const [showAdminPass, setShowAdminPass] = useState(false);

  useEffect(() => {
    onDirtyChange?.(editingGroupId !== null);
  }, [editingGroupId, onDirtyChange]);

  useEffect(() => {
    return () => {
      onDirtyChange?.(false);
    };
  }, [onDirtyChange]);

  const handleAddGroup = () => {
    const newGrp: UserManagerGroup = {
      id: `um_grp_${Date.now()}`,
      name: `group-${umGroups.length + 1}`,
      outerAuths: ["pap", "chap", "mschap2"],
      innerAuths: [],
    };
    onChange({ umGroups: [...umGroups, newGrp] });
    setEditingGroupId(newGrp.id);
    setTempGroup(newGrp);
  };

  const saveGroup = () => {
    if (!tempGroup) return;
    onChange({
      umGroups: umGroups.map((g) => (g.id === tempGroup.id ? tempGroup : g)),
    });
    setEditingGroupId(null);
    setTempGroup(null);
  };

  const deleteGroup = (id: string) => {
    onChange({
      umGroups: umGroups.filter((g) => g.id !== id),
    });
    if (editingGroupId === id) {
      setEditingGroupId(null);
      setTempGroup(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="um-radius-ip" className="text-slate-200 text-sm font-medium flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            {isAr ? "عنوان IP الخاص بسيرفر اليوزر مانجر" : "RADIUS Server IP Address"}
          </label>
          <input
            id="um-radius-ip"
            name="radiusServerIp"
            dir="ltr"
            type="text"
            className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 font-mono"
            value={config.radiusServerIp}
            onChange={(e) => onChange({ radiusServerIp: e.target.value })}
            placeholder="127.0.0.1"
          />
          <span className="text-xs text-slate-400">
            {isAr ? "اكتب 127.0.0.1 إذا كان اليوزر مانجر محلياً على نفس الراوتر" : "Use 127.0.0.1 when running locally on the same MikroTik"}
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="um-radius-secret" className="text-slate-200 text-sm font-medium flex items-center gap-2">
            <Key className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            {isAr ? "كلمة سر الربط (Shared Secret)" : "RADIUS Shared Secret"}
          </label>
          <div className="relative flex items-center">
            <input
              id="um-radius-secret"
              name="radiusSecret"
              dir="ltr"
              type={showRadiusSecret ? "text" : "password"}
              className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 pe-10 py-2 text-sm focus:ring-2 focus:ring-emerald-400 font-mono"
              value={config.radiusSecret}
              onChange={(e) => onChange({ radiusSecret: e.target.value })}
              placeholder="radius123"
            />
            <button
              type="button"
              onClick={() => setShowRadiusSecret((prev) => !prev)}
              aria-label={showRadiusSecret ? (isAr ? "إخفاء كلمة السر" : "Hide secret") : (isAr ? "إظهار كلمة السر" : "Show secret")}
              className="absolute end-1 min-h-[36px] min-w-[36px] inline-flex items-center justify-center text-slate-400 hover:text-slate-100 rounded"
            >
              {showRadiusSecret ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
            </button>
          </div>
          <span className="text-xs text-slate-400">
            {isAr ? "كلمة السر المتطابقة بين الهوتسبوت وخادم اليوزر مانجر" : "Shared secret authenticating RADIUS packets"}
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="um-router-name" className="text-slate-200 text-sm font-medium flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            {isAr ? "اسم الراوتر في اليوزر مانجر" : "Router Name in User Manager"}
          </label>
          <input
            id="um-router-name"
            name="usermanRouterName"
            dir="ltr"
            type="text"
            className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 font-mono"
            value={config.usermanRouterName}
            onChange={(e) => onChange({ usermanRouterName: e.target.value })}
            placeholder="Router1"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="um-coa-port" className="text-slate-200 text-sm font-medium flex items-center gap-2">
            <Hash className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            <span>{isAr ? "منفذ CoA (فصل الكارت عند الانتهاء)" : "CoA Disconnect Port"}</span>
          </label>
          <input
            id="um-coa-port"
            name="coaPort"
            dir="ltr"
            type="number"
            className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 font-mono"
            value={config.coaPort}
            onChange={(e) => onChange({ coaPort: parseInt(e.target.value, 10) || 3799 })}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="um-auth-port" className="text-slate-200 text-sm font-medium flex items-center gap-2">
            <Hash className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            <span>{isAr ? "منفذ المصادقة (Auth Port)" : "RADIUS Auth Port"}</span>
          </label>
          <input
            id="um-auth-port"
            name="radiusPort"
            dir="ltr"
            type="number"
            className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 font-mono"
            value={config.radiusPort}
            onChange={(e) => onChange({ radiusPort: parseInt(e.target.value, 10) || 1812 })}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="um-radius-timeout" className="text-slate-200 text-sm font-medium flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            <span>{isAr ? "مهلة الاستجابة (Timeout)" : "RADIUS Timeout"}</span>
          </label>
          <input
            id="um-radius-timeout"
            name="radiusTimeout"
            dir="ltr"
            type="text"
            className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 font-mono"
            value={config.radiusTimeout}
            onChange={(e) => onChange({ radiusTimeout: e.target.value })}
            placeholder="3000ms"
          />
        </div>
      </div>

      {/* RADIUS Accounting */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-slate-100">
              {isAr ? "المحاسبة اللحظية للكوتا (RADIUS Accounting & Interim Update)" : "RADIUS Accounting & Interim Update"}
            </h3>
            <p className="text-xs text-slate-400">
              {isAr
                ? "ضروري لحساب الكوتا أثناء الجلسة وفصل المشترك فور انتهائها عبر CoA."
                : "Required for live quota updates during sessions and immediate CoA disconnect."}
            </p>
          </div>
          <ToggleSwitch
            id="um-accounting-switch"
            checked={config.radiusAccounting}
            onChange={(checked) => onChange({ radiusAccounting: checked })}
            ariaLabel={isAr ? "تفعيل RADIUS Accounting" : "Enable RADIUS Accounting"}
          />
        </div>
        {config.radiusAccounting && (
          <div className="flex flex-col gap-1.5 max-w-xs pt-2 border-t border-slate-800/60">
            <label htmlFor="um-interim-update" className="text-slate-300 text-xs">{isAr ? "فترة التحديث (Interim Update)" : "Interim Update Interval"}</label>
            <input
              id="um-interim-update"
              name="radiusInterimUpdate"
              dir="ltr"
              type="text"
              className="min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400"
              value={config.radiusInterimUpdate}
              onChange={(e) => onChange({ radiusInterimUpdate: e.target.value })}
              placeholder="00:05:00"
            />
          </div>
        )}
      </div>

      {/* Version-Specific Server Identity: Customer (v6) vs User Groups (v7) */}
      {!isV7 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
          <h3 className="text-sm font-medium text-slate-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            {isAr ? "حساب مدير اليوزر مانجر المالك (ROS v6 Customer)" : "User Manager Master Owner (v6 Customer)"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="um-admin-user" className="text-slate-300 text-xs">{isAr ? "اسم مستخدم المالك (Login)" : "Owner Login"}</label>
              <input
                id="um-admin-user"
                name="usermanAdminUser"
                dir="ltr"
                type="text"
                className="min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-sm font-mono focus:ring-2 focus:ring-emerald-400"
                value={config.usermanAdminUser}
                onChange={(e) => onChange({ usermanAdminUser: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="um-admin-pass" className="text-slate-300 text-xs">{isAr ? "كلمة المرور" : "Owner Password"}</label>
              <div className="relative flex items-center">
                <input
                  id="um-admin-pass"
                  name="usermanAdminPass"
                  dir="ltr"
                  type={showAdminPass ? "text" : "password"}
                  className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 pe-10 py-1.5 text-sm font-mono focus:ring-2 focus:ring-emerald-400"
                  value={config.usermanAdminPass}
                  onChange={(e) => onChange({ usermanAdminPass: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPass((prev) => !prev)}
                  aria-label={showAdminPass ? (isAr ? "إخفاء كلمة المرور" : "Hide password") : (isAr ? "إظهار كلمة المرور" : "Show password")}
                  className="absolute end-1 min-h-[36px] min-w-[36px] inline-flex items-center justify-center text-slate-400 hover:text-slate-100 rounded"
                >
                  {showAdminPass ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-medium text-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                {isAr ? "مجموعات المستخدمين وخصائص RADIUS (v7 User Groups)" : "v7 User Groups (/user-manager user group)"}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr
                  ? "في RouterOS v7، تحديد outer-auths إلزامي وإلا لن يتمكن المستخدم من تسجيل الدخول."
                  : "In RouterOS v7, outer-auths must be enabled on a user group or authentication will fail."}
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddGroup}
              className="min-h-[44px] sm:min-h-[36px] flex items-center gap-1.5 text-xs px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              {isAr ? "إضافة مجموعة" : "Add Group"}
            </button>
          </div>

          <div className="space-y-3">
            {umGroups.map((grp) => {
              const isEditing = editingGroupId === grp.id;
              const cur = isEditing && tempGroup ? tempGroup : grp;
              return (
                <div key={grp.id} className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                  {isEditing && tempGroup ? (
                    <div className="space-y-3 text-xs">
                      <div className="bg-amber-950/50 border border-amber-700/70 text-amber-200 rounded-lg px-3 py-2 text-xs">
                        {isAr
                          ? "تعديل غير محفوظ: اضغط حفظ لتطبيق التغيير على السكربت"
                          : "Unsaved edit: click Save to apply changes to the script"}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                        <div>
                          <label htmlFor={`grp-${grp.id}-name`} className="text-slate-300 mb-1 block">
                            {isAr ? "اسم المجموعة" : "Group Name"}
                          </label>
                          <input
                            id={`grp-${grp.id}-name`}
                            dir="ltr"
                            type="text"
                            className="w-full min-h-[44px] sm:min-h-[36px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1 font-mono"
                            value={cur.name}
                            onChange={(e) => setTempGroup({ ...tempGroup, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <label htmlFor={`grp-${grp.id}-mg`} className="text-slate-300 mb-1 block">
                            {isAr ? "Mikrotik-Group (ربط ببروفايل الهوتسبوت)" : "Mikrotik-Group Attribute (Optional)"}
                          </label>
                          <input
                            id={`grp-${grp.id}-mg`}
                            dir="ltr"
                            type="text"
                            placeholder="default or hs-2M"
                            className="w-full min-h-[44px] sm:min-h-[36px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1 font-mono"
                            value={cur.mikrotikGroup || ""}
                            onChange={(e) => setTempGroup({ ...tempGroup, mikrotikGroup: e.target.value })}
                          />
                        </div>
                        <div>
                          <label htmlFor={`grp-${grp.id}-alist`} className="text-slate-300 mb-1 block">
                            Mikrotik-Address-List
                          </label>
                          <input
                            id={`grp-${grp.id}-alist`}
                            dir="ltr"
                            type="text"
                            placeholder="um_vip"
                            className="w-full min-h-[44px] sm:min-h-[36px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1 font-mono"
                            value={cur.addressList || ""}
                            onChange={(e) => setTempGroup({ ...tempGroup, addressList: e.target.value })}
                          />
                        </div>
                        <div>
                          <label htmlFor={`grp-${grp.id}-pool`} className="text-slate-300 mb-1 block">
                            Framed-Pool
                          </label>
                          <input
                            id={`grp-${grp.id}-pool`}
                            dir="ltr"
                            type="text"
                            placeholder="hs-pool-ether2"
                            className="w-full min-h-[44px] sm:min-h-[36px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1 font-mono"
                            value={cur.framedPool || ""}
                            onChange={(e) => setTempGroup({ ...tempGroup, framedPool: e.target.value })}
                          />
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-300 mb-1.5 block">outer-auths:</span>
                        <div className="flex flex-wrap gap-1.5" dir="ltr">
                          {OUTER_AUTH_OPTIONS.map((auth) => {
                            const active = cur.outerAuths.includes(auth);
                            return (
                              <button
                                key={auth}
                                type="button"
                                onClick={() => {
                                  const next = active
                                    ? cur.outerAuths.filter((a) => a !== auth)
                                    : [...cur.outerAuths, auth];
                                  setTempGroup({ ...tempGroup, outerAuths: next });
                                }}
                                className={`min-h-[36px] px-2.5 py-1 rounded-md border font-mono text-[11px] transition ${
                                  active
                                    ? "bg-emerald-950 border-emerald-500 text-emerald-300"
                                    : "bg-slate-900 border-slate-700 text-slate-400"
                                }`}
                              >
                                {auth}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => { setEditingGroupId(null); setTempGroup(null); }}
                          className="min-h-[40px] px-3 py-1.5 bg-slate-800 text-slate-200 rounded-lg"
                        >
                          {isAr ? "إلغاء" : "Cancel"}
                        </button>
                        <button
                          type="button"
                          onClick={saveGroup}
                          className="min-h-[40px] px-3.5 py-1.5 bg-emerald-500 text-slate-950 font-semibold rounded-lg"
                        >
                          {isAr ? "حفظ" : "Save"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center gap-3 flex-wrap">
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span dir="ltr" className="font-mono font-semibold text-emerald-300">{grp.name}</span>
                          {grp.mikrotikGroup && (
                            <span dir="ltr" className="font-mono text-[11px] bg-slate-800 px-2 py-0.5 rounded text-cyan-300">
                              Mikrotik-Group:{grp.mikrotikGroup}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono" dir="ltr">
                          outer-auths: {grp.outerAuths.join(",") || "none"}
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => { setEditingGroupId(grp.id); setTempGroup({ ...grp }); }}
                          aria-label={isAr ? `تعديل ${grp.name}` : `Edit ${grp.name}`}
                          className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center border border-slate-700 rounded-lg text-slate-300 hover:text-white"
                        >
                          <Edit className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteGroup(grp)}
                          aria-label={isAr ? `حذف ${grp.name}` : `Delete ${grp.name}`}
                          className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center border border-slate-800 rounded-lg text-slate-300 hover:text-red-300"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteGroup !== null}
        dir={isAr ? "rtl" : "ltr"}
        title={isAr ? "حذف مجموعة المستخدمين" : "Delete User Group"}
        description={
          confirmDeleteGroup
            ? isAr
              ? `هل أنت متأكد من حذف المجموعة "${confirmDeleteGroup.name}"؟`
              : `Are you sure you want to delete user group "${confirmDeleteGroup.name}"?`
            : ""
        }
        confirmLabel={isAr ? "حذف" : "Delete"}
        cancelLabel={isAr ? "إلغاء" : "Cancel"}
        onConfirm={() => {
          if (confirmDeleteGroup) {
            deleteGroup(confirmDeleteGroup.id);
          }
          setConfirmDeleteGroup(null);
        }}
        onCancel={() => setConfirmDeleteGroup(null)}
      />
    </div>
  );
}
