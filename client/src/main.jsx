// STEP 1: React imports
import React from "react";
import ReactDOM from "react-dom/client";

// STEP 2: app + global css
import App from "./App.jsx";
import "./styles.css";

// STEP 3: i18n init (multi-language)
import "./i18n.js";

// STEP 4: render App into DOM (root div)
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

