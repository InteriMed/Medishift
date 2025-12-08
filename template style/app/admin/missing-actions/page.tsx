'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertCircle,
  Search,
  RefreshCw,
  MessageSquare,
  TrendingUp,
  FileText,
  Layers,
  Target,
  BarChart3,
  Filter,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MissingActionsStats {
  total_messages: number;
  raw_count: number;
  condensed_count: number;
  hypercondensed_count: number;
  no_match_count: number;
  context_count: number;
  subcontext_count: number;
  action_count: number;
  category_distribution: Record<string, number>;
  state_distribution: Record<string, number>;
}

interface MissingActionsMessage {
  id: string;
  message_id: string;
  user_id?: string;
  chat_session_id?: string;
  project_id?: string;
  message_content: string;
  message_state: string;
  match_category: string;
  context_data?: any;
  message_metadata: Record<string, any>;
  created_at: string;
}

interface MissingActionsCondensation {
  id: string;
  condensation_type: string;
  message_ids: string[];
  llm_analysis?: any;
  llm_prompt?: string;
  llm_model?: string;
  created_at: string;
}

export default function MissingActionsPage() {
  const [stats, setStats] = useState<MissingActionsStats | null>(null);
  const [messages, setMessages] = useState<MissingActionsMessage[]>([]);
  const [condensations, setCondensations] = useState<MissingActionsCondensation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messagePage, setMessagePage] = useState(1);
  const [condensationPage, setCondensationPage] = useState(1);
  const [messageStateFilter, setMessageStateFilter] = useState<string>('all');
  const [messageCategoryFilter, setMessageCategoryFilter] = useState<string>('all');
  const [condensationTypeFilter, setCondensationTypeFilter] = useState<string>('all');
  const [selectedCondensation, setSelectedCondensation] = useState<MissingActionsCondensation | null>(null);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/missing-actions?endpoint=stats', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      const result = await response.json();
      if (result.success && result.data) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const params = new URLSearchParams({
        page: messagePage.toString(),
        page_size: '50',
      });
      if (messageStateFilter !== 'all') {
        params.append('state', messageStateFilter);
      }
      if (messageCategoryFilter !== 'all') {
        params.append('category', messageCategoryFilter);
      }
      
      const response = await fetch(`/api/admin/missing-actions?endpoint=messages&${params}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch messages');
      const result = await response.json();
      if (result.success && result.data) {
        setMessages(result.data.items || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchCondensations = async () => {
    try {
      const params = new URLSearchParams({
        page: condensationPage.toString(),
        page_size: '20',
      });
      if (condensationTypeFilter !== 'all') {
        params.append('condensation_type', condensationTypeFilter);
      }
      
      const response = await fetch(`/api/admin/missing-actions?endpoint=condensations&${params}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch condensations');
      const result = await response.json();
      if (result.success && result.data) {
        setCondensations(result.data.items || []);
      }
    } catch (error) {
      console.error('Error fetching condensations:', error);
    }
  };

  const fetchAll = async () => {
    setRefreshing(true);
    setError(null);
    try {
      await Promise.all([fetchStats(), fetchMessages(), fetchCondensations()]);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch data');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [messagePage, messageStateFilter, messageCategoryFilter]);

  useEffect(() => {
    fetchCondensations();
  }, [condensationPage, condensationTypeFilter]);

  const filteredMessages = messages.filter(msg =>
    msg.message_content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.message_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'no_match':
        return 'destructive';
      case 'context':
        return 'secondary';
      case 'subcontext':
        return 'default';
      case 'action':
        return 'default';
      default:
        return 'outline';
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'raw':
        return 'default';
      case 'condensed':
        return 'secondary';
      case 'hypercondensed':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-shrink-0 p-6 pb-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Missing Actions Analytics</h1>
            <p className="text-muted-foreground">
              Track and analyze user messages to identify missing functionality
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAll}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex-shrink-0 p-4 bg-destructive/10 border-b">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Total Messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_messages}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  No Match
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.no_match_count}</div>
                <div className="text-xs text-muted-foreground">
                  {stats.total_messages > 0
                    ? ((stats.no_match_count / stats.total_messages) * 100).toFixed(1)
                    : 0}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Subcontext
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.subcontext_count}</div>
                <div className="text-xs text-muted-foreground">
                  {stats.total_messages > 0
                    ? ((stats.subcontext_count / stats.total_messages) * 100).toFixed(1)
                    : 0}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Action Match
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.action_count}</div>
                <div className="text-xs text-muted-foreground">
                  {stats.total_messages > 0
                    ? ((stats.action_count / stats.total_messages) * 100).toFixed(1)
                    : 0}%
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="messages" className="w-full">
          <TabsList>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="condensations">Condensations</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="messages" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Tracked Messages</CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={messageStateFilter} onValueChange={setMessageStateFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="State" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All States</SelectItem>
                        <SelectItem value="raw">Raw</SelectItem>
                        <SelectItem value="condensed">Condensed</SelectItem>
                        <SelectItem value="hypercondensed">Hypercondensed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={messageCategoryFilter} onValueChange={setMessageCategoryFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="no_match">No Match</SelectItem>
                        <SelectItem value="context">Context</SelectItem>
                        <SelectItem value="subcontext">Subcontext</SelectItem>
                        <SelectItem value="action">Action</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search messages..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredMessages.map(msg => (
                    <div
                      key={msg.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium mb-1">{msg.message_content}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={getCategoryColor(msg.match_category)}>
                              {msg.match_category}
                            </Badge>
                            <Badge variant={getStateColor(msg.message_state)}>
                              {msg.message_state}
                            </Badge>
                            {msg.message_metadata?.matched_action && (
                              <Badge variant="outline">
                                Matched: {msg.message_metadata.matched_action}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                        <span>ID: {msg.message_id}</span>
                        <span>{new Date(msg.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                  {filteredMessages.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      No messages found
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="condensations" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>LLM Condensations</CardTitle>
                  <Select value={condensationTypeFilter} onValueChange={setCondensationTypeFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="condensed">Condensed</SelectItem>
                      <SelectItem value="hypercondensed">Hypercondensed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {condensations.map(cond => (
                    <div
                      key={cond.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedCondensation(cond)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge>{cond.condensation_type}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {cond.message_ids.length} messages
                            </span>
                            {cond.llm_model && (
                              <span className="text-xs text-muted-foreground">
                                Model: {cond.llm_model}
                              </span>
                            )}
                          </div>
                          {cond.llm_analysis && (
                            <div className="text-sm">
                              <div className="font-semibold mb-1">Analysis Summary:</div>
                              <div className="text-muted-foreground">
                                {cond.llm_analysis.possible_actions?.length || 0} possible actions,{' '}
                                {cond.llm_analysis.mismatched_actions?.length || 0} mismatched,{' '}
                                {cond.llm_analysis.missing_features?.length || 0} missing features
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(cond.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                  {condensations.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      No condensations found
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis" className="mt-6">
            {selectedCondensation ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Condensation Analysis</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCondensation(null)}
                    >
                      Close
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedCondensation.llm_analysis && (
                      <>
                        {selectedCondensation.llm_analysis.possible_actions && (
                          <div>
                            <h3 className="font-semibold mb-2">Possible Actions</h3>
                            <div className="space-y-2">
                              {selectedCondensation.llm_analysis.possible_actions.map(
                                (action: any, idx: number) => (
                                  <div key={idx} className="p-3 border rounded">
                                    <div className="font-medium">{action.description}</div>
                                    <div className="text-sm text-muted-foreground">
                                      Frequency: {action.frequency}, Confidence:{' '}
                                      {(action.confidence * 100).toFixed(1)}%
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}
                        {selectedCondensation.llm_analysis.mismatched_actions && (
                          <div>
                            <h3 className="font-semibold mb-2">Mismatched Actions</h3>
                            <div className="space-y-2">
                              {selectedCondensation.llm_analysis.mismatched_actions.map(
                                (action: any, idx: number) => (
                                  <div key={idx} className="p-3 border rounded">
                                    <div className="font-medium">Action: {action.action_id}</div>
                                    <div className="text-sm text-muted-foreground">
                                      User Intent: {action.user_intent}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Frequency: {action.frequency}
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}
                        {selectedCondensation.llm_analysis.missing_features && (
                          <div>
                            <h3 className="font-semibold mb-2">Missing Features</h3>
                            <div className="space-y-2">
                              {selectedCondensation.llm_analysis.missing_features.map(
                                (feature: any, idx: number) => (
                                  <div key={idx} className="p-3 border rounded">
                                    <div className="font-medium">{feature.feature_description}</div>
                                    <div className="text-sm text-muted-foreground">
                                      Priority: {feature.priority}, Frequency: {feature.frequency}
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground py-12">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a condensation to view detailed analysis</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

