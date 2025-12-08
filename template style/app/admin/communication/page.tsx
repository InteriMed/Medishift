'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MessageSquare,
  Lock,
  Globe,
  User,
  Trash2,
  Send,
  Bug,
  Lightbulb,
  HelpCircle,
  MessageCircle,
  Shield,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Pin,
  Megaphone,
  Plus,
  ArrowUp,
  ArrowDown,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import {
  topicService,
  Topic,
  TopicCategory,
  Reply,
  ReplyCreate,
  TopicCreate,
} from '@/lib/api/topics';
import { adminService, AdminUser } from '@/lib/api/admin';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const categoryIcons: Record<TopicCategory, any> = {
  feedback: MessageCircle,
  bug_report: Bug,
  feature_request: Lightbulb,
  support: Shield,
  question: HelpCircle,
  general: MessageSquare,
};

const categoryLabels: Record<TopicCategory, string> = {
  feedback: 'Feedback',
  bug_report: 'Bug Report',
  feature_request: 'Feature Request',
  support: 'Support',
  question: 'Question',
  general: 'General',
};

const statusOptions = [
  { value: 'open', label: 'Open', icon: Clock },
  { value: 'in_progress', label: 'In Progress', icon: RefreshCw },
  { value: 'resolved', label: 'Resolved', icon: CheckCircle },
  { value: 'closed', label: 'Closed', icon: XCircle },
];

export default function AdminCommunicationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [filteredTopics, setFilteredTopics] = useState<Topic[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [replying, setReplying] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [topicToDelete, setTopicToDelete] = useState<string | null>(null);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [isCreateTeamMessageDialogOpen, setIsCreateTeamMessageDialogOpen] =
    useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [creatingTeamMessage, setCreatingTeamMessage] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isCreateDiscussionDialogOpen, setIsCreateDiscussionDialogOpen] =
    useState(false);
  const [sortBy, setSortBy] = useState<
    'response_date' | 'subscription' | 'created_at' | null
  >(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [replyData, setReplyData] = useState<Record<string, string>>({});
  const [teamMessageData, setTeamMessageData] = useState<TopicCreate>({
    title: '',
    content: '',
    category: 'general',
    target_user_id: undefined,
    is_team_message: true,
  });
  const [discussionData, setDiscussionData] = useState<TopicCreate>({
    title: '',
    content: '',
    category: 'general',
    is_team_message: false,
  });

  const loadCategories = async () => {
    try {
      const cats = await topicService.getCategories();
      setCategories(cats);
    } catch (error: any) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const usersList = await adminService.listUsers();
      setUsers(usersList);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setLoadingUsers(false);
    }
  }, [toast]);

  const loadTopics = useCallback(async () => {
    try {
      setLoading(true);
      if (activeTab === 'all') {
        const openTopics = await topicService.listTopics(undefined, true);
        const privateTopics = await topicService.listTopics(undefined, false);
        setAllTopics([...openTopics, ...privateTopics]);
      } else if (activeTab === 'open') {
        const topics = await topicService.listTopics(undefined, true);
        setAllTopics(topics);
      } else if (activeTab === 'private') {
        const topics = await topicService.listTopics(undefined, false);
        setAllTopics(topics);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load topics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [activeTab, toast]);

  const getUserPlan = (
    email?: string | null,
    username?: string | null
  ): string => {
    if (!email && !username) return 'free';
    const foundUser = users.find(
      u => (email && u.email === email) || (username && u.username === username)
    );
    return foundUser?.plan || 'free';
  };

  const getPlanPriority = (plan: string): number => {
    const planOrder: Record<string, number> = {
      enterprise: 5,
      business: 4,
      pro: 3,
      creator: 2,
      plus: 1,
      free: 0,
    };
    return planOrder[plan.toLowerCase()] || 0;
  };

  const getLatestReplyDate = (topic: Topic): Date | null => {
    if (!topic.replies || topic.replies.length === 0) return null;
    const dates = topic.replies.map(r => new Date(r.created_at));
    return new Date(Math.max(...dates.map(d => d.getTime())));
  };

  const filterTopics = useCallback(() => {
    let filtered = [...allTopics];

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(t => t.status === selectedStatus);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        t =>
          t.title.toLowerCase().includes(query) ||
          t.content.toLowerCase().includes(query) ||
          (t.user_email && t.user_email.toLowerCase().includes(query)) ||
          (t.user_username && t.user_username.toLowerCase().includes(query))
      );
    }

    if (sortBy) {
      filtered.sort((a, b) => {
        let comparison = 0;

        if (sortBy === 'response_date') {
          const aDate = getLatestReplyDate(a);
          const bDate = getLatestReplyDate(b);
          if (!aDate && !bDate) comparison = 0;
          else if (!aDate) comparison = 1;
          else if (!bDate) comparison = -1;
          else comparison = aDate.getTime() - bDate.getTime();
        } else if (sortBy === 'subscription') {
          const aPlan = getUserPlan(a.user_email, a.user_username);
          const bPlan = getUserPlan(b.user_email, b.user_username);
          comparison = getPlanPriority(aPlan) - getPlanPriority(bPlan);
        } else if (sortBy === 'created_at') {
          comparison =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }

        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    setFilteredTopics(filtered);
  }, [
    allTopics,
    selectedCategory,
    selectedStatus,
    searchQuery,
    sortBy,
    sortDirection,
    users,
    getUserPlan,
  ]);

  useEffect(() => {
    loadCategories();
    loadTopics();
    loadUsers();
    if (isCreateTeamMessageDialogOpen && activeTab !== 'open') {
      loadUsers();
    }
  }, [activeTab, isCreateTeamMessageDialogOpen, loadTopics, loadUsers]);

  useEffect(() => {
    filterTopics();
  }, [
    allTopics,
    selectedCategory,
    selectedStatus,
    searchQuery,
    activeTab,
    sortBy,
    sortDirection,
    filterTopics,
  ]);

  const handleSort = (
    field: 'response_date' | 'subscription' | 'created_at'
  ) => {
    if (sortBy === field) {
      if (sortDirection === 'desc') {
        setSortDirection('asc');
      } else {
        setSortBy(null);
        setSortDirection('desc');
      }
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
  };

  const handleReply = async (topicId: string) => {
    const content = replyData[topicId]?.trim();
    if (!content) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a reply',
        variant: 'destructive',
      });
      return;
    }

    try {
      setReplying(topicId);
      await topicService.createReply(topicId, { content });
      toast({
        title: 'Success!',
        description: 'Your reply has been posted as admin',
      });
      setReplyData({ ...replyData, [topicId]: '' });
      loadTopics();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to post reply',
        variant: 'destructive',
      });
    } finally {
      setReplying(null);
    }
  };

  const handleUpdateStatus = async (topicId: string, status: string) => {
    try {
      setUpdatingStatus(topicId);
      await topicService.updateTopic(topicId, { status });
      toast({
        title: 'Success',
        description: 'Topic status updated',
      });
      loadTopics();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive',
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleTogglePin = async (topicId: string, currentPinState: boolean) => {
    try {
      setUpdatingStatus(topicId);
      await topicService.updateTopic(topicId, { is_pinned: !currentPinState });
      toast({
        title: 'Success',
        description: currentPinState ? 'Topic unpinned' : 'Topic pinned',
      });
      loadTopics();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update pin status',
        variant: 'destructive',
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleToggleTeamMessage = async (
    topicId: string,
    currentTeamMessageState: boolean
  ) => {
    try {
      setUpdatingStatus(topicId);
      await topicService.updateTopic(topicId, {
        is_team_message: !currentTeamMessageState,
      });
      toast({
        title: 'Success',
        description: currentTeamMessageState
          ? 'Removed team message flag'
          : 'Marked as team message',
      });
      loadTopics();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update team message status',
        variant: 'destructive',
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleDeleteTopic = async () => {
    if (!topicToDelete) return;

    try {
      await topicService.deleteTopic(topicToDelete);
      toast({
        title: 'Success',
        description: 'Topic deleted successfully',
      });
      setIsDeleteDialogOpen(false);
      setTopicToDelete(null);
      loadTopics();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete topic',
        variant: 'destructive',
      });
    }
  };

  const handleCreateTeamMessage = async () => {
    if (!teamMessageData.title.trim() || !teamMessageData.content.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in both title and content',
        variant: 'destructive',
      });
      return;
    }

    const isPublicMessage = activeTab === 'open';
    const messageData = {
      ...teamMessageData,
      is_team_message: !isPublicMessage,
      target_user_id: isPublicMessage
        ? undefined
        : teamMessageData.target_user_id,
    };

    if (!isPublicMessage && !messageData.target_user_id) {
      toast({
        title: 'Validation Error',
        description: 'Please select a user',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreatingTeamMessage(true);
      await topicService.createTopic(messageData);
      toast({
        title: 'Success!',
        description: isPublicMessage
          ? 'Public message created successfully'
          : 'Team message created successfully',
      });
      setIsCreateTeamMessageDialogOpen(false);
      setTeamMessageData({
        title: '',
        content: '',
        category: 'general',
        target_user_id: undefined,
        is_team_message: true,
      });
      setUserSearchQuery('');
      loadTopics();
    } catch (error: any) {
      toast({
        title: 'Error',
        description:
          error.message ||
          (isPublicMessage
            ? 'Failed to create public message'
            : 'Failed to create team message'),
        variant: 'destructive',
      });
    } finally {
      setCreatingTeamMessage(false);
    }
  };

  const toggleTopicExpansion = (topicId: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicId)) {
      newExpanded.delete(topicId);
    } else {
      newExpanded.add(topicId);
    }
    setExpandedTopics(newExpanded);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    const statusOption = statusOptions.find(s => s.value === status);
    return statusOption ? statusOption.icon : Clock;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'default';
      case 'in_progress':
        return 'secondary';
      case 'resolved':
        return 'default';
      case 'closed':
        return 'outline';
      default:
        return 'default';
    }
  };

  const filteredUsers = users.filter(u => {
    if (!userSearchQuery.trim()) return true;
    const query = userSearchQuery.toLowerCase();
    return (
      u.email?.toLowerCase().includes(query) ||
      u.username?.toLowerCase().includes(query) ||
      u.id.toLowerCase().includes(query)
    );
  });

  const handleCreateDiscussion = async () => {
    if (!discussionData.title.trim() || !discussionData.content.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in both title and content',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreatingTeamMessage(true);
      await topicService.createTopic(discussionData);
      toast({
        title: 'Success!',
        description: 'Discussion created successfully',
      });
      setIsCreateDiscussionDialogOpen(false);
      setDiscussionData({
        title: '',
        content: '',
        category: 'general',
        is_team_message: false,
      });
      loadTopics();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create discussion',
        variant: 'destructive',
      });
    } finally {
      setCreatingTeamMessage(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
            <MessageSquare className="w-8 h-8" />
            Communication Management
          </h1>
          <p className="text-muted-foreground">
            Manage all topics, replies, and support requests
          </p>
        </div>

        <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="flex items-start gap-3">
            <Megaphone className="w-5 h-5 text-primary mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">
                Team Communication
              </h3>
              <p className="text-sm text-muted-foreground">
                Use team messages to send private communications to specific
                users. Public messages are visible to all users in the
                community.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="all">All Topics</TabsTrigger>
            <TabsTrigger value="open" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Public
            </TabsTrigger>
            <TabsTrigger value="private" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Private
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            {activeTab === 'open' && (
              <Dialog
                open={isCreateDiscussionDialogOpen}
                onOpenChange={setIsCreateDiscussionDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Discussion
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Create Public Discussion</DialogTitle>
                    <DialogDescription>
                      Create a new public discussion topic
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2 p-3 bg-muted rounded-lg">
                      <label className="text-sm font-medium text-muted-foreground">
                        From (Admin)
                      </label>
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        <span className="font-medium">
                          {user?.username || user?.email || 'Admin User'}
                        </span>
                        <Badge variant="default" className="ml-2">
                          Admin
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Category</label>
                      <Select
                        value={discussionData.category}
                        onValueChange={value =>
                          setDiscussionData({
                            ...discussionData,
                            category: value as TopicCategory,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="z-[100]" position="popper">
                          {categories.length > 0 ? (
                            categories.map(cat => {
                              const Icon = categoryIcons[cat as TopicCategory];
                              return (
                                <SelectItem key={cat} value={cat}>
                                  <div className="flex items-center gap-2">
                                    {Icon && <Icon className="w-4 h-4" />}
                                    {categoryLabels[cat as TopicCategory] ||
                                      cat}
                                  </div>
                                </SelectItem>
                              );
                            })
                          ) : (
                            <SelectItem value="general" disabled>
                              Loading categories...
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Title</label>
                      <Input
                        placeholder="Enter discussion title..."
                        value={discussionData.title}
                        onChange={e =>
                          setDiscussionData({
                            ...discussionData,
                            title: e.target.value,
                          })
                        }
                        maxLength={255}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Content</label>
                      <Textarea
                        placeholder="Write your discussion..."
                        value={discussionData.content}
                        onChange={e =>
                          setDiscussionData({
                            ...discussionData,
                            content: e.target.value,
                          })
                        }
                        rows={6}
                        className="resize-none"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setIsCreateDiscussionDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateDiscussion}
                        disabled={creatingTeamMessage}
                      >
                        {creatingTeamMessage
                          ? 'Creating...'
                          : 'Create Discussion'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            <Dialog
              open={isCreateTeamMessageDialogOpen}
              onOpenChange={open => {
                setIsCreateTeamMessageDialogOpen(open);
                if (!open) {
                  setUserSearchQuery('');
                }
              }}
            >
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  {activeTab === 'open'
                    ? 'Send a public announcement'
                    : 'New Team Message'}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>
                    {activeTab === 'open'
                      ? 'Send Public Message'
                      : 'Create Team Message'}
                  </DialogTitle>
                  <DialogDescription>
                    {activeTab === 'open'
                      ? 'Send a public message visible to all users'
                      : 'Send a message to a specific user as the team'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2 p-3 bg-muted rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">
                      From (Admin)
                    </label>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      <span className="font-medium">
                        {user?.username || user?.email || 'Admin User'}
                      </span>
                      <Badge variant="default" className="ml-2">
                        Admin
                      </Badge>
                    </div>
                  </div>
                  {activeTab !== 'open' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Recipient User
                      </label>
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <Input
                            placeholder="Search users..."
                            value={userSearchQuery}
                            onChange={e => setUserSearchQuery(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        <Select
                          value={teamMessageData.target_user_id || ''}
                          onValueChange={value => {
                            setTeamMessageData({
                              ...teamMessageData,
                              target_user_id: value,
                            });
                            setUserSearchQuery('');
                          }}
                          disabled={loadingUsers}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select recipient user" />
                          </SelectTrigger>
                          <SelectContent className="z-[100]" position="popper">
                            {loadingUsers ? (
                              <SelectItem value="loading" disabled>
                                Loading users...
                              </SelectItem>
                            ) : filteredUsers.length > 0 ? (
                              filteredUsers.map(user => (
                                <SelectItem key={user.id} value={user.id}>
                                  <div className="flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    {user.username || user.email}
                                    {user.is_admin && (
                                      <Badge variant="outline" className="ml-2">
                                        Admin
                                      </Badge>
                                    )}
                                    <Badge
                                      variant="outline"
                                      className="ml-2 text-xs"
                                    >
                                      {user.plan?.toUpperCase() || 'FREE'}
                                    </Badge>
                                  </div>
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-users" disabled>
                                {userSearchQuery
                                  ? 'No users found matching search'
                                  : 'No users found'}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Select
                      value={teamMessageData.category}
                      onValueChange={value =>
                        setTeamMessageData({
                          ...teamMessageData,
                          category: value as TopicCategory,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="z-[100]" position="popper">
                        {categories.length > 0 ? (
                          categories.map(cat => {
                            const Icon = categoryIcons[cat as TopicCategory];
                            return (
                              <SelectItem key={cat} value={cat}>
                                <div className="flex items-center gap-2">
                                  {Icon && <Icon className="w-4 h-4" />}
                                  {categoryLabels[cat as TopicCategory] || cat}
                                </div>
                              </SelectItem>
                            );
                          })
                        ) : (
                          <SelectItem value="general" disabled>
                            Loading categories...
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      placeholder="Enter message title..."
                      value={teamMessageData.title}
                      onChange={e =>
                        setTeamMessageData({
                          ...teamMessageData,
                          title: e.target.value,
                        })
                      }
                      maxLength={255}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Content</label>
                    <Textarea
                      placeholder="Write your message..."
                      value={teamMessageData.content}
                      onChange={e =>
                        setTeamMessageData({
                          ...teamMessageData,
                          content: e.target.value,
                        })
                      }
                      rows={6}
                      className="resize-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateTeamMessageDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateTeamMessage}
                      disabled={creatingTeamMessage}
                    >
                      {creatingTeamMessage
                        ? 'Creating...'
                        : 'Create Team Message'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button onClick={loadTopics} disabled={loading} variant="outline">
              <RefreshCw
                className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search topics..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => {
                const Icon = categoryIcons[cat as TopicCategory];
                return (
                  <SelectItem key={cat} value={cat}>
                    <div className="flex items-center gap-2">
                      {Icon && <Icon className="w-4 h-4" />}
                      {categoryLabels[cat as TopicCategory] || cat}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statusOptions.map(status => {
                const Icon = status.icon;
                return (
                  <SelectItem key={status.value} value={status.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {status.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <Button
            variant={sortBy === 'response_date' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort('response_date')}
            className="flex items-center gap-1"
          >
            Response Date
            {sortBy === 'response_date' &&
              (sortDirection === 'asc' ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              ))}
          </Button>
          <Button
            variant={sortBy === 'subscription' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort('subscription')}
            className="flex items-center gap-1"
          >
            Subscription
            {sortBy === 'subscription' &&
              (sortDirection === 'asc' ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              ))}
          </Button>
          <Button
            variant={sortBy === 'created_at' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort('created_at')}
            className="flex items-center gap-1"
          >
            Date Created
            {sortBy === 'created_at' &&
              (sortDirection === 'asc' ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              ))}
          </Button>
        </div>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading topics...</p>
            </div>
          ) : filteredTopics.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No topics found</h3>
                <p className="text-muted-foreground">
                  {searchQuery
                    ? 'Try adjusting your search filters'
                    : 'No topics match the current filters'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredTopics.map(topic => {
                const CategoryIcon = categoryIcons[topic.category];
                const isExpanded = expandedTopics.has(topic.id);
                const replies = topic.replies || [];
                const StatusIcon = getStatusIcon(topic.status);

                return (
                  <Card
                    key={topic.id}
                    className={`hover:shadow-md transition-shadow ${
                      topic.is_team_message
                        ? 'border-2 border-primary bg-primary/5'
                        : ''
                    } ${topic.is_pinned ? 'border-l-4 border-l-yellow-500' : ''}`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {topic.is_pinned && (
                              <Badge
                                variant="default"
                                className="bg-yellow-500 hover:bg-yellow-600"
                              >
                                <Pin className="w-3 h-3 mr-1" />
                                Pinned
                              </Badge>
                            )}
                            {topic.is_team_message && (
                              <Badge variant="default" className="bg-primary">
                                <Megaphone className="w-3 h-3 mr-1" />
                                Team Message
                              </Badge>
                            )}
                            {CategoryIcon && (
                              <CategoryIcon className="w-4 h-4" />
                            )}
                            <CardTitle
                              className={`text-xl ${topic.is_team_message ? 'text-primary font-bold' : ''}`}
                            >
                              {topic.title}
                            </CardTitle>
                            <Badge
                              variant={topic.is_open ? 'default' : 'secondary'}
                            >
                              {topic.is_open ? (
                                <>
                                  <Globe className="w-3 h-3 mr-1" />
                                  Open
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3 h-3 mr-1" />
                                  Private
                                </>
                              )}
                            </Badge>
                            <Badge variant="outline">
                              {categoryLabels[topic.category] || topic.category}
                            </Badge>
                            <Badge
                              variant={getStatusColor(topic.status) as any}
                            >
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusOptions.find(s => s.value === topic.status)
                                ?.label || topic.status}
                            </Badge>
                          </div>
                          <CardDescription className="flex items-center gap-2 mt-2 flex-wrap">
                            <User className="w-4 h-4" />
                            {topic.user_username ||
                              topic.user_email ||
                              'Anonymous'}
                            <span className="text-muted-foreground">•</span>
                            <Badge variant="outline" className="text-xs">
                              {getUserPlan(
                                topic.user_email,
                                topic.user_username
                              ).toUpperCase()}
                            </Badge>
                            <span className="text-muted-foreground">•</span>
                            {formatDate(topic.created_at)}
                            {replies.length > 0 && (
                              <>
                                <span className="text-muted-foreground">•</span>
                                <span>
                                  {replies.length}{' '}
                                  {replies.length === 1 ? 'reply' : 'replies'}
                                </span>
                              </>
                            )}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant={topic.is_pinned ? 'default' : 'outline'}
                            size="sm"
                            onClick={() =>
                              handleTogglePin(topic.id, topic.is_pinned)
                            }
                            disabled={updatingStatus === topic.id}
                            className={
                              topic.is_pinned
                                ? 'bg-yellow-500 hover:bg-yellow-600'
                                : ''
                            }
                            title={
                              topic.is_pinned ? 'Unpin topic' : 'Pin topic'
                            }
                          >
                            <Pin className="w-4 h-4" />
                          </Button>
                          <Button
                            variant={
                              topic.is_team_message ? 'default' : 'outline'
                            }
                            size="sm"
                            onClick={() =>
                              handleToggleTeamMessage(
                                topic.id,
                                topic.is_team_message
                              )
                            }
                            disabled={updatingStatus === topic.id}
                            title={
                              topic.is_team_message
                                ? 'Remove team message flag'
                                : 'Mark as team message'
                            }
                          >
                            <Megaphone className="w-4 h-4" />
                          </Button>
                          <Select
                            value={topic.status}
                            onValueChange={value =>
                              handleUpdateStatus(topic.id, value)
                            }
                            disabled={updatingStatus === topic.id}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map(status => {
                                const Icon = status.icon;
                                return (
                                  <SelectItem
                                    key={status.value}
                                    value={status.value}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Icon className="w-4 h-4" />
                                      {status.label}
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setTopicToDelete(topic.id);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-foreground whitespace-pre-wrap mb-4">
                        {topic.content}
                      </p>

                      {replies.length > 0 && (
                        <div className="mt-4 space-y-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleTopicExpansion(topic.id)}
                            className="text-muted-foreground"
                          >
                            {isExpanded ? 'Hide' : 'Show'} {replies.length}{' '}
                            {replies.length === 1 ? 'reply' : 'replies'}
                          </Button>

                          {isExpanded && (
                            <div className="space-y-3 pl-4 border-l-2 border-muted">
                              {replies.map(reply => (
                                <div key={reply.id} className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    {reply.is_admin_reply && (
                                      <Badge
                                        variant="default"
                                        className="text-xs"
                                      >
                                        <Shield className="w-3 h-3 mr-1" />
                                        Admin
                                      </Badge>
                                    )}
                                    <span className="text-sm font-medium">
                                      {reply.user_username ||
                                        reply.user_email ||
                                        'Anonymous'}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {formatDate(reply.created_at)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-foreground whitespace-pre-wrap">
                                    {reply.content}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {!topic.is_team_message && (
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center gap-2 mb-2">
                            <Shield className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              Reply as Admin
                            </span>
                          </div>
                          <Textarea
                            placeholder="Write an admin reply..."
                            value={replyData[topic.id] || ''}
                            onChange={e =>
                              setReplyData({
                                ...replyData,
                                [topic.id]: e.target.value,
                              })
                            }
                            rows={3}
                            className="resize-none"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleReply(topic.id)}
                            disabled={replying === topic.id}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            {replying === topic.id
                              ? 'Posting...'
                              : 'Reply as Admin'}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Topic</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this topic? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTopicToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTopic}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
