/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import { useState } from "react";
import {
  Activity,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Copy,
  Cpu,
  HelpCircle,
  Info,
  Layers,
  ShieldAlert,
  Terminal,
  Wrench,
} from "lucide-react";
import type { HotspotConfig } from "../types";
import { copyTextToClipboard } from "../utils/clipboard";
import { handleTabListKeyDown } from "../utils/tabKeyboard";

interface Props {
  config: HotspotConfig;
  scriptFilename: string;
  hotspotProfilesCount: number;
  lang: "ar" | "en";
}

type GuideSection = "steps" | "verify" | "troubleshoot" | "reference";

const GUIDE_SECTIONS: readonly GuideSection[] = ["steps", "verify", "troubleshoot", "reference"];

export default function InstructionGuide({
  config,
  scriptFilename,
  hotspotProfilesCount,
  lang,
}: Props) {
  const isAr = lang === "ar";
  const isV7 = config.rosVersion === "v7";
  const effectiveAuthMode = config.authMode || (config.enableUserManager ? "userman_radius" : "hotspot_only");
  const useRadius = effectiveAuthMode !== "hotspot_only";
  const htmlFolder = config.storageMode === "flash" ? "flash/hotspot" : (config.htmlDirectory || "hotspot");
  const isMultiWan = config.loadBalancingMethod !== "none" && (config.wanLines?.length || 0) > 0;
  const hasVlans = Boolean(config.enableVlans && config.vlans && config.vlans.length > 0);
  const lanTarget = config.useLanBridge ? (config.lanBridgeName || "bridge-lan") : (config.lanInterface || "ether2");

  const [section, setSection] = useState<GuideSection>("steps");
  const [activeFAQ, setActiveFAQ] = useState<number | null>(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    backup: false,
    packages: false,
    ifaces: false,
    safemode: false,
    ntp: false,
    flash: false,
  });

  const handleCopy = async (key: string, text: string) => {
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 2200);
    }
  };

  const toggleCheck = (key: string) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const checkedCount = Object.values(checklist).filter(Boolean).length;

  const renderCommandBox = (key: string, command: string, caption?: string) => {
    const isCopied = copiedKey === key;
    return (
      <div className="bg-slate-950/90 border border-slate-800 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-slate-800/80 bg-slate-900/60">
          <span className="text-[11px] text-slate-400 font-medium truncate">
            {caption || (isAr ? "أمر RouterOS" : "RouterOS CLI")}
          </span>
          <button
            type="button"
            onClick={() => handleCopy(key, command)}
            className="min-h-[36px] sm:min-h-[28px] px-2.5 py-1 inline-flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-medium transition flex-shrink-0"
          >
            {isCopied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-300" aria-hidden="true" />
            )}
            <span>{isCopied ? (isAr ? "تم النسخ" : "Copied") : (isAr ? "نسخ" : "Copy")}</span>
          </button>
        </div>
        <pre
          dir="ltr"
          className="p-3 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed whitespace-pre"
        >
          {command}
        </pre>
      </div>
    );
  };

  const modeSummaryLabel =
    effectiveAuthMode === "hotspot_only"
      ? (isAr ? "هوتسبوت محلي فقط" : "Hotspot Local Only")
      : effectiveAuthMode === "hybrid"
        ? (isAr ? "وضع هجين (Hotspot + UM)" : "Hybrid (Hotspot + UM)")
        : (isAr ? "يوزر مانجر RADIUS" : "User Manager (RADIUS)");

  const umManagementHint = !useRadius
    ? (isAr ? "Winbox -> IP -> Hotspot -> Users" : "Winbox -> IP -> Hotspot -> Users")
    : isV7
      ? `Winbox -> User Manager | http://${config.gatewayIp}/um`
      : `http://${config.gatewayIp}/userman`;

  const preflightItems = isAr
    ? [
        {
          id: "backup",
          title: "أخذ نسخة احتياطية كاملة + تصدير نصي قبل أي تعديل",
          detail: "احفظ نسخة ثنائية (.backup) وملف نصي (.rsc) حتى تتمكن من الرجوع للوضع السابق خلال ثوانٍ.",
          cmd: "/system backup save name=before-hotspot\n/export file=before-hotspot",
        },
        {
          id: "packages",
          title: useRadius ? "التحقق من تثبيت حزمة user-manager المطابقة للإصدار" : "التحقق من تثبيت حزمة hotspot",
          detail: useRadius
            ? `تأكد أن حزمة user-manager موجودة ومفعّلة وتطابق نفس رقم إصدار RouterOS (${config.rosVersion}) من extra-packages.`
            : "حزمة hotspot تأتي مدمجة في النظام الأساسي لمعظم الأجهزة، تأكد أنها غير معطلة.",
          cmd: "/system package print",
        },
        {
          id: "ifaces",
          title: "مطابقة أسماء منافذ الشبكة (Interfaces) على جهازك الفعلي",
          detail: `إعداداتك الحالية تستخدم WAN: ${config.wanInterface} وLAN: ${lanTarget}. تأكد أن نفس الأسماء موجودة أو قم بتعديلها قبل الاستيراد.`,
          cmd: "/interface ethernet print",
        },
        {
          id: "safemode",
          title: "الاتصال عبر عنوان MAC في Winbox وتفعيل Safe Mode (Ctrl+X)",
          detail: "الاتصال بـ MAC يمنع انقطاعك عند تغيير الـ IP أو Bridge، وSafe Mode يتراجع تلقائياً عن أي خطأ يفقد الاتصال.",
        },
        {
          id: "ntp",
          title: "ضبط الوقت والتاريخ (NTP) لصلاحية الكروت والجدولة",
          detail: "تعتمد صلاحيات اليوزر مانجر وجدولة النهار/الليل وكذلك انتهاء كروت on-login على دقة ساعة الراوتر.",
          cmd: "/system clock print\n/system ntp client print",
        },
        {
          id: "flash",
          title: `التحقق من نوع الذاكرة ومسار البوابة (${htmlFolder})`,
          detail:
            config.storageMode === "flash"
              ? "أنت على وضع flash/hotspot وهو الصحيح لأجهزة Flash الحديثة مثل hEX وhAP وRB4011 وRB5009 لكي لا تُمسح الصفحة عند الريستارت."
              : "أنت على وضع hotspot العادي (المناسب لراوترات CHR وx86 أو المجلد الجذري). إذا كان جهازك hAP/hEX/RB، حوّل التخزين إلى flash في تبويب صفحة الدخول.",
        },
      ]
    : [
        {
          id: "backup",
          title: "Take a full binary backup + readable text export first",
          detail: "Save both .backup and .rsc files before importing so you can roll back cleanly at any time.",
          cmd: "/system backup save name=before-hotspot\n/export file=before-hotspot",
        },
        {
          id: "packages",
          title: useRadius ? "Verify matching user-manager extra package is installed" : "Verify hotspot package is enabled",
          detail: useRadius
            ? `Confirm user-manager matches your exact RouterOS (${config.rosVersion}) version from MikroTik extra-packages.`
            : "Confirm the built-in hotspot package is active.",
          cmd: "/system package print",
        },
        {
          id: "ifaces",
          title: "Verify physical Ethernet interface names match your config",
          detail: `Current target uses WAN: ${config.wanInterface} and LAN: ${lanTarget}. Match real interface names before running.`,
          cmd: "/interface ethernet print",
        },
        {
          id: "safemode",
          title: "Connect via Winbox MAC Address & enable Safe Mode (Ctrl+X)",
          detail: "MAC connection prevents lockout during IP/bridge edits, and Safe Mode reverts automatically if you disconnect.",
        },
        {
          id: "ntp",
          title: "Ensure Router Clock & NTP sync are healthy",
          detail: "User Manager validity windows, Day/Night schedules, and on-login voucher expiry all depend on accurate router time.",
          cmd: "/system clock print\n/system ntp client print",
        },
        {
          id: "flash",
          title: `Confirm storage layout matches portal path (${htmlFolder})`,
          detail:
            config.storageMode === "flash"
              ? "Using flash/hotspot (recommended for hEX, hAP, RB4011, RB5009) so portal files survive reboots."
              : "Using root hotspot folder (CHR/x86/legacy). Switch to Flash Storage if deploying on modern Flash RouterBoards.",
        },
      ];

  const deploySteps = isAr
    ? [
        {
          title: "النسخ الاحتياطي وتفعيل Safe Mode",
          desc: "سجّل الدخول عبر Winbox بعنوان MAC، افتح New Terminal، واضغط Ctrl+X لتظهر كلمة Safe Mode في أعلى النافذة، ثم نفّذ أمر النسخ الاحتياطي.",
          cmd: "/system backup save name=before-hotspot\n/export file=before-hotspot",
        },
        {
          title: "تهيئة راوتر جديد (اختياري تماماً عند الحاجة فقط)",
          desc: "استخدم هذا الأمر فقط على راوتر اختباري أو جديد تريد مسح إعداداته الافتراضية بالكامل قبل بناء الشبكة من الصفر. لا تنفّذه على راوتر شغال!",
          cmd: "/system reset-configuration no-defaults=yes skip-backup=yes",
        },
        {
          title: `رفع وتنفيذ ملف ${scriptFilename} مع verbose=yes`,
          desc: "اسحب ملف .rsc إلى نافذة Files في Winbox ثم شغّل أمر الاستيراد أدناه (الخيار verbose=yes يعرض لك رقم السطر الدقيق لو حدث أي تعارض أو اسم كارت مختلف). كما يمكنك نسخ السكربت ولصقه مباشرة في New Terminal.",
          cmd: `/import file-name=${scriptFilename} verbose=yes`,
        },
        {
          title: `رفع صفحة الدخول إلى مسار ${htmlFolder}/login.html`,
          desc: "الأسهل: اضغط زر 'حزمة ZIP' لإنزال الحزمة جاهزة بالمجلد الصحيح، ثم فك الضغط واسحب مجلد الصفحة إلى Files في Winbox ليكون المسار الفعلي داخل الراوتر مطابقاً للـ HTML Directory.",
          cmd: `/ip hotspot profile print detail where name="hsprof1"`,
        },
        {
          title: "اختبار اتصال الراوتر نفسه بالإنترنت والـ DNS",
          desc: "قبل تجربة أي عميل، تأكد أن الراوتر يصل للإنترنت ويترجم الدومينات (خاصة عند استخدام Multi-WAN أو PPPOE).",
          cmd: "/ping 8.8.8.8 count=3\n/ping google.com count=3",
        },
        {
          title: "إنشاء وإدارة المشتركين أو الكروت",
          desc:
            effectiveAuthMode === "hotspot_only"
              ? "أنت على وضع الهوتسبوت المحلي فقط: أضف الكروت أو راقبها من Winbox -> IP -> Hotspot -> Users (وإذا فعّلت on-login سيُنشأ Scheduler تلقائي لكل كارت عند أول دخول)."
              : isV7
                ? `أنت على RouterOS v7 RADIUS: افتح User Manager من Winbox/WebFig لمراجعة الباقات والقيود أو أنشئ الكروت ضمن المجموعة المحددة، وبوابة المشتركين على http://${config.gatewayIp}/um.`
                : `أنت على RouterOS v6 RADIUS: افتح المتصفح على http://${config.gatewayIp}/userman وسجّل بحساب ${config.usermanAdminUser} لإدارة الكروت والطباعة والتقارير.`,
        },
        {
          title: "إنهاء Safe Mode وحفظ نسخة التشغيل المستقر",
          desc: "بعد التأكد من نجاح أوامر تبويب الفحص وعدم وجود أخطاء في السجل، اضغط Ctrl+X للخروج من Safe Mode وحفظ الإعدادات نهائياً، ثم خذ نسخة احتياطية جديدة.",
          cmd: "/system backup save name=after-hotspot",
        },
      ]
    : [
        {
          title: "Save Rollback Backup & Enable Safe Mode",
          desc: "Log in via Winbox MAC Address, open New Terminal, press Ctrl+X to enter Safe Mode, and save your rollback snapshot.",
          cmd: "/system backup save name=before-hotspot\n/export file=before-hotspot",
        },
        {
          title: "Clean Wipe on New/Lab Routers (Optional Caution)",
          desc: "Run this ONLY if starting from an empty router or lab VM. Never run on a live production router.",
          cmd: "/system reset-configuration no-defaults=yes skip-backup=yes",
        },
        {
          title: `Upload & Import ${scriptFilename} with verbose=yes`,
          desc: "Drag the downloaded .rsc file into Winbox -> Files and run /import with verbose=yes (so RouterOS prints the exact line if anything conflicts). Alternatively paste directly into New Terminal.",
          cmd: `/import file-name=${scriptFilename} verbose=yes`,
        },
        {
          title: `Upload login.html into ${htmlFolder}/`,
          desc: "Tip: Use the 'ZIP Bundle' button so login.html is already inside the exact folder path configured in your Hotspot profile, then drag that folder into Winbox -> Files.",
          cmd: `/ip hotspot profile print detail where name="hsprof1"`,
        },
        {
          title: "Verify Router WAN & DNS Reachability",
          desc: "Confirm the router itself reaches the internet and resolves DNS before testing client phones.",
          cmd: "/ping 8.8.8.8 count=3\n/ping google.com count=3",
        },
        {
          title: "Manage Subscribers & Vouchers",
          desc:
            effectiveAuthMode === "hotspot_only"
              ? "In Hotspot Local Only mode, manage accounts under IP -> Hotspot -> Users (profiles with on-login automatically schedule per-user expiry on first login)."
              : isV7
                ? `Manage User Manager v7 inside Winbox/WebFig -> User Manager (client portal at http://${config.gatewayIp}/um). Ensure vouchers belong to a group with outer-auths enabled.`
                : `Open http://${config.gatewayIp}/userman (login: ${config.usermanAdminUser}) to issue, print, and monitor User Manager v6 vouchers.`,
        },
        {
          title: "Commit Safe Mode & Take Clean Snapshot",
          desc: "After running Verification CLI checks cleanly, press Ctrl+X to exit Safe Mode and commit all rules, then take a clean post-install backup.",
          cmd: "/system backup save name=after-hotspot",
        },
      ];

  const umVerifyCmd = isV7
    ? [
        "/radius print",
        "/radius incoming print",
        "/user-manager print",
        "/user-manager router print",
        "/user-manager user group print",
        "/user-manager limitation print",
        "/user-manager profile-limitation print",
      ].join("\n")
    : [
        "/radius print",
        "/radius incoming print",
        "/tool user-manager customer print",
        "/tool user-manager router print",
        "/tool user-manager profile limitation print",
        "/tool user-manager profile profile-limitation print",
      ].join("\n");

  const verifyCards = isAr
    ? [
        {
          id: "v-sys",
          title: "فحص النظام والوقت والمنافذ (System & Interfaces)",
          expected: "تطابق الوقت والمنطقة الزمنية، وحالة running=true لكروت الشبكة والفيلان.",
          cmd: "/system resource print\n/system clock print\n/system ntp client print\n/interface print",
        },
        {
          id: "v-hs",
          title: "فحص سيرفر الهوتسبوت والبروفايلات",
          expected: "عدم وجود علامة X (disabled) أو I (invalid) بجانب الهوتسبوت، وأن use-radius يطابق وضعك.",
          cmd: "/ip hotspot print\n/ip hotspot profile print\n/ip hotspot user profile print detail",
        },
        ...(useRadius
          ? [
              {
                id: "v-um",
                title: `فحص الربط مع RADIUS وUser Manager (${config.rosVersion.toUpperCase()})`,
                expected: `CoA مفعّل على المنفذ ${config.coaPort || 3799}، وحالة الراوتر وShared Secret متطابقتين في /radius وUser Manager.`,
                cmd: umVerifyCmd,
              },
            ]
          : []),
        {
          id: "v-queue",
          title: "فحص طوابير السرعة وتجاوز FastTrack",
          expected: "زيادة عدّاد packets في قواعد Bypass FastTrack وتكوّن Queue ديناميكي لكل مشترك نشط.",
          cmd: `/queue simple print\n/ip firewall filter print stats where comment~"FastTrack"`,
        },
        ...(isMultiWan
          ? [
              {
                id: "v-wan",
                title: `فحص دمج الخطوط والمسارات (${config.loadBalancingMethod.toUpperCase()})`,
                expected: "ظهور علامات A S (Active Static) للمسارات وارتفاع عدّادات Mangle مع حركة العملاء.",
                cmd: "/ip route print\n/ip firewall mangle print stats",
              },
            ]
          : []),
        {
          id: "v-sec",
          title: "فحص القائمة البيضاء والجدار الناري والربط الثابت",
          expected: "رؤية دومينات Walled Garden ومراقبة عدم حظر حركة الهوتسبوت الطبيعية.",
          cmd: "/ip hotspot walled-garden print\n/ip hotspot walled-garden ip print\n/ip hotspot ip-binding print",
        },
        {
          id: "v-live",
          title: "مراقبة المشتركين المتصلين وسجل الأخطاء المباشر",
          expected: "ظهور سرعة أو استهلاك المتصلين في active وغياب أخطاء timeout أو authentication failed في السجل.",
          cmd: `/ip hotspot active print\n/ip hotspot cookie print\n/log print where topics~"hotspot|radius"`,
        },
      ]
    : [
        {
          id: "v-sys",
          title: "System Clock, NTP & Interfaces",
          expected: "Accurate clock/timezone and active interfaces without unexpected link downs.",
          cmd: "/system resource print\n/system clock print\n/system ntp client print\n/interface print",
        },
        {
          id: "v-hs",
          title: "Hotspot Servers & Profiles",
          expected: "No invalid (I) or disabled (X) flags on Hotspot servers, and use-radius matches your selected auth mode.",
          cmd: "/ip hotspot print\n/ip hotspot profile print\n/ip hotspot user profile print detail",
        },
        ...(useRadius
          ? [
              {
                id: "v-um",
                title: `RADIUS, CoA & User Manager (${config.rosVersion.toUpperCase()})`,
                expected: `Incoming CoA accepted on port ${config.coaPort || 3799}, matching shared secret between /radius and User Manager.`,
                cmd: umVerifyCmd,
              },
            ]
          : []),
        {
          id: "v-queue",
          title: "Simple Queues & FastTrack Bypass Counters",
          expected: "Increasing counters on FastTrack Bypass rules and dynamic hs-* queues created for logged-in clients.",
          cmd: `/queue simple print\n/ip firewall filter print stats where comment~"FastTrack"`,
        },
        ...(isMultiWan
          ? [
              {
                id: "v-wan",
                title: `Multi-WAN Routes & Mangle (${config.loadBalancingMethod.toUpperCase()})`,
                expected: "Active reachable routes (AS) and matching packet counters in Mangle prerouting/output chains.",
                cmd: "/ip route print\n/ip firewall mangle print stats",
              },
            ]
          : []),
        {
          id: "v-sec",
          title: "Walled Garden, IP Bindings & Security",
          expected: "Configured Walled Garden bypass entries and AP/camera bindings active without blocking portal traffic.",
          cmd: "/ip hotspot walled-garden print\n/ip hotspot walled-garden ip print\n/ip hotspot ip-binding print",
        },
        {
          id: "v-live",
          title: "Live Active Sessions & Hotspot/RADIUS Logs",
          expected: "Logged-in users present with active rate counters and zero RADIUS timeout warnings.",
          cmd: `/ip hotspot active print\n/ip hotspot cookie print\n/log print where topics~"hotspot|radius"`,
        },
      ];

  const troubleshootItems = isAr
    ? [
        {
          id: "tr-portal",
          symptom: "صفحة تسجيل الدخول (login.html) لا تظهر تلقائياً على الهواتف",
          cause: "تخزين الملفات خارج flash/ في أجهزة Flash، أو وجود DNS يدوي على الهاتف، أو قاعدة Redirect محجوبة.",
          fix: `تأكد من وجود login.html فعلياً داخل ${htmlFolder} في Files، وفعّل allow-remote-requests=yes في /ip dns مع استخدام http://${config.dnsName} للاختبار.`,
          cmd: `/file print where name~"login.html"\n/ip dns print`,
        },
        {
          id: "tr-speed",
          symptom: "المشترك يسجل دخول بنجاح لكن السرعة مفتوحة بلا تحديد",
          cause: "قواعد FastTrack في Firewall تسبق قواعد تجاوز الهوتسبوت فتتخطى Simple Queues، أو لا توجد Queue تطبّق rate-limit.",
          fix: "تأكد أن قاعدتي Bypass FastTrack (hotspot=from-client و hotspot=to-client) تسبقان أي قاعدة fasttrack-connection في /ip firewall filter.",
          cmd: `/ip firewall filter print\n/queue simple print`,
        },
        {
          id: "tr-radius",
          symptom: "رسالة خطأ RADIUS server is not responding عند الدخول",
          cause: "اختلاف كلمة السر shared-secret، أو في v7 لم يُفعّل /user-manager، أو في RADIUS ينقص src-address=127.0.0.1، أو جدار النار يمنع input.",
          fix: "طابق address وsecret في /radius مع User Manager router، وزد timeout إلى 3000ms عند ضغط الشبكة.",
          cmd: isV7
            ? `/radius print detail\n/user-manager print\n/user-manager router print`
            : `/radius print detail\n/tool user-manager router print`,
        },
        {
          id: "tr-coa",
          symptom: "الكارت ينتهي وقته أو الكوتا ولا يفصل عن المشترك فوراً",
          cause: "تعطيل RADIUS Accounting أو عدم تطابق منفذ CoA (3799 vs 1700) أو نسيان use-coa=yes في v6.",
          fix: "تحقق أن radius-accounting=yes في /ip hotspot profile، وأن /radius incoming accept=yes بنفس منفذ coa-port في User Manager.",
          cmd: isV7
            ? `/radius incoming print\n/user-manager router print\n/ip hotspot profile print detail`
            : `/radius incoming print\n/tool user-manager router print\n/ip hotspot profile print detail`,
        },
        {
          id: "tr-v7grp",
          symptom: "في RouterOS v7: اليوزر مانجر يرفض كروتاً صحيحة دون سبب ظاهر",
          cause: "ترك قائمة outer-auths فارغة داخل /user-manager user group، مما يمنع جميع طرق المصادقة (PAP/CHAP/MSCHAP2).",
          fix: "أضف outer-auths=pap,chap,mschap2 على المجموعة واربط الكروت بهذه المجموعة.",
          cmd: "/user-manager user group print detail\n/user-manager user print detail",
        },
        {
          id: "tr-pcc",
          symptom: "انقطاع تطبيقات البنوك أو واتساب مع دمج الخطوط (PCC)",
          cause: "استخدام مصنف both-addresses-and-ports الذي يغير خط الخروج لكل اتصال، أو نسيان تجاوز LOCAL_SUBNETS.",
          fix: "استخدم Sticky Connections (both-addresses) وتأكد من وجود قاعدة hotspot=!auth قبل قواعد التوجيه.",
          cmd: `/ip firewall mangle print where chain="prerouting"\n/ip firewall address-list print where list="LOCAL_SUBNETS"`,
        },
        {
          id: "tr-cookie",
          symptom: "يطلب الراوتر تسجيل الدخول كل عدة دقائق عند إغلاق شاشة الهاتف",
          cause: "إطفاء الواي فاي في الهاتف يقطع الاتصال قبل انتهاء idle-timeout، مع عدم تفعيل mac-cookie.",
          fix: "فعّل login-by=...,cookie,mac-cookie واجعل add-mac-cookie=yes في بروفايل الهوتسبوت مع mac-cookie-timeout=3d.",
          cmd: "/ip hotspot profile print\n/ip hotspot cookie print",
        },
        {
          id: "tr-onlogin",
          symptom: "صلاحية الكارت المحلي (on-login) لا تحذف الكارت في الموعد",
          cause: "اختلاف أو توقف ساعة الراوتر (NTP)، أو وجود خطأ برمجي داخل on-login.",
          fix: "افحص مهام الجدولة التي تبدأ بـ exp- للتأكد من توليدها عند أول دخول وتحقق من مزامنة الوقت.",
          cmd: `/system scheduler print where name~"^exp-"\n/system clock print`,
        },
      ]
    : [
        {
          id: "tr-portal",
          symptom: "Login portal (login.html) fails to auto-popup on client devices",
          cause: "Files stored outside flash/ on Flash RouterBoards, manual static DNS on phone, or missing directory path.",
          fix: `Confirm login.html sits inside ${htmlFolder} in Winbox -> Files, verify /ip dns allow-remote-requests=yes, and test http://${config.dnsName}.`,
          cmd: `/file print where name~"login.html"\n/ip dns print`,
        },
        {
          id: "tr-speed",
          symptom: "Clients authenticate cleanly but get full uncapped bandwidth",
          cause: "A FastTrack rule matches traffic before Hotspot bypass rules, skipping RouterOS Simple/CAKE Queues.",
          fix: "Verify both Bypass FastTrack forward rules sit BEFORE any action=fasttrack-connection rule.",
          cmd: `/ip firewall filter print\n/queue simple print`,
        },
        {
          id: "tr-radius",
          symptom: "'RADIUS server is not responding' on login attempt",
          cause: "Mismatched secret, RouterOS v7 User Manager not enabled, missing src-address=127.0.0.1, or firewall blocking localhost.",
          fix: "Match /radius address & secret with User Manager router entry, and keep timeout=3000ms.",
          cmd: isV7
            ? `/radius print detail\n/user-manager print\n/user-manager router print`
            : `/radius print detail\n/tool user-manager router print`,
        },
        {
          id: "tr-coa",
          symptom: "Clients stay online after their quota or time limit reaches zero",
          cause: "RADIUS Accounting disabled, CoA port mismatch (3799 vs 1700), or v6 use-coa=no.",
          fix: "Ensure radius-accounting=yes, /radius incoming accept=yes port=3799, and matching coa-port in User Manager router.",
          cmd: isV7
            ? `/radius incoming print\n/user-manager router print\n/ip hotspot profile print detail`
            : `/radius incoming print\n/tool user-manager router print\n/ip hotspot profile print detail`,
        },
        {
          id: "tr-v7grp",
          symptom: "RouterOS v7 User Manager rejects valid vouchers",
          cause: "The /user-manager user group has empty outer-auths, rejecting PAP/CHAP authentication.",
          fix: "Set outer-auths=pap,chap,mschap2 on the v7 group and assign users to that group.",
          cmd: "/user-manager user group print detail\n/user-manager user print detail",
        },
        {
          id: "tr-pcc",
          symptom: "Banking apps or sessions drop under PCC Multi-WAN",
          cause: "Using both-addresses-and-ports splits HTTPS/socket sessions across WANs or lacks LOCAL_SUBNETS bypass.",
          fix: "Enable Sticky Connections (both-addresses) and keep hotspot=!auth + LOCAL_SUBNETS bypass at the top of Mangle.",
          cmd: `/ip firewall mangle print where chain="prerouting"\n/ip firewall address-list print where list="LOCAL_SUBNETS"`,
        },
        {
          id: "tr-cookie",
          symptom: "Phones prompt for login repeatedly after screen sleep",
          cause: "Wi-Fi power-save disconnects exceed idle-timeout without mac-cookie enabled.",
          fix: "Enable mac-cookie in Hotspot Server Profile login-by and set add-mac-cookie=yes with mac-cookie-timeout=3d.",
          cmd: "/ip hotspot profile print\n/ip hotspot cookie print",
        },
        {
          id: "tr-onlogin",
          symptom: "Local Hotspot (on-login) voucher expiry does not trigger",
          cause: "Clock out of sync (NTP disabled) or profile missing on-login scheduler script.",
          fix: "Inspect exp-* schedulers created on first user login and confirm NTP clock sync.",
          cmd: `/system scheduler print where name~"^exp-"\n/system clock print`,
        },
      ];

  const comparisonRows = [
    {
      topicAr: "مسار أوامر اليوزر مانجر",
      topicEn: "User Manager CLI Path",
      v6: "/tool user-manager ...",
      v7: "/user-manager ... (set enabled=yes)",
    },
    {
      topicAr: "واجهة الإدارة وبوابة المشترك",
      topicEn: "Admin UI & Client Portal",
      v6: "http://<IP>/userman",
      v7: "Winbox/WebFig + http://<IP>/um",
    },
    {
      topicAr: "ربط الحساب / مجموعات المصادقة",
      topicEn: "Owner vs Auth User Group",
      v6: "customer (permissions=owner)",
      v7: "user group (outer-auths=pap,chap,...)",
    },
    {
      topicAr: "بداية احتساب الصلاحية",
      topicEn: "Validity Start Trigger",
      v6: "starts-at=logon | now",
      v7: "starts-when=first-auth | assigned",
    },
    {
      topicAr: "تصفير الكوتا الدوري (شهري/يومي)",
      topicEn: "Recurring Quota Reset",
      v6: "غير متاح مدمجاً (يحتاج Scheduler)",
      v7: "reset-counters-interval (monthly/weekly/daily)",
    },
    {
      topicAr: "معامل حد البيرست في Limitation",
      topicEn: "Limitation Burst Threshold CLI",
      v6: "rate-limit-burst-treshold-rx/tx",
      v7: "rate-limit-burst-threshold-rx/tx",
    },
    {
      topicAr: "طوابير Anti-Bufferbloat",
      topicEn: "Anti-Bufferbloat Queues",
      v6: "SFQ / PCQ / RED",
      v7: "CAKE / FQ-CoDel + SFQ",
    },
    {
      topicAr: "جداول التوجيه في Multi-WAN",
      topicEn: "Policy Routing Tables",
      v6: "routing-mark مباشر في Mangle/Route",
      v7: "/routing table add fib + routing-table=",
    },
  ];

  const faqs = isAr
    ? [
        {
          q: "لماذا تم فصل بروفايلات الهوتسبوت عن قيود وباقات اليوزر مانجر؟",
          a: "لأن /ip hotspot user profile يدير سرعة RX/TX وMIR والبيرست والمهل الزمنية والـ MAC Cookie محلياً ولا يدعم السعر أو الصلاحية أو الكوتا على البروفايل. بينما في وضع RADIUS يعمل الهوتسبوت كبوابة NAS ويرسل اليوزر مانجر Mikrotik-Rate-Limit مع الكوتا (Transfer/DL/UL) والأسعار والصلاحية.",
        },
        {
          q: "ما هو الفرق بين RouterOS v6 و RouterOS v7 في اليوزر مانجر؟",
          a: "في v6 يُدار عبر /tool user-manager ويحتاج حساب customer وتبدأ الصلاحية بـ starts-at=logon|now، كما يستخدم تهجئة treshold للبيرست. أما في v7 فأصبح تحت /user-manager (مع set enabled=yes) واستبدل customer بمجموعات user group وأضاف reset-counters-interval.",
        },
        {
          q: "كيف تعمل جدولة السرعات نهار/ليل وتعدد القيود لنفس الباقة؟",
          a: "في تبويب اليوزر مانجر -> الباقات والجدولة، يمكنك ربط الباقة بأكثر من قيد سرعة (Limitation) مع تحديد ساعات العمل وأيام الأسبوع لكل قيد (مثل سرعة نهارية محدودة الكوتا وسرعة ليلية مضاعفة عبر قالب سرعة نهار/ليل).",
        },
        {
          q: "كيف تعمل صلاحية الكارت تلقائياً في وضع الهوتسبوت المحلي بدون اليوزر مانجر؟",
          a: "عند تحديد (صلاحية الكارت on-login) في بروفايل الهوتسبوت المحلي، يضيف المولّد سكربتاً آمناً متوافقاً مع v6 وv7 ينشئ مهمة Scheduler لمرة واحدة عند أول دخول للعميل لفصل جلسته وحذف الكوكي وتعطيل أو حذف الكارت تلقائياً عند انتهاء المدة.",
        },
        {
          q: "ما الفرق بين HTTP Cookie و MAC Cookie؟",
          a: "يعتمد HTTP Cookie على متصفح الجهاز (تُضبط مدته عبر http-cookie-lifetime)، بينما MAC Cookie يحفظ الجلسة بربطها بعنوان MAC على الراوتر مباشرة (add-mac-cookie وmac-cookie-timeout) وهو أكثر ثباتاً على الهواتف الذكية عند الانتقال بين نقاط الوصول.",
        },
        {
          q: "متى أختار flash/hotspot ولماذا نحتاج Bypass FastTrack و Recursive Failover؟",
          a: "أجهزة Flash (مثل hEX وhAP وRB4011 وRB5009) تمسح المجلدات خارج flash/ عند إعادة التشغيل، لذا اختر flash/hotspot. كما أن تجاوز FastTrack ضروري لعدم تخطي طوابير السرعة، بينما يفحص Recursive Failover عناوين خارجية مثل 8.8.8.8 لاكتشاف انقطاع الإنترنت الحقيقي خلف المودم.",
        },
        {
          q: "ماذا أفعل إذا توقف تنفيذ السكربت عند سطر معين بسبب اسم واجهة أو عنصر موجود مسبقاً؟",
          a: "استورد السكربت دائماً عبر /import file-name=... verbose=yes مع تفعيل Safe Mode (Ctrl+X). يعرض لك verbose=yes رقم السطر الدقيق الذي توقف عنده التنفيذ (مثل وجود اسم Bridge أو DHCP مسبقاً) فتعدّله فوراً أو تحذف العنصر المكرر.",
        },
      ]
    : [
        {
          q: "Why are Hotspot User Profiles separated from User Manager Limitations?",
          a: "In MikroTik RouterOS, /ip hotspot user profile handles RX/TX rate-limits, MIR, Burst, timeouts, and MAC cookies, and does NOT support pricing or validity on profiles. In RADIUS mode, Hotspot acts as a NAS while User Manager supplies Mikrotik-Rate-Limit, quotas, pricing, and validity.",
        },
        {
          q: "What changed between User Manager v6 and v7?",
          a: "User Manager v6 uses /tool user-manager with a master customer, starts-at=logon|now, and rate-limit-burst-treshold-rx/tx. User Manager v7 uses /user-manager (set enabled=yes), replaces customer with user groups, fixes threshold spelling, and adds reset-counters-interval.",
        },
        {
          q: "How do Day/Night speed schedules work?",
          a: "Inside User Manager -> Profiles, one profile can link multiple Limitations with distinct from-time, till-time, and weekdays rules (e.g., Daytime quota cap + Night Boost preset).",
        },
        {
          q: "How does automatic card expiry work in Hotspot Local Only mode?",
          a: "Setting Local Card Validity (on-login) emits a v6/v7-compatible script that creates a one-shot scheduler task on the user's first login to drop active sessions, clear cookies, and remove/disable the user on expiry.",
        },
        {
          q: "What is the difference between HTTP Cookie and MAC Cookie?",
          a: "HTTP Cookie uses browser storage (http-cookie-lifetime), whereas MAC Cookie binds re-login directly to the client MAC on the router (add-mac-cookie & mac-cookie-timeout) for seamless mobile roaming.",
        },
        {
          q: "When should I use flash/hotspot, FastTrack bypass, and Recursive Failover?",
          a: "Use flash/hotspot on Flash RouterBoards (hEX, hAP, RB4011, RB5009) so files survive reboots. Keep FastTrack bypass enabled so Queues apply, and use Recursive Failover to detect upstream ISP outages behind modems.",
        },
        {
          q: "How do I recover cleanly if /import stops mid-script?",
          a: "Always enable Safe Mode (Ctrl+X) first and run /import file-name=... verbose=yes so RouterOS displays the exact offending line (such as a pre-existing bridge/pool name) while protecting you from lockout.",
        },
      ];

  const subTabs: { id: GuideSection; label: string; icon: typeof BookOpen }[] = [
    { id: "steps", label: isAr ? "خطوات التركيب" : "Setup Steps", icon: BookOpen },
    { id: "verify", label: isAr ? "أوامر الفحص" : "Verification CLI", icon: Terminal },
    { id: "troubleshoot", label: isAr ? "حل الأعطال" : "Troubleshooting", icon: Wrench },
    { id: "reference", label: isAr ? "v6/v7 والأسئلة" : "v6/v7 & FAQs", icon: Layers },
  ];

  return (
    <div className="space-y-5" dir={isAr ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-400" aria-hidden="true" />
          {isAr ? "الدليل التشغيلي الشامل للتركيب والفحص" : "Comprehensive Deployment & Diagnostic Guide"}
        </h2>
        <p className="text-slate-400 text-xs mt-1 leading-relaxed">
          {isAr
            ? "دليل تفاعلي متكيّف تلقائياً مع إعداداتك الحالية: خطوات التثبيت الآمن، أوامر الفحص المباشر، وتشخيص الأعطال الشائعة."
            : "Config-aware operational runbook tailored to your current setup: safe deployment checklist, live CLI verification, and troubleshooting."}
        </p>
      </div>

      {/* Live Deployment Profile Summary */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            <span>{isAr ? "ملخص خطة النشر لإعداداتك الحالية" : "Your Live Deployment Summary"}</span>
          </h3>
          <span dir="ltr" className="text-[11px] font-mono bg-slate-950 text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-800">
            {scriptFilename}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg px-3 py-2 flex justify-between items-center gap-2">
            <span className="text-slate-400">{isAr ? "النظام المستهدف:" : "Target OS:"}</span>
            <span dir="ltr" className="font-mono font-semibold text-emerald-400">RouterOS {config.rosVersion.toUpperCase()}</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg px-3 py-2 flex justify-between items-center gap-2">
            <span className="text-slate-400">{isAr ? "نمط المشتركين:" : "Auth Mode:"}</span>
            <span className="font-semibold text-slate-100">{modeSummaryLabel}</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg px-3 py-2 flex justify-between items-center gap-2">
            <span className="text-slate-400">{isAr ? "شبكة الهوتسبوت:" : "Hotspot LAN:"}</span>
            <span dir="ltr" className="font-mono text-slate-200">{lanTarget} ({config.gatewayIp}/{config.subnetMask})</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg px-3 py-2 flex justify-between items-center gap-2">
            <span className="text-slate-400">{isAr ? "خطوط الإنترنت:" : "WAN Routing:"}</span>
            <span dir="ltr" className="font-mono text-slate-200">
              {isMultiWan
                ? `${config.loadBalancingMethod.toUpperCase()} (${config.wanLines.length} WANs)`
                : `${(config.singleWanType || "dhcp").toUpperCase()} (${config.wanInterface})`}
            </span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg px-3 py-2 flex justify-between items-center gap-2">
            <span className="text-slate-400">{isAr ? "مسار صفحة الدخول:" : "HTML Folder:"}</span>
            <span dir="ltr" className="font-mono text-cyan-300">{htmlFolder}/login.html</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg px-3 py-2 flex justify-between items-center gap-2">
            <span className="text-slate-400">{isAr ? "الحزم والباقات:" : "Packages & Plans:"}</span>
            <span dir="ltr" className="font-mono text-slate-200">
              {useRadius
                ? `${config.umProfiles?.length || 0} UM + user-manager pkg`
                : `${hotspotProfilesCount} HS (hotspot pkg)`}
              {hasVlans ? ` · ${config.vlans.length} VLANs` : ""}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800/70 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
          <span>
            {isAr ? "بوابة الإدارة السريعة بعد التشغيل:" : "Post-Deploy Management:"}
          </span>
          <span dir="ltr" className="font-mono text-emerald-300">{umManagementHint}</span>
        </div>
      </div>

      {/* Sub-Navigation Pills */}
      <div
        role="tablist"
        aria-label={isAr ? "أقسام دليل التركيب" : "Installation Guide Sections"}
        onKeyDown={(e) => handleTabListKeyDown(e, GUIDE_SECTIONS, section, setSection, isAr)}
        className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950/70 p-1.5 rounded-xl border border-slate-800"
      >
        {subTabs.map((t) => {
          const Icon = t.icon;
          const isActive = section === t.id;
          return (
            <button
              key={t.id}
              id={`guide-tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`guide-tabpanel-${t.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setSection(t.id)}
              className={`min-h-[44px] sm:min-h-[36px] px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                isActive
                  ? "bg-emerald-500 text-slate-950 font-semibold shadow"
                  : "text-slate-300 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">{t.label}</span>
            </button>
          );
        })}
      </div>

      <div
        id={`guide-tabpanel-${section}`}
        role="tabpanel"
        aria-labelledby={`guide-tab-${section}`}
      >

      {/* SUB-TAB 1: Setup & Pre-flight */}
      {section === "steps" && (
        <div className="space-y-5">
          {/* Interactive Pre-flight Checklist */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" aria-hidden="true" />
                <span>{isAr ? "قائمة الفحص الوقائي قبل التطبيق" : "Interactive Pre-flight Checklist"}</span>
              </h3>
              <span dir="ltr" className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-slate-950 border border-slate-700 text-emerald-300">
                {checkedCount}/{preflightItems.length}
              </span>
            </div>

            <div className="space-y-2.5">
              {preflightItems.map((item) => {
                const isChecked = Boolean(checklist[item.id]);
                return (
                  <div
                    key={item.id}
                    className={`rounded-lg border p-3 transition ${
                      isChecked
                        ? "bg-emerald-950/20 border-emerald-800/70"
                        : "bg-slate-950/50 border-slate-800"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleCheck(item.id)}
                      aria-pressed={isChecked}
                      className="w-full min-h-[44px] sm:min-h-[32px] flex items-start gap-2.5 text-start"
                    >
                      {isChecked ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      )}
                      <div className="space-y-0.5 flex-1">
                        <div className={`text-xs font-semibold ${isChecked ? "text-emerald-200 line-through decoration-emerald-600/60" : "text-slate-100"}`}>
                          {item.title}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">{item.detail}</p>
                      </div>
                    </button>
                    {item.cmd && (
                      <div className="mt-2.5">
                        {renderCommandBox(`pre-${item.id}`, item.cmd, isAr ? "أمر الفحص / النسخ الاحتياطي" : "Check Command")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 7 Deployment Steps */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-100">
              {isAr ? "خطوات التثبيت والتشغيل العملية" : "Step-by-Step Production Rollout"}
            </h3>
            {deploySteps.map((step, idx) => (
              <div key={idx} className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex gap-3 items-start">
                  <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-300 font-mono text-sm font-bold">
                    {idx + 1}
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-slate-100">{step.title}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
                {step.cmd && renderCommandBox(`step-${idx}`, step.cmd)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Verification CLI */}
      {section === "verify" && (
        <div className="space-y-3">
          <div className="bg-emerald-950/20 border border-emerald-800/50 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-200">
            <Activity className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="leading-relaxed">
              {isAr
                ? `هذه الأوامر للقراءة والفحص فقط ولا تعدّل أي إعدادات، ومخصّصة لإصدار ${config.rosVersion.toUpperCase()} ونمط (${modeSummaryLabel}).`
                : `These read-only inspection commands match your selected ${config.rosVersion.toUpperCase()} target and ${modeSummaryLabel} mode.`}
            </p>
          </div>

          {verifyCards.map((card, idx) => (
            <div key={card.id} className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-2.5">
              <h3 className="text-sm font-semibold text-slate-100">
                {`${idx + 1}. ${card.title}`}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                <span className="text-emerald-300 font-medium">
                  {isAr ? "النتيجة السليمة: " : "Healthy sign: "}
                </span>
                {card.expected}
              </p>
              {renderCommandBox(card.id, card.cmd)}
            </div>
          ))}
        </div>
      )}

      {/* SUB-TAB 3: Troubleshooting */}
      {section === "troubleshoot" && (
        <div className="space-y-3">
          <div className="bg-amber-950/20 border border-amber-800/50 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-200">
            <Wrench className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="leading-relaxed">
              {isAr
                ? "أشهر 8 مشكلات ميدانية في شبكات الميكروتيك هوتسبوت مع السبب الجذري وأمر التشخيص السريع."
                : "Top 8 real-world MikroTik Hotspot & User Manager failure modes with root causes and diagnostic commands."}
            </p>
          </div>

          {troubleshootItems.map((item) => (
            <div key={item.id} className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-2.5">
              <h3 className="text-sm font-semibold text-amber-200">{item.symptom}</h3>
              <div className="text-xs text-slate-300 space-y-1 leading-relaxed">
                <p>
                  <span className="text-slate-100 font-semibold">{isAr ? "السبب: " : "Cause: "}</span>
                  {item.cause}
                </p>
                <p>
                  <span className="text-emerald-300 font-semibold">{isAr ? "الحل: " : "Fix: "}</span>
                  {item.fix}
                </p>
              </div>
              {renderCommandBox(item.id, item.cmd, isAr ? "أمر التشخيص" : "Diagnostic Command")}
            </div>
          ))}
        </div>
      )}

      {/* SUB-TAB 4: v6 vs v7 Reference & FAQs */}
      {section === "reference" && (
        <div className="space-y-5">
          {/* RX/TX & Syntax Cheat Card */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span>{isAr ? "مرجع سريع لاتجاه السرعات RX/TX وصيغة البيرست" : "Quick Reference: RX/TX Perspective & Rate Syntax"}</span>
            </h3>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc ps-5 leading-relaxed">
              <li>
                <span className="font-mono text-emerald-300" dir="ltr">RX</span>:{" "}
                {isAr
                  ? "البيانات الواردة إلى الراوتر = سرعة الرفع للمشترك (Client Upload)."
                  : "Traffic received by the router = Client Upload speed."}
              </li>
              <li>
                <span className="font-mono text-cyan-300" dir="ltr">TX</span>:{" "}
                {isAr
                  ? "البيانات الصادرة من الراوتر = سرعة التحميل للمشترك (Client Download)."
                  : "Traffic transmitted by the router = Client Download speed."}
              </li>
              <li>
                {isAr
                  ? "في rate-limit لبروفايل الهوتسبوت المحلي يجب أن يكون زمن البيرست بالثواني المجردة بدون حرف s (مثل 8/8 وليس 8s/8s)، أما في User Manager Limitation فتعمل 8s."
                  : "Hotspot profile positional rate-limit requires integer seconds for burst-time (e.g. 8/8, never 8s/8s), while User Manager limitation properties accept 8s."}
              </li>
            </ul>
            {renderCommandBox(
              "ref-rl",
              'rate-limit="256k/1M 512k/2M 192k/768k 8/8 8 128k/512k"',
              isAr ? "الترتيب القياسي الكامل (rate burst threshold time priority min-rate)" : "Full Positional Format (rate burst threshold time priority min-rate)"
            )}
          </div>

          {/* RouterOS v6 vs v7 Comparison Table */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60">
              <h3 className="text-sm font-semibold text-slate-100">
                {isAr ? "مقارنة الفروق الجوهرية بين RouterOS v6 و RouterOS v7" : "RouterOS v6 vs v7 Architectural Comparison"}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start border-collapse min-w-[520px]">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-300">
                    <th className="py-2.5 px-3 text-start font-semibold">{isAr ? "البند" : "Feature"}</th>
                    <th className="py-2.5 px-3 text-start font-semibold text-amber-300">RouterOS v6</th>
                    <th className="py-2.5 px-3 text-start font-semibold text-emerald-300">RouterOS v7</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {comparisonRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/30">
                      <td className="py-2.5 px-3 text-slate-200 font-medium">
                        {isAr ? row.topicAr : row.topicEn}
                      </td>
                      <td dir="ltr" className="py-2.5 px-3 font-mono text-[11px] text-amber-200/90">
                        {row.v6}
                      </td>
                      <td dir="ltr" className="py-2.5 px-3 font-mono text-[11px] text-emerald-200/90">
                        {row.v7}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* FAQ Accordion */}
          <div className="pt-2">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2 mb-3">
              <HelpCircle className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              {isAr ? "الأسئلة الشائعة وتوافق الإصدارات" : "Frequently Asked Questions"}
            </h3>

            <div className="space-y-2.5">
              {faqs.map((faq, idx) => {
                const isOpen = activeFAQ === idx;
                return (
                  <div
                    key={idx}
                    className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900/20 hover:bg-slate-900/40 transition-colors"
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setActiveFAQ(isOpen ? null : idx)}
                      className="min-h-[44px] w-full flex justify-between items-center px-4 py-3 text-start text-xs font-medium text-slate-200 hover:text-white transition-colors"
                    >
                      <span>{faq.q}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-300 flex-shrink-0" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-300 flex-shrink-0" aria-hidden="true" />
                      )}
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 pt-2 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 bg-slate-900/40">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
