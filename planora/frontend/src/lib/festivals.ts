// ─── Indian Festival & Surge Calendar ────────────────────────────────────────
// Dates are month (1-based) and day ranges. For festivals that vary by year,
// we use approximate windows that cover the typical range.

export type SurgeLevel = "high" | "medium" | "low";

export type Festival = {
  name: string;
  emoji: string;
  level: SurgeLevel;
  advice: string;
  // Array of { month, startDay, endDay } windows (repeats for multi-year ranges)
  windows: { month: number; startDay: number; endDay: number }[];
};

export const FESTIVALS: Festival[] = [
  {
    name: "Diwali",
    emoji: "🪔",
    level: "high",
    advice: "Trains book out 90 days in advance. Flights cost 2-3x normal price. Book immediately or pick dates 1 week before/after.",
    windows: [
      { month: 10, startDay: 20, endDay: 31 },
      { month: 11, startDay: 1, endDay: 5 },
    ],
  },
  {
    name: "Holi",
    emoji: "🎨",
    level: "high",
    advice: "Heavy travel to Mathura, Vrindavan, Jaipur. Book trains and hotels at least 60 days in advance.",
    windows: [{ month: 3, startDay: 10, endDay: 20 }],
  },
  {
    name: "Navratri / Durga Puja",
    emoji: "🙏",
    level: "high",
    advice: "Massive surge especially to Kolkata, Varanasi, Gujarat. Flights and trains fill up fast — book 45+ days ahead.",
    windows: [
      { month: 10, startDay: 1, endDay: 15 },
    ],
  },
  {
    name: "New Year",
    emoji: "🎆",
    level: "high",
    advice: "Goa, Mumbai, Delhi see 3-4x price surge. Hotels are fully booked weeks in advance. Book NOW.",
    windows: [
      { month: 12, startDay: 26, endDay: 31 },
      { month: 1, startDay: 1, endDay: 3 },
    ],
  },
  {
    name: "Summer Holidays",
    emoji: "☀️",
    level: "high",
    advice: "Peak family travel season. Hill stations (Shimla, Manali, Ooty) are fully booked. Prices surge 50-100%. Book 2 months ahead.",
    windows: [
      { month: 5, startDay: 1, endDay: 31 },
      { month: 6, startDay: 1, endDay: 15 },
    ],
  },
  {
    name: "Eid ul-Fitr",
    emoji: "🌙",
    level: "high",
    advice: "High demand across all routes. Trains to Lucknow, Hyderabad, Mumbai especially busy. Book 60 days in advance.",
    windows: [
      { month: 3, startDay: 28, endDay: 31 },
      { month: 4, startDay: 1, endDay: 10 },
    ],
  },
  {
    name: "Christmas",
    emoji: "🎄",
    level: "medium",
    advice: "Popular travel time for Goa, Kerala, hills. Prices rise 30-50%. Book hotels and flights 3-4 weeks ahead.",
    windows: [{ month: 12, startDay: 22, endDay: 26 }],
  },
  {
    name: "Ganesh Chaturthi",
    emoji: "🐘",
    level: "medium",
    advice: "Heavy travel to Mumbai and Pune. Expect crowded trains on Western Railway. Book 30 days in advance.",
    windows: [{ month: 8, startDay: 25, endDay: 31 }, { month: 9, startDay: 1, endDay: 5 }],
  },
  {
    name: "Pongal / Makar Sankranti",
    emoji: "🌾",
    level: "medium",
    advice: "Surge in South India routes especially Chennai, Madurai, Tirupati. Book trains early.",
    windows: [{ month: 1, startDay: 13, endDay: 17 }],
  },
  {
    name: "Republic Day Long Weekend",
    emoji: "🇮🇳",
    level: "low",
    advice: "Mild surge — good time to travel but book trains 2-3 weeks ahead.",
    windows: [{ month: 1, startDay: 24, endDay: 27 }],
  },
  {
    name: "Independence Day Long Weekend",
    emoji: "🇮🇳",
    level: "low",
    advice: "Mild surge on popular routes. Hill stations and beach destinations see increased footfall.",
    windows: [{ month: 8, startDay: 13, endDay: 16 }],
  },
];

// ─── Check if dates fall in any festival window ───────────────────────────────

export type SurgeResult = {
  detected: boolean;
  festivals: Festival[];
  highestLevel: SurgeLevel | null;
};

function dateInWindow(
  date: Date,
  window: { month: number; startDay: number; endDay: number }
): boolean {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return month === window.month && day >= window.startDay && day <= window.endDay;
}

function datesOverlapWindow(
  start: Date,
  end: Date,
  window: { month: number; startDay: number; endDay: number }
): boolean {
  // Check each day in the trip range (up to 30 days)
  const current = new Date(start);
  while (current <= end) {
    if (dateInWindow(current, window)) return true;
    current.setDate(current.getDate() + 1);
    if (current.getTime() - start.getTime() > 30 * 24 * 60 * 60 * 1000) break;
  }
  return false;
}

export function checkFestivalSurge(startDate: string, endDate: string): SurgeResult {
  if (!startDate) return { detected: false, festivals: [], highestLevel: null };

  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date(startDate);

  const detected: Festival[] = [];

  for (const festival of FESTIVALS) {
    const overlaps = festival.windows.some((w) => datesOverlapWindow(start, end, w));
    if (overlaps) detected.push(festival);
  }

  const highestLevel: SurgeLevel | null =
    detected.some((f) => f.level === "high")
      ? "high"
      : detected.some((f) => f.level === "medium")
      ? "medium"
      : detected.length > 0
      ? "low"
      : null;

  return { detected: detected.length > 0, festivals: detected, highestLevel };
}
