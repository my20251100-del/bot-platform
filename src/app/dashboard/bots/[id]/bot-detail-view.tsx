"use client";

import { useState } from "react";
import BotConnect from "./bot-connect";
import BotSettings from "./bot-settings";

type Props = {
  bot: any;
  isLinked: boolean;
};

export default function BotDetailView({ bot, isLinked }: Props) {
  const [activeTab, setActiveTab] = useState<"connect" | "automation" | "ai" | "security" | "logs">("connect");

  const tabs = [
    { id: "connect", label: "الاتصال والربط", icon: "🔗" },
    { id: "automation", label: "الأتمتة والحالات", icon: "⚡" },
    { id: "ai", label: "الذكاء الاصطناعي", icon: "🧠" },
    { id: "security", label: "أمان المجموعات", icon: "🛡️" },
    { id: "logs", label: "سجل العمليات", icon: "📜" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* شريط التبويبات المتطورة على طريقة Red Queen وبألوان السايبربانك */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 p-1.5 bg-surface/60 border border-border/80 rounded-2xl backdrop-blur-md">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                active
                  ? "bg-accent text-accent-fg shadow-[0_0_15px_rgba(0,212,255,0.3)] scale-[1.02]"
                  : "text-muted hover:text-white hover:bg-elevated/50"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* التبويب 1: لوحة الربط والاتصال */}
      {activeTab === "connect" && (
        <div className="space-y-6">
          <BotConnect
            initial={{
              id: bot.id,
              status: bot.status,
              command: bot.command,
              link_method: bot.link_method,
              pair_code: bot.pair_code,
              qr: bot.qr,
              linked_number: bot.linked_number,
              phone: bot.phone,
            }}
          />

          {!isLinked && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-200 flex items-start gap-4">
              <span className="text-2xl">💡</span>
              <div className="space-y-1">
                <p className="font-bold text-base">نصيحة الربط السريع:</p>
                <p className="text-xs text-amber-200/90 leading-relaxed">
                  أدخل رقم هاتفك مع مفتاح الدولة (مثل 96777xxxxxxx) واضغط بدء، سيظهر لك كود مكوّن من 8 حروف.
                  أدخله فوراً في تطبيق واتساب بجوالك (الأجهزة المرتبطة ← ربط برقم الهاتف) ليرتبط البوت مباشرة بدون مسح كاميرا.
                </p>
              </div>
            </div>
          )}

          {/* بطاقات الميزات السريعة */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card p-4 border-accent/20 bg-surface/40 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-xl text-accent">⚡</div>
              <div>
                <p className="text-xs text-muted">الرد التلقائي</p>
                <p className="text-sm font-bold text-fg">{bot.settings?.autoReply ? "مفعّل ✓" : "معطّل"}</p>
              </div>
            </div>
            <div className="card p-4 border-accent/20 bg-surface/40 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-xl text-accent">❤️</div>
              <div>
                <p className="text-xs text-muted">تفاعل الحالات</p>
                <p className="text-sm font-bold text-fg">{bot.settings?.autoReactStatus ? "مفعّل (قلب) ✓" : "معطّل"}</p>
              </div>
            </div>
            <div className="card p-4 border-accent/20 bg-surface/40 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-xl text-accent">🛡️</div>
              <div>
                <p className="text-xs text-muted">مضاد الحذف</p>
                <p className="text-sm font-bold text-fg">{bot.settings?.antiDelete ? "مفعّل ✓" : "معطّل"}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* التبويب 2، 3، 4: إعدادات الأتمتة والذكاء الاصطناعي والأمان */}
      {(activeTab === "automation" || activeTab === "ai" || activeTab === "security") && (
        <BotSettings
          botId={bot.id}
          activeCategory={activeTab}
          initial={{
            autoReply: bot.settings?.autoReply ?? false,
            autoReplyMessage: bot.settings?.autoReplyMessage ?? "",
            antiDelete: bot.settings?.antiDelete ?? false,
            autoViewStatus: bot.settings?.autoViewStatus ?? false,
            autoReactStatus: bot.settings?.autoReactStatus ?? false,
            antiViewOnce: bot.settings?.antiViewOnce ?? false,
            autoReact: bot.settings?.autoReact ?? false,
            reactEmoji: bot.settings?.reactEmoji ?? "❤️",
            privacyMode: bot.settings?.privacyMode ?? false,
            contactAutoSave: bot.settings?.contactAutoSave ?? false,
            welcomeGroups: bot.settings?.welcomeGroups ?? false,
            welcomeMessage: bot.settings?.welcomeMessage ?? "",
            farewellGroups: bot.settings?.farewellGroups ?? false,
            farewellMessage: bot.settings?.farewellMessage ?? "",
            smartReply: bot.settings?.smartReply ?? false,
            businessInfo: bot.settings?.businessInfo ?? "",
            autoForward: bot.settings?.autoForward ?? false,
            forwardSource: bot.settings?.forwardSource ?? "",
            forwardTargets: bot.settings?.forwardTargets ?? "",
            firewallOn: bot.settings?.firewallOn ?? false,
            firewallDomains: Array.isArray(bot.settings?.firewallDomains) ? bot.settings.firewallDomains : [],
            dictionaryOn: bot.settings?.dictionaryOn ?? false,
            bannedWords: Array.isArray(bot.settings?.bannedWords) ? bot.settings.bannedWords : [],
            rejectCalls: bot.settings?.rejectCalls ?? false,
            showOnline: bot.settings?.showOnline ?? false,
            antiEdit: bot.settings?.antiEdit ?? false,
            antiMention: bot.settings?.antiMention ?? false,
            workMode: bot.settings?.workMode ?? "public",
          }}
        />
      )}

      {/* التبويب 5: السجل والنشاط */}
      {activeTab === "logs" && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-fg">سجل عمليات وأنشطة البوت</h3>
            <a
              href={`/dashboard/bots/${bot.id}/logs`}
              className="btn-primary !py-1.5 !px-3 text-xs"
            >
              عرض السجل الكامل التفصيلي ↗
            </a>
          </div>
          <p className="text-sm text-muted">
            يتم تسجيل كافة أحداث الاتصال، الردود الذكية، الرسائل المحذوفة المسترجعة، وتفاعلات الحالات أولاً بأول.
          </p>
          <div className="rounded-xl border border-border/60 bg-surface/50 p-4 text-center py-8">
            <p className="text-sm text-muted">سجل النشاط يعمل لحظياً مع محرك البوت السحابي.</p>
          </div>
        </div>
      )}
    </div>
  );
}
