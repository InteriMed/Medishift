'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Database } from 'lucide-react';

interface SystemTabProps {
  settings: any;
  handleInputChange: (field: string, value: string | boolean) => void;
}

export default function SystemTab({
  settings,
  handleInputChange,
}: SystemTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 sm:p-6 bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-xl border border-primary/10">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-3 rounded-xl bg-primary/10">
            <Database className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              System Settings
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Configure system parameters and maintenance
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-xl border border-primary/10 p-4">
        <div className="space-y-4">
          <div>
            <Label htmlFor="maxFileSize">Max File Size (MB)</Label>
            <Input
              id="maxFileSize"
              type="number"
              value={settings.maxFileSize}
              onChange={e => handleInputChange('maxFileSize', e.target.value)}
              className="mt-1.5 bg-background/50 backdrop-blur-sm border-primary/20"
            />
          </div>

          <div>
            <Label htmlFor="allowedFileTypes">Allowed File Types</Label>
            <Input
              id="allowedFileTypes"
              value={settings.allowedFileTypes}
              onChange={e =>
                handleInputChange('allowedFileTypes', e.target.value)
              }
              placeholder="mp4,mp3,wav,avi,mov"
              className="mt-1.5 bg-background/50 backdrop-blur-sm border-primary/20"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="space-y-0.5">
              <Label htmlFor="autoPublish" className="text-base font-medium">
                Auto Publish Scheduled Posts
              </Label>
              <p className="text-sm text-muted-foreground">
                Automatically publish posts at their scheduled time
              </p>
            </div>
            <Switch
              id="autoPublish"
              checked={settings.autoPublish}
              onCheckedChange={checked =>
                handleInputChange('autoPublish', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="space-y-0.5">
              <Label
                htmlFor="maintenanceMode"
                className="text-base font-medium"
              >
                Maintenance Mode
              </Label>
              <p className="text-sm text-muted-foreground">
                Put the site in maintenance mode
              </p>
            </div>
            <Switch
              id="maintenanceMode"
              checked={settings.maintenanceMode}
              onCheckedChange={checked =>
                handleInputChange('maintenanceMode', checked)
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
