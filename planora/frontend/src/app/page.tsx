import Link from "next/link";

const features = [
  {
    icon: "🗺️",
    title: "Smart Itineraries",
    description: "AI-generated day-by-day plans tailored to your destinations and travel style.",
  },
  {
    icon: "🎟️",
    title: "Unified Bookings",
    description: "Trains, buses, flights, and hotels — all booked and tracked in one place.",
  },
  {
    icon: "💰",
    title: "Budget Engine",
    description: "Real-time cost breakdown with smart suggestions to save money.",
  },
];

export default function Home() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="text-center space-y-6 py-12">
        <div className="inline-block px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium">
          AI-powered travel planning
        </div>

        <h1 className="text-5xl font-bold tracking-tight text-gray-900">
          Plan your perfect trip<br />
          <span className="text-indigo-600">with Planora</span>
        </h1>

        <p className="text-lg text-gray-500 max-w-xl mx-auto">
          From AI-generated itineraries to seamless bookings — Planora handles
          every detail so you can focus on the journey.
        </p>

        <div className="flex items-center justify-center gap-4 pt-2">
          <Link
            href="/trips/new"
            className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Create Trip
          </Link>
          <Link
            href="/trips"
            className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            View Trips
          </Link>
        </div>
      </section>

      {/* Feature cards */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-800 text-center mb-8">
          Everything you need for your trip
        </h2>

        <div className="grid sm:grid-cols-3 gap-6">
          {features.map(({ icon, title, description }) => (
            <div
              key={title}
              className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow space-y-3"
            >
              <span className="text-3xl">{icon}</span>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick actions */}
      <section className="bg-indigo-50 rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Ready to start planning?</h2>
          <p className="text-gray-500 text-sm mt-1">Create your first trip in under a minute.</p>
        </div>
        <Link
          href="/trips/new"
          className="shrink-0 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
        >
          Get started →
        </Link>
      </section>
    </div>
  );
}
