<div align="center">

# 🌐 MikroTik Hotspot Master Script Generator
### مولّد سكربتات ميكروتيك هوت سبوت الشامل (RouterOS v6 & v7)

**أداة ويب متكاملة لتوليد سكربتات إعداد شبكات MikroTik Hotspot ودمج الخطوط (Multi-WAN) والشبكات الافتراضية (VLANs) وإعدادات User Manager v6/v7 المستقلة، مع تصدير حزمة نشر كاملة (`.rsc` + حزمة بوابة الدخول ذات الـ 5 ملفات) بصيغة ZIP بضغطة زر.**

*A comprehensive client-side web utility to generate production-ready MikroTik RouterOS v6 & v7 Hotspot scripts, Multi-WAN Load Balancing, Bridge VLAN Filtering, separated Hotspot User Profiles vs User Manager v6/v7 Studio, secret-free shareable JSON export, and a 5-file captive portal ZIP deployment bundle.*

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![RouterOS](https://img.shields.io/badge/MikroTik_RouterOS-v6_%26_v7-10B981?style=for-the-badge&logo=mikrotik&logoColor=white)](https://mikrotik.com/)
[![CI](https://github.com/Mr-Muhamad/Mikrotik-Hotspot-Script-Generator/actions/workflows/ci.yml/badge.svg)](https://github.com/Mr-Muhamad/Mikrotik-Hotspot-Script-Generator/actions/workflows/ci.yml)
[![Deploy to GitHub Pages](https://github.com/Mr-Muhamad/Mikrotik-Hotspot-Script-Generator/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/Mr-Muhamad/Mikrotik-Hotspot-Script-Generator/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-F59E0B?style=for-the-badge)](./LICENSE)

<br />

**[🚀 تشغيل الأداة مباشرة (Live Demo)](https://mr-muhamad.github.io/Mikrotik-Hotspot-Script-Generator/)** &nbsp;|&nbsp; **[🇸🇦 التوثيق باللغة العربية](#arabic)** &nbsp;|&nbsp; **[🇬🇧 English Documentation](#english)**

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
| **1. إعدادات الشبكة (Network Setup)** | منافذ WAN/LAN، `LAN Bridge`، الجيتواي وقناع الشبكة، DHCP Pool مع **مدة حجز الـ IP القابلة للتخصيص (`dhcpLeaseTime`)**، خيار **`Universal Client` (افتراضياً `address-pool=none`)**، خوادم DNS مع **توجيه DNS الإجباري (`dstnat` Port 53)**، هوية الراوتر والمنطقة الزمنية ومزامنة الوقت **NTP**، مسار التخزين (`hotspot` / `flash/hotspot`)، وطرق الدخول (`HTTP CHAP`, `HTTP PAP`, `HTTP Cookie`, `MAC Cookie`, `MAC Auth`). |
| **2. الشبكات الافتراضية (VLANs Setup)** | إنشاء عدة VLANs مع `VLAN ID`، بوابات وDHCP منفصل، تفعيل Hotspot مخصص لكل VLAN، دعم **Bridge VLAN Filtering** (منافذ Trunk/Access)، وعزل الشبكات عن بعضها (`Inter-VLAN Isolation`). |
| **3. دمج الخطوط (Multi-WAN Load Balancing)** | دعم **PCC** و**NTH** و**ECMP** و**Failover**، قائمة `LOCAL_SUBNETS` + `hotspot=!auth` لحماية صفحة الدخول والمودمات، ربط البوابة بالمنفذ (`IP%interface`)، وفحص الإنترنت الحقيقي **Recursive Failover**. |
| **4. بروفايلات الهوتسبوت (Hotspot Profiles)** | محول أنماط التشغيل، إعدادات بوابة NAS وبروفايل التجربة `trial-profile`، وبروفايلات `/ip hotspot user profile` بـ `RX/TX` و`min-rx/min-tx` وBurst و`mac-cookie-timeout` و`insert-queue-before` وقالب **`on-login`** للانتهاء التلقائي محلياً. |
| **5. راديوس واليوزر مانجر (RADIUS & UM)** | اختيار مرن بين **اليوزر مانجر المدمج (`userman_local` v6/v7)** و**سيرفر RADIUS خارجي مستقل (`external_radius`)** مع منافذ Auth/Acct/CoA (`3799`) وعنوان المصدر `src-address`، والقيود والباقات المجدولة. |
| **6. الحماية والخدمات والتخصيص (Security & Services)** | تجاوز **FastTrack**، **ضبط حزم TCP تلقائياً (`clamp-to-pmtu`)**، **حماية الطبقة الثانية ضد الأكسس بوينت (`Anti-Rogue DHCP Snooping` و`Loop Protect & RSTP`)**، تأمين الجدار الناري وحظر إدارة الراوتر من WAN والعملاء، **تحكم مستقل لكل خدمة** (`/ip service`: `API` / `API-SSL` / `WWW` / `SSH` / `FTP` / `Telnet`)، منع مشاركة الكروت (`TTL=1`)، **Walled Garden**، `IP Bindings`، وطوابير `CAKE`/`FQ-CoDel` في v7. |
| **7. حزمة بوابة الدخول الكاملة (5-File Captive Portal Suite)** | معاينة حية تفاعلية خالية من وسوم السكربت الخام، 4 ثيمات ألوان، **3 أنماط لحقول الدخول** (الاثنين معاً، خانة كارت فقط بكود=باسورد أو بدون باسورد، أو كود وباسورد مختلفين)، وحزمة 5 ملفات (`login.html`, `status.html`, `logout.html`, `alogin.html`, `md5.js`) متوافقة مع تشفير CHAP. |
| **8. العمل بدون إنترنت وتصدير حزمة ZIP (Offline PWA & ZIP)** | تطبيق ويب تقدمي (**Offline PWA**) قابل للتثبيت والعمل بالكامل بدون إنترنت في مواقع التركيب، بحث فوري، انتقال سريع للأقسام، نسخ السكربت، تحميل `.rsc`، **تصدير JSON خالٍ من الأسرار** (`stripConfigSecrets`)، وتحميل **حزمة ZIP كاملة** تضم السكربت + مجلد البوابة ذي الـ 5 ملفات + دليل التركيب `README_DEPLOY.txt`. |

---

### 🏗️ البنية المعمارية للمشروع

تم تنظيم منطق توليد السكربتات بشكل معياري داخل `src/utils/generators/` لفصل المسؤوليات وتسهيل الاختبار والصيانة، إلى جانب الأدوات الأساسية:

- `src/utils/generators/`: وحدات توليد مقاطع RouterOS المعيارية (الشبكة والواجهات، الشبكات الافتراضية VLANs، تعدد الخطوط Multi-WAN، الجدار الناري والحماية، بروفايلات الهوتسبوت وUser Manager، وجدولة الصيانة).
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

### 🚀 التشغيل المباشر والتثبيت المحلي

يمكنك فتح الأداة وتشغيلها فوراً عبر المتصفح دون أي تثبيت من خلال رابط النشر المباشر: [https://mr-muhamad.github.io/Mikrotik-Hotspot-Script-Generator/](https://mr-muhamad.github.io/Mikrotik-Hotspot-Script-Generator/).

وللتشغيل المحلي، تأكد من توفر [Node.js](https://nodejs.org/) (الإصدار 22 أو أحدث موصى به، ويدعم Node 18+) على جهازك، ثم نفّذ الأوامر التالية:

</div>

```bash
# 1. استنساخ المستودع (Clone the repository)
git clone https://github.com/Mr-Muhamad/Mikrotik-Hotspot-Script-Generator.git
cd Mikrotik-Hotspot-Script-Generator

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

**MikroTik Hotspot Master Script Generator** is a fast, 100% client-side React + TypeScript application that generates production-ready **RouterOS v6 & v7** deployment scripts with zero backend dependencies. Settings auto-save to `localStorage` with schema migration, JSON backup Export/Import (including **Secret-Free Shareable JSON** export), live validation, and a zero-dependency **ZIP deployment bundle** containing your `.rsc` script, the **5-file Captive Portal suite**, and a bilingual deployment guide.

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
| **1. Network Setup** | WAN/LAN interfaces, `LAN Bridge`, CIDR pool calculator with **configurable DHCP Lease Time**, **Universal Client ARP-NAT control (`address-pool=none` default)**, DNS cache & **Forced DNS Redirect (UDP/TCP 53)**, System Identity & NTP client, HTML storage (`hotspot` / `flash/hotspot`), and `login-by` flags (`http-chap`, `http-pap`, `cookie`, `mac-cookie`, `mac`). |
| **2. VLANs Setup** | Multiple tagged VLANs with independent gateways/DHCP pools, per-VLAN Hotspot profiles, **Bridge VLAN Filtering** (`tagged`/`untagged`/`pvid`), and Inter-VLAN Isolation. |
| **3. Multi-WAN Load Balancing** | **PCC**, **NTH**, **ECMP**, and **Failover** (`DHCP`, `Static CIDR`, `PPPoE`), `LOCAL_SUBNETS` + `hotspot=!auth` mangle protection, interface-scoped gateways (`IP%interface`), and **Recursive Failover**. |
| **4. Hotspot User Profiles** | Subscriber mode selector, NAS `default` + `trial-profile` config, and `/ip hotspot user profile` builder (`RX/TX`, `min-rx/min-tx`, Burst, `status-autorefresh`, `add-mac-cookie`, `address-pool`, `address-list`, `insert-queue-before`, plus optional `on-login` expiry scheduler). |
| **5. RADIUS & User Manager Studio** | Switch between **Built-in User Manager (`userman_local` v6/v7)** with Limitations/Schedules/v7 Groups and **Standalone External RADIUS (`external_radius`)** with Auth/Acct/CoA (`3799`) and optional `src-address` without emitting local UM packages. |
| **6. Security, Services & Queues** | Safe **FastTrack bypass**, **automatic TCP MSS clamping (`clamp-to-pmtu`)**, **Layer-2 AP/Switch protection (`Anti-Rogue DHCP Snooping` & `Loop Protect + RSTP`)**, Firewall hardening, **granular `/ip service` toggles** (`API` 8728, `API-SSL` 8729, `WWW`, `SSH`, `FTP`, `Telnet`), `TTL=1` anti-sharing, **Walled Garden** (HTTP + HTTPS IP), `IP Bindings`, v7 `CAKE`/`FQ-CoDel` queues, and nightly schedulers. |
| **7. 5-File Captive Portal Suite** | Interactive captive portal builder with clean live iframe preview, 4 themes, **3 credential modes** (both tabs, voucher-only with same-as-user or blank password, or separate username/password fields), and full 5-file RouterOS portal suite (`login.html`, `status.html`, `logout.html`, `alogin.html`, `md5.js`). |
| **8. Offline Field PWA, Script Viewer & ZIP Bundle** | Installable **Offline PWA** (build-time Service Worker precaching every lazy chunk so field deployments work 100% without internet), search with match count, section jump, line-wrap toggle, `.rsc` download, **Secret-Free Shareable JSON** export (`stripConfigSecrets`), and one-click **ZIP Deployment Bundle** export (`hotspot/` or `flash/hotspot/` portal files + `.rsc` + `README_DEPLOY.txt`). |

---

### 🏗️ Architecture

The RouterOS generation pipeline is organized modularly under `src/utils/generators/` alongside core utilities:

- `src/utils/generators/`: Modular RouterOS script section generators (interfaces/LAN/VLANs, Multi-WAN load balancing, firewall/security, Hotspot profiles, User Manager v6/v7, and maintenance schedulers).
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

### 🚀 Live App & Local Quick Start

Run the tool directly in your browser with zero setup via GitHub Pages: [https://mr-muhamad.github.io/Mikrotik-Hotspot-Script-Generator/](https://mr-muhamad.github.io/Mikrotik-Hotspot-Script-Generator/).

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
