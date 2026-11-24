<div align="center">

# 🌐 MikroTik Hotspot Master Script Generator
### مولّد سكربتات ميكروتيك هوت سبوت الشامل (RouterOS v6 & v7)

**أداة ويب متكاملة لتوليد سكربتات إعداد شبكات MikroTik Hotspot ودمج الخطوط (Multi-WAN) والشبكات الافتراضية (VLANs) وإعدادات User Manager v6/v7 المستقلة، مع تصدير حزمة نشر كاملة (`.rsc` + حزمة بوابة الدخول ذات الـ 5 ملفات) بصيغة ZIP بضغطة زر.**

*A comprehensive client-side web utility to generate production-ready MikroTik RouterOS v6 & v7 Hotspot scripts, Multi-WAN Load Balancing, Bridge VLAN Filtering, separated Hotspot User Profiles vs User Manager v6/v7 Studio, printable voucher cards/CSV, secret-free shareable JSON export, and a 5-file captive portal ZIP deployment bundle.*

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![RouterOS](https://img.shields.io/badge/MikroTik_RouterOS-v6_%26_v7-10B981?style=for-the-badge&logo=mikrotik&logoColor=white)](https://mikrotik.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-F59E0B?style=for-the-badge)](./LICENSE)

<br />

**[🇸🇦 التوثيق باللغة العربية](#arabic)** &nbsp;|&nbsp; **[🇬🇧 English Documentation](#english)**

</div>

---

<a id="arabic"></a>

<div dir="rtl">

## 🇸🇦 النسخة العربية

### نبذة عن المشروع

**مولّد سكربتات ميكروتيك هوت سبوت الشامل** هو تطبيق ويب حديث وسريع يعمل بالكامل من جهة المتصفح (Client-Side) دون الحاجة لأي خادم خارجي، ويحفظ إعداداتك تلقائياً في المتصفح (`localStorage`) مع دعم التصدير والاستيراد بصيغة JSON (بما في ذلك التصدير الآمن الخالي من الأسرار للمشاركة) والتحقق الفوري من الأخطاء قبل النسخ. يلتزم المولّد تماماً بوثائق **MikroTik الرسمية** لإصدارَي **RouterOS v6** و**RouterOS v7** مع فصلٍ معماري كامل بين بروفايلات الهوتسبوت وإعدادات اليوزر مانجر.

---

### ✨ أنماط إدارة المشتركين والسرعات

| النمط | آلية العمل في MikroTik | الاستخدام الأنسب |
| :--- | :--- | :--- |
| **1. يوزر مانجر عبر RADIUS (`userman_radius`)** | يعمل الهوتسبوت كبوابة NAS فقط (`use-radius=yes`) ويُضبط بروفايل `default` بدون `rate-limit` متعارض، بينما تأتي السرعات والكوتا والصلاحية من User Manager. | الشبكات التجارية وبيع الكروت بأسعار وكوتا وتجديد دوري وجداول نهار/ليل. |
| **2. هوتسبوت محلي فقط (`hotspot_only`)** | يولّد `/ip hotspot user profile` بخصائصها الحقيقية (`RX/TX`, `MIR`, Burst, `mac-cookie`, `address-list`, وقالب `on-login` للصلاحية المحلية) دون أي أوامر RADIUS. | الشبكات البسيطة، الكافيهات، أو الراوترات غير المثبّت عليها حزمة User Manager. |
| **3. الوضع الهجين (`hybrid`)** | يولّد بروفايلات الهوتسبوت المحلية بالتوازي مع منظومة اليوزر مانجر وRADIUS. | ربط مجموعات `Mikrotik-Group` ببروفايلات محلية أو تشغيل حسابات محلية + كروت RADIUS معاً. |

---

### 🧩 الأقسام والمميزات الرئيسية

| القسم / التبويب | الوصف والمميزات المدعومة |
| :--- | :--- |
| **1. إعدادات الشبكة (Network Setup)** | منافذ WAN/LAN، `LAN Bridge`، الجيتواي وقناع الشبكة، DHCP Pool، خوادم DNS، هوية الراوتر والمنطقة الزمنية ومزامنة الوقت **NTP**، مسار التخزين (`hotspot` / `flash/hotspot`)، وطرق الدخول (`HTTP CHAP`, `HTTP PAP`, `HTTP Cookie`, `MAC Cookie`, `MAC Auth`). |
| **2. الشبكات الافتراضية (VLANs Setup)** | إنشاء عدة VLANs مع `VLAN ID`، بوابات وDHCP منفصل، تفعيل Hotspot مخصص لكل VLAN، دعم **Bridge VLAN Filtering** (منافذ Trunk/Access)، وعزل الشبكات عن بعضها (`Inter-VLAN Isolation`). |
| **3. دمج الخطوط (Multi-WAN Load Balancing)** | دعم **PCC** و**NTH** و**ECMP** و**Failover**، قائمة `LOCAL_SUBNETS` + `hotspot=!auth` لحماية صفحة الدخول والمودمات، ربط البوابة بالمنفذ (`IP%interface`)، وفحص الإنترنت الحقيقي **Recursive Failover**. |
| **4. بروفايلات الهوتسبوت (Hotspot Profiles)** | محول أنماط التشغيل، إعدادات بوابة NAS وبروفايل التجربة `trial-profile`، وبروفايلات `/ip hotspot user profile` بـ `RX/TX` و`min-rx/min-tx` وBurst و`mac-cookie-timeout` و`insert-queue-before` وقالب **`on-login`** للانتهاء التلقائي محلياً. |
| **5. اليوزر مانجر وراديوس (User Manager Studio)** | مقسّم إلى 3 أقسام: **(1) الربط والخادم**: RADIUS + CoA (`3799`)، وحساب `customer` لـ v6 ومجموعات `user group` مع `outer-auths` و`attributes` لـ v7؛ **(2) القيود والكوتا**: `Limitations` مع `transfer/download/upload` وتجديد العدادات `reset-counters-interval` لـ v7؛ **(3) الباقات والجدولة**: ربط الباقة بعدة قيود زمنية (قالب سرعة نهار/ليل). |
| **6. الحماية والتخصيص والكروت (Security & Vouchers)** | تجاوز **FastTrack**، تأمين الجدار الناري وحظر إدارة الراوتر من WAN والعملاء، تعطيل الخدمات غير الآمنة، منع مشاركة الكروت (`TTL=1`)، قائمة **Walled Garden** (HTTP وHTTPS IP)، استثناءات `IP Bindings`، طوابير `CAKE`/`FQ-CoDel` في v7، ومولّد الكروت بالجملة مع **طباعة بطاقات الكروت (Printable Voucher Cards)** و**تصدير CSV**. |
| **7. حزمة بوابة الدخول الكاملة (5-File Captive Portal Suite)** | معاينة حية تفاعلية خالية من وسوم السكربت الخام، 4 ثيمات ألوان، دعم التابين (كارت / مستخدم وكلمة سر)، وتوليد حزمة البوابة المتكاملة من 5 ملفات (`login.html`, `status.html`, `logout.html`, `alogin.html`, `md5.js`) متوافقة مع تشفير CHAP في RouterOS. |
| **8. محرر السكربت والتصدير الآمن وحزمة ZIP** | بحث فوري، انتقال سريع للأقسام، تبديل التفاف الأسطر، نسخ السكربت، تحميل `.rsc`، **تصدير JSON خالٍ من الأسرار (Secret-Free Shareable JSON)** عبر `stripConfigSecrets` (يزيل كلمات مرور PPPoE وسر RADIUS وكلمة مرور مسؤول User Manager وأكواد الكروت)، وتحميل **حزمة ZIP كاملة** تضم السكربت + مجلد البوابة ذي الـ 5 ملفات + دليل التركيب `README_DEPLOY.txt` (ترتيب التركيب: استيراد `.rsc` أولا ثم رفع مجلد البوابة). |

---

### 🏗️ البنية المعمارية للمشروع

تم تنظيم منطق توليد السكربتات بشكل معياري داخل `src/utils/generators/` لفصل المسؤوليات وتسهيل الاختبار والصيانة، إلى جانب الأدوات الأساسية:

- `src/utils/generators/`: وحدات توليد مقاطع RouterOS المعيارية (الشبكة والواجهات، الشبكات الافتراضية VLANs، تعدد الخطوط Multi-WAN، الجدار الناري والحماية، بروفايلات الهوتسبوت وUser Manager، والكروت).
- `src/utils/scriptGenerator.ts`: المنسّق الرئيسي لتجميع سكربت `.rsc` الكامل ودوال الحسابات الشبكية والسرعات.
- `src/utils/htmlTemplateGenerator.ts`: مولّد حزمة بوابة الدخول ذات الـ 5 ملفات (`login.html`, `status.html`, `logout.html`, `alogin.html`, `md5.js`).
- `src/utils/zipExporter.ts`: مولّد أرشيف ZIP نقي (`createZipBytes` / `createZipBlob`)، دالة إزالة الأسرار (`stripConfigSecrets`)، وباني دليل النشر ثنائي اللغة (`buildDeploymentReadme`).
- `src/utils/validation.ts`: التحقق الفوري من صحة الإعدادات وتعارضات الشبكة وRADIUS.
- `scripts/code-audit.mjs`: أداة تدقيق ساكنة بدون تبعيات خارجية للتحقق من ترويسات `SPDX-License-Identifier: MIT` ومنع `eval(` و`dangerouslySetInnerHTML` ومحرف em-dash (`U+2014`) وضمان امتداد `.ts` للاستيرادات النسبية في `src/utils/` و`src/constants/`.

---

### 🛠️ التقنيات المستخدمة

- **React 19** + **TypeScript 5.8** (`strict: true`, `noFallthroughCasesInSwitch: true`)
- **Vite 6** (مع Code Splitting لتحميل التبويبات عند الطلب)
- **Tailwind CSS v4** (واجهة داكنة متجاوبة بدعم كامل لـ RTL/LTR وإتاحة الوصول)
- **Lucide React** للأيقونات + مولّد ZIP نقي بدون تبعيات خارجية
- **Node.js Native Test Runner** (`node --test`) + **GitHub Actions CI**

---

### 🚀 التثبيت والتشغيل المحلي

تأكد من توفر [Node.js](https://nodejs.org/) (الإصدار 22 أو أحدث موصى به، ويدعم Node 18+) على جهازك، ثم نفّذ الأوامر التالية:

</div>

```bash
# 1. استنساخ المستودع (Clone the repository)
git clone <YOUR_GITHUB_REPO_URL>
cd <YOUR_REPO_FOLDER>

# 2. تثبيت الحزم والمكتبات
npm install

# 3. تشغيل خادم التطوير المحلي (يعمل على المنفذ 3000)
npm run dev
```

<div dir="rtl">

#### أوامر التحقق والبناء

</div>

```bash
# فحص الأنواع والتدقيق الساكن (TypeScript + Code Audit)
npm run lint

# تشغيل الاختبارات الآلية (Unit Tests)
npm test

# بناء نسخة الإنتاج الجاهزة للنشر
npm run build
```

---

<a id="english"></a>

## 🇬🇧 English Version

### Overview

**MikroTik Hotspot Master Script Generator** is a fast, 100% client-side React + TypeScript application that generates production-ready **RouterOS v6 & v7** deployment scripts with zero backend dependencies. Settings auto-save to `localStorage` with schema migration, JSON backup Export/Import (including **Secret-Free Shareable JSON** export), live validation, printable voucher cards and CSV export, and a zero-dependency **ZIP deployment bundle** containing your `.rsc` script, the **5-file Captive Portal suite**, and a bilingual deployment guide.

---

### ✨ Subscriber Management Modes

| Mode | RouterOS Architecture | Best For |
| :--- | :--- | :--- |
| **User Manager (RADIUS) (`userman_radius`)** | Hotspot acts purely as a NAS (`use-radius=yes`) with a non-conflicting `default` profile; rates, quotas, validity, and pricing come from User Manager. | Commercial vouchers, data quotas, recurring counter resets, and Day/Night rate schedules. |
| **Hotspot Local Only (`hotspot_only`)** | Generates `/ip hotspot user profile` entries (`RX/TX`, `MIR`, Burst, `mac-cookie`, `address-list`, and optional `on-login` auto-expiry) without RADIUS. | Cafes, small networks, or RouterBoards without the User Manager package installed. |
| **Hybrid Mode (`hybrid`)** | Generates local Hotspot user profiles alongside full RADIUS & User Manager configuration. | Local exception accounts plus RADIUS vouchers or `Mikrotik-Group` profile mapping. |

---

### 🧩 Key Capabilities

| Tab / Module | Capabilities |
| :--- | :--- |
| **1. Network Setup** | WAN/LAN interfaces, `LAN Bridge`, CIDR pool calculator, DNS, System Identity & NTP client, HTML storage (`hotspot` / `flash/hotspot`), and `login-by` flags (`http-chap`, `http-pap`, `cookie`, `mac-cookie`, `mac`). |
| **2. VLANs Setup** | Multiple tagged VLANs with independent gateways/DHCP pools, per-VLAN Hotspot profiles, **Bridge VLAN Filtering** (`tagged`/`untagged`/`pvid`), and Inter-VLAN Isolation. |
| **3. Multi-WAN Load Balancing** | **PCC**, **NTH**, **ECMP**, and **Failover** (`DHCP`, `Static CIDR`, `PPPoE`), `LOCAL_SUBNETS` + `hotspot=!auth` mangle protection, interface-scoped gateways (`IP%interface`), and **Recursive Failover**. |
| **4. Hotspot User Profiles** | Subscriber mode selector, NAS `default` + `trial-profile` config, and `/ip hotspot user profile` builder (`RX/TX`, `min-rx/min-tx`, Burst, `status-autorefresh`, `add-mac-cookie`, `address-pool`, `address-list`, `insert-queue-before`, plus optional `on-login` expiry scheduler). |
| **5. User Manager Studio (v6 & v7)** | Three focused sub-tabs: **(1) RADIUS & Server** (CoA `3799`, v6 `customer`, v7 `user group` with `outer-auths` & RADIUS `attributes`), **(2) Limitations** (`rate-limit-rx/tx`, `transfer`/`download`/`upload` limits, v7 `reset-counters-interval`, one-click clone from Hotspot speeds), and **(3) Profiles & Schedules** (time-windowed `profile-limitation` + Day/Night Boost preset). |
| **6. Security & Batch Vouchers** | Safe **FastTrack bypass**, Firewall hardening, `TTL=1` anti-sharing, **Walled Garden** (HTTP + HTTPS IP), `IP Bindings`, v7 `CAKE`/`FQ-CoDel` queues, nightly maintenance scripts, mode-aware Batch Voucher Generator, **Printable Voucher Cards**, and **CSV export**. |
| **7. 5-File Captive Portal Suite** | Interactive captive portal builder with clean live iframe preview, 4 themes, Voucher + Username/Password tabs, and full 5-file RouterOS portal suite (`login.html`, `status.html`, `logout.html`, `alogin.html`, `md5.js`) for seamless CHAP authentication and session status/logout flows. |
| **8. Live Script Viewer, Secret-Free JSON & ZIP Bundle** | Search with match count, section jump, line-wrap toggle, copy script, `.rsc` download, **Secret-Free Shareable JSON** export (`stripConfigSecrets` strips PPPoE passwords, RADIUS secret, User Manager admin password, and voucher codes), and one-click **ZIP Deployment Bundle** export (`hotspot/` or `flash/hotspot/` portal files + `.rsc` + `README_DEPLOY.txt` instructing to import `.rsc` first, then upload the 5-file portal folder). |

---

### 🏗️ Architecture

The RouterOS generation pipeline is organized modularly under `src/utils/generators/` alongside core utilities:

- `src/utils/generators/`: Modular RouterOS script section generators (interfaces/LAN/VLANs, Multi-WAN load balancing, firewall/security, Hotspot profiles, User Manager v6/v7, and batch vouchers).
- `src/utils/scriptGenerator.ts`: Main `.rsc` script orchestrator plus IPv4/CIDR and RouterOS rate helpers.
- `src/utils/htmlTemplateGenerator.ts`: Generates the 5-file captive portal suite (`login.html`, `status.html`, `logout.html`, `alogin.html`, `md5.js`).
- `src/utils/zipExporter.ts`: Zero-dependency ZIP archive writer (`createZipBytes`, `createZipBlob`), `stripConfigSecrets` for safe JSON sharing, and bilingual `buildDeploymentReadme`.
- `src/utils/validation.ts`: Real-time configuration, subnet, and RADIUS validation.
- `scripts/code-audit.mjs`: Zero-dependency static audit verifying `SPDX-License-Identifier: MIT` headers, banning `eval(` / `dangerouslySetInnerHTML` / em-dash (`U+2014`), and enforcing explicit `.ts` extensions on runtime relative imports/exports under `src/utils/` and `src/constants/`.

---

### 🛠️ Tech Stack

- **React 19** + **TypeScript 5.8** (`strict: true`, `noFallthroughCasesInSwitch: true`)
- **Vite 6** (with lazy-loaded tab code splitting)
- **Tailwind CSS v4** (accessible dark UI with full RTL/LTR support)
- **Lucide React** icons + pure TypeScript ZIP exporter
- **Node.js Native Test Runner** (`node --test`) + **GitHub Actions CI** (`.github/workflows/ci.yml`)

---

### 🚀 Quick Start & Verification

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Type-check & run static code audit
npm run lint

# Run unit tests
npm test

# Build production bundle
npm run build
```

---

## 📄 License / الرخصة

This project is licensed under the **MIT License**. See [LICENSE](./LICENSE) for details.

هذا المشروع مرخّص بموجب **رخصة MIT** مفتوحة المصدر. يمكنك الاطلاع على ملف [LICENSE](./LICENSE) للتفاصيل.
