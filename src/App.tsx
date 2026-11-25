/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import { lazy, Suspense, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { HotspotConfig, HotspotUserProfile } from "./types";
import {
  CONFIG_SCHEMA_VERSION,
  DEFAULT_CONFIG,
  DEFAULT_HOTSPOT_PROFILES,
  hydrateConfig,
  hydrateHotspotProfiles,
} from "./constants/defaults";
import { generateMikrotikScript } from "./utils/scriptGenerator";
import { generateHotspotPortalFiles } from "./utils/htmlTemplateGenerator";
import { validateConfiguration } from "./utils/validation";
import { buildDeploymentReadme, createZipBlob, stripConfigSecrets } from "./utils/zipExporter";
import { handleTabListKeyDown } from "./utils/tabKeyboard";
import NetworkConfigTab from "./components/NetworkConfigTab";
import ScriptViewer from "./components/ScriptViewer";
import ConfirmDialog from "./components/ConfirmDialog";

const VlanConfigTab = lazy(() => import("./components/VlanConfigTab"));
const LoadBalancingTab = lazy(() => import("./components/LoadBalancingTab"));
const SpeedProfilesTab = lazy(() => import("./components/SpeedProfilesTab"));
const UserManagerTab = lazy(() => import("./components/UserManagerTab"));
const AdvancedFeaturesTab = lazy(() => import("./components/AdvancedFeaturesTab"));
const HotspotPageTab = lazy(() => import("./components/HotspotPageTab"));
const InstructionGuide = lazy(() => import("./components/InstructionGuide"));

import {
  AlertTriangle,
  Archive,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Cpu,
  Download,
  Gauge,
  Languages,
  Layers,
  Lock,
  Network,
  RefreshCw,
  ShieldCheck,
  Upload,
  Zap,
  Layout,
} from "lucide-react";

export default function App() {
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [activeTab, setActiveTab] = useState<number>(0);
  const [config, setConfig] = useState<HotspotConfig>(() => {
    try {
      const saved = localStorage.getItem("mikrotik_hotspot_config");
      if (saved) {
        return hydrateConfig(JSON.parse(saved));
      }
    } catch {
      // Fallback to defaults if storage is unavailable or corrupted
    }
    return DEFAULT_CONFIG;
  });
  const [hotspotProfiles, setHotspotProfiles] = useState<HotspotUserProfile[]>(() => {
    try {
      const saved = localStorage.getItem("mikrotik_hotspot_profiles");
      if (saved) {
        return hydrateHotspotProfiles(JSON.parse(saved));
      }
    } catch {
      // Fallback to defaults if storage is unavailable or corrupted
    }
    return DEFAULT_HOTSPOT_PROFILES;
  });

  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<"resetAll" | "resetProfiles" | null>(null);
  const [hasUnsavedDraft, setHasUnsavedDraft] = useState<boolean>(false);
  const [pendingTab, setPendingTab] = useState<number | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState<boolean>(false);
  const [issuesOpen, setIssuesOpen] = useState<boolean>(true);
  const [mobileBundleConfirm, setMobileBundleConfirm] = useState<boolean>(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);

  const isAr = lang === "ar";

  useEffect(() => {
    if (!exportMenuOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExportMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [exportMenuOpen]);

  const applyTabChange = (nextTab: number, skipScrollTop = false) => {
    setActiveTab(nextTab);
    if (!skipScrollTop && mainRef.current) {
      const top = mainRef.current.getBoundingClientRect().top;
      if (top < 64) {
        window.scrollTo({
          top: Math.max(0, window.scrollY + top - 64),
          behavior: "smooth",
        });
      }
    }
  };

  const requestTabChange = (nextTab: number, options?: { skipScrollTop?: boolean }) => {
    if (nextTab === activeTab) return;
    if (hasUnsavedDraft) {
      setPendingTab(nextTab);
      return;
    }
    applyTabChange(nextTab, Boolean(options?.skipScrollTop));
  };

  const focusValidationField = (tab: number, field?: string) => {
    requestTabChange(tab, { skipScrollTop: Boolean(field) });
    if (!field || hasUnsavedDraft) return;
    window.setTimeout(() => {
      const panel = document.getElementById(`tab-panel-${tab}`);
      if (!panel) return;
      const escaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(field) : field.replace(/["\\]/g, "\\$&");
      const target = panel.querySelector(`[name="${escaped}"], #${escaped}`);
      if (target instanceof HTMLElement) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.focus();
      }
    }, 90);
  };

  // Sync document lang & dir with active UI language
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isAr ? "rtl" : "ltr";
  }, [lang, isAr]);

  // Debounced persistence to localStorage with quota/privacy protection
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem("mikrotik_hotspot_config", JSON.stringify(config));
        localStorage.setItem("mikrotik_hotspot_profiles", JSON.stringify(hotspotProfiles));
        setStorageWarning(null);
      } catch {
        setStorageWarning(
          isAr
            ? "تعذر حفظ الإعدادات تلقائياً في المتصفح (الوضع الخاص أو امتلاء المساحة). استخدم تصدير JSON لحفظ نسختك."
            : "Could not save settings to browser localStorage. Use Export JSON to keep a backup."
        );
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [config, hotspotProfiles, isAr]);

  const deferredConfig = useDeferredValue(config);
  const deferredHotspotProfiles = useDeferredValue(hotspotProfiles);

  // Derived script & live validation (no extra render cycle)
  const generatedScript = useMemo(
    () => generateMikrotikScript(deferredConfig, deferredHotspotProfiles),
    [deferredConfig, deferredHotspotProfiles]
  );

  const validationIssues = useMemo(
    () => validateConfiguration(config, hotspotProfiles),
    [config, hotspotProfiles]
  );

  const errorCount = validationIssues.filter((i) => i.severity === "error").length;
  const warningCount = validationIssues.filter((i) => i.severity === "warning").length;

  const handleConfigChange = (updates: Partial<HotspotConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...updates };
      if (updates.authMode) {
        next.enableUserManager = updates.authMode !== "hotspot_only";
      } else if (typeof updates.enableUserManager === "boolean") {
        next.authMode = updates.enableUserManager ? "userman_radius" : "hotspot_only";
      }

      if (
        (updates.useLanBridge === true ||
          typeof updates.lanBridgeName === "string" ||
          typeof updates.lanBridgePorts === "string") &&
        next.useLanBridge
      ) {
        const nextBridge = next.lanBridgeName || "bridge-lan";
        const oldBridge = prev.lanBridgeName || "bridge-lan";
        const portSet = new Set(
          (next.lanBridgePorts || "").split(",").map((p) => p.trim()).filter(Boolean)
        );
        next.vlans = (next.vlans || []).map((v) => {
          const parent = (v.parentInterface || "").trim();
          if (!parent || parent === prev.lanInterface || parent === oldBridge || portSet.has(parent)) {
            return { ...v, parentInterface: nextBridge };
          }
          return v;
        });
      }

      return next;
    });
  };

  const handleAddProfile = (newProf: HotspotUserProfile) => {
    setHotspotProfiles((prev) => [...prev, newProf]);
  };

  const handleUpdateProfile = (index: number, updatedProf: HotspotUserProfile) => {
    setHotspotProfiles((prev) => {
      const next = [...prev];
      next[index] = updatedProf;
      return next;
    });
  };

  const handleDeleteProfile = (index: number) => {
    setHotspotProfiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmExecute = () => {
    if (confirmAction === "resetAll") {
      setConfig(DEFAULT_CONFIG);
      setHotspotProfiles(DEFAULT_HOTSPOT_PROFILES);
    } else if (confirmAction === "resetProfiles") {
      setHotspotProfiles(DEFAULT_HOTSPOT_PROFILES);
    }
    setConfirmAction(null);
  };

  const handleExportJson = (stripSecrets: boolean) => {
    setExportMenuOpen(false);
    const exportConfig = stripSecrets ? stripConfigSecrets(config) : config;
    const payload = {
      schemaVersion: CONFIG_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      secretsStripped: stripSecrets,
      config: exportConfig,
      profiles: hotspotProfiles,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const prefix = stripSecrets ? "mikrotik_template" : "mikrotik_backup";
    link.download = `${prefix}_${config.rosVersion}_${config.routerIdentity || "hotspot"}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportJson = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as { config?: unknown; profiles?: unknown };
      if (!parsed || typeof parsed !== "object" || !parsed.config) {
        throw new Error("Invalid backup structure");
      }
      setConfig(hydrateConfig(parsed.config));
      if (parsed.profiles) {
        setHotspotProfiles(hydrateHotspotProfiles(parsed.profiles));
      }
      setImportNotice({
        kind: "ok",
        text: isAr ? "تم استيراد الإعدادات بنجاح." : "Configuration imported successfully.",
      });
    } catch {
      setImportNotice({
        kind: "err",
        text: isAr ? "ملف النسخة الاحتياطية غير صالح أو تالف." : "Invalid or corrupted JSON backup file.",
      });
    }
    window.setTimeout(() => setImportNotice(null), 4000);
  };

  const tabs = [
    { id: 0, label: isAr ? "إعدادات الشبكة" : "Network Setup", shortLabel: isAr ? "الشبكة" : "Network", icon: Network },
    { id: 1, label: isAr ? "الشبكات الافتراضية (VLANs)" : "VLANs Setup", shortLabel: "VLANs", icon: Layers },
    { id: 2, label: isAr ? "دمج الخطوط (Multi-WAN)" : "Load Balancing", shortLabel: isAr ? "دمج الخطوط" : "Multi-WAN", icon: Zap },
    { id: 3, label: isAr ? "بروفايلات الهوتسبوت" : "Hotspot Profiles", shortLabel: isAr ? "الهوتسبوت" : "Hotspot", icon: Gauge },
    { id: 4, label: isAr ? "راديوس واليوزر مانجر" : "RADIUS & User Manager", shortLabel: isAr ? "راديوس / UM" : "RADIUS / UM", icon: ShieldCheck },
    { id: 5, label: isAr ? "حماية وتخصيص" : "Security & Advanced", shortLabel: isAr ? "الأمان والميزات" : "Security", icon: Lock },
    { id: 6, label: isAr ? "صفحة الدخول (login.html)" : "Login Page Template", shortLabel: isAr ? "صفحة الدخول" : "Login Page", icon: Layout },
    { id: 7, label: isAr ? "دليل التركيب" : "How to Apply", shortLabel: isAr ? "دليل التركيب" : "Guide", icon: BookOpen },
  ];

  const effectiveAuthMode = config.authMode || (config.enableUserManager ? "userman_radius" : "hotspot_only");
  const isExternalRadius = effectiveAuthMode !== "hotspot_only" && config.radiusBackend === "external_radius";

  const executeDownloadBundle = () => {
    const safeServer = config.serverName || "hotspot1";
    const scriptFilename = `hotspot_setup_${config.rosVersion}_${safeServer}.rsc`;
    const htmlFolder = config.storageMode === "flash" ? "flash/hotspot" : (config.htmlDirectory || "hotspot");
    const portalFiles = generateHotspotPortalFiles(config, lang);
    const readmeTxt = buildDeploymentReadme(config, scriptFilename, lang);
    const blob = createZipBlob([
      { path: scriptFilename, content: generatedScript },
      ...(Object.entries(portalFiles) as [string, string][]).map(([name, content]) => ({
        path: `${htmlFolder}/${name}`,
        content,
      })),
      { path: "README_DEPLOY.txt", content: readmeTxt },
    ]);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mikrotik_bundle_${config.rosVersion}_${safeServer}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleMobileBundleClick = () => {
    if (errorCount > 0 || hasUnsavedDraft) {
      setMobileBundleConfirm(true);
      return;
    }
    executeDownloadBundle();
  };

  const authModeOptions: Array<{ id: "userman_radius" | "hotspot_only" | "hybrid"; label: string }> = [
    { id: "userman_radius", label: isAr ? "يوزر مانجر / RADIUS" : "UM / RADIUS" },
    { id: "hotspot_only", label: isAr ? "هوتسبوت محلي" : "Hotspot Only" },
    { id: "hybrid", label: isAr ? "هجين" : "Hybrid" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans" dir={isAr ? "rtl" : "ltr"}>
      {/* Header (scrolls away cleanly so sticky tabs keep maximum workspace) */}
      <header className="relative z-40 border-b border-slate-800 bg-slate-900/95 px-4 py-3 md:px-6 md:py-3.5">
        <div className="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 bg-emerald-950 border border-emerald-700 rounded-xl text-emerald-400 flex-shrink-0">
              <Cpu className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-100">
                {isAr ? "مولد سكربت ميكروتيك هوت سبوت الشامل" : "MikroTik Hotspot & Master Script Generator"}
              </h1>
              <p className="hidden sm:block text-xs text-slate-400 mt-0.5">
                {isAr
                  ? "أداة متكاملة لـ (RouterOS v6 & v7): هوتسبوت، دمج PCC، الفيلان VLANs، بروفايلات البيرست وراديوس اليوزر مانجر."
                  : "Complete RouterOS v6 & v7 Hotspot, PCC Multi-WAN, VLANs, Burst Profiles & RADIUS User Manager generator."}
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
            {/* Version Toggle quick buttons */}
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex text-xs font-mono font-semibold" role="group" aria-label={isAr ? "إصدار RouterOS" : "RouterOS Version"}>
              <button
                type="button"
                onClick={() => handleConfigChange({ rosVersion: "v6" })}
                aria-pressed={config.rosVersion === "v6"}
                className={`min-h-[44px] sm:min-h-[36px] px-2.5 sm:px-3 py-1 rounded-lg transition ${
                  config.rosVersion === "v6"
                    ? "bg-emerald-500 text-slate-950 font-bold"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                v6.x
              </button>
              <button
                type="button"
                onClick={() => handleConfigChange({ rosVersion: "v7" })}
                aria-pressed={config.rosVersion === "v7"}
                className={`min-h-[44px] sm:min-h-[36px] px-2.5 sm:px-3 py-1 rounded-lg transition ${
                  config.rosVersion === "v7"
                    ? "bg-emerald-500 text-slate-950 font-bold"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                v7.x
              </button>
            </div>

            {/* Export / Import JSON */}
            <input
              id="import-config-json"
              name="importConfigJson"
              ref={importInputRef}
              type="file"
              accept=".json,application/json"
              aria-label={isAr ? "استيراد ملف إعدادات JSON" : "Import JSON configuration file"}
              className="hidden"
              onChange={handleImportJson}
            />
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                onClick={() => setExportMenuOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={exportMenuOpen}
                className="min-h-[44px] sm:min-h-[40px] min-w-[44px] sm:min-w-0 justify-center flex items-center gap-1.5 text-xs px-2.5 sm:px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl transition"
                title={isAr ? "تصدير الإعدادات كملف JSON" : "Export backup JSON"}
                aria-label={isAr ? "تصدير الإعدادات كملف JSON" : "Export backup JSON"}
              >
                <Download className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                <span className="hidden md:inline">{isAr ? "تصدير" : "Export"}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" aria-hidden="true" />
              </button>

              {exportMenuOpen && (
                <div
                  role="menu"
                  aria-label={isAr ? "خيارات التصدير JSON" : "JSON export options"}
                  className="absolute end-0 mt-1.5 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 space-y-1 text-xs"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleExportJson(false)}
                    className="w-full min-h-[40px] text-start px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-100 transition flex flex-col gap-0.5"
                  >
                    <span className="font-semibold">
                      {isAr ? "نسخة كاملة (مع كلمات السر)" : "Full Backup (with secrets)"}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {isAr ? "للاستعادة الشخصية على جهازك" : "Personal backup including passwords"}
                    </span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleExportJson(true)}
                    className="w-full min-h-[40px] text-start px-3 py-2 rounded-lg hover:bg-slate-800 text-emerald-300 transition flex flex-col gap-0.5"
                  >
                    <span className="font-semibold">
                      {isAr ? "نسخة للمشاركة (بدون كلمات السر)" : "Shareable Template (strip secrets)"}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {isAr ? "يحذف كلمات مرور RADIUS وPPPoE واليوزر مانجر" : "Removes RADIUS, PPPoE & User Manager passwords"}
                    </span>
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="min-h-[44px] sm:min-h-[40px] min-w-[44px] sm:min-w-0 justify-center flex items-center gap-1.5 text-xs px-2.5 sm:px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl transition"
              title={isAr ? "استيراد ملف إعدادات JSON" : "Import backup JSON"}
              aria-label={isAr ? "استيراد ملف إعدادات JSON" : "Import backup JSON"}
            >
              <Upload className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span className="hidden md:inline">{isAr ? "استيراد" : "Import"}</span>
            </button>

            {/* Language switcher */}
            <button
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              type="button"
              className="min-h-[44px] sm:min-h-[40px] min-w-[44px] sm:min-w-0 justify-center flex items-center gap-1.5 text-xs px-2.5 sm:px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl transition"
            >
              <Languages className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span>{isAr ? "English" : "العربية"}</span>
            </button>

            {/* Clear All */}
            <button
              onClick={() => setConfirmAction("resetAll")}
              type="button"
              className="min-h-[44px] sm:min-h-[40px] min-w-[44px] sm:min-w-0 justify-center flex items-center gap-1.5 text-xs px-2.5 sm:px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded-xl transition"
              title={isAr ? "إعادة ضبط المصنع للسكربت" : "Reset everything to default"}
              aria-label={isAr ? "تصفير الكل" : "Reset All"}
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">{isAr ? "تصفير الكل" : "Reset All"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Architecture & Mode Quick Bar (scrolls naturally above the sticky tabs) */}
      <div className="max-w-7xl w-full mx-auto px-4 pt-4 pb-2 md:px-6 md:pt-5">
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl px-3.5 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 text-slate-300 font-medium">
              <ShieldCheck className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden="true" />
              <span>{isAr ? "نمط الإدارة:" : "Mode:"}</span>
            </span>
            <div
              role="group"
              aria-label={isAr ? "نمط الإدارة" : "Auth Mode"}
              className="inline-flex flex-wrap items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-700"
            >
              {authModeOptions.map((opt) => {
                const selected = effectiveAuthMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => handleConfigChange({ authMode: opt.id })}
                    className={`min-h-[44px] sm:min-h-[34px] px-2.5 py-1 rounded-lg text-xs transition ${
                      selected
                        ? "bg-emerald-500 text-slate-950 font-bold"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/70 font-medium"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              <span className="text-slate-400">WAN:</span>
              <span className={`font-mono font-semibold ${config.loadBalancingMethod !== "none" ? "text-emerald-400" : "text-slate-300"}`}>
                {config.loadBalancingMethod !== "none"
                  ? `Multi-WAN (${config.loadBalancingMethod.toUpperCase()})`
                  : (isAr ? "خط واحد" : "Single WAN")}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              <span className="text-slate-400">VLANs:</span>
              <span dir={config.enableVlans ? "ltr" : undefined} className={`font-mono font-semibold ${config.enableVlans ? "text-emerald-400" : "text-slate-400"}`}>
                {config.enableVlans ? `${config.vlans?.length || 0}` : (isAr ? "معطّل" : "Off")}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              <span className="text-slate-400">{isAr ? "الباقات:" : "Plans:"}</span>
              <span dir="ltr" className="font-mono font-semibold text-slate-200 inline-block">
                {effectiveAuthMode === "hotspot_only"
                  ? `${hotspotProfiles.length} HS`
                  : isExternalRadius
                    ? (effectiveAuthMode === "hybrid" ? `${hotspotProfiles.length} HS / Ext RADIUS` : "External RADIUS")
                    : effectiveAuthMode === "userman_radius"
                      ? `${config.umProfiles?.length || 0} UM`
                      : `${hotspotProfiles.length} HS / ${config.umProfiles?.length || 0} UM`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Slim Sticky Navigation Bar (always visible while scrolling forms) */}
      <nav
        aria-label={isAr ? "أقسام الإعداد" : "Configuration navigation"}
        className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800/90 px-4 py-2 md:px-6"
      >
        <div className="max-w-7xl mx-auto">
          {/* Mobile Tab Selector */}
          <div className="sm:hidden">
            <label htmlFor="mobile-tab-select" className="sr-only">
              {isAr ? "اختيار قسم الإعدادات" : "Select configuration section"}
            </label>
            <select
              id="mobile-tab-select"
              name="mobileTabSelect"
              value={activeTab}
              onChange={(e) => requestTabChange(parseInt(e.target.value, 10))}
              className="w-full min-h-[44px] bg-slate-900 border border-slate-600 text-slate-100 rounded-xl px-3 py-2 text-sm font-medium"
            >
              {tabs.map((tab) => {
                const tabErrors = validationIssues.filter((i) => i.tab === tab.id && i.severity === "error").length;
                const tabWarnings = validationIssues.filter((i) => i.tab === tab.id && i.severity === "warning").length;
                const issueSuffix =
                  tabErrors > 0
                    ? ` (${tabErrors} ${isAr ? "أخطاء" : "err"})`
                    : tabWarnings > 0
                      ? ` (${tabWarnings} ${isAr ? "تحذير" : "warn"})`
                      : "";
                return (
                  <option key={tab.id} value={tab.id}>
                    {tab.label}{issueSuffix}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Desktop & Tablet Full-Width Wrapped Tab Grid (0 clipped tabs) */}
          <div
            role="tablist"
            aria-label={isAr ? "أقسام الإعداد" : "Configuration tabs"}
            onKeyDown={(e) =>
              handleTabListKeyDown(
                e,
                tabs.map((t) => t.id),
                activeTab,
                requestTabChange,
                isAr
              )
            }
            className="hidden sm:grid sm:grid-cols-4 lg:grid-cols-8 gap-1 bg-slate-900/80 border border-slate-800 p-1 rounded-xl"
          >
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              const tabErrors = validationIssues.filter((i) => i.tab === tab.id && i.severity === "error").length;
              const tabWarnings = validationIssues.filter((i) => i.tab === tab.id && i.severity === "warning").length;

              return (
                <button
                  key={tab.id}
                  id={`tab-btn-${tab.id}`}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`tab-panel-${tab.id}`}
                  tabIndex={isActive ? 0 : -1}
                  title={tab.label}
                  onClick={() => requestTabChange(tab.id)}
                  type="button"
                  className={`relative min-h-[40px] flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all duration-150 ${
                    isActive
                      ? "bg-emerald-950 border border-emerald-700 text-emerald-300 shadow-sm"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/70"
                  }`}
                >
                  <TabIcon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  <span className="truncate">{tab.shortLabel}</span>
                  {(tabErrors > 0 || tabWarnings > 0) && (
                    <>
                      <span
                        aria-hidden="true"
                        className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-mono font-bold inline-flex items-center justify-center flex-shrink-0 ${
                          tabErrors > 0 ? "bg-red-500 text-white" : "bg-amber-400 text-slate-950"
                        }`}
                      >
                        {tabErrors > 0 ? tabErrors : tabWarnings}
                      </span>
                      <span className="sr-only">
                        {tabErrors > 0
                          ? (isAr ? ` (${tabErrors} أخطاء)` : ` (${tabErrors} errors)`)
                          : (isAr ? ` (${tabWarnings} تحذيرات)` : ` (${tabWarnings} warnings)`)}
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content Dashboard */}
      <main ref={mainRef} className="flex-1 max-w-7xl w-full mx-auto p-4 pb-24 md:p-6 md:pb-24 lg:pb-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Notices (storage warning or import feedback) */}
        {(storageWarning || importNotice) && (
          <div className="lg:col-span-12 space-y-2">
            {storageWarning && (
              <div role="status" className="bg-amber-950/60 border border-amber-700 text-amber-200 text-xs rounded-xl px-4 py-2.5 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-300 flex-shrink-0" aria-hidden="true" />
                <span>{storageWarning}</span>
              </div>
            )}
            {importNotice && (
              <div
                role="status"
                className={`text-xs rounded-xl px-4 py-2.5 border ${
                  importNotice.kind === "ok"
                    ? "bg-emerald-950/70 border-emerald-700 text-emerald-200"
                    : "bg-red-950/70 border-red-700 text-red-200"
                }`}
              >
                {importNotice.text}
              </div>
            )}
          </div>
        )}

        {/* Full-Width Live Validation Banner */}
        {validationIssues.length > 0 && (
          <div
            role="region"
            aria-label={isAr ? "تنبيهات التحقق من الإعدادات" : "Configuration validation issues"}
            className={`lg:col-span-12 border rounded-xl overflow-hidden text-xs ${
              errorCount > 0
                ? "bg-red-950/40 border-red-800/80 text-red-200"
                : "bg-amber-950/40 border-amber-800/80 text-amber-200"
            }`}
          >
            <button
              type="button"
              onClick={() => setIssuesOpen((prev) => !prev)}
              aria-expanded={issuesOpen}
              className="w-full px-4 py-2.5 flex items-center justify-between gap-2 font-semibold text-start min-h-[44px]"
            >
              <span className="flex items-center gap-2">
                <AlertTriangle className={`w-4 h-4 ${errorCount > 0 ? "text-red-300" : "text-amber-300"}`} aria-hidden="true" />
                <span>
                  {isAr
                    ? `فحص الإعدادات: ${errorCount} أخطاء، ${warningCount} تحذيرات`
                    : `Config Check: ${errorCount} errors, ${warningCount} warnings`}
                </span>
              </span>
              {issuesOpen ? <ChevronUp className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
            </button>

            {issuesOpen && (
              <ul className="px-4 pb-3 space-y-1.5 border-t border-slate-800/60 pt-2">
                {validationIssues.map((issue) => (
                  <li key={issue.id}>
                    <button
                      type="button"
                      onClick={() => focusValidationField(issue.tab, issue.field)}
                      className="w-full min-h-[44px] sm:min-h-[38px] text-start flex items-center justify-between gap-3 px-3 py-1.5 rounded-lg bg-slate-950/60 hover:bg-slate-900 transition"
                    >
                      <span className={issue.severity === "error" ? "text-red-300" : "text-amber-300"}>
                        {isAr ? issue.messageAr : issue.messageEn}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700 text-[11px] font-medium flex-shrink-0">
                        {tabs[issue.tab]?.shortLabel || tabs[issue.tab]?.label}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Config Parameters Form Column */}
        <div className="lg:col-span-6 flex flex-col">
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-lg">
            {/* Tab Body */}
            <div
              id={`tab-panel-${activeTab}`}
              role="tabpanel"
              aria-labelledby={`tab-btn-${activeTab}`}
              className="p-4 md:p-6 flex-1"
            >
              <Suspense
                fallback={
                  <div className="py-12 text-center text-xs text-slate-400">
                    {isAr ? "جارٍ تحميل القسم..." : "Loading section..."}
                  </div>
                }
              >
                {activeTab === 0 && (
                  <NetworkConfigTab
                    config={config}
                    onChange={handleConfigChange}
                    onNavigateTab={requestTabChange}
                    lang={lang}
                    issues={validationIssues}
                  />
                )}
                {activeTab === 1 && (
                  <VlanConfigTab
                    config={config}
                    onChange={handleConfigChange}
                    onDirtyChange={setHasUnsavedDraft}
                    lang={lang}
                    issues={validationIssues}
                  />
                )}
                {activeTab === 2 && (
                  <LoadBalancingTab
                    config={config}
                    onChange={handleConfigChange}
                    lang={lang}
                    issues={validationIssues}
                  />
                )}
                {activeTab === 3 && (
                  <SpeedProfilesTab
                    config={config}
                    onConfigChange={handleConfigChange}
                    profiles={hotspotProfiles}
                    onAdd={handleAddProfile}
                    onUpdate={handleUpdateProfile}
                    onDelete={handleDeleteProfile}
                    onReset={() => setConfirmAction("resetProfiles")}
                    onNavigateTab={requestTabChange}
                    onDirtyChange={setHasUnsavedDraft}
                    lang={lang}
                    issues={validationIssues}
                  />
                )}
                {activeTab === 4 && (
                  <UserManagerTab
                    config={config}
                    hotspotProfiles={hotspotProfiles}
                    onChange={handleConfigChange}
                    onNavigateTab={requestTabChange}
                    onDirtyChange={setHasUnsavedDraft}
                    lang={lang}
                    issues={validationIssues}
                  />
                )}
                {activeTab === 5 && (
                  <AdvancedFeaturesTab
                    config={config}
                    onChange={handleConfigChange}
                    lang={lang}
                    issues={validationIssues}
                  />
                )}
                {activeTab === 6 && (
                  <HotspotPageTab
                    config={config}
                    onChange={handleConfigChange}
                    lang={lang}
                  />
                )}
                {activeTab === 7 && (
                  <InstructionGuide
                    config={config}
                    scriptFilename={`hotspot_setup_${config.rosVersion}_${config.serverName || "hotspot1"}.rsc`}
                    hotspotProfilesCount={hotspotProfiles.length}
                    lang={lang}
                  />
                )}
              </Suspense>
            </div>
          </div>
        </div>

        {/* Right Side: Generated Terminal Script Output */}
        <ScriptViewer
          script={generatedScript}
          filename={`hotspot_setup_${config.rosVersion}_${config.serverName || "hotspot1"}.rsc`}
          lang={lang}
          errorCount={errorCount}
          hasUnsavedDraft={hasUnsavedDraft}
          onDownloadBundle={executeDownloadBundle}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 pt-4 pb-20 lg:pb-4 text-center text-xs text-slate-400 px-4">
        <p className="max-w-7xl mx-auto">
          {isAr
            ? "أداة مولد سكربتات ميكروتيك الشاملة (RouterOS v6 & v7) - جميع الحقوق محفوظة 2026."
            : "MikroTik Hotspot, VLANs & Load Balancing Script Generator (v6 & v7) - All Rights Reserved 2026."}
        </p>
      </footer>

      {/* Mobile Bottom Quick-Action Bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-slate-900/95 border-t border-slate-700 px-3 py-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            document.getElementById("script-viewer-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className="min-h-[44px] flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 text-xs font-semibold transition"
        >
          <span>{isAr ? "معاينة السكربت" : "View Script"}</span>
          {errorCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white font-mono text-[10px] font-bold">
              {errorCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={handleMobileBundleClick}
          className="min-h-[44px] flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition"
        >
          <Archive className="w-4 h-4" aria-hidden="true" />
          <span>{isAr ? "حزمة ZIP" : "ZIP Bundle"}</span>
        </button>
      </div>

      <ConfirmDialog
        open={confirmAction !== null}
        dir={isAr ? "rtl" : "ltr"}
        title={
          confirmAction === "resetAll"
            ? (isAr ? "تصفير كافة الإعدادات" : "Reset All Settings")
            : (isAr ? "استعادة البروفايلات الافتراضية" : "Reset Speed Profiles")
        }
        description={
          confirmAction === "resetAll"
            ? (isAr
                ? "هل أنت متأكد من تصفير كافة الإعدادات وبروفايلات السرعة والعودة للوضع الافتراضي؟"
                : "Are you sure you want to reset all network, VLAN, Multi-WAN, and profile settings to default?")
            : (isAr
                ? "هل أنت متأكد من استعادة بروفايلات السرعة الافتراضية؟ سيتم حذف أي باقات مخصصة أضفتها."
                : "Are you sure you want to restore default speed profiles? Custom profiles will be removed.")
        }
        confirmLabel={isAr ? "نعم، استعادة الافتراضي" : "Yes, Reset"}
        cancelLabel={isAr ? "إلغاء" : "Cancel"}
        onConfirm={handleConfirmExecute}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        open={pendingTab !== null}
        dir={isAr ? "rtl" : "ltr"}
        confirmTone="warning"
        title={isAr ? "توجد تعديلات غير محفوظة" : "Unsaved Changes in Current Tab"}
        description={
          isAr
            ? "لديك نموذج تعديل مفتوح لم تضغط فيه على زر (حفظ) بعد. إذا انتقلت الآن ستضيع هذه التعديلات المؤقتة ولن تُطبّق في السكربت."
            : "You have an open edit form that has not been saved yet. Switching tabs now will discard those draft edits."
        }
        confirmLabel={isAr ? "تجاهل والانتقال" : "Discard & Switch"}
        cancelLabel={isAr ? "البقاء للحفظ" : "Stay & Save"}
        onConfirm={() => {
          const target = pendingTab;
          setPendingTab(null);
          setHasUnsavedDraft(false);
          if (target !== null) applyTabChange(target);
        }}
        onCancel={() => setPendingTab(null)}
      />

      <ConfirmDialog
        open={mobileBundleConfirm}
        dir={isAr ? "rtl" : "ltr"}
        confirmTone="warning"
        title={
          errorCount > 0 && hasUnsavedDraft
            ? (isAr ? "تحذير: أخطاء وتعديلات غير محفوظة" : "Warning: Errors & Unsaved Edits")
            : hasUnsavedDraft
              ? (isAr ? "تنبيه: توجد تعديلات غير محفوظة" : "Notice: Unsaved Form Edits")
              : (isAr ? "تحذير: توجد أخطاء في الإعدادات" : "Warning: Configuration Errors Detected")
        }
        description={
          isAr
            ? [
                errorCount > 0
                  ? `يوجد حالياً ${errorCount} أخطاء في فحص الإعدادات قد تتسبب في فشل /import أو تعطل الشبكة.`
                  : "",
                hasUnsavedDraft
                  ? "يوجد نموذج تعديل مفتوح لم تضغط فيه على (حفظ) بعد، ولن تدخل تغييراته في السكربت الحالي."
                  : "",
                "هل تريد المتابعة بالتصدير على أي حال؟",
              ]
                .filter(Boolean)
                .join(" ")
            : [
                errorCount > 0
                  ? `There are ${errorCount} validation error(s) that may cause /import failures on MikroTik.`
                  : "",
                hasUnsavedDraft
                  ? "An edit form is still open without clicking Save, so its draft changes are not included in the exported output."
                  : "",
                "Export anyway?",
              ]
                .filter(Boolean)
                .join(" ")
        }
        confirmLabel={isAr ? "متابعة التصدير" : "Export Anyway"}
        cancelLabel={isAr ? "العودة للإصلاح" : "Back to Fix"}
        onConfirm={() => {
          setMobileBundleConfirm(false);
          executeDownloadBundle();
        }}
        onCancel={() => setMobileBundleConfirm(false)}
      />
    </div>
  );
}
