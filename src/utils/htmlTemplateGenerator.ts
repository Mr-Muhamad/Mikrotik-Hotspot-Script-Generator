/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HotspotConfig } from "../types";

export function generateHotspotLoginPageHtml(config: HotspotConfig): string {
  const title = config.loginTitle || "أهلاً بك في شبكة الواي فاي";
  const subtitle = config.loginSubtitle || "سجل دخولك بالرقم الكارت أو بالحساب الشخصي للاتصال بالإنترنت";
  const contact = config.contactPhone || "01000000000";
  const dnsName = config.dnsName || "hotspot.local";

  let primaryBg = "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)";
  let accentColor = "#10b981";
  let accentHover = "#059669";

  if (config.loginTheme === "blue") {
    primaryBg = "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)";
    accentColor = "#3b82f6";
    accentHover = "#2563eb";
  } else if (config.loginTheme === "purple") {
    primaryBg = "linear-gradient(135deg, #0f172a 0%, #4c1d95 100%)";
    accentColor = "#8b5cf6";
    accentHover = "#7c3aed";
  } else if (config.loginTheme === "dark") {
    primaryBg = "linear-gradient(135deg, #020617 0%, #0f172a 100%)";
    accentColor = "#22c55e";
    accentHover = "#16a34a";
  }

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${title} | ${dnsName}</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        }

        body {
            background: ${primaryBg};
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
            background: ${accentColor};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 16px auto;
            box-shadow: 0 10px 20px -5px ${accentColor}80;
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

        .error-msg {
            background: rgba(239, 68, 68, 0.2);
            border: 1px solid rgba(239, 68, 68, 0.4);
            color: #fca5a5;
            padding: 10px 14px;
            border-radius: 10px;
            font-size: 13px;
            margin-bottom: 20px;
        }

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
            background: ${accentColor};
            color: #ffffff;
        }

        .input-group {
            margin-bottom: 16px;
            text-align: right;
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
            border-color: ${accentColor};
        }

        .submit-btn {
            width: 100%;
            padding: 14px;
            background: ${accentColor};
            border: none;
            border-radius: 10px;
            color: #ffffff;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            transition: background 0.2s;
            margin-top: 8px;
            box-shadow: 0 4px 12px ${accentColor}60;
        }

        .submit-btn:hover {
            background: ${accentHover};
        }

        .footer-info {
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            font-size: 12px;
            color: #64748b;
        }

        .footer-info a {
            color: ${accentColor};
            text-decoration: none;
            font-weight: 600;
        }
    </style>
</head>
<body>

    <div class="login-card">
        <div class="logo-icon">
            <svg viewBox="0 0 24 24">
                <path d="M12 3C6.95 3 2.55 5.53 0 9.4L2.83 12.23C4.73 9.17 8.13 7.12 12 7.12C15.87 7.12 19.27 9.17 21.17 12.23L24 9.4C21.45 5.53 17.05 3 12 3ZM12 9C8.3 9 5.08 10.86 3.18 13.7L6 16.52C7.38 14.54 9.55 13.25 12 13.25C14.45 13.25 16.62 14.54 18 16.52L20.82 13.7C18.92 10.86 15.7 9 12 9ZM12 15C10 15 8.24 15.82 7 17.13L12 22.13L17 17.13C15.76 15.82 14 15 12 15Z"/>
            </svg>
        </div>

        <h1>${title}</h1>
        <p class="subtitle">${subtitle}</p>

        $(if error)
        <div class="error-msg">
            $(error)
        </div>
        $(endif)

        <div class="tabs">
            <button type="button" class="tab-btn active" id="tabVoucher" onclick="switchTab('voucher')">كارت الإتصال</button>
            <button type="button" class="tab-btn" id="tabUser" onclick="switchTab('user')">اسم مستخدم وكلمة سر</button>
        </div>

        <form name="sendin" action="$(link-login-only)" method="post">
            <input type="hidden" name="username" />
            <input type="hidden" name="password" />
            <input type="hidden" name="dst" value="$(link-orig)" />
            <input type="hidden" name="popup" value="true" />
        </form>

        <script type="text/javascript" src="/md5.js"></script>
        <script type="text/javascript">
        <!--
            function doLogin() {
                var form = document.sendin;
                var mode = document.getElementById('loginMode').value;
                if (mode === 'voucher') {
                    var vCode = document.getElementById('voucherCode').value;
                    form.username.value = vCode;
                    form.password.value = vCode;
                } else {
                    form.username.value = document.getElementById('usernameInput').value;
                    form.password.value = document.getElementById('passwordInput').value;
                }
                $(if chap-id)
                if (form.password.value.length > 0) {
                    form.password.value = hexMD5('$(chap-id)' + form.password.value + '$(chap-challenge)');
                }
                $(endif)
                form.submit();
                return false;
            }

            function switchTab(mode) {
                document.getElementById('loginMode').value = mode;
                if (mode === 'voucher') {
                    document.getElementById('tabVoucher').classList.add('active');
                    document.getElementById('tabUser').classList.remove('active');
                    document.getElementById('voucherGroup').style.display = 'block';
                    document.getElementById('userPassGroup').style.display = 'none';
                } else {
                    document.getElementById('tabUser').classList.add('active');
                    document.getElementById('tabVoucher').classList.remove('active');
                    document.getElementById('voucherGroup').style.display = 'none';
                    document.getElementById('userPassGroup').style.display = 'block';
                }
            }
        //-->
        </script>

        <input type="hidden" id="loginMode" value="voucher">

        <form onSubmit="return doLogin();">
            <div id="voucherGroup" class="input-group">
                <label for="voucherCode">رقم الكارت (Voucher Code)</label>
                <input type="text" id="voucherCode" class="input-field" placeholder="أدخل رقم الكارت هنا..." required autocomplete="off">
            </div>

            <div id="userPassGroup" class="input-group" style="display: none;">
                <label for="usernameInput">اسم المستخدم</label>
                <input type="text" id="usernameInput" class="input-field" placeholder="اسم المستخدم" style="margin-bottom: 12px;">
                
                <label for="passwordInput">كلمة المرور</label>
                <input type="password" id="passwordInput" class="input-field" placeholder="كلمة المرور">
            </div>

            <button type="submit" class="submit-btn">تسجيل الدخول الأن</button>
        </form>

        $(if trial == 'yes')
        <div style="margin-top: 14px;">
            <a href="$(link-login-only)?dst=$(link-orig-esc)&amp;username=T-$(mac-esc)" style="color: ${accentColor}; font-size: 13px; font-weight: 600; text-decoration: none;">
                اضغط هنا لتجربة الإنترنت مجاناً
            </a>
        </div>
        $(endif)

        <div class="footer-info">
            للدعم الفني والاستفسار: <a href="tel:${contact}">${contact}</a><br>
            <span>www.${dnsName}</span>
        </div>
    </div>

</body>
</html>`;
}
