import { createRoot } from "react-dom/client";
import App from "./App";

// Tailwind CSS and shadcn/ui styles (CRITICAL for modern design)
import "./index.css";
// Custom component styles (separated from components)
import './styles/components.css';

// Pre-optimize heavy dependencies for faster lazy-loaded pages
// This forces Vite to include them in initial optimization, avoiding 5s re-optimization delay
import 'zustand/react/shallow';
import '@xyflow/react';

createRoot(document.getElementById("root")!).render(<App />);
