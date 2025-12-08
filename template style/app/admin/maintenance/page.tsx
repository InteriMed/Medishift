'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/ui/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Wrench,
  CheckCircle,
  AlertCircle,
  Clock,
  HardDrive,
  Server,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Backup {
  id: string;
  filename: string;
  s3_key: string;
  s3_version_id?: string;
  size_bytes: number;
  size_mb: number;
  status: string;
  error_message?: string;
  created_at: string;
  expires_at?: string;
  created_by_user_id?: string;
}

interface SystemVersion {
  version: string;
  python_version: string;
}

export default function MaintenancePage() {
  const { toast } = useToast();
  const [backups, setBackups] = useState<Backup[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [systemVersion, setSystemVersion] = useState<SystemVersion | null>(
    null
  );
  const [isLoadingVersion, setIsLoadingVersion] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isVacuuming, setIsVacuuming] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [restoreBackupId, setRestoreBackupId] = useState<string | null>(null);
  const [deleteBackupId, setDeleteBackupId] = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [maintenanceTitle, setMaintenanceTitle] = useState('');
  const [estimatedDowntime, setEstimatedDowntime] = useState('');
  const [isLoadingMaintenance, setIsLoadingMaintenance] = useState(false);
  const [isSavingMaintenance, setIsSavingMaintenance] = useState(false);

  const loadBackups = useCallback(async () => {
    setIsLoadingBackups(true);
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('access_token')
          : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
        `/api/v1/admin/backup/list?include_deleted=${showDeleted}`,
        {
          headers,
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load backups');
      }

      const data = await response.json();
      if (data.success) {
        setBackups(data.backups || []);
      }
    } catch (error) {
      console.error('Error loading backups:', error);
      toast({
        title: 'Error',
        description: 'Failed to load backups',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingBackups(false);
    }
  }, [showDeleted, toast]);

  const loadSystemVersion = async () => {
    setIsLoadingVersion(true);
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('access_token')
          : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/v1/admin/update/version', {
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load system version');
      }

      const data = await response.json();
      if (data.success) {
        setSystemVersion({
          version: data.version,
          python_version: data.python_version,
        });
      }
    } catch (error) {
      console.error('Error loading system version:', error);
    } finally {
      setIsLoadingVersion(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('access_token')
          : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/v1/admin/backup/create', {
        method: 'POST',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create backup');
      }

      const data = await response.json();

      toast({
        title: 'Success',
        description: data.message || 'Backup created successfully',
      });

      await loadBackups();
    } catch (error) {
      console.error('Error creating backup:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to create backup',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async (backupId: string) => {
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('access_token')
          : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/v1/admin/backup/restore', {
        method: 'POST',
        headers,
        body: JSON.stringify({ backup_id: backupId }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to restore backup');
      }

      const data = await response.json();

      toast({
        title: 'Success',
        description: data.message || 'Backup restored successfully',
      });

      setRestoreBackupId(null);
      await loadBackups();
    } catch (error) {
      console.error('Error restoring backup:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to restore backup',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteBackup = async (
    backupId: string,
    hardDelete: boolean = false
  ) => {
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('access_token')
          : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
        `/api/v1/admin/backup/${backupId}?hard_delete=${hardDelete}`,
        {
          method: 'DELETE',
          headers,
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete backup');
      }

      const data = await response.json();

      toast({
        title: 'Success',
        description: data.message || 'Backup deleted successfully',
      });

      setDeleteBackupId(null);
      await loadBackups();
    } catch (error) {
      console.error('Error deleting backup:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to delete backup',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadBackup = async (backupId: string) => {
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('access_token')
          : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
        `/api/v1/admin/backup/${backupId}/download-url?expiration=3600`,
        {
          headers,
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get download URL');
      }

      const data = await response.json();
      if (data.success && data.download_url) {
        window.open(data.download_url, '_blank');
      }
    } catch (error) {
      console.error('Error downloading backup:', error);
      toast({
        title: 'Error',
        description: 'Failed to get download URL',
        variant: 'destructive',
      });
    }
  };

  const handleCleanupOldBackups = async () => {
    setIsCleaning(true);
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('access_token')
          : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/v1/admin/backup/cleanup?days=30', {
        method: 'POST',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cleanup backups');
      }

      const data = await response.json();

      toast({
        title: 'Success',
        description: data.message || 'Backup cleanup completed',
      });

      await loadBackups();
    } catch (error) {
      console.error('Error cleaning up backups:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to cleanup backups',
        variant: 'destructive',
      });
    } finally {
      setIsCleaning(false);
    }
  };

  const handleOptimize = async () => {
    setIsOptimizing(true);
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('access_token')
          : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/v1/admin/maintenance/optimize', {
        method: 'POST',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to optimize database');
      }

      const data = await response.json();

      toast({
        title: 'Success',
        description: data.message || 'Database optimization completed',
      });
    } catch (error) {
      console.error('Error optimizing database:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to optimize database',
        variant: 'destructive',
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleVacuum = async () => {
    setIsVacuuming(true);
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('access_token')
          : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/v1/admin/maintenance/vacuum', {
        method: 'POST',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to run VACUUM');
      }

      const data = await response.json();

      toast({
        title: 'Success',
        description: data.message || 'VACUUM completed successfully',
      });
    } catch (error) {
      console.error('Error running VACUUM:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to run VACUUM',
        variant: 'destructive',
      });
    } finally {
      setIsVacuuming(false);
    }
  };

  const handleCleanup = async () => {
    setIsCleaning(true);
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('access_token')
          : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/v1/admin/maintenance/cleanup', {
        method: 'POST',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cleanup database');
      }

      const data = await response.json();

      toast({
        title: 'Success',
        description: data.message || 'Database cleanup completed',
      });
    } catch (error) {
      console.error('Error cleaning up database:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to cleanup database',
        variant: 'destructive',
      });
    } finally {
      setIsCleaning(false);
    }
  };

  const handleCheckUpdates = async () => {
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('access_token')
          : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/v1/admin/update/check', {
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to check for updates');
      }

      const data = await response.json();

      if (data.update_available) {
        toast({
          title: 'Update Available',
          description: `New version ${data.latest_version} is available`,
        });
      } else {
        toast({
          title: 'Up to Date',
          description: 'You are running the latest version',
        });
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      toast({
        title: 'Error',
        description: 'Failed to check for updates',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const loadMaintenanceSettings = useCallback(async () => {
    setIsLoadingMaintenance(true);
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('access_token')
          : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/v1/admin/maintenance/settings', {
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load maintenance settings');
      }

      const data = await response.json();
      if (data.success) {
        setMaintenanceMode(data.maintenance_mode || false);
        setMaintenanceMessage(data.maintenance_message || '');
        setMaintenanceTitle(data.maintenance_title || '');
        setEstimatedDowntime(data.estimated_downtime || '');
      }
    } catch (error) {
      console.error('Error loading maintenance settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load maintenance settings',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingMaintenance(false);
    }
  }, [toast]);

  useEffect(() => {
    loadBackups();
    loadSystemVersion();
    loadMaintenanceSettings();
  }, [showDeleted, loadBackups, loadMaintenanceSettings]);

  const handleSaveMaintenanceSettings = async () => {
    setIsSavingMaintenance(true);
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('access_token')
          : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/v1/admin/maintenance/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          maintenance_mode: maintenanceMode,
          maintenance_message: maintenanceMessage,
          maintenance_title: maintenanceTitle,
          estimated_downtime: estimatedDowntime,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || 'Failed to save maintenance settings'
        );
      }

      const data = await response.json();

      toast({
        title: 'Success',
        description: data.message || 'Maintenance settings saved successfully',
      });
    } catch (error) {
      console.error('Error saving maintenance settings:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to save maintenance settings',
        variant: 'destructive',
      });
    } finally {
      setIsSavingMaintenance(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Backup, Maintenance & Updates</h1>
        <p className="text-muted-foreground">
          Manage backups, perform maintenance, and check for updates
        </p>
      </div>

      <Card className="border-orange-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-orange-500" />
            Maintenance Mode
          </CardTitle>
          <CardDescription>
            Enable maintenance mode to restrict site access during updates or
            maintenance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingMaintenance ? (
            <div className="text-sm text-muted-foreground">
              Loading maintenance settings...
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="maintenance-mode"
                    className="text-base font-medium"
                  >
                    Maintenance Mode
                  </Label>
                  <div className="text-sm text-muted-foreground">
                    {maintenanceMode ? (
                      <span className="flex items-center gap-2 text-orange-500 font-medium">
                        <AlertTriangle className="w-4 h-4" />
                        Site is currently in maintenance mode
                      </span>
                    ) : (
                      <span>Site is accessible to all users</span>
                    )}
                  </div>
                </div>
                <Switch
                  id="maintenance-mode"
                  checked={maintenanceMode}
                  onCheckedChange={setMaintenanceMode}
                />
              </div>

              {maintenanceMode && (
                <div className="space-y-4 p-4 border rounded-lg bg-orange-50 dark:bg-orange-950/20">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    When maintenance mode is enabled, only admin users can
                    access the site. All other users will see the maintenance
                    page with your custom message.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="maintenance-title">Maintenance Title</Label>
                <Input
                  id="maintenance-title"
                  placeholder="We'll be right back!"
                  value={maintenanceTitle}
                  onChange={e => setMaintenanceTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maintenance-message">Maintenance Message</Label>
                <Textarea
                  id="maintenance-message"
                  placeholder="We're performing scheduled maintenance to improve your experience. We'll be back shortly."
                  value={maintenanceMessage}
                  onChange={e => setMaintenanceMessage(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimated-downtime">Estimated Downtime</Label>
                <Input
                  id="estimated-downtime"
                  placeholder="e.g., 2 hours, 30 minutes"
                  value={estimatedDowntime}
                  onChange={e => setEstimatedDowntime(e.target.value)}
                />
              </div>

              <Button
                onClick={handleSaveMaintenanceSettings}
                disabled={isSavingMaintenance}
                className="w-full"
              >
                {isSavingMaintenance ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Save Maintenance Settings
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BACKUP SECTION */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Database Backup
            </CardTitle>
            <CardDescription>
              Create and restore database backups
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleCreateBackup}
              disabled={isCreatingBackup}
              className="w-full"
            >
              {isCreatingBackup ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Creating Backup...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Create Backup
                </>
              )}
            </Button>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Available Backups</h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleted(!showDeleted)}
                  >
                    {showDeleted ? 'Hide Deleted' : 'Show Deleted'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadBackups}
                    disabled={isLoadingBackups}
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${isLoadingBackups ? 'animate-spin' : ''}`}
                    />
                  </Button>
                </div>
              </div>

              {isLoadingBackups ? (
                <div className="text-sm text-muted-foreground">
                  Loading backups...
                </div>
              ) : backups.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No backups available
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {backups.map(backup => (
                    <div
                      key={backup.id}
                      className={`flex items-center justify-between p-2 border rounded-lg ${
                        backup.status === 'deleted' ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium truncate">
                            {backup.filename}
                          </div>
                          <Badge
                            variant={
                              backup.status === 'completed'
                                ? 'default'
                                : backup.status === 'failed'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {backup.status}
                          </Badge>
                          {backup.s3_version_id && (
                            <Badge variant="outline" className="text-xs">
                              v{backup.s3_version_id.substring(0, 8)}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(backup.created_at)} • {backup.size_mb} MB
                          {backup.expires_at && (
                            <> • Expires: {formatDate(backup.expires_at)}</>
                          )}
                        </div>
                        {backup.error_message && (
                          <div className="text-xs text-destructive mt-1">
                            Error: {backup.error_message}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {backup.status === 'completed' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadBackup(backup.id)}
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setRestoreBackupId(backup.id)}
                                  title="Restore"
                                >
                                  <Upload className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Restore Backup
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to restore this
                                    backup? This will replace all current data.
                                    <br />
                                    <strong>
                                      This action cannot be undone.
                                    </strong>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      handleRestoreBackup(backup.id)
                                    }
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Restore
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                        {backup.status !== 'deleted' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeleteBackupId(backup.id)}
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete Backup
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this backup?
                                  <br />
                                  This will mark it as deleted. Use hard delete
                                  to remove from S3.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleDeleteBackup(backup.id, false)
                                  }
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* MAINTENANCE SECTION */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Database Maintenance
            </CardTitle>
            <CardDescription>
              Optimize and maintain your database
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Button
                onClick={handleOptimize}
                disabled={isOptimizing}
                variant="outline"
                className="w-full justify-start"
              >
                {isOptimizing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <Server className="w-4 h-4 mr-2" />
                    Optimize Database
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Optimize indexes and queries for better performance
              </p>
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleVacuum}
                disabled={isVacuuming}
                variant="outline"
                className="w-full justify-start"
              >
                {isVacuuming ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Running VACUUM...
                  </>
                ) : (
                  <>
                    <HardDrive className="w-4 h-4 mr-2" />
                    Run VACUUM ANALYZE
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Reclaim storage space and update statistics
              </p>
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleCleanup}
                disabled={isCleaning}
                variant="outline"
                className="w-full justify-start"
              >
                {isCleaning ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Cleaning...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Cleanup Old Data
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Remove expired sessions and old data
              </p>
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleCleanupOldBackups}
                disabled={isCleaning}
                variant="outline"
                className="w-full justify-start"
              >
                {isCleaning ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Cleaning...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Cleanup Old Backups (30+ days)
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Delete backups older than 30 days
              </p>
            </div>
          </CardContent>
        </Card>

        {/* SYSTEM INFO SECTION */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              System Information
            </CardTitle>
            <CardDescription>Current system version and status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingVersion ? (
              <div className="text-sm text-muted-foreground">
                Loading version...
              </div>
            ) : systemVersion ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Application Version
                  </span>
                  <Badge variant="outline">{systemVersion.version}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Python Version
                  </span>
                  <Badge variant="outline">
                    {systemVersion.python_version}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Version information unavailable
              </div>
            )}

            <Button
              onClick={handleCheckUpdates}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Check for Updates
            </Button>
          </CardContent>
        </Card>

        {/* QUICK ACTIONS */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common maintenance tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">
                Recommended Maintenance Schedule
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>• Weekly: Run VACUUM ANALYZE</div>
                <div>• Monthly: Optimize database</div>
                <div>• Before major updates: Create backup</div>
                <div>• Daily: Cleanup old data</div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="text-sm font-medium mb-2">Backup Schedule</div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>• Weekly backups: Automatic every Sunday</div>
                <div>• Retention: 30 days (auto-deleted after)</div>
                <div>• Storage: S3 with versioning enabled</div>
                <div>
                  • Location:{' '}
                  {process.env.NEXT_PUBLIC_S3_BUCKET_SQL_SAVE_PROTECTED ||
                    'S3_BUCKET_SQL_SAVE_PROTECTED'}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="text-sm font-medium mb-2">Maintenance Tips</div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>• Always create a backup before major operations</div>
                <div>• Run maintenance during low-traffic periods</div>
                <div>• Monitor database performance after optimization</div>
                <div>• Backups are stored in S3 with versioning</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
