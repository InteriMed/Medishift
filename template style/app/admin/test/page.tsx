'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RefreshCw,
  Send,
  Loader2,
  FileText,
  TestTube,
  Sparkles,
  Image as ImageIcon,
  Video,
  Type,
  Images,
} from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/ui/use-toast';

interface Prompt {
  key: string;
  name: string;
  has_data_schema: boolean;
  has_roleplay: boolean;
}

interface PromptData {
  [key: string]: any;
}

export default function AdminTestPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('agent');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedPromptKey, setSelectedPromptKey] = useState<string>('');
  const [promptData, setPromptData] = useState<PromptData | null>(null);
  const [editedPrompt, setEditedPrompt] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testInput, setTestInput] = useState<string>('');

  useEffect(() => {
    const saved = localStorage.getItem('admin_test_active_tab');
    if (saved && ['agent', 'generations'].includes(saved)) {
      setActiveTab(saved);
    }
  }, []);

  const loadPrompts = async () => {
    try {
      setLoadingPrompts(true);
      const response = await fetch('/api/chatbot/prompts');
      if (!response.ok) {
        if (response.status === 404) {
          setPrompts([]);
          return;
        }
        throw new Error('Failed to load prompts');
      }
      const data = await response.json();
      if (data.success) {
        setPrompts(data.prompts || []);
      } else {
        setPrompts([]);
      }
    } catch (error: any) {
      console.warn('Failed to load prompts:', error);
      setPrompts([]);
    } finally {
      setLoadingPrompts(false);
    }
  };

  const loadPrompt = useCallback(
    async (promptKey: string) => {
      try {
        setLoadingPrompt(true);
        const response = await fetch(`/api/chatbot/prompts/${promptKey}`);
        if (!response.ok) {
          throw new Error('Failed to load prompt');
        }
        const data = await response.json();
        if (data.success && data.prompt) {
          setPromptData(data.prompt);

          let promptText = '';

          if (data.prompt.prompt) {
            const promptArray = data.prompt.prompt;
            promptText = Array.isArray(promptArray)
              ? promptArray.join('\n')
              : typeof promptArray === 'string'
                ? promptArray
                : JSON.stringify(promptArray, null, 2);
          } else {
            const parts: string[] = [];

            if (data.prompt.roleplay && Array.isArray(data.prompt.roleplay)) {
              parts.push('ROLEPLAY:');
              parts.push(data.prompt.roleplay.join('\n'));
              parts.push('');
            }

            if (data.prompt.introduction) {
              parts.push('INTRODUCTION:');
              parts.push(data.prompt.introduction);
              parts.push('');
            }

            if (data.prompt.data_schema_description) {
              parts.push('DATA SCHEMA DESCRIPTION:');
              parts.push(data.prompt.data_schema_description);
              parts.push('');
            }

            if (
              data.prompt.valid_examples &&
              Array.isArray(data.prompt.valid_examples) &&
              data.prompt.valid_examples.length > 0
            ) {
              parts.push('VALID EXAMPLES:');
              parts.push(data.prompt.valid_examples.join('\n'));
              parts.push('');
            }

            if (
              data.prompt.invalid_examples &&
              Array.isArray(data.prompt.invalid_examples) &&
              data.prompt.invalid_examples.length > 0
            ) {
              parts.push('INVALID EXAMPLES:');
              parts.push(data.prompt.invalid_examples.join('\n'));
              parts.push('');
            }

            if (
              data.prompt.examples_you_should_provide_the_user_with &&
              Array.isArray(
                data.prompt.examples_you_should_provide_the_user_with
              ) &&
              data.prompt.examples_you_should_provide_the_user_with.length > 0
            ) {
              parts.push('EXAMPLES TO PROVIDE USER:');
              parts.push(
                data.prompt.examples_you_should_provide_the_user_with.join('\n')
              );
              parts.push('');
            }

            if (data.prompt.data_schema) {
              parts.push('DATA SCHEMA:');
              parts.push(JSON.stringify(data.prompt.data_schema, null, 2));
              parts.push('');
            }

            if (parts.length === 0) {
              promptText = JSON.stringify(data.prompt, null, 2);
            } else {
              promptText = parts.join('\n');
            }
          }

          setEditedPrompt(promptText);
        } else {
          throw new Error('Failed to load prompt');
        }
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to load prompt',
          variant: 'destructive',
        });
      } finally {
        setLoadingPrompt(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    loadPrompts();
  }, []);

  useEffect(() => {
    if (selectedPromptKey) {
      loadPrompt(selectedPromptKey);
    }
  }, [selectedPromptKey, loadPrompt]);

  const handleTestPrompt = async () => {
    if (!selectedPromptKey || !editedPrompt.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please select a prompt and ensure it has content',
        variant: 'destructive',
      });
      return;
    }

    try {
      setTesting(true);
      setTestResult(null);

      const promptText = editedPrompt.trim();

      let finalPrompt = promptText;
      if (testInput.trim()) {
        finalPrompt = `${promptText}\n\nUser Input: ${testInput.trim()}`;
      }

      const requestBody = {
        prompt: finalPrompt,
        json_output: promptData?.data_schema ? true : false,
        model: 'qwen-omni',
      };

      const response = await fetch('/api/v1/integrations/ai-providers/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`LLM request failed: ${response.status} ${errorData}`);
      }

      const result = await response.json();
      setTestResult(result);

      toast({
        title: 'Success',
        description: 'Prompt tested successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to test prompt',
        variant: 'destructive',
      });
      setTestResult({ error: error.message || 'Failed to test prompt' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
          <TestTube className="w-8 h-8" />
          Test Page
        </h1>
        <p className="text-muted-foreground">
          Test and debug various system components
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={value => {
          setActiveTab(value);
          if (typeof window !== 'undefined') {
            localStorage.setItem('admin_test_active_tab', value);
          }
        }}
        className="w-full"
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="agent">Agent Testing</TabsTrigger>
          <TabsTrigger value="generations">Generations</TabsTrigger>
        </TabsList>

        <TabsContent value="agent" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Agent Prompt Testing</CardTitle>
                  <CardDescription>
                    Select a prompt from prompts.json, edit it, and test it with
                    the LLM
                  </CardDescription>
                </div>
                <Button
                  onClick={loadPrompts}
                  disabled={loadingPrompts}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${loadingPrompts ? 'animate-spin' : ''}`}
                  />
                  Refresh List
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Prompt</label>
                <Select
                  value={selectedPromptKey}
                  onValueChange={setSelectedPromptKey}
                  disabled={loadingPrompts}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a prompt to test..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background/95 backdrop-blur-sm border-border/50">
                    {prompts.length === 0 ? (
                      <SelectItem value="none" disabled>
                        {loadingPrompts
                          ? 'Loading prompts...'
                          : 'No prompts available'}
                      </SelectItem>
                    ) : (
                      prompts.map(prompt => (
                        <SelectItem key={prompt.key} value={prompt.key}>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            {prompt.name}
                            {prompt.has_data_schema && (
                              <span className="text-xs text-muted-foreground">
                                (has schema)
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {loadingPrompt && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">
                    Loading prompt...
                  </span>
                </div>
              )}

              {promptData && !loadingPrompt && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">
                        Prompt Content (Editable)
                      </label>
                      <span className="text-xs text-muted-foreground">
                        {editedPrompt.split('\n').length} lines
                      </span>
                    </div>
                    <Textarea
                      value={editedPrompt}
                      onChange={e => setEditedPrompt(e.target.value)}
                      className="font-mono text-sm min-h-[300px]"
                      placeholder="Prompt content will appear here..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Test Input (Optional)
                    </label>
                    <Textarea
                      value={testInput}
                      onChange={e => setTestInput(e.target.value)}
                      placeholder="Enter test input or user message..."
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleTestPrompt}
                      disabled={testing || !editedPrompt.trim()}
                      className="flex items-center gap-2"
                    >
                      {testing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Test Prompt
                        </>
                      )}
                    </Button>
                    {promptData.data_schema && (
                      <span className="text-xs text-muted-foreground">
                        JSON output mode enabled (data_schema detected)
                      </span>
                    )}
                  </div>
                </>
              )}

              {testResult && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Test Results</label>
                  <Card className="bg-muted">
                    <CardContent className="pt-6">
                      <pre className="text-xs overflow-auto max-h-[500px] whitespace-pre-wrap">
                        {JSON.stringify(testResult, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              )}

              {!promptData && !loadingPrompt && selectedPromptKey && (
                <div className="text-center py-8 text-muted-foreground">
                  No prompt data available
                </div>
              )}

              {!selectedPromptKey && (
                <div className="text-center py-8 text-muted-foreground">
                  Select a prompt to begin testing
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generations" className="mt-6">
          <GenerationsTest />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GenerationsTest() {
  const { toast } = useToast();
  const [generationType, setGenerationType] = useState<
    'text' | 'image' | 'video'
  >('text');
  const [models, setModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [loadingModels, setLoadingModels] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [polling, setPolling] = useState(false);

  const [prompt, setPrompt] = useState<string>('');
  const [width, setWidth] = useState<number>(1024);
  const [height, setHeight] = useState<number>(1024);
  const [steps, setSteps] = useState<number>(20);
  const [guidance, setGuidance] = useState<number>(7.5);
  const [duration, setDuration] = useState<number>(5);
  const [fps, setFps] = useState<number>(24);
  const [jsonOutput, setJsonOutput] = useState<boolean>(false);

  useEffect(() => {
    const saved = localStorage.getItem('admin_test_generation_type');
    if (saved && ['text', 'image', 'video'].includes(saved)) {
      setGenerationType(saved as 'text' | 'image' | 'video');
    }
  }, []);

  const loadModels = useCallback(async () => {
    try {
      setLoadingModels(true);
      const response = await fetch(
        `/api/admin/test/models?type=${generationType}`
      );
      if (!response.ok) {
        throw new Error('Failed to load models');
      }
      const data = await response.json();
      if (data.success) {
        setModels(data.models || []);
        if (data.models && data.models.length > 0) {
          setSelectedModel(data.models[0].id);
        }
      } else {
        throw new Error('Failed to load models');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load models',
        variant: 'destructive',
      });
    } finally {
      setLoadingModels(false);
    }
  }, [generationType, toast]);

  const pollGenerationStatus = async (requestId: string, type: string) => {
    const maxAttempts = 120;
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/tasks/${requestId}/status`);
        if (!response.ok) {
          throw new Error('Failed to check status');
        }

        const statusData = await response.json();
        setGenerationStatus(statusData.status || 'unknown');

        if (statusData.status === 'completed') {
          setPolling(false);
          const resultData = {
            ...statusData,
            type: type,
            request_id: requestId,
          };

          if (statusData.url) {
            resultData[
              type === 'image'
                ? 'image_url'
                : type === 'video'
                  ? 'video_url'
                  : 'text_url'
            ] = statusData.url;
          }

          setResult(resultData);

          if (statusData.url) {
            await saveToGallery(resultData, type);
          }

          toast({
            title: 'Success',
            description: 'Generation completed successfully',
          });
          return;
        } else if (statusData.status === 'failed') {
          setPolling(false);
          setResult({
            error: statusData.error || 'Generation failed',
            request_id: requestId,
          });
          toast({
            title: 'Error',
            description: statusData.error || 'Generation failed',
            variant: 'destructive',
          });
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          setPolling(false);
          toast({
            title: 'Timeout',
            description: 'Generation is taking longer than expected',
            variant: 'destructive',
          });
        }
      } catch (error: any) {
        setPolling(false);
        toast({
          title: 'Error',
          description: error.message || 'Failed to check generation status',
          variant: 'destructive',
        });
      }
    };

    poll();
  };

  const saveToGallery = async (resultData: any, type: string) => {
    try {
      const response = await fetch('/api/admin/test/gallery/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: type,
          request_id: resultData.request_id,
          url: resultData.url || resultData.image_url || resultData.video_url,
          prompt: prompt,
          model: selectedModel,
          metadata: {
            width:
              generationType === 'image' || generationType === 'video'
                ? width
                : undefined,
            height:
              generationType === 'image' || generationType === 'video'
                ? height
                : undefined,
            steps: generationType === 'image' ? steps : undefined,
            guidance: generationType === 'image' ? guidance : undefined,
            duration: generationType === 'video' ? duration : undefined,
            fps: generationType === 'video' ? fps : undefined,
            json_output: generationType === 'text' ? jsonOutput : undefined,
          },
          result: resultData,
        }),
      });

      if (!response.ok) {
        console.error('Failed to save to gallery');
      }
    } catch (error) {
      console.error('Error saving to gallery:', error);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a prompt',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedModel) {
      toast({
        title: 'Validation Error',
        description: 'Please select a model',
        variant: 'destructive',
      });
      return;
    }

    try {
      setGenerating(true);
      setResult(null);

      const requestBody: any = {
        type: generationType,
        model: selectedModel,
        prompt: prompt.trim(),
      };

      if (generationType === 'text') {
        requestBody.json_output = jsonOutput;
      } else if (generationType === 'image') {
        requestBody.width = width;
        requestBody.height = height;
        requestBody.steps = steps;
        requestBody.guidance = guidance;
      } else if (generationType === 'video') {
        requestBody.width = width;
        requestBody.height = height;
        requestBody.duration_seconds = duration;
        requestBody.fps = fps;
      }

      const response = await fetch('/api/admin/test/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorMessage = `Generation failed: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage =
            errorData.error?.message ||
            errorData.error ||
            errorData.detail ||
            errorMessage;
          if (errorData.error?.details) {
            errorMessage += ` - ${JSON.stringify(errorData.error.details)}`;
          }
        } catch {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setResult(data);

      if (data.success && data.request_id) {
        setGenerationStatus('processing');
        setPolling(true);
        setTimeout(() => {
          pollGenerationStatus(data.request_id, generationType);
        }, 500);
      }

      toast({
        title: 'Success',
        description: 'Generation started successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate',
        variant: 'destructive',
      });
      setResult({ error: error.message || 'Failed to generate' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>AI Generation Testing</CardTitle>
            <CardDescription>
              Test text, image, and video generation with different models
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/test/gallery">
              <Button variant="outline" size="sm">
                <Images className="w-4 h-4 mr-2" />
                View Gallery
              </Button>
            </Link>
            <Button
              onClick={loadModels}
              disabled={loadingModels}
              variant="outline"
              size="sm"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${loadingModels ? 'animate-spin' : ''}`}
              />
              Refresh Models
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Generation Type</Label>
          <Select
            value={generationType}
            onValueChange={(value: 'text' | 'image' | 'video') => {
              setGenerationType(value);
              setSelectedModel('');
              if (typeof window !== 'undefined') {
                localStorage.setItem('admin_test_generation_type', value);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">
                <div className="flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  Text Generation
                </div>
              </SelectItem>
              <SelectItem value="image">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Image Generation
                </div>
              </SelectItem>
              <SelectItem value="video">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  Video Generation
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loadingModels && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">
              Loading models...
            </span>
          </div>
        )}

        {!loadingModels && (
          <>
            {models.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No models available for {generationType} generation. Please try
                refreshing.
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Model</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model..." />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map(model => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          {model.name || model.id}
                          {model.provider && (
                            <span className="text-xs text-muted-foreground">
                              ({model.provider})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Prompt</Label>
              <Textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Enter your generation prompt..."
                rows={4}
              />
            </div>

            {generationType === 'text' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="jsonOutput"
                    checked={jsonOutput}
                    onChange={e => setJsonOutput(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="jsonOutput">JSON Output Mode</Label>
                </div>
              </div>
            )}

            {generationType === 'image' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Width</Label>
                  <Input
                    type="number"
                    value={width}
                    onChange={e => setWidth(parseInt(e.target.value) || 1024)}
                    min={256}
                    max={2048}
                    step={64}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Height</Label>
                  <Input
                    type="number"
                    value={height}
                    onChange={e => setHeight(parseInt(e.target.value) || 1024)}
                    min={256}
                    max={2048}
                    step={64}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Steps</Label>
                  <Input
                    type="number"
                    value={steps}
                    onChange={e => setSteps(parseInt(e.target.value) || 20)}
                    min={1}
                    max={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Guidance Scale</Label>
                  <Input
                    type="number"
                    value={guidance}
                    onChange={e =>
                      setGuidance(parseFloat(e.target.value) || 7.5)
                    }
                    min={1}
                    max={20}
                    step={0.1}
                  />
                </div>
              </div>
            )}

            {generationType === 'video' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Width</Label>
                  <Input
                    type="number"
                    value={width}
                    onChange={e => setWidth(parseInt(e.target.value) || 720)}
                    min={256}
                    max={1920}
                    step={64}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Height</Label>
                  <Input
                    type="number"
                    value={height}
                    onChange={e => setHeight(parseInt(e.target.value) || 1280)}
                    min={256}
                    max={1920}
                    step={64}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration (seconds)</Label>
                  <Input
                    type="number"
                    value={duration}
                    onChange={e => setDuration(parseInt(e.target.value) || 5)}
                    min={1}
                    max={30}
                  />
                </div>
                <div className="space-y-2">
                  <Label>FPS</Label>
                  <Input
                    type="number"
                    value={fps}
                    onChange={e => setFps(parseInt(e.target.value) || 24)}
                    min={12}
                    max={60}
                  />
                </div>
              </div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={
                generating || polling || !prompt.trim() || !selectedModel
              }
              className="w-full"
            >
              {generating || polling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {generating
                    ? 'Starting...'
                    : `Generating... (${generationStatus})`}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate
                </>
              )}
            </Button>

            {result && (
              <div className="space-y-2">
                <Label>Result</Label>
                <Card className="bg-muted">
                  <CardContent className="pt-6">
                    {result.error ? (
                      <div className="text-destructive">{result.error}</div>
                    ) : result.image_url ||
                      (result.url && generationType === 'image') ? (
                      <div className="space-y-2">
                        <div className="relative w-full aspect-video">
                          <Image
                            src={result.image_url || result.url}
                            alt="Generated"
                            fill
                            className="rounded-lg object-contain"
                            unoptimized
                          />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Request ID: {result.request_id}
                        </div>
                        <pre className="text-xs overflow-auto max-h-[300px] whitespace-pre-wrap">
                          {JSON.stringify(result, null, 2)}
                        </pre>
                      </div>
                    ) : result.video_url ||
                      (result.url && generationType === 'video') ? (
                      <div className="space-y-2">
                        <video
                          src={result.video_url || result.url}
                          controls
                          className="max-w-full rounded-lg"
                        />
                        <div className="text-xs text-muted-foreground">
                          Request ID: {result.request_id}
                        </div>
                        <pre className="text-xs overflow-auto max-h-[300px] whitespace-pre-wrap">
                          {JSON.stringify(result, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">
                          Generated Text:
                        </div>
                        <div className="p-4 bg-background rounded-lg border">
                          {result.text ||
                            result.result ||
                            JSON.stringify(result, null, 2)}
                        </div>
                        {result.request_id && (
                          <div className="text-xs text-muted-foreground">
                            Request ID: {result.request_id}
                          </div>
                        )}
                        <pre className="text-xs overflow-auto max-h-[300px] whitespace-pre-wrap">
                          {JSON.stringify(result, null, 2)}
                        </pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
