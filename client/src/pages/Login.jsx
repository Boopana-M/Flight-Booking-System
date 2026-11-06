// STEP 1: Login page
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";

import { useAuth } from "../contexts.jsx";

export default function Login() {
  const nav = useNavigate();
  const { actions } = useAuth();

  // STEP 2: form handling (react-hook-form)
  const { register, handleSubmit } = useForm();

  async function onSubmit(values) {
    await actions.login(values);
    nav("/");
  }

  return (
    <div className="panel">
      <h2>Login</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="form">
        <input placeholder="Email" {...register("email")} />
        <input placeholder="Password" type="password" {...register("password")} />
        <button className="btn" type="submit">
          Login
        </button>
      </form>

      <p className="muted">
        New user? <Link to="/register">Register</Link>
      </p>
      <p className="muted">
        Forgot password? <Link to="/forgot-password">Reset</Link>
      </p>
    </div>
  );
}

