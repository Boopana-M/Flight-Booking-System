// STEP 1: Verify email page (OTP)
import React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";

import { useAuth } from "../contexts.jsx";

export default function VerifyEmail() {
  const nav = useNavigate();
  const { actions } = useAuth();

  // STEP 2: get email from query string
  const [params] = useSearchParams();
  const emailFromUrl = params.get("email") || "";

  const { register, handleSubmit } = useForm({
    defaultValues: { email: emailFromUrl, otp: "" }
  });

  async function onSubmit(values) {
    await actions.verifyEmail(values);
    nav("/login");
  }

  return (
    <div className="panel">
      <h2>Verify Email (OTP)</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="form">
        <input placeholder="Email" {...register("email")} />
        <input placeholder="OTP (6 digits)" {...register("otp")} />
        <button className="btn" type="submit">
          Verify
        </button>
      </form>

      <p className="muted">
        Back to <Link to="/login">Login</Link>
      </p>
    </div>
  );
}

