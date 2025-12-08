'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
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
  Settings,
  Palette,
  Monitor,
  Moon,
  Sun,
  Activity,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/ui/use-toast';
import { getBackendUrl } from '@/lib/config';

interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
}

interface ComplianceSettings {
  shareComplianceInsights: boolean;
}

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

export default function SettingsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

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

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      // localStorage removed - backend storage only
      // Apply default theme
      applyTheme('system');

      // Load from backend for initial sync
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.error('No access token found');
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
            // Apply theme from backend settings
            if (appData.settings.theme) {
              applyTheme(appData.settings.theme);
            }
          }
        } else {
          console.warn(
            'App settings endpoint not available:',
            appResponse.status
          );
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
        } else {
          console.warn(
            'Compliance settings endpoint not available:',
            complianceResponse.status
          );
        }
      } catch (error) {
        console.warn('Failed to load compliance settings from backend:', error);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();

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
  }, [settings.theme, loadSettings]);

  const handleSettingChange = (
    field: keyof AppSettings,
    value: string | number | boolean
  ) => {
    const newSettings = {
      ...settings,
      [field]: value,
    };

    setSettings(newSettings);

    // Apply theme changes immediately
    if (field === 'theme') {
      applyTheme(value as 'light' | 'dark' | 'system');
    }

    // Save app settings to database
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
        console.error('No access token found');
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to save app settings');
      }
    } catch (error) {
      console.error('Error saving app settings to database:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to save app settings',
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
        console.error('No access token found');
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to save compliance settings');
      }
    } catch (error) {
      console.error('Error saving compliance settings to database:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to save compliance settings',
        variant: 'destructive',
      });
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

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* SETTINGS TITLE */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 sm:p-6 bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-xl border border-primary/10">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-3 rounded-xl bg-primary/10">
            <Settings className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              Settings
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage your application preferences and compliance settings
            </p>
          </div>
        </div>
      </div>

      {/* ALL SETTINGS IN SINGLE DIV */}
      <div className="space-y-6 flex-1 overflow-auto">
        {/* APPLICATION SETTINGS */}
        <div className="bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-xl border border-primary/10 p-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-blue-500/10">
                <Palette className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Application Settings</h3>
                <p className="text-sm text-muted-foreground">
                  Customize your app experience
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* THEME SETTING */}
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

              {/* LANGUAGE SETTING */}
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

              {/* TIMEZONE SETTING */}
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
          </div>
        </div>

        {/* COMPLIANCE SETTINGS */}
        <div className="bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-xl border border-primary/10 p-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-green-500/10">
                <Activity className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Compliance Settings</h3>
                <p className="text-sm text-muted-foreground">
                  Configure compliance and data sharing preferences
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/10">
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
          </div>
        </div>
      </div>
    </div>
  );
}
