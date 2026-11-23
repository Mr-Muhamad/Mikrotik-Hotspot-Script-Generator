/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { HotspotConfig, SpeedProfile } from "./types";
import { generateMikrotikScript } from "./utils/scriptGenerator";
import NetworkConfigTab from "./components/NetworkConfigTab";
import VlanConfigTab from "./components/VlanConfigTab";
import LoadBalancingTab from "./components/LoadBalancingTab";
import SpeedProfilesTab from "./components/SpeedProfilesTab";
import UserManagerTab from "./components/UserManagerTab";
import AdvancedFeaturesTab from "./components/AdvancedFeaturesTab";
import HotspotPageTab from "./components/HotspotPageTab";
import InstructionGuide from "./components/InstructionGuide";

import { 
  Network, 
  Layers, 
  Gauge, 
  ShieldCheck, 
  Sparkles, 
  BookOpen, 
  Copy, 
  Download, 
  RefreshCw, 
  Check, 
  Languages, 
  Cpu, 
  Info,
  Zap,
  Layout
} from "lucide-react";

const DEFAULT_CONFIG: HotspotConfig = {
  rosVersion: "v6",
  wanInterface: "ether1",
  lanInterface: "ether2",
  gatewayIp: "192.168.80.1",
  subnetMask: 24,
  dnsName: "hotspot.local",
  serverName: "hotspot1",
  poolName: "hs-pool-ether2",
  poolStart: "192.168.80.10",
  poolEnd: "192.168.80.254",
  dnsServers: ["8.8.8.8", "1.1.1.1"],
  
  // VLANs
  enableVlans: false,
  vlans: [
    {
      id: "vlan_10",
      name: "vlan10_staff",
      vlanId: 10,
      parentInterface: "ether2",
      gatewayIp: "172.16.10.1",
      subnetMask: 24,
      dhcpEnabled: true,
      poolStart: "172.16.10.10",
      poolEnd: "172.16.10.254",
      enableHotspotOnVlan: false,
      comment: "Staff Subnet"
    }
  ],

  // WAN Load Balancing & Multi-WAN
  loadBalancingMethod: "none",
  wanLines: [
    { id: "wan_1", name: "WAN1_Line", interfaceName: "ether1", gatewayIp: "192.168.1.1", distance: 1, weight: 1, type: "dhcp" },
    { id: "wan_2", name: "WAN2_Line", interfaceName: "ether3", gatewayIp: "192.168.2.1", distance: 1, weight: 1, type: "dhcp" }
  ],
  stickyConnections: true,

  // Login Methods
  loginHttpChap: true,
  loginHttpPap: true,
  loginMacAuth: false,
  enableCookie: true,
  cookieLifetime: "3d",
  enableTrial: false,
  trialDuration: "00:30:00",
  trialResetTime: "1d",

  // RADIUS & User Manager
  enableUserManager: true,
  radiusSecret: "radius123",
  radiusServerIp: "127.0.0.1",
  radiusPort: 1812,
  coaPort: 3799,
  usermanAdminUser: "admin",
  usermanAdminPass: "admin",
  usermanRouterName: "Router1",
  syncProfilesToUserman: true,

  // Walled Garden Domains
  walledGardenDomains: [
    { id: "wg_1", domain: "*.whatsapp.com", comment: "WhatsApp Access" },
    { id: "wg_2", domain: "*.pay.com", comment: "Payment Gateway" }
  ],

  // HTML Directory & Login Page Customization
  htmlDirectory: "hotspot",
  loginTitle: "أهلاً بك في شبكة الواي فاي",
  loginSubtitle: "سجل دخولك برقم الكارت أو الحساب للاتصال بالإنترنت",
  contactPhone: "01000000000",
  loginTheme: "emerald",

  // Advanced & Maintenance
  bypassFasttrack: true,
  enableAutoCleanScript: true,
  enableScheduledReboot: false,
  enableFirewallHardening: true,
  enableDnsCache: true,
  queueType: "simple",

  // Voucher Generator Script Options
  generateVouchersBatch: false,
  voucherCount: 20,
  voucherPrefix: "CARD-",
  voucherLength: 4,
  voucherSelectedProfile: "2M"
};

const DEFAULT_PROFILES: SpeedProfile[] = [
  {
    id: "prof_1m",
    name: "1M",
    displayName: "1 Mbps Speed Plan",
    uploadLimit: "256k",
    downloadLimit: "1M",
    burstUpload: "512k",
    burstDownload: "2M",
    burstThresholdUpload: "192k",
    burstThresholdDownload: "768k",
    burstTime: "8s",
    priority: 8,
    dataQuotaMb: 0,
    sharedUsers: 1,
    sessionTimeout: "00:00:00",
    idleTimeout: "00:15:00",
    keepaliveTimeout: "00:02:00",
    price: 5,
    validity: "30d"
  },
  {
    id: "prof_2m",
    name: "2M",
    displayName: "2 Mbps Speed Plan",
    uploadLimit: "512k",
    downloadLimit: "2M",
    burstUpload: "1M",
    burstDownload: "4M",
    burstThresholdUpload: "384k",
    burstThresholdDownload: "1.5M",
    burstTime: "8s",
    priority: 8,
    dataQuotaMb: 5000,
    sharedUsers: 1,
    sessionTimeout: "00:00:00",
    idleTimeout: "00:15:00",
    keepaliveTimeout: "00:02:00",
    price: 10,
    validity: "30d"
  },
  {
    id: "prof_4m",
    name: "4M",
    displayName: "4 Mbps Speed Plan",
    uploadLimit: "1M",
    downloadLimit: "4M",
    burstUpload: "2M",
    burstDownload: "8M",
    burstThresholdUpload: "768k",
    burstThresholdDownload: "3M",
    burstTime: "8s",
    priority: 8,
    dataQuotaMb: 10000,
    sharedUsers: 1,
    sessionTimeout: "00:00:00",
    idleTimeout: "00:15:00",
    keepaliveTimeout: "00:02:00",
    price: 15,
    validity: "30d"
  },
  {
    id: "prof_8m",
    name: "8M",
    displayName: "8 Mbps Speed Plan",
    uploadLimit: "2M",
    downloadLimit: "8M",
    burstUpload: "4M",
    burstDownload: "16M",
    burstThresholdUpload: "1.5M",
    burstThresholdDownload: "6M",
    burstTime: "8s",
    priority: 8,
    dataQuotaMb: 20000,
    sharedUsers: 1,
    sessionTimeout: "00:00:00",
    idleTimeout: "00:15:00",
    keepaliveTimeout: "00:02:00",
    price: 25,
    validity: "30d"
  }
];

export default function App() {
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [activeTab, setActiveTab] = useState<number>(0);
  const [config, setConfig] = useState<HotspotConfig>(() => {
    const saved = localStorage.getItem("mikrotik_hotspot_config");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_CONFIG, ...parsed };
      } catch (e) {
        return DEFAULT_CONFIG;
      }
    }
    return DEFAULT_CONFIG;
  });
  const [profiles, setProfiles] = useState<SpeedProfile[]>(() => {
    const saved = localStorage.getItem("mikrotik_hotspot_profiles");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_PROFILES;
      }
    }
    return DEFAULT_PROFILES;
  });

  const [copied, setCopied] = useState<boolean>(false);
  const [generatedScript, setGeneratedScript] = useState<string>("");

  const isAr = lang === "ar";

  // Regenerate script whenever config or profiles change
  useEffect(() => {
    const script = generateMikrotikScript(config, profiles);
    setGeneratedScript(script);
    localStorage.setItem("mikrotik_hotspot_config", JSON.stringify(config));
    localStorage.setItem("mikrotik_hotspot_profiles", JSON.stringify(profiles));
  }, [config, profiles]);

  const handleConfigChange = (updates: Partial<HotspotConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const handleAddProfile = (newProf: SpeedProfile) => {
    setProfiles((prev) => [...prev, newProf]);
  };

  const handleUpdateProfile = (index: number, updatedProf: SpeedProfile) => {
    const next = [...profiles];
    next[index] = updatedProf;
    setProfiles(next);
  };

  const handleDeleteProfile = (index: number) => {
    setProfiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleResetProfiles = () => {
    if (confirm(isAr ? "هل أنت متأكد من استعادة البروفايلات الافتراضية؟" : "Are you sure you want to reset speed profiles to default?")) {
      setProfiles(DEFAULT_PROFILES);
    }
  };

  const handleResetAll = () => {
    if (confirm(isAr ? "هل أنت متأكد من تصفير كافة الإعدادات والبروفايلات؟" : "Are you sure you want to reset all settings to default?")) {
      setConfig(DEFAULT_CONFIG);
      setProfiles(DEFAULT_PROFILES);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadScriptFile = () => {
    const blob = new Blob([generatedScript], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hotspot_setup_${config.rosVersion}_${config.serverName}.rsc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Color syntax highlight helper for RouterOS scripts
  const renderHighlightedCode = () => {
    const lines = generatedScript.split("\n");
    return lines.map((line, idx) => {
      let className = "text-slate-300";
      if (line.trim().startsWith("#")) {
        className = "text-slate-500 italic";
      } else if (line.trim().startsWith("/")) {
        className = "text-emerald-400 font-semibold";
      } else if (line.trim().startsWith("add ") || line.trim().startsWith("set ")) {
        className = "text-sky-400";
      } else if (line.trim().startsWith(":")) {
        className = "text-amber-400 font-mono";
      }
      return (
        <div key={idx} className={`${className} font-mono text-xs whitespace-pre-wrap leading-relaxed py-0.5 min-h-[1.2rem]`}>
          {line}
        </div>
      );
    });
  };

  const tabs = [
    { id: 0, label: isAr ? "إعدادات الشبكة" : "Network Setup", icon: Network },
    { id: 1, label: isAr ? "الشبكات الافتراضية (VLANs)" : "VLANs Setup", icon: Layers },
    { id: 2, label: isAr ? "دمج الخطوط (Multi-WAN)" : "Load Balancing", icon: Zap },
    { id: 3, label: isAr ? "سرعات وبيرست" : "Speed & Burst", icon: Gauge },
    { id: 4, label: isAr ? "اليوزر مانجر وراديوس" : "User Manager & RADIUS", icon: ShieldCheck },
    { id: 5, label: isAr ? "حماية وتخصيص" : "Security & Advanced", icon: Sparkles },
    { id: 6, label: isAr ? "صفحة الدخول (login.html)" : "Login Page Template", icon: Layout },
    { id: 7, label: isAr ? "دليل التركيب" : "How to Apply", icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans" dir={isAr ? "rtl" : "ltr"}>
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-900/40 backdrop-blur-md px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-950 border border-emerald-800 rounded-xl text-emerald-400 shadow-md">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
                {isAr ? "مولد سكربت ميكروتيك هوت سبوت الشامل" : "MikroTik Hotspot & Master Script Generator"}
                <span className="text-xs bg-emerald-900/60 border border-emerald-800 text-emerald-300 px-2.5 py-0.5 rounded-full font-mono font-bold">
                  ROS {config.rosVersion.toUpperCase()}
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr 
                  ? "أداة متكاملة لـ (RouterOS v6 & v7): هوتسبوت، دمج PCC، الفيلان VLANs، بروفايلات البيرست وراديوس اليوزر مانجر." 
                  : "Complete RouterOS v6 & v7 Hotspot, PCC Multi-WAN, VLANs, Burst Profiles & RADIUS User Manager generator."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Version Toggle quick buttons */}
            <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex text-xs font-mono font-semibold">
              <button
                type="button"
                onClick={() => handleConfigChange({ rosVersion: "v6" })}
                className={`px-2.5 py-1 rounded-lg transition ${
                  config.rosVersion === "v6"
                    ? "bg-emerald-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                v6.x
              </button>
              <button
                type="button"
                onClick={() => handleConfigChange({ rosVersion: "v7" })}
                className={`px-2.5 py-1 rounded-lg transition ${
                  config.rosVersion === "v7"
                    ? "bg-emerald-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                v7.x
              </button>
            </div>

            {/* Language switcher */}
            <button
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              type="button"
              className="flex items-center gap-1.5 text-xs px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl transition"
            >
              <Languages className="w-4 h-4 text-emerald-400" />
              <span>{isAr ? "English" : "العربية"}</span>
            </button>

            {/* Clear All */}
            <button
              onClick={handleResetAll}
              type="button"
              className="flex items-center gap-1.5 text-xs px-3 py-2 bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-900 rounded-xl transition"
              title={isAr ? "إعادة ضبط المصنع للسكربت" : "Reset everything to default"}
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">{isAr ? "تصفير الكل" : "Reset All"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Parameters Form and Config */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          {/* Quick Metrics / Info Panel */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">{isAr ? "إصدار النظام" : "ROS Target"}</span>
              <span className="text-sm font-semibold text-emerald-400 mt-1 font-mono flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-emerald-500" />
                RouterOS {config.rosVersion.toUpperCase()}
              </span>
            </div>
            <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">{isAr ? "دمج الخطوط" : "Load Balancing"}</span>
              <span className={`text-sm font-semibold mt-1 font-mono flex items-center gap-1.5 ${config.loadBalancingMethod !== "none" ? "text-emerald-400" : "text-slate-500"}`}>
                <Zap className="w-3.5 h-3.5" />
                {config.loadBalancingMethod !== "none" ? config.loadBalancingMethod.toUpperCase() : (isAr ? "معطّل" : "Disabled")}
              </span>
            </div>
            <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">{isAr ? "الفيلان VLANs" : "VLANs"}</span>
              <span className={`text-sm font-semibold mt-1 font-mono flex items-center gap-1.5 ${config.enableVlans ? "text-emerald-400" : "text-slate-500"}`}>
                <Layers className="w-3.5 h-3.5" />
                {config.enableVlans ? `${config.vlans?.length || 0} VLANs` : (isAr ? "معطّل" : "Disabled")}
              </span>
            </div>
            <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">{isAr ? "اليوزر مانجر" : "User manager"}</span>
              <span className={`text-sm font-semibold mt-1 font-mono flex items-center gap-1.5 ${config.enableUserManager ? "text-emerald-400" : "text-slate-500"}`}>
                <ShieldCheck className="w-3.5 h-3.5" />
                {config.enableUserManager ? (isAr ? "مفعّل" : "Enabled") : (isAr ? "معطّل" : "Disabled")}
              </span>
            </div>
          </div>

          {/* Configuration Card with Tabs */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-2xl flex flex-col overflow-hidden flex-1 shadow-lg">
            {/* Tabs Header */}
            <div className="border-b border-slate-900 bg-slate-900/60 p-2 flex gap-1 overflow-x-auto scrollbar-none">
              {tabs.map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    type="button"
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl whitespace-nowrap transition-all duration-150 ${
                      isActive 
                        ? "bg-emerald-950 border border-emerald-900/60 text-emerald-400 shadow-sm" 
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                    }`}
                  >
                    <TabIcon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Body */}
            <div className="p-6 flex-1 overflow-y-auto max-h-[560px]">
              {activeTab === 0 && (
                <NetworkConfigTab 
                  config={config} 
                  onChange={handleConfigChange} 
                  lang={lang} 
                />
              )}
              {activeTab === 1 && (
                <VlanConfigTab 
                  config={config} 
                  onChange={handleConfigChange} 
                  lang={lang} 
                />
              )}
              {activeTab === 2 && (
                <LoadBalancingTab 
                  config={config} 
                  onChange={handleConfigChange} 
                  lang={lang} 
                />
              )}
              {activeTab === 3 && (
                <SpeedProfilesTab 
                  profiles={profiles} 
                  onAdd={handleAddProfile}
                  onUpdate={handleUpdateProfile}
                  onDelete={handleDeleteProfile}
                  onReset={handleResetProfiles}
                  lang={lang} 
                />
              )}
              {activeTab === 4 && (
                <UserManagerTab 
                  config={config} 
                  onChange={handleConfigChange} 
                  lang={lang} 
                />
              )}
              {activeTab === 5 && (
                <AdvancedFeaturesTab 
                  config={config} 
                  onChange={handleConfigChange} 
                  lang={lang} 
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
                  lang={lang} 
                />
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Generated Terminal Script Output */}
        <div className="lg:col-span-6 flex flex-col bg-slate-950/60 border border-slate-900 rounded-2xl shadow-xl overflow-hidden min-h-[500px] lg:h-[760px]">
          {/* Editor Header */}
          <div className="border-b border-slate-900 bg-slate-900/50 px-4 py-3 flex justify-between items-center flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/80"></span>
                <span className="w-3 h-3 rounded-full bg-yellow-500/80"></span>
                <span className="w-3 h-3 rounded-full bg-green-500/80"></span>
              </div>
              <span className="text-xs font-mono text-slate-400 ml-2">
                hotspot_{config.rosVersion}_script.rsc
              </span>
            </div>

            <div className="flex gap-1.5">
              <button
                onClick={copyToClipboard}
                type="button"
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition font-medium border border-slate-700"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copied ? (isAr ? "تم النسخ!" : "Copied!") : (isAr ? "نسخ السكربت" : "Copy Script")}</span>
              </button>
              <button
                onClick={downloadScriptFile}
                type="button"
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg transition font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isAr ? "تحميل ملف .rsc" : "Download RSC"}</span>
              </button>
            </div>
          </div>

          {/* Script Content Viewer */}
          <div className="flex-1 p-4 overflow-auto bg-slate-950/90 font-mono scrollbar-thin">
            <div className="space-y-0.5">
              {renderHighlightedCode()}
            </div>
          </div>

          {/* Editor Footer / Info */}
          <div className="border-t border-slate-900 bg-slate-900/20 px-4 py-2 flex items-center gap-2 text-slate-500 text-[10px]">
            <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span>
              {isAr 
                ? "انسخ هذا السكربت بالكامل وألصقه داخل New Terminal في برنامج Winbox."
                : "Copy the output and paste it inside the Winbox 'New Terminal' window."}
            </span>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900/60 bg-slate-950 py-4 text-center text-xs text-slate-600 px-4">
        <p className="max-w-7xl mx-auto">
          {isAr 
            ? "أداة مولد سكربتات ميكروتيك الشاملة (RouterOS v6 & v7) - جميع الحقوق محفوظة 2026."
            : "MikroTik Hotspot, VLANs & Load Balancing Script Generator (v6 & v7) - All Rights Reserved 2026."}
        </p>
      </footer>
    </div>
  );
}
