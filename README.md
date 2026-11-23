<div align="center">

# 🌐 MikroTik Hotspot Master Script Generator
### مولّد سكربتات ميكروتيك هوت سبوت الشامل (RouterOS v6 & v7)

**أداة ويب متكاملة لتوليد سكربتات إعداد شبكات MikroTik Hotspot ودمج الخطوط (Multi-WAN) والشبكات الافتراضية (VLANs) وربط User Manager وتصميم صفحة تسجيل الدخول `login.html` بضغطة زر.**

*A comprehensive web utility to generate production-ready MikroTik RouterOS v6 & v7 Hotspot scripts, Multi-WAN Load Balancing, VLANs, Burst Speed Profiles, RADIUS/User Manager integration, and responsive `login.html` captive portal pages.*

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

**مولّد سكربتات ميكروتيك هوت سبوت الشامل** هو تطبيق ويب حديث وسريع يعمل بالكامل من جهة المتصفح (Client-Side) دون الحاجة لأي خادم خارجي أو مفاتيح API، ويحفظ إعداداتك تلقائياً في المتصفح (`localStorage`). يهدف التطبيق إلى تبسيط إعداد راوترات **MikroTik** سواء على **RouterOS v6** أو **RouterOS v7** عبر واجهة ثنائية اللغة (عربي/إنجليزي) ومحرر سكربت فوري ملوّن يولّد ملف `.rsc` جاهزاً للتطبيق مباشرة في Winbox.

---

### ✨ المميزات الرئيسية

| القسم / التبويب | الوصف والمميزات المدعومة |
| :--- | :--- |
| **1. إعدادات الشبكة (Network Setup)** | تحديد إصدار RouterOS (`v6` أو `v7`)، منافذ WAN/LAN، عنوان البوابة (Gateway IP)، قناع الشبكة، نطاق DHCP Pool، خوادم DNS، وطرق الدخول (`HTTP CHAP`, `HTTP PAP`, `MAC Auth`, `Cookie`, `Trial`). |
| **2. الشبكات الافتراضية (VLANs Setup)** | إنشاء وإدارة عدة شبكات VLANs مع تحديد `VLAN ID`، المنفذ الأب، بوابة خاصة، DHCP مستقل، وإمكانية تفعيل Hotspot على كل VLAN بشكل منفصل. |
| **3. دمج الخطوط (Multi-WAN Load Balancing)** | دعم طرق الدمج المتعددة: **PCC** و **NTH** و **ECMP** و **Failover**، مع خيار ثبات اتصالات HTTPS (`Sticky Connections`) ودعم خطوط `Static` و `DHCP` و `PPPoE`. |
| **4. بروفايلات السرعة والبيرست (Speed & Burst)** | إنشاء وتعديل باقات السرعة مع دعم **Burst Upload/Download**، حدود البيرست، وقت البيرست، الأولوية (`1-8`)، الكوتة الشهرية (MB)، عدد الأجهزة المشتركة، مهلات الجلسة، والسعر والصلاحية. |
| **5. اليوزر مانجر وراديوس (User Manager & RADIUS)** | ربط تلقائي مع RADIUS ومنفذ CoA (`3799`)، مزامنة البروفايلات تلقائياً مع User Manager، ومولّد دفعات الكروت (Voucher Batch Generator)، مع تبديل تلقائي بين أوامر v6 و v7. |
| **6. الحماية والتخصيص (Security & Advanced)** | قواعد تجاوز **FastTrack** لضمان عمل حدود السرعة بدقة، تقوية جدار الحماية (Firewall Hardening)، قائمة المواقع المجانية **Walled Garden** (مثل `*.whatsapp.com`)، تحسين DNS Cache، دعم طوابير `CAKE` و `FQ-CoDel` لـ v7، وسكربتات التنظيف وإعادة التشغيل المجدولة. |
| **7. مصمم صفحة الدخول (`login.html`)** | تخصيص عنوان الشبكة والنص الترحيبي ورقم الدعم الفني مع 4 ثيمات جاهزة (زمردي، أزرق ملكي، بنفسجي، داكن)، معاينة تفاعلية مباشرة، دعم الكروت والحسابات والتجربة المجانية وتشفير `md5.js`، وتحميل مباشر لملف `login.html`. |
| **8. محرر السكربت ودليل التركيب** | معاينة فورية للسكربت بتلوين أوامر RouterOS، نسخ بضغطة زر، تحميل مباشر بصيغة `.rsc`، ودليل خطوة بخطوة مع أبرز الأسئلة الشائعة. |

---

### 🛠️ التقنيات المستخدمة

- **React 19** + **TypeScript 5.8**
- **Vite 6** لبناء وتشغيل سريع للغاية
- **Tailwind CSS v4** لتصميم عصري داكن ومتجاوب مع دعم كامل للاتجاهين (RTL / LTR)
- **Lucide React** للأيقونات

---

### 🚀 التثبيت والتشغيل المحلي

تأكد من توفر [Node.js](https://nodejs.org/) (الإصدار 18 أو أحدث) على جهازك، ثم نفّذ الأوامر التالية:

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

افتح المتصفح على الرابط: `http://localhost:3000`

#### أوامر إضافية مفيدة

</div>

```bash
# فحص الأنواع والأخطاء البرمجية (TypeScript Check)
npm run lint

# بناء نسخة الإنتاج الجاهزة للنشر (Production Build)
npm run build

# معاينة نسخة الإنتاج محلياً
npm run preview
```

---

<div dir="rtl">

### 📡 طريقة تطبيق السكربت على راوتر MikroTik

1. **اختيار إصدار النظام**: حدد من أعلى التطبيق إصدار الراوتر الخاص بك (`v6.x` أو `v7.x`).
2. **ضبط الإعدادات**: تنقّل بين التبويبات لضبط منافذ الشبكة، السرعات، دمج الخطوط، وربط اليوزر مانجر.
3. **نسخ أو تحميل السكربت**: اضغط على **نسخ السكربت** أو **تحميل ملف `.rsc`** من لوحة المحرر.
4. **الاتصال بالراوتر**: افتح برنامج **Winbox** وسجّل الدخول إلى راوتر الميكروتيك بحساب `admin`.
5. **التنفيذ عبر Terminal**:
   - **الطريقة الأولى (النسخ واللصق)**: افتح **New Terminal** من القائمة اليسرى، اضغط بزر الفأرة الأيمن واختر **Paste** وانتظر انتهاء تنفيذ الأوامر.
   - **الطريقة الثانية (ملف `.rsc`)**: اسحب ملف `.rsc` إلى قسم **Files** في Winbox ثم نفّذ الأمر التالي في Terminal:

</div>

```routeros
/import file-name=hotspot_setup_v6_hotspot1.rsc
```

<div dir="rtl">

6. **فتح لوحة اليوزر مانجر**: افتح المتصفح وانتقل إلى `http://<GATEWAY_IP>/userman` (مثال: `http://192.168.80.1/userman`) لإدارة وطباعة الكروت.

---

### 🎨 طريقة رفع صفحة تسجيل الدخول المخصصة (`login.html`)

1. انتقل إلى تبويب **صفحة الدخول (`login.html`)** داخل التطبيق.
2. عدّل اسم الشبكة، النص الترحيبي، رقم الدعم الفني، واختر لون التصميم المناسب مع معاينة فورية.
3. اضغط على **تحميل ملف `login.html`**.
4. افتح **Winbox** وانتقل إلى قائمة **Files** (أو اتصل عبر FTP).
5. ابحث عن مجلد **`hotspot`** (أو اسم المجلد المحدد في إعدادات الهوتسبوت، وفي بعض الراوترات يكون `flash/hotspot`).
6. اسحب ملف **`login.html`** الجديد وأفلته داخل مجلد `hotspot` لاستبدال الملف الافتراضي.

</div>

> [!NOTE]
> **الفرق بين RouterOS v6 و RouterOS v7:**
> - في **RouterOS v6** يستخدم اليوزر مانجر مسار الأوامر `/tool user-manager` ويتطلب تثبيت حزمة `.npk` الخاصة به.
> - في **RouterOS v7** تم تحديث المسار إلى `/user-manager` مع دعم طوابير `CAKE` و `FQ-CoDel` لتحسين زمن الاستجابة (Bufferbloat).
> - يقوم السكربت المولّد تلقائياً بحقن قواعد استثناء **FastTrack** لضمان التزام جميع عملاء الهوتسبوت بحدود السرعة والبيرست دون تخطٍ.

---

<a id="english"></a>

## 🇬🇧 English Version

### Overview

**MikroTik Hotspot Master Script Generator** is a fast, fully client-side web application built with React and TypeScript that generates clean, production-ready **RouterOS v6 & v7** configuration scripts. It requires no backend server or API keys, automatically persists your configuration in browser `localStorage`, and provides a bilingual (Arabic / English) workspace with a live syntax-highlighted `.rsc` script editor and custom `login.html` portal builder.

---

### ✨ Key Features

| Module / Tab | Capabilities |
| :--- | :--- |
| **1. Network Setup** | Switch between RouterOS `v6` and `v7`, configure WAN/LAN interfaces, Gateway IP, Subnet Mask, DHCP Pool, DNS servers, and Hotspot login methods (`HTTP CHAP`, `HTTP PAP`, `MAC Auth`, `Cookie`, `Trial`). |
| **2. VLANs Setup** | Create and manage multiple VLANs with custom `VLAN ID`, parent interface, dedicated gateway/DHCP pools, and optional Hotspot deployment per VLAN. |
| **3. Multi-WAN Load Balancing** | Configure **PCC**, **NTH**, **ECMP**, or **Failover** across multiple WAN lines (`Static`, `DHCP`, `PPPoE`) with configurable PCC weights and HTTPS `Sticky Connections`. |
| **4. Speed & Burst Profiles** | Full bandwidth profile management including **Upload/Download Limits**, **Burst Rates & Thresholds**, Burst Time, Priority (`1-8`), Data Quotas (MB), Shared Users, Session/Idle/Keepalive timeouts, pricing, and validity. |
| **5. User Manager & RADIUS** | Automated RADIUS client & CoA (`3799`) setup, profile syncing to User Manager, built-in Voucher Batch Generator, and automatic command adaptation between `/tool user-manager` (v6) and `/user-manager` (v7). |
| **6. Security & Advanced** | Automatic **FastTrack bypass** rules for Hotspot queues, Firewall hardening (DNS amplification & brute-force protection), customizable **Walled Garden** domains (e.g., `*.whatsapp.com`), DNS cache tuning, ROS v7 `CAKE` / `FQ-CoDel` queues, nightly auto-clean, and scheduled reboot scripts. |
| **7. Login Page Template (`login.html`)** | Live interactive captive portal designer with custom title, subtitle, support phone, 4 built-in themes (Emerald, Royal Blue, Deep Purple, Dark Slate), Voucher & Username/Password tabs, CHAP `md5.js` support, Trial login link, and one-click `login.html` download. |
| **8. Live Script Editor & Guide** | Instant RouterOS syntax-highlighted output, one-click copy, `.rsc` file download, and a built-in step-by-step Winbox guide & FAQ. |

---

### 🛠️ Tech Stack

- **React 19** & **TypeScript 5.8**
- **Vite 6** for fast HMR and production bundling
- **Tailwind CSS v4** with responsive dark UI & full RTL/LTR support
- **Lucide React** icons

---

### 🚀 Quick Start & Local Installation

Make sure you have [Node.js](https://nodejs.org/) (v18+) installed, then run:

```bash
# 1. Clone the repository
git clone <YOUR_GITHUB_REPO_URL>
cd <YOUR_REPO_FOLDER>

# 2. Install dependencies
npm install

# 3. Start the development server (runs on port 3000)
npm run dev
```

Open your browser at `http://localhost:3000`.

#### Additional Scripts

```bash
# Type-check with TypeScript
npm run lint

# Build for production
npm run build

# Preview production build locally
npm run preview
```

---

### 📡 Applying the Script on MikroTik RouterOS

1. **Select Target Version**: Toggle **v6.x** or **v7.x** in the top bar to match your router.
2. **Configure Your Network**: Adjust network interfaces, VLANs, Multi-WAN load balancing, speed profiles, and RADIUS/User Manager settings.
3. **Export the Script**: Click **Copy Script** or **Download RSC** from the live script editor.
4. **Connect via Winbox**: Log in to your MikroTik router with administrator privileges.
5. **Execute the Script**:
   - **Option A (Paste in Terminal)**: Open **New Terminal**, right-click, and select **Paste**.
   - **Option B (Import `.rsc` File)**: Drag and drop the downloaded `.rsc` file into **Winbox → Files**, then run:

```routeros
/import file-name=hotspot_setup_v6_hotspot1.rsc
```

6. **Access User Manager**: Visit `http://<GATEWAY_IP>/userman` (e.g., `http://192.168.80.1/userman`) to generate and print client vouchers.

---

### 🎨 Uploading the Custom `login.html` Page

1. Open the **Login Page Template** tab inside the app.
2. Customize your network title, instructions, support phone number, and color theme while viewing the live preview.
3. Click **Download `login.html`**.
4. Open **Winbox → Files** (or connect via FTP).
5. Locate the **`hotspot`** directory (or `flash/hotspot` on routers with flash storage).
6. Drag and drop your downloaded **`login.html`** file into the `hotspot` folder to replace the default page.

> [!TIP]
> **Why Speed Limits Sometimes Don't Work Without FastTrack Bypass:**
> MikroTik's default `FastTrack Connection` firewall rule bypasses Simple Queues and Hotspot rate limits. Keep **Bypass FastTrack** enabled in the **Security & Advanced** tab so the generated script automatically excludes Hotspot traffic from FastTrack.

---

## 📄 License / الرخصة

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

هذا المشروع مرخّص بموجب **رخصة MIT** مفتوحة المصدر — يمكنك استخدامه وتعديله وتوزيعه بحرية وفق شروط ملف [LICENSE](./LICENSE).
