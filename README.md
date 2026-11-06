# Flight Booking System (MERN) - Practice Project

This project is generated for your MERN practice, keeping the code **simple + familiar**, with **comment style like your notes**.

## Features covered (from your screenshot)

- Frontend: Login/Register, responsive UI, dashboard, form validation basics, protected routes, theme toggle, search/filter/sort, notifications, pagination, profile, file upload + preview, cards, chat UI, multi-language.
- Backend: REST APIs, JWT auth, bcrypt hashing, OTP email verify + reset password, Razorpay payment order + webhook handler, Multer upload + Cloudinary, CRUD, validation, error middleware, PDF invoice, socket real-time notifications/chat, indexes, Mongo transactions, Swagger docs, basic security middleware, testing, Docker, CI workflow.

---

## 1) Run locally (recommended for practice)

### A) Start MongoDB

- Option 1: Install MongoDB locally and run it
- Option 2 (easy): use Docker only for Mongo:

```bash
docker run --name fb-mongo -p 27017:27017 -d mongo:7
```

### B) Backend setup

```bash
cd server
npm install
copy .env.example .env
npm run dev
```

Backend will run on: `http://localhost:5000`

Swagger docs: `http://localhost:5000/api/docs`

### C) Frontend setup

```bash
cd client
npm install
npm run dev
```

Frontend will run on: `http://localhost:5173`

---

## 2) Razorpay (payment) - IMPORTANT note

- The frontend opens Razorpay Checkout.
- **Booking will become PAID only after Razorpay webhook hits the backend**.
- For local testing, use **Razorpay CLI** to forward webhooks to your localhost.

---

## 3) Folder structure (simple)

```text
flight-booking-mern/
  client/     # React app
  server/     # Express API
  docker-compose.yml
  .github/workflows/ci.yml
```

---

## 4) Practice ideas (what to do next)

- Add admin login and create flights from UI
- Add better form validations (react-hook-form + yup)
- Improve booking UI with passenger list
- Add seat map
- Add real webhook signature verification (raw body)
- Deploy to Render / Railway (server) + Netlify/Vercel (client)

