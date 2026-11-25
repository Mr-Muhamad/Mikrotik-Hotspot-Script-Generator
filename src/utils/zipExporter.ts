/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import type { HotspotConfig } from "../types";

export interface ZipEntry {
  path: string;
  content: string | Uint8Array;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function getDosTimestamp(date: Date): { dosTime: number; dosDate: number } {
  const year = Math.max(1980, date.getFullYear());
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);
  return {
    dosTime: ((hours & 0x1f) << 11) | ((minutes & 0x3f) << 5) | (seconds & 0x1f),
    dosDate: (((year - 1980) & 0x7f) << 9) | ((month & 0x0f) << 5) | (day & 0x1f),
  };
}

/**
 * Builds a standard ZIP archive (Store method 0 with UTF-8 filenames and IEEE CRC-32)
 * without requiring third-party runtime dependencies.
 */
export function createZipBytes(entries: ZipEntry[], now = new Date()): Uint8Array {
  const encoder = new TextEncoder();
  const { dosTime, dosDate } = getDosTimestamp(now);

  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const cleanPath = entry.path.replace(/^\/+/, "").replace(/\\/g, "/");
    const nameBytes = encoder.encode(cleanPath);
    const dataBytes =
      typeof entry.content === "string" ? encoder.encode(entry.content) : entry.content;
    const checksum = crc32(dataBytes);
    const size = dataBytes.length;

    // Local File Header (30 bytes + filename)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);       // Version needed to extract (2.0)
    lv.setUint16(6, 0x0800, true);   // General purpose flag: UTF-8 filename
    lv.setUint16(8, 0, true);        // Compression method: 0 (Store)
    lv.setUint16(10, dosTime, true);
    lv.setUint16(12, dosDate, true);
    lv.setUint32(14, checksum, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);       // Extra field length
    localHeader.set(nameBytes, 30);

    // Central Directory Header (46 bytes + filename)
    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);       // Version made by
    cv.setUint16(6, 20, true);       // Version needed
    cv.setUint16(8, 0x0800, true);   // UTF-8 filename
    cv.setUint16(10, 0, true);       // Store
    cv.setUint16(12, dosTime, true);
    cv.setUint16(14, dosDate, true);
    cv.setUint32(16, checksum, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);

    localParts.push(localHeader, dataBytes);
    centralParts.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  }

  const centralSize = centralParts.reduce((sum, p) => sum + p.length, 0);

  // End of Central Directory Record (22 bytes)
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const totalSize = offset + centralSize + eocd.length;
  const output = new Uint8Array(totalSize);
  let cursor = 0;

  for (const part of localParts) {
    output.set(part, cursor);
    cursor += part.length;
  }
  for (const part of centralParts) {
    output.set(part, cursor);
    cursor += part.length;
  }
  output.set(eocd, cursor);

  return output;
}

export function createZipBlob(entries: ZipEntry[]): Blob {
  const bytes = createZipBytes(entries);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy.buffer], { type: "application/zip" });
}

/**
 * Returns a deep-cloned configuration with sensitive credentials removed
 * so the JSON backup can be safely shared.
 */
export function stripConfigSecrets(config: HotspotConfig): HotspotConfig {
  const cloned = structuredClone(config);
  cloned.singleWanPppoePass = "";
  cloned.radiusSecret = "";
  cloned.usermanAdminPass = "";
  cloned.wanLines = (cloned.wanLines || []).map((l) => ({
    ...l,
    pppoePass: "",
  }));
  return cloned;
}

export function buildDeploymentReadme(
  config: HotspotConfig,
  scriptFilename: string,
  lang: "ar" | "en" = "en"
): string {
  const isV7 = config.rosVersion === "v7";
  const htmlFolder = config.storageMode === "flash" ? "flash/hotspot" : (config.htmlDirectory || "hotspot");
  const authMode = config.authMode || (config.enableUserManager ? "userman_radius" : "hotspot_only");
  const useRadius = authMode !== "hotspot_only";
  const portalUrl = `http://${config.dnsName || "hotspot.local"}/login.html`;

  const verifyUmCmds = useRadius
    ? isV7
      ? [
          "   /radius print",
          "   /radius incoming print",
          "   /user-manager print",
          "   /user-manager router print",
          "   /user-manager user group print",
          "   /user-manager limitation print",
        ]
      : [
          "   /radius print",
          "   /radius incoming print",
          "   /tool user-manager customer print",
          "   /tool user-manager router print",
          "   /tool user-manager profile limitation print",
        ]
    : ["   /ip hotspot user profile print", "   /ip hotspot user print"];

  if (lang === "ar") {
    const umNoteAr =
      authMode === "hotspot_only"
        ? "نمط المشتركين    : هوتسبوت محلي فقط (/ip hotspot user)"
        : isV7
          ? `نمط المشتركين    : ${authMode} (User Manager v7 في Winbox/WebFig؛ البوابة: http://${config.gatewayIp}/um)`
          : `نمط المشتركين    : ${authMode} (بوابة User Manager v6: http://${config.gatewayIp}/userman)`;

    const wanNoteAr =
      config.loadBalancingMethod !== "none" && (config.wanLines?.length || 0) > 0
        ? `تعدد الخطوط (${config.loadBalancingMethod.toUpperCase()}، ${config.wanLines.length} خطوط)`
        : `خط واحد (${config.singleWanType || "dhcp"} على ${config.wanInterface})`;

    return [
      "======================================================================",
      `حزمة نشر ميكروتيك هوتسبوت (${config.rosVersion.toUpperCase()})`,
      "======================================================================",
      `هوية الراوتر      : ${config.routerIdentity || "MikroTik-Hotspot"}`,
      `خادم الهوتسبوت    : ${config.serverName || "hotspot1"} (${config.gatewayIp}/${config.subnetMask})`,
      `إعدادات الإنترنت  : ${wanNoteAr}`,
      `مجلد صفحة الدخول  : ${htmlFolder}`,
      umNoteAr,
      `الحزم المطلوبة    : system, hotspot${useRadius ? ", user-manager (extra package)" : ""}`,
      "",
      "1) إجراءات السلامة والنسخ الاحتياطي قبل التنفيذ (في Winbox New Terminal):",
      "   - اتصل عبر عنوان MAC في Winbox واضغط Ctrl+X لتفعيل الوضع الآمن (Safe Mode).",
      "   - خذ نسخة احتياطية كاملة قبل استيراد السكربت:",
      "     /system backup save name=before-hotspot",
      "     /export file=before-hotspot",
      "   - تحقق من الحزم المثبتة (/system package print) وأسماء المنافذ (/interface ethernet print).",
      "",
      "2) استيراد السكربت الرئيسي في Winbox:",
      `   - اسحب الملف '${scriptFilename}' إلى نافذة Winbox -> Files`,
      `   - افتح New Terminal ونفذ الأمر: /import file-name=${scriptFilename} verbose=yes`,
      "",
      "3) رفع حزمة بوابة الدخول الكاملة (5 ملفات) بعد استيراد السكربت:",
      "   - مهم: استورد ملف .rsc أولا حتى يقوم RouterOS بإنشاء مجلد الهوتسبوت والملفات الافتراضية المرافقة (مثل errors.txt).",
      `   - بعد انتهاء الاستيراد، ارفع كامل مجلد البوابة '${htmlFolder}' إلى Winbox -> Files لاستبدال الملفات الخمسة المصممة:`,
      `     * ${htmlFolder}/login.html`,
      `     * ${htmlFolder}/status.html`,
      `     * ${htmlFolder}/logout.html`,
      `     * ${htmlFolder}/alogin.html`,
      `     * ${htmlFolder}/md5.js`,
      `   - رابط البوابة: ${portalUrl}`,
      "",
      "4) أوامر التحقق بعد التثبيت:",
      "   /ip hotspot print",
      "   /ip hotspot profile print",
      ...verifyUmCmds,
      '   /ip firewall filter print stats where comment~"FastTrack"',
      '   /log print where topics~"hotspot|radius"',
      "",
      "5) تذكيرات سريعة لحل المشاكل:",
      "   - تجاهل حدود السرعة؟ تأكد أن قواعد استثناء FastTrack تأتي قبل قاعدة fastrack-connection.",
      "   - تعذر فصل المشترك عند انتهاء الكوتا؟ تحقق من منفذ RADIUS CoA (3799) وتفعيل radius incoming accept=yes.",
      "   - اختفاء صفحة الدخول بعد إعادة التشغيل؟ الراوترات ذات ذاكرة Flash يجب أن تستخدم flash/hotspot.",
      "   - بعد التحقق من عمل الشبكة، اخرج من Safe Mode (Ctrl+X) واحفظ نسخة نهائية: /system backup save name=after-hotspot.",
      "======================================================================",
      "",
    ].join("\r\n");
  }

  const umNote =
    authMode === "hotspot_only"
      ? "Subscriber Mode  : Hotspot Local Only (/ip hotspot user)"
      : isV7
        ? `Subscriber Mode  : ${authMode} (User Manager v7 in Winbox/WebFig; portal at http://${config.gatewayIp}/um)`
        : `Subscriber Mode  : ${authMode} (User Manager v6 portal at http://${config.gatewayIp}/userman)`;

  const wanNote =
    config.loadBalancingMethod !== "none" && (config.wanLines?.length || 0) > 0
      ? `Multi-WAN (${config.loadBalancingMethod.toUpperCase()}, ${config.wanLines.length} lines)`
      : `Single WAN (${config.singleWanType || "dhcp"} on ${config.wanInterface})`;

  return [
    "======================================================================",
    `MikroTik Deployment Bundle (${config.rosVersion.toUpperCase()})`,
    "======================================================================",
    `Router Identity  : ${config.routerIdentity || "MikroTik-Hotspot"}`,
    `Hotspot Server   : ${config.serverName || "hotspot1"} (${config.gatewayIp}/${config.subnetMask})`,
    `WAN Configuration: ${wanNote}`,
    `HTML Directory   : ${htmlFolder}`,
    umNote,
    `Required Packages: system, hotspot${useRadius ? ", user-manager (extra package)" : ""}`,
    "",
    "1) Pre-flight Safety & Backup (Recommended in Winbox New Terminal):",
    "   - Connect via Winbox MAC Address and press Ctrl+X to enable Safe Mode.",
    "   - Take a rollback backup before importing:",
    "     /system backup save name=before-hotspot",
    "     /export file=before-hotspot",
    "   - Check installed packages (/system package print) and interface names (/interface ethernet print).",
    "",
    "2) Import Master Script in Winbox:",
    `   - Drag '${scriptFilename}' into Winbox -> Files`,
    `   - Open New Terminal and run: /import file-name=${scriptFilename} verbose=yes`,
    "",
    "3) Deploy Full 5-File Captive Portal Suite (AFTER Importing .rsc):",
    "   - Important: Import the .rsc script FIRST so RouterOS creates the hotspot folder and default companion files (such as errors.txt).",
    `   - Next, upload the entire '${htmlFolder}' portal folder into Winbox -> Files to overwrite the styled 5-file portal suite:`,
    `     * ${htmlFolder}/login.html`,
    `     * ${htmlFolder}/status.html`,
    `     * ${htmlFolder}/logout.html`,
    `     * ${htmlFolder}/alogin.html`,
    `     * ${htmlFolder}/md5.js`,
    `   - Portal URL: ${portalUrl}`,
    "",
    "4) Post-Install Verification Commands:",
    "   /ip hotspot print",
    "   /ip hotspot profile print",
    ...verifyUmCmds,
    "   /ip firewall filter print stats where comment~\"FastTrack\"",
    "   /log print where topics~\"hotspot|radius\"",
    "",
    "5) Quick Troubleshooting Reminders:",
    "   - Speed limits ignored? Ensure FastTrack bypass rules sit BEFORE any fastrack-connection rule.",
    "   - Quota disconnect fails? Verify RADIUS CoA port (3799) and radius incoming accept=yes.",
    "   - Portal resets after reboot? Flash-based RouterBoards must use flash/hotspot.",
    "   - Exit Safe Mode (Ctrl+X) once verified, then save /system backup save name=after-hotspot.",
    "======================================================================",
    "",
  ].join("\r\n");
}
