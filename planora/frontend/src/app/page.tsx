import Link from "next/link";

const FEATURES = [
  {
    icon: "🤖",
    title: "AI-Powered Itineraries",
    description: "Builds your day-by-day plan with actual train timings, hotel rates, and local autos — not generic suggestions.",
    gradient: "from-indigo-500 to-violet-500",
  },
  {
    icon: "🚂",
    title: "Real Train Timings",
    description: "Finds actual departure and arrival times before generating your plan. No more guessing.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: "🛕",
    title: "Pilgrimage Mode",
    description: "Dedicated flow for Tirupati, Shirdi, Varanasi, Char Dham — with darshan types, temple timings, and dharmashalas.",
    gradient: "from-orange-400 to-amber-500",
  },
  {
    icon: "🎟️",
    title: "PNR Status Tracker",
    description: "Enter your PNR and get live passenger status, coach, berth number — CNF, WL, RAC — all in one place.",
    gradient: "from-green-500 to-teal-500",
  },
  {
    icon: "📊",
    title: "Budget Tracker",
    description: "Visual spend breakdown by category — transport, hotel, food, sightseeing — so you never overspend.",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    icon: "🪔",
    title: "Festival Surge Alerts",
    description: "Auto-detects Diwali, Holi, Navratri, Rath Yatra from your travel dates and warns you to book early.",
    gradient: "from-yellow-400 to-orange-500",
  },
];

const REPLACES = [
  { name: "IRCTC", icon: "🚂" },
  { name: "RedBus", icon: "🚌" },
  { name: "MakeMyTrip", icon: "✈️" },
  { name: "OYO", icon: "🏨" },
  { name: "TripAdvisor", icon: "⭐" },
  { name: "PNR Apps", icon: "🎟️" },
  { name: "Google Maps", icon: "🗺️" },
];

const STEPS = [
  { number: "01", title: "Tell us your trip", desc: "Enter destination, dates, budget, and travel style — regular or pilgrimage." },
  { number: "02", title: "AI builds your plan", desc: "Groq AI searches real train timings, plans every meal, auto, hotel, and activity." },
  { number: "03", title: "Travel with confidence", desc: "Day cards, budget breakdown, PNR tracker — everything you need, one app." },
];

export default function Home() {
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
            India&apos;s AI Travel Super-App
          </div>

          <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tight leading-tight">
            Bharat ka Smart<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400">
              Travel Companion
            </span>
          </h1>

          <p className="text-xl text-indigo-200 font-medium">
            Ek App. Poora Safar.
          </p>

          <p className="text-indigo-200/80 max-w-xl mx-auto text-base leading-relaxed">
            AI-powered itineraries with real train timings, live PNR tracking, pilgrimage mode,
            budget tracker — replacing 7 apps with one intelligent platform.
          </p>

          <div className="flex items-center justify-center gap-4 pt-2">
            <Link
              href="/trips/new"
              className="px-8 py-3.5 bg-white text-indigo-700 font-bold rounded-xl hover:bg-indigo-50 transition-colors shadow-lg text-sm"
            >
              Start Planning Free →
            </Link>
            <Link
              href="/trips"
              className="px-8 py-3.5 bg-white/10 text-white font-semibold rounded-xl border border-white/20 hover:bg-white/20 transition-colors text-sm backdrop-blur-sm"
            >
              View My Trips
            </Link>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 pt-6 border-t border-white/10">
            {[
              { value: "7", label: "Apps Replaced" },
              { value: "AI", label: "Smart Planning" },
              { value: "India", label: "India First" },
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
        <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Replaces all of these</p>
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
            <h2 className="text-3xl font-black text-white">How Planora works</h2>
            <p className="text-gray-400">From zero to full itinerary in under 60 seconds</p>
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
          <h2 className="text-3xl font-black text-gray-900">Everything India travelers need</h2>
          <p className="text-gray-500">Built for the way Indians actually travel</p>
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
          Ready to travel smarter?
        </h2>
        <p className="text-white/80 max-w-md mx-auto">
          Your smart travel companion for every trip across India.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/trips/new"
            className="px-8 py-4 bg-white text-orange-600 font-black rounded-xl hover:bg-orange-50 transition-colors shadow-lg text-base"
          >
            Plan Your Trip Now →
          </Link>
          <Link
            href="/pnr"
            className="px-8 py-4 bg-white/15 text-white font-semibold rounded-xl border border-white/30 hover:bg-white/25 transition-colors text-base"
          >
            Check PNR Status
          </Link>
        </div>
      </section>

    </div>
  );
}