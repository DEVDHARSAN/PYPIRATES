// v3 - split deploy: Render (backend) + Vercel (frontend)
import express from "express";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { PrismaClient } from "@prisma/client";
import { classifyFeedback, CLUSTER_DEFS } from "./clustering.js";
import { signToken, setAuthCookie, clearAuthCookie, attachUser, requireAuth, requireRole } from "./auth.js";
import { seedIfEmpty } from "./seed.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();
const app = express();

// CORS — allows Vercel frontend and local dev
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:3000",
].filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || ALLOWED_ORIGINS.includes(origin)) {
    if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json());
app.use(cookieParser());
app.use(attachUser);

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, department: u.department, year: u.year, createdAt: u.createdAt });
const STATUS_ORDER = ["SUBMITTED", "UNDER_REVIEW", "IN_PROGRESS", "RESOLVED"];

/* ---------------------------- Auth ---------------------------- */
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password, department, year } = req.body || {};
  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ success: false, error: "Name, email and password are required" });
  }
  if (password.length < 6) return res.status(400).json({ success: false, error: "Password must be at least 6 characters" });

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return res.status(409).json({ success: false, error: "An account with this email already exists" });

  const passwordHash = await bcrypt.hash(password, 10);
  // role is intentionally never read from the request body — always STUDENT.
  const user = await prisma.user.create({
    data: { name: name.trim(), email: email.toLowerCase(), passwordHash, role: "STUDENT", department: department || "Computer Science", year: Number(year) || 1 },
  });
  setAuthCookie(res, signToken(user));
  res.status(201).json({ success: true, data: publicUser(user) });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  const user = email ? await prisma.user.findUnique({ where: { email: email.toLowerCase() } }) : null;
  if (!user || !(await bcrypt.compare(password || "", user.passwordHash))) {
    return res.status(401).json({ success: false, error: "Invalid email or password" });
  }
  setAuthCookie(res, signToken(user));
  res.json({ success: true, data: publicUser(user) });
});

app.post("/api/auth/logout", (req, res) => {
  clearAuthCookie(res);
  res.json({ success: true });
});

app.get("/api/me", async (req, res) => {
  if (!req.user) return res.json({ success: true, data: null });
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.json({ success: true, data: null });
  res.json({ success: true, data: publicUser(user) });
});

app.patch("/api/me", requireAuth, async (req, res) => {
  const { name, department, year } = req.body || {};
  const patch = {};
  if (name?.trim()) patch.name = name.trim();
  if (department) patch.department = department;
  if (year) patch.year = Number(year);
  const user = await prisma.user.update({ where: { id: req.user.id }, data: patch });
  res.json({ success: true, data: publicUser(user) });
});

/* ---------------------------- Student feedback ---------------------------- */
app.post("/api/feedback", requireRole("STUDENT"), async (req, res) => {
  const { title, description, category, anonymous } = req.body || {};
  if (!title?.trim() || !description?.trim() || !category) {
    return res.status(400).json({ success: false, error: "Title, description and category are required" });
  }
  const cls = classifyFeedback(title, description);
  const item = await prisma.feedback.create({
    data: {
      userId: req.user.id, title: title.trim(), description: description.trim(), category,
      sentiment: cls.sentiment, priority: cls.priority, clusterId: cls.clusterId,
      status: "SUBMITTED", anonymous: !!anonymous,
    },
  });
  res.status(201).json({ success: true, data: item });
});

app.get("/api/my-feedback", requireRole("STUDENT"), async (req, res) => {
  const items = await prisma.feedback.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: "desc" } });
  res.json({ success: true, data: items });
});

// STUDENT can withdraw their own SUBMITTED feedback; ADMIN can delete any.
app.delete("/api/feedback/:id", requireAuth, async (req, res) => {
  const item = await prisma.feedback.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ success: false, error: "Feedback not found" });
  if (req.user.role === "STUDENT") {
    if (item.userId !== req.user.id) return res.status(403).json({ success: false, error: "Access denied" });
    if (item.status !== "SUBMITTED") return res.status(400).json({ success: false, error: "Only feedback still in Submitted status can be withdrawn" });
  }
  await prisma.feedback.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// STUDENT can edit their own SUBMITTED feedback (title, description, category)
app.patch("/api/feedback/:id", requireRole("STUDENT"), async (req, res) => {
  const { title, description, category } = req.body || {};
  const item = await prisma.feedback.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ success: false, error: "Feedback not found" });
  if (item.userId !== req.user.id) return res.status(403).json({ success: false, error: "Access denied" });
  if (item.status !== "SUBMITTED") return res.status(400).json({ success: false, error: "Only SUBMITTED feedback can be edited" });
  if (!title?.trim() || !description?.trim() || !category) return res.status(400).json({ success: false, error: "Title, description and category are required" });
  const cls = classifyFeedback(title.trim(), description.trim());
  const updated = await prisma.feedback.update({
    where: { id: req.params.id },
    data: { title: title.trim(), description: description.trim(), category, sentiment: cls.sentiment, priority: cls.priority, clusterId: cls.clusterId },
  });
  res.json({ success: true, data: updated });
});

/* ---------------------------- Admin ---------------------------- */
app.get("/api/admin/feedback", requireRole("ADMIN"), async (req, res) => {
  const items = await prisma.feedback.findMany({ include: { user: true }, orderBy: { createdAt: "desc" } });
  const shaped = items.map((f) => ({
    id: f.id, userId: f.userId, studentName: f.anonymous ? "Anonymous Student" : f.user.name,
    title: f.title, description: f.description, category: f.category, sentiment: f.sentiment,
    priority: f.priority, clusterId: f.clusterId, status: f.status, createdAt: f.createdAt,
  }));
  res.json({ success: true, data: shaped });
});

app.patch("/api/admin/feedback/:id/status", requireRole("ADMIN"), async (req, res) => {
  const { status } = req.body || {};
  if (!STATUS_ORDER.includes(status)) return res.status(400).json({ success: false, error: "Invalid status" });
  const item = await prisma.feedback.update({ where: { id: req.params.id }, data: { status } }).catch(() => null);
  if (!item) return res.status(404).json({ success: false, error: "Feedback not found" });
  res.json({ success: true, data: item });
});

// Admin: override AI-assigned priority
app.patch("/api/admin/feedback/:id/priority", requireRole("ADMIN"), async (req, res) => {
  const { priority } = req.body || {};
  if (!["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(priority)) return res.status(400).json({ success: false, error: "Invalid priority" });
  const item = await prisma.feedback.update({ where: { id: req.params.id }, data: { priority } }).catch(() => null);
  if (!item) return res.status(404).json({ success: false, error: "Feedback not found" });
  res.json({ success: true, data: item });
});

// Admin: bulk update status on multiple feedback items
app.post("/api/admin/feedback/bulk", requireRole("ADMIN"), async (req, res) => {
  const { ids, status } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ success: false, error: "ids array required" });
  if (!STATUS_ORDER.includes(status)) return res.status(400).json({ success: false, error: "Invalid status" });
  await prisma.feedback.updateMany({ where: { id: { in: ids } }, data: { status } });
  res.json({ success: true, updated: ids.length });
});

app.get("/api/admin/clusters", requireRole("ADMIN"), async (req, res) => {
  const items = await prisma.feedback.findMany();
  const data = CLUSTER_DEFS.map((c) => {
    const inCluster = items.filter((f) => f.clusterId === c.id);
    const counts = inCluster.reduce((acc, f) => { acc[f.sentiment] = (acc[f.sentiment] || 0) + 1; return acc; }, {});
    const sentiment = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "NEUTRAL";
    const priorityRank = { CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };
    const priority = inCluster.reduce((p, f) => (priorityRank[f.priority] > priorityRank[p] ? f.priority : p), "LOW");
    return { ...c, feedbackCount: inCluster.length, sentiment, priority };
  });
  res.json({ success: true, data });
});

app.get("/api/admin/clusters/:id", requireRole("ADMIN"), async (req, res) => {
  const cluster = CLUSTER_DEFS.find((c) => c.id === req.params.id);
  if (!cluster) return res.status(404).json({ success: false, error: "Cluster not found" });
  const items = await prisma.feedback.findMany({ where: { clusterId: req.params.id }, include: { user: true }, orderBy: { createdAt: "desc" } });
  const shaped = items.map((f) => ({
    id: f.id, userId: f.userId, studentName: f.anonymous ? "Anonymous Student" : f.user.name,
    title: f.title, description: f.description, category: f.category, sentiment: f.sentiment,
    priority: f.priority, status: f.status, createdAt: f.createdAt,
  }));
  res.json({ success: true, data: { cluster, items: shaped } });
});

app.get("/api/admin/analytics", requireRole("ADMIN"), async (req, res) => {
  const items = await prisma.feedback.findMany();
  const byDate = {};
  const byCategory = {};
  const sentimentDist = { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 };
  const priorityDist = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  for (const f of items) {
    const day = f.createdAt.toISOString().slice(0, 10);
    byDate[day] = (byDate[day] || 0) + 1;
    byCategory[f.category] = (byCategory[f.category] || 0) + 1;
    sentimentDist[f.sentiment]++;
    priorityDist[f.priority]++;
  }
  res.json({
    success: true,
    data: {
      byDate: Object.entries(byDate).sort().map(([date, count]) => ({ date: date.slice(5), count })),
      byCategory: Object.entries(byCategory).map(([category, count]) => ({ category, count })),
      sentimentDist: Object.entries(sentimentDist).map(([name, value]) => ({ name, value })),
      priorityDist: Object.entries(priorityDist).map(([name, value]) => ({ name, value })),
      totals: {
        total: items.length,
        active: items.filter((f) => f.status !== "RESOLVED").length,
        critical: items.filter((f) => f.priority === "CRITICAL" || f.priority === "HIGH").length,
        resolved: items.filter((f) => f.status === "RESOLVED").length,
      },
    },
  });
});

app.get("/api/admin/users", requireRole("ADMIN"), async (req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ success: true, data: users.map(publicUser) });
});

// Change password — any authenticated user can change their own password
app.post("/api/me/password", requireAuth, async (req, res) => {
  const { current, newPassword } = req.body;
  if (!current || !newPassword) return res.status(400).json({ success: false, error: "Both current and new password are required." });
  if (newPassword.length < 6) return res.status(400).json({ success: false, error: "New password must be at least 6 characters." });
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const match = await bcrypt.compare(current, user.password);
  if (!match) return res.status(401).json({ success: false, error: "Current password is incorrect." });
  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });
  res.json({ success: true });
});

// Demo helper: creates one realistic incoming feedback item so the "live" feel
// can be shown during a walkthrough. Still goes through the same clustering path.
app.post("/api/admin/simulate", requireRole("ADMIN"), async (req, res) => {
  const templates = [
    ["Projector not working in room 3B", "The projector in room 3B has been flickering and shutting off mid-lecture."],
    ["Wi-Fi keeps disconnecting in the hostel", "Wi-Fi in Hostel Block C keeps dropping every few minutes in the evening."],
    ["Bus 12 skipped our stop again", "The 5:30 PM bus on route 12 didn't stop at the usual pickup point today."],
  ];
  const [title, description] = templates[Math.floor(Math.random() * templates.length)];
  const students = await prisma.user.findMany({ where: { role: "STUDENT" } });
  const student = students[Math.floor(Math.random() * students.length)];
  const cls = classifyFeedback(title, description);
  const item = await prisma.feedback.create({
    data: { userId: student.id, title, description, category: cls.category, sentiment: cls.sentiment, priority: cls.priority, clusterId: cls.clusterId, status: "SUBMITTED" },
  });
  res.status(201).json({ success: true, data: { ...item, studentName: student.name } });
});

/* ---------------------------- Static frontend (only in monolith mode) ---- */
const clientDist = path.join(__dirname, "..", "client", "dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    const result = await seedIfEmpty(prisma);
    if (result.seeded) console.log(`Seeded database: ${result.admins} admins, ${result.students} students, ${result.feedback} feedback items.`);
  } catch (err) {
    console.error("Seeding check failed (continuing anyway):", err.message);
  }
  app.listen(PORT, () => console.log(`PYPIRATES server listening on port ${PORT}`));
}

start();
