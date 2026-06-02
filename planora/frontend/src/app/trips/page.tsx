"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { get, del } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";

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
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  active: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
  completed: "bg-blue-100 text-blue-700",
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function TripCard({ trip, onDelete }: { trip: Trip; onDelete: (id: string) => void }) {
  const destinations = trip.destinations || [];
  const cityNames = destinations.map((d) => d.city).join(" → ") || "No destinations";
  const totalDays = destinations.reduce((sum, d) => sum + (d.duration_days || 0), 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 truncate">{trip.title}</h2>
          <p className="text-sm text-gray-500 mt-0.5 truncate">📍 {cityNames}</p>
        </div>
        <span
          className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
            STATUS_STYLES[trip.status] || "bg-gray-100 text-gray-600"
          }`}
        >
          {trip.status}
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span>📅 {formatDate(trip.start_date)} – {formatDate(trip.end_date)}</span>
        {totalDays > 0 && <span>🗓 {totalDays} days</span>}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Link
          href={`/trips/${trip.id}`}
          className="flex-1 text-center py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          View Trip
        </Link>
        <button
          onClick={() => onDelete(trip.id)}
          className="px-4 py-2 text-sm font-medium text-red-500 border border-red-100 rounded-xl hover:bg-red-50 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function TripsPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    fetchTrips();
  }, []);

  async function fetchTrips() {
    try {
      const data = await get<Trip[]>("/trips");
      setTrips(data);
    } catch (err: any) {
      setError(err.message || "Failed to load trips");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this trip?")) return;
    try {
      await del(`/trips/${id}`);
      setTrips((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete trip");
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Trips</h1>
          <p className="text-gray-500 mt-1">All your travel plans in one place</p>
        </div>
        <Link
          href="/trips/new"
          className="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
        >
          + New Trip
        </Link>
      </div>

      {/* States */}
      {loading && (
        <div className="text-center py-20 text-gray-400">Loading your trips...</div>
      )}

      {error && (
        <div className="text-center py-20 text-red-500">{error}</div>
      )}

      {!loading && !error && trips.length === 0 && (
        <div className="text-center py-20 space-y-4">
          <div className="text-5xl">🧳</div>
          <h2 className="text-xl font-semibold text-gray-700">No trips yet</h2>
          <p className="text-gray-400">Start planning your first adventure</p>
          <Link
            href="/trips/new"
            className="inline-block mt-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Create your first trip
          </Link>
        </div>
      )}

      {!loading && trips.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
