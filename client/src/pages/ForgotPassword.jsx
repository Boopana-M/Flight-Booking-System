// STEP 1: Forgot password -> send OTP
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";

import { useAuth } from "../contexts.jsx";

export default function ForgotPassword() {
  const nav = useNavigate();
  const { actions } = useAuth();
  const { register, handleSubmit } = useForm();

  async function onSubmit(values) {
    await actions.forgotPassword(values);
    nav(`/reset-password?email=${encodeURIComponent(values.email)}`);
  }

  return (
    <div className="panel">
      <h2>Forgot Password</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="form">
        <input placeholder="Email" {...register("email")} />
        <button className="btn" type="submit">
          Send OTP
        </button>
      </form>

      <p className="muted">
        Back to <Link to="/login">Login</Link>
      </p>
    </div>
  );
}

