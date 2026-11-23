/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { HotspotConfig, VlanConfig } from "../types";
import { Layers, Plus, Trash2, Edit, Check, ShieldCheck, Hash, Server } from "lucide-react";

interface Props {
  config: HotspotConfig;
  onChange: (updates: Partial<HotspotConfig>) => void;
  lang: "ar" | "en";
}

export default function VlanConfigTab({ config, onChange, lang }: Props) {
  const isAr = lang === "ar";
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempVlan, setTempVlan] = useState<VlanConfig | null>(null);

  const handleToggleVlans = (enabled: boolean) => {
    onChange({ enableVlans: enabled });
  };

  const handleAddVlan = () => {
    const newId = `vlan_${Date.now()}`;
    const nextVlanId = (config.vlans?.length || 0) * 10 + 10;
    const newVlan: VlanConfig = {
      id: newId,
      name: `vlan${nextVlanId}_office`,
      vlanId: nextVlanId,
      parentInterface: config.lanInterface || "ether2",
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
  };

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      {/* Enable VLAN Header */}
      <div className="border-b border-slate-800 pb-4 flex justify-between items-center flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            {isAr ? "إدارة الشبكات الافتراضية (VLANs Setup)" : "VLAN Configuration"}
          </h3>
          <p className="text-slate-400 text-sm mt-1">
            {isAr 
              ? "إنشاء فيلانات معزولة، تخصيص عناوين IP، سيرفرات DHCP، وربط سيرفر الهوتسبوت بها."
              : "Create tagged VLAN interfaces, assign IP gateways, DHCP pools, and tie Hotspots to VLANs."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={config.enableVlans}
              onChange={(e) => handleToggleVlans(e.target.checked)}
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white"></div>
          </label>
          <span className="text-xs font-semibold text-slate-300">
            {config.enableVlans ? (isAr ? "الفيلان مفعّل" : "VLANs Active") : (isAr ? "الفيلان معطّل" : "VLANs Disabled")}
          </span>
        </div>
      </div>

      {config.enableVlans && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">
              {isAr ? "قائمة شبكات الـ VLAN المضافة:" : "Configured VLAN interfaces:"}
            </span>
            <button
              type="button"
              onClick={handleAddVlan}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition"
            >
              <Plus className="w-4 h-4" />
              {isAr ? "إضافة VLAN جديد" : "Add New VLAN"}
            </button>
          </div>

          {(!config.vlans || config.vlans.length === 0) ? (
            <div className="text-center py-10 border-2 border-dashed border-slate-800 rounded-xl">
              <p className="text-slate-400 text-sm">{isAr ? "لم تقم بإضافة أية شبكات VLAN بعد. اضغط على إضافة للتخصيص." : "No VLAN interfaces configured yet."}</p>
            </div>
          ) : (
            config.vlans.map((vlan) => {
              const isEditing = editingId === vlan.id;
              const current = isEditing && tempVlan ? tempVlan : vlan;

              return (
                <div
                  key={vlan.id}
                  className={`border rounded-xl p-4 transition-all ${
                    isEditing 
                      ? "bg-slate-800/80 border-emerald-500/50 shadow-md" 
                      : "bg-slate-900/40 border-slate-800 hover:bg-slate-900/60"
                  }`}
                >
                  {isEditing ? (
                    /* Edit Form */
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs text-slate-400 mb-1 block">{isAr ? "اسم الفيلان (Interface Name)" : "VLAN Name"}</label>
                          <input
                            type="text"
                            className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none"
                            value={current.name}
                            onChange={(e) => setTempVlan({ ...tempVlan!, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 mb-1 block">{isAr ? "رقم الفيلان (VLAN ID)" : "VLAN ID (Tag)"}</label>
                          <input
                            type="number"
                            min="1"
                            max="4094"
                            className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none"
                            value={current.vlanId}
                            onChange={(e) => setTempVlan({ ...tempVlan!, vlanId: parseInt(e.target.value) || 10 })}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 mb-1 block">{isAr ? "المنفذ الرئيسي (Parent Interface)" : "Parent Interface"}</label>
                          <input
                            type="text"
                            className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none"
                            value={current.parentInterface}
                            onChange={(e) => setTempVlan({ ...tempVlan!, parentInterface: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                        <div>
                          <label className="text-xs text-slate-300 mb-1 block">{isAr ? "عنوان الجيتواي (Gateway IP)" : "Gateway IP"}</label>
                          <input
                            type="text"
                            className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none"
                            value={current.gatewayIp}
                            onChange={(e) => setTempVlan({ ...tempVlan!, gatewayIp: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-300 mb-1 block">{isAr ? "بداية توزيع DHCP" : "DHCP Pool Start"}</label>
                          <input
                            type="text"
                            className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none"
                            value={current.poolStart}
                            onChange={(e) => setTempVlan({ ...tempVlan!, poolStart: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-300 mb-1 block">{isAr ? "نهاية توزيع DHCP" : "DHCP Pool End"}</label>
                          <input
                            type="text"
                            className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none"
                            value={current.poolEnd}
                            onChange={(e) => setTempVlan({ ...tempVlan!, poolEnd: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="accent-emerald-500"
                            checked={current.dhcpEnabled}
                            onChange={(e) => setTempVlan({ ...tempVlan!, dhcpEnabled: e.target.checked })}
                          />
                          <span>{isAr ? "تفعيل سيرفر DHCP لهذا الفيلان" : "Enable DHCP Server"}</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="accent-emerald-500"
                            checked={current.enableHotspotOnVlan}
                            onChange={(e) => setTempVlan({ ...tempVlan!, enableHotspotOnVlan: e.target.checked })}
                          />
                          <span>{isAr ? "تفعيل خدمة الهوت سبوت على هذا الفيلان" : "Bind Hotspot Server to this VLAN"}</span>
                        </label>
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg"
                        >
                          {isAr ? "إلغاء" : "Cancel"}
                        </button>
                        <button
                          type="button"
                          onClick={saveEdit}
                          className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium"
                        >
                          {isAr ? "حفظ التعديلات" : "Save VLAN"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono bg-emerald-950 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded text-xs font-bold">
                            VLAN ID: {vlan.vlanId}
                          </span>
                          <h4 className="font-semibold text-slate-200 font-mono text-sm">{vlan.name}</h4>
                          <span className="text-xs text-slate-500 font-mono">({isAr ? "على المنفذ:" : "on"} {vlan.parentInterface})</span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                          <div>{isAr ? "الجيتواي:" : "Gateway:"} <span className="text-slate-200 font-mono">{vlan.gatewayIp}/{vlan.subnetMask}</span></div>
                          <div>{isAr ? "مجال DHCP:" : "Pool:"} <span className="text-slate-300 font-mono">{vlan.poolStart} - {vlan.poolEnd}</span></div>
                          {vlan.enableHotspotOnVlan && (
                            <span className="text-emerald-400 font-semibold">{isAr ? "• الهوت سبوت مفعّل" : "• Hotspot Bound"}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(vlan)}
                          className="p-2 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 rounded-lg transition"
                          title={isAr ? "تعديل" : "Edit"}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveVlan(vlan.id)}
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
      )}
    </div>
  );
}
