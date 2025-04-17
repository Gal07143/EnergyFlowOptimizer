import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
// Import new pages
import DashboardPage from "@/pages/DashboardPage";
import DevicesPage from "@/pages/DevicesPage";
import DeviceDetail from "@/pages/DeviceDetail";
import LocationsPage from "@/pages/LocationsPage";
import EnergyFlowPage from "@/pages/EnergyFlowPage";
import OptimizationDashboard from "@/pages/OptimizationDashboard";
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
import { MainLayout } from "@/components/layout/MainLayout";

// Component to show connection status in corner
const ConnectionStatus = () => (
  <div className="fixed bottom-4 right-4 z-50">
    <WebSocketStatus showBadge />
  </div>
);

// Wrapper component for layout
const ProtectedPageWithLayout = ({ component: Component, path }: { component: React.ComponentType, path: string }) => {
  return (
    <ProtectedRoute
      path={path}
      component={() => (
        <MainLayout>
          <Component />
        </MainLayout>
      )}
    />
  );
};

function Router() {
  return (
    <Switch>
      <ProtectedPageWithLayout path="/" component={DashboardPage} />
      <ProtectedPageWithLayout path="/devices" component={DevicesPage} />
      <ProtectedPageWithLayout path="/devices/:id" component={DeviceDetail} />
      <ProtectedPageWithLayout path="/locations" component={LocationsPage} />
      <ProtectedPageWithLayout path="/energy-flow" component={EnergyFlowPage} />
      <ProtectedPageWithLayout path="/optimization" component={OptimizationDashboard} />
      <ProtectedPageWithLayout path="/vpp" component={OptimizationDashboard} />
      <ProtectedPageWithLayout path="/weather" component={Weather} />
      <ProtectedPageWithLayout path="/demand-response" component={DemandResponse} />
      <ProtectedPageWithLayout path="/settings" component={Settings} />
      <ProtectedPageWithLayout path="/profile" component={ProfilePage} />
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
