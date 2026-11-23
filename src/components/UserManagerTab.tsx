/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { HotspotConfig } from "../types";
import { ShieldCheck, Server, Key, Users, Hash, Info, Cpu } from "lucide-react";

interface Props {
  config: HotspotConfig;
  onChange: (updates: Partial<HotspotConfig>) => void;
  lang: "ar" | "en";
}

export default function UserManagerTab({ config, onChange, lang }: Props) {
  const isAr = lang === "ar";
  const isV7 = config.rosVersion === "v7";

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <div className="border-b border-slate-800 pb-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              {isAr ? "إعدادات الراديوس واليوزر مانجر (RADIUS & User Manager)" : "User Manager & RADIUS Setup"}
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              {isAr 
                ? "إعداد كامل بروتوكول RADIUS وسيرفر User Manager على الميكروتيك للتحكم في الكروت والمستخدمين."
                : "Complete RADIUS client & User Manager server automated script setup for RouterOS."}
            </p>
          </div>
          <div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={config.enableUserManager}
                onChange={(e) => onChange({ enableUserManager: e.target.checked })}
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white"></div>
              <span className="ms-3 text-sm font-medium text-slate-300">
                {isAr ? "تفعيل الربط" : "Enable Integration"}
              </span>
            </label>
          </div>
        </div>
      </div>

      {!config.enableUserManager ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-8 text-center text-slate-400 space-y-2">
          <p className="text-sm">
            {isAr 
              ? "الربط مع اليوزر مانجر معطل حالياً. قم بتفعيله لرؤية وتعديل الخيارات."
              : "User Manager integration is currently disabled. Toggle it on to configure RADIUS settings."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* OS Version notice */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3 text-xs">
            <Cpu className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="text-slate-300">
              {isAr 
                ? `سيتم توليد أوامر اليوزر مانجر المتوافقة تماماً مع RouterOS ${config.rosVersion.toUpperCase()} (مسار ${isV7 ? "/user-manager" : "/tool user-manager"}).`
                : `User Manager commands generated targeting RouterOS ${config.rosVersion.toUpperCase()} syntax.`}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Radius Server IP */}
            <div className="flex flex-col gap-1.5">
              <label className="text-slate-300 text-sm font-medium flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-500" />
                {isAr ? "عنوان IP الخاص بسيرفر اليوزر مانجر" : "RADIUS Server IP Address"}
              </label>
              <input
                type="text"
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                value={config.radiusServerIp}
                onChange={(e) => onChange({ radiusServerIp: e.target.value })}
                placeholder="127.0.0.1"
              />
              <span className="text-xs text-slate-500">
                {isAr 
                  ? "اكتب 127.0.0.1 إذا كان اليوزر مانجر يعمل محلياً على نفس الميكروتيك" 
                  : "Use 127.0.0.1 if User Manager runs locally on the same MikroTik"}
              </span>
            </div>

            {/* Radius Shared Secret */}
            <div className="flex flex-col gap-1.5">
              <label className="text-slate-300 text-sm font-medium flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-500" />
                {isAr ? "كلمة سر الربط (Shared Secret)" : "RADIUS Shared Secret"}
              </label>
              <input
                type="text"
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                value={config.radiusSecret}
                onChange={(e) => onChange({ radiusSecret: e.target.value })}
                placeholder="radius123"
              />
              <span className="text-xs text-slate-500">
                {isAr ? "كلمة المرور المشتركة لربط الهوتسبوت بسيرفر الراديوس" : "Shared secret encrypting RADIUS auth packets"}
              </span>
            </div>

            {/* User Manager Router Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-slate-300 text-sm font-medium flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-500" />
                {isAr ? "اسم الراوتر في اليوزر مانجر" : "Router Name in User Manager"}
              </label>
              <input
                type="text"
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                value={config.usermanRouterName}
                onChange={(e) => onChange({ usermanRouterName: e.target.value })}
                placeholder="Router1"
              />
              <span className="text-xs text-slate-500">
                {isAr ? "اسم الراوتر المضاف داخل قاعدة بيانات اليوزر مانجر" : "Router identifier in User Manager console"}
              </span>
            </div>

            {/* CoA Port */}
            <div className="flex flex-col gap-1.5">
              <label className="text-slate-300 text-sm font-medium flex items-center gap-2">
                <Hash className="w-4 h-4 text-emerald-500" />
                <span>{isAr ? "منفذ CoA (لفصل المشتركين عند انتهاء الرصيد)" : "CoA Disconnect Port"}</span>
              </label>
              <input
                type="number"
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                value={config.coaPort}
                onChange={(e) => onChange({ coaPort: parseInt(e.target.value) || 3799 })}
              />
              <span className="text-xs text-slate-500">
                {isAr ? "المنفذ الافتراضي 3799 لفصل الكارت فورياً" : "Default 3799 triggers immediate logout upon expiration"}
              </span>
            </div>
          </div>

          {!isV7 && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
              <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                {isAr ? "بيانات حساب مدير اليوزر مانجر (ROS v6 Admin)" : "User Manager Admin Account (v6)"}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400 text-xs">{isAr ? "اسم مستخدم المدير" : "Admin Username"}</label>
                  <input
                    type="text"
                    className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={config.usermanAdminUser}
                    onChange={(e) => onChange({ usermanAdminUser: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400 text-xs">{isAr ? "كلمة مرور المدير" : "Admin Password"}</label>
                  <input
                    type="text"
                    className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={config.usermanAdminPass}
                    onChange={(e) => onChange({ usermanAdminPass: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-slate-200">
                {isAr ? "مزامنة وتوليد بروفايلات اليوزر مانجر تلقائياً" : "Auto-Sync Speed Profiles to User Manager"}
              </h4>
              <p className="text-xs text-slate-400">
                {isAr 
                  ? "سيقوم السكربت تلقائياً بإنشاء القيود (Limitations) والبروفايلات المقابلة في User Manager."
                  : "Generates limitations and profile rules inside User Manager matched to your speed list."}
              </p>
            </div>
            <div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={config.syncProfilesToUserman}
                  onChange={(e) => onChange({ syncProfilesToUserman: e.target.checked })}
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white"></div>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
