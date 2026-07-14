"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { get } from "@/lib/api";
import { getCurrentUser, isAuthenticated } from "@/lib/auth";

type Destination = { city: string; country: string; duration_days: number; };
type Trip = {
  id: string; title: string; destinations: Destination[];
  start_date: string | null; end_date: string | null;
  status: string; created_at: string; itinerary: any | null;
};
type User = { id: string; name: string; email: string; };

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function TripCard({ trip, index }: { trip: Trip; index: number }) {
  const days = daysUntil(trip.start_date);
  const cities = trip.destinations.map((d) => d.city).join(" → ") || "No destinations";
  const totalDays = trip.destinations.reduce((s, d) => s + d.duration_days, 0);
  const accents = ["bg-indigo-500", "bg-orange-400", "bg-green-500", "bg-pink-500", "bg-violet-500", "bg-amber-400"];
  const accent = accents[index % accents.length];

  return (
    <Link href={`/trips/${trip.id}`}>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group flex items-center gap-4">
        <div className={`w-1 self-stretch rounded-full ${accent} shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">{trip.title}</h3>
            {days !== null && days > 0 && (
              <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${days <= 7 ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-500"}`}>
                {days}d
              </span>
            )}
            {days !== null && days <= 0 && (
              <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-600">Now</span>
            )}
          </div>
          <p className="text-sm text-gray-400 truncate mt-0.5">📍 {cities}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            <span>{formatDate(trip.start_date)}</span>
            {totalDays > 0 && <span>· {totalDays} days</span>}
            {trip.itinerary && <span className="text-green-500 font-medium">· ✓ AI ready</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/login"); return; }
    Promise.all([getCurrentUser(), get<Trip[]>("/trips")])
      .then(([u, t]) => { setUser(u); setTrips(t || []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const upcomingTrips = trips
    .filter((t) => { const d = daysUntil(t.start_date); return d !== null && d > 0 && t.status !== "cancelled"; })
    .sort((a, b) => new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime());

  const completedTrips = trips.filter((t) => t.status === "completed").length;
  const tripsWithItinerary = trips.filter((t) => t.itinerary).length;
  const totalCities = trips.reduce((s, t) => s + t.destinations.length, 0);
  const totalDaysPlanned = trips.reduce((s, t) => s + t.destinations.reduce((ds, d) => ds + d.duration_days, 0), 0);
  const nextTrip = upcomingTrips[0] || null;
  const firstName = user?.name?.split(" ")[0] || "";

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 bg-gray-200 rounded-xl w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl" />)}
        </div>
        <div className="h-36 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900">
            {greeting()}{firstName ? `, ${firstName}` : ""}! 👋
          </h1>
          <p className="text-sm text-gray-400 mt-1">Here&apos;s your travel overview</p>
        </div>
        <Link href="/trips/new" className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm text-sm">
          + New Trip
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-indigo-50 rounded-2xl p-5">
          <p className="text-3xl font-black text-indigo-600">{trips.length}</p>
          <p className="text-sm font-semibold text-gray-700 mt-1">Total Trips</p>
          <p className="text-xs text-gray-500 mt-0.5">{completedTrips} completed</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-5">
          <p className="text-3xl font-black text-green-600">{upcomingTrips.length}</p>
          <p className="text-sm font-semibold text-gray-700 mt-1">Upcoming</p>
          <p className="text-xs text-gray-500 mt-0.5">trips ahead</p>
        </div>
        <div className="bg-orange-50 rounded-2xl p-5">
          <p className="text-3xl font-black text-orange-500">{totalCities}</p>
          <p className="text-sm font-semibold text-gray-700 mt-1">Cities</p>
          <p className="text-xs text-gray-500 mt-0.5">destinations</p>
        </div>
        <div className="bg-violet-50 rounded-2xl p-5">
          <p className="text-3xl font-black text-violet-600">{totalDaysPlanned}</p>
          <p className="text-sm font-semibold text-gray-700 mt-1">Days Planned</p>
          <p className="text-xs text-gray-500 mt-0.5">total days</p>
        </div>
      </div>

      {/* Next trip banner */}
      {nextTrip && (
        <Link href={`/trips/${nextTrip.id}`}>
          <div className="bg-indigo-600 rounded-2xl p-6 text-white hover:bg-indigo-700 transition-colors cursor-pointer">
            <p className="text-indigo-200 text-xs font-semibold uppercase tracking-widest mb-2">✈️ Next Trip</p>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">{nextTrip.title}</h2>
                <p className="text-indigo-200 text-sm mt-1">
                  📍 {nextTrip.destinations.map((d) => d.city).join(" → ")}
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-sm text-indigo-200">📅 {formatDate(nextTrip.start_date)}</span>
                  {daysUntil(nextTrip.start_date) !== null && (
                    <span className="bg-white text-indigo-600 font-black text-xs px-3 py-1 rounded-full">
                      {daysUntil(nextTrip.start_date)} days to go
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Upcoming trips */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Upcoming Trips</h2>
            {upcomingTrips.length > 4 && (
              <Link href="/trips" className="text-sm text-indigo-600 font-medium hover:underline">View all →</Link>
            )}
          </div>

          {upcomingTrips.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center space-y-4">
              <div className="text-4xl">🗺️</div>
              <p className="font-semibold text-gray-700">No upcoming trips</p>
              <Link href="/trips/new" className="inline-block px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl text-sm hover:bg-indigo-700 transition-colors">
                Plan a trip →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingTrips.slice(0, 4).map((trip, i) => (
                <TripCard key={trip.id} trip={trip} index={i} />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Quick Actions</p>
            <Link href="/trips/new" className="flex items-center gap-3 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors">
              <span>✈️</span>
              <div>
                <p className="text-sm font-bold">New Trip</p>
                <p className="text-xs text-indigo-200">Plan with AI</p>
              </div>
            </Link>
            <Link href="/trips" className="flex items-center gap-3 px-4 py-3 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors">
              <span>🗺️</span>
              <div>
                <p className="text-sm font-semibold">My Trips</p>
                <p className="text-xs text-gray-400">{trips.length} trips</p>
              </div>
            </Link>
            <Link href="/pnr" className="flex items-center gap-3 px-4 py-3 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors">
              <span>🎟️</span>
              <div>
                <p className="text-sm font-semibold">PNR Status</p>
                <p className="text-xs text-gray-400">Check ticket</p>
              </div>
            </Link>
          </div>

          {/* AI progress */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">AI Itineraries</p>
              <span className="text-sm font-black text-indigo-600">{tripsWithItinerary}/{trips.length}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-indigo-500 h-1.5 rounded-full transition-all"
                style={{ width: trips.length > 0 ? `${(tripsWithItinerary / trips.length) * 100}%` : "0%" }}
              />
            </div>
            <p className="text-xs text-gray-400">
              {trips.length - tripsWithItinerary > 0
                ? `${trips.length - tripsWithItinerary} trips need itineraries`
                : "All trips have itineraries 🎉"}
            </p>
            {trips.filter((t) => !t.itinerary).length > 0 && (
              <Link href="/trips" className="text-xs text-indigo-600 font-semibold hover:underline">
                Generate missing →
              </Link>
            )}
          </div>

          {/* Travel DNA */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Travel DNA</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Countries</p>
                <p className="text-xl font-black text-indigo-600">{new Set(trips.flatMap((t) => t.destinations.map((d) => d.country))).size}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Cities visited</p>
                <p className="text-xl font-black text-orange-500">{totalCities}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Days planned</p>
                <p className="text-xl font-black text-violet-600">{totalDaysPlanned}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Completed trips</p>
                <p className="text-xl font-black text-green-600">{completedTrips}</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}