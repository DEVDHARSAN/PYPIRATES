import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me-in-production";
const COOKIE_NAME = "pypirates_token";

export function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: "7d" });
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

// Reads the JWT (if any) off the request and attaches req.user. Never rejects —
// downstream route guards decide what to do with an absent/invalid session.
export function attachUser(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) { req.user = null; return next(); }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch {
    req.user = null;
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ success: false, error: "Unauthorized" });
  next();
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, error: "Unauthorized" });
    if (req.user.role !== role) return res.status(403).json({ success: false, error: "Access denied" });
    next();
  };
}
