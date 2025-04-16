import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { EmailVerification } from "@/components/auth/EmailVerification";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export default function EmailVerificationPage() {
  const { user, isLoading, isEmailVerified } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect to login if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/auth");
    }
  }, [user, isLoading, setLocation]);

  // Redirect to home if already verified
  useEffect(() => {
    if (!isLoading && user && isEmailVerified) {
      setLocation("/");
    }
  }, [user, isEmailVerified, isLoading, setLocation]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user is logged in but email not verified, show verification form
  if (user && !isEmailVerified) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-6">
            Email Verification
          </h1>
          <div className="bg-card rounded-lg p-8 shadow-lg">
            <div className="text-center mb-6">
              <p className="text-muted-foreground">
                Before you can access all features of the Energy Management System, 
                we need to verify your email address.
              </p>
              <p className="mt-2">
                We've sent a verification code to{" "}
                <span className="font-semibold">{user.email}</span>. 
                Please check your inbox and enter the code below.
              </p>
            </div>
            
            <EmailVerification />
          </div>
        </div>
      </div>
    );
  }

  // This should not be reached due to redirects, but as a fallback
  return null;
}