"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Lock, User, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { ClipizyLogo } from "@/components/common/clipizy-logo";
import { useToast } from "@/hooks/ui/use-toast";

export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [subscribedToNewsletter, setSubscribedToNewsletter] = useState(false);
  const [acceptedConditions, setAcceptedConditions] = useState(false);
  
  const router = useRouter();
  const { isAuthenticated, loginWithGoogle } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard/create");
    }
  }, [isAuthenticated, router]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email is invalid";
    }

    if (!acceptedConditions) {
      newErrors.conditions = "You must accept the terms and conditions";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          subscribed_to_newsletter: subscribedToNewsletter,
          accepted_conditions: acceptedConditions,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success!",
          description: "You've been added to the waitlist. We'll notify you when registration opens.",
        });
        setEmail("");
        setSubscribedToNewsletter(false);
        setAcceptedConditions(false);
      } else {
        setErrors({ general: data.detail || "Failed to join waitlist. Please try again." });
      }
    } catch (error) {
      console.error("Waitlist error:", error);
      setErrors({ general: "Failed to join waitlist. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    try {
      const success = await loginWithGoogle();
      if (success) {
        router.push("/dashboard/create");
      } else {
        setErrors({ general: "Google authentication failed. Please try again." });
      }
    } catch (error) {
      console.error("Google auth error:", error);
      setErrors({ general: "Google authentication failed. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4 relative overflow-hidden">
      <div className="absolute pointer-events-none" style={{ top: '53%', left: '50%', transform: 'translate(-50%, -50%)' }}>
        <ClipizyLogo className="w-[800px] h-[800px] opacity-50" />
      </div>
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold gradient-text mb-2">Join the Waitlist</h1>
          <p className="text-muted-foreground">Registration is currently by invitation only</p>
        </div>

        <Card className="card-modern bg-background/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
              <Clock className="w-6 h-6" />
              Waitlist
            </CardTitle>
            <CardDescription>
              Enter your email to join the waitlist, or sign in with Google if you have an invitation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {errors.general && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  {errors.general}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) {
                        setErrors(prev => ({ ...prev, email: "" }));
                      }
                    }}
                    className="pl-10"
                    required
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="newsletter"
                    checked={subscribedToNewsletter}
                    onCheckedChange={(checked) => setSubscribedToNewsletter(checked === true)}
                  />
                  <Label htmlFor="newsletter" className="text-sm font-normal cursor-pointer">
                    Subscribe to newsletter for updates and announcements
                  </Label>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="conditions"
                    checked={acceptedConditions}
                    onCheckedChange={(checked) => {
                      setAcceptedConditions(checked === true);
                      if (errors.conditions) {
                        setErrors(prev => ({ ...prev, conditions: "" }));
                      }
                    }}
                    required
                  />
                  <Label htmlFor="conditions" className="text-sm font-normal cursor-pointer">
                    I accept the{" "}
                    <a href="/terms" className="text-primary hover:underline" target="_blank">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="/privacy" className="text-primary hover:underline" target="_blank">
                      Privacy Policy
                    </a>
                  </Label>
                </div>
                {errors.conditions && (
                  <p className="text-sm text-red-600">{errors.conditions}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full btn-gradient"
                disabled={isLoading}
              >
                {isLoading ? "Joining Waitlist..." : "Join Waitlist"}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or sign in with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleAuth}
              disabled={isLoading}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <a href="/auth/login" className="text-primary hover:underline font-medium">
                  Sign in
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}










