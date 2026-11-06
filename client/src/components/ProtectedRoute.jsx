// STEP 1: ProtectedRoute = blocks page if not logged in
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts.jsx";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  // while checking refresh token, show small loading text
  if (loading) return <p style={{ padding: 16 }}>Loading...</p>;

  // if no user, redirect to login
  if (!user) return <Navigate to="/login" replace />;

  return children;
}

