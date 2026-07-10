"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { get } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type Activity = {
  time: string;
  title: string;
  category: string;
  cost_estimate: number;
};

type Accommodation = {
  name: string;
  nightly_rate?: number;
};

type ItineraryDay = {
  day_number: number;
  date: string;
  title: string;
  destination: string;
  activities: Activity[];
  accommodation: Accommodation | null;
  currency: string;
};

type Itinerary = {
  days: ItineraryDay[];
};

type Trip = {
  id: string;
  title: string;
  itinerary: Itinerary | null;
  metadata: {
    budget_total?: number;
    travelers_count?: number;
    currency?: string;
  };
};

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: "transport", label: "Transport", icon: "🚌", color: "bg-blue-500" },
  { key: "hotel", label: "Hotel / Stay", icon: "🏨", color: "bg-indigo-500" },
  { key: "food", label: "Food & Meals", icon: "🍽️", color: "bg-orange-400" },
  { key: "sightseeing", label: "Sightseeing", icon: "🏛️", color: "bg-purple-500" },
  { key: "adventure", label: "Adventure", icon: "🧗", color: "bg-green-500" },
  { key: "leisure", label: "Leisure", icon: "🌿", color: "bg-teal-500" },
  { key: "shopping", label: "Shopping", icon: "🛍️", color: "bg-pink-500" },
  { key: "other", label: "Other", icon: "📌", color: "bg-gray-400" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(d: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function computeBudget(trip: Trip) {
  const days = trip.itinerary?.days || [];
  const budget_total = trip.metadata?.budget_total || 0;

  // Category totals
  const categoryTotals: Record<string, number> = {};
  CATEGORIES.forEach((c) => (categoryTotals[c.key] = 0));

  // Per-day totals
  const perDay: { day: number; date: string; title: string; total: number }[] = [];

  let totalSpend = 0;

  for (const day of days) {
    let dayTotal = 0;

    // Activities
    for (const act of day.activities || []) {
      const cost = act.cost_estimate || 0;
      const cat = CATEGORIES.find((c) => c.key === act.category) ? act.category : "other";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + cost;
      dayTotal += cost;
      totalSpend += cost;
    }

    // Hotel
    const hotelCost = day.accommodation?.nightly_rate || 0;
    if (hotelCost > 0) {
      categoryTotals["hotel"] = (categoryTotals["hotel"] || 0) + hotelCost;
      dayTotal += hotelCost;
      totalSpend += hotelCost;
    }

    perDay.push({
      day: day.day_number,
      date: day.date,
      title: day.title,
      total: dayTotal,
    });
  }

  const remaining = budget_total - totalSpend;
  const spendPercent = budget_total > 0 ? Math.min(100, Math.round((totalSpend / budget_total) * 100)) : 0;

  return { categoryTotals, perDay, totalSpend, remaining, spendPercent, budget_total };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`rounded-2xl p-5 ${color}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  );
}

function CategoryBar({
  cat,
  amount,
  max,
}: {
  cat: (typeof CATEGORIES)[0];
  amount: number;
  max: number;
}) {
  const pct = max > 0 ? Math.round((amount / max) * 100) : 0;
  if (amount === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{cat.icon}</span>
          <span className="text-sm font-medium text-gray-700">{cat.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">{formatINR(amount)}</span>
          <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${cat.color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BudgetPage() {
  const params = useParams();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    get<Trip>(`/trips/${tripId}`)
      .then(setTrip)
      .catch(() => setError("Failed to load trip."))
      .finally(() => setLoading(false));
  }, [tripId]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3" />
        <div className="h-32 bg-gray-100 rounded-2xl" />
        <div className="h-64 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <p className="text-gray-400">Trip not found.</p>
        <Link href="/trips" className="text-indigo-600 text-sm mt-2 block">← Back to trips</Link>
      </div>
    );
  }

  if (!trip.itinerary) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 space-y-3">
        <div className="text-4xl">📊</div>
        <h2 className="font-semibold text-gray-700">No itinerary yet</h2>
        <p className="text-sm text-gray-400">Generate your AI itinerary first to see the budget breakdown.</p>
        <Link href={`/trips/${tripId}`} className="inline-block mt-2 text-indigo-600 text-sm font-medium hover:underline">
          ← Back to trip
        </Link>
      </div>
    );
  }

  const { categoryTotals, perDay, totalSpend, remaining, spendPercent, budget_total } =
    computeBudget(trip);

  const maxCategory = Math.max(...Object.values(categoryTotals));
  const travelers = trip.metadata?.travelers_count || 1;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href={`/trips/${tripId}`}
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600"
      >
        ← Back to trip
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Budget Breakdown</h1>
        <p className="text-gray-500 mt-1">{trip.title}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard
          label="Total Budget"
          value={formatINR(budget_total)}
          sub={travelers > 1 ? `${formatINR(Math.round(budget_total / travelers))}/person` : undefined}
          color="bg-indigo-50 text-indigo-900"
        />
        <SummaryCard
          label="Estimated Spend"
          value={formatINR(totalSpend)}
          sub={`${spendPercent}% of budget`}
          color="bg-orange-50 text-orange-900"
        />
        <SummaryCard
          label={remaining >= 0 ? "Remaining" : "Over Budget"}
          value={formatINR(Math.abs(remaining))}
          sub={remaining >= 0 ? "buffer" : "exceeded"}
          color={remaining >= 0 ? "bg-green-50 text-green-900" : "bg-red-50 text-red-900"}
        />
      </div>

      {/* Budget progress bar */}
      {budget_total > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">Budget utilisation</span>
            <span className={`font-bold ${spendPercent > 100 ? "text-red-600" : "text-indigo-600"}`}>
              {spendPercent}%
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                spendPercent > 100 ? "bg-red-500" : spendPercent > 80 ? "bg-orange-400" : "bg-indigo-500"
              }`}
              style={{ width: `${Math.min(spendPercent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>₹0</span>
            <span>{formatINR(budget_total)}</span>
          </div>
        </div>
      )}

      {/* Category breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <h2 className="font-semibold text-gray-800">Spend by Category</h2>
        <div className="space-y-4">
          {CATEGORIES.map((cat) => (
            <CategoryBar
              key={cat.key}
              cat={cat}
              amount={categoryTotals[cat.key] || 0}
              max={maxCategory}
            />
          ))}
        </div>
      </div>

      {/* Per-day breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Day-by-Day</h2>
        <div className="divide-y divide-gray-50">
          {perDay.map((d) => (
            <div key={d.day} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                  D{d.day}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 line-clamp-1">{d.title}</p>
                  <p className="text-xs text-gray-400">{formatDate(d.date)}</p>
                </div>
              </div>
              <p className="text-sm font-semibold text-indigo-600 shrink-0 ml-4">
                {formatINR(d.total)}
              </p>
            </div>
          ))}
        </div>

        {/* Total row */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <p className="text-sm font-bold text-gray-800">Total Estimated</p>
          <p className="text-sm font-bold text-indigo-700">{formatINR(totalSpend)}</p>
        </div>
      </div>

      {/* Note */}
      <p className="text-xs text-gray-400 text-center pb-4">
        Estimates are AI-generated. Actual costs may vary. Always carry 10–15% extra as buffer.
      </p>
    </div>
  );
}