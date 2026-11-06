// STEP 1: import packages
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const Razorpay = require("razorpay");
const cloudinaryLib = require("cloudinary").v2;
const PDFDocument = require("pdfkit");
const fs = require("fs");
const axios = require("axios");

// =========================================================
// PASSWORD HELPERS
// =========================================================

async function hashPassword(password) {
  // bcrypt salt rounds (10 is fine for learning projects)
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// =========================================================
// JWT HELPERS (access + refresh)
// =========================================================

function signAccessToken({ userId, role }) {
  // payload is small and safe (never put password)
  return jwt.sign(
    { role },
    process.env.JWT_ACCESS_SECRET,
    {
      subject: userId,
      expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m"
    }
  );
}

function signRefreshToken({ userId }) {
  return jwt.sign(
    {},
    process.env.JWT_REFRESH_SECRET,
    {
      subject: userId,
      expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d"
    }
  );
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

// =========================================================
// OTP HELPERS (Email verify + Reset password)
// =========================================================

function generateOtp6() {
  // "000000" to "999999"
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function hashOtp(otp) {
  // OTP is short, but we still hash it ✅
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(otp, salt);
}

function compareOtp(otp, otpHash) {
  return bcrypt.compare(otp, otpHash);
}

// =========================================================
// EMAIL (NodeMailer)
// =========================================================

function createMailer() {
  // NOTE: use Mailtrap/Gmail/any SMTP (values from .env)
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT || 587),
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    }
  });
}

async function sendEmail({ to, subject, html }) {
  const transporter = createMailer();
  return transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject,
    html
  });
}

// =========================================================
// CLOUDINARY (File upload storage)
// =========================================================

function initCloudinary() {
  cloudinaryLib.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

async function uploadToCloudinary(localFilePath, folder = "flight-booking") {
  // Upload file and return URL
  const res = await cloudinaryLib.uploader.upload(localFilePath, { folder });

  // Delete temp file after upload (clean code ✅)
  fs.unlink(localFilePath, () => {});

  return res.secure_url;
}

// =========================================================
// PDF INVOICE (PDFKit)
// =========================================================

async function createInvoicePdfBuffer({ booking, flight, user }) {
  // We create a PDF in memory (buffer)
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  // Title
  doc.fontSize(20).text("Flight Booking Invoice", { align: "center" });
  doc.moveDown();

  // Customer
  doc.fontSize(12).text(`Customer: ${user.name}`);
  doc.text(`Email: ${user.email}`);
  doc.moveDown();

  // Booking details
  doc.text(`Booking ID: ${booking._id}`);
  doc.text(`Status: ${booking.status}`);
  doc.text(`Passenger: ${booking.passengerName} (${booking.passengerEmail})`);
  doc.text(`Seats: ${booking.seats}`);
  doc.moveDown();

  // Flight details
  doc.text(`Flight: ${flight.airline} ${flight.flightNumber}`);
  doc.text(`From: ${flight.from}  →  To: ${flight.to}`);
  doc.text(`Departure: ${new Date(flight.departAt).toLocaleString()}`);
  doc.text(`Arrival: ${new Date(flight.arriveAt).toLocaleString()}`);
  doc.moveDown();

  // Amount
  doc.fontSize(14).text(`Total Paid: ${booking.currency} ${booking.amount}`, { align: "right" });

  doc.moveDown(2);
  doc.fontSize(10).text("Thank you for booking with us ✈️", { align: "center" });

  // End the pdf
  doc.end();

  // Wait for pdf to finish
  await new Promise((resolve) => doc.on("end", resolve));

  return Buffer.concat(chunks);
}

// =========================================================
// RAZORPAY (Payment gateway)
// =========================================================

function createRazorpay() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

async function createRazorpayOrder({ amount, currency = "INR", receipt }) {
  // Razorpay expects amount in smallest unit (INR paise)
  const razorpay = createRazorpay();
  return razorpay.orders.create({
    amount: Math.round(amount * 100),
    currency,
    receipt
  });
}

// =========================================================
// CAPTCHA (Google reCAPTCHA verify)
// =========================================================

async function verifyRecaptcha(token) {
  // If user didn't send captcha, we skip (keeps demo simple)
  if (!token) return { ok: true, skipped: true };

  // NOTE: This is the official verify endpoint
  const url = "https://www.google.com/recaptcha/api/siteverify";

  const res = await axios.post(
    url,
    new URLSearchParams({
      secret: process.env.RECAPTCHA_SECRET_KEY,
      response: token
    })
  );

  return { ok: Boolean(res.data && res.data.success), raw: res.data };
}

module.exports = {
  // password
  hashPassword,
  comparePassword,
  // jwt
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  // otp + email
  generateOtp6,
  hashOtp,
  compareOtp,
  sendEmail,
  // cloudinary
  initCloudinary,
  uploadToCloudinary,
  // pdf
  createInvoicePdfBuffer,
  // payments
  createRazorpayOrder,
  // captcha
  verifyRecaptcha
};

