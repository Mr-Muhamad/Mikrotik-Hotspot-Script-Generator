/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import type { HotspotConfig } from "../types";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Computes lowercase hexadecimal MD5 over a Latin-1 raw byte string
 * (`charCodeAt(i) & 0xff`), matching RouterOS CHAP octal escapes.
 */
export function hexMD5(str: string): string {
  const len = str.length;
  const wordCount = (((len + 8) >> 6) + 1) * 16;
  const words = new Int32Array(wordCount);
  for (let i = 0; i < len; i++) {
    words[i >> 2] |= (str.charCodeAt(i) & 0xff) << ((i % 4) * 8);
  }
  words[len >> 2] |= 0x80 << ((len % 4) * 8);
  const bitLen = len * 8;
  words[wordCount - 2] = bitLen | 0;
  words[wordCount - 1] = Math.floor(bitLen / 0x100000000) | 0;

  const shifts = [
    [7, 12, 17, 22],
    [5, 9, 14, 20],
    [4, 11, 16, 23],
    [6, 10, 15, 21],
  ];

  let h0 = 0x67452301 | 0;
  let h1 = 0xefcdab89 | 0;
  let h2 = 0x98badcfe | 0;
  let h3 = 0x10325476 | 0;

  for (let offset = 0; offset < wordCount; offset += 16) {
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;

    for (let i = 0; i < 64; i++) {
      let f = 0;
      let g = 0;
      const round = i >> 4;
      if (round === 0) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (round === 1) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) % 16;
      } else if (round === 2) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) % 16;
      }

      const k = Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) | 0;
      const sum = (a + f + k + words[offset + g]) | 0;
      const s = shifts[round][i % 4];
      const rot = (sum << s) | (sum >>> (32 - s));
      a = d;
      d = c;
      c = b;
      b = (b + rot) | 0;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
  }

  return [h0, h1, h2, h3]
    .map((word) => {
      let out = "";
      for (let b = 0; b < 4; b++) {
        out += ((word >>> (b * 8)) & 0xff).toString(16).padStart(2, "0");
      }
      return out;
    })
    .join("");
}

const INLINE_MD5_RUNTIME =
  "(function(w){if(typeof w.hexMD5==='function')return;var S=[[7,12,17,22],[5,9,14,20],[4,11,16,23],[6,10,15,21]];w.hexMD5=function(s){var l=s.length,n=(((l+8)>>6)+1)*16,M=new Array(n),i,o,a,b,c,d,f,g,r,k,t,h0=1732584193,h1=-271733879,h2=-1732584194,h3=271733878;for(i=0;i<n;i++)M[i]=0;for(i=0;i<l;i++)M[i>>2]|=(s.charCodeAt(i)&255)<<((i%4)*8);M[l>>2]|=128<<((l%4)*8);M[n-2]=(l*8)|0;M[n-1]=Math.floor((l*8)/4294967296)|0;for(o=0;o<n;o+=16){a=h0;b=h1;c=h2;d=h3;for(i=0;i<64;i++){r=i>>4;if(r===0){f=(b&c)|((~b)&d);g=i;}else if(r===1){f=(d&b)|((~d)&c);g=(5*i+1)%16;}else if(r===2){f=b^c^d;g=(3*i+5)%16;}else{f=c^(b|(~d));g=(7*i)%16;}k=Math.floor(Math.abs(Math.sin(i+1))*4294967296)|0;t=(a+f+k+M[o+g])|0;a=d;d=c;c=b;b=(b+((t<<S[r][i%4])|(t>>>(32-S[r][i%4]))))|0;}h0=(h0+a)|0;h1=(h1+b)|0;h2=(h2+c)|0;h3=(h3+d)|0;}return [h0,h1,h2,h3].map(function(x){var q='',j,v;for(j=0;j<4;j++){v=((x>>>(j*8))&255).toString(16);q+=v.length<2?'0'+v:v;}return q;}).join('');};})(window);";

export function generateMd5JsFile(): string {
  return `// MikroTik Hotspot CHAP MD5 helper (Latin-1 byte semantics)\n${INLINE_MD5_RUNTIME}\n`;
}

export type PortalPageName = "login.html" | "status.html" | "logout.html" | "alogin.html";

export interface PortalThemeColors {
  primaryBg: string;
  accentColor: string;
  accentHover: string;
}

export function getPortalThemeColors(theme?: HotspotConfig["loginTheme"]): PortalThemeColors {
  if (theme === "blue") {
    return {
      primaryBg: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
      accentColor: "#3b82f6",
      accentHover: "#2563eb",
    };
  }
  if (theme === "purple") {
    return {
      primaryBg: "linear-gradient(135deg, #0f172a 0%, #4c1d95 100%)",
      accentColor: "#8b5cf6",
      accentHover: "#7c3aed",
    };
  }
  if (theme === "dark") {
    return {
      primaryBg: "linear-gradient(135deg, #020617 0%, #0f172a 100%)",
      accentColor: "#22c55e",
      accentHover: "#16a34a",
    };
  }
  return {
    primaryBg: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    accentColor: "#10b981",
    accentHover: "#059669",
  };
}

interface PortalMeta {
  isAr: boolean;
  title: string;
  subtitle: string;
  contact: string;
  telHref: string;
  dnsName: string;
  supportText: string;
  colors: PortalThemeColors;
}

function getPortalMeta(config: HotspotConfig, lang: "ar" | "en"): PortalMeta {
  const isAr = lang === "ar";
  const portalMode = config.portalLoginMode || "both";
  const defaultTitle = isAr ? "أهلاً بك في شبكة الواي فاي" : "Welcome to WiFi Hotspot";
  const defaultSubtitle = isAr
    ? (portalMode === "voucher_only"
        ? "أدخل رقم الكارت للاتصال بالإنترنت"
        : portalMode === "user_pass_only"
          ? "أدخل اسم المستخدم وكلمة المرور للاتصال بالإنترنت"
          : "سجل دخولك برقم الكارت أو بالحساب الشخصي للاتصال بالإنترنت")
    : (portalMode === "voucher_only"
        ? "Enter your voucher code to connect to the internet"
        : portalMode === "user_pass_only"
          ? "Sign in with your username and password to connect"
          : "Sign in with your voucher code or personal account to connect");
  const rawContact = config.contactPhone || "01000000000";

  return {
    isAr,
    title: escapeHtml(config.loginTitle || defaultTitle),
    subtitle: escapeHtml(config.loginSubtitle || defaultSubtitle),
    contact: escapeHtml(rawContact),
    telHref: rawContact.replace(/[^0-9+*#()-]/g, ""),
    dnsName: escapeHtml(config.dnsName || "hotspot.local"),
    supportText: isAr ? "للدعم الفني والاستفسار:" : "Technical Support:",
    colors: getPortalThemeColors(config.loginTheme),
  };
}

function renderPortalShell(params: {
  lang: "ar" | "en";
  meta: PortalMeta;
  pageTitle: string;
  headExtra?: string;
  extraStyles?: string;
  cardContent: string;
}): string {
  const { lang, meta, pageTitle, headExtra = "", extraStyles = "", cardContent } = params;
  const { isAr, colors, supportText, telHref, contact, dnsName } = meta;

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${isAr ? "rtl" : "ltr"}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    ${headExtra ? `${headExtra}\n    ` : ""}<title>${pageTitle} | ${dnsName}</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        }

        body {
            background: ${colors.primaryBg};
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            color: #f8fafc;
        }

        .login-card {
            background: rgba(30, 41, 59, 0.85);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            width: 100%;
            max-width: 400px;
            padding: 32px 24px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            text-align: center;
        }

        .logo-icon {
            width: 64px;
            height: 64px;
            background: ${colors.accentColor};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 16px auto;
            box-shadow: 0 10px 20px -5px ${colors.accentColor}80;
        }

        .logo-icon svg {
            width: 32px;
            height: 32px;
            fill: #ffffff;
        }

        h1 {
            font-size: 22px;
            font-weight: 700;
            margin-bottom: 8px;
            color: #ffffff;
        }

        p.subtitle {
            font-size: 13px;
            color: #94a3b8;
            margin-bottom: 24px;
            line-height: 1.5;
        }

        .submit-btn {
            width: 100%;
            padding: 14px;
            background: ${colors.accentColor};
            border: none;
            border-radius: 10px;
            color: #ffffff;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            transition: background 0.2s;
            margin-top: 8px;
            box-shadow: 0 4px 12px ${colors.accentColor}60;
            display: inline-block;
            text-decoration: none;
            text-align: center;
        }

        .submit-btn:hover {
            background: ${colors.accentHover};
        }

        .secondary-btn {
            width: 100%;
            padding: 12px;
            background: rgba(15, 23, 42, 0.75);
            border: 1px solid rgba(255, 255, 255, 0.16);
            border-radius: 10px;
            color: #e2e8f0;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s, border-color 0.2s;
            margin-top: 10px;
            display: inline-block;
            text-decoration: none;
            text-align: center;
        }

        .secondary-btn:hover {
            background: rgba(15, 23, 42, 0.95);
            border-color: ${colors.accentColor};
        }

        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 700;
            margin-bottom: 16px;
            background: rgba(16, 185, 129, 0.16);
            border: 1px solid rgba(16, 185, 129, 0.45);
            color: #6ee7b7;
        }

        .status-badge.logged-out {
            background: rgba(148, 163, 184, 0.16);
            border-color: rgba(148, 163, 184, 0.4);
            color: #cbd5e1;
        }

        .stats-list {
            background: rgba(15, 23, 42, 0.65);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 14px;
            padding: 8px 14px;
            margin-bottom: 20px;
            text-align: ${isAr ? "right" : "left"};
        }

        .stat-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 10px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.07);
            font-size: 13px;
        }

        .stat-row:last-child {
            border-bottom: none;
        }

        .stat-label {
            color: #94a3b8;
            font-weight: 500;
        }

        .stat-value {
            color: #f8fafc;
            font-weight: 700;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            direction: ltr;
        }

        .footer-info {
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            font-size: 12px;
            color: #94a3b8;
        }

        .footer-info a {
            color: ${colors.accentColor};
            text-decoration: none;
            font-weight: 600;
        }${extraStyles ? `\n${extraStyles}` : ""}
    </style>
</head>
<body>

    <div class="login-card">
        <div class="logo-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3C6.95 3 2.55 5.53 0 9.4L2.83 12.23C4.73 9.17 8.13 7.12 12 7.12C15.87 7.12 19.27 9.17 21.17 12.23L24 9.4C21.45 5.53 17.05 3 12 3ZM12 9C8.3 9 5.08 10.86 3.18 13.7L6 16.52C7.38 14.54 9.55 13.25 12 13.25C14.45 13.25 16.62 14.54 18 16.52L20.82 13.7C18.92 10.86 15.7 9 12 9ZM12 15C10 15 8.24 15.82 7 17.13L12 22.13L17 17.13C15.76 15.82 14 15 12 15Z"/>
            </svg>
        </div>

${cardContent}

        <div class="footer-info">
            ${supportText} <a href="tel:${telHref}">${contact}</a><br>
            <span>www.${dnsName}</span>
        </div>
    </div>

</body>
</html>`;
}

export function generateHotspotLoginPageHtml(config: HotspotConfig, lang: "ar" | "en" = "ar"): string {
  const meta = getPortalMeta(config, lang);
  const { isAr, title, subtitle, colors } = meta;
  const portalLoginMode = config.portalLoginMode || "both";
  const voucherPasswordMode = config.voucherPasswordMode || "same_as_user";
  const initialMode = portalLoginMode === "user_pass_only" ? "user" : "voucher";

  const labels = isAr
    ? {
        tabVoucher: "كارت الإتصال",
        tabUser: "اسم مستخدم وكلمة سر",
        voucherLabel: "رقم الكارت (Voucher Code)",
        voucherPlaceholder: "أدخل رقم الكارت هنا...",
        userLabel: "اسم المستخدم",
        userPlaceholder: "اسم المستخدم",
        passLabel: "كلمة المرور",
        passPlaceholder: "كلمة المرور",
        submitBtn: "تسجيل الدخول الآن",
        trialLink: "اضغط هنا لتجربة الإنترنت مجاناً",
      }
    : {
        tabVoucher: "Voucher Code",
        tabUser: "Username & Password",
        voucherLabel: "Voucher Code",
        voucherPlaceholder: "Enter voucher code...",
        userLabel: "Username",
        userPlaceholder: "Username",
        passLabel: "Password",
        passPlaceholder: "Password",
        submitBtn: "Sign In",
        trialLink: "Click here for Free Trial",
      };

  const extraStyles = `
        .error-msg {
            background: rgba(239, 68, 68, 0.2);
            border: 1px solid rgba(239, 68, 68, 0.4);
            color: #fca5a5;
            padding: 10px 14px;
            border-radius: 10px;
            font-size: 13px;
            margin-bottom: 20px;
        }${portalLoginMode === "both" ? `

        .tabs {
            display: flex;
            background: rgba(15, 23, 42, 0.6);
            border-radius: 12px;
            padding: 4px;
            margin-bottom: 20px;
        }

        .tab-btn {
            flex: 1;
            padding: 8px 12px;
            border: none;
            background: transparent;
            color: #94a3b8;
            font-size: 13px;
            font-weight: 600;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .tab-btn.active {
            background: ${colors.accentColor};
            color: #ffffff;
        }` : ""}

        .input-group {
            margin-bottom: 16px;
            text-align: ${isAr ? "right" : "left"};
        }

        .input-group label {
            display: block;
            font-size: 12px;
            font-weight: 600;
            color: #cbd5e1;
            margin-bottom: 6px;
        }

        .input-field {
            width: 100%;
            padding: 12px 16px;
            background: rgba(15, 23, 42, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 10px;
            color: #ffffff;
            font-size: 14px;
            outline: none;
            transition: border-color 0.2s;
            direction: ltr;
            text-align: center;
        }

        .input-field:focus {
            border-color: ${colors.accentColor};
            box-shadow: 0 0 0 2px ${colors.accentColor}40;
        }`;

  const tabsHtml =
    portalLoginMode === "both"
      ? `\n        <div class="tabs" role="tablist">
            <button type="button" role="tab" aria-selected="true" class="tab-btn active" id="tabVoucher" onclick="switchTab('voucher')">${labels.tabVoucher}</button>
            <button type="button" role="tab" aria-selected="false" class="tab-btn" id="tabUser" onclick="switchTab('user')">${labels.tabUser}</button>
        </div>\n`
      : "";

  const switchTabScript =
    portalLoginMode === "both"
      ? `\n            function switchTab(mode) {
                document.getElementById('loginMode').value = mode;
                var voucherInput = document.getElementById('voucherCode');
                var usernameInput = document.getElementById('usernameInput');
                var tabVoucher = document.getElementById('tabVoucher');
                var tabUser = document.getElementById('tabUser');
                if (mode === 'voucher') {
                    tabVoucher.classList.add('active');
                    tabUser.classList.remove('active');
                    tabVoucher.setAttribute('aria-selected', 'true');
                    tabUser.setAttribute('aria-selected', 'false');
                    document.getElementById('voucherGroup').style.display = 'block';
                    document.getElementById('userPassGroup').style.display = 'none';
                    voucherInput.required = true;
                    usernameInput.required = false;
                } else {
                    tabUser.classList.add('active');
                    tabVoucher.classList.remove('active');
                    tabUser.setAttribute('aria-selected', 'true');
                    tabVoucher.setAttribute('aria-selected', 'false');
                    document.getElementById('voucherGroup').style.display = 'none';
                    document.getElementById('userPassGroup').style.display = 'block';
                    voucherInput.required = false;
                    usernameInput.required = true;
                }
            }`
      : "";

  const voucherPasswordAssignment = voucherPasswordMode === "blank" ? "''" : "vCode";

  const formFieldsHtml =
    portalLoginMode === "voucher_only"
      ? `            <div id="voucherGroup" class="input-group">
                <label for="voucherCode">${labels.voucherLabel}</label>
                <input type="text" id="voucherCode" class="input-field" placeholder="${labels.voucherPlaceholder}" required autocomplete="off">
            </div>`
      : portalLoginMode === "user_pass_only"
        ? `            <div id="userPassGroup" class="input-group">
                <label for="usernameInput">${labels.userLabel}</label>
                <input type="text" id="usernameInput" class="input-field" placeholder="${labels.userPlaceholder}" style="margin-bottom: 12px;" required autocomplete="username">
                
                <label for="passwordInput">${labels.passLabel}</label>
                <input type="password" id="passwordInput" class="input-field" placeholder="${labels.passPlaceholder}" autocomplete="current-password">
            </div>`
        : `            <div id="voucherGroup" class="input-group">
                <label for="voucherCode">${labels.voucherLabel}</label>
                <input type="text" id="voucherCode" class="input-field" placeholder="${labels.voucherPlaceholder}" required autocomplete="off">
            </div>

            <div id="userPassGroup" class="input-group" style="display: none;">
                <label for="usernameInput">${labels.userLabel}</label>
                <input type="text" id="usernameInput" class="input-field" placeholder="${labels.userPlaceholder}" style="margin-bottom: 12px;" autocomplete="username">
                
                <label for="passwordInput">${labels.passLabel}</label>
                <input type="password" id="passwordInput" class="input-field" placeholder="${labels.passPlaceholder}" autocomplete="current-password">
            </div>`;

  const cardContent = `        <h1>${title}</h1>
        <p class="subtitle">${subtitle}</p>

        $(if error)
        <div class="error-msg">
            $(error)
        </div>
        $(endif)
${tabsHtml}
        <form name="sendin" action="$(link-login-only)" method="post">
            <input type="hidden" name="username" />
            <input type="hidden" name="password" />
            <input type="hidden" name="dst" value="$(link-orig)" />
            <input type="hidden" name="popup" value="true" />
        </form>

        <script type="text/javascript" src="/md5.js"></script>
        <script type="text/javascript">
        <!--
            ${INLINE_MD5_RUNTIME}
            function doLogin() {
                var form = document.sendin;
                var mode = document.getElementById('loginMode').value;
                if (mode === 'voucher') {
                    var vCode = document.getElementById('voucherCode').value.trim();
                    if (!vCode) {
                        return false;
                    }
                    form.username.value = vCode;
                    form.password.value = ${voucherPasswordAssignment};
                } else {
                    var uName = document.getElementById('usernameInput').value.trim();
                    if (!uName) {
                        return false;
                    }
                    form.username.value = uName;
                    form.password.value = document.getElementById('passwordInput').value;
                }
                $(if chap-id)
                form.password.value = hexMD5('$(chap-id)' + form.password.value + '$(chap-challenge)');
                $(endif)
                form.submit();
                return false;
            }${switchTabScript}
        //-->
        </script>

        <input type="hidden" id="loginMode" value="${initialMode}">

        <form onSubmit="return doLogin();">
${formFieldsHtml}

            <button type="submit" class="submit-btn">${labels.submitBtn}</button>
        </form>

        $(if trial == 'yes')
        <div style="margin-top: 14px;">
            <a href="$(link-login-only)?dst=$(link-orig-esc)&amp;username=T-$(mac-esc)" style="color: ${colors.accentColor}; font-size: 13px; font-weight: 600; text-decoration: none;">
                ${labels.trialLink}
            </a>
        </div>
        $(endif)`;

  return renderPortalShell({
    lang,
    meta,
    pageTitle: title,
    extraStyles,
    cardContent,
  });
}

export function generateHotspotStatusPageHtml(config: HotspotConfig, lang: "ar" | "en" = "ar"): string {
  const meta = getPortalMeta(config, lang);
  const { isAr, title } = meta;

  const labels = isAr
    ? {
        pageLabel: "حالة الاتصال",
        connectedBadge: "متصل بالإنترنت",
        subtitle: "تفاصيل جلستك الحالية واستهلاك الباقة",
        username: "اسم المستخدم / الكارت",
        ip: "عنوان IP",
        uptime: "مدة الاتصال",
        timeLeft: "الوقت المتبقي",
        traffic: "الرفع / التحميل",
        remainQuota: "الرصيد المتبقي",
        disconnectBtn: "تسجيل الخروج (Disconnect)",
      }
    : {
        pageLabel: "Connection Status",
        connectedBadge: "Connected",
        subtitle: "Current active session and usage details",
        username: "Username / Voucher",
        ip: "IP Address",
        uptime: "Connected Time",
        timeLeft: "Time Left",
        traffic: "Upload / Download",
        remainQuota: "Remaining Quota",
        disconnectBtn: "Disconnect",
      };

  const extraStyles = `
        .danger-btn {
            background: #ef4444;
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35);
        }
        .danger-btn:hover {
            background: #dc2626;
        }`;

  const cardContent = `        <div class="status-badge">${labels.connectedBadge}</div>
        <h1>${title}</h1>
        <p class="subtitle">${labels.subtitle}</p>

        <div class="stats-list">
            <div class="stat-row">
                <span class="stat-label">${labels.username}</span>
                <span class="stat-value">$(username)</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">${labels.ip}</span>
                <span class="stat-value">$(ip)</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">${labels.uptime}</span>
                <span class="stat-value">$(uptime)</span>
            </div>
            $(if session-time-left)
            <div class="stat-row">
                <span class="stat-label">${labels.timeLeft}</span>
                <span class="stat-value">$(session-time-left)</span>
            </div>
            $(endif)
            <div class="stat-row">
                <span class="stat-label">${labels.traffic}</span>
                <span class="stat-value">$(bytes-in-nice) / $(bytes-out-nice)</span>
            </div>
            $(if remain-bytes-total)
            <div class="stat-row">
                <span class="stat-label">${labels.remainQuota}</span>
                <span class="stat-value">$(remain-bytes-total-nice)</span>
            </div>
            $(endif)
        </div>

        <form action="$(link-logout)" name="logout" method="post">
            <input type="hidden" name="erase-cookie" value="on" />
            <button type="submit" class="submit-btn danger-btn">${labels.disconnectBtn}</button>
        </form>`;

  return renderPortalShell({
    lang,
    meta,
    pageTitle: `${title} - ${labels.pageLabel}`,
    headExtra: '$(if refresh-timeout)<meta http-equiv="refresh" content="$(refresh-timeout-secs)">$(endif)',
    extraStyles,
    cardContent,
  });
}

export function generateHotspotLogoutPageHtml(config: HotspotConfig, lang: "ar" | "en" = "ar"): string {
  const meta = getPortalMeta(config, lang);
  const { isAr, title } = meta;

  const labels = isAr
    ? {
        pageLabel: "تم تسجيل الخروج",
        badge: "تم قطع الاتصال",
        subtitle: "تم إنهاء جلستك بنجاح. يمكنك إعادة الاتصال في أي وقت.",
        username: "اسم المستخدم / الكارت",
        uptime: "إجمالي وقت الجلسة",
        traffic: "الرفع / التحميل",
        reconnectBtn: "إعادة الاتصال (Reconnect)",
      }
    : {
        pageLabel: "Logged Out",
        badge: "Disconnected",
        subtitle: "Your session has ended cleanly. You can reconnect at any time.",
        username: "Username / Voucher",
        uptime: "Session Uptime",
        traffic: "Upload / Download",
        reconnectBtn: "Reconnect",
      };

  const cardContent = `        <div class="status-badge logged-out">${labels.badge}</div>
        <h1>${title}</h1>
        <p class="subtitle">${labels.subtitle}</p>

        <div class="stats-list">
            <div class="stat-row">
                <span class="stat-label">${labels.username}</span>
                <span class="stat-value">$(username)</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">${labels.uptime}</span>
                <span class="stat-value">$(uptime)</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">${labels.traffic}</span>
                <span class="stat-value">$(bytes-in-nice) / $(bytes-out-nice)</span>
            </div>
        </div>

        <form action="$(link-login)" name="login" method="get">
            <button type="submit" class="submit-btn">${labels.reconnectBtn}</button>
        </form>`;

  return renderPortalShell({
    lang,
    meta,
    pageTitle: `${title} - ${labels.pageLabel}`,
    cardContent,
  });
}

export function generateHotspotAloginPageHtml(config: HotspotConfig, lang: "ar" | "en" = "ar"): string {
  const meta = getPortalMeta(config, lang);
  const { isAr, title } = meta;

  const labels = isAr
    ? {
        pageLabel: "تم تسجيل الدخول",
        badge: "تم التحقق بنجاح",
        heading: "تم تسجيل الدخول بنجاح!",
        subtitle: "أنت الآن متصل بالإنترنت. جاري تحويلك تلقائياً خلال لحظات...",
        continueBtn: "متابعة التصفح الآن",
        statusBtn: "عرض حالة الاتصال",
      }
    : {
        pageLabel: "Login Successful",
        badge: "Authenticated",
        heading: "Login Successful!",
        subtitle: "You are now connected to the internet. Redirecting automatically...",
        continueBtn: "Continue Browsing",
        statusBtn: "Open Connection Status",
      };

  const cardContent = `        <div class="status-badge">${labels.badge}</div>
        <h1>${labels.heading}</h1>
        <p class="subtitle">${labels.subtitle}</p>

        <a href="$(link-redirect)" class="submit-btn">${labels.continueBtn}</a>
        <a href="$(link-status)" class="secondary-btn">${labels.statusBtn}</a>`;

  return renderPortalShell({
    lang,
    meta,
    pageTitle: `${title} - ${labels.pageLabel}`,
    headExtra: '<meta http-equiv="refresh" content="2; url=$(link-redirect)">',
    cardContent,
  });
}

export function generateHotspotPortalFiles(
  config: HotspotConfig,
  lang: "ar" | "en" = "ar"
): Record<PortalPageName | "md5.js", string> {
  return {
    "login.html": generateHotspotLoginPageHtml(config, lang),
    "status.html": generateHotspotStatusPageHtml(config, lang),
    "logout.html": generateHotspotLogoutPageHtml(config, lang),
    "alogin.html": generateHotspotAloginPageHtml(config, lang),
    "md5.js": generateMd5JsFile(),
  };
}
