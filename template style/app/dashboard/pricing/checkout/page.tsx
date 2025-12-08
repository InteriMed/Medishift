"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/ui/use-toast";
import { ArrowLeft, Loader2, Moon, Sun, Check } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/ThemeContext";
import { getBackendUrl } from "@/lib/config";

interface SubscriptionPlan {
  name: string;
  price: number;
  credits_per_month: number;
  stripe_price_id?: string | null;
}

interface PlansResponse {
  status: string;
  message: string;
  data: {
    [key: string]: SubscriptionPlan;
  };
}

const CheckoutForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const [planId, setPlanId] = useState<string>('creator');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const [planData, setPlanData] = useState<SubscriptionPlan | null>(null);
  const [plans, setPlans] = useState<{ [key: string]: SubscriptionPlan }>({});

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const plan = urlParams.get('plan');
    if (plan && (plan === 'creator' || plan === 'pro' || plan === 'business')) {
      setPlanId(plan);
    }
  }, []);

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const authToken = localStorage.getItem('access_token');
        if (!authToken) {
          toast({
            title: "Authentication Required",
            description: "Please log in to continue",
            variant: "destructive"
          });
          return;
        }

        const response = await fetch(`${getBackendUrl()}/api/credits/pricing/subscription-plans`, {
          method: "GET",
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch pricing`);
        }

        const data: PlansResponse = await response.json();
        if (data.data) {
          setPlans(data.data);
          const currentPlan = data.data[planId];
          if (currentPlan) {
            setPlanData(currentPlan);
          }
        }
      } catch (error) {
        console.error('Error fetching pricing:', error);
        toast({
          title: "Error Loading Pricing",
          description: "Failed to load pricing information. Please try again.",
          variant: "destructive"
        });
      }
    };

    fetchPricing();
  }, [planId, toast]);

  useEffect(() => {
    if (plans[planId]) {
      setPlanData(plans[planId]);
    }
  }, [planId, plans]);

  const handleCheckout = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to continue",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingCheckout(true);
    try {
      const authToken = localStorage.getItem('access_token');
      if (!authToken) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${getBackendUrl()}/api/credits/checkout`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          plan_id: planId,
          plan_type: 'subscription'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || errorData.message || errorData.error?.message || `HTTP ${response.status}: Failed to create checkout session`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (data.data && data.data.checkout_url) {
        window.location.href = data.data.checkout_url;
      } else {
        throw new Error('No checkout URL received from server');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast({
        title: "Checkout Error",
        description: error instanceof Error ? error.message : "Failed to create checkout session. Please try again.",
        variant: "destructive"
      });
      setIsCreatingCheckout(false);
    }
  };

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`;
  };

  const formatCredits = (credits: number) => {
    return credits.toLocaleString();
  };

  const getPlanFeatures = (plan: string) => {
    switch (plan) {
      case 'creator':
        return [
          "1,500 Credits Included",
          "1080p Full HD (No Watermark)",
          "10 GB Cloud Storage",
          "Video Automation Access (Scheduling Only)",
          "Commercial Licensing",
          "Email Support (Standard SLA)"
        ];
      case 'pro':
        return [
          "5,000 Credits Included",
          "1080p Full HD",
          "50 GB Cloud Storage",
          "Video Automation Access (Auto-Upload Included)",
          "1 Upload/Day Automated",
          "Email Support (Standard SLA)"
        ];
      case 'business':
        return [
          "12,500 Credits Included",
          "1080p Full HD",
          "150 GB Cloud Storage",
          "Premium Model LLM",
          "Video Automation Access (Advanced Queue Management)",
          "5 Uploads/Day Automated",
          "Priority Queue Access",
          "Priority Email Support"
        ];
      default:
        return [];
    }
  };

  return (
    <div className="h-screen overflow-hidden">
      <div className="h-full flex flex-col">
        <div className="flex-shrink-0 p-4">
          <div className="flex items-center justify-between mb-3">
            <Link href="/dashboard/settings" className="inline-flex items-center text-sm group text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Pricing
            </Link>
            
            <button
              onClick={toggleTheme}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted border border-border"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3 h-3" />
                  Light
                </>
              ) : (
                <>
                  <Moon className="w-3 h-3" />
                  Dark
                </>
              )}
            </button>
          </div>
          
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-1 text-foreground">
              Complete Your Subscription
            </h1>
            <p className="text-sm text-muted-foreground">
              Secure checkout powered by Stripe
            </p>
          </div>
        </div>

        <div className="flex-1 px-4 pb-4 overflow-y-auto">
          <div className="max-w-4xl mx-auto h-full grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="order-2 xl:order-1 flex flex-col">
              <Card className="border-0 shadow-xl backdrop-blur-sm flex-1 flex flex-col bg-card/90 border border-border/50">
                <CardHeader className="pb-3 flex-shrink-0">
                  <CardTitle className="text-xl font-bold flex items-center gap-2 text-card-foreground">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 dark:from-blue-400 dark:to-purple-400 rounded-lg flex items-center justify-center shadow-sm">
                      <span className="text-white font-bold text-xs">✓</span>
                    </div>
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col space-y-4">
                  {planData ? (
                    <>
                      <div className="rounded-xl p-4 border flex-shrink-0 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border-blue-100 dark:border-blue-800/50 dark:bg-gradient-to-r dark:from-slate-800/50 dark:to-slate-700/50">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-bold text-foreground">
                              {planData.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {formatCredits(planData.credits_per_month)} credits per month
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-green-600 dark:text-green-400">
                              {formatPrice(planData.price)}
                            </div>
                            <div className="text-xs text-muted-foreground">per month</div>
                          </div>
                        </div>
                        
                        <div className="space-y-2 mt-4">
                          <h4 className="font-semibold text-sm text-foreground">What's included:</h4>
                          <div className="space-y-1">
                            {getPlanFeatures(planId).map((feature, index) => (
                              <div key={index} className="flex items-center gap-2 text-xs">
                                <div className="w-3 h-3 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                                  <Check className="w-2 h-2 text-green-500 dark:text-green-400" />
                                </div>
                                <span className="text-foreground">{feature}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl p-4 flex-shrink-0 bg-muted/50 dark:bg-slate-800/60 border border-border/30 dark:border-slate-700/50">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold text-foreground">Total</span>
                          <div className="text-right">
                            <div className="text-xl font-bold text-foreground">
                              {formatPrice(planData.price)}
                            </div>
                            <div className="text-xs text-muted-foreground">per month</div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-2 text-xs rounded-lg p-2 flex-shrink-0 text-muted-foreground bg-muted/30 dark:bg-slate-800/40 border border-border/20 dark:border-slate-700/30">
                    <div className="w-4 h-4 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-green-500 dark:bg-green-400 rounded-full"></div>
                    </div>
                    <span className="text-foreground">256-bit SSL encryption</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="order-1 xl:order-2 flex flex-col">
              <Card className="border-0 shadow-xl backdrop-blur-sm flex-1 flex flex-col bg-card/90 border border-border/50">
                <CardHeader className="pb-3 flex-shrink-0">
                  <CardTitle className="text-xl font-bold text-card-foreground">
                    Payment Information
                  </CardTitle>
                  <CardDescription>
                    Click the button below to securely complete your payment with Stripe
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-center">
                  {planData ? (
                    <div className="space-y-4">
                      <div className="rounded-lg p-6 bg-muted/50 border border-border">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Plan</span>
                            <span className="font-semibold">{planData.name}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Credits</span>
                            <span className="font-semibold">{formatCredits(planData.credits_per_month)}/month</span>
                          </div>
                          <div className="flex justify-between items-center pt-3 border-t">
                            <span className="text-lg font-semibold">Total</span>
                            <span className="text-xl font-bold text-green-600 dark:text-green-400">
                              {formatPrice(planData.price)}/month
                            </span>
                          </div>
                        </div>
                      </div>

                      <Button
                        onClick={handleCheckout}
                        disabled={isCreatingCheckout || !planData}
                        className="w-full h-12 text-base font-semibold"
                        size="lg"
                      >
                        {isCreatingCheckout ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Creating Checkout Session...
                          </>
                        ) : (
                          <>
                            Continue to Stripe Checkout
                          </>
                        )}
                      </Button>

                      <p className="text-xs text-center text-muted-foreground">
                        You will be redirected to Stripe's secure checkout page to complete your payment
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutForm;
