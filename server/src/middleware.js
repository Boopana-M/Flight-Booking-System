// STEP 1: import packages
const { rateLimit } = require("express-rate-limit");
const jwt = require("jsonwebtoken");

// STEP 2: small helper - try/catch for async routes (less boilerplate)
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// STEP 3: rate limiter middleware (protect server)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  limit: 200, // keep high for dev; reduce in production
  standardHeaders: "draft-7",
  legacyHeaders: false
});

// STEP 4: auth middleware (protected routes)
function auth(req, res, next) {
  // NOTE: token comes from Authorization header -> "Bearer <token>"
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "No token, access denied" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // attach user to request (so next routes can use it)
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid/Expired token" });
  }
}

// STEP 5: role middleware (admin routes)
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Not logged in" });
    if (req.user.role !== role) return res.status(403).json({ message: "Forbidden" });
    next();
  };
}

// STEP 6: not found middleware (when route doesn't exist)
function notFound(req, res, next) {
  res.status(404);
  next(new Error(`Route not found: ${req.originalUrl}`));
}

// STEP 7: error handler (one place for all errors)
function errorHandler(err, req, res, next) {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    message: err.message || "Server error",
    // NOTE: stack only in dev (simple way)
    stack: process.env.NODE_ENV === "production" ? "🥷 hidden" : err.stack
  });
}

module.exports = { asyncHandler, apiLimiter, auth, requireRole, notFound, errorHandler };

