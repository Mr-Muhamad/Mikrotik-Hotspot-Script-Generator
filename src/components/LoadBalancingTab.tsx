/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import { useState } from "react";
import type { HotspotConfig, LoadBalancingMethod, WanLine } from "../types";
import type { ValidationIssue } from "../utils/validation";
import { DEFAULT_CANARIES } from "../utils/scriptGenerator";
import { Eye, EyeOff, Network, Plus, Trash2, Zap } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";

interface Props {
  config: HotspotConfig;
  onChange: (updates: Partial<HotspotConfig>) => void;
  lang: "ar" | "en";
  issues?: ValidationIssue[];
}

export default function LoadBalancingTab({ config, onChange, lang, issues = [] }: Props) {
  const isAr = lang === "ar";
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [confirmDeleteWan, setConfirmDeleteWan] = useState<WanLine | null>(null);

  const handleMethodChange = (method: LoadBalancingMethod) => {
    let defaultWanLines = config.wanLines || [];
    if (method !== "none" && defaultWanLines.length === 0) {
      defaultWanLines = [
        { id: "wan_1", name: "WAN1_DSL1", interfaceName: config.wanInterface || "ether1", gatewayIp: "192.168.1.1", staticIp: "192.168.1.2/24", checkHost: DEFAULT_CANARIES[0], useInterfaceGateway: false, distance: 1, weight: 1, type: "dhcp" },
        { id: "wan_2", name: "WAN2_DSL2", interfaceName: "ether3", gatewayIp: "192.168.2.1", staticIp: "192.168.2.2/24", checkHost: DEFAULT_CANARIES[1], useInterfaceGateway: false, distance: 1, weight: 1, type: "dhcp" }
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
      staticIp: `192.168.${nextIdx}.2/24`,
      checkHost: DEFAULT_CANARIES[(nextIdx - 1) % DEFAULT_CANARIES.length],
      useInterfaceGateway: false,
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
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <Network className="w-5 h-5 text-emerald-400" aria-hidden="true" />
          {isAr ? "دمج وتوزيع خطوط الإنترنت (WAN Load Balancing)" : "WAN Load Balancing & Multi-WAN"}
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          {isAr
            ? "دمج عدة خطوط انترنت مضاعفة الباندويث أو إعداد خط احتياطي طوارئ (Failover)."
            : "Combine multiple ISP links for maximum bandwidth aggregation or automated failover."}
        </p>
      </div>

      {/* Recommended Method Explanation Box */}
      <div className="bg-emerald-950/30 border border-emerald-800/60 rounded-xl p-4 text-xs space-y-2">
        <div className="flex items-center gap-2 font-bold text-emerald-300">
          <Zap className="w-4 h-4 text-emerald-400" aria-hidden="true" />
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
        <span className="text-xs font-semibold text-slate-200 block">{isAr ? "اختر طريقة الدمج:" : "Select Load Balancing Technique:"}</span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* PCC */}
          <button
            type="button"
            onClick={() => handleMethodChange("pcc")}
            aria-pressed={config.loadBalancingMethod === "pcc"}
            className={`min-h-[44px] border rounded-xl p-3.5 transition flex flex-col justify-between text-start ${
              config.loadBalancingMethod === "pcc"
                ? "bg-emerald-950/60 border-emerald-500 text-slate-100"
                : "bg-slate-900/30 border-slate-800 text-slate-300 hover:bg-slate-900/60 hover:text-white"
            }`}
          >
            <div className="flex justify-between items-start gap-2 mb-1 w-full">
              <span dir="ltr" className="font-bold text-sm font-mono text-emerald-400">PCC (Per Connection)</span>
              <span className="text-[11px] bg-emerald-900/80 text-emerald-200 px-2 py-0.5 rounded font-bold whitespace-nowrap shrink-0">{isAr ? "الأفضل وموصى به" : "Recommended"}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isAr ? "توزيع الاتصالات الذكي حسب الآيبي والمنفذ. يعطي أعلى استقرار للمواقع المشفرة HTTPS." : "Distributes sessions per-connection. Superior stability for banking, SSL & HTTPS traffic."}
            </p>
          </button>

          {/* NTH */}
          <button
            type="button"
            onClick={() => handleMethodChange("nth")}
            aria-pressed={config.loadBalancingMethod === "nth"}
            className={`min-h-[44px] border rounded-xl p-3.5 transition flex flex-col justify-between text-start ${
              config.loadBalancingMethod === "nth"
                ? "bg-emerald-950/60 border-emerald-500 text-slate-100"
                : "bg-slate-900/30 border-slate-800 text-slate-300 hover:bg-slate-900/60 hover:text-white"
            }`}
          >
            <div className="flex justify-between items-center mb-1 w-full">
              <span className="font-bold text-sm font-mono text-cyan-400">NTH (Round-Robin)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isAr ? "توزيع متعاقب لكل اتصال جديد بالتناوب بين الخطوط حسب النسبة المحددة." : "Round-robin distribution of new connections across WAN links by configured ratio."}
            </p>
          </button>

          {/* Failover */}
          <button
            type="button"
            onClick={() => handleMethodChange("failover")}
            aria-pressed={config.loadBalancingMethod === "failover"}
            className={`min-h-[44px] border rounded-xl p-3.5 transition flex flex-col justify-between text-start ${
              config.loadBalancingMethod === "failover"
                ? "bg-emerald-950/60 border-emerald-500 text-slate-100"
                : "bg-slate-900/30 border-slate-800 text-slate-300 hover:bg-slate-900/60 hover:text-white"
            }`}
          >
            <div className="flex justify-between items-center mb-1 w-full">
              <span className="font-bold text-sm font-mono text-sky-400">Failover (Backup Route)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isAr ? "خط رئيسي + خط طوارئ يعمل تلقائياً فقط عند انقطاع الخط الأول." : "Primary ISP route with auto-switch to Backup line upon packet loss."}
            </p>
          </button>

          {/* ECMP */}
          <button
            type="button"
            onClick={() => handleMethodChange("ecmp")}
            aria-pressed={config.loadBalancingMethod === "ecmp"}
            className={`min-h-[44px] border rounded-xl p-3.5 transition flex flex-col justify-between text-start ${
              config.loadBalancingMethod === "ecmp"
                ? "bg-emerald-950/60 border-emerald-500 text-slate-100"
                : "bg-slate-900/30 border-slate-800 text-slate-300 hover:bg-slate-900/60 hover:text-white"
            }`}
          >
            <div className="flex justify-between items-center mb-1 w-full">
              <span className="font-bold text-sm font-mono text-amber-400">ECMP (Equal Cost)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isAr ? "دمج راوت سريع بدون مانجل، مفيد عند تساوي سرعات الخطوط تماماً." : "Simple multi-gateway routing for completely equal speed lines without Mangle."}
            </p>
          </button>

          {/* Disabled / Single WAN */}
          <button
            type="button"
            onClick={() => handleMethodChange("none")}
            aria-pressed={config.loadBalancingMethod === "none"}
            className={`min-h-[44px] border rounded-xl p-3.5 transition flex flex-col justify-between text-start sm:col-span-2 ${
              config.loadBalancingMethod === "none"
                ? "bg-emerald-950/60 border-emerald-500 text-slate-100"
                : "bg-slate-900/30 border-slate-800 text-slate-300 hover:bg-slate-900/60 hover:text-white"
            }`}
          >
            <div className="flex justify-between items-center mb-1 w-full">
              <span className="font-bold text-sm font-mono text-slate-200">{isAr ? "خط واحد (Single WAN)" : "Single WAN (Disabled)"}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isAr ? "استخدام خط انترنت واحد عادي بدون دمج." : "Single ISP connection mode."}
            </p>
          </button>
        </div>
      </div>

      {/* Multi-WAN Configuration Details */}
      {config.loadBalancingMethod !== "none" && (
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex justify-between items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-200">{isAr ? "خطوط الإنترنت المضافة للدمج:" : "WAN Lines Configuration:"}</span>
            <button
              type="button"
              onClick={handleAddWanLine}
              className="min-h-[44px] sm:min-h-[40px] flex items-center gap-1.5 text-xs px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg font-semibold transition"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              {isAr ? "إضافة خط إنترنت آخر" : "Add WAN Line"}
            </button>
          </div>

          {(() => {
            const globalIssues = issues.filter(
              (i) =>
                i.tab === 2 &&
                (i.id === "wan_min_lines" ||
                  i.id.startsWith("wan_dup_canary_") ||
                  i.id.startsWith("wan_dup_gw_"))
            );
            if (globalIssues.length === 0) return null;
            return (
              <div className="space-y-1.5">
                {globalIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className={`rounded-lg px-3 py-2 text-xs border ${
                      issue.severity === "error"
                        ? "bg-red-950/40 border-red-800/80 text-red-300"
                        : "bg-amber-950/40 border-amber-800/80 text-amber-300"
                    }`}
                  >
                    {isAr ? issue.messageAr : issue.messageEn}
                  </div>
                ))}
              </div>
            );
          })()}

          <div className="space-y-3">
            {(config.wanLines || []).map((line, index) => {
              const getWanIssue = (fieldName: string) =>
                issues.find((i) => i.tab === 2 && i.field === `wan_${index}_${fieldName}`);
              const ifaceError = getWanIssue("interfaceName");
              const gwError = getWanIssue("gatewayIp");
              const staticIpError = getWanIssue("staticIp");
              const pppoeUserError = getWanIssue("pppoeUser");
              const checkHostError = getWanIssue("checkHost");

              return (
              <div key={line.id} className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <span dir="ltr" className="text-xs font-bold text-emerald-400 font-mono">
                    #{index + 1} - {line.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteWan(line)}
                    aria-label={isAr ? `حذف الخط ${line.name}` : `Remove line ${line.name}`}
                    className="min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px] inline-flex items-center justify-center p-2 text-slate-300 hover:text-red-300 hover:bg-red-950/40 rounded-lg transition"
                    title={isAr ? "حذف الخط" : "Remove Line"}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                  <div>
                    <label htmlFor={`wan-${line.id}-name`} className="text-xs text-slate-300 mb-1 block">{isAr ? "اسم الخط" : "Line Tag Name"}</label>
                    <input
                      id={`wan-${line.id}-name`}
                      name={`wanName_${line.id}`}
                      dir="ltr"
                      type="text"
                      className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400"
                      value={line.name}
                      onChange={(e) => handleUpdateWanLine(line.id, { name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor={`wan-${line.id}-iface`} className="text-xs text-slate-300 mb-1 block">{isAr ? "منفذ الكارت (Interface)" : "Router Ethernet Port"}</label>
                    <input
                      id={`wan-${line.id}-iface`}
                      name={`wan_${index}_interfaceName`}
                      dir="ltr"
                      type="text"
                      aria-invalid={Boolean(ifaceError)}
                      className={`w-full min-h-[44px] sm:min-h-[38px] bg-slate-900 border text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400 ${
                        ifaceError ? "border-red-500" : "border-slate-700"
                      }`}
                      value={line.interfaceName}
                      onChange={(e) => handleUpdateWanLine(line.id, { interfaceName: e.target.value })}
                    />
                    {ifaceError && (
                      <span className="text-xs text-red-300 mt-1 block">{isAr ? ifaceError.messageAr : ifaceError.messageEn}</span>
                    )}
                  </div>
                  <div>
                    <label htmlFor={`wan-${line.id}-type`} className="text-xs text-slate-300 mb-1 block">{isAr ? "نوع الاتصال" : "Connection Type"}</label>
                    <select
                      id={`wan-${line.id}-type`}
                      name={`wanType_${line.id}`}
                      dir="ltr"
                      className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400"
                      value={line.type}
                      onChange={(e) => handleUpdateWanLine(line.id, { type: e.target.value as WanLine["type"] })}
                    >
                      <option value="dhcp">DHCP Client / Modem Router</option>
                      <option value="static">Static IP</option>
                      <option value="pppoe">PPPoE Dial-up</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                  {line.type === "pppoe" ? (
                    <>
                      <div>
                        <label htmlFor={`wan-${line.id}-pppoe-user`} className="text-xs text-slate-200 mb-1 block">{isAr ? "اسم مستخدم PPPoE" : "PPPoE Username"}</label>
                        <input
                          id={`wan-${line.id}-pppoe-user`}
                          name={`wan_${index}_pppoeUser`}
                          dir="ltr"
                          type="text"
                          aria-invalid={Boolean(pppoeUserError)}
                          className={`w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400 ${
                            pppoeUserError ? "border-red-500" : "border-slate-700"
                          }`}
                          value={line.pppoeUser || ""}
                          onChange={(e) => handleUpdateWanLine(line.id, { pppoeUser: e.target.value })}
                        />
                        {pppoeUserError && (
                          <span className="text-xs text-red-300 mt-1 block">{isAr ? pppoeUserError.messageAr : pppoeUserError.messageEn}</span>
                        )}
                      </div>
                      <div>
                        <label htmlFor={`wan-${line.id}-pppoe-pass`} className="text-xs text-slate-200 mb-1 block">{isAr ? "كلمة سر PPPoE" : "PPPoE Password"}</label>
                        <div className="relative flex items-center">
                          <input
                            id={`wan-${line.id}-pppoe-pass`}
                            name={`wanPppoePass_${line.id}`}
                            dir="ltr"
                            type={visiblePasswords[line.id] ? "text" : "password"}
                            className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 pe-11 sm:pe-10 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400"
                            value={line.pppoePass || ""}
                            onChange={(e) => handleUpdateWanLine(line.id, { pppoePass: e.target.value })}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setVisiblePasswords((prev) => ({ ...prev, [line.id]: !prev[line.id] }))
                            }
                            aria-label={visiblePasswords[line.id] ? (isAr ? "إخفاء كلمة السر" : "Hide password") : (isAr ? "إظهار كلمة السر" : "Show password")}
                            className="absolute end-1 min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] inline-flex items-center justify-center text-slate-400 hover:text-slate-100 rounded"
                          >
                            {visiblePasswords[line.id] ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label htmlFor={`wan-${line.id}-gw`} className="text-xs text-slate-200 mb-1 block">{isAr ? "عنوان الجيتواي للراوتر/المودم" : "Modem Gateway IP"}</label>
                        <input
                          id={`wan-${line.id}-gw`}
                          name={`wan_${index}_gatewayIp`}
                          dir="ltr"
                          type="text"
                          aria-invalid={Boolean(gwError)}
                          className={`w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400 ${
                            gwError ? "border-red-500" : "border-slate-700"
                          }`}
                          value={line.gatewayIp}
                          onChange={(e) => handleUpdateWanLine(line.id, { gatewayIp: e.target.value })}
                        />
                        {gwError && (
                          <span className="text-xs text-red-300 mt-1 block">{isAr ? gwError.messageAr : gwError.messageEn}</span>
                        )}
                      </div>

                      {line.type === "static" && (
                        <div>
                          <label htmlFor={`wan-${line.id}-static-ip`} className="text-xs text-slate-200 mb-1 block">{isAr ? "عنوان IP للخط مع القناع (CIDR)" : "Static IP/Mask (CIDR)"}</label>
                          <input
                            id={`wan-${line.id}-static-ip`}
                            name={`wan_${index}_staticIp`}
                            dir="ltr"
                            type="text"
                            aria-invalid={Boolean(staticIpError)}
                            className={`w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400 ${
                              staticIpError ? "border-red-500" : "border-slate-700"
                            }`}
                            value={line.staticIp || ""}
                            onChange={(e) => handleUpdateWanLine(line.id, { staticIp: e.target.value })}
                            placeholder="192.168.1.2/24"
                          />
                          {staticIpError && (
                            <span className="text-xs text-red-300 mt-1 block">{isAr ? staticIpError.messageAr : staticIpError.messageEn}</span>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {config.enableRecursiveFailover && (
                    <div>
                      <label htmlFor={`wan-${line.id}-check`} className="text-xs text-slate-200 mb-1 block">{isAr ? "هدف الفحص المتكرر (Canary Host)" : "Recursive Ping Target"}</label>
                      <input
                        id={`wan-${line.id}-check`}
                        name={`wan_${index}_checkHost`}
                        dir="ltr"
                        type="text"
                        aria-invalid={Boolean(checkHostError)}
                        className={`w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400 ${
                          checkHostError ? "border-red-500" : "border-slate-700"
                        }`}
                        value={line.checkHost || ""}
                        onChange={(e) => handleUpdateWanLine(line.id, { checkHost: e.target.value })}
                        placeholder={DEFAULT_CANARIES[index % DEFAULT_CANARIES.length]}
                      />
                      {checkHostError && (
                        <span className="text-xs text-red-300 mt-1 block">{isAr ? checkHostError.messageAr : checkHostError.messageEn}</span>
                      )}
                    </div>
                  )}

                  {config.loadBalancingMethod === "failover" && (
                    <div>
                      <label htmlFor={`wan-${line.id}-distance`} className="text-xs text-slate-200 mb-1 block">{isAr ? "أولوية المسار (Distance 1=رئيسي 2=احتياطي)" : "Distance (1=Primary, 2=Backup)"}</label>
                      <input
                        id={`wan-${line.id}-distance`}
                        name={`wanDistance_${line.id}`}
                        dir="ltr"
                        type="number"
                        min="1"
                        max="10"
                        className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400"
                        value={line.distance}
                        onChange={(e) => handleUpdateWanLine(line.id, { distance: parseInt(e.target.value, 10) || 1 })}
                      />
                    </div>
                  )}

                  {(config.loadBalancingMethod === "pcc" || config.loadBalancingMethod === "nth" || config.loadBalancingMethod === "ecmp") && (
                    <div>
                      <label htmlFor={`wan-${line.id}-weight`} className="text-xs text-slate-200 mb-1 block">{isAr ? "نسبة/وزن التحميل للخط (Weight)" : "Load Weight / Ratio"}</label>
                      <input
                        id={`wan-${line.id}-weight`}
                        name={`wanWeight_${line.id}`}
                        dir="ltr"
                        type="number"
                        min="1"
                        max="10"
                        className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-400"
                        value={line.weight || 1}
                        onChange={(e) => handleUpdateWanLine(line.id, { weight: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                      />
                    </div>
                  )}

                  {line.type !== "pppoe" && (
                    <label htmlFor={`wan-${line.id}-scope-if`} className="min-h-[44px] sm:min-h-[32px] flex items-center gap-2 cursor-pointer text-xs text-slate-200 sm:col-span-2 pt-1">
                      <input
                        id={`wan-${line.id}-scope-if`}
                        name={`wanScopeIf_${line.id}`}
                        type="checkbox"
                        className="w-4 h-4 flex-shrink-0 accent-emerald-500"
                        checked={Boolean(line.useInterfaceGateway)}
                        onChange={(e) => handleUpdateWanLine(line.id, { useInterfaceGateway: e.target.checked })}
                      />
                      <span>
                        {isAr ? "تحديد المنفذ مع البوابة (" : "Scope gateway to interface ("}
                        <bdi dir="ltr" className="font-mono text-emerald-300">
                          {line.gatewayIp || "192.168.1.1"}%{line.interfaceName || "ether1"}
                        </bdi>
                        {isAr ? ") لتفادي تعارض تشابه IP المودمات" : ") for identical modem IPs"}
                      </span>
                    </label>
                  )}
                </div>
              </div>
              );
            })}
          </div>

          <div className="space-y-1.5 pt-2">
            <label htmlFor="lb-recursive-failover" className="min-h-[44px] sm:min-h-[32px] flex items-center gap-2 cursor-pointer text-xs text-slate-200">
              <input
                id="lb-recursive-failover"
                name="enableRecursiveFailover"
                type="checkbox"
                className="w-4 h-4 flex-shrink-0 accent-emerald-500"
                checked={config.enableRecursiveFailover}
                onChange={(e) => onChange({ enableRecursiveFailover: e.target.checked })}
              />
              <span>
                {isAr
                  ? "تفعيل الفيل أوفر الحقيقي للإنترنت (Recursive Failover) عبر فحص 8.8.8.8 / 1.1.1.1 بدلاً من الاكتفاء ببينج المودم."
                  : "Enable Recursive Internet Failover (pings external targets like 8.8.8.8 / 1.1.1.1 instead of only the local modem)."}
              </span>
            </label>

            {config.loadBalancingMethod === "pcc" && (
              <label htmlFor="lb-sticky-connections" className="min-h-[44px] sm:min-h-[32px] flex items-center gap-2 cursor-pointer text-xs text-slate-200">
                <input
                  id="lb-sticky-connections"
                  name="stickyConnections"
                  type="checkbox"
                  className="w-4 h-4 flex-shrink-0 accent-emerald-500"
                  checked={config.stickyConnections}
                  onChange={(e) => onChange({ stickyConnections: e.target.checked })}
                />
                <span>{isAr ? "تفعيل تتبع الجلسات المتصلة (Sticky SSL Connections) لعدم تسجيل الخروج من البنوك والواتساب." : "Enable Sticky Connections for HTTPS/SSL continuity."}</span>
              </label>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteWan !== null}
        dir={isAr ? "rtl" : "ltr"}
        title={isAr ? "حذف خط الإنترنت" : "Delete WAN Line"}
        description={
          confirmDeleteWan
            ? isAr
              ? `هل أنت متأكد من حذف خط الإنترنت "${confirmDeleteWan.name}" (${confirmDeleteWan.interfaceName})؟`
              : `Are you sure you want to remove WAN line "${confirmDeleteWan.name}" (${confirmDeleteWan.interfaceName})?`
            : ""
        }
        confirmLabel={isAr ? "حذف" : "Delete"}
        cancelLabel={isAr ? "إلغاء" : "Cancel"}
        onConfirm={() => {
          if (confirmDeleteWan) {
            handleRemoveWanLine(confirmDeleteWan.id);
          }
          setConfirmDeleteWan(null);
        }}
        onCancel={() => setConfirmDeleteWan(null)}
      />
    </div>
  );
}
