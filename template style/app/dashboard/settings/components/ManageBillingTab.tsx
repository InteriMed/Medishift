'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  CreditCard,
  AlertTriangle,
  Shield,
  XCircle,
  CheckCircle,
  Loader2,
  Crown,
  ArrowRight,
  Sparkles,
  Settings,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/ui/use-toast';
import { getBackendUrl } from '@/lib/config';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SubscriptionDetails {
  tier: string;
  status: string;
  renewsAt: string | null;
  billingCycle: string | null;
  price: number;
  currency: string;
  current_period_start?: number;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
  hours_since_renewal?: number;
  can_cancel?: boolean;
}

export default function ManageBillingTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [subscriptionDetails, setSubscriptionDetails] =
    useState<SubscriptionDetails | null>(null);

  useEffect(() => {
    if (user) {
      loadSubscriptionDetails();
    }
  }, [user, loadSubscriptionDetails]);

  const loadSubscriptionDetails = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const [subscriptionResponse, cancellationCheckResponse] =
        await Promise.all([
          fetch(`${getBackendUrl()}/api/user-management/subscription`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }),
          fetch(
            `${getBackendUrl()}/api/credits/subscription/cancellation-status`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          ).catch(() => null),
        ]);

      let subscriptionData: any = null;
      if (subscriptionResponse.ok) {
        const response = await subscriptionResponse.json();
        if (response.success && response.data?.subscription) {
          subscriptionData = response.data.subscription;
        }
      }

      let cancellationStatus: any = null;
      if (cancellationCheckResponse?.ok) {
        const response = await cancellationCheckResponse.json();
        cancellationStatus = response.data;
      }

      if (subscriptionData) {
        setSubscriptionDetails({
          ...subscriptionData,
          ...cancellationStatus,
        });
      }
    } catch (error) {
      console.error('Error loading subscription details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load subscription details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(
        `${getBackendUrl()}/api/credits/cancel-subscription`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Success',
          description:
            data.message || 'Subscription cancellation scheduled successfully',
        });
        setShowCancelDialog(false);
        await loadSubscriptionDetails();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to cancel subscription');
      }
    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel subscription',
        variant: 'destructive',
      });
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateWithTime = (timestamp: number | undefined) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'cancelled':
      case 'canceled':
        return <Badge variant="secondary">Cancelled</Badge>;
      case 'past_due':
        return <Badge className="bg-red-100 text-red-800">Past Due</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-100 text-blue-800">Trial</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const isFreePlan =
    !subscriptionDetails ||
    subscriptionDetails.tier === 'free' ||
    subscriptionDetails.status === 'free';
  const isCancelled =
    subscriptionDetails?.cancel_at_period_end ||
    subscriptionDetails?.status === 'cancelled';
  const canCancel =
    subscriptionDetails?.can_cancel !== false && !isFreePlan && !isCancelled;
  const hoursSinceRenewal = subscriptionDetails?.hours_since_renewal;
  const hoursRemaining =
    hoursSinceRenewal !== undefined
      ? Math.max(0, 48 - hoursSinceRenewal)
      : null;

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* BILLING TITLE */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 sm:p-6 bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-xl border border-primary/10">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-3 rounded-xl bg-primary/10">
            <CreditCard className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              Manage Billing
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage your subscription, payment methods, and billing preferences
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto space-y-6">
        {isFreePlan ? (
          <div className="space-y-6">
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-primary" />
                  No Active Subscription
                </CardTitle>
                <CardDescription>
                  Subscribe to a plan to unlock premium features and manage your
                  billing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    You are currently on the free plan. Upgrade to a paid plan
                    to access:
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span>Premium features and higher credit limits</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-primary" />
                      <span>Full billing management and invoice access</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      <span>Priority support and account management</span>
                    </li>
                  </ul>
                </div>
                <div className="pt-4 space-y-3">
                  <Button
                    className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                    onClick={() => router.push('/dashboard/settings')}
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    View Subscription Plans
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/dashboard/settings')}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Purchase Credits
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      router.push('/dashboard/settings?tab=subscription')
                    }
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Manage Subscription
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Billing Information
                </CardTitle>
                <CardDescription>
                  View your current billing status and manage your subscription
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Status
                    </span>
                    {getStatusBadge(subscriptionDetails?.status || 'free')}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Plan</span>
                    <span className="text-sm font-medium capitalize">
                      {subscriptionDetails?.tier || 'free'} Plan
                    </span>
                  </div>
                </div>
                <Separator />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    router.push('/dashboard/settings?tab=subscription')
                  }
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Manage Subscription & Credits
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Current Subscription
                </CardTitle>
                <CardDescription>
                  Your active subscription details and billing information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      Plan
                    </div>
                    <div className="font-semibold capitalize text-lg">
                      {subscriptionDetails?.tier || 'N/A'} Plan
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      Status
                    </div>
                    <div>
                      {getStatusBadge(subscriptionDetails?.status || 'active')}
                    </div>
                  </div>
                  {subscriptionDetails?.renewsAt && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">
                        Next Billing Date
                      </div>
                      <div className="font-medium">
                        {formatDate(subscriptionDetails.renewsAt)}
                      </div>
                    </div>
                  )}
                  {subscriptionDetails?.current_period_start && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">
                        Current Period Started
                      </div>
                      <div className="font-medium">
                        {formatDateWithTime(
                          subscriptionDetails.current_period_start
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {isCancelled && (
                  <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                      Your subscription is scheduled to be cancelled at the end
                      of the current billing period.
                      {subscriptionDetails?.current_period_end && (
                        <span className="block mt-1">
                          Access will continue until{' '}
                          {formatDateWithTime(
                            subscriptionDetails.current_period_end
                          )}
                          .
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Subscription Cancellation
                </CardTitle>
                <CardDescription>
                  Cancel your subscription at any time. Access continues until
                  the end of your billing period.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!canCancel && hoursRemaining !== null && hoursRemaining > 0 ? (
                  <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
                    <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <AlertDescription className="text-blue-800 dark:text-blue-200">
                      <div className="font-semibold mb-2">
                        Cancellation Protection Period
                      </div>
                      <p className="mb-2">
                        For security and logistical reasons, subscription
                        cancellations are not allowed within 48 hours after a
                        renewal. This protection period helps prevent accidental
                        cancellations and ensures proper processing of billing
                        cycles.
                      </p>
                      <p className="font-medium">
                        You can cancel your subscription in approximately{' '}
                        {Math.ceil(hoursRemaining)} hours.
                      </p>
                    </AlertDescription>
                  </Alert>
                ) : canCancel ? (
                  <>
                    <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
                      <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      <AlertDescription className="text-orange-800 dark:text-orange-200">
                        <div className="font-semibold mb-2">
                          Important Information
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>
                            Your subscription will remain active until the end
                            of the current billing period
                          </li>
                          <li>
                            You will continue to have access to all features
                            until then
                          </li>
                          <li>
                            No refunds are provided for the current billing
                            period
                          </li>
                          <li>
                            You can reactivate your subscription at any time
                          </li>
                        </ul>
                      </AlertDescription>
                    </Alert>
                    <Button
                      variant="destructive"
                      onClick={() => setShowCancelDialog(true)}
                      disabled={cancelling}
                    >
                      {cancelling ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 mr-2" />
                          Cancel Subscription
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Your subscription has already been cancelled and will end
                      at the conclusion of the current billing period.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Billing Information
                </CardTitle>
                <CardDescription>
                  View your current billing status and manage your subscription
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Status
                    </span>
                    {getStatusBadge(subscriptionDetails?.status || 'active')}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Plan</span>
                    <span className="text-sm font-medium capitalize">
                      {subscriptionDetails?.tier || 'N/A'} Plan
                    </span>
                  </div>
                  {subscriptionDetails?.renewsAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Next Billing Date
                      </span>
                      <span className="text-sm font-medium">
                        {formatDate(subscriptionDetails.renewsAt)}
                      </span>
                    </div>
                  )}
                </div>
                <Separator />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    router.push('/dashboard/settings?tab=subscription')
                  }
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Manage Subscription & Credits
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your subscription? Your
              subscription will remain active until the end of your current
              billing period (
              {subscriptionDetails?.renewsAt
                ? formatDate(subscriptionDetails.renewsAt)
                : 'the end of the period'}
              ), and you will continue to have access to all features until
              then.
              <br />
              <br />
              You can reactivate your subscription at any time before the period
              ends.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>
              Keep Subscription
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Yes, Cancel Subscription'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
