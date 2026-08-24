"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/useTranslation";

const REPLACES = [
  { name: "IRCTC", icon: "🚂" },
  { name: "RedBus", icon: "🚌" },
  { name: "MakeMyTrip", icon: "✈️" },
  { name: "OYO", icon: "🏨" },
  { name: "TripAdvisor", icon: "⭐" },
  { name: "PNR Apps", icon: "🎟️" },
  { name: "Google Maps", icon: "🗺️" },
];

export default function Home() {
  const { t } = useTranslation();

  const STEPS = [
    { number: "01", title: t("landing.step1Title"), desc: t("landing.step1Desc") },
    { number: "02", title: t("landing.step2Title"), desc: t("landing.step2Desc") },
    { number: "03", title: t("landing.step3Title"), desc: t("landing.step3Desc") },
  ];

  const FEATURES = [
    { icon: "🤖", title: t("landing.feature1Title"), description: t("landing.feature1Desc"), gradient: "from-indigo-500 to-violet-500" },
    { icon: "🚂", title: t("landing.feature2Title"), description: t("landing.feature2Desc"), gradient: "from-blue-500 to-cyan-500" },
    { icon: "🛕", title: t("landing.feature3Title"), description: t("landing.feature3Desc"), gradient: "from-orange-400 to-amber-500" },
    { icon: "🎟️", title: t("landing.feature4Title"), description: t("landing.feature4Desc"), gradient: "from-green-500 to-teal-500" },
    { icon: "📊", title: t("landing.feature5Title"), description: t("landing.feature5Desc"), gradient: "from-pink-500 to-rose-500" },
    { icon: "🪔", title: t("landing.feature6Title"), description: t("landing.feature6Desc"), gradient: "from-yellow-400 to-orange-500" },
  ];

  return (
    <div className="-mt-10">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="-mx-4 sm:-mx-6 bg-gradient-to-br from-indigo-900 via-indigo-700 to-violet-700 px-4 sm:px-6 py-20 text-center relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full bg-violet-300 blur-3xl" />
        </div>

        <div className="relative space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/90 text-sm font-medium backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            {t("landing.badge")}
          </div>

          <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tight leading-tight">
            {t("landing.heroTitle1")}<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400">
              {t("landing.heroTitle2")}
            </span>
          </h1>

          <p className="text-xl text-indigo-200 font-medium">
            {t("landing.heroTagline")}
          </p>

          <p className="text-indigo-200/80 max-w-xl mx-auto text-base leading-relaxed">
            {t("landing.heroDesc")}
          </p>

          <div className="flex items-center justify-center gap-4 pt-2">
            <Link
              href="/trips/new"
              className="px-8 py-3.5 bg-white text-indigo-700 font-bold rounded-xl hover:bg-indigo-50 transition-colors shadow-lg text-sm"
            >
              {t("landing.startPlanning")}
            </Link>
            <Link
              href="/trips"
              className="px-8 py-3.5 bg-white/10 text-white font-semibold rounded-xl border border-white/20 hover:bg-white/20 transition-colors text-sm backdrop-blur-sm"
            >
              {t("landing.viewMyTrips")}
            </Link>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 pt-6 border-t border-white/10">
            {[
              { value: "7", label: t("landing.statsAppsReplaced") },
              { value: "AI", label: t("landing.statsSmartPlanning") },
              { value: "India", label: t("landing.statsIndiaFirst") },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-xs text-indigo-300 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Replaces 7 apps ───────────────────────────────────────────────── */}
      <section className="py-12 text-center space-y-6">
        <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest">{t("landing.replacesHeading")}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {REPLACES.map((app) => (
            <div
              key={app.name}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-100 shadow-sm text-sm text-gray-500 relative"
            >
              <span>{app.icon}</span>
              <span className="font-medium">{app.name}</span>
              <div className="absolute inset-0 flex items-center px-4">
                <div className="w-full h-px bg-red-400 opacity-60" />
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-xl text-sm text-white font-bold shadow-md">
            <span>✈️</span>
            <span>Planora ✓</span>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="-mx-4 sm:-mx-6 bg-gray-900 px-4 sm:px-6 py-16">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black text-white">{t("landing.howItWorksHeading")}</h2>
            <p className="text-gray-400">{t("landing.howItWorksSub")}</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {STEPS.map((step) => (
              <div key={step.number} className="relative bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3">
                <p className="text-4xl font-black text-indigo-400/40">{step.number}</p>
                <h3 className="text-lg font-bold text-white">{step.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section className="py-16 space-y-10">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-gray-900">{t("landing.featuresHeading")}</h2>
          <p className="text-gray-500">{t("landing.featuresSub")}</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-6 space-y-4 group"
            >
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center text-2xl shadow-sm`}>
                {f.icon}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">{f.title}</h3>
                <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="-mx-4 sm:-mx-6 bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 px-4 sm:px-6 py-16 text-center space-y-6">
        <h2 className="text-4xl font-black text-white">
          {t("landing.ctaHeading")}
        </h2>
        <p className="text-white/80 max-w-md mx-auto">
          {t("landing.ctaDesc")}
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/trips/new"
            className="px-8 py-4 bg-white text-orange-600 font-black rounded-xl hover:bg-orange-50 transition-colors shadow-lg text-base"
          >
            {t("landing.ctaPlanTrip")}
          </Link>
          <Link
            href="/pnr"
            className="px-8 py-4 bg-white/15 text-white font-semibold rounded-xl border border-white/30 hover:bg-white/25 transition-colors text-base"
          >
            {t("landing.ctaCheckPnr")}
          </Link>
        </div>
      </section>

    </div>
  );
}
