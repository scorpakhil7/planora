"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { get } from "@/lib/api";
import { getCurrentUser, isAuthenticated } from "@/lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

type Destination = {
  city: string;
  country: string;
  duration_days: number;
};

type Trip = {
  id: string;
  title: string;
  destinations: Destination[];
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_at: string;
  itinerary: any | null;
};

type User = {
  id: string;
  name: string;
  email: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getTripStatusColor(status: string) {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    active: "bg-green-100 text-green-700",
    completed: "bg-blue-100 text-blue-700",
    cancelled: "bg-red-100 text-red-600",
  };
  return map[status] || "bg-gray-100 text-gray-600";
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: string;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Upcoming Trip Card ───────────────────────────────────────────────────────

function UpcomingTripCard({ trip }: { trip: Trip }) {
  const days = daysUntil(trip.start_date);
  const cities = trip.destinations.map((d) => d.city).join(" → ") || "No destinations";
  const totalDays = trip.destinations.reduce((s, d) => s + d.duration_days, 0);

  return (
    <Link href={`/trips/${trip.id}`}>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{trip.title}</h3>
            <p className="text-sm text-gray-500 truncate mt-0.5">📍 {cities}</p>
          </div>
          <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full capitalize ${getTripStatusColor(trip.status)}`}>
            {trip.status}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">📅 {formatDate(trip.start_date)}</span>
          {totalDays > 0 && <span className="text-gray-400">{totalDays} days</span>}
        </div>

        {days !== null && days > 0 && days <= 30 && (
          <div className="mt-3 px-3 py-2 bg-indigo-50 rounded-xl text-xs font-medium text-indigo-700">
            🗓 {days} days to go!
          </div>
        )}

        {days !== null && days <= 0 && trip.status !== "completed" && (
          <div className="mt-3 px-3 py-2 bg-green-50 rounded-xl text-xs font-medium text-green-700">
            ✈️ Trip is happening now!
          </div>
        )}

        <div className="mt-3 flex items-center gap-2">
          {trip.itinerary ? (
            <span className="text-xs text-green-600 font-medium">✅ Itinerary ready</span>
          ) : (
            <span className="text-xs text-orange-500 font-medium">⚠️ No itinerary yet</span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Quick Actions ────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { icon: "✈️", label: "New Trip", href: "/trips/new", color: "bg-indigo-600 text-white hover:bg-indigo-700" },
  { icon: "🗺️", label: "My Trips", href: "/trips", color: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50" },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    loadData();
  }, []);

  async function loadData() {
    try {
      const [userData, tripsData] = await Promise.all([
        getCurrentUser(),
        get<Trip[]>("/trips"),
      ]);
      setUser(userData);
      setTrips(tripsData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalTrips = trips.length;
  const upcomingTrips = trips.filter((t) => {
    const d = daysUntil(t.start_date);
    return d !== null && d > 0 && t.status !== "cancelled";
  });
  const completedTrips = trips.filter((t) => t.status === "completed").length;
  const tripsWithItinerary = trips.filter((t) => t.itinerary).length;
  const totalCities = trips.reduce((s, t) => s + t.destinations.length, 0);
  const totalDaysPlanned = trips.reduce(
    (s, t) => s + t.destinations.reduce((ds, d) => ds + d.duration_days, 0),
    0
  );

  // Next upcoming trip
  const nextTrip = upcomingTrips
    .sort((a, b) => new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime())
    [0] || null;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  if (loading) {
    return <div className="text-center py-20 text-gray-400">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {greeting()}{user?.name ? `, ${user.name.split(" ")[0]}` : ""}! 👋
          </h1>
          <p className="text-gray-500 mt-1">Here's your travel overview</p>
        </div>
        <Link
          href="/trips/new"
          className="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
        >
          + New Trip
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="🧳" label="Total Trips" value={totalTrips} sub={`${completedTrips} completed`} color="bg-indigo-50" />
        <StatCard icon="📅" label="Upcoming" value={upcomingTrips.length} sub="trips planned" color="bg-green-50" />
        <StatCard icon="📍" label="Cities" value={totalCities} sub="destinations added" color="bg-orange-50" />
        <StatCard icon="🗓" label="Days Planned" value={totalDaysPlanned} sub="across all trips" color="bg-purple-50" />
      </div>

      {/* Next trip banner */}
      {nextTrip && (
        <Link href={`/trips/${nextTrip.id}`}>
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-2xl p-6 text-white cursor-pointer hover:from-indigo-700 hover:to-indigo-600 transition-all">
            <p className="text-indigo-200 text-sm font-medium mb-1">✈️ Next trip</p>
            <h2 className="text-xl font-bold">{nextTrip.title}</h2>
            <p className="text-indigo-200 text-sm mt-1">
              📍 {nextTrip.destinations.map((d) => d.city).join(" → ")}
            </p>
            <div className="flex items-center gap-4 mt-3">
              <span className="text-sm">📅 {formatDate(nextTrip.start_date)}</span>
              {daysUntil(nextTrip.start_date) !== null && (
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold">
                  {daysUntil(nextTrip.start_date)} days to go
                </span>
              )}
            </div>
          </div>
        </Link>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Upcoming trips list */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Trips</h2>
          {upcomingTrips.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center space-y-3">
              <div className="text-4xl">🗺️</div>
              <p className="text-gray-500">No upcoming trips planned</p>
              <Link
                href="/trips/new"
                className="inline-block px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors text-sm"
              >
                Plan your next trip
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingTrips.slice(0, 4).map((trip) => (
                <UpcomingTripCard key={trip.id} trip={trip} />
              ))}
              {upcomingTrips.length > 4 && (
                <Link href="/trips" className="block text-center text-sm text-indigo-600 font-medium hover:underline">
                  View all {upcomingTrips.length} trips →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            <div className="space-y-2">
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-colors ${action.color}`}
                >
                  <span>{action.icon}</span>
                  {action.label}
                </Link>
              ))}
            </div>
          </div>

          {/* AI itinerary status */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">AI Itineraries</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Generated</span>
                <span className="font-semibold text-gray-900">{tripsWithItinerary}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all"
                  style={{ width: totalTrips > 0 ? `${(tripsWithItinerary / totalTrips) * 100}%` : "0%" }}
                />
              </div>
              <p className="text-xs text-gray-400">
                {totalTrips > 0
                  ? `${tripsWithItinerary} of ${totalTrips} trips have AI itineraries`
                  : "No trips yet"}
              </p>
            </div>
            {trips.filter((t) => !t.itinerary).length > 0 && (
              <Link
                href="/trips"
                className="block text-center text-xs text-indigo-600 font-medium hover:underline mt-2"
              >
                Generate missing itineraries →
              </Link>
            )}
          </div>

          {/* Travel summary */}
          <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100 p-5 space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Your Travel DNA</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">🌍 Countries</span>
                <span className="font-semibold">
                  {new Set(trips.flatMap((t) => t.destinations.map((d) => d.country))).size}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">🏙️ Cities</span>
                <span className="font-semibold">{totalCities}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">📆 Days planned</span>
                <span className="font-semibold">{totalDaysPlanned}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">✅ Completed</span>
                <span className="font-semibold">{completedTrips}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
