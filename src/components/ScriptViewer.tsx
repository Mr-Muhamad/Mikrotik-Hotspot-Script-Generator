/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import { memo, useMemo, useRef, useState } from "react";
import { Archive, Check, Copy, Download, Info, Search, WrapText, X } from "lucide-react";
import { copyTextToClipboard } from "../utils/clipboard";
import ConfirmDialog from "./ConfirmDialog";

interface Props {
  script: string;
  filename: string;
  lang: "ar" | "en";
  errorCount?: number;
  hasUnsavedDraft?: boolean;
  onDownloadBundle?: () => void;
}

interface SectionMarker {
  lineIndex: number;
  label: string;
}

const ScriptViewer = memo(function ScriptViewer({
  script,
  filename,
  lang,
  errorCount = 0,
  hasUnsavedDraft = false,
  onDownloadBundle,
}: Props) {
  const isAr = lang === "ar";
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const [searchQuery, setSearchQuery] = useState("");
  const [wrapLines, setWrapLines] = useState(false);
  const [pendingAction, setPendingAction] = useState<"copy" | "download" | "bundle" | null>(null);
  const lineRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const lines = useMemo(() => script.split("\n"), [script]);

  const sections = useMemo<SectionMarker[]>(() => {
    const found: SectionMarker[] = [];
    lines.forEach((line, idx) => {
      const match = line.match(/^#\s*(\d+\.\s+.+)$/);
      if (match) {
        found.push({ lineIndex: idx, label: match[1].trim() });
      }
    });
    return found;
  }, [lines]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const matchCount = useMemo(() => {
    if (!normalizedQuery) return 0;
    return lines.reduce((acc, line) => acc + (line.toLowerCase().includes(normalizedQuery) ? 1 : 0), 0);
  }, [lines, normalizedQuery]);

  const executeCopy = async () => {
    const ok = await copyTextToClipboard(script);
    setCopyStatus(ok ? "copied" : "error");
    setTimeout(() => setCopyStatus("idle"), 2500);
  };

  const executeDownload = () => {
    const blob = new Blob([script], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const requiresExportConfirm = errorCount > 0 || hasUnsavedDraft;

  const handleCopy = () => {
    if (requiresExportConfirm) {
      setPendingAction("copy");
      return;
    }
    void executeCopy();
  };

  const handleDownload = () => {
    if (requiresExportConfirm) {
      setPendingAction("download");
      return;
    }
    executeDownload();
  };

  const handleBundle = () => {
    if (!onDownloadBundle) return;
    if (requiresExportConfirm) {
      setPendingAction("bundle");
      return;
    }
    onDownloadBundle();
  };

  const handleConfirmPending = () => {
    const act = pendingAction;
    setPendingAction(null);
    if (act === "copy") {
      void executeCopy();
    } else if (act === "download") {
      executeDownload();
    } else if (act === "bundle") {
      onDownloadBundle?.();
    }
  };

  const handleJumpToSection = (lineIdxStr: string) => {
    if (!lineIdxStr) return;
    const idx = parseInt(lineIdxStr, 10);
    const el = lineRefs.current[idx];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <section
      id="script-viewer-panel"
      aria-label={isAr ? "معاينة السكربت المولد" : "Generated RouterOS Script"}
      className="lg:col-span-6 flex flex-col bg-slate-950 border border-slate-800 rounded-2xl shadow-xl overflow-hidden h-[520px] sm:h-[600px] lg:h-[calc(100dvh-5.5rem)] lg:sticky lg:top-[4.5rem]"
    >
      {/* Editor Header */}
      <div className="border-b border-slate-800 bg-slate-900/70 px-4 py-3 flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-mono text-slate-200 font-semibold truncate" dir="ltr">
            {filename}
          </span>
          <span className="text-[11px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700">
            {lines.length} {isAr ? "سطر" : "lines"}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCopy}
            type="button"
            className="min-h-[44px] sm:min-h-[38px] flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs rounded-lg transition font-medium border border-slate-600"
          >
            {copyStatus === "copied" ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-300" aria-hidden="true" />
            )}
            <span>
              {copyStatus === "copied"
                ? (isAr ? "تم النسخ!" : "Copied!")
                : copyStatus === "error"
                  ? (isAr ? "فشل النسخ (استخدم التحميل)" : "Copy failed")
                  : (isAr ? "نسخ السكربت" : "Copy Script")}
            </span>
          </button>

          <button
            onClick={handleDownload}
            type="button"
            className="min-h-[44px] sm:min-h-[38px] flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs rounded-lg transition font-medium border border-slate-600"
          >
            <Download className="w-3.5 h-3.5 text-slate-300" aria-hidden="true" />
            <span>{isAr ? "تحميل ملف .rsc" : "Download RSC"}</span>
          </button>

          {onDownloadBundle && (
            <button
              onClick={handleBundle}
              type="button"
              title={isAr ? "تحميل حزمة نشر ZIP تضم السكربت وصفحة login.html" : "Download ZIP bundle (.rsc + login.html + guide)"}
              className="min-h-[44px] sm:min-h-[38px] flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs rounded-lg transition font-bold"
            >
              <Archive className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isAr ? "حزمة ZIP" : "ZIP Bundle"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Search, Section Jump & Wrap Bar */}
      <div className="border-b border-slate-800/80 bg-slate-900/40 px-3 py-2 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute start-3 pointer-events-none" aria-hidden="true" />
          <input
            id="script-search-input"
            name="scriptSearch"
            type="text"
            aria-label={isAr ? "بحث داخل السكربت" : "Search inside script"}
            placeholder={isAr ? "ابحث في الأوامر (مثل radius)..." : "Search commands (e.g. radius)..."}
            className="w-full min-h-[44px] sm:min-h-[36px] bg-slate-950 border border-slate-600 text-slate-100 rounded-lg ps-8 pe-16 py-1.5 text-xs font-mono"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <div className="absolute end-1.5 flex items-center gap-1">
              <span className="text-[11px] font-mono text-emerald-300">
                {matchCount}
              </span>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label={isAr ? "مسح البحث" : "Clear search"}
                className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] inline-flex items-center justify-center text-slate-400 hover:text-slate-100 rounded"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <select
            id="script-section-jump"
            name="scriptSectionJump"
            aria-label={isAr ? "الانتقال إلى قسم" : "Jump to script section"}
            defaultValue=""
            onChange={(e) => {
              handleJumpToSection(e.target.value);
              e.target.value = "";
            }}
            className="flex-1 min-w-0 w-full truncate min-h-[44px] sm:min-h-[36px] bg-slate-950 border border-slate-600 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs sm:max-w-[200px]"
          >
            <option value="" disabled>
              {isAr ? "الانتقال إلى قسم..." : "Jump to section..."}
            </option>
            {sections.map((sec) => (
              <option key={sec.lineIndex} value={sec.lineIndex}>
                {sec.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setWrapLines((prev) => !prev)}
            aria-pressed={wrapLines}
            title={isAr ? "تبديل التفاف الأسطر الطويلة" : "Toggle line wrapping"}
            className={`min-h-[44px] sm:min-h-[36px] px-2.5 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition flex-shrink-0 ${
              wrapLines
                ? "bg-emerald-950/70 border-emerald-600 text-emerald-300"
                : "bg-slate-950 border-slate-600 text-slate-300 hover:text-white"
            }`}
          >
            <WrapText className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{isAr ? "التفاف" : "Wrap"}</span>
          </button>
        </div>
      </div>

      {/* Script Content Viewer */}
      <div className="flex-1 p-3 md:p-4 overflow-auto bg-slate-950 font-mono" dir="ltr">
        <div className={wrapLines ? "space-y-0.5" : "space-y-0.5 min-w-max"}>
          {lines.map((line, idx) => {
            const trimmed = line.trim();
            let className = "text-slate-200";
            if (trimmed.startsWith("#")) {
              className = "text-slate-400 italic";
            } else if (trimmed.startsWith("/")) {
              className = "text-emerald-400 font-semibold";
            } else if (trimmed.startsWith("add ") || trimmed.startsWith("set ")) {
              className = "text-sky-400";
            } else if (trimmed.startsWith(":")) {
              className = "text-amber-300";
            }

            const isMatch = normalizedQuery ? line.toLowerCase().includes(normalizedQuery) : false;

            return (
              <div
                key={idx}
                ref={(el) => {
                  lineRefs.current[idx] = el;
                }}
                className={`flex items-start gap-3 px-1.5 py-0.5 rounded font-mono text-xs leading-relaxed min-h-[1.25rem] ${
                  isMatch ? "bg-emerald-950/70 ring-1 ring-emerald-500/40" : ""
                }`}
              >
                <span className="select-none text-slate-400 w-7 text-end flex-shrink-0 text-[11px] opacity-80">
                  {idx + 1}
                </span>
                <span className={`${className} ${wrapLines ? "whitespace-pre-wrap break-words" : "whitespace-pre"} flex-1`}>
                  {line}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Editor Footer / Info */}
      <div className="border-t border-slate-800 bg-slate-900/40 px-4 py-2.5 flex items-center gap-2 text-slate-400 text-xs">
        <Info className="w-4 h-4 text-slate-300 flex-shrink-0" aria-hidden="true" />
        <span>
          {isAr
            ? "انسخ هذا السكربت بالكامل وألصقه داخل New Terminal في برنامج Winbox أو استورده كملف .rsc."
            : "Copy the output and paste it into Winbox New Terminal, or import it as an .rsc file."}
        </span>
      </div>

      <ConfirmDialog
        open={pendingAction !== null}
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
        onConfirm={handleConfirmPending}
        onCancel={() => setPendingAction(null)}
      />
    </section>
  );
});

export default ScriptViewer;
