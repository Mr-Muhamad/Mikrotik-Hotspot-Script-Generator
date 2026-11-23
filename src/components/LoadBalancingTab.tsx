/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { HotspotConfig, LoadBalancingMethod, WanLine } from "../types";
import { Network, Plus, Trash2, ArrowUpRight, Zap, Info, ShieldCheck, Check } from "lucide-react";

interface Props {
  config: HotspotConfig;
  onChange: (updates: Partial<HotspotConfig>) => void;
  lang: "ar" | "en";
}

export default function LoadBalancingTab({ config, onChange, lang }: Props) {
  const isAr = lang === "ar";

  const handleMethodChange = (method: LoadBalancingMethod) => {
    let defaultWanLines = config.wanLines || [];
    if (method !== "none" && defaultWanLines.length === 0) {
      defaultWanLines = [
        { id: "wan_1", name: "WAN1_DSL1", interfaceName: config.wanInterface || "ether1", gatewayIp: "192.168.1.1", distance: 1, weight: 1, type: "dhcp" },
        { id: "wan_2", name: "WAN2_DSL2", interfaceName: "ether3", gatewayIp: "192.168.2.1", distance: 1, weight: 1, type: "dhcp" }
      ];
    }
    onChange({ loadBalancingMethod: method, wanLines: defaultWanLines });
  };

  const handleAddWanLine = () => {
    const nextIdx = (config.wanLines?.length || 0) + 1;
    const newLine: WanLine = {
      id: `wan_${Date.now()}`,
      name: `WAN${nextIdx}_Line`,
      interfaceName: `ether${nextIdx + 1}`,
      gatewayIp: `192.168.${nextIdx}.1`,
      distance: 1,
      weight: 1,
      type: "dhcp"
    };
    onChange({ wanLines: [...(config.wanLines || []), newLine] });
  };

  const handleUpdateWanLine = (id: string, updates: Partial<WanLine>) => {
    const updated = (config.wanLines || []).map(line => line.id === id ? { ...line, ...updates } : line);
    onChange({ wanLines: updated });
  };

  const handleRemoveWanLine = (id: string) => {
    onChange({ wanLines: (config.wanLines || []).filter(line => line.id !== id) });
  };

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      {/* Tab Header */}
      <div className="border-b border-slate-800 pb-4">
        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <Network className="w-5 h-5 text-emerald-400" />
          {isAr ? "دمج وتوزيع خطوط الإنترنت (WAN Load Balancing)" : "WAN Load Balancing & Multi-WAN"}
        </h3>
        <p className="text-slate-400 text-sm mt-1">
          {isAr 
            ? "دمج عدة خطوط انترنت مضاعفة الباندويث أو إعداد خط احتياطي طوارئ (Failover)."
            : "Combine multiple ISP links for maximum bandwidth aggregation or automated failover."}
        </p>
      </div>

      {/* Recommended Method Explanation Box */}
      <div className="bg-emerald-950/30 border border-emerald-800/60 rounded-xl p-4 text-xs space-y-2">
        <div className="flex items-center gap-2 font-bold text-emerald-300">
          <Zap className="w-4 h-4 text-emerald-400" />
          <span>{isAr ? "ترشيح النظام الأفضل: تقنية PCC (Per Connection Classifier)" : "Top Recommendation: PCC Load Balancing"}</span>
        </div>
        <p className="text-slate-300 leading-relaxed">
          {isAr
            ? "تعد تقنية PCC هي الأفضل والأكثر استقراراً لشبكات الهوت سبوت والمؤسسات. تقوم بتقسيم الاتصالات بناءً على العنوان والمنفذ مما يمنع مشاكل مواقع البنوك وتطبيقات الشات (مثل الواتساب والفيسبوك) التي تتأثر بتغير الـ IP المفاجئ."
            : "PCC (Per Connection Classifier) is the industry standard for Hotspots. It groups connections cleanly by IP and ports, guaranteeing seamless session continuity for banking apps and SSL/TLS sites."}
        </p>
      </div>

      {/* Select Load Balancing Method */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-300 block">{isAr ? "اختر طريقة الدمج:" : "Select Load Balancing Technique:"}</label>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* PCC */}
          <div
            onClick={() => handleMethodChange("pcc")}
            className={`cursor-pointer border rounded-xl p-3.5 transition flex flex-col justify-between ${
              config.loadBalancingMethod === "pcc" 
                ? "bg-emerald-950/60 border-emerald-500 text-slate-100" 
                : "bg-slate-900/30 border-slate-800 text-slate-400 hover:bg-slate-900/60 hover:text-slate-200"
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-sm font-mono text-emerald-400">PCC (Per Connection)</span>
              <span className="text-[10px] bg-emerald-900/80 text-emerald-300 px-2 py-0.5 rounded font-bold">{isAr ? "الأفضل وموصى به" : "Recommended"}</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isAr ? "توزيع الاتصالات الذكي حسب الآيبي والمنفذ. يعطي أعلى استقرار للمواقع المشفرة HTTPS." : "Distributes sessions per-connection. Superior stability for banking, SSL & HTTPS traffic."}
            </p>
          </div>

          {/* Failover */}
          <div
            onClick={() => handleMethodChange("failover")}
            className={`cursor-pointer border rounded-xl p-3.5 transition flex flex-col justify-between ${
              config.loadBalancingMethod === "failover" 
                ? "bg-emerald-950/60 border-emerald-500 text-slate-100" 
                : "bg-slate-900/30 border-slate-800 text-slate-400 hover:bg-slate-900/60 hover:text-slate-200"
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-sm font-mono text-sky-400">Failover (Backup Route)</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isAr ? "خط رئيسي + خط طوارئ يعمل تلقائياً فقط عند انقطاع الخط الأول." : "Primary ISP route with auto-switch to Backup line upon packet loss."}
            </p>
          </div>

          {/* ECMP */}
          <div
            onClick={() => handleMethodChange("ecmp")}
            className={`cursor-pointer border rounded-xl p-3.5 transition flex flex-col justify-between ${
              config.loadBalancingMethod === "ecmp" 
                ? "bg-emerald-950/60 border-emerald-500 text-slate-100" 
                : "bg-slate-900/30 border-slate-800 text-slate-400 hover:bg-slate-900/60 hover:text-slate-200"
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-sm font-mono text-amber-400">ECMP (Equal Cost)</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isAr ? "دمج راوت سريع بدون مانجل، مفيد عند تساوي سرعات الخطوط تماماً." : "Simple multi-gateway routing for completely equal speed lines without Mangle."}
            </p>
          </div>

          {/* Disabled / Single WAN */}
          <div
            onClick={() => handleMethodChange("none")}
            className={`cursor-pointer border rounded-xl p-3.5 transition flex flex-col justify-between ${
              config.loadBalancingMethod === "none" 
                ? "bg-emerald-950/60 border-emerald-500 text-slate-100" 
                : "bg-slate-900/30 border-slate-800 text-slate-400 hover:bg-slate-900/60 hover:text-slate-200"
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-sm font-mono text-slate-300">{isAr ? "خط واحد (Single WAN)" : "Single WAN (Disabled)"}</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isAr ? "استخدام خط انترنت واحد عادي بدون دمج." : "Single ISP connection mode."}
            </p>
          </div>
        </div>
      </div>

      {/* Multi-WAN Configuration Details */}
      {config.loadBalancingMethod !== "none" && (
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-200">{isAr ? "خطوط الإنترنت المضافة للدمج:" : "WAN Lines Configuration:"}</span>
            <button
              type="button"
              onClick={handleAddWanLine}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition"
            >
              <Plus className="w-4 h-4" />
              {isAr ? "إضافة خط إنترنت آخر" : "Add WAN Line"}
            </button>
          </div>

          <div className="space-y-3">
            {(config.wanLines || []).map((line, index) => (
              <div key={line.id} className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    #{index + 1} - {line.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveWanLine(line.id)}
                    className="p-1 text-slate-500 hover:text-red-400 transition"
                    title={isAr ? "حذف الخط" : "Remove Line"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block">{isAr ? "اسم الخط" : "Line Tag Name"}</label>
                    <input
                      type="text"
                      className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none"
                      value={line.name}
                      onChange={(e) => handleUpdateWanLine(line.id, { name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block">{isAr ? "منفذ الكارت (Interface)" : "Router Ethernet Port"}</label>
                    <input
                      type="text"
                      className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none"
                      value={line.interfaceName}
                      onChange={(e) => handleUpdateWanLine(line.id, { interfaceName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block">{isAr ? "نوع الاتصال" : "Connection Type"}</label>
                    <select
                      className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none"
                      value={line.type}
                      onChange={(e) => handleUpdateWanLine(line.id, { type: e.target.value as any })}
                    >
                      <option value="dhcp">DHCP Client / Modem Router</option>
                      <option value="static">Static IP</option>
                      <option value="pppoe">PPPoE Dial-up</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                  {line.type === "pppoe" ? (
                    <>
                      <div>
                        <label className="text-[11px] text-slate-300 mb-1 block">{isAr ? "اسم مستخدم PPPoE" : "PPPoE Username"}</label>
                        <input
                          type="text"
                          className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none"
                          value={line.pppoeUser || ""}
                          onChange={(e) => handleUpdateWanLine(line.id, { pppoeUser: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-300 mb-1 block">{isAr ? "كلمة سر PPPoE" : "PPPoE Password"}</label>
                        <input
                          type="text"
                          className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none"
                          value={line.pppoePass || ""}
                          onChange={(e) => handleUpdateWanLine(line.id, { pppoePass: e.target.value })}
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="text-[11px] text-slate-300 mb-1 block">{isAr ? "عنوان الجيتواي للراوتر/الراوتر المودم" : "Modem Gateway IP"}</label>
                      <input
                        type="text"
                        className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none"
                        value={line.gatewayIp}
                        onChange={(e) => handleUpdateWanLine(line.id, { gatewayIp: e.target.value })}
                      />
                    </div>
                  )}

                  {config.loadBalancingMethod === "failover" && (
                    <div>
                      <label className="text-[11px] text-slate-300 mb-1 block">{isAr ? "أولوية المسار (Distance 1=رئيسي 2=احتياطي)" : "Distance (1=Primary, 2=Backup)"}</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none"
                        value={line.distance}
                        onChange={(e) => handleUpdateWanLine(line.id, { distance: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {config.loadBalancingMethod === "pcc" && (
            <label className="flex items-center gap-2 cursor-pointer pt-2 text-xs text-slate-300">
              <input
                type="checkbox"
                className="accent-emerald-500"
                checked={config.stickyConnections}
                onChange={(e) => onChange({ stickyConnections: e.target.checked })}
              />
              <span>{isAr ? "تفعيل تتبع الجلسات المتصلة (Sticky SSL Connections) لعدم تسجيل الخروج من البنوك والواتساب." : "Enable Sticky Connections for HTTPS/SSL continuity."}</span>
            </label>
          )}
        </div>
      )}
    </div>
  );
}
