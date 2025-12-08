'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Mail } from 'lucide-react';

interface EmailTabProps {
  settings: any;
  handleInputChange: (field: string, value: string | boolean) => void;
}

export default function EmailTab({
  settings,
  handleInputChange,
}: EmailTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 sm:p-6 bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-xl border border-primary/10">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-3 rounded-xl bg-primary/10">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              Email Settings
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Configure email addresses and notifications
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-xl border border-primary/10 p-4">
        <div className="space-y-4">
          <div>
            <Label htmlFor="adminEmail">Admin Email</Label>
            <Input
              id="adminEmail"
              type="email"
              value={settings.adminEmail}
              onChange={e => handleInputChange('adminEmail', e.target.value)}
              className="mt-1.5 bg-background/50 backdrop-blur-sm border-primary/20"
            />
          </div>

          <div>
            <Label htmlFor="supportEmail">Support Email</Label>
            <Input
              id="supportEmail"
              type="email"
              value={settings.supportEmail}
              onChange={e => handleInputChange('supportEmail', e.target.value)}
              className="mt-1.5 bg-background/50 backdrop-blur-sm border-primary/20"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="space-y-0.5">
              <Label
                htmlFor="emailNotifications"
                className="text-base font-medium"
              >
                Email Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Send email notifications for new posts and comments
              </p>
            </div>
            <Switch
              id="emailNotifications"
              checked={settings.emailNotifications}
              onCheckedChange={checked =>
                handleInputChange('emailNotifications', checked)
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
