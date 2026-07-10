// ─── Indian Festival & Surge Calendar ────────────────────────────────────────
// Dates are month (1-based) and day ranges. For festivals that vary by year,
// we use approximate windows that cover the typical range.

export type SurgeLevel = "high" | "medium" | "low";

export type Festival = {
  name: string;
  emoji: string;
  level: SurgeLevel;
  advice: string;
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
    windows: [{ month: 10, startDay: 1, endDay: 15 }],
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
    name: "Rath Yatra",
    emoji: "🎡",
    level: "high",
    advice: "One of India's largest festivals — massive pilgrimage rush to Puri, Odisha. Trains on Howrah-Puri and Bhubaneswar routes pack up weeks in advance. Book 45 days ahead.",
    windows: [
      { month: 6, startDay: 25, endDay: 30 },
      { month: 7, startDay: 1, endDay: 10 },
    ],
  },
  {
    name: "School Holidays Rush",
    emoji: "🎒",
    level: "medium",
    advice: "Last family trips before schools reopen. Hill stations, pilgrimages and religious sites across India see heavy rush. Book hotels early.",
    windows: [
      { month: 7, startDay: 1, endDay: 15 },
    ],
  },
  {
    name: "Guru Purnima",
    emoji: "🌕",
    level: "low",
    advice: "Surge to pilgrimage spots and ashrams across India. Trains to Rishikesh, Varanasi, Shirdi, Haridwar see extra demand.",
    windows: [{ month: 7, startDay: 10, endDay: 22 }],
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
    windows: [
      { month: 8, startDay: 25, endDay: 31 },
      { month: 9, startDay: 1, endDay: 5 },
    ],
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

// ─── Types ────────────────────────────────────────────────────────────────────

export type SurgeResult = {
  detected: boolean;
  festivals: Festival[];
  highestLevel: SurgeLevel | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dateInFestivalWindow(
  date: Date,
  range: { month: number; startDay: number; endDay: number }
): boolean {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return month === range.month && day >= range.startDay && day <= range.endDay;
}

function tripOverlapsFestival(
  start: Date,
  end: Date,
  range: { month: number; startDay: number; endDay: number }
): boolean {
  const current = new Date(start);
  let iterations = 0;
  const maxDays = 60;
  while (current <= end && iterations < maxDays) {
    if (dateInFestivalWindow(current, range)) return true;
    current.setDate(current.getDate() + 1);
    iterations++;
  }
  return false;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function checkFestivalSurge(startDate: string, endDate: string): SurgeResult {
  if (!startDate) return { detected: false, festivals: [], highestLevel: null };

  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date(startDate);

  const detected: Festival[] = [];

  for (const festival of FESTIVALS) {
    const overlaps = festival.windows.some((range) =>
      tripOverlapsFestival(start, end, range)
    );
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