// STEP 1: import packages (just like we do in notes)
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");

// STEP 2: import our own files (routes + middlewares)
const { apiLimiter, notFound, errorHandler } = require("./middleware");
const routes = require("./routes");

// STEP 3: create express app
const app = express();

// STEP 4: security middlewares (basic protection)
app.use(helmet()); // sets safe HTTP headers
app.use(mongoSanitize()); // removes MongoDB operators like $ from user input
app.use(xss()); // helps block basic XSS attacks

// STEP 5: rate limiting (prevents spam / DDOS-like abuse)
app.use(apiLimiter);

// STEP 6: allow frontend to call backend (CORS)
app.use(
  cors({
    origin: process.env.CLIENT_URL, // only allow your frontend
    credentials: true // allow cookies (refresh token)
  })
);

// STEP 7: read JSON data from request body (POST/PUT)
app.use(express.json({ limit: "2mb" }));

// STEP 8: read form-data / urlencoded (for simple forms)
app.use(express.urlencoded({ extended: true }));

// STEP 9: cookies support (refresh token can be stored in cookie)
app.use(cookieParser());

// STEP 10: health check route (quick test)
app.get("/health", (req, res) => {
  res.json({ ok: true, message: "Server is running ✅" });
});

// STEP 11: our main API routes
app.use("/api", routes);

// STEP 12: 404 handler
app.use(notFound);

// STEP 13: global error handler (one place for all errors)
app.use(errorHandler);

// STEP 14: export app (server.js will start the server)
module.exports = app;

