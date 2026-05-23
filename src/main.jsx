import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// PWA install promptini iloji boricha erta ushlash
window._pwaPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  window._pwaPrompt = e;
  window.dispatchEvent(new Event("pwa-prompt-ready"));
});
window.addEventListener("appinstalled", () => {
  window._pwaPrompt = null;
  window.dispatchEvent(new Event("pwa-installed"));
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
