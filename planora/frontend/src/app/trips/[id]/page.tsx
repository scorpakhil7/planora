"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { get, post } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import Link from "next/link";

type Destination = { city: string; country: string; duration_days: number; };
type Activity = { time: string; title: string; location: string; category: string; duration_minutes: number; cost_estimate: number; notes: string; };
type Accommodation = { name: string; address: string; check_in: string; check_out: string; nightly_rate?: number; };
type ItineraryDay = { day_number: number; date: string; title: string; destination: string; activities: Activity[]; accommodation: Accommodation | null; budget_estimate: number; currency: string; };
type Itinerary = { id: string; days: ItineraryDay[]; notes: string; generated_by_ai: boolean; };
type Trip = { id: string; title: string; destinations: Destination[]; start_date: string | null; end_date: string | null; status: string; itinerary: Itinerary | null; user_id: string; };

const CATEGORY_ICON: Record<string, string> = {
  food: "🍽️", sightseeing: "🏛️", transport: "🚌", leisure: "🌿", shopping: "🛍️", adventure: "🧗",
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatCurrency(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

function cleanNotes(notes: string) {
  return notes
    .replace(/Book at https?:\/\/\S+/gi, "")
    .replace(/\|\s*⚠️\s*Verify availability before booking/gi, "")
    .replace(/⚠️\s*Verify availability before booking/gi, "")
    .replace(/\|\s*⚠️\s*Verify (exact )?timings? on [^.|]+before booking/gi, "")
    .replace(/\s*\|\s*$/g, "")
    .trim();
}

function ActivityRow({ activity }: { activity: Activity }) {
  const icon = CATEGORY_ICON[activity.category] || "📌";
  const notes = cleanNotes(activity.notes || "");
  return (
    <div className="flex gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="w-14 shrink-0 text-xs text-gray-400 font-medium pt-0.5">{activity.time}</div>
      <div className="text-lg shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{activity.title}</p>
        {notes && <p className="text-xs text-gray-500 mt-0.5">{notes}</p>}
      </div>
      {activity.cost_estimate > 0 && (
        <div className="shrink-0 text-xs font-medium text-indigo-600">{formatCurrency(activity.cost_estimate)}</div>
      )}
    </div>
  );
}

function HotelCard({ accommodation, currency }: { accommodation: Accommodation; currency: string }) {
  return (
    <div className="mt-4 flex items-start gap-3 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
      <span className="text-2xl shrink-0">🏨</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{accommodation.name}</p>
        <p className="text-xs text-gray-500 mt-0.5">{accommodation.address}</p>
        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400 flex-wrap">
          <span>Check-in {accommodation.check_in}</span>
          <span>·</span>
          <span>Check-out {accommodation.check_out}</span>
          {accommodation.nightly_rate && accommodation.nightly_rate > 0 && (
            <>
              <span>·</span>
              <span className="font-semibold text-indigo-600">{formatCurrency(accommodation.nightly_rate, currency)}/night</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DayCard({ day }: { day: ItineraryDay }) {
  const [open, setOpen] = useState(true);
  const activityCost = day.activities.reduce((s, a) => s + (a.cost_estimate || 0), 0);
  const hotelCost = day.accommodation?.nightly_rate || 0;
  const totalCost = activityCost + hotelCost;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">D{day.day_number}</div>
          <div>
            <p className="font-semibold text-gray-900">{day.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">{formatDate(day.date)} · 📍 {day.destination}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-semibold text-indigo-600">{formatCurrency(totalCost, day.currency)}</p>
            {hotelCost > 0 && <p className="text-xs text-gray-400">incl. hotel</p>}
          </div>
          <span className="text-gray-400 text-sm">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-2">
          {day.activities.length > 0 && (
            <div>{day.activities.map((a, i) => <ActivityRow key={i} activity={a} />)}</div>
          )}
          {(activityCost > 0 || hotelCost > 0) && (
            <div className="flex gap-2 pt-2">
              {activityCost > 0 && (
                <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-center">
                  <p className="text-xs text-gray-400">Activities</p>
                  <p className="text-sm font-semibold text-gray-700">{formatCurrency(activityCost, day.currency)}</p>
                </div>
              )}
              {hotelCost > 0 && (
                <div className="flex-1 bg-indigo-50 rounded-xl px-3 py-2 text-center">
                  <p className="text-xs text-indigo-400">Hotel/night</p>
                  <p className="text-sm font-semibold text-indigo-700">{formatCurrency(hotelCost, day.currency)}</p>
                </div>
              )}
              <div className="flex-1 bg-green-50 rounded-xl px-3 py-2 text-center">
                <p className="text-xs text-green-400">Day total</p>
                <p className="text-sm font-semibold text-green-700">{formatCurrency(totalCost, day.currency)}</p>
              </div>
            </div>
          )}
          {day.accommodation && day.accommodation.name && day.accommodation.name !== "None" && (
            <HotelCard accommodation={day.accommodation} currency={day.currency} />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function SkeletonDay() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse space-y-3">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-gray-200" />
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-3 bg-gray-100 rounded w-1/3" />
        </div>
      </div>
      <div className="space-y-2 pl-14">
        <div className="h-3 bg-gray-100 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-2/3" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
      </div>
    </div>
  );
}

// ─── AI Failure Banner ────────────────────────────────────────────────────────

function AIFailureBanner({ onRetry, loading }: { onRetry: () => void; loading: boolean }) {
  return (
    <div className="flex items-start gap-3 px-4 py-4 bg-amber-50 border border-amber-200 rounded-2xl">
      <span className="text-amber-500 text-xl shrink-0">⚠️</span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-amber-800">AI generation failed</p>
        <p className="text-xs text-amber-700 mt-0.5">
          The itinerary shown is a basic template — Groq could not generate a custom plan. This usually happens due to rate limits or a network issue.
        </p>
        <button
          onClick={onRetry}
          disabled={loading}
          className="mt-2 px-4 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Retrying..." : "🔄 Retry now"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TripDetailPage() {
  const router = useRouter();
  const params = useParams();
  const tripId = params.id as string;
  const toast = useToast();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFailed, setAiFailed] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/login"); return; }
    fetchTrip();
  }, [tripId]);

  async function fetchTrip() {
    try {
      const data = await get<Trip>(`/trips/${tripId}`);
      setTrip(data);
    } catch (err: any) {
      toast.error("Failed to load trip. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const handleGenerateItinerary = useCallback(async () => {
    if (!trip) return;
    setAiLoading(true);
    setAiFailed(false);
    toast.info("Generating your itinerary...", 15000);
    try {
      const result = await post<{ itinerary: any; fallback: boolean }>("/ai/itinerary", {
        trip_id: trip.id,
        destinations: trip.destinations,
        start_date: trip.start_date,
        end_date: trip.end_date,
      });
      await fetchTrip();
      if (result?.fallback) {
        setAiFailed(true);
        toast.warning("AI failed — showing basic template. Try regenerating.", 6000);
      } else {
        toast.success("Itinerary generated successfully! 🎉");
      }
    } catch (err: any) {
      setAiFailed(true);
      toast.error("Failed to generate itinerary. Check your connection and try again.");
    } finally {
      setAiLoading(false);
    }
  }, [trip]);

  const totalBudget = trip?.itinerary?.days?.reduce((s, d) => {
    const actCost = d.activities.reduce((a, act) => a + (act.cost_estimate || 0), 0);
    const hotelCost = d.accommodation?.nightly_rate || 0;
    return s + actCost + hotelCost;
  }, 0) ?? 0;

  const destinations = trip?.destinations || [];
  const cityNames = destinations.map((d) => d.city).join(" → ") || "No destinations";

  if (loading) {
    return (
      <div className="space-y-8 max-w-3xl mx-auto">
        <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
        <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse space-y-3">
          <div className="h-6 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-100 rounded w-1/3" />
        </div>
        <SkeletonDay />
        <SkeletonDay />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Trip not found.</p>
        <Link href="/trips" className="text-indigo-600 underline mt-4 block">Back to trips</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <Link href="/trips" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600">← All trips</Link>

      {/* Trip header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{trip.title}</h1>
            <p className="text-gray-500 mt-1">📍 {cityNames}</p>
            <p className="text-sm text-gray-400 mt-1">📅 {formatDate(trip.start_date)} – {formatDate(trip.end_date)}</p>
          </div>
          <span className="shrink-0 px-3 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700 capitalize">{trip.status}</span>
        </div>
        {destinations.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {destinations.map((d, i) => (
              <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">{d.city} · {d.duration_days}d</span>
            ))}
          </div>
        )}
      </div>

      {/* Itinerary */}
      {trip.itinerary ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Itinerary</h2>
              {totalBudget > 0 && (
                <p className="text-sm text-gray-400 mt-0.5">
                  Estimated total: <span className="font-semibold text-indigo-600">{formatCurrency(totalBudget)}</span>
                  <span className="text-xs ml-1">(activities + hotels)</span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/trips/${trip.id}/budget`}
                className="px-4 py-2 text-sm font-semibold border border-green-200 text-green-700 rounded-xl hover:bg-green-50 transition-colors"
              >
                📊 Budget
              </Link>
              <button
                onClick={handleGenerateItinerary}
                disabled={aiLoading}
                className="px-4 py-2 text-sm font-semibold border border-indigo-200 text-indigo-600 rounded-xl hover:bg-indigo-50 disabled:opacity-50 transition-colors"
              >
                {aiLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </span>
                ) : "🤖 Regenerate"}
              </button>
            </div>
          </div>

          {aiFailed && <AIFailureBanner onRetry={handleGenerateItinerary} loading={aiLoading} />}

          <div className="space-y-4">
            {trip.itinerary.days.map((day) => <DayCard key={day.day_number} day={day} />)}
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100 p-10 text-center space-y-4">
          <div className="text-4xl">🤖</div>
          <h2 className="text-xl font-semibold text-gray-900">Generate your AI itinerary</h2>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            Planora AI builds a detailed day-by-day plan with real transport, meals, activities, accommodation and budget.
          </p>
          <button
            onClick={handleGenerateItinerary}
            disabled={aiLoading}
            className="mt-2 px-8 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm"
          >
            {aiLoading ? (
              <span className="flex items-center gap-2 justify-center">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating your itinerary...
              </span>
            ) : "✨ Generate itinerary"}
          </button>
          {aiFailed && (
            <p className="text-xs text-red-500">Last attempt failed. Please try again.</p>
          )}
        </div>
      )}
    </div>
  );
}