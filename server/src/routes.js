// STEP 1: import express router
const express = require("express");
const router = express.Router();

// STEP 2: import validation helpers
const { body, validationResult } = require("express-validator");

// STEP 3: import database + utils + models
const mongoose = require("mongoose");
const crypto = require("crypto");
const multer = require("multer");
const fs = require("fs");

const { asyncHandler, auth, requireRole } = require("./middleware");
const {
  hashPassword,
  comparePassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateOtp6,
  hashOtp,
  compareOtp,
  sendEmail,
  initCloudinary,
  uploadToCloudinary,
  createInvoicePdfBuffer,
  createRazorpayOrder,
  verifyRecaptcha
} = require("./utils");

const { User, OtpToken, RefreshToken, Flight, Booking, Notification, ChatMessage } = require("./models");

// =========================================================
// SMALL HELPERS (kept here to stay beginner-friendly)
// =========================================================

function sha256(text) {
  // deterministic hash (same input -> same output)
  return crypto.createHash("sha256").update(text).digest("hex");
}

function throwIfValidationError(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors.array().map((e) => e.msg).join(", ");
    const err = new Error(message);
    err.statusCode = 400;
    throw err;
  }
}

async function createAndSendOtp({ user, purpose, minutes = 5, io = null }) {
  const otp = generateOtp6();
  const otpHash = await hashOtp(otp);

  // store OTP in DB with expiry
  await OtpToken.create({
    userId: user._id,
    purpose,
    otpHash,
    expiresAt: new Date(Date.now() + minutes * 60 * 1000)
  });

  // send OTP via email (NodeMailer)
  await sendEmail({
    to: user.email,
    subject: purpose === "VERIFY_EMAIL" ? "Verify your email (OTP)" : "Reset password (OTP)",
    html: `
      <h3>Your OTP is: ${otp}</h3>
      <p>This OTP will expire in ${minutes} minutes.</p>
    `
  });

  // real-time notification to frontend via socket (if connected)
  if (io) {
    io.to(`user:${user._id}`).emit("notification", {
      type: "EMAIL",
      message: `OTP sent to ${user.email}`
    });
  }
}

// =========================================================
// MULTER SETUP (file upload)
// =========================================================

// STEP 1: make sure tmp folder exists
const TMP_DIR = "tmp";
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

// STEP 2: store file temporarily on server
const upload = multer({ dest: TMP_DIR });

// =========================================================
// SWAGGER TAGS (docs)
// =========================================================

/**
 * @swagger
 * tags:
 *   - name: Auth
 *   - name: Flights
 *   - name: Bookings
 *   - name: Uploads
 *   - name: Notifications
 *   - name: Chat
 */

// =========================================================
// AUTH ROUTES
// =========================================================

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user (sends OTP email)
 */
router.post(
  "/auth/register",
  [
    body("name").notEmpty().withMessage("name is required"),
    body("email").isEmail().withMessage("valid email is required"),
    body("password").isLength({ min: 6 }).withMessage("password must be 6+ chars")
  ],
  asyncHandler(async (req, res) => {
    throwIfValidationError(req);

    // OPTIONAL: CAPTCHA verify (frontend can send captchaToken)
    const captcha = await verifyRecaptcha(req.body.captchaToken);
    if (!captcha.ok) return res.status(400).json({ message: "CAPTCHA failed" });

    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: "Email already exists" });

    const passwordHash = await hashPassword(password);

    const user = await User.create({ name, email, passwordHash });

    // Send email verification OTP
    await createAndSendOtp({ user, purpose: "VERIFY_EMAIL", io: req.app.get("io") });

    res.status(201).json({ message: "Registered ✅ OTP sent to email", userId: user._id });
  })
);

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     tags: [Auth]
 *     summary: Verify email using OTP
 */
router.post(
  "/auth/verify-email",
  [body("email").isEmail(), body("otp").isLength({ min: 6, max: 6 })],
  asyncHandler(async (req, res) => {
    throwIfValidationError(req);

    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otpDoc = await OtpToken.findOne({ userId: user._id, purpose: "VERIFY_EMAIL" }).sort({ createdAt: -1 });
    if (!otpDoc) return res.status(400).json({ message: "OTP not found" });

    const ok = await compareOtp(otp, otpDoc.otpHash);
    if (!ok) return res.status(400).json({ message: "Wrong OTP" });

    user.isEmailVerified = true;
    await user.save();

    res.json({ message: "Email verified ✅" });
  })
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login (returns access token + sets refresh cookie)
 */
router.post(
  "/auth/login",
  [body("email").isEmail(), body("password").notEmpty()],
  asyncHandler(async (req, res) => {
    throwIfValidationError(req);

    const { email, password } = req.body;
    const deviceId = req.headers["x-device-id"];

    if (!deviceId) {
      // deviceId helps session/device management
      return res.status(400).json({ message: "x-device-id header missing" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    if (!user.isEmailVerified) return res.status(401).json({ message: "Please verify your email first" });

    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    // create tokens
    const accessToken = signAccessToken({ userId: user._id.toString(), role: user.role });
    const refreshToken = signRefreshToken({ userId: user._id.toString() });

    // save refresh token hash in DB (device wise)
    const tokenHash = sha256(refreshToken);
    await RefreshToken.create({
      userId: user._id,
      tokenHash,
      deviceId,
      userAgent: req.headers["user-agent"] || "",
      ip: req.ip,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    // set refresh token cookie (httpOnly makes it safer)
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: false // set true only in https/prod
    });

    res.json({
      message: "Login success ✅",
      accessToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, profileImageUrl: user.profileImageUrl }
    });
  })
);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Get new access token using refresh cookie
 */
router.post(
  "/auth/refresh",
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.status(401).json({ message: "No refresh token" });

    const payload = verifyRefreshToken(refreshToken);
    const userId = payload.sub;

    // check refresh token exists in DB (session management)
    const tokenHash = sha256(refreshToken);
    const exists = await RefreshToken.findOne({ userId, tokenHash });
    if (!exists) return res.status(401).json({ message: "Refresh token not recognized (maybe logged out)" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const accessToken = signAccessToken({ userId: user._id.toString(), role: user.role });
    res.json({ accessToken });
  })
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout (deletes refresh token from DB + clears cookie)
 */
router.post(
  "/auth/logout",
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      const tokenHash = sha256(refreshToken);
      await RefreshToken.deleteOne({ tokenHash });
    }

    res.clearCookie("refreshToken");
    res.json({ message: "Logged out ✅" });
  })
);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Send OTP for password reset
 */
router.post(
  "/auth/forgot-password",
  [body("email").isEmail()],
  asyncHandler(async (req, res) => {
    throwIfValidationError(req);

    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    await createAndSendOtp({ user, purpose: "RESET_PASSWORD", io: req.app.get("io") });
    res.json({ message: "OTP sent ✅" });
  })
);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password using OTP
 */
router.post(
  "/auth/reset-password",
  [
    body("email").isEmail(),
    body("otp").isLength({ min: 6, max: 6 }),
    body("newPassword").isLength({ min: 6 })
  ],
  asyncHandler(async (req, res) => {
    throwIfValidationError(req);

    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otpDoc = await OtpToken.findOne({ userId: user._id, purpose: "RESET_PASSWORD" }).sort({ createdAt: -1 });
    if (!otpDoc) return res.status(400).json({ message: "OTP not found" });

    const ok = await compareOtp(otp, otpDoc.otpHash);
    if (!ok) return res.status(400).json({ message: "Wrong OTP" });

    user.passwordHash = await hashPassword(newPassword);
    await user.save();

    res.json({ message: "Password reset ✅" });
  })
);

// =========================================================
// USER PROFILE ROUTES
// =========================================================

router.get(
  "/me",
  auth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select("-passwordHash");
    res.json({ user });
  })
);

router.post(
  "/uploads/profile-image",
  auth,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    // Cloudinary config init (safe to call many times)
    initCloudinary();

    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const url = await uploadToCloudinary(req.file.path, "flight-booking/profile");
    const user = await User.findByIdAndUpdate(req.user.id, { profileImageUrl: url }, { new: true }).select("-passwordHash");

    res.json({ message: "Uploaded ✅", user });
  })
);

// =========================================================
// FLIGHTS (CRUD + Search)
// =========================================================

/**
 * @swagger
 * /api/flights:
 *   get:
 *     tags: [Flights]
 *     summary: Search flights (filter/sort/pagination)
 */
router.get(
  "/flights",
  asyncHandler(async (req, res) => {
    const { from, to, date, q, sort = "departAt_asc", page = 1, limit = 8 } = req.query;

    // STEP 1: build Mongo filter object
    const filter = {};
    if (from) filter.from = new RegExp(from, "i");
    if (to) filter.to = new RegExp(to, "i");

    // date filter = flights on that day
    if (date) {
      const d = new Date(date);
      const start = new Date(d.setHours(0, 0, 0, 0));
      const end = new Date(d.setHours(23, 59, 59, 999));
      filter.departAt = { $gte: start, $lte: end };
    }

    // text search (needs text index)
    let query = Flight.find(filter);
    if (q) query = query.find({ $text: { $search: q } });

    // STEP 2: sorting
    const sortMap = {
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      departAt_asc: { departAt: 1 },
      departAt_desc: { departAt: -1 }
    };
    query = query.sort(sortMap[sort] || sortMap.departAt_asc);

    // STEP 3: pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      query.skip(skip).limit(limitNum),
      Flight.countDocuments(filter)
    ]);

    res.json({
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      items
    });
  })
);

router.post(
  "/flights",
  auth,
  requireRole("admin"),
  [
    body("from").notEmpty(),
    body("to").notEmpty(),
    body("airline").notEmpty(),
    body("flightNumber").notEmpty(),
    body("departAt").notEmpty(),
    body("arriveAt").notEmpty(),
    body("price").isNumeric(),
    body("seatsAvailable").isInt({ min: 0 })
  ],
  asyncHandler(async (req, res) => {
    throwIfValidationError(req);
    const flight = await Flight.create(req.body);
    res.status(201).json({ message: "Flight created ✅", flight });
  })
);

router.put(
  "/flights/:id",
  auth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const flight = await Flight.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!flight) return res.status(404).json({ message: "Flight not found" });
    res.json({ message: "Flight updated ✅", flight });
  })
);

router.delete(
  "/flights/:id",
  auth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const flight = await Flight.findByIdAndDelete(req.params.id);
    if (!flight) return res.status(404).json({ message: "Flight not found" });
    res.json({ message: "Flight deleted ✅" });
  })
);

// =========================================================
// BOOKINGS (Transactions + Payments + Invoice)
// =========================================================

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     tags: [Bookings]
 *     summary: Create booking (uses Mongo transaction to reduce seats safely)
 */
router.post(
  "/bookings",
  auth,
  [
    body("flightId").notEmpty(),
    body("passengerName").notEmpty(),
    body("passengerEmail").isEmail(),
    body("seats").optional().isInt({ min: 1 })
  ],
  asyncHandler(async (req, res) => {
    throwIfValidationError(req);

    const { flightId, passengerName, passengerEmail, seats = 1 } = req.body;

    // STEP 1: start Mongo transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // STEP 2: lock flight (within transaction)
      const flight = await Flight.findById(flightId).session(session);
      if (!flight) return res.status(404).json({ message: "Flight not found" });

      if (flight.seatsAvailable < seats) {
        return res.status(400).json({ message: "Not enough seats" });
      }

      // STEP 3: reduce seats
      flight.seatsAvailable -= seats;
      await flight.save();

      // STEP 4: create booking (pending payment)
      const amount = flight.price * seats;
      const booking = await Booking.create(
        [
          {
            userId: req.user.id,
            flightId,
            passengerName,
            passengerEmail,
            seats,
            amount,
            currency: flight.currency
          }
        ],
        { session }
      );

      // STEP 5: commit transaction
      await session.commitTransaction();

      res.status(201).json({ message: "Booking created ✅ (PENDING payment)", booking: booking[0] });
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  })
);

// create Razorpay order for a booking
router.post(
  "/payments/razorpay/order",
  auth,
  [body("bookingId").notEmpty()],
  asyncHandler(async (req, res) => {
    throwIfValidationError(req);

    const booking = await Booking.findOne({ _id: req.body.bookingId, userId: req.user.id });
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (booking.status !== "PENDING") return res.status(400).json({ message: "Booking not in PENDING state" });

    const order = await createRazorpayOrder({
      amount: booking.amount,
      currency: booking.currency,
      receipt: `booking_${booking._id}`
    });

    booking.razorpayOrderId = order.id;
    await booking.save();

    res.json({
      message: "Order created ✅",
      order,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID // frontend needs this to open Razorpay checkout
    });
  })
);

// Razorpay webhook (payment success/failure)
router.post(
  "/payments/razorpay/webhook",
  asyncHandler(async (req, res) => {
    // NOTE (IMPORTANT):
    // In real production, webhook signature verification must use RAW body.
    // For learning project, we keep it simple and rely on order/payment ids.

    const event = req.body;
    const orderId = event?.payload?.payment?.entity?.order_id;
    const paymentId = event?.payload?.payment?.entity?.id;
    const status = event?.payload?.payment?.entity?.status; // "captured" = paid

    if (!orderId) return res.status(200).json({ ok: true }); // just ignore unknown payload

    const booking = await Booking.findOne({ razorpayOrderId: orderId });
    if (!booking) return res.status(200).json({ ok: true });

    if (status === "captured") {
      booking.status = "PAID";
      booking.razorpayPaymentId = paymentId || "";
      await booking.save();

      // create in-app notification
      const notif = await Notification.create({
        userId: booking.userId,
        type: "PAYMENT",
        message: `Payment success for booking ${booking._id}`
      });

      // real-time emit
      const io = req.app.get("io");
      if (io) io.to(`user:${booking.userId}`).emit("notification", notif);
    }

    res.status(200).json({ ok: true });
  })
);

// my bookings
router.get(
  "/bookings/my",
  auth,
  asyncHandler(async (req, res) => {
    const items = await Booking.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .populate("flightId");

    res.json({ items });
  })
);

// booking invoice pdf
router.get(
  "/bookings/:id/invoice",
  auth,
  asyncHandler(async (req, res) => {
    const booking = await Booking.findOne({ _id: req.params.id, userId: req.user.id });
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (booking.status !== "PAID") return res.status(400).json({ message: "Invoice only after payment" });

    const [flight, user] = await Promise.all([
      Flight.findById(booking.flightId),
      User.findById(req.user.id)
    ]);

    const pdfBuffer = await createInvoicePdfBuffer({ booking, flight, user });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=invoice_${booking._id}.pdf`);
    res.send(pdfBuffer);
  })
);

// cancel booking (also returns seats back using transaction)
router.patch(
  "/bookings/:id/cancel",
  auth,
  asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const booking = await Booking.findOne({ _id: req.params.id, userId: req.user.id }).session(session);
      if (!booking) return res.status(404).json({ message: "Booking not found" });

      if (booking.status === "CANCELLED") return res.json({ message: "Already cancelled" });

      // return seats back
      const flight = await Flight.findById(booking.flightId).session(session);
      if (flight) {
        flight.seatsAvailable += booking.seats;
        await flight.save();
      }

      booking.status = "CANCELLED";
      await booking.save();

      await session.commitTransaction();

      res.json({ message: "Booking cancelled ✅" });
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  })
);

// =========================================================
// NOTIFICATIONS (read/unread)
// =========================================================

router.get(
  "/notifications",
  auth,
  asyncHandler(async (req, res) => {
    const items = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50);
    res.json({ items });
  })
);

router.patch(
  "/notifications/:id/read",
  auth,
  asyncHandler(async (req, res) => {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isRead: true },
      { new: true }
    );
    if (!n) return res.status(404).json({ message: "Notification not found" });
    res.json({ message: "Marked as read ✅", notification: n });
  })
);

// =========================================================
// CHAT (messages history) - realtime send happens via socket.io
// =========================================================

router.get(
  "/chat/:roomId/messages",
  auth,
  asyncHandler(async (req, res) => {
    const items = await ChatMessage.find({ roomId: req.params.roomId }).sort({ createdAt: 1 }).limit(200);
    res.json({ items });
  })
);

module.exports = router;
