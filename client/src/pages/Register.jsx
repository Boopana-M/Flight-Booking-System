// STEP 1: Register page
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";

import { useAuth } from "../contexts.jsx";

export default function Register() {
  const nav = useNavigate();
  const { actions } = useAuth();
  const { register, handleSubmit } = useForm();

  async function onSubmit(values) {
    // NOTE: captchaToken is optional in backend; keep it empty for now
    await actions.register(values);

    // go to verify page and keep email in query string (easy UX)
    nav(`/verify-email?email=${encodeURIComponent(values.email)}`);
  }

  return (
    <div className="panel">
      <h2>Register</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="form">
        <input placeholder="Name" {...register("name")} />
        <input placeholder="Email" {...register("email")} />
        <input placeholder="Password (6+ chars)" type="password" {...register("password")} />
        <button className="btn" type="submit">
          Register
        </button>
      </form>

      <p className="muted">
        Already have account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}

