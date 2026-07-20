import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App.tsx";
import "./index.css";
import { LocaleProvider } from "./lib/i18n/context";
import { SavedHousingProvider } from "./lib/savedHousing/context";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LocaleProvider>
      <SavedHousingProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </SavedHousingProvider>
    </LocaleProvider>
  </StrictMode>,
);
