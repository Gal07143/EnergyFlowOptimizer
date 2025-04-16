import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Devices from "@/pages/Devices";
import Analytics from "@/pages/Analytics";
import Optimization from "@/pages/Optimization";
import Settings from "@/pages/Settings";
import { useEffect } from "react";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/devices" component={Devices} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/optimization" component={Optimization} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
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
    <>
      <Router />
      <Toaster />
    </>
  );
}

export default App;
