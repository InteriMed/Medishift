'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { User, Bell, Upload, Mail, Smartphone } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/ui/use-toast';

// Helper function to convert avatar URL to display URL
const getAvatarDisplayUrl = (avatarUrl: string): string => {
  if (!avatarUrl) return '';

  // If it's already a full URL, return as is
  if (avatarUrl.startsWith('http')) {
    return avatarUrl;
  }

  // If it's a relative path starting with /api/auth/avatar/, return as is (Next.js will proxy)
  if (avatarUrl.startsWith('/api/auth/avatar/')) {
    return avatarUrl;
  }

  // If it's a relative path starting with /users/, convert to API path
  if (avatarUrl.startsWith('/users/')) {
    return `/api/auth/avatar${avatarUrl.replace('/users/', '/')}`;
  }

  // For other cases, return as is
  return avatarUrl;
};

interface ProfileSettings {
  name: string;
  email: string;
  bio: string;
  avatar: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
}

export default function ProfileNotificationsTab() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [profileSettings, setProfileSettings] = useState<ProfileSettings>({
    name: user?.name || '',
    email: user?.email || '',
    bio: '',
    avatar: user?.avatar || '',
  });

  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>({
      emailNotifications: true,
      pushNotifications: false,
      marketingEmails: false,
    });

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const profileSettingsRef = useRef(profileSettings);
  const notificationSettingsRef = useRef(notificationSettings);

  useEffect(() => {
    profileSettingsRef.current = profileSettings;
  }, [profileSettings]);

  useEffect(() => {
    notificationSettingsRef.current = notificationSettings;
  }, [notificationSettings]);

  const loadSettings = useCallback(async () => {
    try {
      // localStorage removed - backend storage only

      // Load from backend for initial sync
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.error('No access token found');
        return;
      }

      const response = await fetch('/api/v1/users/settings', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.settings) {
          const settings = data.settings;
          const profileSettings = {
            name: settings.profile?.name || user?.name || '',
            email: settings.profile?.email || user?.email || '',
            bio: settings.profile?.bio || '',
            avatar: settings.profile?.avatar || user?.avatar || '',
          };
          const notificationSettings = {
            emailNotifications:
              settings.notifications?.emailNotifications || true,
            pushNotifications:
              settings.notifications?.pushNotifications || false,
            marketingEmails: settings.notifications?.marketingEmails || false,
          };

          setProfileSettings(profileSettings);
          setNotificationSettings(notificationSettings);
          // localStorage removed - backend storage only
        }
      } else {
        console.warn(
          'Settings endpoint not available, using local storage only:',
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, [user]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleProfileChange = (
    field: keyof ProfileSettings,
    value: string | boolean
  ) => {
    const newProfileSettings = {
      ...profileSettings,
      [field]: value,
    };

    setProfileSettings(newProfileSettings);
    debouncedSaveToDatabase();
  };

  const handleNotificationChange = (
    field: keyof NotificationSettings,
    value: boolean
  ) => {
    const newNotificationSettings = {
      ...notificationSettings,
      [field]: value,
    };

    setNotificationSettings(newNotificationSettings);
    debouncedSaveToDatabase();
  };

  const saveToDatabase = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.warn('No access token found, skipping save');
        return;
      }

      const settingsData = {
        profile: profileSettingsRef.current,
        notifications: notificationSettingsRef.current,
      };

      const response = await fetch('/api/v1/users/settings', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message ||
          errorData.detail ||
          `Failed to save settings (${response.status})`;
        console.error('Failed to save settings:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
        });
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
        return;
      }

      const data = await response.json();
      if (data.success !== false) {
        console.log('Settings saved successfully');
      }
    } catch (error) {
      console.error('Error saving settings to database:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to save settings';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [toast]);

  const debouncedSaveToDatabase = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveToDatabase();
    }, 500);
  }, [saveToDatabase]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a JPG, PNG, or GIF image',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (2MB limit)
    const maxSize = 2 * 1024 * 1024; // 2MB in bytes
    if (file.size > maxSize) {
      toast({
        title: 'File Too Large',
        description: 'Please upload an image smaller than 2MB',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('avatar', file);

      const token = localStorage.getItem('access_token');
      if (!token) {
        toast({
          title: 'Authentication Error',
          description: 'Please log in again',
          variant: 'destructive',
        });
        return;
      }

      // Upload the file
      const response = await fetch('/api/v1/users/upload-avatar', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.avatar_url) {
          // Update the profile settings with the new avatar URL
          const newProfileSettings = {
            ...profileSettings,
            avatar: data.avatar_url,
          };
          setProfileSettings(newProfileSettings);

          // Also update the user context if available
          if (user) {
            user.avatar = data.avatar_url;
          }

          // Save to database
          await saveToDatabase();

          toast({
            title: 'Success',
            description: 'Profile picture updated successfully',
          });
        } else {
          throw new Error(data.message || 'Failed to upload avatar');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload avatar');
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast({
        title: 'Upload Failed',
        description:
          error instanceof Error ? error.message : 'Failed to upload avatar',
        variant: 'destructive',
      });
    }

    // Reset the input value so the same file can be selected again
    event.target.value = '';
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* PROFILE TITLE */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 sm:p-6 bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-xl border border-primary/10">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-3 rounded-xl bg-primary/10">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              Profile & Notifications
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage your personal information and notification preferences
            </p>
          </div>
        </div>
      </div>

      {/* ALL SETTINGS IN SINGLE DIV */}
      <div className="space-y-5 flex-1 overflow-auto">
        {/* AVATAR SECTION */}
        <div className="bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-xl border border-primary/10 p-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Avatar className="w-14 h-14 border border-primary/10">
                <AvatarImage
                  src={getAvatarDisplayUrl(profileSettings.avatar)}
                  alt={profileSettings.name}
                />
                <AvatarFallback className="text-sm font-semibold">
                  {profileSettings.name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 p-0.5 bg-primary rounded-full">
                <Upload className="w-2.5 h-2.5 text-primary-foreground" />
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <h3 className="text-base font-medium">Profile Picture</h3>
                <p className="text-sm text-muted-foreground">
                  Upload a new avatar to personalize your profile
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild className="h-8">
                  <label htmlFor="avatar-upload" className="cursor-pointer">
                    <Upload className="w-3 h-3 mr-1" />
                    Change Avatar
                  </label>
                </Button>
                <p className="text-sm text-muted-foreground">
                  JPG, PNG or GIF. Max size 2MB.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* HIDDEN FILE INPUT */}
        <input
          id="avatar-upload"
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif"
          onChange={handleAvatarUpload}
          className="hidden"
        />

        {/* PROFILE FIELDS */}
        <div className="bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-xl border border-primary/10 p-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-blue-500/10">
                <User className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold">
                  Personal Information
                </h3>
                <p className="text-sm text-muted-foreground">
                  Update your profile details
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-medium">
                  Display Name
                </Label>
                <Input
                  id="name"
                  value={profileSettings.name}
                  onChange={e => handleProfileChange('name', e.target.value)}
                  placeholder="Enter your display name"
                  className="h-9 bg-background/50 backdrop-blur-sm border-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={profileSettings.email}
                  onChange={e => handleProfileChange('email', e.target.value)}
                  placeholder="Enter your email"
                  className="h-9 bg-background/50 backdrop-blur-sm border-primary/20"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio" className="text-sm font-medium">
                Bio
              </Label>
              <Textarea
                id="bio"
                value={profileSettings.bio}
                onChange={e => handleProfileChange('bio', e.target.value)}
                placeholder="Tell us about yourself"
                rows={3}
                className="resize-none bg-background/50 backdrop-blur-sm border-primary/20"
              />
            </div>
          </div>
        </div>

        {/* NOTIFICATION SETTINGS */}
        <div className="bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-xl border border-primary/10 p-4 flex-1 flex flex-col">
          <div className="space-y-4 flex-1 flex flex-col">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-blue-500/10">
                <Bell className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold">
                  Notification Preferences
                </h3>
                <p className="text-sm text-muted-foreground">
                  Choose how you want to be notified about updates and
                  activities
                </p>
              </div>
            </div>

            <div className="space-y-3 flex-1">
              <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/10">
                <div className="flex items-center space-x-3">
                  <div className="p-1.5 rounded-md bg-green-500/10">
                    <Mail className="w-4 h-4 text-green-500" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">
                      Email Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notificationSettings.emailNotifications}
                  onCheckedChange={checked =>
                    handleNotificationChange('emailNotifications', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/10">
                <div className="flex items-center space-x-3">
                  <div className="p-1.5 rounded-md bg-purple-500/10">
                    <Smartphone className="w-4 h-4 text-purple-500" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">
                      Push Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive push notifications in your browser
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notificationSettings.pushNotifications}
                  onCheckedChange={checked =>
                    handleNotificationChange('pushNotifications', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/10">
                <div className="flex items-center space-x-3">
                  <div className="p-1.5 rounded-md bg-orange-500/10">
                    <Mail className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">
                      Marketing Emails
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive promotional content and updates
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notificationSettings.marketingEmails}
                  onCheckedChange={checked =>
                    handleNotificationChange('marketingEmails', checked)
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
