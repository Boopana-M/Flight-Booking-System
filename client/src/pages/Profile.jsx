// STEP 1: Profile page (user details + upload profile image)
import React, { useState } from "react";
import toast from "react-hot-toast";

import { api } from "../api.js";
import { useAuth } from "../contexts.jsx";
import FileUploadPreview from "../components/FileUploadPreview.jsx";

export default function Profile() {
  const { user, actions } = useAuth();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  async function upload() {
    if (!file) return toast.error("Select a file first");

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await api.post("/uploads/profile-image", fd);
      actions.setUser(res.data.user); // update global user
      toast.success("Profile image updated ✅");
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <div className="panel">
      <h2>Profile</h2>

      <div className="card">
        <p>
          Name: <b>{user.name}</b>
        </p>
        <p>
          Email: <b>{user.email}</b>
        </p>
        <p>
          Role: <b>{user.role}</b>
        </p>

        {user.profileImageUrl ? (
          <img className="avatar" src={user.profileImageUrl} alt="profile" />
        ) : (
          <p className="muted">No profile image</p>
        )}
      </div>

      <h3>Upload Profile Image</h3>
      <FileUploadPreview onFileSelect={setFile} />

      <button className="btn" onClick={upload} disabled={loading}>
        Upload
      </button>
    </div>
  );
}

