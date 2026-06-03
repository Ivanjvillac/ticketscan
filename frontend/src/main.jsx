import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// Inject auth token into every /api/ request so sub-components
// (Analytics, Budget, AdvancedAnalysis, etc.) don't need to handle it individually
const _fetch = window.fetch.bind(window);
window.fetch = (url, opts = {}) => {
  const urlStr = typeof url === "string" ? url : url?.url || "";
  const isApi = urlStr.includes("/api/");
  if (isApi) {
    const token = localStorage.getItem("ts_token") || "";
    opts = {
      ...opts,
      headers: {
        "Authorization": `Bearer ${token}`,
        ...opts.headers,
      }
    };
  }
  return _fetch(url, opts);
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
