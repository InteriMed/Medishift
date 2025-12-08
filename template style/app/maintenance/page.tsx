"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, RefreshCw, Clock, Wrench } from 'lucide-react';

interface MaintenanceSettings {
  maintenance_mode: boolean;
  maintenance_message: string;
  maintenance_title: string;
  estimated_downtime: string;
}

export default function MaintenancePage() {
  const [settings, setSettings] = useState<MaintenanceSettings>({
    maintenance_mode: true,
    maintenance_message: "We're performing scheduled maintenance to improve your experience. We'll be back shortly.",
    maintenance_title: "We'll be right back!",
    estimated_downtime: ""
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMaintenanceSettings();
  }, []);

  const loadMaintenanceSettings = async () => {
    try {
      const response = await fetch('/api/v1/admin/maintenance/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSettings({
            maintenance_mode: data.maintenance_mode || true,
            maintenance_message: data.maintenance_message || "We're performing scheduled maintenance to improve your experience. We'll be back shortly.",
            maintenance_title: data.maintenance_title || "We'll be right back!",
            estimated_downtime: data.estimated_downtime || ""
          });
        }
      }
    } catch (error) {
      console.error('Error loading maintenance settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <Card className="w-full max-w-2xl shadow-2xl border-2">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="flex justify-center">
            <div className="relative">
              <Shield className="w-24 h-24 text-orange-500 animate-pulse" />
              <Wrench className="w-10 h-10 text-primary absolute bottom-0 right-0 animate-bounce" />
            </div>
          </div>
          <CardTitle className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-orange-700 bg-clip-text text-transparent">
            {settings.maintenance_title}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6 text-center">
          <div className="bg-muted/50 rounded-lg p-6 space-y-4">
            <div className="flex items-start gap-3 text-left">
              <div className="flex-shrink-0 mt-1">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              </div>
              <p className="text-lg text-foreground leading-relaxed">
                {settings.maintenance_message}
              </p>
            </div>

            {settings.estimated_downtime && (
              <div className="flex items-center justify-center gap-2 pt-4 border-t border-border/50">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Estimated downtime: <span className="font-medium text-foreground">{settings.estimated_downtime}</span>
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleRefresh}
              size="lg"
              className="w-full sm:w-auto"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Page
            </Button>

            <p className="text-xs text-muted-foreground">
              The page will automatically refresh when maintenance is complete
            </p>
          </div>

          <div className="pt-6 border-t border-border/50">
            <p className="text-sm text-muted-foreground">
              Need urgent assistance?{' '}
              <a 
                href="mailto:support@clipizy.com" 
                className="text-primary hover:underline font-medium"
              >
                Contact Support
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            setInterval(function() {
              fetch('/api/v1/admin/maintenance/settings')
                .then(res => res.json())
                .then(data => {
                  if (data.success && !data.maintenance_mode) {
                    window.location.reload();
                  }
                })
                .catch(err => console.log('Check failed:', err));
            }, 30000);
          `
        }}
      />
    </div>
  );
}







