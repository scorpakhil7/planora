"use client";

import { useState, useRef } from "react";
import GlobeLoader from "@/components/GlobeLoader";
import { get } from "@/lib/api";
import { useToast } from "@/components/Toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type Passenger = {
  number: number;
  booking_status: string;
  current_status: string;
  coach: string;
  berth: string;
};

type PNRResult = {
  pnr: string;
  found: boolean;
  train_number?: string;
  train_name?: string;
  date_of_journey?: string;
  from_station?: string;
  to_station?: string;
  departure_time?: string;
  arrival_time?: string;
  journey_class?: string;
  chart_status?: string;
  passengers?: Passenger[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusColor(status: string): string {
  const s = (status || "").toUpperCase();
  if (s.startsWith("CNF")) return "bg-green-100 text-green-700 border-green-200";
  if (s.startsWith("RAC")) return "bg-yellow-100 text-yellow-700 border-yellow-200";
  if (s.startsWith("WL") || s.startsWith("WAIT")) return "bg-red-100 text-red-600 border-red-200";
  return "bg-gray-100 text-gray-600 border-gray-200";
}

function statusLabel(status: string): string {
  const s = (status || "").toUpperCase();
  if (s.startsWith("CNF")) return "✅ Confirmed";
  if (s.startsWith("RAC")) return "⚠️ RAC";
  if (s.startsWith("WL") || s.startsWith("WAIT")) return "❌ Waitlist";
  return status;
}

function chartBadgeColor(status: string): string {
  if ((status || "").toLowerCase().includes("prepared")) {
    return "bg-green-100 text-green-700";
  }
  return "bg-orange-100 text-orange-600";
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ResultSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <GlobeLoader size={56} />
      <p className="text-sm text-gray-400 font-medium animate-pulse">Fetching PNR status...</p>
    </div>
  );
}

function TrainInfoCard({ result }: { result: PNRResult }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
      {/* Train header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Train</p>
          <h2 className="text-xl font-bold text-gray-900">{result.train_name || "—"}</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            #{result.train_number} · {result.journey_class}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Date</p>
          <p className="text-sm font-semibold text-gray-700">{result.date_of_journey || "—"}</p>
          {result.chart_status && (
            <span className={`inline-block mt-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full ${chartBadgeColor(result.chart_status)}`}>
              {result.chart_status}
            </span>
          )}
        </div>
      </div>

      {/* Route */}
      <div className="flex items-center gap-3">
        <div className="flex-1 text-center">
          <p className="text-xl font-bold text-gray-900">{result.departure_time || "—"}</p>
          <p className="text-sm text-gray-600 mt-1 font-medium">{result.from_station || "—"}</p>
        </div>

        <div className="flex flex-col items-center gap-1 px-3">
          <div className="w-16 h-px bg-indigo-200" />
          <span className="text-indigo-400 text-lg">🚂</span>
          <div className="w-16 h-px bg-indigo-200" />
        </div>

        <div className="flex-1 text-center">
          <p className="text-xl font-bold text-gray-900">{result.arrival_time || "—"}</p>
          <p className="text-sm text-gray-600 mt-1 font-medium">{result.to_station || "—"}</p>
        </div>
      </div>
    </div>
  );
}

function PassengerTable({ passengers }: { passengers: Passenger[] }) {
  if (!passengers || passengers.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <p className="text-sm text-gray-400 text-center">Passenger details not available.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Passengers</h3>
      <div className="divide-y divide-gray-50">
        {passengers.map((p) => (
          <div key={p.number} className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center shrink-0">
                {p.number}
              </span>
              <div>
                <p className="text-xs text-gray-400">Booking → Current</p>
                <p className="text-sm font-medium text-gray-700">
                  {p.booking_status} → <span className="font-semibold">{p.current_status}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-right">
              {(p.coach || p.berth) && (
                <div className="text-xs text-gray-500">
                  {p.coach && <span className="font-medium text-gray-700">{p.coach}</span>}
                  {p.berth && <span> · {p.berth}</span>}
                </div>
              )}
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusColor(p.current_status)}`}>
                {statusLabel(p.current_status)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusGuide() {
  const items = [
    { label: "CNF", color: "bg-green-500", desc: "Confirmed — your seat is locked in" },
    { label: "RAC", color: "bg-yellow-400", desc: "Share a berth; may get full seat if cancellations" },
    { label: "WL", color: "bg-red-400", desc: "Waitlist — watch for upgrades after chart prep" },
  ];
  return (
    <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status Guide</p>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full shrink-0 ${item.color}`} />
          <span className="text-xs font-bold text-gray-700 w-8">{item.label}</span>
          <span className="text-xs text-gray-500">{item.desc}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PNRPage() {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [pnrInput, setPnrInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PNRResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [checkedPnr, setCheckedPnr] = useState("");

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    // Allow only digits, max 10
    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPnrInput(val);
  }

  async function handleCheck() {
    const pnr = pnrInput.trim();
    if (pnr.length !== 10) {
      toast.warning("Please enter a valid 10-digit PNR number.");
      inputRef.current?.focus();
      return;
    }

    setLoading(true);
    setResult(null);
    setNotFound(false);
    setCheckedPnr(pnr);

    try {
      const data = await get<PNRResult>(`/pnr/${pnr}`);
      setResult(data);
    } catch (err: any) {
      // API returns fail() with error message — our api.ts throws on success=false
      setNotFound(true);
      toast.info("PNR not found in live search. This may be a newly booked ticket.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleCheck();
  }

  const canCheck = pnrInput.length === 10 && !loading;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">PNR Status</h1>
        <p className="text-gray-500 mt-1">
          Check your Indian Railways ticket status instantly
        </p>
      </div>

      {/* Search card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <label className="block text-sm font-semibold text-gray-700">
          Enter PNR Number
        </label>
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={pnrInput}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="10-digit PNR e.g. 4501234567"
            maxLength={10}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-900 text-lg font-mono tracking-widest placeholder:font-sans placeholder:tracking-normal placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
          />
          <button
            onClick={handleCheck}
            disabled={!canCheck}
            className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {loading ? <GlobeLoader size={22} /> : "Check Status"}
          </button>
        </div>
        <p className="text-xs text-gray-400">
          Your PNR is the 10-digit number printed on your train ticket or IRCTC booking confirmation.
        </p>
      </div>

      {/* Loading skeleton */}
      {loading && <ResultSkeleton />}

      {/* Not found state */}
      {!loading && notFound && (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔍</span>
            <div>
              <h3 className="font-semibold text-amber-800">PNR {checkedPnr} not found</h3>
              <p className="text-sm text-amber-700 mt-1">
                Live data is unavailable for this PNR. This can happen for recently booked
                tickets (data takes ~30 min to appear) or cancelled tickets.
              </p>
            </div>
          </div>
          <a
            href={`https://www.indianrail.gov.in/enquiry/PNR/PnrEnquiry.html?locale=en`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Check on Indian Railways official site →
          </a>
        </div>
      )}

      {/* Result */}
      {!loading && result && (
        <div className="space-y-4">
          {/* PNR badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full border border-indigo-100">
              PNR: {result.pnr}
            </span>
            <span className="text-xs text-gray-400">Last checked just now</span>
          </div>

          <TrainInfoCard result={result} />
          <PassengerTable passengers={result.passengers || []} />
          <StatusGuide />

          {/* IRCTC disclaimer */}
          <div className="text-center pt-2">
            <p className="text-xs text-gray-400">
              Data sourced via web search. For the most accurate status,{" "}
              <a
                href="https://www.indianrail.gov.in/enquiry/PNR/PnrEnquiry.html?locale=en"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-500 hover:underline"
              >
                verify on Indian Railways ↗
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Empty state before any search */}
      {!loading && !result && !notFound && (
        <div className="text-center py-12 space-y-3">
          <div className="text-5xl">🎫</div>
          <p className="text-gray-400 text-sm">Enter your 10-digit PNR above to get started</p>
        </div>
      )}
    </div>
  );
}
