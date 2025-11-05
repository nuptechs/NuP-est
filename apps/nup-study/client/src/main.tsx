import { createRoot } from "react-dom/client";
import App from "./App";

// Tailwind CSS and shadcn/ui styles (CRITICAL for modern design)
import "./index.css";
// Custom component styles (separated from components)
import './styles/components.css';

createRoot(document.getElementById("root")!).render(<App />);
