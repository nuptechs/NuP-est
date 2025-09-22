import { createRoot } from "react-dom/client";
import App from "./App";

// Semantic UI CSS (base framework)
import 'semantic-ui-css/semantic.min.css';

// Custom styles (separated from components)
import './styles/semantic-ui-overrides.css';
import './styles/components.css';

createRoot(document.getElementById("root")!).render(<App />);
