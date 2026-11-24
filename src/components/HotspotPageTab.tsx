/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import { useDeferredValue, useMemo, useState } from "react";
import type { HotspotConfig } from "../types";
import {
  escapeHtml,
  generateHotspotPortalFiles,
  type PortalPageName,
} from "../utils/htmlTemplateGenerator";
import { copyTextToClipboard } from "../utils/clipboard";
import { Layout, Download, Copy, Check, Phone, Type, Palette, Eye, FolderCheck } from "lucide-react";

interface Props {
  config: HotspotConfig;
  onChange: (updates: Partial<HotspotConfig>) => void;
  lang: "ar" | "en";
}

const PORTAL_PAGES: PortalPageName[] = [
  "login.html",
  "status.html",
  "logout.html",
  "alogin.html",
];

export default function HotspotPageTab({ config, onChange, lang }: Props) {
  const isAr = lang === "ar";
  const [selectedPage, setSelectedPage] = useState<PortalPageName>("login.html");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const [showCode, setShowCode] = useState(false);

  const portalFiles = useMemo(() => generateHotspotPortalFiles(config, lang), [config, lang]);
  const htmlCode = portalFiles[selectedPage];

  // Strip raw MikroTik template conditionals, refresh meta, and /md5.js script tag only for interactive browser preview
  const previewHtml = useMemo(() => {
    const trialRegex = /\$\(if trial == 'yes'\)([\s\S]*?)\$\(endif\)/g;
    const sampleIp = escapeHtml(config.poolStart || "192.168.80.10");

    return htmlCode
      .replace(/<meta\s+http-equiv=["']refresh["'][^>]*>/gi, "")
      .replace(/\$\(if error\)[\s\S]*?\$\(endif\)/g, "")
      .replace(/\$\(if chap-id\)[\s\S]*?\$\(endif\)/g, "")
      .replace(/<script[^>]*src="\/md5\.js"[^>]*><\/script>/gi, "")
      .replace(trialRegex, (_match, inner: string) =>
        config.enableTrial
          ? inner.replace(/href="[^"]*"/, 'href="#" onclick="return false;"')
          : ""
      )
      .replace(/\$\(if [^)]+\)/g, "")
      .replace(/\$\(endif\)/g, "")
      .replace(/\$\(username\)/g, "CARD-a1b2")
      .replace(/\$\(ip\)/g, sampleIp)
      .replace(/\$\(uptime\)/g, "01:24:15")
      .replace(/\$\(session-time-left\)/g, "22:35:45")
      .replace(/\$\(bytes-in-nice\)/g, "18.4 MiB")
      .replace(/\$\(bytes-out-nice\)/g, "142.8 MiB")
      .replace(/\$\(remain-bytes-total-nice\)/g, "4.85 GiB")
      .replace(/form\.submit\(\);/g, "return false;")
      .replace(/action="\$\(link-(?:logout|login|login-only)\)"/g, 'action="#" onsubmit="return false;"')
      .replace(/href="\$\(link-(?:redirect|status|login|login-only)[^"]*"/g, 'href="#" onclick="return false;"')
      .replace(
        "</head>",
        `<style>html{color-scheme:dark;} body{min-height:auto;padding:20px 14px;}</style></head>`
      );
  }, [htmlCode, config.enableTrial, config.poolStart]);

  const deferredPreviewHtml = useDeferredValue(previewHtml);

  const handleDownload = () => {
    const blob = new Blob([htmlCode], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = selectedPage;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    const ok = await copyTextToClipboard(htmlCode);
    setCopyStatus(ok ? "copied" : "error");
    setTimeout(() => setCopyStatus("idle"), 2500);
  };

  const htmlFolder = config.storageMode === "flash" ? "flash/hotspot" : (config.htmlDirectory || "hotspot");

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <div className="border-b border-slate-800 pb-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <Layout className="w-5 h-5 text-emerald-400" aria-hidden="true" />
              {isAr ? "صفحات بوابة الهوتسبوت (Hotspot Portal Pages)" : "Hotspot Captive Portal Templates"}
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              {isAr
                ? "تخصيص ومعاينة وتحميل صفحات البوابة (login.html, status.html, logout.html, alogin.html) لرفعها على الميكروتيك."
                : "Customize, preview, and download responsive MikroTik portal pages (login.html, status.html, logout.html, alogin.html)."}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCopy}
              className="min-h-[44px] sm:min-h-[40px] bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition"
            >
              {copyStatus === "copied" ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              ) : (
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>
                {copyStatus === "copied"
                  ? (isAr ? "تم النسخ" : "Copied")
                  : copyStatus === "error"
                    ? (isAr ? "فشل النسخ" : "Copy failed")
                    : (isAr ? "نسخ كود HTML" : "Copy HTML")}
              </span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="min-h-[44px] sm:min-h-[40px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition shadow-md"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>{isAr ? `تحميل ملف ${selectedPage}` : `Download ${selectedPage}`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Info notice about RouterOS HTML files */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
        <FolderCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="text-xs text-slate-300 space-y-1 leading-relaxed">
          <p className="font-semibold text-slate-100">
            {isAr ? "كيف تعمل ملفات الصفحات في الميكروتيك؟" : "How Hotspot HTML Files Work in MikroTik"}
          </p>
          <p>
            {isAr ? "1. بمجرد تنفيذ السكربت على الميكروتيك، يتم ربط الهوتسبوت بمجلد " : "1. Executing the master script links the hotspot profile to folder "}
            <bdi dir="ltr" className="font-mono text-emerald-300">{htmlFolder}</bdi>
            {isAr ? " الذي يحتوي على ملفات البوابة الخمسة: " : " containing the 5 portal files: "}
            <bdi dir="ltr" className="font-mono text-slate-200">login.html, status.html, logout.html, alogin.html, md5.js</bdi>.
          </p>
          <p>
            {isAr ? "2. لتطبيق الصفحات المخصصة، حمّل الصفحات المطلوبة ثم ارفعها داخل مجلد " : "2. To apply this custom layout, download the portal pages and upload them into "}
            <bdi dir="ltr" className="font-mono text-emerald-300">{htmlFolder}</bdi>
            {isAr ? " عبر Winbox (قسم Files) أو عبر FTP لاستبدال الملفات القديمة." : " via Winbox > Files or FTP."}
          </p>
        </div>
      </div>

      {/* Controls Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end bg-slate-900/40 border border-slate-800 rounded-xl p-4">
        {/* Login Title */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="portal-title" className="text-slate-200 text-xs font-medium flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            {isAr ? "عنوان شبكة الهوتسبوت الرئيسي" : "Login Header Title"}
          </label>
          <input
            id="portal-title"
            name="loginTitle"
            type="text"
            className="min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400"
            value={config.loginTitle || ""}
            onChange={(e) => onChange({ loginTitle: e.target.value })}
            placeholder={isAr ? "أهلاً بك في شبكة الواي فاي" : "Welcome to WiFi Network"}
          />
        </div>

        {/* Login Subtitle */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="portal-subtitle" className="text-slate-200 text-xs font-medium flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            {isAr ? "النص الترحيبي الفرعي" : "Subtitle / Instructions"}
          </label>
          <input
            id="portal-subtitle"
            name="loginSubtitle"
            type="text"
            className="min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400"
            value={config.loginSubtitle || ""}
            onChange={(e) => onChange({ loginSubtitle: e.target.value })}
            placeholder={isAr ? "سجل دخولك برقم الكارت للاتصال بالإنترنت" : "Enter voucher code to connect"}
          />
        </div>

        {/* Contact Phone */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="portal-phone" className="text-slate-200 text-xs font-medium flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            {isAr ? "رقم هاتف الدعم الفني" : "Support Contact Phone"}
          </label>
          <input
            id="portal-phone"
            name="contactPhone"
            dir="ltr"
            type="text"
            className="min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 font-mono"
            value={config.contactPhone || ""}
            onChange={(e) => onChange({ contactPhone: e.target.value })}
            placeholder="01000000000"
          />
        </div>

        {/* Theme Palette */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="portal-theme" className="text-slate-200 text-xs font-medium flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            {isAr ? "لون وتصميم الصفحة" : "Color Theme"}
          </label>
          <select
            id="portal-theme"
            name="loginTheme"
            className="min-h-[44px] sm:min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400"
            value={config.loginTheme || "emerald"}
            onChange={(e) => onChange({ loginTheme: e.target.value as HotspotConfig["loginTheme"] })}
          >
            <option value="emerald">{isAr ? "زمردي إلكتروني (Emerald Green)" : "Emerald Green"}</option>
            <option value="blue">{isAr ? "أزرق ملكي (Royal Blue)" : "Royal Blue"}</option>
            <option value="purple">{isAr ? "بنفسجي بريميوم (Deep Purple)" : "Deep Purple"}</option>
            <option value="dark">{isAr ? "أسود نايت مود (Dark Slate)" : "Dark Slate"}</option>
          </select>
        </div>
      </div>

      {/* Portal Page Selector & Toggle View Source / Live Preview */}
      <div className="flex flex-wrap justify-between items-center gap-3 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            {isAr ? "معاينة صفحات البوابة" : "Portal Page Preview"}
          </h3>
          <div className="flex flex-wrap gap-1.5 bg-slate-900/80 border border-slate-800 rounded-lg p-1" role="tablist" aria-label={isAr ? "اختيار صفحة البوابة" : "Portal Page Selector"}>
            {PORTAL_PAGES.map((page) => {
              const active = selectedPage === page;
              return (
                <button
                  key={page}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedPage(page)}
                  className={`min-h-[36px] px-2.5 py-1 rounded-md text-xs font-mono transition ${
                    active
                      ? "bg-emerald-500 text-slate-950 font-semibold shadow-sm"
                      : "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowCode(!showCode)}
          className="min-h-[44px] sm:min-h-[36px] px-2 text-xs text-emerald-400 hover:underline font-mono rounded"
        >
          {showCode
            ? (isAr ? "إخفاء كود HTML" : "Hide HTML Source")
            : (isAr ? "عرض كود HTML المصدر" : "View HTML Source")}
        </button>
      </div>

      {showCode ? (
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs overflow-auto max-h-96 text-slate-200" dir="ltr">
          <pre>{htmlCode}</pre>
        </div>
      ) : (
        /* Live iFrame Preview */
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden p-3 sm:p-4 flex justify-center items-center">
          <div className="w-full max-w-md border border-slate-700 rounded-2xl overflow-hidden shadow-2xl bg-slate-900">
            <div className="bg-slate-800 px-3 py-2 text-xs font-mono text-slate-200 border-b border-slate-700 flex items-center justify-between gap-2" dir="ltr">
              <span>{config.dnsName || "hotspot.local"}/{selectedPage}</span>
              <span className="text-[11px] text-emerald-300">{htmlFolder}</span>
            </div>
            <iframe
              srcDoc={deferredPreviewHtml}
              sandbox="allow-scripts"
              width="100%"
              height={560}
              title={`Hotspot ${selectedPage} Preview`}
              className="w-full h-[560px] border-0"
            />
          </div>
        </div>
      )}
    </div>
  );
}
