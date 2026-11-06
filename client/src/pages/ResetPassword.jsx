// STEP 1: Reset password using OTP
import React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";

import { useAuth } from "../contexts.jsx";

export default function ResetPassword() {
  const nav = useNavigate();
  const { actions } = useAuth();
  const [params] = useSearchParams();
  const emailFromUrl = params.get("email") || "";

  const { register, handleSubmit } = useForm({
    defaultValues: { email: emailFromUrl, otp: "", newPassword: "" }
  });

  async function onSubmit(values) {
    await actions.resetPassword(values);
    nav("/login");
  }

  return (
    <div className="panel">
      <h2>Reset Password</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="form">
        <input placeholder="Email" {...register("email")} />
        <input placeholder="OTP" {...register("otp")} />
        <input placeholder="New Password (6+ chars)" type="password" {...register("newPassword")} />
        <button className="btn" type="submit">
          Reset
        </button>
      </form>

      <p className="muted">
        Back to <Link to="/login">Login</Link>
      </p>
    </div>
  );
}

