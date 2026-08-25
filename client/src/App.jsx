import React, { useState, useEffect, useMemo } from "react";
import {
  MessageSquare, Shield, LayoutDashboard, Send, Users, BarChart3, LogOut, Lock,
  CheckCircle2, XCircle, AlertTriangle, Search, ChevronRight, Sparkles, Menu, X,
  Sun, Moon, Clock, TrendingUp, TrendingDown, Eye, EyeOff, User, GraduationCap,
  Wifi, Bus, Utensils, BookOpen, Monitor, FileText, Columns3, ArrowRight,
  ShieldCheck, ShieldAlert, Building2, ClipboardList, Trash2, RefreshCw, Loader2,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { api } from "./api.js";

/* ============================================================================
   PYPIRATES — real full-stack client. Every read/write below hits the actual
   Express + PostgreSQL API in ../server — nothing here is mocked. RBAC is
   enforced server-side (see server/auth.js); this UI just reflects it.
============================================================================ */

const palette = {
  ink: "#0A0E1A", surface: "#111629", surfaceRaised: "#161C33", line: "rgba(255,255,255,0.08)",
  blue: "#4C6FFF", violet: "#8B6BFF", cyan: "#4FD1E8", amber: "#F5A623", red: "#F0546B",
  green: "#3FCB8F", paper: "#F6F7FB", paperCard: "#FFFFFF",
};

/* ---------------------------- Client-side clustering demo (landing playground only) --------------- */
const CLUSTER_DEFS = [
  { id: "c1", name: "Campus Connectivity", category: "Technology", keywords: ["wifi", "wi-fi", "internet", "network", "connection", "router", "bandwidth", "lan", "hotspot"] },
  { id: "c2", name: "Hostel Maintenance", category: "Hostel", keywords: ["hostel", "water", "bathroom", "washroom", "leakage", "leak", "room", "electricity", "plumbing", "supply"] },
  { id: "c3", name: "Transportation", category: "Transport", keywords: ["bus", "transport", "route", "late", "arrive", "driver", "shuttle", "commute"] },
  { id: "c4", name: "Food Services", category: "Food", keywords: ["food", "canteen", "mess", "quality", "hygiene", "queue", "meal", "taste", "menu"] },
  { id: "c5", name: "Academic Experience", category: "Academics", keywords: ["faculty", "teaching", "course", "lecture", "syllabus", "professor", "class", "curriculum"] },
  { id: "c6", name: "Examination", category: "Examination", keywords: ["exam", "examination", "timetable", "schedule", "marks", "result", "grading", "revaluation"] },
  { id: "c7", name: "Classroom Infrastructure", category: "Infrastructure", keywords: ["projector", "classroom", "ac", "seating", "chair", "fan", "board", "equipment"] },
  { id: "c8", name: "Library Resources", category: "Library", keywords: ["library", "book", "reading room", "digital", "journal", "seating"] },
];
const NEGATIVE_WORDS = ["slow", "late", "poor", "broken", "not working", "delay", "delayed", "issue", "problem", "bad", "urgent", "leak", "leakage", "shortage", "inconsistent", "dirty", "unhygienic", "outdated", "drops", "frequently", "long", "unresolved", "worst", "never", "insufficient", "malfunctioning"];
const POSITIVE_WORDS = ["good", "great", "improved", "thank", "excellent", "helpful", "appreciate", "better", "resolved", "fast", "clean", "smooth"];
const CRITICAL_WORDS = ["urgent", "critical", "weeks", "not fixed", "safety", "unsafe", "days", "months", "never"];
function classifyFeedback(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  let best = { cluster: CLUSTER_DEFS[CLUSTER_DEFS.length - 1], score: 0 };
  for (const c of CLUSTER_DEFS) {
    const score = c.keywords.reduce((s, k) => s + (text.includes(k) ? 1 : 0), 0);
    if (score > best.score) best = { cluster: c, score };
  }
  let sentiment = "NEUTRAL";
  const neg = NEGATIVE_WORDS.some((w) => text.includes(w));
  const pos = POSITIVE_WORDS.some((w) => text.includes(w));
  if (neg && !pos) sentiment = "NEGATIVE"; else if (pos && !neg) sentiment = "POSITIVE";
  let priority = "MEDIUM";
  if (CRITICAL_WORDS.some((w) => text.includes(w)) && sentiment === "NEGATIVE") priority = "CRITICAL";
  else if (sentiment === "NEGATIVE") priority = "HIGH"; else if (sentiment === "POSITIVE") priority = "LOW";
  const matchedKeywords = best.cluster.keywords.filter((k) => text.includes(k)).slice(0, 4);
  return { clusterId: best.cluster.id, category: best.cluster.category, sentiment, priority, matchedKeywords };
}

/* ---------------------------- Small UI atoms ------------------------------ */
const cat_icon = (category) => ({ Technology: Wifi, Hostel: Building2, Transport: Bus, Food: Utensils, Academics: GraduationCap, Examination: FileText, Infrastructure: Monitor, Library: BookOpen }[category] || MessageSquare);
const sentimentColor = (s) => (s === "NEGATIVE" ? palette.red : s === "POSITIVE" ? palette.green : palette.amber);
const priorityColor = (p) => ({ CRITICAL: palette.red, HIGH: "#FF8A5C", MEDIUM: palette.amber, LOW: palette.green }[p] || palette.amber);
const statusLabel = { SUBMITTED: "Submitted", UNDER_REVIEW: "Under Review", IN_PROGRESS: "In Progress", RESOLVED: "Resolved" };
const statusColor = (s) => ({ SUBMITTED: "#8B93A7", UNDER_REVIEW: palette.amber, IN_PROGRESS: palette.blue, RESOLVED: palette.green }[s]);
const DEPARTMENTS = ["Computer Science", "Electronics", "Mechanical", "Information Technology", "Civil Engineering", "Biotechnology"];

function Badge({ children, color, subtle }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, padding: "3px 9px", borderRadius: 999, color: subtle ? color : "#fff", background: subtle ? `${color}1A` : color, border: subtle ? `1px solid ${color}40` : "none", whiteSpace: "nowrap" }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: subtle ? color : "rgba(255,255,255,0.8)" }} />{children}
    </span>
  );
}

function Logo({ size = 26, dark }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <path d="M6 10a6 6 0 0 1 6-6h16a6 6 0 0 1 6 6v10a6 6 0 0 1-6 6H16l-7 7v-7h-3a6 6 0 0 1-6-6V10z" fill="url(#pgrad)" />
        <circle cx="14" cy="15" r="1.8" fill="white" /><circle cx="20" cy="15" r="1.8" fill="white" /><circle cx="26" cy="15" r="1.8" fill="white" />
        <line x1="14" y1="15" x2="20" y2="15" stroke="white" strokeWidth="1" opacity="0.6" /><line x1="20" y1="15" x2="26" y2="15" stroke="white" strokeWidth="1" opacity="0.6" />
        <defs><linearGradient id="pgrad" x1="0" y1="0" x2="40" y2="40"><stop offset="0" stopColor={palette.blue} /><stop offset="1" stopColor={palette.violet} /></linearGradient></defs>
      </svg>
      <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: size * 0.62, letterSpacing: -0.3, color: dark ? "#fff" : palette.ink }}>PYPIRATES</span>
    </div>
  );
}

function Button({ children, variant = "primary", onClick, style, icon: Icon, type = "button", full, size = "md", disabled }) {
  const base = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "Inter,sans-serif", fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", border: "none", borderRadius: 11, transition: "all .15s ease", width: full ? "100%" : "auto", opacity: disabled ? 0.6 : 1, fontSize: size === "sm" ? 13 : 14.5, padding: size === "sm" ? "8px 14px" : "12px 20px" };
  const variants = {
    primary: { background: `linear-gradient(135deg, ${palette.blue}, ${palette.violet})`, color: "#fff", boxShadow: "0 8px 20px -8px rgba(76,111,255,0.6)" },
    ghost: { background: "transparent", color: "inherit", border: `1px solid ${palette.line}` },
    danger: { background: palette.red, color: "#fff" },
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick} style={{ ...base, ...variants[variant], ...style }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}>
      {Icon && <Icon size={16} />}{children}
    </button>
  );
}

function Card({ children, style, dark, padded = true, onClick, onMouseEnter, onMouseLeave, draggable, onDragOver, onDrop }) {
  return (
    <div onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} draggable={draggable} onDragOver={onDragOver} onDrop={onDrop}
      style={{ background: dark ? palette.surface : palette.paperCard, border: `1px solid ${dark ? palette.line : "rgba(15,20,40,0.08)"}`, borderRadius: 16, padding: padded ? 20 : 0, boxShadow: dark ? "none" : "0 1px 3px rgba(15,20,40,0.04)", ...style }}>
      {children}
    </div>
  );
}

function CountUp({ value, duration = 900 }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let start = null, raf;
    const step = (t) => { if (!start) start = t; const p = Math.min(1, (t - start) / duration); setN(Math.floor(p * value)); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{n.toLocaleString()}</>;
}

function ToastStack({ toasts }) {
  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 999, display: "flex", flexDirection: "column", gap: 10, width: 320 }}>
      {toasts.map((t) => (
        <div key={t.id} style={{ background: palette.surface, border: `1px solid ${palette.line}`, borderRadius: 12, padding: "13px 15px", display: "flex", gap: 10, alignItems: "flex-start", boxShadow: "0 12px 32px rgba(0,0,0,0.35)", animation: "slideIn .25s ease", color: "#fff" }}>
          {t.type === "error" ? <ShieldAlert size={18} color={palette.red} style={{ flexShrink: 0, marginTop: 1 }} /> : <CheckCircle2 size={18} color={palette.green} style={{ flexShrink: 0, marginTop: 1 }} />}
          <div><div style={{ fontWeight: 700, fontSize: 13.5 }}>{t.title}</div>{t.desc && <div style={{ fontSize: 12.5, color: "#9AA3B8", marginTop: 2 }}>{t.desc}</div>}</div>
        </div>
      ))}
    </div>
  );
}

function PageHeader({ title, sub, dark, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
      <div>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 23, fontWeight: 700 }}>{title}</div>
        {sub && <div style={{ color: dark ? "#8B93A7" : "#6B7288", fontSize: 13.5, marginTop: 4 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

function EmptyState({ dark, text, sub, icon: Icon = FileText }) {
  return (
    <Card dark={dark} style={{ textAlign: "center", padding: "44px 20px" }}>
      <Icon size={30} color={dark ? "#4A5170" : "#C7CCDC"} style={{ margin: "0 auto" }} />
      <div style={{ fontWeight: 700, marginTop: 12 }}>{text}</div>
      <div style={{ color: dark ? "#8B93A7" : "#6B7288", fontSize: 13, marginTop: 4 }}>{sub}</div>
    </Card>
  );
}

function LoadingBlock({ dark }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
      <Loader2 className="spin" size={26} color={dark ? "#4A5170" : "#C7CCDC"} />
    </div>
  );
}

function FeedbackRow({ f, dark, onClick, right }) {
  const Icon = cat_icon(f.category);
  const cluster = CLUSTER_DEFS.find((c) => c.id === f.clusterId);
  return (
    <Card dark={dark} onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 14, cursor: onClick ? "pointer" : "default", flexWrap: "wrap" }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: dark ? "rgba(255,255,255,0.06)" : "#F2F4FA", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={16} color={palette.blue} /></div>
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{f.title}</div>
        <div style={{ fontSize: 12, color: dark ? "#8B93A7" : "#6B7288", marginTop: 3 }}>{f.category} • {cluster?.name} • {new Date(f.createdAt).toISOString().slice(0, 10)}</div>
      </div>
      <Badge color={priorityColor(f.priority)} subtle>{f.priority}</Badge>
      <Badge color={statusColor(f.status)}>{statusLabel[f.status]}</Badge>
      {right}
    </Card>
  );
}

function fieldStyle(dark) {
  return { fontSize: 12.5, padding: "9px 11px", borderRadius: 9, border: `1px solid ${dark ? palette.line : "#DEE1EC"}`, background: dark ? palette.surfaceRaised : "#fff", color: "inherit", fontFamily: "Inter,sans-serif" };
}
const inputStyle = { width: "100%", padding: "11px 13px", borderRadius: 10, border: "1px solid #DEE1EC", fontSize: 14, fontFamily: "Inter,sans-serif", outline: "none", boxSizing: "border-box", background: "#fff" };

function Field({ label, children }) {
  return <div style={{ marginBottom: 16 }}><label style={{ fontSize: 12.5, fontWeight: 600, color: "#444B60", display: "block", marginBottom: 6 }}>{label}</label>{children}</div>;
}

function StatusTimeline({ status, dark }) {
  const order = ["SUBMITTED", "UNDER_REVIEW", "IN_PROGRESS", "RESOLVED"];
  const idx = order.indexOf(status);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, margin: "16px 0" }}>
      {order.map((s, i) => (
        <React.Fragment key={s}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: i <= idx ? statusColor(s) : (dark ? "#2A3050" : "#DDE1EE") }} />
            <div style={{ fontSize: 9.5, fontWeight: 600, color: i <= idx ? (dark ? "#C7CCE0" : "#444B60") : "#8B93A7", whiteSpace: "nowrap" }}>{statusLabel[s]}</div>
          </div>
          {i < order.length - 1 && <div style={{ flex: 1, height: 2, background: i < idx ? statusColor(order[i + 1]) : (dark ? "#2A3050" : "#DDE1EE"), marginBottom: 14 }} />}
        </React.Fragment>
      ))}
    </div>
  );
}

function AccessDenied({ dark }) {
  return (
    <Card dark={dark} style={{ textAlign: "center", padding: 50, maxWidth: 460, margin: "60px auto" }}>
      <ShieldAlert size={36} color={palette.red} style={{ margin: "0 auto" }} />
      <div style={{ fontWeight: 700, fontSize: 17, marginTop: 14 }}>Access Denied</div>
      <div style={{ color: dark ? "#8B93A7" : "#6B7288", fontSize: 13.5, marginTop: 6 }}>You don't have permission to access this page. The server returned 403 Forbidden.</div>
    </Card>
  );
}

/* ---------------------------- Landing page --------------------------------- */
function FloatingCard({ label, icon: Icon, style, delay }) {
  return (
    <div style={{ position: "absolute", ...style, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(10px)", borderRadius: 12, padding: "9px 13px", display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 600, color: "#E4E8F5", animation: `floatY 5.5s ease-in-out ${delay}s infinite` }}>
      <Icon size={14} color={palette.cyan} /> {label}
    </div>
  );
}

function ClusteringPlayground() {
  const [title, setTitle] = useState("Hostel bathroom water leakage has not been fixed for two weeks");
  const [desc, setDesc] = useState("The washroom on the third floor has a persistent leak and maintenance hasn't responded.");
  const result = useMemo(() => classifyFeedback(title, desc), [title, desc]);
  const cluster = CLUSTER_DEFS.find((c) => c.id === result.clusterId);
  return (
    <Card dark style={{ marginTop: 24, maxWidth: 880, marginLeft: "auto", marginRight: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, marginBottom: 4 }}><Sparkles size={16} color={palette.cyan} /> Try the clustering engine yourself</div>
      <div style={{ fontSize: 12.5, color: "#8B93A7", marginBottom: 18 }}>Type any feedback and watch it get classified live — the real server runs the exact same logic on submit.</div>
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 20 }} className="grid-2">
        <div>
          <Field label="Title"><input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Description"><textarea style={{ ...inputStyle, minHeight: 90 }} value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#8B93A7", marginBottom: 10 }}>LIVE RESULT</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 13, color: "#9AA3B8" }}>Cluster</span><span style={{ fontWeight: 700, fontSize: 13, textAlign: "right" }}>{cluster?.name}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 13, color: "#9AA3B8" }}>Category</span><span style={{ fontWeight: 700, fontSize: 13 }}>{result.category}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 13, color: "#9AA3B8" }}>Sentiment</span><Badge color={sentimentColor(result.sentiment)} subtle>{result.sentiment}</Badge></div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 13, color: "#9AA3B8" }}>Priority</span><Badge color={priorityColor(result.priority)} subtle>{result.priority}</Badge></div>
            <div>
              <span style={{ fontSize: 13, color: "#9AA3B8" }}>Matched keywords</span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 7 }}>
                {result.matchedKeywords.length ? result.matchedKeywords.map((k) => <span key={k} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 999, background: "rgba(255,255,255,0.08)", color: "#C9CFEA" }}>#{k}</span>) : <span style={{ fontSize: 12, color: "#666E82" }}>none yet — try mentioning wifi, hostel, bus, food…</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function Landing({ go }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const navItems = ["How It Works", "Features", "Security", "About"];

  return (
    <div style={{ background: palette.ink, color: "#fff", minHeight: "100%" }}>
      <style>{`
        @keyframes floatY { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes pulseGlow { 0%,100%{opacity:.5} 50%{opacity:1} }
        @keyframes fadeUp { from{opacity:0; transform:translateY(14px)} to{opacity:1; transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0; transform:translateX(20px)} to{opacity:1; transform:translateX(0)} }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.9s linear infinite; }
        .fadeUp { animation: fadeUp .6s ease both; }
        @media (prefers-reduced-motion: reduce) { *{animation:none !important; transition:none !important;} }
      `}</style>
      <div style={{ position: "sticky", top: 0, zIndex: 50, padding: "14px 6%", display: "flex", alignItems: "center", justifyContent: "space-between", background: scrolled ? "rgba(10,14,26,0.75)" : "transparent", backdropFilter: scrolled ? "blur(14px)" : "none", borderBottom: scrolled ? `1px solid ${palette.line}` : "1px solid transparent", transition: "all .25s ease" }}>
        <Logo dark />
        <div style={{ display: "flex", gap: 28, fontSize: 14, fontWeight: 500, color: "#B9C0D4" }} className="hide-mobile">
          {navItems.map((n) => <span key={n} style={{ cursor: "pointer" }} onClick={() => document.getElementById(n.toLowerCase().replaceAll(" ", "-"))?.scrollIntoView({ behavior: "smooth" })}>{n}</span>)}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="ghost" onClick={() => go("login")}>Login</Button>
          <Button onClick={() => go("register")}>Get Started</Button>
        </div>
      </div>

      <div style={{ padding: "64px 6% 40px", display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 40, alignItems: "center" }} className="hero-grid">
        <div className="fadeUp">
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(76,111,255,0.12)", border: "1px solid rgba(76,111,255,0.3)", padding: "6px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, color: "#9DB0FF", marginBottom: 22 }}>
            <Sparkles size={13} /> AI-Powered Student Feedback Intelligence
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "clamp(34px,4.5vw,54px)", lineHeight: 1.08, fontWeight: 700, letterSpacing: -1, margin: 0 }}>Every Voice.<br />One Clear Picture.</h1>
          <p style={{ fontSize: 16.5, color: "#A6AEC4", lineHeight: 1.6, maxWidth: 480, marginTop: 20 }}>PYPIRATES transforms scattered student feedback into intelligent clusters — helping institutions spot recurring concerns and turn student voices into meaningful action.</p>
          <div style={{ display: "flex", gap: 12, marginTop: 30, flexWrap: "wrap" }}>
            <Button icon={Send} onClick={() => go("register")}>Submit Feedback</Button>
            <Button variant="ghost" icon={LayoutDashboard} onClick={() => go("login")}>Explore Dashboard</Button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 26, fontSize: 12.5, color: "#7C8399" }}><ShieldCheck size={15} color={palette.green} /> Protected by Role-Based Access Control</div>
        </div>
        <div style={{ position: "relative", height: 420 }} className="fadeUp">
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 50%, rgba(139,107,255,0.18), transparent 60%)" }} />
          <FloatingCard label="Wi-Fi connectivity" icon={Wifi} style={{ top: 10, left: 0 }} delay={0} />
          <FloatingCard label="Hostel maintenance" icon={Building2} style={{ top: 60, right: 10 }} delay={0.6} />
          <FloatingCard label="Transport delays" icon={Bus} style={{ top: 200, left: 10 }} delay={1.2} />
          <FloatingCard label="Food quality" icon={Utensils} style={{ top: 250, right: 30 }} delay={1.8} />
          <FloatingCard label="Exam scheduling" icon={FileText} style={{ top: 340, left: 60 }} delay={2.2} />
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 132, height: 132, borderRadius: "50%", background: `conic-gradient(from 0deg, ${palette.blue}, ${palette.violet}, ${palette.cyan}, ${palette.blue})`, display: "flex", alignItems: "center", justifyContent: "center", animation: "pulseGlow 3s ease-in-out infinite", boxShadow: "0 0 60px rgba(139,107,255,0.4)" }}>
            <div style={{ width: 106, height: 106, borderRadius: "50%", background: palette.ink, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <Sparkles size={20} color={palette.cyan} /><span style={{ fontSize: 10.5, fontWeight: 700, color: "#C9CFEA" }}>AI ENGINE</span>
            </div>
          </div>
        </div>
      </div>

      <div id="how-it-works" style={{ padding: "80px 6%", background: palette.surface }}>
        <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 48px" }}>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 32, fontWeight: 700, letterSpacing: -0.5 }}>Student Feedback Shouldn't Get Lost in the Noise</h2>
          <p style={{ color: "#9AA3B8", fontSize: 15.5, marginTop: 10 }}>Hundreds of concerns arrive every week. Reading and grouping them by hand doesn't scale.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, marginBottom: 60 }} className="grid-3">
          {[{ t: "Too Much Feedback", d: "Hundreds of student concerns arrive through different channels every week.", icon: MessageSquare }, { t: "Manual Grouping", d: "Staff spend significant time reading and categorizing similar concerns by hand.", icon: Columns3 }, { t: "Delayed Insights", d: "Recurring issues may not become visible to decision-makers quickly enough.", icon: Clock }].map((c) => (
            <Card key={c.t} dark style={{ textAlign: "left" }}><c.icon size={20} color={palette.violet} /><div style={{ fontWeight: 700, fontSize: 16, marginTop: 12 }}>{c.t}</div><div style={{ color: "#8B93A7", fontSize: 13.5, marginTop: 6, lineHeight: 1.55 }}>{c.d}</div></Card>
          ))}
        </div>
        <div style={{ textAlign: "center", fontWeight: 700, fontSize: 18, color: palette.cyan, marginBottom: 56 }}>PYPIRATES changes this.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }} className="grid-4">
          {[{ n: "01", t: "Collect", d: "Students securely submit their concerns." }, { n: "02", t: "Understand", d: "The system analyzes category, sentiment and keywords." }, { n: "03", t: "Cluster", d: "Similar concerns are grouped together automatically." }, { n: "04", t: "Act", d: "Administrators identify priorities and take action." }].map((s) => (
            <Card key={s.n} dark><div style={{ fontFamily: "'JetBrains Mono',monospace", color: palette.blue, fontWeight: 600, fontSize: 13 }}>{s.n}</div><div style={{ fontWeight: 700, fontSize: 17, marginTop: 8 }}>{s.t}</div><div style={{ color: "#8B93A7", fontSize: 13, marginTop: 6 }}>{s.d}</div></Card>
          ))}
        </div>
        <ClusteringPlayground />
      </div>

      <div id="features" style={{ padding: "80px 6%" }}>
        <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 30, fontWeight: 700, textAlign: "center", marginBottom: 44 }}>Built for real feedback operations</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }} className="grid-3">
          {[{ t: "Intelligent Clustering", d: "Automatically groups similar student concerns using category and keyword analysis.", icon: Sparkles }, { t: "Sentiment Detection", d: "Identifies whether feedback is positive, neutral, or negative.", icon: TrendingUp }, { t: "Priority Detection", d: "Highlights issues that require urgent attention.", icon: AlertTriangle }, { t: "Real-Time Insights", d: "Administrators monitor recurring issues as they emerge.", icon: BarChart3 }, { t: "Secure Feedback", d: "Student data is protected through role-based access control.", icon: Lock }, { t: "Action Tracking", d: "Track issues from submission through to resolution.", icon: ClipboardList }].map((f) => (
            <Card key={f.t} dark onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-3px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"} style={{ transition: "transform .2s" }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(76,111,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}><f.icon size={18} color={palette.blue} /></div>
              <div style={{ fontWeight: 700, fontSize: 15.5, marginTop: 14 }}>{f.t}</div><div style={{ color: "#8B93A7", fontSize: 13.5, marginTop: 6, lineHeight: 1.55 }}>{f.d}</div>
            </Card>
          ))}
        </div>
      </div>

      <div id="security" style={{ padding: "80px 6%", background: palette.surface }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: palette.cyan, fontWeight: 700, fontSize: 13 }}><Shield size={16} /> SECURITY</div>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 30, fontWeight: 700, marginTop: 8 }}>Built With Security at the Core</h2>
          <p style={{ color: "#9AA3B8", maxWidth: 560, margin: "10px auto 0", fontSize: 15 }}>Role-Based Access Control (RBAC) ensures only authorized users can reach sensitive information and administrative functionality — enforced on every server request, not just hidden in the UI.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 820, margin: "0 auto" }} className="grid-2">
          <Card dark>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 16 }}><GraduationCap size={18} color={palette.blue} /> Student</div>
            {[["Submit feedback", true], ["View own feedback", true], ["View personal status", true], ["View all feedback", false], ["View analytics", false], ["Access admin panel", false]].map(([l, ok]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 12, fontSize: 13.5, color: ok ? "#D6DAE8" : "#666E82" }}>{ok ? <CheckCircle2 size={15} color={palette.green} /> : <XCircle size={15} color={palette.red} />} {l}</div>
            ))}
          </Card>
          <Card dark>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 16 }}><Shield size={18} color={palette.violet} /> Admin</div>
            {["View all feedback", "Analyze clusters", "View analytics", "Manage issue status", "Access administrative tools"].map((l) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 12, fontSize: 13.5, color: "#D6DAE8" }}><CheckCircle2 size={15} color={palette.green} /> {l}</div>
            ))}
          </Card>
        </div>
      </div>

      <div id="about" style={{ padding: "80px 6%", textAlign: "center" }}>
        <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 700 }}>Turning student voices into action</h2>
        <p style={{ color: "#9AA3B8", maxWidth: 620, margin: "14px auto 30px", lineHeight: 1.6 }}>PYPIRATES was designed to reduce the manual effort involved in processing student feedback — helping institutions identify recurring concerns, understand sentiment, prioritize issues, track resolution, and make data-driven decisions.</p>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 13, color: "#7C8399", fontWeight: 600 }}>
          {["Student Voices", "AI Processing", "Clusters", "Insights", "Action"].map((s, i, arr) => (
            <React.Fragment key={s}><span style={{ padding: "8px 14px", borderRadius: 999, background: "rgba(255,255,255,0.06)", border: `1px solid ${palette.line}` }}>{s}</span>{i < arr.length - 1 && <ArrowRight size={14} color="#555C70" />}</React.Fragment>
          ))}
        </div>
      </div>

      <div style={{ padding: "44px 6%", borderTop: `1px solid ${palette.line}`, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
        <div><Logo dark size={22} /><div style={{ color: "#6C7387", fontSize: 12.5, marginTop: 8, maxWidth: 260 }}>Turning student feedback into actionable intelligence.</div></div>
        <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
          {[["Platform", ["How It Works", "Features", "Security"]], ["Company", ["About", "Contact"]], ["Legal", ["Privacy", "Terms"]]].map(([h, links]) => (
            <div key={h}><div style={{ fontSize: 12, fontWeight: 700, color: "#8B93A7", marginBottom: 10 }}>{h}</div>{links.map((l) => <div key={l} style={{ fontSize: 13, color: "#5B6278", marginBottom: 7 }}>{l}</div>)}</div>
          ))}
        </div>
      </div>
      <style>{`@media (max-width: 860px) { .hero-grid, .grid-3, .grid-4, .grid-2 { grid-template-columns: 1fr !important; } .hide-mobile { display: none !important; } }`}</style>
    </div>
  );
}

/* ---------------------------- Auth pages ----------------------------------- */
function AuthShell({ children, title, sub }) {
  return (
    <div style={{ minHeight: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", background: palette.ink }} className="auth-grid">
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 8%", background: `linear-gradient(160deg, ${palette.ink}, #151B33)`, color: "#fff", position: "relative", overflow: "hidden" }} className="auth-left">
        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,107,255,0.18), transparent 70%)", top: -100, right: -120 }} />
        <Logo dark size={30} />
        <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 30, marginTop: 40, lineHeight: 1.2, maxWidth: 360 }}>Every voice, understood at scale.</h2>
        <p style={{ color: "#98A0B8", marginTop: 14, maxWidth: 340, lineHeight: 1.6 }}>Backed by a real authenticated session and server-side role checks on every request.</p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 40, fontSize: 13, color: "#8B93A7" }}><Lock size={15} color={palette.cyan} /> Secure Access</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 8%", background: palette.paper }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 24, color: palette.ink }}>{title}</div>
          <div style={{ color: "#6B7288", fontSize: 14, marginTop: 6, marginBottom: 26 }}>{sub}</div>
          {children}
        </div>
      </div>
      <style>{`@media (max-width:800px){ .auth-grid{grid-template-columns:1fr !important;} .auth-left{display:none !important;} }`}</style>
    </div>
  );
}

function LoginPage({ go, doLogin }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false); const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr(""); setLoading(true);
    const res = await doLogin(email, password);
    setLoading(false);
    if (!res.ok) setErr(res.error);
  };
  return (
    <AuthShell title="Welcome back" sub="Log in to continue to PYPIRATES.">
      <form onSubmit={submit}>
        <Field label="Email"><input style={inputStyle} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@pypirates.edu" /></Field>
        <Field label="Password">
          <div style={{ position: "relative" }}>
            <input style={{ ...inputStyle, paddingRight: 40 }} type={showPw ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            <span onClick={() => setShowPw((s) => !s)} style={{ position: "absolute", right: 12, top: 12, cursor: "pointer", color: "#8890A4" }}>{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</span>
          </div>
        </Field>
        {err && <div style={{ background: "#FDE9EC", color: "#B4223A", padding: "10px 12px", borderRadius: 9, fontSize: 13, marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}><ShieldAlert size={15} /> {err}</div>}
        <Button type="submit" full disabled={loading}>{loading ? "Authenticating…" : "Log in"}</Button>
      </form>
      <div style={{ marginTop: 18, fontSize: 13, color: "#6B7288", textAlign: "center" }}>Don't have an account? <span style={{ color: palette.blue, fontWeight: 600, cursor: "pointer" }} onClick={() => go("register")}>Create account</span></div>
      <Card style={{ marginTop: 22, background: "#EEF1FF" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: palette.blue, marginBottom: 6 }}>DEMO ACCOUNTS</div>
        <div style={{ fontSize: 12, color: "#444B60", lineHeight: 1.7 }}>Admin — admin@pypirates.edu / Admin@123<br />Student — aditi.sharma@pypirates.edu / demo123</div>
      </Card>
    </AuthShell>
  );
}

function RegisterPage({ go, doRegister }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", department: DEPARTMENTS[0], year: "1" });
  const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault(); setErr("");
    if (form.password.length < 6) return setErr("Password must be at least 6 characters.");
    if (form.password !== form.confirm) return setErr("Passwords do not match.");
    setLoading(true);
    const res = await doRegister(form);
    setLoading(false);
    if (!res.ok) setErr(res.error);
  };
  return (
    <AuthShell title="Create your account" sub="Registration always creates a STUDENT account — the server never accepts a role from this form.">
      <form onSubmit={submit}>
        <Field label="Full Name"><input style={inputStyle} required value={form.name} onChange={set("name")} placeholder="Aditi Sharma" /></Field>
        <Field label="College Email"><input style={inputStyle} type="email" required value={form.email} onChange={set("email")} placeholder="you@pypirates.edu" /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Department"><select style={inputStyle} value={form.department} onChange={set("department")}>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</select></Field>
          <Field label="Year"><select style={inputStyle} value={form.year} onChange={set("year")}>{[1, 2, 3, 4].map((y) => <option key={y} value={y}>{y}</option>)}</select></Field>
        </div>
        <Field label="Password"><input style={inputStyle} type="password" required value={form.password} onChange={set("password")} placeholder="••••••••" /></Field>
        <Field label="Confirm Password"><input style={inputStyle} type="password" required value={form.confirm} onChange={set("confirm")} placeholder="••••••••" /></Field>
        {err && <div style={{ background: "#FDE9EC", color: "#B4223A", padding: "10px 12px", borderRadius: 9, fontSize: 13, marginBottom: 16 }}>{err}</div>}
        <Button type="submit" full disabled={loading}>{loading ? "Creating account…" : "Create account"}</Button>
      </form>
      <div style={{ marginTop: 18, fontSize: 13, color: "#6B7288", textAlign: "center" }}>Already have an account? <span style={{ color: palette.blue, fontWeight: 600, cursor: "pointer" }} onClick={() => go("login")}>Log in</span></div>
    </AuthShell>
  );
}

/* ---------------------------- Shell (dashboard chrome) ---------------------- */
const STUDENT_NAV = [
  { id: "student-dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "student-new", label: "Submit Feedback", icon: Send },
  { id: "student-feedback", label: "My Feedback", icon: MessageSquare },
  { id: "student-profile", label: "Profile", icon: User },
];
const ADMIN_NAV = [
  { id: "admin-dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "admin-feedback", label: "Feedback", icon: MessageSquare },
  { id: "admin-clusters", label: "AI Clusters", icon: Sparkles },
  { id: "admin-analytics", label: "Analytics", icon: BarChart3 },
  { id: "admin-issues", label: "Issue Resolution", icon: Columns3 },
  { id: "admin-users", label: "Users", icon: Users },
  { id: "admin-security", label: "Security", icon: Shield },
];

function Shell({ session, route, go, logout, theme, toggleTheme, children, onSimulate }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const nav = session.role === "ADMIN" ? ADMIN_NAV : STUDENT_NAV;
  const dark = theme === "dark";
  const runSimulate = async () => { setSimulating(true); await onSimulate(); setSimulating(false); };

  return (
    <div style={{ minHeight: "100%", display: "flex", background: dark ? palette.ink : palette.paper, color: dark ? "#fff" : palette.ink }}>
      <div style={{ width: 236, flexShrink: 0, borderRight: `1px solid ${dark ? palette.line : "rgba(15,20,40,0.08)"}`, padding: "22px 16px", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }} className="sidebar-desktop">
        <div style={{ padding: "0 6px 24px" }}><Logo dark={dark} size={24} /></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
          {nav.map((item) => {
            const active = route === item.id || route.startsWith(item.id + ":");
            return (
              <div key={item.id} onClick={() => go(item.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, cursor: "pointer", fontSize: 13.5, fontWeight: 600, color: active ? "#fff" : (dark ? "#9AA3B8" : "#5B6278"), background: active ? `linear-gradient(135deg, ${palette.blue}, ${palette.violet})` : "transparent" }}>
                <item.icon size={16} /> {item.label}
              </div>
            );
          })}
        </div>
        <div style={{ borderTop: `1px solid ${dark ? palette.line : "rgba(15,20,40,0.08)"}`, paddingTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 6px 10px" }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(135deg, ${palette.blue}, ${palette.violet})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>{session.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</div>
            <div style={{ overflow: "hidden" }}><div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{session.name}</div><div style={{ fontSize: 11, color: "#8B93A7" }}>{session.role === "ADMIN" ? "Administrator" : "Student"}</div></div>
          </div>
          {session.role === "ADMIN" && (
            <div onClick={runSimulate} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, cursor: simulating ? "wait" : "pointer", fontSize: 13, color: dark ? "#9AA3B8" : "#5B6278" }}>
              <RefreshCw size={15} className={simulating ? "spin" : ""} /> {simulating ? "Simulating…" : "Simulate incoming feedback"}
            </div>
          )}
          <div onClick={toggleTheme} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, cursor: "pointer", fontSize: 13, color: dark ? "#9AA3B8" : "#5B6278" }}>{dark ? <Sun size={15} /> : <Moon size={15} />} {dark ? "Light mode" : "Dark mode"}</div>
          <div onClick={logout} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, cursor: "pointer", fontSize: 13, color: palette.red }}><LogOut size={15} /> Logout</div>
        </div>
      </div>

      <div className="mobile-topbar" style={{ display: "none" }}>
        <Menu size={20} onClick={() => setMobileOpen(true)} /><Logo dark={dark} size={20} /><div />
      </div>
      {mobileOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 60 }} onClick={() => setMobileOpen(false)}>
          <div style={{ width: 240, height: "100%", background: dark ? palette.surface : "#fff", padding: 18 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}><Logo dark={dark} size={22} /><X size={20} onClick={() => setMobileOpen(false)} /></div>
            {nav.map((item) => (
              <div key={item.id} onClick={() => { go(item.id); setMobileOpen(false); }} style={{ display: "flex", gap: 10, padding: "11px 8px", fontWeight: 600, fontSize: 14, color: route === item.id ? palette.blue : (dark ? "#fff" : palette.ink) }}><item.icon size={16} /> {item.label}</div>
            ))}
            <div onClick={logout} style={{ display: "flex", gap: 10, padding: "11px 8px", fontWeight: 600, fontSize: 14, color: palette.red, marginTop: 10 }}><LogOut size={16} /> Logout</div>
          </div>
        </div>
      )}
      <div style={{ flex: 1, padding: "26px 32px", minWidth: 0 }} className="main-content">{children}</div>
      <style>{`
        .spin { animation: spin 0.9s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .sidebar-desktop { display: none !important; }
          .mobile-topbar { display: flex !important; align-items:center; justify-content:space-between; padding: 14px 18px; position: sticky; top:0; z-index: 40; background: ${dark ? palette.ink : "#fff"}; border-bottom: 1px solid ${dark ? palette.line : "#eee"}; }
          .main-content { padding: 18px !important; }
          .grid-4-r, .grid-5-r, .grid-3-r, .grid-2-r { grid-template-columns: repeat(2,1fr) !important; }
        }
        @media (max-width: 560px) { .grid-4-r, .grid-5-r, .grid-3-r, .grid-2-r { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}

/* ---------------------------- Feedback detail modal ------------------------- */
function FeedbackDetailModal({ f, session, dark, onClose, onUpdateStatus, onDelete, isAdmin }) {
  const isOwner = f.userId === session.id;
  const canWithdraw = !isAdmin && isOwner && f.status === "SUBMITTED";
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 85, display: "flex", justifyContent: "flex-end" }} onClick={onClose}>
      <div style={{ width: 440, maxWidth: "92vw", height: "100%", background: dark ? palette.surface : "#fff", padding: 26, overflowY: "auto", animation: "slideIn .2s ease" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}><div style={{ fontWeight: 700, fontSize: 17, maxWidth: 340 }}>{f.title}</div><X size={18} style={{ cursor: "pointer", flexShrink: 0 }} onClick={onClose} /></div>
        <div style={{ fontSize: 12, color: dark ? "#8B93A7" : "#6B7288", marginTop: 6 }}>{isAdmin ? f.studentName : "Submitted by you"} • {new Date(f.createdAt).toISOString().slice(0, 10)}</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.6, marginTop: 16, color: dark ? "#C7CCE0" : "#333A4D" }}>{f.description}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>
          <Badge color={sentimentColor(f.sentiment)} subtle>{f.sentiment}</Badge><Badge color={priorityColor(f.priority)} subtle>{f.priority}</Badge><Badge color={palette.blue} subtle>{f.category}</Badge>
        </div>
        <StatusTimeline status={f.status} dark={dark} />
        {isAdmin && onUpdateStatus && (
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "#8B93A7", marginBottom: 6 }}>UPDATE STATUS</div>
            <select value={f.status} onChange={(e) => onUpdateStatus(f.id, e.target.value)} style={{ ...fieldStyle(dark), width: "100%", boxSizing: "border-box" }}>{Object.keys(statusLabel).map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}</select>
          </div>
        )}
        {(isAdmin || canWithdraw) && onDelete && (
          <div style={{ marginTop: 24, borderTop: `1px solid ${dark ? palette.line : "#EEF0F6"}`, paddingTop: 16 }}>
            <Button variant="danger" size="sm" icon={Trash2} onClick={() => onDelete(f.id)}>{isAdmin ? "Delete feedback" : "Withdraw feedback"}</Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------- Student pages --------------------------------- */
function StudentDashboard({ session, dark, go, refreshKey }) {
  const [items, setItems] = useState(null);
  const [selected, setSelected] = useState(null);
  useEffect(() => { api("/api/my-feedback").then((r) => setItems(r.ok ? r.data : [])); }, [refreshKey]);
  if (items === null) return <LoadingBlock dark={dark} />;
  const counts = { SUBMITTED: 0, UNDER_REVIEW: 0, IN_PROGRESS: 0, RESOLVED: 0 };
  items.forEach((f) => counts[f.status]++);
  const stats = [{ l: "Submitted", v: items.length, c: palette.blue }, { l: "Under Review", v: counts.UNDER_REVIEW, c: palette.amber }, { l: "In Progress", v: counts.IN_PROGRESS, c: palette.violet }, { l: "Resolved", v: counts.RESOLVED, c: palette.green }];
  return (
    <div>
      <PageHeader dark={dark} title={`Good to see you, ${session.name.split(" ")[0]}`} sub="Your voice helps improve campus life." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 22 }} className="grid-4-r">
        {stats.map((s) => <Card key={s.l} dark={dark}><div style={{ fontSize: 12.5, color: dark ? "#8B93A7" : "#6B7288", fontWeight: 600 }}>{s.l}</div><div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 700, marginTop: 6, color: s.c }}><CountUp value={s.v} /></div></Card>)}
      </div>
      <Card dark={dark} style={{ marginBottom: 22, background: `linear-gradient(135deg, ${palette.blue}15, ${palette.violet}15)`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
        <div><div style={{ fontWeight: 700, fontSize: 16 }}>Have a concern about campus life?</div><div style={{ fontSize: 13, color: dark ? "#9AA3B8" : "#6B7288", marginTop: 3 }}>Submit it and our AI clustering engine will route it instantly.</div></div>
        <Button icon={Send} onClick={() => go("student-new")}>Submit New Feedback</Button>
      </Card>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>My Recent Feedback</div>
      {items.length === 0 ? <EmptyState dark={dark} text="No feedback yet" sub="Your submitted feedback will appear here." /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{items.slice(0, 5).map((f) => <FeedbackRow key={f.id} f={f} dark={dark} onClick={() => setSelected(f)} />)}</div>
      )}
      {selected && <FeedbackDetailModal f={selected} session={session} dark={dark} onClose={() => setSelected(null)} isAdmin={false} />}
    </div>
  );
}

function SubmitFeedback({ session, dark, pushToast, go }) {
  const [title, setTitle] = useState(""); const [description, setDescription] = useState(""); const [category, setCategory] = useState(""); const [anonymous, setAnonymous] = useState(false);
  const [stage, setStage] = useState("form"); const [result, setResult] = useState(null); const [err, setErr] = useState("");
  const submit = async (e) => {
    e.preventDefault(); setErr("");
    if (!title.trim() || !description.trim() || !category) { setErr("Please fill in title, description and category."); return; }
    setStage("processing");
    const res = await api("/api/feedback", { method: "POST", body: { title, description, category, anonymous } });
    if (!res.ok) { setStage("form"); setErr(res.error); return; }
    setResult(res.data); setStage("done");
    pushToast({ title: "Feedback submitted successfully", desc: "Your feedback has been added to the appropriate cluster." });
  };
  if (stage === "processing") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 420, gap: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", border: `3px solid ${dark ? palette.line : "#E4E7F1"}`, borderTopColor: palette.blue, animation: "spin 0.9s linear infinite" }} />
        <div style={{ fontWeight: 700 }}>Analyzing your feedback…</div>
        <div style={{ color: dark ? "#8B93A7" : "#6B7288", fontSize: 13 }}>Detecting category, sentiment and the right cluster.</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }
  if (stage === "done" && result) {
    const cluster = CLUSTER_DEFS.find((c) => c.id === result.clusterId);
    return (
      <Card dark={dark} style={{ maxWidth: 520, margin: "40px auto", textAlign: "center", padding: 32 }}>
        <CheckCircle2 size={40} color={palette.green} style={{ margin: "0 auto" }} />
        <div style={{ fontWeight: 700, fontSize: 19, marginTop: 14 }}>Feedback clustered successfully</div>
        <div style={{ color: dark ? "#8B93A7" : "#6B7288", fontSize: 13.5, marginTop: 6 }}>Thank you — the ECC Cell will review this.</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 22, flexWrap: "wrap" }}>
          <div><div style={{ fontSize: 11, color: "#8B93A7", fontWeight: 700 }}>CLUSTER</div><div style={{ fontWeight: 700, marginTop: 4 }}>{cluster?.name}</div></div>
          <div><div style={{ fontSize: 11, color: "#8B93A7", fontWeight: 700 }}>SENTIMENT</div><Badge color={sentimentColor(result.sentiment)} subtle>{result.sentiment}</Badge></div>
          <div><div style={{ fontSize: 11, color: "#8B93A7", fontWeight: 700 }}>PRIORITY</div><Badge color={priorityColor(result.priority)} subtle>{result.priority}</Badge></div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 26 }}>
          <Button variant="ghost" onClick={() => { setStage("form"); setTitle(""); setDescription(""); setCategory(""); }}>Submit another</Button>
          <Button onClick={() => go("student-feedback")}>View my feedback</Button>
        </div>
      </Card>
    );
  }
  return (
    <div style={{ maxWidth: 640 }}>
      <PageHeader dark={dark} title="Tell Us What's Happening" sub="Describe the issue in detail — our AI groups it with similar concerns automatically." />
      <Card dark={dark}>
        <form onSubmit={submit}>
          <Field label="Feedback Title"><input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder='e.g. "Wi-Fi connectivity issue in Block B"' /></Field>
          <Field label="Description"><textarea style={{ ...inputStyle, minHeight: 120, resize: "vertical" }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the issue in detail…" /></Field>
          <Field label="Category">
            <select style={inputStyle} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Select a category</option>
              {["Academics", "Infrastructure", "Hostel", "Transport", "Food", "Faculty", "Examination", "Library", "Fees", "Technology", "Campus Life", "Other"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: dark ? "#9AA3B8" : "#6B7288", marginBottom: 20 }}><input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} /> Submit anonymously</label>
          {err && <div style={{ background: "#FDE9EC", color: "#B4223A", padding: "10px 12px", borderRadius: 9, fontSize: 13, marginBottom: 16 }}>{err}</div>}
          <Button type="submit" icon={Sparkles} full>Analyze & Submit Feedback</Button>
        </form>
      </Card>
    </div>
  );
}

function MyFeedback({ session, dark, pushToast, refreshKey, bumpRefresh }) {
  const [items, setItems] = useState(null);
  const [selected, setSelected] = useState(null);
  useEffect(() => { api("/api/my-feedback").then((r) => setItems(r.ok ? r.data : [])); }, [refreshKey]);
  const withdraw = async (id) => {
    if (!window.confirm("Withdraw this feedback? This can't be undone.")) return;
    const res = await api(`/api/feedback/${id}`, { method: "DELETE" });
    if (res.ok) { setItems((its) => its.filter((f) => f.id !== id)); setSelected(null); pushToast({ title: "Feedback withdrawn" }); }
    else pushToast({ title: "Couldn't withdraw", desc: res.error, type: "error" });
  };
  if (items === null) return <LoadingBlock dark={dark} />;
  return (
    <div>
      <PageHeader dark={dark} title="My Feedback" sub={`${items.length} submission${items.length === 1 ? "" : "s"}`} />
      {items.length === 0 ? <EmptyState dark={dark} text="No feedback yet" sub="Submit your first piece of feedback to see it here." /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{items.map((f) => <FeedbackRow key={f.id} f={f} dark={dark} onClick={() => setSelected(f)} />)}</div>
      )}
      {selected && <FeedbackDetailModal f={selected} session={session} dark={dark} onClose={() => setSelected(null)} onDelete={withdraw} isAdmin={false} />}
    </div>
  );
}

function StudentProfile({ session, dark, pushToast, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: session.name, department: session.department, year: String(session.year || 1) });
  const save = async () => {
    const res = await api("/api/me", { method: "PATCH", body: { name: form.name, department: form.department, year: Number(form.year) } });
    if (res.ok) { onUpdated(res.data); pushToast({ title: "Profile updated" }); setEditing(false); }
    else pushToast({ title: "Couldn't update profile", desc: res.error, type: "error" });
  };
  return (
    <div style={{ maxWidth: 560 }}>
      <PageHeader dark={dark} title="Profile" right={!editing && <Button size="sm" variant="ghost" onClick={() => { setForm({ name: session.name, department: session.department, year: String(session.year || 1) }); setEditing(true); }}>Edit profile</Button>} />
      <Card dark={dark}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 54, height: 54, borderRadius: "50%", background: `linear-gradient(135deg, ${palette.blue}, ${palette.violet})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{session.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</div>
          <div><div style={{ fontWeight: 700, fontSize: 17 }}>{session.name}</div><div style={{ fontSize: 13, color: dark ? "#8B93A7" : "#6B7288" }}>{session.email}</div></div>
        </div>
        {editing ? (
          <div style={{ marginTop: 20 }}>
            <Field label="Full name"><input style={inputStyle} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Department"><select style={inputStyle} value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</select></Field>
              <Field label="Year"><select style={inputStyle} value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}>{[1, 2, 3, 4].map((y) => <option key={y} value={y}>{y}</option>)}</select></Field>
            </div>
            <div style={{ display: "flex", gap: 10 }}><Button size="sm" onClick={save}>Save changes</Button><Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button></div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 20 }}>
            <div><div style={{ fontSize: 11, color: "#8B93A7", fontWeight: 700 }}>DEPARTMENT</div><div style={{ marginTop: 4 }}>{session.department}</div></div>
            <div><div style={{ fontSize: 11, color: "#8B93A7", fontWeight: 700 }}>YEAR</div><div style={{ marginTop: 4 }}>Year {session.year}</div></div>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ---------------------------- Admin pages ------------------------------------ */
function KPI({ label, value, color, dark }) {
  return <Card dark={dark}><div style={{ fontSize: 12.5, color: dark ? "#8B93A7" : "#6B7288", fontWeight: 600 }}>{label}</div><div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 27, fontWeight: 700, marginTop: 6, color }}><CountUp value={value} /></div></Card>;
}

function AdminDashboard({ dark, go, refreshKey }) {
  const [feedback, setFeedback] = useState(null);
  const [clusters, setClusters] = useState(null);
  useEffect(() => {
    api("/api/admin/feedback").then((r) => setFeedback(r.ok ? r.data : []));
    api("/api/admin/clusters").then((r) => setClusters(r.ok ? r.data : []));
  }, [refreshKey]);
  if (feedback === null || clusters === null) return <LoadingBlock dark={dark} />;
  const critical = feedback.filter((f) => f.priority === "CRITICAL" || f.priority === "HIGH").length;
  const resolved = feedback.filter((f) => f.status === "RESOLVED").length;
  return (
    <div>
      <PageHeader dark={dark} title="Feedback Intelligence" sub="A real-time view of what students are saying." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginBottom: 22 }} className="grid-5-r">
        <KPI dark={dark} label="Total Feedback" value={feedback.length} color={palette.blue} />
        <KPI dark={dark} label="Active Issues" value={feedback.filter((f) => f.status !== "RESOLVED").length} color={palette.amber} />
        <KPI dark={dark} label="Critical Concerns" value={critical} color={palette.red} />
        <KPI dark={dark} label="Resolved" value={resolved} color={palette.green} />
        <KPI dark={dark} label="Clusters" value={clusters.length} color={palette.violet} />
      </div>
      <Card dark={dark}>
        <div style={{ fontWeight: 700, marginBottom: 14 }}>Top Recurring Concerns</div>
        {[...clusters].sort((a, b) => b.feedbackCount - a.feedbackCount).slice(0, 5).map((c) => (
          <div key={c.id} onClick={() => go(`admin-cluster-detail:${c.id}`)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${dark ? palette.line : "#EEF0F6"}`, cursor: "pointer" }}>
            <div><div style={{ fontWeight: 600, fontSize: 13.5 }}>{c.name}</div><div style={{ fontSize: 11.5, color: "#8B93A7" }}>{c.feedbackCount} feedback items</div></div>
            <Badge color={priorityColor(c.priority)} subtle>{c.priority}</Badge>
          </div>
        ))}
      </Card>
    </div>
  );
}

function AdminFeedback({ session, dark, pushToast, refreshKey, bumpRefresh }) {
  const [items, setItems] = useState(null);
  const [q, setQ] = useState(""); const [catF, setCatF] = useState(""); const [sentF, setSentF] = useState(""); const [prF, setPrF] = useState(""); const [stF, setStF] = useState("");
  const [selected, setSelected] = useState(null); const [page, setPage] = useState(1);
  const pageSize = 8;
  useEffect(() => { api("/api/admin/feedback").then((r) => setItems(r.ok ? r.data : [])); }, [refreshKey]);
  if (items === null) return <LoadingBlock dark={dark} />;

  const categories = [...new Set(CLUSTER_DEFS.map((c) => c.category))];
  const filtered = items.filter((f) => (!q || f.title.toLowerCase().includes(q.toLowerCase()) || f.description.toLowerCase().includes(q.toLowerCase())) && (!catF || f.category === catF) && (!sentF || f.sentiment === sentF) && (!prF || f.priority === prF) && (!stF || f.status === stF));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const selStyle = fieldStyle(dark);

  const updateStatus = async (id, status) => {
    const res = await api(`/api/admin/feedback/${id}/status`, { method: "PATCH", body: { status } });
    if (res.ok) { setItems((its) => its.map((f) => (f.id === id ? { ...f, status } : f))); pushToast({ title: "Feedback status updated" }); if (selected?.id === id) setSelected((s) => ({ ...s, status })); }
    else pushToast({ title: "Couldn't update status", desc: res.error, type: "error" });
  };
  const deleteItem = async (id) => {
    if (!window.confirm("Delete this feedback permanently? This can't be undone.")) return;
    const res = await api(`/api/feedback/${id}`, { method: "DELETE" });
    if (res.ok) { setItems((its) => its.filter((f) => f.id !== id)); setSelected(null); pushToast({ title: "Feedback deleted" }); }
    else pushToast({ title: "Couldn't delete", desc: res.error, type: "error" });
  };

  return (
    <div>
      <PageHeader dark={dark} title="Feedback Management" sub={`${filtered.length} of ${items.length} items`} />
      <Card dark={dark} style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: "#8890A4" }} />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search feedback…" style={{ ...selStyle, width: "100%", paddingLeft: 32, boxSizing: "border-box" }} />
          </div>
          <select style={selStyle} value={catF} onChange={(e) => { setCatF(e.target.value); setPage(1); }}><option value="">All categories</option>{categories.map((c) => <option key={c}>{c}</option>)}</select>
          <select style={selStyle} value={sentF} onChange={(e) => { setSentF(e.target.value); setPage(1); }}><option value="">All sentiment</option>{["POSITIVE", "NEUTRAL", "NEGATIVE"].map((s) => <option key={s}>{s}</option>)}</select>
          <select style={selStyle} value={prF} onChange={(e) => { setPrF(e.target.value); setPage(1); }}><option value="">All priority</option>{["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((s) => <option key={s}>{s}</option>)}</select>
          <select style={selStyle} value={stF} onChange={(e) => { setStF(e.target.value); setPage(1); }}><option value="">All status</option>{Object.keys(statusLabel).map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}</select>
        </div>
      </Card>
      {filtered.length === 0 ? <EmptyState dark={dark} text="No matching feedback" sub="Try adjusting your search or filters." icon={Search} /> : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{paged.map((f) => <FeedbackRow key={f.id} f={f} dark={dark} onClick={() => setSelected(f)} />)}</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 18, alignItems: "center" }}>
            <Button size="sm" variant="ghost" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span style={{ fontSize: 12.5, color: dark ? "#8B93A7" : "#6B7288" }}>Page {page} of {totalPages}</span>
            <Button size="sm" variant="ghost" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </>
      )}
      {selected && <FeedbackDetailModal f={selected} session={session} dark={dark} onClose={() => setSelected(null)} onUpdateStatus={updateStatus} onDelete={deleteItem} isAdmin />}
    </div>
  );
}

function AdminClusters({ dark, go, refreshKey }) {
  const [clusters, setClusters] = useState(null);
  useEffect(() => { api("/api/admin/clusters").then((r) => setClusters(r.ok ? r.data : [])); }, [refreshKey]);
  if (clusters === null) return <LoadingBlock dark={dark} />;
  return (
    <div>
      <PageHeader dark={dark} title="AI Feedback Clusters" sub="Automatically grouped concerns, ranked by volume and severity." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }} className="grid-2-r">
        {clusters.map((c) => {
          const Icon = cat_icon(c.category);
          return (
            <Card key={c.id} dark={dark}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: dark ? "rgba(255,255,255,0.06)" : "#F2F4FA", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={17} color={palette.blue} /></div>
                  <div><div style={{ fontWeight: 700, fontSize: 15.5 }}>{c.name}</div><div style={{ fontSize: 12, color: dark ? "#8B93A7" : "#6B7288", marginTop: 2 }}>{c.feedbackCount} feedback items</div></div>
                </div>
                <Badge color={priorityColor(c.priority)} subtle>{c.priority} priority</Badge>
              </div>
              <div style={{ fontSize: 13, color: dark ? "#9AA3B8" : "#5B6278", marginTop: 12, lineHeight: 1.55 }}>{c.description}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
                <Badge color={sentimentColor(c.sentiment)} subtle>{c.sentiment}</Badge>
                <Button size="sm" variant="ghost" onClick={() => go(`admin-cluster-detail:${c.id}`)}>View Cluster <ChevronRight size={14} /></Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ClusterDetail({ session, dark, clusterId, go, pushToast }) {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  useEffect(() => { api(`/api/admin/clusters/${clusterId}`).then((r) => setData(r.ok ? r.data : { cluster: null, items: [] })); }, [clusterId]);
  if (data === null) return <LoadingBlock dark={dark} />;
  if (!data.cluster) return <AccessDenied dark={dark} />;
  const { cluster, items } = data;

  const updateStatus = async (id, status) => {
    const res = await api(`/api/admin/feedback/${id}/status`, { method: "PATCH", body: { status } });
    if (res.ok) { setData((d) => ({ ...d, items: d.items.map((f) => (f.id === id ? { ...f, status } : f)) })); pushToast({ title: "Feedback status updated" }); }
  };

  return (
    <div>
      <div onClick={() => go("admin-clusters")} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: dark ? "#8B93A7" : "#6B7288", cursor: "pointer", marginBottom: 10 }}>← Back to clusters</div>
      <PageHeader dark={dark} title={cluster.name} sub={cluster.description} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>{cluster.keywords.slice(0, 6).map((k) => <span key={k} style={{ fontSize: 11.5, padding: "4px 10px", borderRadius: 999, background: dark ? "rgba(255,255,255,0.06)" : "#F2F4FA", color: dark ? "#B9C0D4" : "#5B6278" }}>#{k}</span>)}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((f) => (
          <Card key={f.id} dark={dark} onClick={() => setSelected(f)} style={{ cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: dark ? "#8B93A7" : "#6B7288", marginTop: 3 }}>{f.studentName} • {new Date(f.createdAt).toISOString().slice(0, 10)}</div>
                <div style={{ fontSize: 13, color: dark ? "#B9C0D4" : "#444B60", marginTop: 8, maxWidth: 520 }}>{f.description}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }} onClick={(e) => e.stopPropagation()}>
                <Badge color={priorityColor(f.priority)} subtle>{f.priority}</Badge>
                <select value={f.status} onChange={(e) => updateStatus(f.id, e.target.value)} style={{ fontSize: 12, padding: "6px 8px", borderRadius: 8, border: `1px solid ${dark ? palette.line : "#DEE1EC"}`, background: dark ? palette.surfaceRaised : "#fff", color: "inherit" }}>{Object.keys(statusLabel).map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}</select>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {selected && <FeedbackDetailModal f={selected} session={session} dark={dark} onClose={() => setSelected(null)} onUpdateStatus={updateStatus} isAdmin />}
    </div>
  );
}

const CHART_COLORS = [palette.blue, palette.violet, palette.cyan, palette.amber, palette.green, palette.red, "#FF8A5C", "#7A88FF"];

function AdminAnalytics({ dark, refreshKey }) {
  const [data, setData] = useState(null);
  useEffect(() => { api("/api/admin/analytics").then((r) => setData(r.ok ? r.data : null)); }, [refreshKey]);
  if (!data) return <LoadingBlock dark={dark} />;
  const axisColor = dark ? "#8B93A7" : "#6B7288";
  const gridColor = dark ? "rgba(255,255,255,0.06)" : "#EEF0F6";
  return (
    <div>
      <PageHeader dark={dark} title="Analytics" sub="Institution-wide feedback trends." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="grid-2-r">
        <Card dark={dark}>
          <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>Feedback Volume Over Time</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.byDate}><CartesianGrid stroke={gridColor} vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: dark ? palette.surfaceRaised : "#fff", border: "none", borderRadius: 8, fontSize: 12 }} /><Line type="monotone" dataKey="count" stroke={palette.blue} strokeWidth={2.5} dot={false} /></LineChart>
          </ResponsiveContainer>
        </Card>
        <Card dark={dark}>
          <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>Feedback by Category</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.byCategory}><CartesianGrid stroke={gridColor} vertical={false} /><XAxis dataKey="category" tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} interval={0} angle={-25} textAnchor="end" height={55} /><YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: dark ? palette.surfaceRaised : "#fff", border: "none", borderRadius: 8, fontSize: 12 }} /><Bar dataKey="count" fill={palette.violet} radius={[6, 6, 0, 0]} /></BarChart>
          </ResponsiveContainer>
        </Card>
        <Card dark={dark}>
          <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>Sentiment Distribution</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart><Pie data={data.sentimentDist} dataKey="value" nameKey="name" innerRadius={55} outerRadius={82} paddingAngle={3}>{data.sentimentDist.map((e, i) => <Cell key={i} fill={sentimentColor(e.name)} />)}</Pie><Tooltip contentStyle={{ background: dark ? palette.surfaceRaised : "#fff", border: "none", borderRadius: 8, fontSize: 12 }} /><Legend wrapperStyle={{ fontSize: 12 }} /></PieChart>
          </ResponsiveContainer>
        </Card>
        <Card dark={dark}>
          <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>Priority Distribution</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.priorityDist} layout="vertical"><CartesianGrid stroke={gridColor} horizontal={false} /><XAxis type="number" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} width={70} /><Tooltip contentStyle={{ background: dark ? palette.surfaceRaised : "#fff", border: "none", borderRadius: 8, fontSize: 12 }} /><Bar dataKey="value" radius={[0, 6, 6, 0]}>{data.priorityDist.map((e, i) => <Cell key={i} fill={priorityColor(e.name)} />)}</Bar></BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

const KANBAN_COLS = ["SUBMITTED", "UNDER_REVIEW", "IN_PROGRESS", "RESOLVED"];
function IssueTracking({ dark, pushToast, refreshKey }) {
  const [items, setItems] = useState(null);
  const [dragId, setDragId] = useState(null);
  useEffect(() => { api("/api/admin/feedback").then((r) => setItems(r.ok ? r.data : [])); }, [refreshKey]);
  if (items === null) return <LoadingBlock dark={dark} />;
  const move = async (id, status) => {
    const res = await api(`/api/admin/feedback/${id}/status`, { method: "PATCH", body: { status } });
    if (res.ok) { setItems((its) => its.map((f) => (f.id === id ? { ...f, status } : f))); pushToast({ title: "Feedback status updated" }); }
  };
  return (
    <div>
      <PageHeader dark={dark} title="Issue Resolution" sub="Drag a card between columns to update its status." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }} className="grid-4-r">
        {KANBAN_COLS.map((col) => {
          const colItems = items.filter((f) => f.status === col);
          return (
            <div key={col} onDragOver={(e) => e.preventDefault()} onDrop={() => dragId && move(dragId, col)} style={{ background: dark ? "rgba(255,255,255,0.03)" : "#F2F4FA", borderRadius: 14, padding: 12, minHeight: 200 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, padding: "0 4px" }}><div style={{ fontWeight: 700, fontSize: 12.5, color: statusColor(col) }}>{statusLabel[col]}</div><span style={{ fontSize: 11, color: "#8B93A7" }}>{colItems.length}</span></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {colItems.map((f) => (
                  <div key={f.id} draggable onDragStart={() => setDragId(f.id)} style={{ background: dark ? palette.surfaceRaised : "#fff", borderRadius: 10, padding: "10px 11px", cursor: "grab", border: `1px solid ${dark ? palette.line : "rgba(15,20,40,0.06)"}`, fontSize: 12.5, fontWeight: 600 }}>
                    {f.title}
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}><Badge color={priorityColor(f.priority)} subtle>{f.priority}</Badge></div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdminUsers({ dark, refreshKey }) {
  const [users, setUsers] = useState(null);
  useEffect(() => { api("/api/admin/users").then((r) => setUsers(r.ok ? r.data : [])); }, [refreshKey]);
  if (users === null) return <LoadingBlock dark={dark} />;
  const students = users.filter((u) => u.role === "STUDENT");
  return (
    <div>
      <PageHeader dark={dark} title="User Management" sub={`${users.length} total users`} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 18 }} className="grid-3-r">
        <KPI dark={dark} label="Total Students" value={students.length} color={palette.blue} />
        <KPI dark={dark} label="Admins" value={users.filter((u) => u.role === "ADMIN").length} color={palette.violet} />
        <KPI dark={dark} label="Total Users" value={users.length} color={palette.amber} />
      </div>
      <Card dark={dark} padded={false}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ textAlign: "left", color: dark ? "#8B93A7" : "#6B7288", fontSize: 11.5 }}>{["Name", "Email", "Department", "Role", "Joined"].map((h) => <th key={h} style={{ padding: "12px 16px", fontWeight: 700 }}>{h}</th>)}</tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderTop: `1px solid ${dark ? palette.line : "#EEF0F6"}` }}>
                  <td style={{ padding: "11px 16px", fontWeight: 600 }}>{u.name}</td>
                  <td style={{ padding: "11px 16px", color: dark ? "#9AA3B8" : "#6B7288" }}>{u.email}</td>
                  <td style={{ padding: "11px 16px" }}>{u.department}</td>
                  <td style={{ padding: "11px 16px" }}><Badge color={u.role === "ADMIN" ? palette.violet : palette.blue} subtle>{u.role}</Badge></td>
                  <td style={{ padding: "11px 16px", color: dark ? "#9AA3B8" : "#6B7288" }}>{new Date(u.createdAt).toISOString().slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function AdminSecurity({ dark }) {
  const [tests, setTests] = useState({});
  const runTest = async (key, path) => {
    setTests((t) => ({ ...t, [key]: { loading: true } }));
    const started = performance.now();
    const res = await fetch(path, { credentials: "include" });
    const ms = Math.round(performance.now() - started);
    setTests((t) => ({ ...t, [key]: { loading: false, status: res.status, ok: res.ok, ms } }));
  };
  return (
    <div>
      <PageHeader dark={dark} title="Security" sub="How PYPIRATES protects data — live against the real server." />
      <Card dark={dark} style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}><Shield size={18} color={palette.violet} /> <span style={{ fontWeight: 700 }}>Primary Security Technique — Role-Based Access Control (RBAC)</span></div>
        <p style={{ fontSize: 13.5, color: dark ? "#9AA3B8" : "#5B6278", lineHeight: 1.7 }}>Every protected route checks the authenticated user's role in <code>server/auth.js</code> (<code>requireRole()</code>) before touching the database. Frontend nav hiding is a courtesy, not the security boundary — the checks below run against the real API, right now, as you.</p>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }} className="grid-2-r">
        <Card dark={dark}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Student can access</div>
          {["Own profile", "Own feedback", "Feedback submission"].map((s) => <div key={s} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginBottom: 8 }}><CheckCircle2 size={14} color={palette.green} /> {s}</div>)}
          <div style={{ fontWeight: 700, marginTop: 14, marginBottom: 10 }}>Student cannot access</div>
          {["All feedback", "Analytics", "User management", "Admin APIs"].map((s) => <div key={s} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginBottom: 8, color: "#8B93A7" }}><XCircle size={14} color={palette.red} /> {s}</div>)}
        </Card>
        <Card dark={dark}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Admin can access</div>
          {["Feedback intelligence", "Analytics", "Clusters", "Issue management", "User management"].map((s) => <div key={s} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginBottom: 8 }}><CheckCircle2 size={14} color={palette.green} /> {s}</div>)}
        </Card>
      </div>
      <Card dark={dark}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Live RBAC test</div>
        <div style={{ fontSize: 12.5, color: dark ? "#8B93A7" : "#6B7288", marginBottom: 16 }}>These call the real endpoints using your current session and show the actual HTTP status returned.</div>
        {[["Call GET /api/admin/analytics (as you)", "/api/admin/analytics", "admin"], ["Call GET /api/my-feedback (as you)", "/api/my-feedback", "mine"]].map(([label, path, key]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${dark ? palette.line : "#EEF0F6"}` }}>
            <Button size="sm" variant="ghost" onClick={() => runTest(key, path)} disabled={tests[key]?.loading}>{tests[key]?.loading ? "Calling…" : label}</Button>
            {tests[key] && !tests[key].loading && (
              <span style={{ fontSize: 12.5, fontWeight: 700, color: tests[key].ok ? palette.green : palette.red, display: "flex", alignItems: "center", gap: 6 }}>
                {tests[key].ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />} {tests[key].status} {tests[key].ok ? "OK" : "Denied"} · {tests[key].ms}ms
              </span>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ---------------------------- Root App --------------------------------------- */
export default function PypiratesApp() {
  const [session, setSession] = useState(undefined); // undefined = checking, null = logged out
  const [route, setRoute] = useState("landing");
  const [theme, setTheme] = useState("dark");
  const [toasts, setToasts] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    api("/api/me").then((r) => {
      const user = r.ok ? r.data : null;
      setSession(user);
      if (user && (route === "landing" || route === "login" || route === "register")) {
        setRoute(user.role === "ADMIN" ? "admin-dashboard" : "student-dashboard");
      }
    });
  }, []);

  const pushToast = (t) => {
    const id = Date.now() + Math.random();
    setToasts((s) => [...s, { id, ...t }]);
    setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 3400);
  };
  const go = (r) => { setRoute(r); window.scrollTo(0, 0); };
  const bumpRefresh = () => setRefreshKey((k) => k + 1);

  const doLogin = async (email, password) => {
    const res = await api("/api/auth/login", { method: "POST", body: { email, password } });
    if (res.ok) { setSession(res.data); pushToast({ title: `Welcome back, ${res.data.name.split(" ")[0]}` }); go(res.data.role === "ADMIN" ? "admin-dashboard" : "student-dashboard"); }
    else pushToast({ title: "Login failed", desc: res.error, type: "error" });
    return res;
  };
  const doRegister = async (form) => {
    const res = await api("/api/auth/register", { method: "POST", body: form });
    if (res.ok) { setSession(res.data); pushToast({ title: "Account created", desc: "Welcome to PYPIRATES." }); go("student-dashboard"); }
    return res;
  };
  const logout = async () => { await api("/api/auth/logout", { method: "POST" }); setSession(null); go("landing"); pushToast({ title: "Logged out" }); };
  const simulateIncoming = async () => {
    const res = await api("/api/admin/simulate", { method: "POST" });
    if (res.ok) { pushToast({ title: "New feedback received", desc: res.data.title }); bumpRefresh(); }
  };

  const dark = theme === "dark";

  if (session === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: palette.ink }}>
        <Loader2 className="spin" size={30} color="#4A5170" />
        <style>{`.spin{animation:spin .9s linear infinite} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  let content;
  if (route === "landing") content = <Landing go={go} />;
  else if (route === "login") content = <LoginPage go={go} doLogin={doLogin} />;
  else if (route === "register") content = <RegisterPage go={go} doRegister={doRegister} />;
  else if (session) {
    const routeBase = route.split(":")[0];
    const clusterId = route.includes(":") ? route.split(":")[1] : null;
    const isAdminRoute = ADMIN_NAV.some((n) => n.id === routeBase) || routeBase === "admin-cluster-detail";
    const isStudentRoute = STUDENT_NAV.some((n) => n.id === routeBase);
    let page;
    if (isAdminRoute && session.role !== "ADMIN") page = <AccessDenied dark={dark} />;
    else if (isStudentRoute && session.role !== "STUDENT") page = <AccessDenied dark={dark} />;
    else if (routeBase === "student-dashboard") page = <StudentDashboard session={session} dark={dark} go={go} refreshKey={refreshKey} />;
    else if (routeBase === "student-new") page = <SubmitFeedback session={session} dark={dark} pushToast={pushToast} go={go} />;
    else if (routeBase === "student-feedback") page = <MyFeedback session={session} dark={dark} pushToast={pushToast} refreshKey={refreshKey} bumpRefresh={bumpRefresh} />;
    else if (routeBase === "student-profile") page = <StudentProfile session={session} dark={dark} pushToast={pushToast} onUpdated={(u) => setSession((s) => ({ ...s, ...u }))} />;
    else if (routeBase === "admin-dashboard") page = <AdminDashboard dark={dark} go={go} refreshKey={refreshKey} />;
    else if (routeBase === "admin-feedback") page = <AdminFeedback session={session} dark={dark} pushToast={pushToast} refreshKey={refreshKey} bumpRefresh={bumpRefresh} />;
    else if (routeBase === "admin-clusters") page = <AdminClusters dark={dark} go={go} refreshKey={refreshKey} />;
    else if (routeBase === "admin-cluster-detail") page = <ClusterDetail session={session} dark={dark} clusterId={clusterId} go={go} pushToast={pushToast} />;
    else if (routeBase === "admin-analytics") page = <AdminAnalytics dark={dark} refreshKey={refreshKey} />;
    else if (routeBase === "admin-issues") page = <IssueTracking dark={dark} pushToast={pushToast} refreshKey={refreshKey} />;
    else if (routeBase === "admin-users") page = <AdminUsers dark={dark} refreshKey={refreshKey} />;
    else if (routeBase === "admin-security") page = <AdminSecurity dark={dark} />;
    else page = session.role === "ADMIN" ? <AdminDashboard dark={dark} go={go} refreshKey={refreshKey} /> : <StudentDashboard session={session} dark={dark} go={go} refreshKey={refreshKey} />;
    content = <Shell session={session} route={route} go={go} logout={logout} theme={theme} toggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} onSimulate={simulateIncoming}>{page}</Shell>;
  } else {
    content = <LoginPage go={go} doLogin={doLogin} />;
  }

  return (
    <div style={{ fontFamily: "Inter, sans-serif", height: "100%", minHeight: "100vh" }}>
      <style>{`* { box-sizing: border-box; }`}</style>
      <ToastStack toasts={toasts} />
      {content}
    </div>
  );
}
