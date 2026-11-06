// STEP 1: simple pagination (prev/next)
import React from "react";

export default function Pagination({ page, totalPages, onChange }) {
  return (
    <div className="row center gap">
      <button className="btn" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Prev
      </button>
      <span>
        Page <b>{page}</b> / {totalPages}
      </span>
      <button className="btn" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Next
      </button>
    </div>
  );
}

