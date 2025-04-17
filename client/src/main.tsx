import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { useEffect } from "react";
import { useInitializeDemoData } from "./hooks/useSiteData";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { WebSocketProvider } from "./hooks/WebSocketProvider";

function AppWithInitialData() {
  const { mutate: initializeDemoData } = useInitializeDemoData();

  useEffect(() => {
    // Initialize demo data when the application first loads
    initializeDemoData();
  }, [initializeDemoData]);

  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <WebSocketProvider>
      <AppWithInitialData />
    </WebSocketProvider>
  </QueryClientProvider>
);
