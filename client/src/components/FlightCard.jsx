// STEP 1: reusable card component (like your Card.jsx notes)
import React from "react";
import { useTranslation } from "react-i18next";

export default function FlightCard({ flight, onBook }) {
  const { t } = useTranslation();

  return (
    <div className="card">
      <div className="row space">
        <h3>
          {flight.from} → {flight.to}
        </h3>
        <span className="pill">{flight.airline}</span>
      </div>

      <p className="muted">
        Flight: {flight.flightNumber} • Stops: {flight.stops}
      </p>
      <p className="muted">
        Depart: {new Date(flight.departAt).toLocaleString()}
        <br />
        Arrive: {new Date(flight.arriveAt).toLocaleString()}
      </p>

      <div className="row space">
        <b>
          {flight.currency} {flight.price}
        </b>
        <span className="muted">Seats: {flight.seatsAvailable}</span>
      </div>

      <button className="btn" onClick={() => onBook(flight)}>
        {t("bookNow")}
      </button>
    </div>
  );
}

