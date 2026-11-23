/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { HotspotConfig } from "../types";
import { generateHotspotLoginPageHtml } from "../utils/htmlTemplateGenerator";
import { Layout, Download, Copy, Check, Phone, Type, Palette, Eye, FolderCheck, Info } from "lucide-react";

interface Props {
  config: HotspotConfig;
  onChange: (updates: Partial<HotspotConfig>) => void;
  lang: "ar" | "en";
}

export default function HotspotPageTab({ config, onChange, lang }: Props) {
  const isAr = lang === "ar";
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const htmlCode = generateHotspotLoginPageHtml(config);

  const handleDownload = () => {
    const blob = new Blob([htmlCode], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "login.html";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(htmlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <div className="border-b border-slate-800 pb-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <Layout className="w-5 h-5 text-emerald-400" />
              {isAr ? "صفحة تسجيل الدخول للهوتسبوت (Hotspot Login Page)" : "Hotspot Login Page Template"}
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              {isAr 
                ? "تخصيص وتنسيق صفحة الدخول (login.html) وتحميل ملف الصفحات الجاهز لرفعه على الميكروتيك."
                : "Customize and download a responsive, elegant login.html page for your MikroTik hotspot."}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 font-medium transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? (isAr ? "تم النسخ" : "Copied") : (isAr ? "نسخ كود HTML" : "Copy HTML")}</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>{isAr ? "تحميل ملف login.html" : "Download login.html"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Info notice about RouterOS HTML files */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
        <FolderCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1 leading-relaxed">
          <p className="font-semibold text-slate-100">
            {isAr ? "كيف تعمل ملفات الصفحات في الميكروتيك؟" : "How Hotspot HTML Files Work in MikroTik"}
          </p>
          <p>
            {isAr
              ? `1. بمجرد تنفيذ السكربت على الميكروتيك، يتم إنشاء مجلد تلقائي باسم "${config.htmlDirectory || "hotspot"}" يحتوي على الصفحات الافتراضية للراوتر.`
              : `1. Executing the master script creates the hotspot profile linked to folder "${config.htmlDirectory || "hotspot"}".`}
          </p>
          <p>
            {isAr
              ? "2. لتطبيق هذه الصفحة الاحترافية المخصصة، حمل ملف login.html ثم ألقِ به داخل مجلد hotspot عبر برنامج Winbox (قسم Files) أو عبر FTP واستبدل الملف القديم."
              : "2. To apply this responsive custom layout, download login.html and drag & drop it into the hotspot folder via Winbox > Files or FTP."}
          </p>
        </div>
      </div>

      {/* Controls Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/40 border border-slate-800 rounded-xl p-4">
        {/* Login Title */}
        <div className="flex flex-col gap-1.5">
          <label className="text-slate-300 text-xs font-medium flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-emerald-400" />
            {isAr ? "عنوان شبكة الهوتسبوت الرئيسي" : "Login Header Title"}
          </label>
          <input
            type="text"
            className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            value={config.loginTitle || ""}
            onChange={(e) => onChange({ loginTitle: e.target.value })}
            placeholder={isAr ? "أهلاً بك في شبكة الواي فاي" : "Welcome to WiFi Network"}
          />
        </div>

        {/* Login Subtitle */}
        <div className="flex flex-col gap-1.5">
          <label className="text-slate-300 text-xs font-medium flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-emerald-400" />
            {isAr ? "النص الترحيبي الفرعي" : "Subtitle / Instructions"}
          </label>
          <input
            type="text"
            className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            value={config.loginSubtitle || ""}
            onChange={(e) => onChange({ loginSubtitle: e.target.value })}
            placeholder={isAr ? "سجل دخولك بالرقم الكارت للاتصال بالإنترنت" : "Enter voucher code to connect"}
          />
        </div>

        {/* Contact Phone */}
        <div className="flex flex-col gap-1.5">
          <label className="text-slate-300 text-xs font-medium flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-emerald-400" />
            {isAr ? "رقم هاتف الدعم الفني" : "Support Contact Phone"}
          </label>
          <input
            type="text"
            className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
            value={config.contactPhone || ""}
            onChange={(e) => onChange({ contactPhone: e.target.value })}
            placeholder="01000000000"
          />
        </div>

        {/* Theme Palette */}
        <div className="flex flex-col gap-1.5">
          <label className="text-slate-300 text-xs font-medium flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-emerald-400" />
            {isAr ? "لون وتصميم الصفحة" : "Color Theme"}
          </label>
          <select
            className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            value={config.loginTheme || "emerald"}
            onChange={(e) => onChange({ loginTheme: e.target.value as any })}
          >
            <option value="emerald">{isAr ? "زمردي إلكتروني (Emerald Green)" : "Emerald Green"}</option>
            <option value="blue">{isAr ? "أزرق ملكي (Royal Blue)" : "Royal Blue"}</option>
            <option value="purple">{isAr ? "بنفسجي بريميوم (Deep Purple)" : "Deep Purple"}</option>
            <option value="dark">{isAr ? "أسود نايت مود (Dark Slate)" : "Dark Slate"}</option>
          </select>
        </div>
      </div>

      {/* Toggle View Source / Live Preview */}
      <div className="flex justify-between items-center pt-2">
        <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Eye className="w-4 h-4 text-emerald-400" />
          {isAr ? "معاينة حية وتفاعلية لصفحة تسجيل الدخول" : "Live Login Page Interactive Preview"}
        </h4>
        <button
          type="button"
          onClick={() => setShowCode(!showCode)}
          className="text-xs text-emerald-400 hover:underline font-mono"
        >
          {showCode 
            ? (isAr ? "إخفاء كود HTML" : "Hide HTML Source") 
            : (isAr ? "عرض كود HTML المصدر" : "View HTML Source")}
        </button>
      </div>

      {showCode ? (
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs overflow-auto max-h-96 text-slate-300">
          <pre>{htmlCode}</pre>
        </div>
      ) : (
        /* Live iFrame Preview */
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden p-4 flex justify-center items-center">
          <div className="w-full max-w-md border border-slate-800 rounded-2xl overflow-hidden shadow-2xl bg-slate-900">
            <div className="bg-slate-800 px-3 py-1.5 text-[10px] font-mono text-slate-400 border-b border-slate-700 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/80"></span>
              <span className="ml-2">{config.dnsName || "hotspot.local"}/login.html</span>
            </div>
            <iframe
              srcDoc={htmlCode}
              title="Hotspot Login Page Preview"
              className="w-full h-[480px] border-0"
            />
          </div>
        </div>
      )}
    </div>
  );
}
