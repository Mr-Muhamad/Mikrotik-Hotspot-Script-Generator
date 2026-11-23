/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { BookOpen, Terminal, CheckCircle2, ChevronDown, ChevronUp, HelpCircle, Cpu } from "lucide-react";

interface Props {
  lang: "ar" | "en";
}

export default function InstructionGuide({ lang }: Props) {
  const isAr = lang === "ar";
  const [activeFAQ, setActiveFAQ] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setActiveFAQ(activeFAQ === index ? null : index);
  };

  const stepsAr = [
    {
      title: "الخطوة 1: اختيار إصدار الميكروتيك (RouterOS v6 أم v7)",
      desc: "تأكد من تحديد إصدار النظام المناسب لراوترك من تبويب 'إعدادات الشبكة'. نظام v7 يستخدم أوامر /user-manager بينما نظام v6 يستخدم /tool user-manager.",
    },
    {
      title: "الخطوة 2: نسخ السكربت المولد",
      desc: "اضغط على زر 'نسخ السكربت بالكامل' من واجهة المحرر على اليمين لنسخ كافة الأوامر البرمجية.",
    },
    {
      title: "الخطوة 3: تشغيل برنامج Winbox والولوج للراوتر",
      desc: "افتح برنامج Winbox وقم بالولوج إلى سيرفر الميكروتيك الخاص بك باستخدام عنوان MAC أو IP والمسؤول الرئيسي (Admin).",
    },
    {
      title: "الخطوة 4: فتح نافذة الأوامر (New Terminal)",
      desc: "من القائمة اليسرى في Winbox، اضغط على زر 'New Terminal' لفتح نافذة سطر الأوامر الخاصة بالميكروتيك.",
    },
    {
      title: "الخطوة 5: لصق السكربت بالكامل",
      desc: "اضغط بزر الفأرة الأيمن داخل الشاشة السوداء لسطر الأوامر واختر 'Paste' ولصق السكربت. انتظر بضع ثوانٍ حتى يتم تنفيذ كافة السطور تلقائياً بدون أخطاء.",
    },
    {
      title: "الخطوة 6: الدخول إلى واجهة ويب اليوزر مانجر",
      desc: "افتح متصفح الويب واكتب عنوان جيتواي الميكروتيك متبوعاً بـ /userman (مثال: http://192.168.80.1/userman) للبدء في توليد وطباعة كروت الشبكة.",
    }
  ];

  const stepsEn = [
    {
      title: "Step 1: Select RouterOS Version (v6 or v7)",
      desc: "In the Network Setup tab, choose RouterOS v6 or v7. ROS v7 uses new /user-manager commands, whereas v6 uses /tool user-manager.",
    },
    {
      title: "Step 2: Copy Generated Script",
      desc: "Click the 'Copy Full Script' button on the right-hand panel to copy all RouterOS commands.",
    },
    {
      title: "Step 3: Launch Winbox",
      desc: "Open Winbox and connect to your MikroTik router using its MAC Address or IP with an Admin account.",
    },
    {
      title: "Step 4: Open New Terminal",
      desc: "From the Winbox left menu, click 'New Terminal' to open the command line interface.",
    },
    {
      title: "Step 5: Paste and Execute",
      desc: "Right-click inside the terminal window and select 'Paste'. Wait a few seconds for all commands to run and execute successfully.",
    },
    {
      title: "Step 6: Access User Manager Web Portal",
      desc: "Open your web browser and navigate to http://[ROUTER_IP]/userman (e.g., http://192.168.80.1/userman). Log in to manage and print vouchers."
    }
  ];

  const faqsAr = [
    {
      q: "ما هو الفرق الرئيسي بين RouterOS v6 و RouterOS v7 في الهوتسبوت واليوزر مانجر؟",
      a: "في RouterOS v6 يتم استدعاء اليوزر مانجر باستخدام /tool user-manager وتتطلب تنصيب ملف .npk منفصل، بينما في RouterOS v7 أصبحت الخدمة مدمجة ومحدثة بالكامل تحت المسار /user-manager بشكل أسرع وأسهل."
    },
    {
      q: "لماذا لا يتم تحديد سرعة المشتركين حتى بعد تطبيق السكربت؟",
      a: "السبب الأكثر شيوعاً هو تفعيل ميزة 'FastTrack' في جدار الحماية (Firewall). يقوم FastTrack بتمرير الحزم مباشرة دون فحصها بواسطة طوابير التحكم بالسرعة (Queues). يشتمل السكربت المولد على قاعدتين لحل هذه المشكلة بتجاوز فاست تراك لعملاء الهوت سبوت."
    },
    {
      q: "ما فائدة البيرست (Burst Speed) المضافة في بروفايلات السرعة؟",
      a: "ميزة البيرست تمنح المشترك سرعة مضاعفة فائقة لأول بضع ثوانٍ من فتح المواقع لتصفح خفيف وسريع، ثم تعود السرعة للحد الأساسي حتى لا يستهلك المستخدم كامل الباندويث."
    },
    {
      q: "كيف تعمل قائمة Walled Garden؟",
      a: "تسمح قائمة Walled Garden بفتح نطاقات محددة (مثل *.whatsapp.com) للمستخدمين حتى قبل قيامهم بتسجيل الدخول، وهو أمر مفيد لتقديم شات الدعم أو خدمات الدفع الإلكتروني."
    }
  ];

  const faqsEn = [
    {
      q: "What is the key difference between RouterOS v6 and v7?",
      a: "In RouterOS v6, User Manager uses the '/tool user-manager' command space and requires a standalone .npk package. In RouterOS v7, User Manager uses the updated '/user-manager' tree and features improved speed and native multi-router handling."
    },
    {
      q: "Why are my speed limits not being enforced for users?",
      a: "The most common reason is the 'FastTrack Connection' rule inside IP -> Firewall -> Filter Rules. FastTrack bypasses standard packet queues. The generated script automatically injects exception rules to bypass FastTrack for Hotspot users."
    },
    {
      q: "How does the Burst Speed feature work?",
      a: "Burst rate temporarily grants users a high bandwidth spike (e.g. 10 Mbps) for the first few seconds of page loading, then smoothly throttles back to the baseline limit (e.g. 2 Mbps) to conserve main bandwidth."
    },
    {
      q: "What is the Walled Garden feature used for?",
      a: "Walled Garden permits users to browse specified domain names (e.g. payment portals, messaging apps like WhatsApp) even before they log in to the Hotspot."
    }
  ];

  const steps = isAr ? stepsAr : stepsEn;
  const faqs = isAr ? faqsAr : faqsEn;

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <div className="border-b border-slate-800 pb-4">
        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-400" />
          {isAr ? "دليل التثبيت والاستخدام خطوة بخطوة" : "Step-by-Step Installation Guide"}
        </h3>
        <p className="text-slate-400 text-sm mt-1">
          {isAr 
            ? "اتبع الإرشادات التالية لتطبيق السكربت على راوتر الميكروتيك وتشغيل شبكة الهوت سبوت بنجاح."
            : "Follow these simple steps to install the script on your MikroTik router and configure your Hotspot."}
        </p>
      </div>

      {/* Instructions list */}
      <div className="space-y-4">
        {steps.map((step, idx) => (
          <div key={idx} className="flex gap-4 bg-slate-900/30 border border-slate-800/80 rounded-xl p-4">
            <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 font-mono text-sm font-bold">
              {idx + 1}
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-slate-200">{step.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* FAQ / Troubleshooting section */}
      <div className="pt-4 border-t border-slate-800">
        <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
          <HelpCircle className="w-4 h-4 text-emerald-400" />
          {isAr ? "الأسئلة الشائعة وتوافق الإصدارات" : "Frequently Asked Questions & ROS Compatibility"}
        </h4>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = activeFAQ === idx;
            return (
              <div 
                key={idx} 
                className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900/10 hover:bg-slate-900/20 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleFAQ(idx)}
                  className="w-full flex justify-between items-center px-4 py-3 text-start text-xs font-medium text-slate-300 hover:text-slate-100 transition-colors"
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                </button>
                
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 text-xs text-slate-400 leading-relaxed border-t border-slate-800/40 bg-slate-900/30">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
