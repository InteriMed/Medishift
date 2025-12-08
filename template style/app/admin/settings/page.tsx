'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useToast } from '@/hooks/ui/use-toast';
import {
  Settings,
  Save,
  Globe,
  Mail,
  Shield,
  Database,
  Menu,
} from 'lucide-react';
import GeneralTab from './components/GeneralTab';
import EmailTab from './components/EmailTab';
import UserTab from './components/UserTab';
import SystemTab from './components/SystemTab';

const settingsTabs = [
  {
    id: 'general',
    label: 'General Settings',
    icon: Globe,
    component: GeneralTab,
  },
  { id: 'email', label: 'Email Settings', icon: Mail, component: EmailTab },
  { id: 'user', label: 'User Settings', icon: Shield, component: UserTab },
  {
    id: 'system',
    label: 'System Settings',
    icon: Database,
    component: SystemTab,
  },
];

function AdminSettingsContent() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const activeTab = searchParams.get('tab') || 'general';
  const currentTab = settingsTabs.find(tab => tab.id === activeTab);
  const CurrentComponent = currentTab?.component || GeneralTab;

  const [settings, setSettings] = useState({
    siteName: 'clipizy',
    siteDescription: 'AI-Powered Music Video Creation',
    siteUrl: 'https://clipizy.ai',
    adminEmail: 'admin@clipizy.com',
    supportEmail: 'support@clipizy.com',
    timezone: 'UTC',
    language: 'en',
    allowComments: true,
    moderateComments: true,
    allowRegistration: true,
    requireEmailVerification: true,
    maxFileSize: '10',
    allowedFileTypes: 'mp4,mp3,wav,avi,mov',
    autoPublish: false,
    emailNotifications: true,
    maintenanceMode: false,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', tabId);
    router.push(`/admin/settings?${params.toString()}`);
  };

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && !settingsTabs.find(t => t.id === tab)) {
      router.replace('/admin/settings?tab=general');
    }
  }, [searchParams, router]);

  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/v1/admin/settings', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load settings');
      }

      const data = await response.json();
      if (data.success && data.settings) {
        setSettings(prev => ({
          ...prev,
          ...data.settings,
        }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load settings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/v1/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }

      const data = await response.json();

      if (settings.autoPublish) {
        await triggerAutoPublish();
      }

      toast({
        title: 'Success',
        description: data.message || 'Settings saved successfully',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const triggerAutoPublish = async () => {
    try {
      const response = await fetch('/api/v1/admin/posts/auto-publish', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.published_count > 0) {
          toast({
            title: 'Auto-Publish',
            description: data.message,
          });
        }
      }
    } catch (error) {
      console.error('Error triggering auto-publish:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* DESKTOP SIDEBAR */}
      <div className="hidden lg:block w-64 flex-shrink-0 border-r border-primary/10 bg-gradient-to-r from-primary/5 to-purple-500/5 backdrop-blur-sm relative">
        <div className="absolute inset-0 bg-black/30 pointer-events-none"></div>
        <div className="relative z-10">
          <div className="p-4 border-b border-primary/10">
            <h1 className="text-xl font-bold text-foreground">
              Admin Settings
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage system configuration
            </p>
          </div>
          <nav className="p-4 space-y-1">
            {settingsTabs.map(tab => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? 'default' : 'ghost'}
                  className="w-full justify-start h-10"
                  onClick={() => handleTabChange(tab.id)}
                >
                  <Icon className="w-4 h-4 mr-3" />
                  {tab.label}
                </Button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* MOBILE HEADER */}
        <div className="lg:hidden p-4 border-b border-border flex-shrink-0 bg-background">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Admin Settings
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage system configuration
              </p>
            </div>

            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Menu className="w-4 h-4 mr-2" />
                  Menu
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-80 bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20"
              >
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">Settings</h2>
                  <nav className="space-y-2">
                    {settingsTabs.map(tab => {
                      const Icon = tab.icon;
                      return (
                        <Button
                          key={tab.id}
                          variant={activeTab === tab.id ? 'default' : 'ghost'}
                          className="w-full justify-start"
                          onClick={() => {
                            handleTabChange(tab.id);
                            setIsMobileMenuOpen(false);
                          }}
                        >
                          <Icon className="w-4 h-4 mr-3" />
                          {tab.label}
                        </Button>
                      );
                    })}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="max-w-5xl mx-auto h-full flex flex-col">
            <div className="flex-1">
              <CurrentComponent
                settings={settings}
                handleInputChange={handleInputChange}
              />
            </div>

            {/* SAVE BUTTON */}
            <div className="mt-6 flex justify-end pt-6 border-t border-primary/10">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full sm:w-auto"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <AdminSettingsContent />
    </Suspense>
  );
}
