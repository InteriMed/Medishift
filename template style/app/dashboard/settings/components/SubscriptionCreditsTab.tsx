'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CreditCard,
  Zap,
  Crown,
  Star,
  CheckCircle,
  ExternalLink,
  Calendar,
  Users,
  Settings,
  TrendingUp,
  Clock,
  Shield,
  Sparkles,
  ArrowRight,
  Check,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/ui/use-toast';
import { DownloadInvoicesDialog } from './DownloadInvoicesDialog';
import { BillingHistoryDialog } from './BillingHistoryDialog';
import { TeamManagementDialog } from './TeamManagementDialog';

interface SubscriptionInfo {
  tier: 'starter' | 'pro' | 'enterprise';
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  renewsAt: string | null;
  billingCycle: 'monthly' | 'yearly' | null;
  price: number;
  currency: string;
  scansUsed: number;
  scansTotal: number;
  repositoriesScanned: number;
  lastBillingDate: string | null;
  nextBillingDate: string | null;
}

const subscriptionTiers = {
  starter: {
    name: 'Starter',
    icon: Star,
    color: 'bg-gray-500',
    description: 'Perfect for testing compliance on a single repository',
    scans: 1,
    features: [
      '1 Repository Scan',
      'Basic Risk Analysis',
      'Community Support',
      'Public Repos Only',
      'Traffic Light Risk Assessment',
      'Basic Compliance Report',
    ],
    price: 0,
  },
  pro: {
    name: 'Pro',
    icon: Zap,
    color: 'bg-blue-500',
    description: 'Automated compliance for growing AI teams',
    scans: -1,
    features: [
      'Unlimited Repository Scans',
      'Full Annex IV PDF Reports',
      'GitHub App Integration',
      'CI/CD Blocking Rules',
      'Email Support',
      'Private Repos',
      'Advanced Risk Analysis',
      'Automated Compliance Monitoring',
    ],
    price: 499,
  },
  enterprise: {
    name: 'Enterprise',
    icon: Crown,
    color: 'bg-purple-500',
    description: 'Full governance and security for regulated industries',
    scans: -1,
    features: [
      'Everything in Pro',
      'SSO (SAML/OIDC)',
      'VPC / On-Premise Deployment',
      'Custom SLAs',
      'Dedicated Account Manager',
      'Audit Logs & RBAC',
      'White-label Reports',
      'Custom Compliance Workflows',
    ],
    price: 0,
  },
};

export default function SubscriptionCreditsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo>({
    tier: 'starter',
    status: 'active',
    renewsAt: null,
    billingCycle: null,
    price: 0,
    currency: 'USD',
    scansUsed: 0,
    scansTotal: 1,
    repositoriesScanned: 0,
    lastBillingDate: null,
    nextBillingDate: null,
  });
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showInvoicesDialog, setShowInvoicesDialog] = useState(false);
  const [showBillingHistoryDialog, setShowBillingHistoryDialog] =
    useState(false);
  const [showTeamManagementDialog, setShowTeamManagementDialog] =
    useState(false);

  const loadSubscriptionData = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const subscriptionResponse = await fetch('/api/v1/users/subscription', { headers });

      let subscriptionData: any = null;
      if (subscriptionResponse.ok) {
        const response = await subscriptionResponse.json();
        console.log(
          '📊 Subscription API response:',
          JSON.stringify(response, null, 2)
        );

        if (
          (response.status === 'success' || response.success) &&
          response.data?.subscription
        ) {
          subscriptionData = response.data.subscription;
          console.log(
            '✅ Subscription data extracted:',
            JSON.stringify(subscriptionData, null, 2)
          );
        } else {
          console.warn('⚠️ Invalid subscription response structure:', response);
        }
      } else {
        console.error(
          '❌ Subscription API error:',
          subscriptionResponse.status,
          subscriptionResponse.statusText
        );
        const errorText = await subscriptionResponse.text();
        console.error('❌ Error response body:', errorText);
      }

      if (subscriptionData) {
        const tier = subscriptionData.tier || 'starter';
        const tierScans =
          subscriptionTiers[tier as keyof typeof subscriptionTiers]?.scans || 1;

        const scansUsed = subscriptionData.scansUsed || 0;
        const repositoriesScanned = subscriptionData.repositoriesScanned || 0;

        setSubscriptionInfo({
          tier: tier as 'starter' | 'pro' | 'enterprise',
          status: subscriptionData.status || 'active',
          renewsAt: subscriptionData.renewsAt || null,
          billingCycle: subscriptionData.billingCycle || null,
          price: subscriptionData.price || 0,
          currency: subscriptionData.currency || 'USD',
          scansUsed: scansUsed,
          scansTotal: tierScans,
          repositoriesScanned: repositoriesScanned,
          lastBillingDate: subscriptionData.lastBillingDate || null,
          nextBillingDate:
            subscriptionData.nextBillingDate ||
            subscriptionData.renewsAt ||
            null,
        });
      } else {
        const tier = 'starter';
        const tierScans = subscriptionTiers[tier].scans;

        setSubscriptionInfo({
          tier: 'starter',
          status: 'active',
          renewsAt: null,
          billingCycle: null,
          price: 0,
          currency: 'USD',
          scansUsed: 0,
          scansTotal: tierScans,
          repositoriesScanned: 0,
          lastBillingDate: null,
          nextBillingDate: null,
        });
      }
    } catch (error) {
      console.error('Error loading subscription data:', error);
      toast({
        title: 'Error',
        description:
          'Failed to load subscription information. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user) {
      loadSubscriptionData();
    }
  }, [user, loadSubscriptionData]);

  useEffect(() => {
    const success = searchParams.get('success');
    if (success === 'true') {
      setShowSuccessMessage(true);
      toast({
        title: 'Subscription Successful!',
        description:
          'Your subscription has been activated successfully. Welcome to your new plan!',
      });


      // Clear URL params first
      const params = new URLSearchParams(searchParams.toString());
      params.delete('success');
      router.replace(`/dashboard/settings?${params.toString()}`);

      // Reload subscription data with multiple retries to ensure backend has processed webhook
      const retryLoad = async (attempt = 1, maxAttempts = 5) => {
        console.log(
          `🔄 Attempting to load subscription data (attempt ${attempt}/${maxAttempts})`
        );
        await loadSubscriptionData();

        // Check if plan was updated, if not retry
        setTimeout(async () => {
          const token = localStorage.getItem('access_token');
          if (token && attempt < maxAttempts) {
            try {
              const response = await fetch('/api/v1/users/subscription', {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });

              if (response.ok) {
                const data = await response.json();
                console.log(
                  '📊 Full subscription response:',
                  JSON.stringify(data, null, 2)
                );
                const tier = data.data?.subscription?.tier;
                console.log(`📊 Current subscription tier: ${tier}`);

                if (tier && tier !== 'starter') {
                  // Plan updated successfully, reload one more time to get fresh data
                  console.log('✅ Plan updated successfully, reloading data');
                  await loadSubscriptionData();
                } else if (attempt === 1) {
                  // On first attempt, try to sync from Stripe
                  console.log(
                    '🔄 Attempting to sync subscription from Stripe...'
                  );
                  try {
                    const syncResponse = await fetch(
                      '/api/v1/users/sync-subscription',
                      {
                        method: 'POST',
                        method: 'POST',
                        headers: {
                          Authorization: `Bearer ${token}`,
                          'Content-Type': 'application/json',
                        },
                      }
                    );

                    if (syncResponse.ok) {
                      const syncData = await syncResponse.json();
                      const syncedTier = syncData.data?.subscription?.tier;
                      console.log(`🔄 Synced subscription tier: ${syncedTier}`);

                      if (syncedTier && syncedTier !== 'starter') {
                        console.log(
                          '✅ Subscription synced successfully from Stripe'
                        );
                        await loadSubscriptionData();
                        return; // Exit retry loop
                      }
                    }
                  } catch (syncError) {
                    console.error('❌ Error syncing subscription:', syncError);
                  }

                  // If sync didn't work, continue with retry
                  if (attempt < maxAttempts) {
                    console.log(
                      `⏳ Plan not updated yet, retrying in ${2000 * attempt}ms...`
                    );
                    retryLoad(attempt + 1, maxAttempts);
                  }
                } else if (attempt < maxAttempts) {
                  // Plan not updated yet, retry
                  console.log(
                    `⏳ Plan not updated yet, retrying in ${2000 * attempt}ms...`
                  );
                  retryLoad(attempt + 1, maxAttempts);
                } else {
                  console.warn(
                    '⚠️ Max retries reached, plan may not have been updated yet'
                  );
                  console.warn(
                    '⚠️ Full response data:',
                    JSON.stringify(data, null, 2)
                  );
                }
              } else {
                console.error(
                  `❌ Failed to fetch subscription: ${response.status}`
                );
                if (attempt < maxAttempts) {
                  retryLoad(attempt + 1, maxAttempts);
                }
              }
            } catch (error) {
              console.error('❌ Error checking subscription status:', error);
              if (attempt < maxAttempts) {
                retryLoad(attempt + 1, maxAttempts);
              }
            }
          }
        }, 2000 * attempt); // Exponential backoff
      };

      // Start retry process after initial delay to allow webhook to process
      setTimeout(() => {
        retryLoad();
      }, 2000);
    }
  }, [searchParams, toast, router, loadSubscriptionData]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      case 'past_due':
        return <Badge className="bg-red-100 text-red-800">Past Due</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-100 text-blue-800">Trial</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  const currentTier =
    subscriptionTiers[subscriptionInfo.tier as keyof typeof subscriptionTiers] ||
    subscriptionTiers.starter;
  const TierIcon = currentTier.icon;

  const scansRemaining = subscriptionInfo.scansTotal === -1
    ? -1
    : Math.max(0, subscriptionInfo.scansTotal - subscriptionInfo.scansUsed);
  const scansPercentage =
    subscriptionInfo.scansTotal > 0
      ? Math.min(
        100,
        Math.max(
          0,
          (subscriptionInfo.scansUsed / subscriptionInfo.scansTotal) * 100
        )
      )
      : subscriptionInfo.scansTotal === -1 ? 0 : 100;

  return (
    <div className="space-y-6 h-full flex flex-col">
      {showSuccessMessage && (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Your subscription has been activated successfully! Welcome to your
            new plan.
          </AlertDescription>
        </Alert>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 sm:p-6 bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-xl border border-primary/10">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-3 rounded-xl bg-primary/10">
            <CreditCard className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              Subscription & Usage
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage your subscription, billing, and repository scans
            </p>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 flex-1">
        {/* LEFT COLUMN - SUBSCRIPTION INFO */}
        <div className="xl:col-span-2 space-y-4 sm:space-y-6">
          {/* CURRENT PLAN CARD */}
          <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/10">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${currentTier.color}`}
                  >
                    <TierIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg sm:text-xl">
                      {currentTier.name} Plan
                    </CardTitle>
                    <CardDescription className="text-sm sm:text-base">
                      {currentTier.description}
                    </CardDescription>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  {getStatusBadge(subscriptionInfo.status)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* PLAN FEATURES */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Plan Features
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentTier.features.map(
                    (feature: string, index: number) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="break-words">{feature}</span>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  className="flex-1 h-11 sm:h-12 text-sm sm:text-base font-medium bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white"
                  onClick={() => (window.location.href = '/pricing')}
                >
                  <Crown className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Upgrade Plan
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-11 sm:h-12 text-sm sm:text-base font-medium border-primary/20 hover:bg-primary/5"
                  onClick={() => (window.location.href = '/dashboard/create')}
                >
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  New Scan
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* USAGE STATISTICS */}
          <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Usage Statistics
              </CardTitle>
              <CardDescription>
                Track your repository scans and usage statistics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* SCANS USAGE */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Repository Scans</span>
                  <span className="text-sm text-muted-foreground">
                    {subscriptionInfo.scansTotal === -1
                      ? 'Unlimited'
                      : `${subscriptionInfo.scansUsed} / ${subscriptionInfo.scansTotal} (Monthly Allocation)`}
                  </span>
                </div>
                {subscriptionInfo.scansTotal > 0 && (
                  <>
                    <Progress value={scansPercentage} className="h-3" />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>
                        {Math.round(scansPercentage)}% of monthly allocation used
                      </span>
                      <span>{scansRemaining} scans remaining</span>
                    </div>
                  </>
                )}
              </div>

              {/* REPOSITORIES SCANNED */}
              <div className="pt-4 border-t border-primary/10">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Repositories Scanned
                  </span>
                  <span className="text-2xl font-bold text-primary">
                    {subscriptionInfo.repositoriesScanned}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN - BILLING & QUICK ACTIONS */}
        <div className="space-y-4 sm:space-y-6">
          {/* BILLING INFORMATION */}
          <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Billing Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  {getStatusBadge(subscriptionInfo.status)}
                </div>
                {subscriptionInfo.nextBillingDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Next Billing
                    </span>
                    <span className="text-sm font-medium">
                      {formatDate(subscriptionInfo.nextBillingDate)}
                    </span>
                  </div>
                )}
                {subscriptionInfo.lastBillingDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Last Billing
                    </span>
                    <span className="text-sm font-medium">
                      {formatDate(subscriptionInfo.lastBillingDate)}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* QUICK ACTIONS */}
          <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                size="sm"
                onClick={() => setShowInvoicesDialog(true)}
              >
                <Shield className="w-4 h-4 mr-2" />
                Download Invoices
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                size="sm"
                onClick={() => setShowBillingHistoryDialog(true)}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Billing History
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                size="sm"
                onClick={() => setShowTeamManagementDialog(true)}
              >
                <Users className="w-4 h-4 mr-2" />
                Team Management
              </Button>
            </CardContent>
          </Card>

          {/* UPGRADE SUGGESTION */}
          {subscriptionInfo.tier === 'starter' && (
            <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  Ready to Upgrade?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Unlock unlimited scans, private repos, CI/CD integration, and priority support.
                </p>
                <Button
                  className="w-full h-10 sm:h-11 text-sm sm:text-base bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                  onClick={() => (window.location.href = '/pricing')}
                >
                  View Plans
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <DownloadInvoicesDialog
        open={showInvoicesDialog}
        onOpenChange={setShowInvoicesDialog}
      />
      <BillingHistoryDialog
        open={showBillingHistoryDialog}
        onOpenChange={setShowBillingHistoryDialog}
      />
      <TeamManagementDialog
        open={showTeamManagementDialog}
        onOpenChange={setShowTeamManagementDialog}
      />
    </div>
  );
}
