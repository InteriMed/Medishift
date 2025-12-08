'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/ui/use-toast';
import {
  Users,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  Settings,
  Zap,
  Crown,
  Building2,
  Sparkles,
  Lock,
} from 'lucide-react';

interface StripeCustomer {
  id: string;
  email: string;
  name?: string;
  created: number;
  subscriptions?: {
    data: Array<{
      id: string;
      status: string;
      current_period_end: number;
    }>;
  };
}

interface FeatureFlags {
  automation: boolean;
  team_management: boolean;
  voice_cloning: boolean;
  advanced_analytics: boolean;
  api_access: boolean;
  white_label: boolean;
}

interface SubscriptionPlan {
  name: string;
  available: boolean;
  coming_soon: boolean;
}

interface SubscriptionPlans {
  creator: SubscriptionPlan;
  pro: SubscriptionPlan;
  business: SubscriptionPlan;
}

const featureLabels: Record<
  keyof FeatureFlags,
  {
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  automation: {
    label: 'Automation',
    description: 'Enable video automation features',
    icon: Zap,
  },
  team_management: {
    label: 'Team Management',
    description: 'Enable team collaboration features',
    icon: Users,
  },
  voice_cloning: {
    label: 'Voice Cloning',
    description: 'Enable voice cloning capabilities',
    icon: Sparkles,
  },
  advanced_analytics: {
    label: 'Advanced Analytics',
    description: 'Enable advanced analytics and reporting',
    icon: TrendingUp,
  },
  api_access: {
    label: 'API Access',
    description: 'Enable API access for integrations',
    icon: Settings,
  },
  white_label: {
    label: 'White Label',
    description: 'Enable white label customization',
    icon: Crown,
  },
};

export default function OverviewPage() {
  const [customers, setCustomers] = useState<StripeCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [features, setFeatures] = useState<FeatureFlags>({
    automation: false,
    team_management: false,
    voice_cloning: false,
    advanced_analytics: false,
    api_access: false,
    white_label: false,
  });
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlans>(
    {
      creator: { name: 'Creator Plan', available: true, coming_soon: false },
      pro: { name: 'Pro Plan', available: false, coming_soon: true },
      business: { name: 'Business Plan', available: false, coming_soon: true },
    }
  );
  const [updatingFeature, setUpdatingFeature] = useState<string | null>(null);
  const [updatingPlan, setUpdatingPlan] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchStripeData = useCallback(async () => {
    setLoading(true);
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('access_token')
          : null;
      const response = await fetch('/api/admin/stripe/customers', {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        let errorText = '';
        let errorData = null;

        try {
          errorText = await response.text();
          try {
            errorData = JSON.parse(errorText);
          } catch {
            // If not JSON, use the text as is
          }
        } catch (e) {
          errorText = `HTTP ${response.status}: ${response.statusText || 'Unknown error'}`;
        }

        let errorMessage = 'Failed to fetch customers';

        if (errorData) {
          if (typeof errorData === 'string') {
            errorMessage = errorData;
          } else if (typeof errorData === 'object') {
            errorMessage =
              errorData.error ||
              errorData.detail ||
              errorData.message ||
              JSON.stringify(errorData);
          }
        } else if (errorText && errorText !== '[object Object]') {
          errorMessage = errorText;
        }

        if (typeof errorMessage === 'object') {
          errorMessage = JSON.stringify(errorMessage);
        }

        errorMessage = String(errorMessage);

        if (
          errorMessage.includes('Stripe API key') ||
          errorMessage.includes('STRIPE_SECRET_KEY')
        ) {
          console.warn(
            'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.'
          );
          setCustomers([]);
          toast({
            title: 'Stripe Not Configured',
            description:
              'Stripe integration is not available. Please configure STRIPE_SECRET_KEY to enable Stripe features.',
            variant: 'default',
          });
          return;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      setCustomers(data.data || []);

      toast({
        title: 'Data Loaded',
        description: 'Stripe customers loaded successfully',
      });
    } catch (error) {
      console.error('Error fetching Stripe data:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch Stripe data';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchFeatureFlags = async () => {
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('access_token')
          : null;
      const response = await fetch('/api/admin/features', {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch feature flags');
      const data = await response.json();
      if (data.success && data.features) {
        setFeatures(data.features);
      }
    } catch (error) {
      console.error('Error fetching feature flags:', error);
    }
  };

  const fetchSubscriptionPlans = async () => {
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('access_token')
          : null;
      const response = await fetch('/api/admin/subscription-plans', {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch subscription plans');
      const data = await response.json();
      if (data.success && data.plans) {
        setSubscriptionPlans(data.plans);
      }
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
    }
  };

  const updateFeatureFlag = async (
    featureName: keyof FeatureFlags,
    enabled: boolean
  ) => {
    setUpdatingFeature(featureName);
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('access_token')
          : null;
      const response = await fetch('/api/admin/features', {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feature_name: featureName,
          enabled: enabled,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update feature flag');
      }

      const data = await response.json();
      if (data.success) {
        setFeatures(prev => ({ ...prev, [featureName]: enabled }));
        toast({
          title: 'Feature Updated',
          description:
            data.message ||
            `Feature ${featureName} ${enabled ? 'enabled' : 'disabled'}`,
        });
      }
    } catch (error) {
      console.error('Error updating feature flag:', error);
      toast({
        title: 'Error',
        description: 'Failed to update feature flag',
        variant: 'destructive',
      });
    } finally {
      setUpdatingFeature(null);
    }
  };

  const updateSubscriptionPlan = async (
    planName: string,
    available: boolean
  ) => {
    if (planName === 'creator') {
      toast({
        title: 'Error',
        description: 'Creator plan cannot be disabled',
        variant: 'destructive',
      });
      return;
    }

    setUpdatingPlan(planName);
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('access_token')
          : null;
      const response = await fetch('/api/admin/subscription-plans', {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan_name: planName,
          available: available,
          coming_soon: !available,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update subscription plan');
      }

      const data = await response.json();
      if (data.success) {
        setSubscriptionPlans(prev => ({
          ...prev,
          [planName]: {
            ...prev[planName as keyof SubscriptionPlans],
            available: available,
            coming_soon: !available,
          },
        }));
        toast({
          title: 'Plan Updated',
          description:
            data.message ||
            `Plan ${planName} ${available ? 'enabled' : 'marked as coming soon'}`,
        });
      }
    } catch (error) {
      console.error('Error updating subscription plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to update subscription plan',
        variant: 'destructive',
      });
    } finally {
      setUpdatingPlan(null);
    }
  };

  useEffect(() => {
    fetchStripeData();
    fetchFeatureFlags();
    fetchSubscriptionPlans();
  }, [fetchStripeData]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6 bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-xl border border-primary/10">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-3 rounded-xl bg-primary/10">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              Admin Overview
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage features, subscriptions, and monitor system data
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            fetchStripeData();
            fetchFeatureFlags();
            fetchSubscriptionPlans();
          }}
          disabled={loading}
          className="w-full sm:w-auto"
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
          />
          Refresh All
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
            <p className="text-xs text-muted-foreground">Total customers</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Feature Flags
            </CardTitle>
            <CardDescription>
              Enable or disable features (Coming Soon)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(Object.keys(features) as Array<keyof FeatureFlags>).map(
              featureName => {
                const featureInfo = featureLabels[featureName];
                const Icon = featureInfo.icon;
                const isUpdating = updatingFeature === featureName;

                return (
                  <div
                    key={featureName}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <Label
                          htmlFor={featureName}
                          className="font-medium cursor-pointer"
                        >
                          {featureInfo.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {featureInfo.description}
                        </p>
                      </div>
                    </div>
                    <Switch
                      id={featureName}
                      checked={features[featureName]}
                      onCheckedChange={checked =>
                        updateFeatureFlag(featureName, checked)
                      }
                      disabled={isUpdating}
                    />
                  </div>
                );
              }
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5" />
              Subscription Plans
            </CardTitle>
            <CardDescription>
              Manage subscription plan availability
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(subscriptionPlans).map(([planKey, plan]) => {
              const isUpdating = updatingPlan === planKey;
              const isCreator = planKey === 'creator';

              let Icon = Crown;
              if (planKey === 'pro') Icon = Zap;
              if (planKey === 'business') Icon = Building2;

              return (
                <div
                  key={planKey}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className={`p-2 rounded-lg ${isCreator ? 'bg-blue-500/10' : plan.available ? 'bg-green-500/10' : 'bg-gray-500/10'}`}
                    >
                      <Icon
                        className={`w-4 h-4 ${isCreator ? 'text-blue-500' : plan.available ? 'text-green-500' : 'text-gray-500'}`}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor={planKey}
                          className="font-medium cursor-pointer"
                        >
                          {plan.name}
                        </Label>
                        {plan.coming_soon && (
                          <Badge variant="secondary" className="text-xs">
                            Coming Soon
                          </Badge>
                        )}
                        {isCreator && (
                          <Badge variant="outline" className="text-xs">
                            <Lock className="w-3 h-3 mr-1" />
                            Always Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {plan.available
                          ? 'Available for subscription'
                          : 'Coming soon'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    id={planKey}
                    checked={plan.available}
                    onCheckedChange={checked =>
                      updateSubscriptionPlan(planKey, checked)
                    }
                    disabled={isUpdating || isCreator}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common admin tasks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="justify-start">
              <ExternalLink className="w-4 h-4 mr-2" />
              View Stripe Dashboard
            </Button>
            <Button variant="outline" className="justify-start">
              <TrendingUp className="w-4 h-4 mr-2" />
              View Analytics
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
