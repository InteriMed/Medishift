'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from '@/types/compliance';
import { Activity as ActivityIcon } from 'lucide-react';
import Link from 'next/link';

interface ActivityFeedProps {
    activities: Activity[];
    isLoading: boolean;
}

export function ActivityFeed({ activities, isLoading }: ActivityFeedProps) {
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Activity Feed</CardTitle>
                    <CardDescription>Recent compliance events</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-16 animate-pulse bg-muted rounded" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center">
                    <ActivityIcon className="w-5 h-5 mr-2" />
                    Activity Feed
                </CardTitle>
                <CardDescription>Recent compliance events</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {activities.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No recent activity
                        </div>
                    ) : (
                        activities.map((activity) => (
                            <div
                                key={activity.id}
                                className="border-l-2 border-border pl-4 py-2 hover:bg-muted/50 rounded-r transition-colors"
                            >
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <p className="text-sm font-medium leading-tight">
                                        {activity.repo_name ? (
                                            <Link
                                                href={`/app/repo/${activity.repo_id}`}
                                                className="hover:underline text-primary"
                                            >
                                                {activity.message}
                                            </Link>
                                        ) : (
                                            activity.message
                                        )}
                                    </p>
                                    {activity.severity && (
                                        <div
                                            className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${
                                                activity.severity === 'high'
                                                    ? 'bg-red-500'
                                                    : activity.severity === 'medium'
                                                      ? 'bg-yellow-500'
                                                      : 'bg-green-500'
                                            }`}
                                        />
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

