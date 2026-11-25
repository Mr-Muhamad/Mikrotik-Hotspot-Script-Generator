/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from "react";
import type { HotspotConfig, VlanConfig } from "../types";
import type { ValidationIssue } from "../utils/validation";
import { calculateSubnetPool } from "../utils/scriptGenerator";
import { Layers, Plus, Trash2, Edit } from "lucide-react";
import ToggleSwitch from "./ToggleSwitch";
import ConfirmDialog from "./ConfirmDialog";

interface Props {
  config: HotspotConfig;
  onChange: (updates: Partial<HotspotConfig>) => void;
  lang: "ar" | "en";
  onDirtyChange?: (dirty: boolean) => void;
  issues?: ValidationIssue[];
}

export default function VlanConfigTab({ config, onChange, lang, onDirtyChange, issues = [] }: Props) {
  const isAr = lang === "ar";
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempVlan, setTempVlan] = useState<VlanConfig | null>(null);
  const [confirmDeleteVlan, setConfirmDeleteVlan] = useState<VlanConfig | null>(null);

  useEffect(() => {
    onDirtyChange?.(config.enableVlans && editingId !== null);
  }, [config.enableVlans, editingId, onDirtyChange]);

  useEffect(() => {
    return () => {
      onDirtyChange?.(false);
    };
  }, [onDirtyChange]);

  const handleToggleVlans = (enabled: boolean) => {
    if (!enabled) {
      setEditingId(null);
      setTempVlan(null);
    }
    onChange({ enableVlans: enabled });
  };

  const handleAddVlan = () => {
    const newId = `vlan_${Date.now()}`;
    const nextVlanId = (config.vlans?.length || 0) * 10 + 10;
    const newVlan: VlanConfig = {
      id: newId,
      name: `vlan${nextVlanId}_office`,
      vlanId: nextVlanId,
      parentInterface: config.useLanBridge ? (config.lanBridgeName || "bridge-lan") : (config.lanInterface || "ether2"),
      gatewayIp: `172.16.${nextVlanId}.1`,
      subnetMask: 24,
      dhcpEnabled: true,
      poolStart: `172.16.${nextVlanId}.10`,
      poolEnd: `172.16.${nextVlanId}.254`,
      enableHotspotOnVlan: false,
      comment: "Sub-network VLAN"
    };

    onChange({
      vlans: [...(config.vlans || []), newVlan]
    });
  };

  const startEdit = (vlan: VlanConfig) => {
    setEditingId(vlan.id);
    setTempVlan({ ...vlan });
  };

  const saveEdit = () => {
    if (tempVlan) {
      const updatedList = (config.vlans || []).map(v => v.id === tempVlan.id ? tempVlan : v);
      onChange({ vlans: updatedList });
      setEditingId(null);
      setTempVlan(null);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTempVlan(null);
  };

  const handleRemoveVlan = (id: string) => {
    onChange({
      vlans: (config.vlans || []).filter(v => v.id !== id)
    });
    if (editingId === id) {
      setEditingId(null);
      setTempVlan(null);
    }
  };

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      {/* Enable VLAN Header */}
      <div className="border-b border-slate-800 pb-4 flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            {isAr ? "إدارة الشبكات الافتراضية (VLANs Setup)" : "VLAN Configuration"}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {isAr
              ? "إنشاء فيلانات معزولة، تخصيص عناوين IP، سيرفرات DHCP، وربط سيرفر الهوتسبوت بها."
              : "Create tagged VLAN interfaces, assign IP gateways, DHCP pools, and tie Hotspots to VLANs."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ToggleSwitch
            id="vlan-enable-switch"
            checked={config.enableVlans}
            onChange={handleToggleVlans}
            ariaLabel={isAr ? "تفعيل شبكات VLAN" : "Enable VLANs"}
          />
          <span className="text-xs font-semibold text-slate-200">
            {config.enableVlans ? (isAr ? "الفيلان مفعّل" : "VLANs Active") : (isAr ? "الفيلان معطّل" : "VLANs Disabled")}
          </span>
        </div>
      </div>

      {config.enableVlans && (
        <div className="space-y-4">
          {/* Global VLAN Security & Bridge VLAN Filtering options */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1.5 text-xs">
            <label htmlFor="vlan-isolate" className="min-h-[44px] sm:min-h-[32px] flex items-center gap-2 cursor-pointer text-slate-200">
              <input
                id="vlan-isolate"
                name="isolateVlans"
                type="checkbox"
                className="w-4 h-4 flex-shrink-0 accent-emerald-500"
                checked={config.isolateVlans}
                onChange={(e) => onChange({ isolateVlans: e.target.checked })}
              />
              <span>
                {isAr
                  ? "عزل الـ VLANs عن بعضها وعن الشبكة الرئيسية (Inter-VLAN Isolation)"
                  : "Isolate VLANs & Main LAN from each other (Inter-VLAN Isolation)"}
              </span>
            </label>

            <label htmlFor="vlan-bridge-filtering" className={`min-h-[44px] sm:min-h-[32px] flex items-center gap-2 ${config.useLanBridge ? "cursor-pointer text-slate-200" : "opacity-60 cursor-not-allowed text-slate-400"}`}>
              <input
                id="vlan-bridge-filtering"
                name="enableBridgeVlanFiltering"
                type="checkbox"
                className="w-4 h-4 flex-shrink-0 accent-emerald-500"
                disabled={!config.useLanBridge}
                checked={config.useLanBridge && config.enableBridgeVlanFiltering}
                onChange={(e) => onChange({ enableBridgeVlanFiltering: e.target.checked })}
              />
              <span>
                {isAr
                  ? "تفعيل Bridge VLAN Filtering (تحديد منافذ Trunk و Access)"
                  : "Enable Bridge VLAN Filtering (Trunk / Access ports)"}
              </span>
            </label>
            {!config.useLanBridge && (
              <p className="text-xs text-amber-300 ps-6">
                {isAr
                  ? "لتفعيل Bridge VLAN Filtering، قم بتفعيل خيار LAN Bridge أولاً من تبويب إعدادات الشبكة."
                  : "Enable LAN Bridge in the Network Setup tab first to use Bridge VLAN Filtering."}
              </p>
            )}
          </div>

          <div className="flex justify-between items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-300">
              {isAr ? "قائمة شبكات الـ VLAN المضافة:" : "Configured VLAN interfaces:"}
            </span>
            <button
              type="button"
              onClick={handleAddVlan}
              className="min-h-[44px] sm:min-h-[40px] flex items-center gap-1.5 text-xs px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg font-semibold transition"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              {isAr ? "إضافة VLAN جديد" : "Add New VLAN"}
            </button>
          </div>

          {(!config.vlans || config.vlans.length === 0) ? (
            <div className="text-center py-10 border-2 border-dashed border-slate-800 rounded-xl">
              <p className="text-slate-300 text-sm">{isAr ? "لم تقم بإضافة أية شبكات VLAN بعد. اضغط على إضافة للتخصيص." : "No VLAN interfaces configured yet."}</p>
            </div>
          ) : (
            config.vlans.map((vlan, idx) => {
              const isEditing = editingId === vlan.id;
              const current = isEditing && tempVlan ? tempVlan : vlan;
              const getVlanIssue = (suffix: string) =>
                issues.find((i) => i.tab === 1 && i.field === `vlan_${idx}_${suffix}`);
              const vlanIssues = issues.filter(
                (i) =>
                  i.tab === 1 &&
                  (i.field === `vlan_${idx}_vlanId` ||
                    i.field === `vlan_${idx}_name` ||
                    i.field === `vlan_${idx}_gatewayIp` ||
                    i.field === `vlan_${idx}_pool` ||
                    i.field === `vlan_${idx}_parentInterface` ||
                    i.field === `vlan_${idx}_dhcpEnabled`)
              );
              const nameError = getVlanIssue("name");
              const vlanIdError = getVlanIssue("vlanId");
              const parentIssue = getVlanIssue("parentInterface");
              const gwError = getVlanIssue("gatewayIp");
              const poolError = getVlanIssue("pool");
              const dhcpIssue = getVlanIssue("dhcpEnabled");
              const hasVlanError = vlanIssues.some((i) => i.severity === "error");
              const hasVlanWarning = !hasVlanError && vlanIssues.length > 0;

              return (
                <div
                  key={vlan.id}
                  className={`border rounded-xl p-4 transition-all ${
                    isEditing
                      ? "bg-slate-800/80 border-emerald-500/60 shadow-md"
                      : hasVlanError
                        ? "bg-slate-900/40 border-red-500/70 hover:bg-slate-900/60"
                        : hasVlanWarning
                          ? "bg-slate-900/40 border-amber-500/60 hover:bg-slate-900/60"
                          : "bg-slate-900/40 border-slate-800 hover:bg-slate-900/60"
                  }`}
                >
                  {isEditing ? (
                    /* Edit Form */
                    <div className="space-y-4">
                      <div className="bg-amber-950/50 border border-amber-700/70 text-amber-200 rounded-lg px-3 py-2 text-xs">
                        {isAr
                          ? "تعديل غير محفوظ: اضغط حفظ لتطبيق التغيير على السكربت"
                          : "Unsaved edit: click Save to apply changes to the script"}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                        <div>
                          <label htmlFor={`vlan-${vlan.id}-name`} className="text-xs text-slate-300 mb-1 block">{isAr ? "اسم الفيلان (Interface Name)" : "VLAN Name"}</label>
                          <input
                            id={`vlan-${vlan.id}-name`}
                            name={`vlan_${idx}_name`}
                            dir="ltr"
                            type="text"
                            aria-invalid={Boolean(nameError)}
                            className={`w-full min-h-[44px] sm:min-h-[38px] bg-slate-900 border text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400 ${
                              nameError ? "border-red-500" : "border-slate-700"
                            }`}
                            value={current.name}
                            onChange={(e) => setTempVlan({ ...tempVlan!, name: e.target.value })}
                          />
                          {nameError && (
                            <span className="text-xs text-red-300 mt-1 block">{isAr ? nameError.messageAr : nameError.messageEn}</span>
                          )}
                        </div>
                        <div>
                          <label htmlFor={`vlan-${vlan.id}-tag`} className="text-xs text-slate-300 mb-1 block">{isAr ? "رقم الفيلان (VLAN ID)" : "VLAN ID (Tag)"}</label>
                          <input
                            id={`vlan-${vlan.id}-tag`}
                            name={`vlan_${idx}_vlanId`}
                            dir="ltr"
                            type="number"
                            min="1"
                            max="4094"
                            aria-invalid={Boolean(vlanIdError)}
                            className={`w-full min-h-[44px] sm:min-h-[38px] bg-slate-900 border text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400 ${
                              vlanIdError ? "border-red-500" : "border-slate-700"
                            }`}
                            value={current.vlanId}
                            onChange={(e) => setTempVlan({ ...tempVlan!, vlanId: parseInt(e.target.value, 10) || 10 })}
                          />
                          {vlanIdError && (
                            <span className="text-xs text-red-300 mt-1 block">{isAr ? vlanIdError.messageAr : vlanIdError.messageEn}</span>
                          )}
                        </div>
                        <div>
                          <label htmlFor={`vlan-${vlan.id}-parent`} className="text-xs text-slate-300 mb-1 block">{isAr ? "المنفذ الرئيسي (Parent Interface)" : "Parent Interface"}</label>
                          <input
                            id={`vlan-${vlan.id}-parent`}
                            name={`vlan_${idx}_parentInterface`}
                            dir="ltr"
                            type="text"
                            aria-invalid={parentIssue?.severity === "error"}
                            className={`w-full min-h-[44px] sm:min-h-[38px] bg-slate-900 border text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400 ${
                              parentIssue
                                ? parentIssue.severity === "error"
                                  ? "border-red-500"
                                  : "border-amber-500/80"
                                : "border-slate-700"
                            }`}
                            value={current.parentInterface}
                            onChange={(e) => setTempVlan({ ...tempVlan!, parentInterface: e.target.value })}
                          />
                          {parentIssue && (
                            <span className={`text-xs mt-1 block ${parentIssue.severity === "error" ? "text-red-300" : "text-amber-300"}`}>
                              {isAr ? parentIssue.messageAr : parentIssue.messageEn}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                        <div>
                          <label htmlFor={`vlan-${vlan.id}-gw`} className="text-xs text-slate-200 mb-1 block">{isAr ? "عنوان الجيتواي (Gateway IP)" : "Gateway IP"}</label>
                          <input
                            id={`vlan-${vlan.id}-gw`}
                            name={`vlan_${idx}_gatewayIp`}
                            dir="ltr"
                            type="text"
                            aria-invalid={Boolean(gwError)}
                            className={`w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400 ${
                              gwError ? "border-red-500" : "border-slate-700"
                            }`}
                            value={current.gatewayIp}
                            onChange={(e) => {
                              const ip = e.target.value;
                              const pool = calculateSubnetPool(ip, current.subnetMask);
                              setTempVlan({
                                ...tempVlan!,
                                gatewayIp: ip,
                                ...(pool ? { poolStart: pool.poolStart, poolEnd: pool.poolEnd } : {})
                              });
                            }}
                          />
                          {gwError && (
                            <span className="text-xs text-red-300 mt-1 block">{isAr ? gwError.messageAr : gwError.messageEn}</span>
                          )}
                        </div>
                        <div>
                          <label htmlFor={`vlan-${vlan.id}-mask`} className="text-xs text-slate-200 mb-1 block">{isAr ? "قناع الشبكة (Subnet)" : "Subnet Mask"}</label>
                          <select
                            id={`vlan-${vlan.id}-mask`}
                            name="vlanSubnetMask"
                            dir="ltr"
                            className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400"
                            value={current.subnetMask}
                            onChange={(e) => {
                              const mask = parseInt(e.target.value, 10) || 24;
                              const pool = calculateSubnetPool(current.gatewayIp, mask);
                              setTempVlan({
                                ...tempVlan!,
                                subnetMask: mask,
                                ...(pool ? { poolStart: pool.poolStart, poolEnd: pool.poolEnd } : {})
                              });
                            }}
                          >
                            <option value={24}>/24</option>
                            <option value={23}>/23</option>
                            <option value={22}>/22</option>
                            <option value={16}>/16</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor={`vlan-${vlan.id}-pool-start`} className="text-xs text-slate-200 mb-1 block">{isAr ? "بداية توزيع DHCP" : "DHCP Pool Start"}</label>
                          <input
                            id={`vlan-${vlan.id}-pool-start`}
                            name={`vlan_${idx}_pool`}
                            dir="ltr"
                            type="text"
                            aria-invalid={Boolean(poolError)}
                            className={`w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400 ${
                              poolError ? "border-red-500" : "border-slate-700"
                            }`}
                            value={current.poolStart}
                            onChange={(e) => setTempVlan({ ...tempVlan!, poolStart: e.target.value })}
                          />
                          {poolError && (
                            <span className="text-xs text-red-300 mt-1 block">{isAr ? poolError.messageAr : poolError.messageEn}</span>
                          )}
                        </div>
                        <div>
                          <label htmlFor={`vlan-${vlan.id}-pool-end`} className="text-xs text-slate-200 mb-1 block">{isAr ? "نهاية توزيع DHCP" : "DHCP Pool End"}</label>
                          <input
                            id={`vlan-${vlan.id}-pool-end`}
                            name="vlanPoolEnd"
                            dir="ltr"
                            type="text"
                            aria-invalid={Boolean(poolError)}
                            className={`w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400 ${
                              poolError ? "border-red-500" : "border-slate-700"
                            }`}
                            value={current.poolEnd}
                            onChange={(e) => setTempVlan({ ...tempVlan!, poolEnd: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-4 text-xs">
                          <label htmlFor={`vlan-${vlan.id}-dhcp`} className="min-h-[44px] sm:min-h-[32px] flex items-center gap-2 cursor-pointer">
                            <input
                              id={`vlan-${vlan.id}-dhcp`}
                              name={`vlan_${idx}_dhcpEnabled`}
                              type="checkbox"
                              className="w-4 h-4 flex-shrink-0 accent-emerald-500"
                              checked={current.dhcpEnabled}
                              onChange={(e) => setTempVlan({ ...tempVlan!, dhcpEnabled: e.target.checked })}
                            />
                            <span>{isAr ? "تفعيل سيرفر DHCP لهذا الفيلان" : "Enable DHCP Server"}</span>
                          </label>

                          <label htmlFor={`vlan-${vlan.id}-hotspot`} className="min-h-[44px] sm:min-h-[32px] flex items-center gap-2 cursor-pointer">
                            <input
                              id={`vlan-${vlan.id}-hotspot`}
                              name="vlanEnableHotspot"
                              type="checkbox"
                              className="w-4 h-4 flex-shrink-0 accent-emerald-500"
                              checked={current.enableHotspotOnVlan}
                              onChange={(e) => setTempVlan({ ...tempVlan!, enableHotspotOnVlan: e.target.checked })}
                            />
                            <span>{isAr ? "تفعيل خدمة الهوت سبوت على هذا الفيلان" : "Bind Hotspot Server to this VLAN"}</span>
                          </label>
                        </div>
                        {dhcpIssue && (
                          <span className="text-xs text-amber-300 block">{isAr ? dhcpIssue.messageAr : dhcpIssue.messageEn}</span>
                        )}
                      </div>

                      {current.enableHotspotOnVlan && (
                        <div>
                          <label htmlFor={`vlan-${vlan.id}-dns`} className="text-xs text-slate-300 mb-1 block">
                            {isAr ? "رابط صفحة الدخول لهذا الفيلان (اختياري)" : "VLAN Hotspot DNS Name (Optional)"}
                          </label>
                          <input
                            id={`vlan-${vlan.id}-dns`}
                            name="vlanHotspotDnsName"
                            dir="ltr"
                            type="text"
                            className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400"
                            value={current.hotspotDnsName || ""}
                            onChange={(e) => setTempVlan({ ...tempVlan!, hotspotDnsName: e.target.value })}
                            placeholder={config.dnsName || "hotspot.local"}
                          />
                        </div>
                      )}

                      {config.useLanBridge && config.enableBridgeVlanFiltering && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                          <div>
                            <label htmlFor={`vlan-${vlan.id}-tagged`} className="text-xs text-slate-200 mb-1 block">
                              {isAr ? "منافذ Trunk (Tagged Ports)" : "Tagged (Trunk) Ports"}
                            </label>
                            <input
                              id={`vlan-${vlan.id}-tagged`}
                              name="vlanTaggedPorts"
                              dir="ltr"
                              type="text"
                              className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400"
                              value={current.taggedPorts || ""}
                              onChange={(e) => setTempVlan({ ...tempVlan!, taggedPorts: e.target.value })}
                              placeholder="ether2,ether3"
                            />
                          </div>
                          <div>
                            <label htmlFor={`vlan-${vlan.id}-untagged`} className="text-xs text-slate-200 mb-1 block">
                              {isAr ? "منافذ Access (Untagged Ports)" : "Untagged (Access) Ports"}
                            </label>
                            <input
                              id={`vlan-${vlan.id}-untagged`}
                              name="vlanUntaggedPorts"
                              dir="ltr"
                              type="text"
                              className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400"
                              value={current.untaggedPorts || ""}
                              onChange={(e) => setTempVlan({ ...tempVlan!, untaggedPorts: e.target.value })}
                              placeholder="ether4"
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="min-h-[44px] sm:min-h-[38px] text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg"
                        >
                          {isAr ? "إلغاء" : "Cancel"}
                        </button>
                        <button
                          type="button"
                          onClick={saveEdit}
                          className="min-h-[44px] sm:min-h-[38px] text-xs px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg font-semibold"
                        >
                          {isAr ? "حفظ التعديلات" : "Save VLAN"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span dir="ltr" className="font-mono bg-emerald-950 border border-emerald-700 text-emerald-300 px-2 py-0.5 rounded text-xs font-bold">
                            VLAN ID: {vlan.vlanId}
                          </span>
                          <h3 className="font-semibold text-slate-100 font-mono text-sm" dir="ltr">{vlan.name}</h3>
                          <span className="text-xs text-slate-400 font-mono">
                            ({isAr ? "على المنفذ:" : "on"} <bdi dir="ltr">{vlan.parentInterface}</bdi>)
                          </span>
                          {vlanIssues.length > 0 && (
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                hasVlanError
                                  ? "bg-red-950/70 border-red-700 text-red-200"
                                  : "bg-amber-950/70 border-amber-700 text-amber-200"
                              }`}
                            >
                              {hasVlanError
                                ? (isAr ? `${vlanIssues.length} خطأ` : `${vlanIssues.length} issue(s)`)
                                : (isAr ? `${vlanIssues.length} تنبيه` : `${vlanIssues.length} warning(s)`)}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
                          <div>{isAr ? "الجيتواي:" : "Gateway:"} <bdi dir="ltr" className="text-slate-100 font-mono">{vlan.gatewayIp}/{vlan.subnetMask}</bdi></div>
                          <div>{isAr ? "مجال DHCP:" : "Pool:"} <bdi dir="ltr" className="text-slate-200 font-mono">{vlan.poolStart} - {vlan.poolEnd}</bdi></div>
                          {vlan.enableHotspotOnVlan && (
                            <span className="text-emerald-400 font-semibold">{isAr ? "• الهوت سبوت مفعّل" : "• Hotspot Bound"}</span>
                          )}
                        </div>
                        {vlanIssues.length > 0 && (
                          <div className={`text-xs pt-0.5 ${hasVlanError ? "text-red-300" : "text-amber-300"}`}>
                            {isAr ? vlanIssues[0].messageAr : vlanIssues[0].messageEn}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(vlan)}
                          aria-label={isAr ? `تعديل ${vlan.name}` : `Edit ${vlan.name}`}
                          className="min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px] inline-flex items-center justify-center p-2 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded-lg transition"
                          title={isAr ? "تعديل" : "Edit"}
                        >
                          <Edit className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteVlan(vlan)}
                          aria-label={isAr ? `حذف ${vlan.name}` : `Delete ${vlan.name}`}
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
        open={confirmDeleteVlan !== null}
        dir={isAr ? "rtl" : "ltr"}
        title={isAr ? "حذف شبكة VLAN" : "Delete VLAN"}
        description={
          confirmDeleteVlan
            ? isAr
              ? `هل أنت متأكد من حذف شبكة VLAN "${confirmDeleteVlan.name}" (VLAN ID: ${confirmDeleteVlan.vlanId})؟`
              : `Are you sure you want to delete VLAN "${confirmDeleteVlan.name}" (VLAN ID: ${confirmDeleteVlan.vlanId})?`
            : ""
        }
        confirmLabel={isAr ? "حذف" : "Delete"}
        cancelLabel={isAr ? "إلغاء" : "Cancel"}
        onConfirm={() => {
          if (confirmDeleteVlan) {
            handleRemoveVlan(confirmDeleteVlan.id);
          }
          setConfirmDeleteVlan(null);
        }}
        onCancel={() => setConfirmDeleteVlan(null)}
      />
    </div>
  );
}
