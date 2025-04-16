import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth, verifyEmailSchema, resendVerificationSchema } from "@/hooks/use-auth";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";
import { z } from "zod";

export function EmailVerification() {
  const { user, isEmailVerified, verifyEmailMutation, resendVerificationMutation } = useAuth();
  const [showResendForm, setShowResendForm] = useState(false);

  // Verification form
  const verificationForm = useForm<z.infer<typeof verifyEmailSchema>>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: {
      userId: user?.id || 0,
      code: "",
    },
  });

  // Resend verification form
  const resendForm = useForm<z.infer<typeof resendVerificationSchema>>({
    resolver: zodResolver(resendVerificationSchema),
    defaultValues: {
      email: user?.email || "",
    },
  });

  // Handle verification submission
  function onVerifySubmit(data: z.infer<typeof verifyEmailSchema>) {
    verifyEmailMutation.mutate(data);
  }

  // Handle resend submission
  function onResendSubmit(data: z.infer<typeof resendVerificationSchema>) {
    resendVerificationMutation.mutate(data);
    setShowResendForm(false);
  }

  // If already verified, show success message
  if (isEmailVerified) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center text-green-600">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-2" />
            Email Verified
          </CardTitle>
          <CardDescription className="text-center">
            Your email has been successfully verified.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p>You now have full access to all features of the Energy Management System.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Verify Your Email</CardTitle>
        <CardDescription className="text-center">
          {showResendForm
            ? "Enter your email to receive a new verification code."
            : "Please enter the verification code sent to your email."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {showResendForm ? (
          <Form {...resendForm}>
            <form onSubmit={resendForm.handleSubmit(onResendSubmit)} className="space-y-4">
              <FormField
                control={resendForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="your.email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={resendVerificationMutation.isPending}
              >
                {resendVerificationMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send New Code
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setShowResendForm(false)}
              >
                Back to Verification
              </Button>
            </form>
          </Form>
        ) : (
          <Form {...verificationForm}>
            <form onSubmit={verificationForm.handleSubmit(onVerifySubmit)} className="space-y-4">
              <FormField
                control={verificationForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verification Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter 6-digit code"
                        maxLength={6}
                        pattern="[0-9]*"
                        inputMode="numeric"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={verifyEmailMutation.isPending}
              >
                {verifyEmailMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Email"
                )}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
      <CardFooter className="flex-col space-y-2">
        {!showResendForm && (
          <Button
            variant="link"
            className="w-full"
            onClick={() => setShowResendForm(true)}
          >
            Didn't receive a code? Send again
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}