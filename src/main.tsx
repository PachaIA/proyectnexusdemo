import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./lib/registerSW";
import { initializeTheme } from "./lib/theme";

initializeTheme();
const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
registerServiceWorker();
