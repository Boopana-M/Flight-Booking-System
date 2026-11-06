// STEP 1: import mongoose (to create schemas/models)
const mongoose = require("mongoose");

// =========================================================
// USER MODEL (Login/Register/Profile)
// =========================================================

const userSchema = new mongoose.Schema(
  {
    // basic details
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },

    // we never store plain password, only hash ✅
    passwordHash: { type: String, required: true },

    // for email verification flow (OTP)
    isEmailVerified: { type: Boolean, default: false },

    // profile image URL (Cloudinary)
    profileImageUrl: { type: String, default: "" },

    // role based access (admin can manage flights)
    role: { type: String, enum: ["user", "admin"], default: "user" }
  },
  { timestamps: true }
);

// index = makes searching faster
userSchema.index({ email: 1 });

// =========================================================
// OTP TOKEN MODEL (Email verify + Forgot password)
// =========================================================

const otpTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    purpose: { type: String, enum: ["VERIFY_EMAIL", "RESET_PASSWORD"], required: true },

    // store OTP as hash (same reason as password)
    otpHash: { type: String, required: true },

    // when OTP expires
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

// TTL index = MongoDB auto deletes expired docs
otpTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// =========================================================
// REFRESH TOKEN MODEL (Device/session management)
// =========================================================

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // store refresh token hash (never store raw token)
    tokenHash: { type: String, required: true },

    // device/session info
    deviceId: { type: String, required: true }, // frontend can generate random id once
    userAgent: { type: String, default: "" },
    ip: { type: String, default: "" },

    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

// TTL index = auto cleanup expired refresh tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshTokenSchema.index({ userId: 1, deviceId: 1 });

// =========================================================
// FLIGHT MODEL (Search/Filter/Sort/Pagination)
// =========================================================

const flightSchema = new mongoose.Schema(
  {
    from: { type: String, required: true, trim: true },
    to: { type: String, required: true, trim: true },
    airline: { type: String, required: true, trim: true },
    flightNumber: { type: String, required: true, trim: true },

    departAt: { type: Date, required: true },
    arriveAt: { type: Date, required: true },

    price: { type: Number, required: true },
    currency: { type: String, default: "INR" },

    seatsAvailable: { type: Number, required: true, min: 0 },
    stops: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// indexes = faster flight search
flightSchema.index({ from: 1, to: 1, departAt: 1, price: 1 });
flightSchema.index({ airline: "text", from: "text", to: "text", flightNumber: "text" });

// =========================================================
// BOOKING MODEL (Payments + Invoice PDF)
// =========================================================

const bookingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    flightId: { type: mongoose.Schema.Types.ObjectId, ref: "Flight", required: true },

    // passenger (simple version)
    passengerName: { type: String, required: true, trim: true },
    passengerEmail: { type: String, required: true, lowercase: true, trim: true },
    seats: { type: Number, default: 1, min: 1 },

    // payment amount (in smallest currency unit is handled by Razorpay)
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },

    status: { type: String, enum: ["PENDING", "PAID", "CANCELLED"], default: "PENDING" },

    // Razorpay tracking
    razorpayOrderId: { type: String, default: "" },
    razorpayPaymentId: { type: String, default: "" }
  },
  { timestamps: true }
);

bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ razorpayOrderId: 1 });

// =========================================================
// NOTIFICATION MODEL (in-app notifications)
// =========================================================

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, default: "INFO" }, // INFO / PAYMENT / CHAT etc
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false }
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });

// =========================================================
// CHAT MESSAGE MODEL (Support chat)
// =========================================================

const chatMessageSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true }, // example: "support:<userId>"
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true }
  },
  { timestamps: true }
);

chatMessageSchema.index({ roomId: 1, createdAt: 1 });

// STEP 2: export models (so we can use them in routes/controllers)
const User = mongoose.model("User", userSchema);
const OtpToken = mongoose.model("OtpToken", otpTokenSchema);
const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);
const Flight = mongoose.model("Flight", flightSchema);
const Booking = mongoose.model("Booking", bookingSchema);
const Notification = mongoose.model("Notification", notificationSchema);
const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);

module.exports = {
  User,
  OtpToken,
  RefreshToken,
  Flight,
  Booking,
  Notification,
  ChatMessage
};

