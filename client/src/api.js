// STEP 1: axios instance (so we don't repeat baseURL everywhere)
import axios from "axios";

// NOTE: backend runs on 5000 in our project
export const api = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true // needed for refresh token cookie
});

// STEP 2: helper to set/remove access token (Authorization header)
export function setAccessToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

// STEP 3: device id (for session/device management)
// We create it once and store in localStorage
export function getDeviceId() {
  const key = "fb_device_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID(); // browser built-in
    localStorage.setItem(key, id);
  }
  return id;
}

