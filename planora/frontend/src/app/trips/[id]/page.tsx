"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { get, post } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type Destination = {
  city: string;
  country: string;
  duration_days: number;
};

type Activity = {
  time: string;
  title: string;
  location: string;
  category: string;
  duration_minutes: number;
  cost_estimate: number;
  notes: string;
};

type ItineraryDay = {
  day_number: number;
  date: string;
  title: string;
  destination: string;
  activities: Activity[];
  accommodation: {
    name: string;
    address: string;
    check_in: string;
    check_out: string;
  } | null;
  budget_estimate: number;
  currency: string;
};

type Itinerary = {
  id: string;
  days: ItineraryDay[];
  notes: string;
  generated_by_ai: boolean;
};

type Trip = {
  id: string;
  title: string;
  destinations: Destination[];
  start_date: string | null;
  end_date: string | null;
  status: string;
  itinerary: Itinerary | null;
  user_id: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_ICON: Record<string, string> = {
  food: "🍽️",
  sightseeing: "🏛️",
  transport: "🚌",
  leisure: "🌿",
  shopping: "🛍️",
  adventure: "🧗",
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ActivityRow({ activity }: { activity: Activity }) {
  const icon = CATEGORY_ICON[activity.category] || "📌";
  return (
    <div className="flex gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="w-14 shrink-0 text-xs text-gray-400 font-medium pt-0.5">{activity.time}</div>
      <div className="text-lg shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{activity.title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{activity.notes}</p>
      </div>
      {activity.cost_estimate > 0 && (
        <div className="shrink-0 text-xs font-medium text-indigo-600">
          {formatCurrency(activity.cost_estimate)}
        </div>
      )}
    </div>
  );
}

function DayCard({ day }: { day: ItineraryDay }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Day header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
            D{day.day_number}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{day.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatDate(day.date)} · 📍 {day.destination}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-indigo-600">
            {formatCurrency(day.budget_estimate, day.currency)}
          </span>
          <span className="text-gray-400 text-sm">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4">
          {/* Activities */}
          {day.activities.length > 0 && (
            <div>
              {day.activities.map((activity, i) => (
                <ActivityRow key={i} activity={activity} />
              ))}
            </div>
          )}

          {/* Accommodation */}
          {day.accommodation && (
            <div className="flex items-start gap-3 p-3 bg-indigo-50 rounded-xl">
              <span className="text-lg">🏨</span>
              <div>
                <p className="text-sm font-medium text-gray-900">{day.accommodation.name}</p>
                <p className="text-xs text-gray-500">{day.accommodation.address}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Check-in {day.accommodation.check_in} · Check-out {day.accommodation.check_out}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TripDetailPage() {
  const router = useRouter();
  const params = useParams();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    fetchTrip();
  }, [tripId]);

  async function fetchTrip() {
    try {
      const data = await get<Trip>(`/trips/${tripId}`);
      setTrip(data);
    } catch (err: any) {
      setError(err.message || "Failed to load trip");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateItinerary() {
    if (!trip) return;
    setAiLoading(true);
    setError("");
    try {
      await post("/ai/itinerary", {
        trip_id: trip.id,
        destinations: trip.destinations,
        start_date: trip.start_date,
        end_date: trip.end_date,
      });
      // Reload trip to get the new itinerary
      await fetchTrip();
    } catch (err: any) {
      setError(err.message || "Failed to generate itinerary");
    } finally {
      setAiLoading(false);
    }
  }

  const totalBudget = trip?.itinerary?.days?.reduce((s, d) => s + d.budget_estimate, 0) ?? 0;
  const destinations = trip?.destinations || [];
  const cityNames = destinations.map((d) => d.city).join(" → ") || "No destinations";

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="text-center py-20 text-gray-400">Loading trip...</div>;
  }

  if (error && !trip) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500">{error}</p>
        <Link href="/trips" className="text-indigo-600 underline mt-4 block">
          Back to trips
        </Link>
      </div>
    );
  }

  if (!trip) return null;

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Back */}
      <Link href="/trips" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600">
        ← All trips
      </Link>

      {/* Trip header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{trip.title}</h1>
            <p className="text-gray-500 mt-1">📍 {cityNames}</p>
            <p className="text-sm text-gray-400 mt-1">
              📅 {formatDate(trip.start_date)} – {formatDate(trip.end_date)}
            </p>
          </div>
          <span className="shrink-0 px-3 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700 capitalize">
            {trip.status}
          </span>
        </div>

        {/* Destinations chips */}
        {destinations.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {destinations.map((d, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
              >
                {d.city} · {d.duration_days}d
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">
          {error}
        </div>
      )}

      {/* Itinerary section */}
      {trip.itinerary ? (
        <div className="space-y-4">
          {/* Itinerary header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Itinerary</h2>
              {totalBudget > 0 && (
                <p className="text-sm text-gray-400 mt-0.5">
                  Estimated total: <span className="font-semibold text-indigo-600">{formatCurrency(totalBudget)}</span>
                </p>
              )}
            </div>
            <button
              onClick={handleGenerateItinerary}
              disabled={aiLoading}
              className="px-4 py-2 text-sm font-semibold border border-indigo-200 text-indigo-600 rounded-xl hover:bg-indigo-50 disabled:opacity-50 transition-colors"
            >
              {aiLoading ? "Regenerating..." : "🤖 Regenerate"}
            </button>
          </div>

          {/* Day cards */}
          <div className="space-y-4">
            {trip.itinerary.days.map((day) => (
              <DayCard key={day.day_number} day={day} />
            ))}
          </div>
        </div>
      ) : (
        /* No itinerary — CTA to generate */
        <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100 p-10 text-center space-y-4">
          <div className="text-4xl">🤖</div>
          <h2 className="text-xl font-semibold text-gray-900">Generate your AI itinerary</h2>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            Planora's AI will build a detailed day-by-day plan with activities, accommodation, and budget estimates — tailored to your destinations.
          </p>
          <button
            onClick={handleGenerateItinerary}
            disabled={aiLoading}
            className="mt-2 px-8 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm"
          >
            {aiLoading ? "Generating your itinerary..." : "✨ Generate itinerary"}
          </button>
          {aiLoading && (
            <p className="text-xs text-gray-400 animate-pulse">
              This usually takes a few seconds...
            </p>
          )}
        </div>
      )}
    </div>
  );
}
