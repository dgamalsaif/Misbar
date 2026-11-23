import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const canonicalHost = "srmaacademy.com";
const isLegacyWwwHost = window.location.hostname === `www.${canonicalHost}`;
const isCanonicalHost = window.location.hostname === canonicalHost;

if (isLegacyWwwHost) {
  const canonicalUrl = new URL(window.location.href);
  canonicalUrl.hostname = canonicalHost;
  window.location.replace(canonicalUrl);
} else {
  createRoot(document.getElementById("root")!).render(<App />);
}

if (isCanonicalHost && window.isSecureContext && "serviceWorker" in navigator) {
  const registerAppWorker = async () => {
    try {
      await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
    } catch (error) {
      console.warn("Misbar app installation support could not be enabled.", error);
    }
  };

  if (document.readyState === "complete") {
    void registerAppWorker();
  } else {
    window.addEventListener("load", () => void registerAppWorker(), { once: true });
  }
}
