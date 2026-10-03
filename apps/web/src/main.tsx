import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";
import { TermsOfService } from "./pages/TermsOfService";
import "./index.css";

// No router dependency for two static pages — a plain pathname switch is
// enough, and keeps the funnel's own bundle lean.
function Root(): JSX.Element {
  switch (window.location.pathname) {
    case "/privacy":
      return <PrivacyPolicy />;
    case "/terms":
      return <TermsOfService />;
    default:
      return <App />;
  }
}

const container = document.getElementById("root");
if (!container) throw new Error("#root element not found");

createRoot(container).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
