'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Lock,
  Eye,
  Zap,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Key,
  Ban,
  FileX,
  Gauge,
} from 'lucide-react';

interface SecurityAudit {
  overall_status: string;
  timestamp: string;
  jwt_secret_key: {
    status?: string;
    strength?: string;
    length?: number;
    issues?: string[];
    warnings?: string[];
    recommendations?: string[];
  };
  rate_limiting: {
    status: string;
    total_violations?: number;
    violations?: Array<{
      type: string;
      identifier: string;
      count: number;
      severity: string;
    }>;
    rate_limit_percentage?: number;
  };
  authentication: {
    status: string;
    total_failures?: number;
    total_requests?: number;
    authenticated_requests?: number;
    failure_rate?: number;
    suspicious_patterns?: Array<{
      type: string;
      message: string;
      severity: string;
    }>;
  };
  sanitization: {
    status: string;
    total_violations?: number;
    top_patterns?: Array<{ pattern: string; count: number }>;
    top_users?: Array<{ user_id: string; count: number }>;
    top_endpoints?: Array<{ endpoint: string; count: number }>;
    alerts?: Array<{
      type: string;
      message: string;
      severity: string;
    }>;
  };
  performance: {
    status: string;
    health_status: string;
    performance_metrics?: {
      average_response_time_ms?: number;
      response_time_p50_ms?: number;
      response_time_p95_ms?: number;
      response_time_p99_ms?: number;
      slow_requests_count?: number;
    };
    error_metrics?: {
      total_errors?: number;
      error_rate_percent?: number;
      errors_per_endpoint?: Record<string, number>;
    };
    alerts?: Array<{
      type: string;
      message: string;
      severity: string;
    }>;
  };
  alerts?: Array<{
    type: string;
    severity: string;
    message: string;
    details?: any;
  }>;
  alert_count?: number;
}

export default function AdminSecurityPage() {
  const [audit, setAudit] = useState<SecurityAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAudit();
  }, []);

  const fetchAudit = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem('access_token');

      const response = await fetch('/api/admin/security/audit', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch security audit');
      }

      const result = await response.json();
      setAudit(result);
    } catch (error) {
      console.error('Error fetching security audit:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ok':
      case 'healthy':
        return 'bg-green-500';
      case 'warning':
      case 'attention':
        return 'bg-yellow-500';
      case 'critical':
      case 'unhealthy':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ok':
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
      case 'attention':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'critical':
      case 'unhealthy':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">
          Error Loading Security Audit
        </h1>
        <p className="text-muted-foreground">
          Failed to load security audit data.
        </p>
        <Button onClick={fetchAudit} className="mt-4">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8" />
            Security Audit
          </h1>
          <p className="text-muted-foreground">
            Comprehensive security monitoring and alerts
          </p>
        </div>
        <Button onClick={fetchAudit} disabled={refreshing}>
          <RefreshCw
            className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(audit.overall_status)}
            Overall Security Status
          </CardTitle>
          <CardDescription>
            Last updated: {new Date(audit.timestamp).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge
              variant={getSeverityColor(audit.overall_status)}
              className="text-lg px-4 py-2"
            >
              {audit.overall_status.toUpperCase()}
            </Badge>
            <span className="text-muted-foreground">
              {audit.alert_count ?? 0} active alert
              {(audit.alert_count ?? 0) !== 1 ? 's' : ''}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {audit.alerts && audit.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Security Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {audit.alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className="p-4 border rounded-lg flex items-start gap-3"
                >
                  <Badge variant={getSeverityColor(alert.severity)}>
                    {alert.severity}
                  </Badge>
                  <div className="flex-1">
                    <p className="font-medium">{alert.message}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Type: {alert.type}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* JWT Secret Key */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              JWT Secret Key
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge
                variant={getSeverityColor(
                  audit.jwt_secret_key?.status ?? 'unknown'
                )}
              >
                {audit.jwt_secret_key?.status ?? 'Unknown'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Strength</span>
              <Badge>{audit.jwt_secret_key?.strength ?? 'Unknown'}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Length</span>
              <span className="font-medium">
                {audit.jwt_secret_key?.length ?? 0} chars
              </span>
            </div>
            {audit.jwt_secret_key?.issues &&
              audit.jwt_secret_key.issues.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-red-500 mb-2">
                    Issues:
                  </p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {audit.jwt_secret_key.issues.map((issue, idx) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            {audit.jwt_secret_key?.warnings &&
              audit.jwt_secret_key.warnings.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-yellow-500 mb-2">
                    Warnings:
                  </p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {audit.jwt_secret_key.warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            {audit.jwt_secret_key?.recommendations &&
              audit.jwt_secret_key.recommendations.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Recommendations:</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {audit.jwt_secret_key.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
          </CardContent>
        </Card>

        {/* Rate Limiting */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5" />
              Rate Limiting
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total Violations
              </span>
              <span className="text-2xl font-bold">
                {audit.rate_limiting?.total_violations ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Rate Limit %
              </span>
              <span className="font-medium">
                {(audit.rate_limiting?.rate_limit_percentage ?? 0).toFixed(2)}%
              </span>
            </div>
            {audit.rate_limiting?.violations &&
              audit.rate_limiting.violations.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Top Violations:</p>
                  <div className="space-y-2">
                    {audit.rate_limiting.violations
                      .slice(0, 5)
                      .map((violation, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="truncate">
                            {violation.identifier}
                          </span>
                          <Badge variant={getSeverityColor(violation.severity)}>
                            {violation.count}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </div>
              )}
          </CardContent>
        </Card>

        {/* Authentication */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Authentication
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total Failures
              </span>
              <span className="text-2xl font-bold">
                {audit.authentication?.total_failures ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Failure Rate
              </span>
              <span className="font-medium">
                {(audit.authentication?.failure_rate ?? 0).toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Authenticated Requests
              </span>
              <span className="font-medium">
                {audit.authentication?.authenticated_requests ?? 0}
              </span>
            </div>
            {audit.authentication?.suspicious_patterns &&
              audit.authentication.suspicious_patterns.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-yellow-500 mb-2">
                    Suspicious Patterns:
                  </p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {audit.authentication.suspicious_patterns.map(
                      (pattern, idx) => (
                        <li key={idx}>{pattern.message}</li>
                      )
                    )}
                  </ul>
                </div>
              )}
          </CardContent>
        </Card>

        {/* Sanitization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileX className="w-5 h-5" />
              Input Sanitization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total Violations
              </span>
              <span className="text-2xl font-bold">
                {audit.sanitization?.total_violations ?? 0}
              </span>
            </div>
            {audit.sanitization?.top_patterns &&
              audit.sanitization.top_patterns.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Top Patterns:</p>
                  <div className="space-y-2">
                    {audit.sanitization.top_patterns
                      .slice(0, 5)
                      .map((pattern, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="truncate">{pattern.pattern}</span>
                          <Badge>{pattern.count}</Badge>
                        </div>
                      ))}
                  </div>
                </div>
              )}
          </CardContent>
        </Card>

        {/* Performance */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="w-5 h-5" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Avg Response Time
                </p>
                <p className="text-2xl font-bold">
                  {(
                    audit.performance?.performance_metrics
                      ?.average_response_time_ms ?? 0
                  ).toFixed(0)}
                  ms
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  P95 Response Time
                </p>
                <p className="text-2xl font-bold">
                  {(
                    audit.performance?.performance_metrics
                      ?.response_time_p95_ms ?? 0
                  ).toFixed(0)}
                  ms
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Error Rate</p>
                <p className="text-2xl font-bold">
                  {(
                    audit.performance?.error_metrics?.error_rate_percent ?? 0
                  ).toFixed(2)}
                  %
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Slow Requests
                </p>
                <p className="text-2xl font-bold">
                  {audit.performance?.performance_metrics
                    ?.slow_requests_count ?? 0}
                </p>
              </div>
            </div>
            {audit.performance?.alerts &&
              audit.performance.alerts.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-yellow-500 mb-2">
                    Performance Alerts:
                  </p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {audit.performance.alerts.map((alert, idx) => (
                      <li key={idx}>{alert.message}</li>
                    ))}
                  </ul>
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
