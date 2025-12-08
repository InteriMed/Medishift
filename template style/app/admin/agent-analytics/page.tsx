'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Network,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Target,
  Key,
  BarChart3,
  Shield,
  RefreshCw,
  Trash2,
  MessageSquare,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ReasoningTree } from '@/components/admin/reasoning-tree';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CandidateAnalysis {
  tool_id: string;
  tool_name: string;
  category: string;
  kw_match: number;
  lexical_sim: number;
  schema_score: number;
  context_score: number;
  hint_score: number;
  certainty: number;
  is_selected: boolean;
  agent_type?: string;
  input?: any;
  output?: {
    description?: string;
    schema?: any;
  };
}

interface AgentAnalytics {
  id: string;
  request_id: string;
  user_id?: string;
  chat_session_id?: string;
  message_id?: string;
  user_context: {
    message: string;
    message_length: number;
    files: any[];
    page_context?: string;
  };
  decision_chain: any[];
  total_duration_ms?: number;
  status: string;
  error_message?: string;
  created_at: string;
  // NEW FIELDS
  user_tier?: string;
  user_metadata?: Record<string, any>;
  reasoning_tree?: Record<string, any>;
  candidates_analysis?: CandidateAnalysis[];
  keyword_matching?: {
    extracted_keywords: string[];
    matched_tools: Record<string, string[]>;
    scores: Record<string, number>;
    decision_tree?: {
      steps: Array<{
        step: string;
        description: string;
        message?: string;
        extracted_keywords?: string[];
        matches_found?: number;
      }>;
      matches: Array<{
        tool_id: string;
        tool_name: string;
        category: string;
        high_priority_matches: Array<{
          keyword: string;
          position: number | null;
        }>;
        low_priority_matches: Array<{
          keyword: string;
          position: number | null;
        }>;
        high_score: number;
        low_score: number;
        total_score: number;
        tier_locked: boolean;
        is_available: boolean;
      }>;
    };
  };
  scoring_details?: {
    certainty: number;
    univocity: number;
    top_tool_scores: Record<string, number>;
  };
  agent_io?: AgentIOEntry[];
  step_chain?: string[];
  step_catalog?: Record<string, {
    code: string;
    name: string;
    phase: string;
    description: string;
    timestamp: string;
    duration_ms: number;
    details: Record<string, any>;
  }>;
}

interface AgentIOEntry {
  agent_type: string;
  input: {
    full_prompt: string;
    prompt_length: number;
    model?: string;
  };
  output: {
    response: string;
    response_length: number;
  };
  metadata: Record<string, any>;
  timestamp: string;
  duration_ms: number;
}

export default function AgentAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AgentAnalytics[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<AgentAnalytics | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const response = await fetch('/api/chat/analytics?page=1&page_size=50');

      if (!response.ok) {
        let errorMessage = `Failed to fetch analytics data (${response.status})`;
        try {
          const errorText = await response.text();
          if (errorText) {
            try {
              const errorData = JSON.parse(errorText);
              errorMessage =
                errorData.error ||
                errorData.details ||
                errorData.message ||
                errorMessage;
            } catch {
              errorMessage =
                errorText.length > 200
                  ? errorText.substring(0, 200) + '...'
                  : errorText;
            }
          }
        } catch (parseError) {
          errorMessage = `HTTP ${response.status}: ${response.statusText || 'Unknown error'}`;
        }
        setError(errorMessage);
        return;
      }

      try {
        const result = await response.json();
        setAnalytics(result.items || []);
        setSelectedRequest(null);
      } catch (jsonError) {
        const errorMessage = 'Invalid response format from server';
        console.error('Error parsing JSON response:', jsonError);
        setError(errorMessage);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to fetch analytics data';
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setError(
          'Network error: Unable to connect to the server. Please check your connection.'
        );
      } else {
        console.error('Error fetching analytics:', error);
        setError(errorMessage);
      }
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleDeleteAll = async () => {
    try {
      setDeleting(true);
      const response = await fetch('/api/chat/analytics', {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete analytics data');
      }
      await fetchAnalytics();
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting analytics:', error);
      alert('Failed to delete analytics. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const toggleStep = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const filteredAnalytics = analytics.filter(
    (item: AgentAnalytics) =>
      item.request_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.user_context.message
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (item.user_tier &&
        item.user_tier.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <div className="flex-shrink-0 p-6 pb-4 border-b">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </div>
        <div className="flex-1 flex gap-6 p-6 pt-4">
          <div className="flex-1 animate-pulse">
            <div className="h-full bg-muted rounded"></div>
          </div>
          <div className="flex-1 animate-pulse">
            <div className="h-full bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <div className="flex-shrink-0 p-6 pb-4 border-b">
          <div>
            <h1 className="text-3xl font-bold">Agent Analytics</h1>
            <p className="text-muted-foreground">
              Complete chain of thought and decision reasoning
            </p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <XCircle className="h-12 w-12 mx-auto text-destructive" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Failed to Load Analytics
                  </h3>
                  <p className="text-muted-foreground mb-4">{error}</p>
                  <Button onClick={fetchAnalytics} disabled={refreshing}>
                    <RefreshCw
                      className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}
                    />
                    Retry
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* HEADER */}
      <div className="flex-shrink-0 p-6 pb-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Agent Analytics</h1>
            <p className="text-muted-foreground">
              Complete chain of thought and decision reasoning
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Network className="h-6 w-6" />
              <span className="font-semibold">{analytics.length} Requests</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAnalytics}
                disabled={refreshing || loading}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}
                />
                Refresh
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={loading || analytics.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-6 p-6 pt-4 overflow-hidden">
        {/* LEFT: Request List */}
        <Card
          className={`flex flex-col overflow-hidden transition-all duration-300 ${selectedRequest ? 'w-56 flex-shrink-0' : 'flex-1'}`}
        >
          <CardHeader className="flex-shrink-0">
            <CardTitle>Recent Requests</CardTitle>
            <div className="pt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by request ID, message, or tier..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            <div className="space-y-2">
              {filteredAnalytics.map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelectedRequest(item)}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${selectedRequest?.id === item.id
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-muted border-border'
                    }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-mono text-sm truncate">
                          {item.request_id}
                        </p>
                        {item.user_tier && (
                          <Badge variant="outline" className="text-xs">
                            {item.user_tier}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {item.user_context.message}
                      </p>
                    </div>
                    {item.status === 'completed' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 ml-2" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 ml-2" />
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {item.total_duration_ms
                        ? `${item.total_duration_ms.toFixed(0)}ms`
                        : 'N/A'}
                    </span>
                    {item.reasoning_tree && (
                      <span>
                        {Object.keys(item.reasoning_tree).length} reasoning
                        steps
                      </span>
                    )}
                    <span>{new Date(item.created_at).toLocaleString()}</span>
                  </div>
                </button>
              ))}
              {filteredAnalytics.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No requests found
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* RIGHT: Detailed Analysis */}
        {selectedRequest ? (
          <Card className="flex flex-col overflow-hidden flex-1 min-w-0">
            <CardHeader className="flex-shrink-0">
              <CardTitle>Analysis Details</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden flex flex-col min-h-0">
              <Tabs
                defaultValue="reasoning"
                className="w-full flex flex-col flex-1 min-h-0"
              >
                <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
                  <TabsTrigger value="reasoning">Reasoning</TabsTrigger>
                  <TabsTrigger value="candidates">Candidates</TabsTrigger>
                  <TabsTrigger value="keywords">Keywords</TabsTrigger>
                  <TabsTrigger value="agent-io">Agent I/O</TabsTrigger>
                </TabsList>

                {/* REASONING TREE TAB - REASONING STEPS WITH TIMINGS */}
                <TabsContent
                  value="reasoning"
                  className="flex-1 overflow-y-auto space-y-4 mt-4"
                >
                  {/* User Context */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        User Context
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div>
                        <strong>Message:</strong>{' '}
                        {selectedRequest.user_context.message}
                      </div>
                      <div>
                        <strong>Length:</strong>{' '}
                        {selectedRequest.user_context.message_length} chars
                      </div>
                      {selectedRequest.user_tier && (
                        <div>
                          <strong>Tier:</strong>{' '}
                          <Badge>{selectedRequest.user_tier}</Badge>
                        </div>
                      )}
                      {selectedRequest.user_context.files.length > 0 && (
                        <div>
                          <strong>Files:</strong>{' '}
                          {selectedRequest.user_context.files.length}
                        </div>
                      )}
                      {selectedRequest.total_duration_ms && (
                        <div>
                          <strong>Total Duration:</strong>{' '}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {selectedRequest.total_duration_ms.toFixed(0)}ms
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Decision Tree from step_chain */}
                  {(() => {
                    const hasStepChain = selectedRequest.step_chain &&
                      Array.isArray(selectedRequest.step_chain) &&
                      selectedRequest.step_chain.length > 0;

                    const hasReasoningTree = selectedRequest.reasoning_tree &&
                      Object.keys(selectedRequest.reasoning_tree).length > 0;

                    if (hasStepChain) {
                      return (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Target className="h-4 w-4" />
                              Decision Process Steps
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {selectedRequest.step_chain.map(
                                (stepCode: string, idx: number) => {
                                  const stepInfo = selectedRequest.step_catalog?.[stepCode] || {
                                    code: stepCode,
                                    name: stepCode,
                                    phase: "unknown",
                                    description: `Step ${stepCode}`,
                                    timestamp: "",
                                    duration_ms: 0,
                                    details: {},
                                  };

                                  const isExpanded = expandedSteps.has(stepCode);

                                  return (
                                    <div
                                      key={idx}
                                      className="border rounded-lg bg-muted/50 overflow-hidden"
                                    >
                                      <button
                                        onClick={() => toggleStep(stepCode)}
                                        className="w-full p-4 text-left hover:bg-muted/70 transition-colors"
                                      >
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                            <div className="font-mono text-xs text-muted-foreground">
                                              {stepCode}
                                            </div>
                                            <div className="font-semibold text-sm">
                                              {stepInfo.name}
                                            </div>
                                            <Badge variant="outline" className="text-xs">
                                              {stepInfo.phase}
                                            </Badge>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <div className="text-xs text-muted-foreground">
                                              {stepInfo.duration_ms.toFixed(0)}ms
                                            </div>
                                            {isExpanded ? (
                                              <ArrowUp className="h-4 w-4 text-muted-foreground" />
                                            ) : (
                                              <ArrowDown className="h-4 w-4 text-muted-foreground" />
                                            )}
                                          </div>
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                          {stepInfo.description}
                                        </div>
                                      </button>

                                      {isExpanded && (
                                        <div className="px-4 pb-4 space-y-2 border-t bg-background">
                                          {stepInfo.timestamp && (
                                            <div className="text-xs text-muted-foreground pt-2">
                                              <strong>Timestamp:</strong> {new Date(stepInfo.timestamp).toLocaleString()}
                                            </div>
                                          )}
                                          {stepInfo.details && Object.keys(stepInfo.details).length > 0 && (
                                            <div className="pt-2">
                                              <div className="text-xs font-semibold mb-1">Details:</div>
                                              <div className="p-2 bg-muted rounded border">
                                                <pre className="text-xs overflow-x-auto">
                                                  {JSON.stringify(stepInfo.details, null, 2)}
                                                </pre>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }

                    if (hasReasoningTree) {
                      return (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Target className="h-4 w-4" />
                              Reasoning Steps
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ReasoningTree
                              reasoningTree={selectedRequest.reasoning_tree}
                              expandedSteps={expandedSteps}
                              onToggleStep={toggleStep}
                            />
                          </CardContent>
                        </Card>
                      );
                    }

                    return (
                      <div className="text-center text-muted-foreground py-8">
                        No decision tree data available
                      </div>
                    );
                  })()}
                </TabsContent>

                {/* CANDIDATES TAB */}
                <TabsContent
                  value="candidates"
                  className="flex-1 overflow-y-auto space-y-4 mt-4"
                >
                  {/* Overall Scoring */}
                  {selectedRequest.scoring_details &&
                    (selectedRequest.scoring_details.certainty != null ||
                      selectedRequest.scoring_details.univocity != null ||
                      (selectedRequest.scoring_details.top_tool_scores &&
                        Object.keys(selectedRequest.scoring_details.top_tool_scores).length > 0)) && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Overall Scores
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 border rounded">
                              <div className="text-xs text-muted-foreground">
                                Certainty
                              </div>
                              <div className="text-2xl font-bold">
                                {selectedRequest.scoring_details.certainty != null &&
                                  typeof selectedRequest.scoring_details.certainty === 'number'
                                  ? (
                                    selectedRequest.scoring_details
                                      .certainty * 100
                                  ).toFixed(1)
                                  : 'N/A'}
                                {selectedRequest.scoring_details.certainty != null &&
                                  typeof selectedRequest.scoring_details.certainty === 'number'
                                  ? '%'
                                  : ''}
                              </div>
                            </div>
                            <div className="p-3 border rounded">
                              <div className="text-xs text-muted-foreground">
                                Univocity
                              </div>
                              <div className="text-2xl font-bold">
                                {selectedRequest.scoring_details.univocity != null &&
                                  typeof selectedRequest.scoring_details.univocity === 'number'
                                  ? (
                                    selectedRequest.scoring_details
                                      .univocity * 100
                                  ).toFixed(1)
                                  : 'N/A'}
                                {selectedRequest.scoring_details.univocity != null &&
                                  typeof selectedRequest.scoring_details.univocity === 'number'
                                  ? '%'
                                  : ''}
                              </div>
                            </div>
                          </div>
                          {selectedRequest.scoring_details.top_tool_scores &&
                            typeof selectedRequest.scoring_details
                              .top_tool_scores === 'object' &&
                            Object.keys(
                              selectedRequest.scoring_details.top_tool_scores
                            ).length > 0 && (
                              <div className="mt-4 pt-4 border-t">
                                <div className="text-xs text-muted-foreground mb-2">
                                  Top Tool Breakdown
                                </div>
                                <div className="space-y-2">
                                  {Object.entries(
                                    selectedRequest.scoring_details
                                      .top_tool_scores
                                  ).map(([key, value]) => (
                                    <div
                                      key={key}
                                      className="flex justify-between items-center text-sm"
                                    >
                                      <span className="text-muted-foreground">
                                        {key.replace(/_/g, ' ')}:
                                      </span>
                                      <span className="font-semibold">
                                        {(Number(value) * 100).toFixed(1)}%
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                        </CardContent>
                      </Card>
                    )}

                  {/* Candidates List */}
                  {(() => {
                    let candidates = selectedRequest.candidates_analysis;

                    if ((!candidates || !Array.isArray(candidates) || candidates.length === 0) &&
                      selectedRequest.keyword_matching?.decision_tree?.matches &&
                      Array.isArray(selectedRequest.keyword_matching.decision_tree.matches) &&
                      selectedRequest.keyword_matching.decision_tree.matches.length > 0) {
                      candidates = selectedRequest.keyword_matching.decision_tree.matches.map((match: any) => ({
                        tool_id: match.tool_id,
                        tool_name: match.tool_name || match.tool_id,
                        category: match.category || 'unknown',
                        kw_match: match.total_score || 0,
                        lexical_sim: 0,
                        schema_score: 0,
                        context_score: 0,
                        hint_score: 0,
                        certainty: match.total_score || 0,
                        is_selected: match.is_available && !match.tier_locked && match.total_score >= 0.5,
                        tier_locked: match.tier_locked,
                        is_available: match.is_available,
                        high_priority_matches: match.high_priority_matches || [],
                        low_priority_matches: match.low_priority_matches || [],
                      }));
                    }

                    if (candidates && Array.isArray(candidates) && candidates.length > 0) {
                      return candidates.map((candidate: any, idx: number) => {
                        const matchedKeywords =
                          selectedRequest.keyword_matching?.matched_tools?.[
                          candidate.tool_id
                          ] || [];

                        const allMatches = [
                          ...(candidate.high_priority_matches || []).map((m: any) => m.keyword || m),
                          ...(candidate.low_priority_matches || []).map((m: any) => m.keyword || m),
                        ];

                        return (
                          <Card
                            key={idx}
                            className={
                              candidate.is_selected
                                ? 'border-primary border-2'
                                : ''
                            }
                          >
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-semibold text-base">
                                      {candidate.tool_name || candidate.tool_id}
                                    </h4>
                                    {candidate.is_selected && (
                                      <Badge className="bg-green-500">
                                        Selected
                                      </Badge>
                                    )}
                                    {candidate.tier_locked && (
                                      <Badge variant="destructive" className="text-xs">
                                        Tier Locked
                                      </Badge>
                                    )}
                                    {candidate.is_available === false && (
                                      <Badge variant="outline" className="text-xs">
                                        Unavailable
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-2">
                                    {candidate.category}
                                  </p>
                                  {(matchedKeywords.length > 0 || allMatches.length > 0) && (
                                    <div className="flex flex-wrap gap-1 mb-2">
                                      {(matchedKeywords.length > 0 ? matchedKeywords : allMatches).map((kw: string, kwIdx: number) => (
                                        <Badge
                                          key={kwIdx}
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          {kw}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <Target className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                              </div>

                              <div className="grid grid-cols-3 gap-3 text-sm mb-4 pb-4 border-b">
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">
                                    KW Match
                                  </div>
                                  <div className="font-semibold">
                                    {candidate.kw_match != null
                                      ? (candidate.kw_match * 100).toFixed(1)
                                      : 'N/A'}
                                    {candidate.kw_match != null ? '%' : ''}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">
                                    Lexical
                                  </div>
                                  <div className="font-semibold">
                                    {candidate.lexical_sim != null
                                      ? (candidate.lexical_sim * 100).toFixed(1)
                                      : 'N/A'}
                                    {candidate.lexical_sim != null ? '%' : ''}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">
                                    Schema
                                  </div>
                                  <div className="font-semibold">
                                    {candidate.schema_score != null
                                      ? (candidate.schema_score * 100).toFixed(1)
                                      : 'N/A'}
                                    {candidate.schema_score != null ? '%' : ''}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">
                                    Context
                                  </div>
                                  <div className="font-semibold">
                                    {candidate.context_score != null
                                      ? (candidate.context_score * 100).toFixed(1)
                                      : 'N/A'}
                                    {candidate.context_score != null ? '%' : ''}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">
                                    Hint
                                  </div>
                                  <div className="font-semibold">
                                    {candidate.hint_score != null
                                      ? (candidate.hint_score * 100).toFixed(1)
                                      : 'N/A'}
                                    {candidate.hint_score != null ? '%' : ''}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">
                                    Certainty
                                  </div>
                                  <div className="font-semibold">
                                    {candidate.certainty != null
                                      ? (candidate.certainty * 100).toFixed(1)
                                      : 'N/A'}
                                    {candidate.certainty != null ? '%' : ''}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      });
                    }

                    return (
                      <div className="text-center text-muted-foreground py-8">
                        <p>No candidates found</p>
                        <p className="text-xs mt-2">
                          No matching tools were found for this request
                        </p>
                      </div>
                    );
                  })()}
                </TabsContent>

                {/* KEYWORDS TAB */}
                <TabsContent
                  value="keywords"
                  className="flex-1 overflow-y-auto space-y-3 mt-4"
                >
                  {selectedRequest.keyword_matching ? (
                    <div className="space-y-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Key className="h-4 w-4" />
                            Extracted Keywords
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {selectedRequest.keyword_matching
                              .extracted_keywords &&
                              Array.isArray(
                                selectedRequest.keyword_matching
                                  .extracted_keywords
                              ) &&
                              selectedRequest.keyword_matching.extracted_keywords
                                .length > 0 ? (
                              selectedRequest.keyword_matching.extracted_keywords.map(
                                (kw, idx) => (
                                  <Badge key={idx} variant="outline">
                                    {kw}
                                  </Badge>
                                )
                              )
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                No keywords extracted
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">
                            Matched Tools & Scores
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            {selectedRequest.keyword_matching.matched_tools &&
                              typeof selectedRequest.keyword_matching
                                .matched_tools === 'object' &&
                              Object.keys(
                                selectedRequest.keyword_matching.matched_tools
                              ).length > 0 ? (
                              Object.entries(
                                selectedRequest.keyword_matching.matched_tools
                              ).map(([toolId, keywords]) => {
                                const score = selectedRequest.keyword_matching?.scores?.[toolId];
                                return (
                                  <div
                                    key={toolId}
                                    className="border-b pb-2 last:border-0"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="font-semibold">{toolId}</div>
                                      {score !== undefined && (
                                        <Badge variant="outline" className="text-xs">
                                          {(score * 100).toFixed(1)}%
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-muted-foreground text-xs mt-1">
                                      {Array.isArray(keywords)
                                        ? keywords.join(', ')
                                        : 'None'}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                No matched tools
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {selectedRequest.keyword_matching.decision_tree && (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Target className="h-4 w-4" />
                              Decision Tree
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {selectedRequest.keyword_matching.decision_tree.steps &&
                              Array.isArray(
                                selectedRequest.keyword_matching.decision_tree.steps
                              ) &&
                              selectedRequest.keyword_matching.decision_tree.steps
                                .length > 0 ? (
                              <div className="space-y-3">
                                <div className="text-xs font-semibold text-muted-foreground mb-2">
                                  Process Steps
                                </div>
                                {selectedRequest.keyword_matching.decision_tree.steps.map(
                                  (step: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className="p-3 border rounded-lg bg-muted/50"
                                    >
                                      <div className="font-semibold text-sm mb-1">
                                        {step.step}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {step.description}
                                      </div>
                                      {step.extracted_keywords &&
                                        Array.isArray(step.extracted_keywords) &&
                                        step.extracted_keywords.length > 0 && (
                                          <div className="mt-2 flex flex-wrap gap-1">
                                            {step.extracted_keywords.map(
                                              (kw: string, kwIdx: number) => (
                                                <Badge
                                                  key={kwIdx}
                                                  variant="outline"
                                                  className="text-xs"
                                                >
                                                  {kw}
                                                </Badge>
                                              )
                                            )}
                                          </div>
                                        )}
                                      {step.matches_found !== undefined && (
                                        <div className="mt-2 text-xs">
                                          <strong>Matches found:</strong>{' '}
                                          {step.matches_found}
                                        </div>
                                      )}
                                    </div>
                                  )
                                )}
                              </div>
                            ) : null}

                            {selectedRequest.keyword_matching.decision_tree.matches &&
                              Array.isArray(
                                selectedRequest.keyword_matching.decision_tree.matches
                              ) &&
                              selectedRequest.keyword_matching.decision_tree.matches
                                .length > 0 ? (
                              <div className="space-y-3 mt-4 pt-4 border-t">
                                <div className="text-xs font-semibold text-muted-foreground mb-2">
                                  Tool Matches
                                </div>
                                {selectedRequest.keyword_matching.decision_tree.matches.map(
                                  (match: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className={`p-3 border rounded-lg ${match.is_available
                                          ? 'bg-background'
                                          : 'bg-muted/30 opacity-75'
                                        }`}
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="font-semibold text-sm">
                                          {match.tool_name || match.tool_id}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {match.tier_locked && (
                                            <Badge
                                              variant="destructive"
                                              className="text-xs"
                                            >
                                              Tier Locked
                                            </Badge>
                                          )}
                                          {!match.is_available && (
                                            <Badge variant="outline" className="text-xs">
                                              Unavailable
                                            </Badge>
                                          )}
                                          <Badge variant="outline" className="text-xs">
                                            Score: {(match.total_score * 100).toFixed(1)}%
                                          </Badge>
                                        </div>
                                      </div>
                                      <div className="text-xs text-muted-foreground mb-2">
                                        {match.category}
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                          <strong>High Priority:</strong>{' '}
                                          {match.high_priority_matches?.length || 0}
                                        </div>
                                        <div>
                                          <strong>Low Priority:</strong>{' '}
                                          {match.low_priority_matches?.length || 0}
                                        </div>
                                      </div>
                                      {match.high_priority_matches &&
                                        match.high_priority_matches.length > 0 && (
                                          <div className="mt-2">
                                            <div className="text-xs font-semibold mb-1">
                                              High Priority Matches:
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                              {match.high_priority_matches.map(
                                                (
                                                  m: any,
                                                  midx: number
                                                ) => (
                                                  <Badge
                                                    key={midx}
                                                    variant="default"
                                                    className="text-xs"
                                                  >
                                                    {m.keyword}
                                                  </Badge>
                                                )
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      {match.low_priority_matches &&
                                        match.low_priority_matches.length > 0 && (
                                          <div className="mt-2">
                                            <div className="text-xs font-semibold mb-1">
                                              Low Priority Matches:
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                              {match.low_priority_matches.map(
                                                (
                                                  m: any,
                                                  midx: number
                                                ) => (
                                                  <Badge
                                                    key={midx}
                                                    variant="outline"
                                                    className="text-xs"
                                                  >
                                                    {m.keyword}
                                                  </Badge>
                                                )
                                              )}
                                            </div>
                                          </div>
                                        )}
                                    </div>
                                  )
                                )}
                              </div>
                            ) : null}
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      No keyword matching data available
                    </div>
                  )}
                </TabsContent>

                {/* AGENT I/O TAB */}
                <TabsContent
                  value="agent-io"
                  className="flex-1 overflow-y-auto space-y-4 mt-4"
                >
                  {selectedRequest.agent_io &&
                    Array.isArray(selectedRequest.agent_io) &&
                    selectedRequest.agent_io.length > 0 ? (
                    selectedRequest.agent_io.map((io, idx) => (
                      <Card key={idx}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" />
                              {io.agent_type.charAt(0).toUpperCase() +
                                io.agent_type.slice(1)}{' '}
                              Agent
                            </CardTitle>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {io.duration_ms.toFixed(0)}ms
                              <span className="ml-2">
                                {new Date(io.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-semibold flex items-center gap-2">
                                <ArrowDown className="h-4 w-4" />
                                Input (Full Prompt)
                              </h4>
                              <Badge variant="outline" className="text-xs">
                                {io.input.prompt_length} chars
                                {io.input.model && ` • ${io.input.model}`}
                              </Badge>
                            </div>
                            <div className="p-3 bg-muted rounded border font-mono text-xs overflow-x-auto">
                              <pre className="whitespace-pre-wrap break-words">
                                {io.input.full_prompt}
                              </pre>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-semibold flex items-center gap-2">
                                <ArrowUp className="h-4 w-4" />
                                Output (Response)
                              </h4>
                              <Badge variant="outline" className="text-xs">
                                {io.output.response_length} chars
                              </Badge>
                            </div>
                            <div className="p-3 bg-muted rounded border font-mono text-xs overflow-x-auto">
                              <pre className="whitespace-pre-wrap break-words">
                                {io.output.response || '(empty)'}
                              </pre>
                            </div>
                          </div>

                          {io.metadata &&
                            Object.keys(io.metadata).length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold mb-2">
                                  Metadata
                                </h4>
                                <div className="p-3 bg-muted rounded border">
                                  <pre className="text-xs overflow-x-auto">
                                    {JSON.stringify(io.metadata, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            )}
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      No agent I/O data available
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex flex-col overflow-hidden flex-1 min-w-0">
            <CardHeader className="flex-shrink-0">
              <CardTitle>Analysis Details</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground py-12">
                <Network className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a request to view detailed analysis</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete All Analytics</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete all analytics data? This action
              cannot be undone.
              <br />
              <span className="font-semibold text-destructive mt-2 block">
                This will permanently delete {analytics.length} analytics
                records.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAll}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete All
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
