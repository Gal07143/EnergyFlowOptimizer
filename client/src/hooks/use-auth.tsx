import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User as SelectUser, insertUserSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Verification schemas
const verifyEmailSchema = z.object({
  userId: z.number(),
  code: z.string().length(6, "Verification code must be 6 digits")
});

const resendVerificationSchema = z.object({
  email: z.string().email("Please enter a valid email address")
});

type VerifyEmailData = z.infer<typeof verifyEmailSchema>;
type ResendVerificationData = z.infer<typeof resendVerificationSchema>;

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  isEmailVerified: boolean;
  isEmailVerificationLoading: boolean;
  loginMutation: UseMutationResult<Omit<SelectUser, "password">, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<Omit<SelectUser, "password">, Error, RegisterData>;
  verifyEmailMutation: UseMutationResult<{ message: string }, Error, VerifyEmailData>;
  resendVerificationMutation: UseMutationResult<{ message: string }, Error, ResendVerificationData>;
};

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = insertUserSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/user");
        if (res.status === 401) return null;
        return await res.json();
      } catch (error) {
        return null;
      }
    },
  });
  
  // Check if email is verified
  const {
    data: emailVerificationData,
    isLoading: isEmailVerificationLoading,
  } = useQuery<{ verified: boolean }, Error>({
    queryKey: ["/api/email-verification-status"],
    queryFn: async () => {
      try {
        if (!user) return { verified: false };
        const res = await apiRequest("GET", "/api/email-verification-status");
        if (!res.ok) {
          return { verified: false };
        }
        return await res.json();
      } catch (error) {
        return { verified: false };
      }
    },
    enabled: !!user, // Only run this query if user is logged in
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Login failed");
      }
      return await res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      // Remove confirmPassword as it's not needed for API
      const { confirmPassword, ...userData } = credentials;
      const res = await apiRequest("POST", "/api/register", userData);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Registration failed");
      }
      return await res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Registration successful",
        description: `Welcome, ${user.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/logout");
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Logout failed");
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Email verification mutations
  const verifyEmailMutation = useMutation({
    mutationFn: async (data: VerifyEmailData) => {
      const res = await apiRequest("POST", "/api/verify-email", data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Verification failed");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      // Invalidate email verification status
      queryClient.invalidateQueries({ queryKey: ["/api/email-verification-status"] });
      toast({
        title: "Email verified successfully",
        description: data.message || "Your email has been verified. You can now access all features of the application.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const resendVerificationMutation = useMutation({
    mutationFn: async (data: ResendVerificationData) => {
      const res = await apiRequest("POST", "/api/resend-verification", data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to resend verification code");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Verification code sent",
        description: data.message || "A new verification code has been sent to your email.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to resend verification code",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        isEmailVerified: emailVerificationData?.verified ?? false,
        isEmailVerificationLoading,
        loginMutation,
        logoutMutation,
        registerMutation,
        verifyEmailMutation,
        resendVerificationMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export { loginSchema, registerSchema, verifyEmailSchema, resendVerificationSchema };