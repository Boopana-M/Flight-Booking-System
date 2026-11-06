// STEP 1: Notifications page (list + mark read)
import React from "react";
import { useNotifications } from "../contexts.jsx";

export default function Notifications() {
  const { items, markRead } = useNotifications();

  return (
    <div>
      <h2>Notifications</h2>

      {items.length === 0 ? (
        <p className="muted">No notifications</p>
      ) : (
        <div className="stack">
          {items.map((n) => (
            <div key={n._id} className={`card ${n.isRead ? "" : "highlight"}`}>
              <div className="row space">
                <b>{n.type}</b>
                <span className="muted">{new Date(n.createdAt).toLocaleString()}</span>
              </div>
              <p>{n.message}</p>
              {!n.isRead && (
                <button className="btn" onClick={() => markRead(n._id)}>
                  Mark as read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

