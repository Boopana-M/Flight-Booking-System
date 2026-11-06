// STEP 1: load env variables from .env
require("dotenv").config();

// STEP 2: import http + socket.io
const http = require("http");
const { Server } = require("socket.io");

// STEP 3: import express app + db + models
const app = require("./app");
const { connectDB } = require("./db");
const { Flight, ChatMessage } = require("./models");

// STEP 4: swagger (API documentation)
const swaggerUi = require("swagger-ui-express");
const { createSwaggerSpec } = require("./swagger");

// STEP 5: create http server (needed for socket.io)
const server = http.createServer(app);

// STEP 6: create socket.io server (real-time)
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true
  }
});

// STEP 7: store io inside express app (so routes can emit notifications)
app.set("io", io);

// STEP 8: socket events (chat + notifications)
io.on("connection", (socket) => {
  // When user logs in, frontend can call: socket.emit("join", { userId })
  socket.on("join", ({ userId }) => {
    if (!userId) return;
    socket.join(`user:${userId}`); // personal room (for notifications)
  });

  // Support chat room join (example roomId: "support:<userId>")
  socket.on("chat:join", ({ roomId }) => {
    if (!roomId) return;
    socket.join(roomId);
  });

  // Send message to a room (and save to DB)
  socket.on("chat:send", async ({ roomId, senderId, text }) => {
    try {
      if (!roomId || !senderId || !text) return;

      const msg = await ChatMessage.create({ roomId, senderId, text });

      // emit to everyone in that room
      io.to(roomId).emit("chat:new", msg);
    } catch (e) {
      // ignore socket errors (keep server stable)
    }
  });
});

// STEP 9: mount swagger docs
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(createSwaggerSpec()));

// STEP 10: seed some sample flights (so UI has data on first run)
async function seedFlightsIfEmpty() {
  const count = await Flight.countDocuments();
  if (count > 0) return;

  await Flight.insertMany([
    {
      from: "Chennai",
      to: "Delhi",
      airline: "IndiGo",
      flightNumber: "6E-221",
      departAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      arriveAt: new Date(Date.now() + 24 * 60 * 60 * 1000 + 2.5 * 60 * 60 * 1000),
      price: 5499,
      currency: "INR",
      seatsAvailable: 12,
      stops: 0
    },
    {
      from: "Mumbai",
      to: "Bengaluru",
      airline: "Air India",
      flightNumber: "AI-803",
      departAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      arriveAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 1.75 * 60 * 60 * 1000),
      price: 4899,
      currency: "INR",
      seatsAvailable: 18,
      stops: 0
    }
  ]);

  console.log("Seeded sample flights ✈️");
}

// STEP 11: start server (connect db -> listen)
async function start() {
  await connectDB();
  await seedFlightsIfEmpty();

  const port = Number(process.env.PORT || 5000);
  server.listen(port, () => {
    console.log(`Server started on port ${port} ✅`);
    console.log(`Swagger docs: http://localhost:${port}/api/docs`);
  });
}

start().catch((err) => {
  console.error("Failed to start server ❌", err);
  process.exit(1);
});

