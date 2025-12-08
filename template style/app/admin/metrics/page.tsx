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
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  CreditCard,
  Activity,
  Eye,
  MousePointerClick,
  Clock,
  Zap,
  Target,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  FunnelChart,
  Funnel,
  LabelList,
} from 'recharts';

interface WebsiteMetrics {
  monthly_unique_visitors: number;
  visitor_to_signup_rate: number;
  total_signups: number;
  total_page_views: number;
  traffic_sources: {
    organic: number;
    paid: number;
    referral: number;
    direct: number;
    social: number;
    email: number;
    unknown: number;
  };
  average_session_duration_seconds: number;
  bounce_rate: number;
}

interface ProductUsageMetrics {
  activation_rate: number;
  total_signups: number;
  users_with_exports: number;
  average_credits_consumed_free_trial: number;
  total_free_credits_consumed: number;
  active_free_users: number;
  model_preference_ratio: {
    turbo: number;
    cinema: number;
    other: number;
  };
  time_to_first_export_hours: number;
  day_7_active_users: number;
  day_30_active_users: number;
  dau_mau_ratio: number;
  total_users: number;
}

interface FinancialMetrics {
  credit_to_paid_conversion_rate: number;
  users_who_burned_credits: number;
  users_who_converted: number;
  monthly_recurring_revenue: number;
  total_revenue_period: number;
  estimated_gpu_costs: number;
  gross_margin: number;
  customer_lifetime_value: number;
  customer_acquisition_cost: number;
  ltv_cac_ratio: number;
  customer_churn_rate: number;
  active_paid_subscriptions: number;
}

interface MetricsData {
  website: WebsiteMetrics;
  product_usage: ProductUsageMetrics;
  financial: FinancialMetrics;
}

export default function AdminMetricsPage() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');

      const startDate = new Date();
      if (timeRange === '7d') startDate.setDate(startDate.getDate() - 7);
      else if (timeRange === '30d') startDate.setDate(startDate.getDate() - 30);
      else if (timeRange === '90d') startDate.setDate(startDate.getDate() - 90);

      const response = await fetch(
        `/api/admin/metrics/all?start_date=${startDate.toISOString()}&end_date=${new Date().toISOString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }

      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

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

  if (!data) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Error Loading Metrics</h1>
        <p className="text-muted-foreground">Failed to load metrics data.</p>
      </div>
    );
  }

  const { website, product_usage, financial } = data;

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Business Metrics</h1>
          <p className="text-muted-foreground">
            Comprehensive analytics for your SaaS business
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={timeRange === '7d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('7d')}
          >
            7 Days
          </Button>
          <Button
            variant={timeRange === '30d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('30d')}
          >
            30 Days
          </Button>
          <Button
            variant={timeRange === '90d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('90d')}
          >
            90 Days
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Eye className="w-6 h-6" />
            Website & Conversion Metrics (Top of Funnel)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Monthly Unique Visitors
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {website.monthly_unique_visitors.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Unique visitors this period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Visitor-to-Signup Rate
                </CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {website.visitor_to_signup_rate.toFixed(2)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {website.total_signups} signups from{' '}
                  {website.monthly_unique_visitors} visitors
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Session Duration
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.floor(website.average_session_duration_seconds / 60)}m{' '}
                  {Math.floor(website.average_session_duration_seconds % 60)}s
                </div>
                <p className="text-xs text-muted-foreground">
                  Average time on site
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Bounce Rate
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {website.bounce_rate.toFixed(2)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Single-page sessions
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Traffic Sources</CardTitle>
              <CardDescription>
                Distribution of traffic by source
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          {
                            name: 'Organic',
                            value: website.traffic_sources.organic,
                            color: '#10b981',
                          },
                          {
                            name: 'Paid',
                            value: website.traffic_sources.paid,
                            color: '#f59e0b',
                          },
                          {
                            name: 'Referral',
                            value: website.traffic_sources.referral,
                            color: '#3b82f6',
                          },
                          {
                            name: 'Direct',
                            value: website.traffic_sources.direct,
                            color: '#8b5cf6',
                          },
                          {
                            name: 'Social',
                            value: website.traffic_sources.social,
                            color: '#ec4899',
                          },
                          {
                            name: 'Email',
                            value: website.traffic_sources.email,
                            color: '#06b6d4',
                          },
                        ].filter(item => item.value > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          percent > 0.05
                            ? `${name} ${(percent * 100).toFixed(0)}%`
                            : ''
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[
                          {
                            name: 'Organic',
                            value: website.traffic_sources.organic,
                            color: '#10b981',
                          },
                          {
                            name: 'Paid',
                            value: website.traffic_sources.paid,
                            color: '#f59e0b',
                          },
                          {
                            name: 'Referral',
                            value: website.traffic_sources.referral,
                            color: '#3b82f6',
                          },
                          {
                            name: 'Direct',
                            value: website.traffic_sources.direct,
                            color: '#8b5cf6',
                          },
                          {
                            name: 'Social',
                            value: website.traffic_sources.social,
                            color: '#ec4899',
                          },
                          {
                            name: 'Email',
                            value: website.traffic_sources.email,
                            color: '#06b6d4',
                          },
                        ]
                          .filter(item => item.value > 0)
                          .map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-4 content-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Organic
                      </div>
                      <div className="text-2xl font-bold">
                        {website.traffic_sources.organic}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <div>
                      <div className="text-sm text-muted-foreground">Paid</div>
                      <div className="text-2xl font-bold">
                        {website.traffic_sources.paid}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Referral
                      </div>
                      <div className="text-2xl font-bold">
                        {website.traffic_sources.referral}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-violet-500"></div>
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Direct
                      </div>
                      <div className="text-2xl font-bold">
                        {website.traffic_sources.direct}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-pink-500"></div>
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Social
                      </div>
                      <div className="text-2xl font-bold">
                        {website.traffic_sources.social}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
                    <div>
                      <div className="text-sm text-muted-foreground">Email</div>
                      <div className="text-2xl font-bold">
                        {website.traffic_sources.email}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
              <CardDescription>
                User journey from visitor to paid customer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={[
                      {
                        name: 'Visitors',
                        value: website.monthly_unique_visitors,
                        fill: '#3b82f6',
                      },
                      {
                        name: 'Signups',
                        value: website.total_signups,
                        fill: '#10b981',
                        rate:
                          website.total_signups > 0
                            ? `${((website.total_signups / website.monthly_unique_visitors) * 100).toFixed(1)}%`
                            : '0%',
                      },
                      {
                        name: 'Activated',
                        value: product_usage.users_with_exports,
                        fill: '#f59e0b',
                        rate:
                          product_usage.users_with_exports > 0
                            ? `${((product_usage.users_with_exports / website.total_signups) * 100).toFixed(1)}%`
                            : '0%',
                      },
                      {
                        name: 'Paid Users',
                        value: financial.active_paid_subscriptions,
                        fill: '#8b5cf6',
                        rate:
                          financial.active_paid_subscriptions > 0
                            ? `${((financial.active_paid_subscriptions / product_usage.users_with_exports) * 100).toFixed(1)}%`
                            : '0%',
                      },
                    ]}
                    margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background border border-border p-3 rounded-lg shadow-lg">
                              <p className="font-semibold">{data.name}</p>
                              <p className="text-sm">
                                {data.value.toLocaleString()} users
                              </p>
                              {data.rate && (
                                <p className="text-sm text-muted-foreground">
                                  {data.rate} conversion
                                </p>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                      {[
                        {
                          name: 'Visitors',
                          value: website.monthly_unique_visitors,
                          fill: '#3b82f6',
                        },
                        {
                          name: 'Signups',
                          value: website.total_signups,
                          fill: '#10b981',
                        },
                        {
                          name: 'Activated',
                          value: product_usage.users_with_exports,
                          fill: '#f59e0b',
                        },
                        {
                          name: 'Paid Users',
                          value: financial.active_paid_subscriptions,
                          fill: '#8b5cf6',
                        },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                      <LabelList
                        dataKey="value"
                        position="right"
                        formatter={(value: number) => value.toLocaleString()}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-6 h-6" />
            Product Usage & Activation Metrics (Credit Model)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Activation Rate
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {product_usage.activation_rate.toFixed(2)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {product_usage.users_with_exports} users exported videos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Credits (Free Trial)
                </CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {product_usage.average_credits_consumed_free_trial.toFixed(0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {product_usage.active_free_users} active free users
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Time to First Export
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {product_usage.time_to_first_export_hours.toFixed(1)}h
                </div>
                <p className="text-xs text-muted-foreground">
                  Average time to activation
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  DAU/MAU Ratio
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {product_usage.dau_mau_ratio.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {product_usage.day_7_active_users} DAU /{' '}
                  {product_usage.day_30_active_users} MAU
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Model Preference Ratio</CardTitle>
              <CardDescription>
                Distribution of video generation models
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          {
                            name: 'Turbo',
                            value: product_usage.model_preference_ratio.turbo,
                            color: '#3b82f6',
                          },
                          {
                            name: 'Cinema',
                            value: product_usage.model_preference_ratio.cinema,
                            color: '#8b5cf6',
                          },
                          {
                            name: 'Other',
                            value: product_usage.model_preference_ratio.other,
                            color: '#64748b',
                          },
                        ].filter(item => item.value > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[
                          {
                            name: 'Turbo',
                            value: product_usage.model_preference_ratio.turbo,
                            color: '#3b82f6',
                          },
                          {
                            name: 'Cinema',
                            value: product_usage.model_preference_ratio.cinema,
                            color: '#8b5cf6',
                          },
                          {
                            name: 'Other',
                            value: product_usage.model_preference_ratio.other,
                            color: '#64748b',
                          },
                        ]
                          .filter(item => item.value > 0)
                          .map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col justify-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                    <div className="flex-1">
                      <div className="text-sm text-muted-foreground">
                        Turbo Model
                      </div>
                      <div className="text-2xl font-bold">
                        {product_usage.model_preference_ratio.turbo}%
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-violet-500"></div>
                    <div className="flex-1">
                      <div className="text-sm text-muted-foreground">
                        Cinema Model
                      </div>
                      <div className="text-2xl font-bold">
                        {product_usage.model_preference_ratio.cinema}%
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-slate-500"></div>
                    <div className="flex-1">
                      <div className="text-sm text-muted-foreground">
                        Other Models
                      </div>
                      <div className="text-2xl font-bold">
                        {product_usage.model_preference_ratio.other}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-6 h-6" />
            Financial & Revenue Metrics (Bottom Line)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Credit-to-Paid Conversion
                </CardTitle>
                <MousePointerClick className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {financial.credit_to_paid_conversion_rate.toFixed(2)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {financial.users_who_converted} converted from{' '}
                  {financial.users_who_burned_credits} who burned credits
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Monthly Recurring Revenue
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${financial.monthly_recurring_revenue.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {financial.active_paid_subscriptions} active subscriptions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Gross Margin
                </CardTitle>
                <PieChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {financial.gross_margin.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  After ${financial.estimated_gpu_costs.toFixed(0)} GPU costs
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Customer LTV
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${financial.customer_lifetime_value.toFixed(0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  LTV/CAC: {financial.ltv_cac_ratio.toFixed(1)}x
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Customer Acquisition Cost
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${financial.customer_acquisition_cost.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Customer Churn Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {financial.customer_churn_rate.toFixed(2)}%
                </div>
                <p className="text-xs text-muted-foreground">Monthly churn</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Total Revenue (Period)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${financial.total_revenue_period.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Revenue vs Costs</CardTitle>
              <CardDescription>
                Monthly recurring revenue compared to GPU costs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      {
                        category: 'Financial Overview',
                        MRR: financial.monthly_recurring_revenue,
                        'GPU Costs': financial.estimated_gpu_costs,
                        'Net Revenue':
                          financial.monthly_recurring_revenue -
                          financial.estimated_gpu_costs,
                      },
                    ]}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) => `$${value.toFixed(2)}`}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="MRR" fill="#10b981" radius={[8, 8, 0, 0]} />
                    <Bar
                      dataKey="GPU Costs"
                      fill="#ef4444"
                      radius={[8, 8, 0, 0]}
                    />
                    <Bar
                      dataKey="Net Revenue"
                      fill="#3b82f6"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Monthly Recurring Revenue
                    </div>
                    <div className="text-xl font-bold">
                      ${financial.monthly_recurring_revenue.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div>
                    <div className="text-sm text-muted-foreground">
                      GPU Costs
                    </div>
                    <div className="text-xl font-bold">
                      ${financial.estimated_gpu_costs.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Net Revenue
                    </div>
                    <div className="text-xl font-bold">
                      $
                      {(
                        financial.monthly_recurring_revenue -
                        financial.estimated_gpu_costs
                      ).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
