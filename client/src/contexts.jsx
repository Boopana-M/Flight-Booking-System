// STEP 1: React context setup (global state)
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";

import { api, getDeviceId, setAccessToken } from "./api.js";

// =========================================================
// AUTH CONTEXT (login/register + protected routes)
// =========================================================

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // STEP 1: keep one socket connection for whole app
  const socket = useMemo(() => io("http://localhost:5000"), []);

  // STEP 2: on app load, try refresh token -> get new access token
  useEffect(() => {
    (async () => {
      try {
        const res = await api.post("/auth/refresh");
        setToken(res.data.accessToken);
        setAccessToken(res.data.accessToken);
      } catch (e) {
        // ignore (means user not logged in)
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // STEP 3: when token changes, set axios header
  useEffect(() => {
    setAccessToken(accessToken);
  }, [accessToken]);

  // STEP 4: fetch profile when we have token
  useEffect(() => {
    (async () => {
      if (!accessToken) return setUser(null);
      try {
        const res = await api.get("/me");
        setUser(res.data.user);

        // join socket room (for notifications)
        socket.emit("join", { userId: res.data.user._id });
      } catch (e) {
        setUser(null);
      }
    })();
  }, [accessToken, socket]);

  async function register(payload) {
    // Send deviceId header (backend expects it only in login, but keeping consistent)
    await api.post("/auth/register", payload, {
      headers: { "x-device-id": getDeviceId() }
    });
    toast.success("Registered! OTP sent to your email");
  }

  async function verifyEmail(payload) {
    await api.post("/auth/verify-email", payload);
    toast.success("Email verified ✅");
  }

  async function login(payload) {
    const res = await api.post("/auth/login", payload, {
      headers: { "x-device-id": getDeviceId() }
    });
    setToken(res.data.accessToken);
    setUser(res.data.user);
    toast.success("Login success ✅");

    // join socket room
    socket.emit("join", { userId: res.data.user.id || res.data.user._id });
  }

  async function logout() {
    await api.post("/auth/logout");
    setToken(null);
    setUser(null);
    toast("Logged out");
  }

  async function forgotPassword(payload) {
    await api.post("/auth/forgot-password", payload);
    toast.success("OTP sent ✅");
  }

  async function resetPassword(payload) {
    await api.post("/auth/reset-password", payload);
    toast.success("Password reset ✅");
  }

  const value = {
    user,
    accessToken,
    loading,
    socket,
    actions: { register, verifyEmail, login, logout, forgotPassword, resetPassword, setUser }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

// =========================================================
// THEME CONTEXT (dark/light mode)
// =========================================================

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(localStorage.getItem("fb_theme") || "light");

  useEffect(() => {
    document.body.dataset.theme = theme; // we use CSS [data-theme="dark"]
    localStorage.setItem("fb_theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

// =========================================================
// NOTIFICATION CONTEXT (list + real-time)
// =========================================================

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user, socket } = useAuth();
  const [items, setItems] = useState([]);

  async function load() {
    if (!user) return setItems([]);
    const res = await api.get("/notifications");
    setItems(res.data.items || []);
  }

  // load notifications on login
  useEffect(() => {
    load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  // real-time notifications from socket
  useEffect(() => {
    if (!socket) return;
    const handler = (notif) => {
      setItems((prev) => [notif, ...prev]);
      toast(notif.message || "New notification");
    };
    socket.on("notification", handler);
    return () => socket.off("notification", handler);
  }, [socket]);

  async function markRead(id) {
    await api.patch(`/notifications/${id}/read`);
    setItems((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
  }

  return (
    <NotificationContext.Provider value={{ items, load, markRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}

