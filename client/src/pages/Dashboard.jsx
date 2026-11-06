// STEP 1: Dashboard = flight search page
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { api } from "../api.js";
import FlightCard from "../components/FlightCard.jsx";
import Pagination from "../components/Pagination.jsx";

export default function Dashboard() {
  const nav = useNavigate();
  const { t } = useTranslation();

  // STEP 2: UI states
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("departAt_asc");

  // STEP 3: data states
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // STEP 4: fetch flights (useEffect avoids infinite calls ✅)
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.get("/flights", {
          params: { from, to, date, q, sort, page, limit: 8 }
        });
        setItems(res.data.items || []);
        setTotalPages(res.data.totalPages || 1);
      } finally {
        setLoading(false);
      }
    })();
  }, [from, to, date, q, sort, page]);

  function onBook(flight) {
    // STEP 5: store selected flight and go to booking page
    sessionStorage.setItem("selectedFlight", JSON.stringify(flight));
    nav("/booking");
  }

  return (
    <div>
      <h2>{t("searchFlights")}</h2>

      {/* Search + filter bar */}
      <div className="filters">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search (airline/from/to)" />
        <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="From" />
        <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="To" />
        <input value={date} onChange={(e) => setDate(e.target.value)} type="date" />

        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="departAt_asc">Depart ↑</option>
          <option value="departAt_desc">Depart ↓</option>
          <option value="price_asc">Price ↑</option>
          <option value="price_desc">Price ↓</option>
        </select>

        <button className="btn" onClick={() => setPage(1)}>
          Apply
        </button>
      </div>

      {/* Cards */}
      {loading ? (
        <p className="muted">Loading flights...</p>
      ) : (
        <div className="grid">
          {items.map((f) => (
            <FlightCard key={f._id} flight={f} onBook={onBook} />
          ))}
        </div>
      )}

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}

