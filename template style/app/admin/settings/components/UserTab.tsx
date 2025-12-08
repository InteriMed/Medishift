'use client';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Shield } from 'lucide-react';

interface UserTabProps {
  settings: any;
  handleInputChange: (field: string, value: string | boolean) => void;
}

export default function UserTab({ settings, handleInputChange }: UserTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 sm:p-6 bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-xl border border-primary/10">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-3 rounded-xl bg-primary/10">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              User Settings
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage user registration and permissions
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-xl border border-primary/10 p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="space-y-0.5">
              <Label
                htmlFor="allowRegistration"
                className="text-base font-medium"
              >
                Allow Registration
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow new users to register
              </p>
            </div>
            <Switch
              id="allowRegistration"
              checked={settings.allowRegistration}
              onCheckedChange={checked =>
                handleInputChange('allowRegistration', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="space-y-0.5">
              <Label
                htmlFor="requireEmailVerification"
                className="text-base font-medium"
              >
                Require Email Verification
              </Label>
              <p className="text-sm text-muted-foreground">
                Users must verify their email before posting
              </p>
            </div>
            <Switch
              id="requireEmailVerification"
              checked={settings.requireEmailVerification}
              onCheckedChange={checked =>
                handleInputChange('requireEmailVerification', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="space-y-0.5">
              <Label htmlFor="allowComments" className="text-base font-medium">
                Allow Comments
              </Label>
              <p className="text-sm text-muted-foreground">
                Enable comments on blog posts
              </p>
            </div>
            <Switch
              id="allowComments"
              checked={settings.allowComments}
              onCheckedChange={checked =>
                handleInputChange('allowComments', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="space-y-0.5">
              <Label
                htmlFor="moderateComments"
                className="text-base font-medium"
              >
                Moderate Comments
              </Label>
              <p className="text-sm text-muted-foreground">
                Comments require approval before publishing
              </p>
            </div>
            <Switch
              id="moderateComments"
              checked={settings.moderateComments}
              onCheckedChange={checked =>
                handleInputChange('moderateComments', checked)
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
