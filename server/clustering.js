// Deterministic keyword/similarity-based clustering engine.
// Structured so it can be swapped for a real embedding/LLM-based model later
// without touching any of the routes that call classifyFeedback().

export const CLUSTER_DEFS = [
  { id: "c1", name: "Campus Connectivity", category: "Technology", description: "Wi-Fi availability, speed, and network reliability across campus buildings and labs.", keywords: ["wifi", "wi-fi", "internet", "network", "connection", "router", "bandwidth", "lan", "hotspot"] },
  { id: "c2", name: "Hostel Maintenance", category: "Hostel", description: "Water supply, bathrooms, electrical fittings, and general upkeep of hostel blocks.", keywords: ["hostel", "water", "bathroom", "washroom", "leakage", "leak", "room", "electricity", "plumbing", "supply"] },
  { id: "c3", name: "Transportation", category: "Transport", description: "College bus punctuality, routes, and transport infrastructure.", keywords: ["bus", "transport", "route", "late", "arrive", "driver", "shuttle", "commute"] },
  { id: "c4", name: "Food Services", category: "Food", description: "Canteen and mess food quality, hygiene, variety, and wait times.", keywords: ["food", "canteen", "mess", "quality", "hygiene", "queue", "meal", "taste", "menu"] },
  { id: "c5", name: "Academic Experience", category: "Academics", description: "Course delivery, faculty communication, and teaching quality concerns.", keywords: ["faculty", "teaching", "course", "lecture", "syllabus", "professor", "class", "curriculum"] },
  { id: "c6", name: "Examination", category: "Examination", description: "Exam scheduling, timetable clarity, and evaluation procedures.", keywords: ["exam", "examination", "timetable", "schedule", "marks", "result", "grading", "revaluation"] },
  { id: "c7", name: "Classroom Infrastructure", category: "Infrastructure", description: "Projectors, seating, air conditioning, and general classroom equipment.", keywords: ["projector", "classroom", "ac", "seating", "chair", "fan", "board", "equipment"] },
  { id: "c8", name: "Library Resources", category: "Library", description: "Book availability, seating capacity, timings, and digital resources.", keywords: ["library", "book", "reading room", "digital", "journal", "seating"] },
];

const NEGATIVE_WORDS = ["slow", "late", "poor", "broken", "not working", "delay", "delayed", "issue", "problem", "bad", "urgent", "leak", "leakage", "shortage", "inconsistent", "dirty", "unhygienic", "outdated", "drops", "frequently", "long", "unresolved", "worst", "never", "insufficient", "malfunctioning"];
const POSITIVE_WORDS = ["good", "great", "improved", "thank", "excellent", "helpful", "appreciate", "better", "resolved", "fast", "clean", "smooth"];
const CRITICAL_WORDS = ["urgent", "critical", "weeks", "not fixed", "safety", "unsafe", "days", "months", "never"];

export function classifyFeedback(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  let best = { cluster: CLUSTER_DEFS[CLUSTER_DEFS.length - 1], score: 0 };
  for (const c of CLUSTER_DEFS) {
    const score = c.keywords.reduce((s, k) => s + (text.includes(k) ? 1 : 0), 0);
    if (score > best.score) best = { cluster: c, score };
  }
  let sentiment = "NEUTRAL";
  const neg = NEGATIVE_WORDS.some((w) => text.includes(w));
  const pos = POSITIVE_WORDS.some((w) => text.includes(w));
  if (neg && !pos) sentiment = "NEGATIVE";
  else if (pos && !neg) sentiment = "POSITIVE";
  let priority = "MEDIUM";
  if (CRITICAL_WORDS.some((w) => text.includes(w)) && sentiment === "NEGATIVE") priority = "CRITICAL";
  else if (sentiment === "NEGATIVE") priority = "HIGH";
  else if (sentiment === "POSITIVE") priority = "LOW";
  return { clusterId: best.cluster.id, category: best.cluster.category, sentiment, priority };
}
