"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { post } from "@/lib/api";
import { checkFestivalSurge, SurgeResult } from "@/lib/festivals";

type Destination = {
  city: string;
  country: string;
  order: number;
};

const BUDGET_PRESETS = [
  { label: "Budget", sub: "₹5,000–₹15,000", value: 10000, icon: "🎒" },
  { label: "Mid-range", sub: "₹15,000–₹40,000", value: 25000, icon: "🏨" },
  { label: "Premium", sub: "₹40,000–₹1,00,000", value: 70000, icon: "✈️" },
  { label: "Luxury", sub: "₹1,00,000+", value: 150000, icon: "👑" },
];

const DEPARTURE_TIMES = [
  { label: "Early Morning", sub: "4:00 AM – 7:00 AM", value: "05:00", icon: "🌅" },
  { label: "Morning", sub: "7:00 AM – 11:00 AM", value: "09:00", icon: "☀️" },
  { label: "Afternoon", sub: "11:00 AM – 4:00 PM", value: "13:00", icon: "🌤️" },
  { label: "Evening", sub: "4:00 PM – 9:00 PM", value: "17:00", icon: "🌆" },
];

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function calcDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
}

function FestivalSurgeBanner({ surge }: { surge: SurgeResult }) {
  if (!surge.detected) return null;

  const bgColor = surge.highestLevel === "high" ? "bg-red-50 border-red-200" : surge.highestLevel === "medium" ? "bg-orange-50 border-orange-200" : "bg-yellow-50 border-yellow-200";
  const textColor = surge.highestLevel === "high" ? "text-red-700" : surge.highestLevel === "medium" ? "text-orange-700" : "text-yellow-700";
  const badgeColor = surge.highestLevel === "high" ? "bg-red-100 text-red-700" : surge.highestLevel === "medium" ? "bg-orange-100 text-orange-700" : "bg-yellow-100 text-yellow-700";
  const surgeLabel = surge.highestLevel === "high" ? "🔴 High Surge" : surge.highestLevel === "medium" ? "🟡 Medium Surge" : "🟢 Mild Surge";

  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${bgColor}`}>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badgeColor}`}>{surgeLabel}</span>
        <span className={`text-sm font-semibold ${textColor}`}>Festival travel detected!</span>
      </div>
      {surge.festivals.map((festival) => (
        <div key={festival.name} className="flex gap-3">
          <span className="text-xl shrink-0">{festival.emoji}</span>
          <div>
            <p className={`text-sm font-semibold ${textColor}`}>{festival.name}</p>
            <p className={`text-xs mt-0.5 ${textColor} opacity-80`}>{festival.advice}</p>
          </div>
        </div>
      ))}
      <p className={`text-xs font-medium ${textColor} opacity-70 pt-1 border-t border-current border-opacity-20`}>
        💡 Tip: Book trains and hotels immediately, or adjust dates to avoid the surge window.
      </p>
    </div>
  );
}

export default function NewTripPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [fromCity, setFromCity] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [departureTime, setDepartureTime] = useState("09:00");
  const [budget, setBudget] = useState<number>(25000);
  const [budgetInput, setBudgetInput] = useState("25000");
  const [persons, setPersons] = useState(1);
  const [destinations, setDestinations] = useState<Destination[]>([
    { city: "", country: "India", order: 1 },
  ]);
  const [surge, setSurge] = useState<SurgeResult>({ detected: false, festivals: [], highestLevel: null });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (startDate) setSurge(checkFestivalSurge(startDate, endDate));
    else setSurge({ detected: false, festivals: [], highestLevel: null });
  }, [startDate, endDate]);

  const totalDays = calcDays(startDate, endDate);

  function addDestination() {
    setDestinations((prev) => [...prev, { city: "", country: "India", order: prev.length + 1 }]);
  }

  function removeDestination(index: number) {
    setDestinations((prev) => prev.filter((_, i) => i !== index).map((d, i) => ({ ...d, order: i + 1 })));
  }

  function updateDestination(index: number, field: keyof Destination, value: string | number) {
    setDestinations((prev) => prev.map((d, i) => (i === index ? { ...d, [field]: value } : d)));
  }

  function handleBudgetPreset(value: number) {
    setBudget(value);
    setBudgetInput(value.toString());
  }

  function handleBudgetInput(val: string) {
    setBudgetInput(val);
    const num = parseInt(val.replace(/,/g, ""));
    if (!isNaN(num)) setBudget(num);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!startDate || !endDate) {
      setError("Please select both start and end dates.");
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError("End date must be after start date.");
      return;
    }
    const filledDests = destinations.filter((d) => d.city.trim());
    if (filledDests.length === 0) {
      setError("Please add at least one destination.");
      return;
    }
    if (!fromCity.trim()) {
      setError("Please enter your departure city.");
      return;
    }

    // Distribute days equally across destinations
    const daysPerDest = Math.max(1, Math.floor(totalDays / filledDests.length));
    const destsWithDays = filledDests.map((d, i) => ({
      ...d,
      duration_days: i === filledDests.length - 1
        ? totalDays - daysPerDest * (filledDests.length - 1)
        : daysPerDest,
    }));

    setLoading(true);
    try {
      const trip = await post<{ id: string }>("/trips", {
        title,
        start_date: startDate,
        end_date: endDate,
        budget_total: budget,
        currency: "INR",
        travelers_count: persons,
        from_city: fromCity,
        departure_time: departureTime,
        destinations: destsWithDays,
      });
      router.push(`/trips/${trip.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create trip");
      setLoading(false);
    }
  }

  const budgetPerDay = totalDays > 0 ? Math.round(budget / totalDays) : 0;
  const budgetPerPerson = persons > 0 ? Math.round(budget / persons) : budget;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Plan a new trip</h1>
        <p className="text-gray-500 mt-1">Fill in the details and let AI build your itinerary</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">{error}</div>
        )}

        {/* Trip Details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Trip Details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Trip name</label>
            <input
              type="text" required value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Rajasthan Road Trip 2025"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Travelling from</label>
              <input
                type="text" required value={fromCity}
                onChange={(e) => setFromCity(e.target.value)}
                placeholder="e.g. Hyderabad"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Number of travelers</label>
              <div className="flex items-center gap-3 h-[50px]">
                <button type="button" onClick={() => setPersons((p) => Math.max(1, p - 1))} className="w-10 h-10 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition">−</button>
                <span className="text-lg font-semibold text-gray-900 w-8 text-center">{persons}</span>
                <button type="button" onClick={() => setPersons((p) => Math.min(20, p + 1))} className="w-10 h-10 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition">+</button>
                <span className="text-sm text-gray-400">{persons === 1 ? "traveler" : "travelers"}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Start date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">End date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Auto-calculated days */}
          {totalDays > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 rounded-xl">
              <span className="text-indigo-600">🗓</span>
              <span className="text-sm font-medium text-indigo-700">{totalDays} day{totalDays > 1 ? "s" : ""} trip</span>
              <span className="text-xs text-indigo-400 ml-1">— days auto-calculated from your dates</span>
            </div>
          )}

          {/* Departure time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Preferred departure time on Day 1</label>
            <div className="grid grid-cols-2 gap-2">
              {DEPARTURE_TIMES.map((t) => (
                <button key={t.value} type="button" onClick={() => setDepartureTime(t.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition ${departureTime === t.value ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600 hover:border-indigo-300 hover:bg-indigo-50"}`}
                >
                  <span>{t.icon}</span>
                  <div>
                    <p className="text-sm font-semibold">{t.label}</p>
                    <p className="text-xs opacity-70">{t.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Festival Surge Alert */}
        {surge.detected && <FestivalSurgeBanner surge={surge} />}

        {/* Budget */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Total Budget</h2>
          <div className="grid grid-cols-2 gap-2">
            {BUDGET_PRESETS.map((preset) => (
              <button key={preset.label} type="button" onClick={() => handleBudgetPreset(preset.value)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition ${budget === preset.value ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600 hover:border-indigo-300 hover:bg-indigo-50"}`}
              >
                <span>{preset.icon}</span>
                <div>
                  <p className="text-sm font-semibold">{preset.label}</p>
                  <p className="text-xs opacity-70">{preset.sub}</p>
                </div>
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Custom amount (₹)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
              <input type="number" min={1000} value={budgetInput} onChange={(e) => handleBudgetInput(e.target.value)}
                className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
          </div>

          {budget > 0 && (
            <div className="flex gap-3">
              {totalDays > 0 && (
                <div className="flex-1 bg-indigo-50 rounded-xl px-4 py-3 text-center">
                  <p className="text-xs text-indigo-500 font-medium">Per day</p>
                  <p className="text-lg font-bold text-indigo-700">{formatINR(budgetPerDay)}</p>
                </div>
              )}
              {persons > 1 && (
                <div className="flex-1 bg-purple-50 rounded-xl px-4 py-3 text-center">
                  <p className="text-xs text-purple-500 font-medium">Per person</p>
                  <p className="text-lg font-bold text-purple-700">{formatINR(budgetPerPerson)}</p>
                </div>
              )}
              <div className="flex-1 bg-green-50 rounded-xl px-4 py-3 text-center">
                <p className="text-xs text-green-500 font-medium">Total budget</p>
                <p className="text-lg font-bold text-green-700">{formatINR(budget)}</p>
              </div>
            </div>
          )}
          <p className="text-xs text-gray-400">💡 AI picks best transport and plans activities within this budget</p>
        </div>

        {/* Destinations */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Destinations</h2>
            <button type="button" onClick={addDestination} className="text-sm text-indigo-600 font-medium hover:text-indigo-700">+ Add destination</button>
          </div>
          <p className="text-xs text-gray-400">Days will be split equally across destinations based on your travel dates.</p>

          <div className="space-y-3">
            {destinations.map((dest, i) => (
              <div key={i} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <span className="text-sm font-bold text-gray-400 w-5">{i + 1}</span>
                <input
                  type="text" required value={dest.city}
                  onChange={(e) => updateDestination(i, "city", e.target.value)}
                  placeholder="City (e.g. Jaipur)"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <input
                  type="text" value={dest.country}
                  onChange={(e) => updateDestination(i, "country", e.target.value)}
                  placeholder="Country"
                  className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {destinations.length > 1 && (
                  <button type="button" onClick={() => removeDestination(i)} className="text-gray-300 hover:text-red-400 transition-colors">✕</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} className="px-6 py-3 text-gray-600 font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="submit" disabled={loading}
            className="flex-1 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Creating trip..." : "Create trip →"}
          </button>
        </div>
      </form>
    </div>
  );
}
