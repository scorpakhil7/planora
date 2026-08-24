"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import { PageLoader, ButtonLoader } from "@/components/GlobeLoader";
import {
  getProfile,
  updateProfile,
  changePassword,
  updateTravelers,
  updateTravelPreferences,
  type UserProfile,
  type Traveler,
  type TravelPreferences,
} from "@/lib/api";

const RELATIONS = ["Spouse", "Parent", "Child", "Sibling", "Grandparent", "Other"];

const DIETARY_OPTIONS = [
  { label: "Vegetarian", value: "vegetarian", icon: "🥗" },
  { label: "Non-Vegetarian", value: "non_vegetarian", icon: "🍗" },
  { label: "Vegan", value: "vegan", icon: "🌱" },
  { label: "Jain", value: "jain", icon: "🙏" },
  { label: "No preference", value: "none", icon: "🍽️" },
];

const HOTEL_TIERS = [
  { label: "Dharmashala", sub: "₹100–₹500/night", value: "dharmashala", icon: "🛕" },
  { label: "Budget", sub: "₹500–₹1,500/night", value: "budget", icon: "🎒" },
  { label: "Mid-range", sub: "₹1,500–₹4,000/night", value: "mid_range", icon: "🏨" },
  { label: "Premium", sub: "₹4,000–₹10,000/night", value: "premium", icon: "✨" },
  { label: "Luxury", sub: "₹10,000+/night", value: "luxury", icon: "👑" },
];

const SEAT_CLASSES = [
  { label: "Sleeper", value: "sleeper" },
  { label: "AC 3-Tier", value: "ac_3tier" },
  { label: "AC 2-Tier", value: "ac_2tier" },
  { label: "AC 1st Class", value: "ac_1tier" },
  { label: "Economy (flight)", value: "economy" },
  { label: "Business (flight)", value: "business" },
];

function newTravelerId() {
  return Math.random().toString(36).slice(2, 10);
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
      <div>
        <h2 className="font-semibold text-gray-800">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

const inputClass =
  "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm";

export default function ProfilePage() {
  const router = useRouter();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Account form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Travelers
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [savingTravelers, setSavingTravelers] = useState(false);

  // Travel preferences
  const [dietary, setDietary] = useState<string | null>(null);
  const [hotelTier, setHotelTier] = useState<string | null>(null);
  const [seatClass, setSeatClass] = useState<string | null>(null);
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    (async () => {
      try {
        const p = await getProfile();
        setProfile(p);
        setName(p.name);
        setPhone(p.preferences?.phone || "");
        setTravelers(p.preferences?.travelers || []);
        const tp = p.preferences?.travel_preferences || {};
        setDietary(tp.dietary || null);
        setHotelTier(tp.hotel_tier || null);
        setSeatClass(tp.seat_class || null);
      } catch (err: any) {
        toast.error(err.message || "Couldn't load your profile.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault();
    setSavingAccount(true);
    try {
      const updated = await updateProfile({ name, phone });
      setProfile(updated);
      toast.success("Profile updated.");
    } catch (err: any) {
      toast.error(err.message || "Couldn't update profile.");
    } finally {
      setSavingAccount(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match.");
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword({ current_password: currentPassword, new_password: newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed.");
    } catch (err: any) {
      toast.error(err.message || "Couldn't change password.");
    } finally {
      setSavingPassword(false);
    }
  }

  function addTraveler() {
    setTravelers((prev) => [
      ...prev,
      { id: newTravelerId(), name: "", relation: "Parent", age: undefined, dietary: "", accessibility_needs: "" },
    ]);
  }

  function updateTraveler(id: string, patch: Partial<Traveler>) {
    setTravelers((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function removeTraveler(id: string) {
    setTravelers((prev) => prev.filter((t) => t.id !== id));
  }

  async function handleSaveTravelers() {
    const cleaned = travelers.filter((t) => t.name.trim().length > 0);
    setSavingTravelers(true);
    try {
      const updated = await updateTravelers(cleaned);
      setTravelers(updated.preferences?.travelers || []);
      toast.success("Travelers saved.");
    } catch (err: any) {
      toast.error(err.message || "Couldn't save travelers.");
    } finally {
      setSavingTravelers(false);
    }
  }

  async function handleSavePreferences() {
    setSavingPrefs(true);
    try {
      const payload: TravelPreferences = { dietary, hotel_tier: hotelTier, seat_class: seatClass };
      await updateTravelPreferences(payload);
      toast.success("Travel preferences saved.");
    } catch (err: any) {
      toast.error(err.message || "Couldn't save preferences.");
    } finally {
      setSavingPrefs(false);
    }
  }

  if (loading) return <PageLoader label="Loading your profile..." />;
  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Your Profile</h1>
        <p className="text-gray-500 mt-1 text-sm">Manage your account, travelers, and travel preferences.</p>
      </div>

      {/* Account info */}
      <Card title="Account">
        <form onSubmit={handleSaveAccount} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input className={`${inputClass} bg-gray-50 text-gray-400`} value={profile.email} disabled />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
            <input
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />
          </div>
          <button
            type="submit"
            disabled={savingAccount}
            className="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-colors text-sm flex items-center gap-2"
          >
            {savingAccount && <ButtonLoader size={16} />}
            {savingAccount ? "Saving..." : "Save changes"}
          </button>
        </form>
      </Card>

      {/* Password */}
      <Card title="Change password">
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Current password</label>
            <input
              type="password"
              className={inputClass}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
              <input
                type="password"
                className={inputClass}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm new password</label>
              <input
                type="password"
                className={inputClass}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={savingPassword}
            className="px-5 py-2.5 bg-gray-800 text-white font-semibold rounded-xl hover:bg-gray-900 disabled:opacity-60 transition-colors text-sm flex items-center gap-2"
          >
            {savingPassword && <ButtonLoader size={16} />}
            {savingPassword ? "Updating..." : "Update password"}
          </button>
        </form>
      </Card>

      {/* Travelers */}
      <Card
        title="Travelers"
        subtitle="Add family members you plan trips for — their age and needs help the AI plan for everyone, not just you."
      >
        <div className="space-y-3">
          {travelers.length === 0 && (
            <p className="text-sm text-gray-400 italic">No travelers added yet.</p>
          )}
          {travelers.map((t) => (
            <div key={t.id} className="border border-gray-200 rounded-xl p-4 space-y-3 relative">
              <button
                type="button"
                onClick={() => removeTraveler(t.id)}
                className="absolute top-3 right-3 text-gray-300 hover:text-red-400 transition-colors"
              >
                ✕
              </button>
              <div className="grid grid-cols-2 gap-3 pr-6">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                  <input
                    className={inputClass}
                    value={t.name}
                    onChange={(e) => updateTraveler(t.id, { name: e.target.value })}
                    placeholder="e.g. Amma"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Relation</label>
                  <select
                    className={inputClass}
                    value={t.relation || ""}
                    onChange={(e) => updateTraveler(t.id, { relation: e.target.value })}
                  >
                    {RELATIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Age</label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    className={inputClass}
                    value={t.age ?? ""}
                    onChange={(e) =>
                      updateTraveler(t.id, { age: e.target.value ? Number(e.target.value) : undefined })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Dietary</label>
                  <input
                    className={inputClass}
                    value={t.dietary || ""}
                    onChange={(e) => updateTraveler(t.id, { dietary: e.target.value })}
                    placeholder="e.g. Vegetarian"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Accessibility needs</label>
                  <input
                    className={inputClass}
                    value={t.accessibility_needs || ""}
                    onChange={(e) => updateTraveler(t.id, { accessibility_needs: e.target.value })}
                    placeholder="e.g. Wheelchair access"
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addTraveler}
            className="text-sm text-indigo-600 font-medium hover:text-indigo-700"
          >
            + Add traveler
          </button>
        </div>
        <button
          type="button"
          onClick={handleSaveTravelers}
          disabled={savingTravelers}
          className="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-colors text-sm flex items-center gap-2"
        >
          {savingTravelers && <ButtonLoader size={16} />}
          {savingTravelers ? "Saving..." : "Save travelers"}
        </button>
      </Card>

      {/* Travel preferences */}
      <Card title="Travel preferences" subtitle="Defaults the AI will use when planning your trips.">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Dietary</h3>
          <div className="grid grid-cols-2 gap-2">
            {DIETARY_OPTIONS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDietary(dietary === d.value ? null : d.value)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition ${
                  dietary === d.value
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 text-gray-600 hover:border-indigo-300 hover:bg-indigo-50"
                }`}
              >
                <span>{d.icon}</span>
                <span className="text-sm font-medium">{d.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Preferred hotel tier</h3>
          <div className="grid grid-cols-2 gap-2">
            {HOTEL_TIERS.map((h) => (
              <button
                key={h.value}
                type="button"
                onClick={() => setHotelTier(hotelTier === h.value ? null : h.value)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition ${
                  hotelTier === h.value
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 text-gray-600 hover:border-indigo-300 hover:bg-indigo-50"
                }`}
              >
                <span>{h.icon}</span>
                <div>
                  <p className="text-sm font-semibold">{h.label}</p>
                  <p className="text-xs opacity-70">{h.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Preferred seat / travel class</h3>
          <div className="grid grid-cols-2 gap-2">
            {SEAT_CLASSES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSeatClass(seatClass === s.value ? null : s.value)}
                className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition ${
                  seatClass === s.value
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 text-gray-600 hover:border-indigo-300 hover:bg-indigo-50"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSavePreferences}
          disabled={savingPrefs}
          className="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-colors text-sm flex items-center gap-2"
        >
          {savingPrefs && <ButtonLoader size={16} />}
          {savingPrefs ? "Saving..." : "Save preferences"}
        </button>
      </Card>
    </div>
  );
}
