'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe } from 'lucide-react';

interface GeneralTabProps {
  settings: any;
  handleInputChange: (field: string, value: string | boolean) => void;
}

export default function GeneralTab({
  settings,
  handleInputChange,
}: GeneralTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 sm:p-6 bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-xl border border-primary/10">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-3 rounded-xl bg-primary/10">
            <Globe className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              General Settings
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Configure basic site information
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-xl border border-primary/10 p-4">
        <div className="space-y-4">
          <div>
            <Label htmlFor="siteName">Site Name</Label>
            <Input
              id="siteName"
              value={settings.siteName}
              onChange={e => handleInputChange('siteName', e.target.value)}
              className="mt-1.5 bg-background/50 backdrop-blur-sm border-primary/20"
            />
          </div>

          <div>
            <Label htmlFor="siteDescription">Site Description</Label>
            <Textarea
              id="siteDescription"
              value={settings.siteDescription}
              onChange={e =>
                handleInputChange('siteDescription', e.target.value)
              }
              rows={3}
              className="mt-1.5 resize-none bg-background/50 backdrop-blur-sm border-primary/20"
            />
          </div>

          <div>
            <Label htmlFor="siteUrl">Site URL</Label>
            <Input
              id="siteUrl"
              value={settings.siteUrl}
              onChange={e => handleInputChange('siteUrl', e.target.value)}
              className="mt-1.5 bg-background/50 backdrop-blur-sm border-primary/20"
            />
          </div>

          <div>
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              value={settings.timezone}
              onValueChange={value => handleInputChange('timezone', value)}
            >
              <SelectTrigger className="mt-1.5 bg-background/50 backdrop-blur-sm border-primary/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="America/New_York">Eastern Time</SelectItem>
                <SelectItem value="America/Chicago">Central Time</SelectItem>
                <SelectItem value="America/Denver">Mountain Time</SelectItem>
                <SelectItem value="America/Los_Angeles">
                  Pacific Time
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="language">Default Language</Label>
            <Select
              value={settings.language}
              onValueChange={value => handleInputChange('language', value)}
            >
              <SelectTrigger className="mt-1.5 bg-background/50 backdrop-blur-sm border-primary/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
