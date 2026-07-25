import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app.js";
import { initializeAnalytics } from "./utils/analytics.js";

import "./styles.css";

initializeAnalytics();

const root = document.getElementById("root");

if (!root) {
  throw new Error("Unable to find the application root");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
