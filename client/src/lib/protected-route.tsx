import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import Layout from "@/components/Layout";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading, isEmailVerified, isEmailVerificationLoading } = useAuth();

  // Show loading spinner while checking auth or email verification status
  if (isLoading || isEmailVerificationLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // If user is logged in but email not verified, redirect to verification page
  if (user && !isEmailVerified && user.email) {
    return (
      <Route path={path}>
        <Redirect to="/verify-email" />
      </Route>
    );
  }

  // If all conditions pass, show the protected component
  return (
    <Route path={path}>
      <Layout>
        <Component />
      </Layout>
    </Route>
  );
}