// STEP 1: Booking page (create booking + payment)
import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

import { api } from "../api.js";

// STEP 2: helper to load Razorpay script (only when needed)
function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Booking() {
  const { t } = useTranslation();

  // STEP 3: read selected flight from sessionStorage
  const flight = useMemo(() => {
    const raw = sessionStorage.getItem("selectedFlight");
    return raw ? JSON.parse(raw) : null;
  }, []);

  const [booking, setBooking] = useState(null);
  const [payLoading, setPayLoading] = useState(false);

  // STEP 4: booking form
  const { register, handleSubmit } = useForm({
    defaultValues: { passengerName: "", passengerEmail: "", seats: 1 }
  });

  async function onSubmit(values) {
    if (!flight) return toast.error("No flight selected");

    const res = await api.post("/bookings", { ...values, flightId: flight._id });
    setBooking(res.data.booking);
    toast.success("Booking created (PENDING payment)");
  }

  async function payNow() {
    if (!booking) return toast.error("Create booking first");

    setPayLoading(true);
    try {
      const ok = await loadRazorpay();
      if (!ok) return toast.error("Failed to load Razorpay script");

      // STEP 5: create order from backend
      const res = await api.post("/payments/razorpay/order", { bookingId: booking._id });

      const { order, razorpayKeyId } = res.data;

      // STEP 6: open Razorpay checkout
      const rz = new window.Razorpay({
        key: razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        name: "Flight Booking",
        description: `Booking ${booking._id}`,
        order_id: order.id,
        handler: function (response) {
          // IMPORTANT:
          // Payment success in UI does NOT automatically update DB.
          // Razorpay will send a webhook to backend -> backend will mark booking PAID.
          // For local testing, use Razorpay CLI to forward webhooks.
          toast.success("Payment successful in Razorpay UI ✅ (wait for webhook)");
          console.log("Razorpay response:", response);
        }
      });

      rz.open();
    } finally {
      setPayLoading(false);
    }
  }

  return (
    <div className="panel">
      <h2>Booking</h2>

      {!flight ? (
        <p className="muted">No flight selected. Go back to Dashboard.</p>
      ) : (
        <>
          <div className="card">
            <h3>
              {flight.from} → {flight.to}
            </h3>
            <p className="muted">
              {flight.airline} {flight.flightNumber}
            </p>
            <p className="muted">
              Price: {flight.currency} {flight.price}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="form">
            <input placeholder="Passenger Name" {...register("passengerName")} />
            <input placeholder="Passenger Email" {...register("passengerEmail")} />
            <input type="number" min="1" placeholder="Seats" {...register("seats")} />
            <button className="btn" type="submit">
              Create Booking
            </button>
          </form>

          {booking && (
            <div className="card">
              <p>
                Booking ID: <b>{booking._id}</b>
              </p>
              <p>
                Status: <b>{booking.status}</b>
              </p>
              <p>
                Amount: <b>{booking.currency} {booking.amount}</b>
              </p>

              <button className="btn" onClick={payNow} disabled={payLoading}>
                {t("payNow")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

