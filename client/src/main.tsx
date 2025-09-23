import { createRoot } from "react-dom/client";
import App from "./App";

// Custom component styles (separated from components)
import './styles/components.css';

createRoot(document.getElementById("root")!).render(<App />);
