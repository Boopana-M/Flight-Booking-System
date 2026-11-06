// STEP 1: File upload + preview before upload (requested feature)
import React, { useState } from "react";

export default function FileUploadPreview({ onFileSelect }) {
  const [previewUrl, setPreviewUrl] = useState("");

  function handleChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // STEP 2: preview using browser URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // STEP 3: send file to parent component
    onFileSelect(file);
  }

  return (
    <div className="upload-box">
      <input type="file" accept="image/*" onChange={handleChange} />

      {previewUrl ? (
        <img className="preview" src={previewUrl} alt="preview" />
      ) : (
        <p className="muted">Select an image to preview</p>
      )}
    </div>
  );
}

