import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Devices from "@/pages/Devices";
import Analytics from "@/pages/Analytics";
import Optimization from "@/pages/Optimization";
import OptimizationWizard from "@/pages/OptimizationWizard";
import Settings from "@/pages/Settings";
import Weather from "@/pages/Weather";
import DemandResponse from "@/pages/DemandResponse";
import ProfilePage from "@/pages/ProfilePage";
import AuthPage from "@/pages/auth-page";
import EmailVerificationPage from "@/pages/email-verification-page";
import { WebSocketStatus } from "@/components/ui/websocket-status";
import { useEffect } from "react";
import { AuthProvider } from "@/hooks/use-auth";
import { SiteProvider } from "@/hooks/use-site-context";
import { WebSocketProvider } from "@/hooks/WebSocketProvider";
import { ProtectedRoute } from "@/lib/protected-route";

// Component to show connection status in corner
const ConnectionStatus = () => (
  <div className="fixed bottom-4 right-4 z-50">
    <WebSocketStatus showBadge />
  </div>
);

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/devices" component={Devices} />
      <ProtectedRoute path="/analytics" component={Analytics} />
      <ProtectedRoute path="/optimization" component={Optimization} />
      <ProtectedRoute path="/optimization/wizard" component={OptimizationWizard} />
      <ProtectedRoute path="/weather" component={Weather} />
      <ProtectedRoute path="/demand-response" component={DemandResponse} />
      <ProtectedRoute path="/settings" component={Settings} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/verify-email" component={EmailVerificationPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Set initial theme based on user preference or system
  useEffect(() => {
    const savedTheme = localStorage.getItem('dark-mode');
    if (savedTheme === 'true' || (savedTheme === null && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <AuthProvider>
      <SiteProvider>
        <WebSocketProvider>
          <Router />
          <ConnectionStatus />
          <Toaster />
        </WebSocketProvider>
      </SiteProvider>
    </AuthProvider>
  );
}

export default App;
