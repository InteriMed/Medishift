'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DashboardStats } from '@/types/compliance';
import { TrendingUp } from 'lucide-react';

interface TrendChartProps {
    stats: DashboardStats | null;
    isLoading: boolean;
}

export function TrendChart({ stats, isLoading }: TrendChartProps) {
    const data = stats?.ai_dependencies_over_time || [];

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>AI Dependencies Over Time</CardTitle>
                    <CardDescription>Tracking library additions and risk changes</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-64 animate-pulse bg-muted rounded" />
                </CardContent>
            </Card>
        );
    }

    const chartData = data.map((item) => ({
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        total: item.count,
        'High Risk': item.high_risk,
        'Medium Risk': item.medium_risk,
        'Low Risk': item.low_risk,
    }));

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            AI Dependencies Over Time
                        </CardTitle>
                        <CardDescription>
                            Shows if a team suddenly added a massive library like PyTorch or a new OpenAI call in the last commit
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {chartData.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                        No data available
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="High Risk"
                                stroke="#ef4444"
                                strokeWidth={2}
                                dot={{ r: 4 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="Medium Risk"
                                stroke="#eab308"
                                strokeWidth={2}
                                dot={{ r: 4 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="Low Risk"
                                stroke="#22c55e"
                                strokeWidth={2}
                                dot={{ r: 4 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="total"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={{ r: 4 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}

