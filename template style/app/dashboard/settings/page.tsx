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
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Shield,
  Sparkles,
  ArrowRight,
  Check,
  Palette,
  Monitor,
  Moon,
  Sun,
  Activity,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/ui/use-toast';
import { DownloadInvoicesDialog } from './components/DownloadInvoicesDialog';
import { BillingHistoryDialog } from './components/BillingHistoryDialog';
import { TeamManagementDialog } from './components/TeamManagementDialog';
import { getBackendUrl } from '@/lib/config';

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

interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
}

interface ComplianceSettings {
  shareComplianceInsights: boolean;
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

const languages = [{ value: 'en', label: 'English' }];

const timezones = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showInvoicesDialog, setShowInvoicesDialog] = useState(false);
  const [showBillingHistoryDialog, setShowBillingHistoryDialog] = useState(false);
  const [showTeamManagementDialog, setShowTeamManagementDialog] = useState(false);

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

  const [settings, setSettings] = useState<AppSettings>({
    theme: 'system',
    language: 'en',
    timezone: 'UTC',
  });

  const [complianceSettings, setComplianceSettings] = useState<ComplianceSettings>({
    shareComplianceInsights: false,
  });

  const applyTheme = (theme: 'light' | 'dark' | 'system') => {
    const root = document.documentElement;

    if (theme === 'system') {
      root.classList.remove('dark', 'light');
      const systemPrefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;
      if (systemPrefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.add('light');
      }
    } else {
      root.classList.remove('dark', 'light');
      root.classList.add(theme);
    }
  };

  const loadSubscriptionData = useCallback(async () => {
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
        if (
          (response.status === 'success' || response.success) &&
          response.data?.subscription
        ) {
          subscriptionData = response.data.subscription;
        }
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
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      applyTheme('system');

      const token = localStorage.getItem('access_token');
      if (!token) {
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      try {
        const appResponse = await fetch(
          `${getBackendUrl()}/api/user-management/app-settings`,
          { headers }
        );
        if (appResponse.ok) {
          const appData = await appResponse.json();
          if (appData.success && appData.settings) {
            setSettings(appData.settings);
            if (appData.settings.theme) {
              applyTheme(appData.settings.theme);
            }
          }
        }
      } catch (error) {
        console.warn('Failed to load app settings from backend:', error);
      }

      try {
        const complianceResponse = await fetch(
          `${getBackendUrl()}/api/user-management/settings`,
          { headers }
        );
        if (complianceResponse.ok) {
          const complianceData = await complianceResponse.json();
          if (complianceData.success && complianceData.settings) {
            const settings = complianceData.settings;
            const complianceSettings = {
              shareComplianceInsights:
                settings.compliance?.shareComplianceInsights || false,
            };
            setComplianceSettings(complianceSettings);
          }
        }
      } catch (error) {
        console.warn('Failed to load compliance settings from backend:', error);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, []);

  useEffect(() => {
    if (user) {
      Promise.all([loadSubscriptionData(), loadSettings()]).finally(() => {
        setIsLoading(false);
      });
    }
  }, [user, loadSubscriptionData, loadSettings]);

  useEffect(() => {
    const success = searchParams.get('success');
    if (success === 'true') {
      setShowSuccessMessage(true);
      toast({
        title: 'Subscription Successful!',
        description:
          'Your subscription has been activated successfully. Welcome to your new plan!',
      });

      const params = new URLSearchParams(searchParams.toString());
      params.delete('success');
      router.replace(`/dashboard/settings?${params.toString()}`);

      setTimeout(() => {
        loadSubscriptionData();
      }, 2000);
    }
  }, [searchParams, toast, router, loadSubscriptionData]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (settings.theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [settings.theme]);

  const handleSettingChange = (
    field: keyof AppSettings,
    value: string | number | boolean
  ) => {
    const newSettings = {
      ...settings,
      [field]: value,
    };

    setSettings(newSettings);

    if (field === 'theme') {
      applyTheme(value as 'light' | 'dark' | 'system');
    }

    saveAppSettingsToDatabase(newSettings);
  };

  const handleComplianceChange = (
    field: keyof ComplianceSettings,
    value: boolean
  ) => {
    const newComplianceSettings = {
      ...complianceSettings,
      [field]: value,
    };

    setComplianceSettings(newComplianceSettings);
    saveComplianceSettingsToDatabase(newComplianceSettings);
  };

  const saveAppSettingsToDatabase = async (appSettings?: AppSettings) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        return;
      }

      const settingsToSave = appSettings || settings;

      const response = await fetch(
        `${getBackendUrl()}/api/user-management/app-settings`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(settingsToSave),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save app settings');
      }
    } catch (error) {
      console.error('Error saving app settings to database:', error);
      toast({
        title: 'Error',
        description: 'Failed to save app settings',
        variant: 'destructive',
      });
    }
  };

  const saveComplianceSettingsToDatabase = async (
    complianceSettingsToSave?: ComplianceSettings
  ) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        return;
      }

      const settingsToSave = complianceSettingsToSave || complianceSettings;

      const response = await fetch(
        `${getBackendUrl()}/api/user-management/settings`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            compliance: settingsToSave,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save compliance settings');
      }
    } catch (error) {
      console.error('Error saving compliance settings to database:', error);
      toast({
        title: 'Error',
        description: 'Failed to save compliance settings',
        variant: 'destructive',
      });
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your subscription, billing, and preferences.
          </p>
        </div>
      </div>

      {showSuccessMessage && (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Your subscription has been activated successfully! Welcome to your
            new plan.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-8">
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Subscription & Usage</h2>
              <p className="text-sm text-muted-foreground">
                View your current plan and usage statistics.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <Card>
                <CardHeader>
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

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      className="flex-1"
                      onClick={() => (window.location.href = '/pricing')}
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Upgrade Plan
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => (window.location.href = '/dashboard/create')}
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      New Scan
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
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

                  <div className="pt-4 border-t">
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

            <div className="space-y-6">
              <Card>
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

              <Card>
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

              {subscriptionInfo.tier === 'starter' && (
                <Card>
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
                      className="w-full"
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
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Application Settings</h2>
              <p className="text-sm text-muted-foreground">
                Customize your app experience and preferences.
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                <CardTitle>Preferences</CardTitle>
              </div>
              <CardDescription>
                Configure theme, language, and timezone settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Theme</Label>
                  <Select
                    value={settings.theme}
                    onValueChange={(value: string) =>
                      handleSettingChange(
                        'theme',
                        value as 'light' | 'dark' | 'system'
                      )
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        <div className="flex items-center gap-2">
                          <Sun className="w-3 h-3" />
                          Light
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center gap-2">
                          <Moon className="w-3 h-3" />
                          Dark
                        </div>
                      </SelectItem>
                      <SelectItem value="system">
                        <div className="flex items-center gap-2">
                          <Monitor className="w-3 h-3" />
                          System
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Language</Label>
                  <Select
                    value={settings.language}
                    onValueChange={(value: string) =>
                      handleSettingChange('language', value)
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map(lang => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Timezone</Label>
                  <Select
                    value={settings.timezone}
                    onValueChange={(value: string) =>
                      handleSettingChange('timezone', value)
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map(tz => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Compliance Settings</h2>
              <p className="text-sm text-muted-foreground">
                Configure compliance and data sharing preferences.
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                <CardTitle>Data Sharing</CardTitle>
              </div>
              <CardDescription>
                Control how your compliance data is used
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <div className="p-1.5 rounded-md bg-orange-500/10">
                    <Activity className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">
                      Share Compliance Insights
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Allow anonymized compliance data to be used for improving risk assessment models
                    </p>
                  </div>
                </div>
                <Switch
                  checked={complianceSettings.shareComplianceInsights}
                  onCheckedChange={(checked: boolean) =>
                    handleComplianceChange('shareComplianceInsights', checked)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </section>
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
