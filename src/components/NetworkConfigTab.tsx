/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { HotspotConfig, RouterOSVersion } from "../types";
import { Network, Globe, Server, Hash, Cpu, KeyRound } from "lucide-react";

interface Props {
  config: HotspotConfig;
  onChange: (updates: Partial<HotspotConfig>) => void;
  lang: "ar" | "en";
}

export default function NetworkConfigTab({ config, onChange, lang }: Props) {
  const isAr = lang === "ar";

  // Automatically update DHCP IP pool ranges when gateway IP changes (assuming /24)
  const handleGatewayChange = (ip: string) => {
    onChange({ gatewayIp: ip });
    
    const parts = ip.split(".");
    if (parts.length === 4) {
      const prefix = `${parts[0]}.${parts[1]}.${parts[2]}`;
      onChange({
        gatewayIp: ip,
        poolStart: `${prefix}.10`,
        poolEnd: `${prefix}.254`
      });
    }
  };

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      {/* Version selector banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-400" />
            {isAr ? "إصدار نظام التشغيل MikroTik RouterOS" : "RouterOS Target Version"}
          </label>
          <span className="text-xs text-slate-400">
            {isAr ? "اختر الإصدار لجعل السكربت متوافقاً 100%" : "Select target OS to ensure syntax compatibility"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={() => onChange({ rosVersion: "v6" })}
            className={`p-3 rounded-xl border text-start transition-all ${
              config.rosVersion === "v6"
                ? "bg-emerald-950/60 border-emerald-500/80 text-emerald-300 ring-1 ring-emerald-500/50 shadow"
                : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-sm font-mono">RouterOS v6.x</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">v6.49+</span>
            </div>
            <p className="text-xs opacity-80">
              {isAr ? "يدعم سطر أجهزة الميكروتيك التقليدية وأوامر /tool user-manager" : "Legacy syntax for Ros v6 and classical /tool user-manager"}
            </p>
          </button>

          <button
            type="button"
            onClick={() => onChange({ rosVersion: "v7" })}
            className={`p-3 rounded-xl border text-start transition-all ${
              config.rosVersion === "v7"
                ? "bg-emerald-950/60 border-emerald-500/80 text-emerald-300 ring-1 ring-emerald-500/50 shadow"
                : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-sm font-mono">RouterOS v7.x</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 font-mono">v7.1+ New</span>
            </div>
            <p className="text-xs opacity-80">
              {isAr ? "يدعم الأجهزة الحديثة والبنية الجديدة لليوزر مانجر /user-manager" : "Modern syntax for v7 with updated /user-manager commands"}
            </p>
          </button>
        </div>
      </div>

      <div className="border-b border-slate-800 pb-4">
        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <Network className="w-5 h-5 text-emerald-400" />
          {isAr ? "إعدادات الشبكة والعناوين" : "Network & Interface Setup"}
        </h3>
        <p className="text-slate-400 text-sm mt-1">
          {isAr 
            ? "قم بتحديد منافذ الدخول والخروج وعناوين IP لشبكة الهوت سبوت."
            : "Define your WAN/LAN interfaces and Hotspot IP addressing structure."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* WAN Interface */}
        <div className="flex flex-col gap-1.5">
          <label className="text-slate-300 text-sm font-medium flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-500" />
            {isAr ? "منفذ دخول الإنترنت (WAN)" : "Internet Interface (WAN)"}
          </label>
          <input
            type="text"
            className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            value={config.wanInterface}
            onChange={(e) => onChange({ wanInterface: e.target.value })}
            placeholder="e.g. ether1"
          />
          <span className="text-xs text-slate-500">
            {isAr ? "الكارت المتصل بمودم الإنترنت" : "Interface connected to the external internet modem"}
          </span>
        </div>

        {/* LAN Interface */}
        <div className="flex flex-col gap-1.5">
          <label className="text-slate-300 text-sm font-medium flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-500" />
            {isAr ? "منفذ خروج الهوت سبوت (LAN)" : "Hotspot Output Interface (LAN)"}
          </label>
          <input
            type="text"
            className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            value={config.lanInterface}
            onChange={(e) => onChange({ lanInterface: e.target.value })}
            placeholder="e.g. ether2"
          />
          <span className="text-xs text-slate-500">
            {isAr ? "الكارت المتصل بالمشتركين أو الأكسس بوينت" : "Interface connected to local users or access points"}
          </span>
        </div>

        {/* Gateway IP */}
        <div className="flex flex-col gap-1.5">
          <label className="text-slate-300 text-sm font-medium flex items-center gap-2">
            <Hash className="w-4 h-4 text-emerald-500" />
            {isAr ? "عنوان جيتواي الهوت سبوت (IP)" : "Hotspot Gateway IP"}
          </label>
          <input
            type="text"
            className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            value={config.gatewayIp}
            onChange={(e) => handleGatewayChange(e.target.value)}
            placeholder="e.g. 192.168.80.1"
          />
          <span className="text-xs text-slate-500">
            {isAr ? "أول عنوان للراوتر داخل شبكة الهوتسبوت" : "The local IP address assigned to the router"}
          </span>
        </div>

        {/* Subnet Mask */}
        <div className="flex flex-col gap-1.5">
          <label className="text-slate-300 text-sm font-medium flex items-center gap-2">
            <Hash className="w-4 h-4 text-emerald-500" />
            {isAr ? "قناع الشبكة (Subnet Mask)" : "Subnet Mask Prefix"}
          </label>
          <select
            className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            value={config.subnetMask}
            onChange={(e) => onChange({ subnetMask: parseInt(e.target.value) })}
          >
            <option value="24">/24 (254 IPs)</option>
            <option value="23">/23 (510 IPs)</option>
            <option value="22">/22 (1022 IPs)</option>
            <option value="16">/16 (65534 IPs)</option>
          </select>
          <span className="text-xs text-slate-500">
            {isAr ? "حجم شبكة الهوت سبوت وعدد المشتركين المتاحين" : "Determines the total pool capacity for users"}
          </span>
        </div>

        {/* DNS Server Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-slate-300 text-sm font-medium flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-500" />
            {isAr ? "رابط صفحة الدخول (DNS Name)" : "DNS Name"}
          </label>
          <input
            type="text"
            className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            value={config.dnsName}
            onChange={(e) => onChange({ dnsName: e.target.value })}
            placeholder="e.g. hotspot.net"
          />
          <span className="text-xs text-slate-500">
            {isAr ? "الرابط الذي يكتبه المستخدم لفتح صفحة تسجيل الدخول" : "URL written by users to trigger the login portal"}
          </span>
        </div>

        {/* Server Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-slate-300 text-sm font-medium flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-500" />
            {isAr ? "اسم سيرفر الهوت سبوت" : "Hotspot Server Name"}
          </label>
          <input
            type="text"
            className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            value={config.serverName}
            onChange={(e) => onChange({ serverName: e.target.value })}
            placeholder="e.g. hotspot1"
          />
          <span className="text-xs text-slate-500">
            {isAr ? "الاسم البرمجي داخل الميكروتيك" : "Internal identifier of the hotspot instance"}
          </span>
        </div>
      </div>

      {/* Login Authentication Methods */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
        <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-emerald-400" />
          {isAr ? "طرق تسجيل الدخول المسموحة (Login By)" : "Login Authentication Methods"}
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <label className="flex items-center gap-2 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50 cursor-pointer hover:bg-slate-800">
            <input
              type="checkbox"
              className="accent-emerald-500"
              checked={config.loginHttpChap}
              onChange={(e) => onChange({ loginHttpChap: e.target.checked })}
            />
            <span>HTTP CHAP ({isAr ? "المشفر" : "Encrypted"})</span>
          </label>

          <label className="flex items-center gap-2 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50 cursor-pointer hover:bg-slate-800">
            <input
              type="checkbox"
              className="accent-emerald-500"
              checked={config.loginHttpPap}
              onChange={(e) => onChange({ loginHttpPap: e.target.checked })}
            />
            <span>HTTP PAP ({isAr ? "عادي" : "Plain"})</span>
          </label>

          <label className="flex items-center gap-2 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50 cursor-pointer hover:bg-slate-800">
            <input
              type="checkbox"
              className="accent-emerald-500"
              checked={config.enableCookie}
              onChange={(e) => onChange({ enableCookie: e.target.checked })}
            />
            <span>Cookie ({isAr ? "تذكر الدخول" : "Remember User"})</span>
          </label>

          <label className="flex items-center gap-2 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50 cursor-pointer hover:bg-slate-800">
            <input
              type="checkbox"
              className="accent-emerald-500"
              checked={config.loginMacAuth}
              onChange={(e) => onChange({ loginMacAuth: e.target.checked })}
            />
            <span>MAC Auth ({isAr ? "دخول بالماك" : "MAC Address"})</span>
          </label>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
        <h4 className="text-sm font-medium text-slate-200">
          {isAr ? "توزيع عناوين IP (DHCP IP Pool)" : "IP Pool & Range Allocation"}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-400 text-xs">
              {isAr ? "بداية مجال توزيع العناوين" : "IP Pool Start"}
            </label>
            <input
              type="text"
              className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              value={config.poolStart}
              onChange={(e) => onChange({ poolStart: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-400 text-xs">
              {isAr ? "نهاية مجال توزيع العناوين" : "IP Pool End"}
            </label>
            <input
              type="text"
              className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              value={config.poolEnd}
              onChange={(e) => onChange({ poolEnd: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
        <h4 className="text-sm font-medium text-slate-200">
          {isAr ? "خوادم الـ DNS الموصى بها" : "DNS Servers Configuration"}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-400 text-xs">{isAr ? "خادم DNS الرئيسي" : "Primary DNS"}</label>
            <input
              type="text"
              className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none"
              value={config.dnsServers[0] || ""}
              onChange={(e) => {
                const updated = [...config.dnsServers];
                updated[0] = e.target.value;
                onChange({ dnsServers: updated });
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-400 text-xs">{isAr ? "خادم DNS الاحتياطي" : "Secondary DNS"}</label>
            <input
              type="text"
              className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none"
              value={config.dnsServers[1] || ""}
              onChange={(e) => {
                const updated = [...config.dnsServers];
                updated[1] = e.target.value;
                onChange({ dnsServers: updated });
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
