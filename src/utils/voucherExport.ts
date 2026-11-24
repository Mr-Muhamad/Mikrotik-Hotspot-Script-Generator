/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import type { HotspotConfig, HotspotUserProfile } from "../types";
import { generateCryptoVoucherCodes } from "../constants/defaults.ts";
import { sanitizeRosIdentifier } from "./scriptGenerator.ts";
import { escapeHtml, getPortalThemeColors } from "./htmlTemplateGenerator.ts";

export interface VoucherBatchSummary {
  fullCodes: string[];
  profileName: string;
  planLabel: string;
  validityLabel: string;
  quotaLabel: string;
  priceLabel: string;
  portalUrl: string;
  networkTitle: string;
}

function clampVoucherInt(val: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(val)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(val)));
}

function formatDataLimitMb(mb: number): string {
  if (!Number.isFinite(mb) || mb <= 0) return "Unlimited";
  if (mb >= 1024) {
    const gb = mb / 1024;
    return `${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB`;
  }
  return `${Math.round(mb)} MB`;
}

function escapeCsvCell(value: string): string {
  const str = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  if (/[",\r\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function resolveVoucherBatchSummary(
  config: HotspotConfig,
  hotspotProfiles: HotspotUserProfile[]
): VoucherBatchSummary {
  const voucherCount = clampVoucherInt(config.voucherCount, 1, 500, 20);
  const voucherLen = clampVoucherInt(config.voucherLength || 4, 3, 32, 4);
  const safePrefix = sanitizeRosIdentifier(config.voucherPrefix || "", "");

  const precomputed = (config.voucherCodes || []).filter(
    (c) => typeof c === "string" && c.length === voucherLen && /^[0-9a-z]+$/i.test(c)
  );
  const suffixes =
    precomputed.length === voucherCount
      ? precomputed
      : generateCryptoVoucherCodes(voucherCount, voucherLen);

  const fullCodes = suffixes.map((s) => `${safePrefix}${s}`);

  const effectiveAuthMode =
    config.authMode || (config.enableUserManager ? "userman_radius" : "hotspot_only");
  const voucherTarget =
    effectiveAuthMode === "hotspot_only"
      ? "hotspot"
      : effectiveAuthMode === "userman_radius"
        ? "userman"
        : config.voucherTarget === "hotspot"
          ? "hotspot"
          : "userman";

  const umProfiles = config.umProfiles || [];
  const umLimitations = config.umLimitations || [];

  let profileName = (config.voucherSelectedProfile || "").trim();
  let planLabel = profileName || "Default Plan";
  let validityLabel = "Unlimited";
  let quotaLabel = "Unlimited";
  let priceLabel = "N/A";

  if (voucherTarget === "userman") {
    const matchedUm =
      umProfiles.find((p) => p.name === profileName) || umProfiles[0];
    if (!profileName) {
      profileName = matchedUm?.name || "default";
    }
    planLabel = matchedUm?.nameForUsers || matchedUm?.name || profileName;
    validityLabel = matchedUm?.validity?.trim() || "unlimited";
    priceLabel =
      typeof matchedUm?.price === "number" && Number.isFinite(matchedUm.price)
        ? String(matchedUm.price)
        : "0";

    const limById = new Map(umLimitations.map((l) => [l.id, l]));
    const boundLimits = (matchedUm?.limitations || [])
      .map((b) => limById.get(b.limitationId))
      .filter((l): l is NonNullable<typeof l> => Boolean(l));

    let maxTransferMb = 0;
    let maxDlMb = 0;
    let maxUlMb = 0;
    for (const lim of boundLimits) {
      if ((lim.transferLimitMb || 0) > maxTransferMb) maxTransferMb = lim.transferLimitMb || 0;
      if ((lim.downloadLimitMb || 0) > maxDlMb) maxDlMb = lim.downloadLimitMb || 0;
      if ((lim.uploadLimitMb || 0) > maxUlMb) maxUlMb = lim.uploadLimitMb || 0;
    }
    if (maxTransferMb > 0) {
      quotaLabel = formatDataLimitMb(maxTransferMb);
    } else if (maxDlMb > 0 || maxUlMb > 0) {
      const parts: string[] = [];
      if (maxDlMb > 0) parts.push(`DL ${formatDataLimitMb(maxDlMb)}`);
      if (maxUlMb > 0) parts.push(`UL ${formatDataLimitMb(maxUlMb)}`);
      quotaLabel = parts.join(" / ");
    }
  } else {
    const matchedHs =
      hotspotProfiles.find((p) => p.name === profileName) || hotspotProfiles[0];
    if (!profileName) {
      profileName = matchedHs?.name || "default";
    }
    planLabel = matchedHs?.displayName || matchedHs?.name || profileName;

    const rawUptime = (config.voucherLocalLimitUptime || "").trim();
    if (rawUptime && rawUptime !== "0s" && rawUptime !== "00:00:00") {
      validityLabel = rawUptime;
    } else if (matchedHs?.localValidity?.trim()) {
      validityLabel = matchedHs.localValidity.trim();
    } else if (
      matchedHs?.sessionTimeout?.trim() &&
      matchedHs.sessionTimeout.trim() !== "00:00:00"
    ) {
      validityLabel = matchedHs.sessionTimeout.trim();
    }

    if (config.voucherLocalLimitBytesMb && config.voucherLocalLimitBytesMb > 0) {
      quotaLabel = formatDataLimitMb(config.voucherLocalLimitBytesMb);
    }
  }

  const cleanDns = (config.dnsName || "hotspot.local").trim() || "hotspot.local";
  const portalUrl = `http://${cleanDns}`;
  const networkTitle =
    (config.loginTitle || config.routerIdentity || "WiFi Hotspot").trim() || "WiFi Hotspot";

  return {
    fullCodes,
    profileName,
    planLabel,
    validityLabel,
    quotaLabel,
    priceLabel,
    portalUrl,
    networkTitle,
  };
}

export function generateVouchersCsv(
  config: HotspotConfig,
  hotspotProfiles: HotspotUserProfile[]
): string {
  const summary = resolveVoucherBatchSummary(config, hotspotProfiles);
  const header = "Code,Username,Password,Profile,Plan,Validity,Quota,Price,Portal";
  const rows = summary.fullCodes.map((code) =>
    [
      code,
      code,
      code,
      summary.profileName,
      summary.planLabel,
      summary.validityLabel,
      summary.quotaLabel,
      summary.priceLabel,
      summary.portalUrl,
    ]
      .map(escapeCsvCell)
      .join(",")
  );

  return `\uFEFF${[header, ...rows].join("\r\n")}\r\n`;
}

export function generatePrintableVouchersHtml(
  config: HotspotConfig,
  hotspotProfiles: HotspotUserProfile[],
  lang: "ar" | "en" = "ar"
): string {
  const isAr = lang === "ar";
  const summary = resolveVoucherBatchSummary(config, hotspotProfiles);
  const colors = getPortalThemeColors(config.loginTheme);

  const safeTitle = escapeHtml(summary.networkTitle);
  const safeProfile = escapeHtml(summary.profileName);
  const safePlan = escapeHtml(summary.planLabel);
  const safeValidity = escapeHtml(summary.validityLabel);
  const safeQuota = escapeHtml(summary.quotaLabel);
  const safePrice = escapeHtml(summary.priceLabel);
  const safePortal = escapeHtml(summary.portalUrl);

  const labels = isAr
    ? {
        docTitle: "طباعة كروت الهوتسبوت",
        toolbarTitle: "بطاقات كروت الهوتسبوت الجاهزة للطباعة",
        cardsCount: `عدد الكروت: ${summary.fullCodes.length}`,
        printBtn: "طباعة الكروت (Print)",
        codeLabel: "كود الدخول",
        planLabel: "الباقة",
        validityLabel: "الصلاحية",
        quotaLabel: "الرصيد",
        priceLabel: "السعر",
        portalLabel: "رابط الدخول",
      }
    : {
        docTitle: "Printable Hotspot Vouchers",
        toolbarTitle: "Printable Hotspot Voucher Cards",
        cardsCount: `Total Cards: ${summary.fullCodes.length}`,
        printBtn: "Print Cards",
        codeLabel: "Voucher Code",
        planLabel: "Plan",
        validityLabel: "Validity",
        quotaLabel: "Quota",
        priceLabel: "Price",
        portalLabel: "Login Portal",
      };

  const cardsHtml = summary.fullCodes
    .map(
      (code, index) => `      <article class="voucher-card">
        <div class="card-header">
          <span class="network-name">${safeTitle}</span>
          <span class="card-index">#${index + 1}</span>
        </div>
        <div class="code-box">
          <div class="code-caption">${labels.codeLabel}</div>
          <div class="voucher-code" dir="ltr">${escapeHtml(code)}</div>
        </div>
        <div class="details-grid">
          <div class="detail-item">
            <span class="detail-label">${labels.planLabel}:</span>
            <span class="detail-value">${safePlan}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">${labels.validityLabel}:</span>
            <span class="detail-value" dir="ltr">${safeValidity}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">${labels.quotaLabel}:</span>
            <span class="detail-value" dir="ltr">${safeQuota}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">${labels.priceLabel}:</span>
            <span class="detail-value" dir="ltr">${safePrice}</span>
          </div>
        </div>
        <div class="card-footer">
          <span class="portal-label">${labels.portalLabel}:</span>
          <span class="portal-url" dir="ltr">${safePortal}</span>
        </div>
      </article>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${isAr ? "rtl" : "ltr"}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${labels.docTitle} | ${safeTitle}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    body {
      background: #f1f5f9;
      color: #0f172a;
      padding: 20px;
    }

    .toolbar {
      max-width: 1100px;
      margin: 0 auto 20px auto;
      background: #0f172a;
      color: #f8fafc;
      padding: 14px 18px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      box-shadow: 0 10px 25px -10px rgba(15, 23, 42, 0.4);
    }

    .toolbar-info h1 {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .toolbar-meta {
      font-size: 12px;
      color: #94a3b8;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .print-btn {
      background: ${colors.accentColor};
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 10px 18px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s;
    }

    .print-btn:hover {
      background: ${colors.accentHover};
    }

    .cards-grid {
      max-width: 1100px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    .voucher-card {
      background: #ffffff;
      border: 1.5px dashed #94a3b8;
      border-radius: 10px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding-bottom: 6px;
      border-bottom: 2px solid ${colors.accentColor};
    }

    .network-name {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .card-index {
      font-size: 10px;
      font-weight: 600;
      color: #64748b;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    .code-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 8px;
      text-align: center;
    }

    .code-caption {
      font-size: 10px;
      color: #64748b;
      margin-bottom: 3px;
      font-weight: 600;
    }

    .voucher-code {
      font-size: 17px;
      font-weight: 800;
      letter-spacing: 0.06em;
      color: #0f172a;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      word-break: break-all;
    }

    .details-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 4px 8px;
      font-size: 11px;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 4px;
      overflow: hidden;
    }

    .detail-label {
      color: #64748b;
      flex-shrink: 0;
    }

    .detail-value {
      color: #0f172a;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .card-footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
      font-size: 10px;
      color: #475569;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }

    .portal-url {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 600;
      color: #0f172a;
    }

    @media (max-width: 900px) {
      .cards-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 560px) {
      .cards-grid {
        grid-template-columns: 1fr;
      }
    }

    @media print {
      @page {
        size: A4 portrait;
        margin: 10mm;
      }

      body {
        background: #ffffff;
        padding: 0;
      }

      .no-print {
        display: none !important;
      }

      .cards-grid {
        max-width: none;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }

      .voucher-card {
        border: 1px dashed #64748b;
        padding: 10px;
      }
    }
  </style>
</head>
<body>
  <header class="toolbar no-print">
    <div class="toolbar-info">
      <h1>${labels.toolbarTitle} - ${safeTitle}</h1>
      <div class="toolbar-meta">
        <span>${labels.cardsCount}</span>
        <span>${labels.planLabel}: ${safeProfile} (${safePlan})</span>
      </div>
    </div>
    <button type="button" class="print-btn" onclick="window.print()">${labels.printBtn}</button>
  </header>

  <main class="cards-grid">
${cardsHtml}
  </main>
</body>
</html>`;
}
