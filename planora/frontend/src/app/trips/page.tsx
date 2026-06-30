"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { get, del } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { useToast } from "@/components/Toast";

type Destination = { city: string; country: string; duration_days: number; };
type Trip = { id: string; title: string; destinations: Destination[]; start_date: string | null; end_date: string | null; status: string; created_at: string; itinerary: any | null; };

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  active: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
  completed: "bg-blue-100 text-blue-700",
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function TripSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse space-y-3">
      <div className="h-5 bg-gray-200 rounded w-2/3" />
      <div className="h-4 bg-gray-100 rounded w-1/2" />
      <div className="h-4 bg-gray-100 rounded w-1/3" />
      <div className="flex gap-2 pt-2">
        <div className="h-9 bg-gray-200 rounded-xl flex-1" />
        <div className="h-9 bg-gray-100 rounded-xl w-20" />
      </div>
    </div>
  );
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
        <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[trip.status] || "bg-gray-100 text-gray-600"}`}>
          {trip.status}
        </span>
      </div>
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span>📅 {formatDate(trip.start_date)} – {formatDate(trip.end_date)}</span>
        {totalDays > 0 && <span>🗓 {totalDays}d</span>}
        {trip.itinerary ? (
          <span className="text-green-600 text-xs font-medium">✅ Itinerary ready</span>
        ) : (
          <span className="text-orange-500 text-xs font-medium">⏳ No itinerary</span>
        )}
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Link href={`/trips/${trip.id}`} className="flex-1 text-center py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors">
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
  const toast = useToast();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/login"); return; }
    fetchTrips();
  }, []);

  async function fetchTrips() {
    try {
      const data = await get<Trip[]>("/trips");
      setTrips(data);
    } catch (err: any) {
      toast.error("Failed to load trips. Please refresh.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this trip? This cannot be undone.")) return;
    try {
      await del(`/trips/${id}`);
      setTrips((prev) => prev.filter((t) => t.id !== id));
      toast.success("Trip deleted.");
    } catch (err: any) {
      toast.error("Failed to delete trip.");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Trips</h1>
          <p className="text-gray-500 mt-1">All your travel plans in one place</p>
        </div>
        <Link href="/trips/new" className="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm">
          + New Trip
        </Link>
      </div>

      {loading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1,2,3].map(i => <TripSkeleton key={i} />)}
        </div>
      )}

      {!loading && trips.length === 0 && (
        <div className="text-center py-20 space-y-4">
          <div className="text-5xl">🧳</div>
          <h2 className="text-xl font-semibold text-gray-700">No trips yet</h2>
          <p className="text-gray-400">Start planning your first adventure</p>
          <Link href="/trips/new" className="inline-block mt-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors">
            Create your first trip
          </Link>
        </div>
      )}

      {!loading && trips.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {trips.map((trip) => <TripCard key={trip.id} trip={trip} onDelete={handleDelete} />)}
        </div>
      )}
    </div>
  );
}
