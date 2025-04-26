import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { SettingsProvider } from "./contexts/SettingsContext";
import { RideProvider } from "./contexts/RideContext";
import { StrictMode } from "react";

// Create a wrapper component to ensure all providers are properly nested
function AppWithProviders() {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <SettingsProvider>
          <RideProvider>
            <App />
          </RideProvider>
        </SettingsProvider>
      </QueryClientProvider>
    </StrictMode>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<AppWithProviders />);
