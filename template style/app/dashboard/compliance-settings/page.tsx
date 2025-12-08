'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    ArrowLeft,
    Github,
    GitBranch,
    Shield,
    Settings as SettingsIcon,
    CheckCircle2,
    X,
    Plus,
    Trash2,
} from 'lucide-react';
import { Settings } from '@/types/compliance';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/ui/use-toast';

export default function ComplianceSettingsPage() {
    const { toast } = useToast();
    const [settings, setSettings] = useState<Settings>({
        integrations: {
            github_installed: false,
            gitlab_installed: false,
            block_prs_on_high_risk: false,
        },
        policy_engine: {
            ignored_paths: ['tests/', 'experiments/'],
            allowed_libraries: [],
        },
        llm_classifier: {
            enabled: true,
            reclassify_unknown: false,
        },
    });

    const [newIgnoredPath, setNewIgnoredPath] = useState('');
    const [newAllowedLibrary, setNewAllowedLibrary] = useState('');

    const handleToggle = (section: keyof Settings, field: string, value: boolean) => {
        setSettings((prev) => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value,
            },
        }));
        toast({
            title: 'Success',
            description: 'Setting updated',
        });
    };

    const addIgnoredPath = () => {
        if (newIgnoredPath.trim()) {
            setSettings((prev) => ({
                ...prev,
                policy_engine: {
                    ...prev.policy_engine,
                    ignored_paths: [...prev.policy_engine.ignored_paths, newIgnoredPath.trim()],
                },
            }));
            setNewIgnoredPath('');
            toast({
                title: 'Success',
                description: 'Ignored path added',
            });
        }
    };

    const removeIgnoredPath = (path: string) => {
        setSettings((prev) => ({
            ...prev,
            policy_engine: {
                ...prev.policy_engine,
                ignored_paths: prev.policy_engine.ignored_paths.filter((p) => p !== path),
            },
        }));
        toast({
            title: 'Success',
            description: 'Ignored path removed',
        });
    };

    const addAllowedLibrary = () => {
        if (newAllowedLibrary.trim()) {
            setSettings((prev) => ({
                ...prev,
                policy_engine: {
                    ...prev.policy_engine,
                    allowed_libraries: [...prev.policy_engine.allowed_libraries, newAllowedLibrary.trim()],
                },
            }));
            setNewAllowedLibrary('');
            toast({
                title: 'Success',
                description: 'Allowed library added',
            });
        }
    };

    const removeAllowedLibrary = (lib: string) => {
        setSettings((prev) => ({
            ...prev,
            policy_engine: {
                ...prev.policy_engine,
                allowed_libraries: prev.policy_engine.allowed_libraries.filter((l) => l !== lib),
            },
        }));
        toast({
            title: 'Success',
            description: 'Allowed library removed',
        });
    };

    const handleReclassify = () => {
        toast({
            title: 'Info',
            description: 'Re-classification triggered. This will scan for unknown libraries.',
        });
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Compliance Settings</h1>
                    <p className="text-muted-foreground">
                        Fine-tune the scanner and configure compliance policies
                    </p>
                </div>
            </div>

            <Tabs defaultValue="integrations" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="integrations">Integrations</TabsTrigger>
                    <TabsTrigger value="policy">Policy Engine</TabsTrigger>
                    <TabsTrigger value="classifier">LLM Classifier</TabsTrigger>
                </TabsList>

                <TabsContent value="integrations" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Github className="w-5 h-5" />
                                GitHub Integration
                            </CardTitle>
                            <CardDescription>
                                Connect your GitHub repositories for automated scanning
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Github className="w-6 h-6" />
                                    <div>
                                        <p className="font-medium">GitHub App</p>
                                        <p className="text-sm text-muted-foreground">
                                            Install the GitHub App to enable repository scanning
                                        </p>
                                    </div>
                                </div>
                                {settings.integrations.github_installed ? (
                                    <Badge className="bg-green-600">
                                        <CheckCircle2 className="w-4 h-4 mr-1" />
                                        Installed
                                    </Badge>
                                ) : (
                                    <Button asChild>
                                        <a href="/api/github/login">
                                            Install GitHub App
                                        </a>
                                    </Button>
                                )}
                            </div>

                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-3">
                                    <GitBranch className="w-6 h-6" />
                                    <div>
                                        <p className="font-medium">GitLab Integration</p>
                                        <p className="text-sm text-muted-foreground">
                                            Connect GitLab repositories (Coming soon)
                                        </p>
                                    </div>
                                </div>
                                <Badge variant="outline">Coming Soon</Badge>
                            </div>

                            <div className="p-4 border rounded-lg bg-muted/50">
                                <div className="flex items-center justify-between mb-2">
                                    <Label htmlFor="block-prs" className="font-medium">
                                        Block PRs on High Risk?
                                    </Label>
                                    <Switch
                                        id="block-prs"
                                        checked={settings.integrations.block_prs_on_high_risk}
                                        onCheckedChange={(checked) =>
                                            handleToggle('integrations', 'block_prs_on_high_risk', checked)
                                        }
                                    />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Automatically block pull requests that introduce high-risk AI libraries
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="policy" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="w-5 h-5" />
                                Policy Engine
                            </CardTitle>
                            <CardDescription>
                                Configure which paths and libraries to ignore or allow
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <Label className="text-base font-semibold mb-3 block">
                                    Ignored Paths
                                </Label>
                                <p className="text-sm text-muted-foreground mb-3">
                                    Paths to exclude from scanning (e.g., tests/, experiments/)
                                </p>
                                <div className="space-y-2 mb-3">
                                    {settings.policy_engine.ignored_paths.map((path) => (
                                        <div
                                            key={path}
                                            className="flex items-center justify-between p-2 border rounded-lg"
                                        >
                                            <code className="text-sm">{path}</code>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => removeIgnoredPath(path)}
                                            >
                                                <Trash2 className="w-4 h-4 text-red-600" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="e.g., tests/, experiments/"
                                        value={newIgnoredPath}
                                        onChange={(e) => setNewIgnoredPath(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') addIgnoredPath();
                                        }}
                                    />
                                    <Button onClick={addIgnoredPath}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Path
                                    </Button>
                                </div>
                            </div>

                            <div>
                                <Label className="text-base font-semibold mb-3 block">
                                    Allowed Libraries
                                </Label>
                                <p className="text-sm text-muted-foreground mb-3">
                                    Whitelist specific internal tools or approved libraries
                                </p>
                                <div className="space-y-2 mb-3">
                                    {settings.policy_engine.allowed_libraries.length === 0 ? (
                                        <p className="text-sm text-muted-foreground italic">
                                            No allowed libraries configured
                                        </p>
                                    ) : (
                                        settings.policy_engine.allowed_libraries.map((lib) => (
                                            <div
                                                key={lib}
                                                className="flex items-center justify-between p-2 border rounded-lg"
                                            >
                                                <code className="text-sm">{lib}</code>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => removeAllowedLibrary(lib)}
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-600" />
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="e.g., internal-ai-tool"
                                        value={newAllowedLibrary}
                                        onChange={(e) => setNewAllowedLibrary(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') addAllowedLibrary();
                                        }}
                                    />
                                    <Button onClick={addAllowedLibrary}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Library
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="classifier" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <SettingsIcon className="w-5 h-5" />
                                LLM Classifier Settings
                            </CardTitle>
                            <CardDescription>
                                Configure the Global LLM classifier for unknown libraries
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 border rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <Label htmlFor="llm-enabled" className="font-medium">
                                        Enable LLM Classification
                                    </Label>
                                    <Switch
                                        id="llm-enabled"
                                        checked={settings.llm_classifier.enabled}
                                        onCheckedChange={(checked) =>
                                            handleToggle('llm_classifier', 'enabled', checked)
                                        }
                                    />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Use Global LLM to classify unknown libraries and detect AI usage patterns
                                </p>
                            </div>

                            <div className="p-4 border rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <Label htmlFor="reclassify" className="font-medium">
                                        Re-classify Unknown Libraries
                                    </Label>
                                    <Switch
                                        id="reclassify"
                                        checked={settings.llm_classifier.reclassify_unknown}
                                        onCheckedChange={(checked) =>
                                            handleToggle('llm_classifier', 'reclassify_unknown', checked)
                                        }
                                    />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Automatically re-classify libraries that are currently marked as unknown
                                </p>
                            </div>

                            <div className="p-4 border rounded-lg bg-muted/50">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <p className="font-medium mb-1">Manual Re-classification</p>
                                        <p className="text-sm text-muted-foreground">
                                            Trigger the Global LLM to re-classify unknown libraries if a new niche library appears
                                        </p>
                                    </div>
                                </div>
                                <Button onClick={handleReclassify} variant="outline">
                                    Re-classify Unknown Libraries
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

