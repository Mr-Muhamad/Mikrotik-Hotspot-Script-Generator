/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from "react";
import type { AuthMode, HotspotConfig, HotspotUserProfile } from "../types";
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
}: Props) {
  const isAr = lang === "ar";
  const isV7 = config.rosVersion === "v7";
  const authMode: AuthMode = config.authMode || (config.enableUserManager ? "userman_radius" : "hotspot_only");

  const [subTab, setSubTab] = useState<UmSubTab>("server");
  const [subDirty, setSubDirty] = useState(false);

  const umLimitationsCount = (config.umLimitations || []).length;
  const umProfilesCount = (config.umProfiles || []).length;

  useEffect(() => {
    onDirtyChange?.(authMode !== "hotspot_only" && subDirty);
  }, [authMode, subDirty, onDirtyChange]);

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
              {isAr ? "اليوزر مانجر وراديوس (User Manager v6 & v7)" : "User Manager & RADIUS Studio"}
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              {isAr
                ? "إعداد منفصل ومطابق لوثائق MikroTik: قيود السرعة والكوتا (Limitations)، الباقات وجداول الأوقات (Profiles)، ومجموعات v7."
                : "Separated User Manager configuration matching MikroTik docs: Limitations, time-scheduled Profiles, and v7 User Groups."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ToggleSwitch
              id="um-enable-switch"
              checked={authMode !== "hotspot_only"}
              onChange={(checked) =>
                onChange({ authMode: checked ? "userman_radius" : "hotspot_only" })
              }
              ariaLabel={isAr ? "تفعيل الربط مع اليوزر مانجر" : "Enable User Manager Integration"}
            />
            <span className="text-sm font-medium text-slate-200">
              {authMode !== "hotspot_only" ? (isAr ? "اليوزر مانجر مفعّل" : "Active") : (isAr ? "معطّل" : "Disabled")}
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
              />
            )}
            {subTab === "limitations" && (
              <UmLimitationsSubTab
                config={config}
                hotspotProfiles={hotspotProfiles}
                onChange={onChange}
                lang={lang}
                onDirtyChange={setSubDirty}
              />
            )}
            {subTab === "profiles" && (
              <UmProfilesSubTab
                config={config}
                onChange={onChange}
                lang={lang}
                onDirtyChange={setSubDirty}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
