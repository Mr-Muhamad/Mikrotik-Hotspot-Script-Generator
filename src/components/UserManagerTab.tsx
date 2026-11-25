/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from "react";
import type { AuthMode, HotspotConfig, HotspotUserProfile } from "../types";
import type { ValidationIssue } from "../utils/validation";
import { ShieldCheck, Server, Cpu, Gauge, CalendarClock, ArrowRight } from "lucide-react";
import ToggleSwitch from "./ToggleSwitch";
import { handleTabListKeyDown } from "../utils/tabKeyboard";
import UmServerSubTab from "./userman/UmServerSubTab";
import UmLimitationsSubTab from "./userman/UmLimitationsSubTab";
import UmProfilesSubTab from "./userman/UmProfilesSubTab";

interface Props {
  config: HotspotConfig;
  hotspotProfiles: HotspotUserProfile[];
  onChange: (updates: Partial<HotspotConfig>) => void;
  onNavigateTab: (tab: number) => void;
  lang: "ar" | "en";
  onDirtyChange?: (dirty: boolean) => void;
  issues?: ValidationIssue[];
}

type UmSubTab = "server" | "limitations" | "profiles";

const UM_SUB_TABS: readonly UmSubTab[] = ["server", "limitations", "profiles"];

export default function UserManagerTab({
  config,
  hotspotProfiles,
  onChange,
  onNavigateTab,
  lang,
  onDirtyChange,
  issues = [],
}: Props) {
  const isAr = lang === "ar";
  const isV7 = config.rosVersion === "v7";
  const authMode: AuthMode = config.authMode || (config.enableUserManager ? "userman_radius" : "hotspot_only");
  const radiusBackend = config.radiusBackend === "external_radius" ? "external_radius" : "userman_local";
  const isExternalRadius = radiusBackend === "external_radius";

  const [subTab, setSubTab] = useState<UmSubTab>("server");
  const [subDirty, setSubDirty] = useState(false);

  const umLimitationsCount = (config.umLimitations || []).length;
  const umProfilesCount = (config.umProfiles || []).length;

  const umServerIssues = issues.filter(
    (i) =>
      i.tab === 4 &&
      (i.id.startsWith("um_radius_") ||
        i.id.startsWith("ext_radius_") ||
        i.id.startsWith("um_group_") ||
        i.id.startsWith("um_weak_"))
  );
  const umLimIssues = issues.filter((i) => i.tab === 4 && i.id.startsWith("um_lim_"));
  const umProfIssues = issues.filter(
    (i) => i.tab === 4 && (i.id.startsWith("um_prof_") || i.id.startsWith("um_sched_"))
  );

  const subTabIssues: Record<UmSubTab, ValidationIssue[]> = {
    server: umServerIssues,
    limitations: umLimIssues,
    profiles: umProfIssues,
  };

  useEffect(() => {
    onDirtyChange?.(authMode !== "hotspot_only" && !isExternalRadius && subDirty);
  }, [authMode, isExternalRadius, subDirty, onDirtyChange]);

  useEffect(() => {
    return () => {
      onDirtyChange?.(false);
    };
  }, [onDirtyChange]);

  const tabMeta: Record<UmSubTab, { label: string; icon: typeof Server }> = {
    server: {
      label: isAr ? "الربط والخادم" : "RADIUS & Server",
      icon: Server,
    },
    limitations: {
      label: `${isAr ? "القيود والكوتا" : "Limitations"} (${umLimitationsCount})`,
      icon: Gauge,
    },
    profiles: {
      label: `${isAr ? "الباقات والجدولة" : "Profiles"} (${umProfilesCount})`,
      icon: CalendarClock,
    },
  };

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <div className="border-b border-slate-800 pb-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" aria-hidden="true" />
              {isAr ? "خادم RADIUS واليوزر مانجر (User Manager & External RADIUS)" : "RADIUS Server & User Manager Studio"}
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              {isAr
                ? "اختر بين اليوزر مانجر المدمج على نفس الراوتر (v6/v7) أو الربط مع سيرفر RADIUS خارجي مستقل."
                : "Choose between MikroTik built-in User Manager (v6/v7) or connecting a standalone external RADIUS server."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ToggleSwitch
              id="um-enable-switch"
              checked={authMode !== "hotspot_only"}
              onChange={(checked) =>
                onChange({ authMode: checked ? "userman_radius" : "hotspot_only" })
              }
              ariaLabel={isAr ? "تفعيل المصادقة عبر RADIUS" : "Enable RADIUS Authentication"}
            />
            <span className="text-sm font-medium text-slate-200">
              {authMode !== "hotspot_only" ? (isAr ? "RADIUS مفعّل" : "RADIUS Active") : (isAr ? "معطّل" : "Disabled")}
            </span>
          </div>
        </div>
      </div>

      {authMode === "hotspot_only" ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-8 text-center text-slate-300 space-y-4">
          <p className="text-sm leading-relaxed max-w-lg mx-auto">
            {isAr
              ? "أنت الآن على وضع (هوتسبوت محلي فقط). إذا أردت بيع كروت بصلاحية وأسعار وكوتا وتجديد عدادات تلقائي، فعّل اليوزر مانجر عبر RADIUS."
              : "You are currently in Hotspot Local Only mode. Enable User Manager RADIUS for prices, validity timers, quota resets, and time-scheduled limits."}
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onChange({ authMode: "userman_radius" })}
              className="min-h-[44px] sm:min-h-[40px] px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-semibold transition"
            >
              {isAr ? "تفعيل اليوزر مانجر (RADIUS)" : "Enable User Manager (RADIUS)"}
            </button>
            <button
              type="button"
              onClick={() => onChange({ authMode: "hybrid" })}
              className="min-h-[44px] sm:min-h-[40px] px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-lg text-xs font-medium transition"
            >
              {isAr ? "تفعيل الوضع الهجين (الاثنين معاً)" : "Enable Hybrid Mode"}
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab(3)}
              className="min-h-[44px] sm:min-h-[40px] inline-flex items-center gap-1.5 px-3 py-2 text-xs text-emerald-400 hover:underline"
            >
              <span>{isAr ? "بروفايلات الهوتسبوت المحلية" : "Local Hotspot Profiles"}</span>
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* RADIUS Backend Selector: Local User Manager vs External RADIUS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="group" aria-label={isAr ? "نوع خادم RADIUS" : "RADIUS Backend Mode"}>
            <button
              type="button"
              onClick={() => {
                onChange({
                  radiusBackend: "userman_local",
                  radiusServerIp: !config.radiusServerIp.trim() || config.radiusServerIp === "192.168.1.200"
                    ? "127.0.0.1"
                    : config.radiusServerIp,
                });
              }}
              aria-pressed={!isExternalRadius}
              className={`min-h-[44px] text-start p-3.5 rounded-xl border transition ${
                !isExternalRadius
                  ? "bg-emerald-950/60 border-emerald-500 text-slate-100"
                  : "bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700"
              }`}
            >
              <div className="text-xs font-bold text-emerald-300">
                {isAr ? "اليوزر مانجر المدمج (User Manager)" : "Built-in User Manager (v6 / v7)"}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                {isAr
                  ? "يولّد أوامر /radius مع /user-manager (أو /tool user-manager في v6) والباقات والقيود على نفس الراوتر."
                  : "Generates /radius plus local /user-manager (v7) or /tool user-manager (v6) profiles & limitations."}
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setSubTab("server");
                setSubDirty(false);
                onChange({
                  radiusBackend: "external_radius",
                  radiusServerIp: config.radiusServerIp.trim() === "127.0.0.1" || !config.radiusServerIp.trim()
                    ? "192.168.1.200"
                    : config.radiusServerIp,
                });
              }}
              aria-pressed={isExternalRadius}
              className={`min-h-[44px] text-start p-3.5 rounded-xl border transition ${
                isExternalRadius
                  ? "bg-emerald-950/60 border-emerald-500 text-slate-100"
                  : "bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700"
              }`}
            >
              <div className="text-xs font-bold text-cyan-300">
                {isAr ? "سيرفر RADIUS خارجي مستقل" : "Standalone External RADIUS Server"}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                {isAr
                  ? "يضبط /radius وCoA وجدار الحماية فقط دون لمس حزمة user-manager (مناسب لـ FreeRADIUS وبرامج إدارة الكروت المستقلة)."
                  : "Configures /radius client, CoA & firewall without emitting local User Manager commands (FreeRADIUS / external billing)."}
              </p>
            </button>
          </div>

          {!isExternalRadius ? (
            <>
              {/* Version notice */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3 text-xs">
                <Cpu className="w-4 h-4 text-emerald-400 flex-shrink-0" aria-hidden="true" />
                <span className="text-slate-200 leading-relaxed">
                  {isV7 ? (
                    isAr ? (
                      <>
                        وضع RouterOS v7: يفعّل <bdi dir="ltr" className="font-mono text-emerald-300">/user-manager</bdi> مع مجموعات المصادقة <bdi dir="ltr" className="font-mono text-emerald-300">user group</bdi> وقيود <bdi dir="ltr" className="font-mono text-emerald-300">reset-counters-interval</bdi>، وتُدار البوابة على <bdi dir="ltr" className="font-mono text-emerald-300">/um</bdi>.
                      </>
                    ) : (
                      "RouterOS v7 mode: enables /user-manager with user-groups (outer-auths), counter auto-resets, and portal at /um."
                    )
                  ) : isAr ? (
                    <>
                      وضع RouterOS v6: يولّد <bdi dir="ltr" className="font-mono text-emerald-300">/tool user-manager</bdi> مع حساب المالك <bdi dir="ltr" className="font-mono text-emerald-300">customer</bdi> وصلاحيات <bdi dir="ltr" className="font-mono text-emerald-300">starts-at=logon|now</bdi>، ولوحة الويب على <bdi dir="ltr" className="font-mono text-emerald-300">/userman</bdi>.
                    </>
                  ) : (
                    "RouterOS v6 mode: generates /tool user-manager with owner customer, starts-at=logon|now, and web portal at /userman."
                  )}
                </span>
              </div>

              {/* 3 Internal Sub-tabs */}
              <div
                role="tablist"
                aria-label={isAr ? "أقسام اليوزر مانجر" : "User Manager sections"}
                onKeyDown={(e) => handleTabListKeyDown(e, UM_SUB_TABS, subTab, setSubTab, isAr)}
                className="grid grid-cols-3 gap-1.5 bg-slate-950/80 border border-slate-800 p-1.5 rounded-xl"
              >
                {UM_SUB_TABS.map((t) => {
                  const Icon = tabMeta[t].icon;
                  const isActive = subTab === t;
                  const tabIssues = subTabIssues[t];
                  const hasError = tabIssues.some((i) => i.severity === "error");
                  return (
                    <button
                      key={t}
                      id={`um-tab-${t}`}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-controls={`um-tabpanel-${t}`}
                      tabIndex={isActive ? 0 : -1}
                      onClick={() => setSubTab(t)}
                      className={`min-h-[44px] sm:min-h-[38px] flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                        isActive
                          ? "bg-emerald-950 border border-emerald-700 text-emerald-300"
                          : "text-slate-300 hover:text-white hover:bg-slate-800/70"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                      <span>{tabMeta[t].label}</span>
                      {tabIssues.length > 0 && (
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold leading-none border ${
                            hasError
                              ? "bg-red-950/90 border-red-700 text-red-200"
                              : "bg-amber-950/90 border-amber-700 text-amber-200"
                          }`}
                        >
                          {tabIssues.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div
                id={`um-tabpanel-${subTab}`}
                role="tabpanel"
                aria-labelledby={`um-tab-${subTab}`}
              >
                {subTab === "server" && (
                  <UmServerSubTab
                    config={config}
                    onChange={onChange}
                    lang={lang}
                    onDirtyChange={setSubDirty}
                    issues={issues}
                  />
                )}
                {subTab === "limitations" && (
                  <UmLimitationsSubTab
                    config={config}
                    hotspotProfiles={hotspotProfiles}
                    onChange={onChange}
                    lang={lang}
                    onDirtyChange={setSubDirty}
                    issues={issues}
                  />
                )}
                {subTab === "profiles" && (
                  <UmProfilesSubTab
                    config={config}
                    onChange={onChange}
                    lang={lang}
                    onDirtyChange={setSubDirty}
                    issues={issues}
                  />
                )}
              </div>
            </>
          ) : (
            <UmServerSubTab
              config={config}
              onChange={onChange}
              lang={lang}
              onDirtyChange={setSubDirty}
              issues={issues}
            />
          )}
        </div>
      )}
    </div>
  );
}
