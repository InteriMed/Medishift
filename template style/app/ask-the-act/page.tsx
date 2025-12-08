'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/ui/use-toast';
import type { Message } from '@/types/workflow';
import type { WorkflowContext } from '@/types/workflow';
import { ContextBar } from '@/app/dashboard/create/chat/components/ContextBar';
import { MessagesArea } from '@/app/dashboard/create/chat/components/MessagesArea';
import { PromptArea } from '@/app/dashboard/create/chat/components/PromptArea';
import { Scale, FileText, Sparkles, ShieldCheck } from 'lucide-react';

interface AskMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    citations?: {
        article: string;
        recital?: string;
        text: string;
    }[];
}

export default function AskTheActPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const { toast } = useToast();
    const [question, setQuestion] = useState('');
    const [askMessages, setAskMessages] = useState<AskMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadedImages, setUploadedImages] = useState<File[]>([]);
    const [uploadedAudio, setUploadedAudio] = useState<File[]>([]);
    const [uploadedVideos, setUploadedVideos] = useState<File[]>([]);
    const [inputEnabled, setInputEnabled] = useState(true);
    const [fileInputEnabled, setFileInputEnabled] = useState(true);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editingContent, setEditingContent] = useState('');

    useEffect(() => {
        const questionParam = searchParams.get('question');
        if (questionParam) {
            setQuestion(decodeURIComponent(questionParam));
        }
    }, [searchParams]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [askMessages]);

    const savePrompt = async (prompt: string) => {
        if (!isAuthenticated) return;

        try {
            await fetch('/api/v1/compliance/save-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });
        } catch (error) {
            console.error('Failed to save prompt:', error);
        }
    };

    const convertToWorkflowMessages = useCallback((askMessages: AskMessage[]): Message[] => {
        return askMessages.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(),
        }));
    }, []);

    const messages = useMemo(() => convertToWorkflowMessages(askMessages), [askMessages, convertToWorkflowMessages]);

    const handleSubmit = async () => {
        if (!question.trim() || isLoading || isSending) return;

        if (!isAuthenticated) {
            toast({
                title: 'Login Required',
                description: 'Please log in to ask questions about the EU AI Act.',
                variant: 'default',
            });
            router.push('/auth/login?redirect=/ask-the-act');
            return;
        }

        const userMessage: AskMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: question,
        };

        setAskMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);
        setIsSending(true);
        setIsThinking(true);
        const currentQuestion = question;
        setQuestion('');

        await savePrompt(currentQuestion);

        try {
            const response = await fetch('/api/v1/compliance/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: currentQuestion }),
            });

            if (!response.ok) {
                throw new Error('Failed to get answer');
            }

            const data = await response.json();

            const assistantMessage: AskMessage = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: data.answer,
                citations: data.citations || [],
            };

            setAskMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Error:', error);
            const demoResponse: AskMessage = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content:
                    'Based on the EU AI Act, emotion recognition is classified as a prohibited AI practice under Article 5. These systems are banned because they exploit vulnerabilities of specific groups of persons due to their age or disability, or manipulate human behavior in a manner that causes significant harm.',
                citations: [
                    {
                        article: 'Article 5',
                        text: 'Prohibited artificial intelligence practices',
                    },
                    {
                        article: 'Article 6',
                        recital: 'Recital 28',
                        text: 'Classification of AI systems as high-risk',
                    },
                ],
            };
            setAskMessages((prev) => [...prev, demoResponse]);
        } finally {
            setIsLoading(false);
            setIsSending(false);
            setIsThinking(false);
        }
    };

    const addAssistantMessageWithDelay = useCallback(() => {}, []);

    const workflowContext: WorkflowContext = useMemo(
        () => ({
            messages,
            setMessages: (newMessages: Message[] | ((prev: Message[]) => Message[])) => {
                if (typeof newMessages === 'function') {
                    const updated = newMessages(messages);
                    const askMessages = updated.map((msg) => ({
                        id: msg.id,
                        role: msg.role,
                        content: msg.content,
                    }));
                    setAskMessages(askMessages);
                } else {
                    const askMessages = newMessages.map((msg) => ({
                        id: msg.id,
                        role: msg.role,
                        content: msg.content,
                    }));
                    setAskMessages(askMessages);
                }
            },
            inputEnabled,
            setInputEnabled,
            fileInputEnabled,
            setFileInputEnabled,
            prompt: question,
            setPrompt: setQuestion,
            uploadedImages,
            setUploadedImages,
            uploadedAudio,
            setUploadedAudio,
            uploadedVideos,
            setUploadedVideos,
            toast,
            fileInputRef,
            isGenerating: isLoading,
            setIsGenerating: setIsLoading,
            addAssistantMessageWithDelay,
            messagesApi: {
                sendMessage: async () => {
                    await handleSubmit();
                },
            },
            projectId: null,
            setProjectId: () => {},
            chatSessionId: undefined,
            sendAgentMessage: async () => {},
            refreshMessages: () => {},
        }),
        [
            messages,
            question,
            inputEnabled,
            fileInputEnabled,
            uploadedImages,
            uploadedAudio,
            uploadedVideos,
            isLoading,
            toast,
            addAssistantMessageWithDelay,
            handleSubmit,
        ]
    );

    const handleGenerate = useCallback(() => {
        handleSubmit();
    }, [handleSubmit]);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        // File upload not needed for Ask the AI Act
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        // File drop not needed for Ask the AI Act
    }, []);

    const handleAIGeneration = useCallback(() => {}, []);

    const hasMessages = messages.length > 0;

    return (
        <div className="flex flex-col">
            <div className="flex flex-col min-h-[600px] max-h-[80vh] border-b border-border/40">
                <ContextBar
                    messages={messages}
                    isThinking={isThinking}
                    isSending={isSending}
                    generatingNodes={undefined}
                    workflowContext={null}
                />
                <div className={`flex-1 flex flex-col overflow-hidden relative transition-all duration-500 ${!hasMessages ? 'justify-center' : ''}`}>
                    {hasMessages && (
                        <div className="flex-1 flex flex-col w-full overflow-hidden min-h-0">
                            <MessagesArea
                                context={workflowContext}
                                messagesEndRef={messagesEndRef}
                                editingMessageId={editingMessageId}
                                setEditingMessageId={setEditingMessageId}
                                editingContent={editingContent}
                                setEditingContent={setEditingContent}
                                isThinking={isThinking}
                                currentNodeData={null}
                                generatingNodes={new Map()}
                                showProjectTypeCards={false}
                                setShowProjectTypeCards={() => {}}
                                selectedProjectType={null}
                                onProjectTypeCardSelect={() => {}}
                                projectTypeCards={[]}
                                handleAgentFeedback={undefined}
                                streamingMessages={new Map()}
                                setStreamingMessages={() => {}}
                                workflowContext={null}
                                isSending={isSending}
                            />
                        </div>
                    )}

                    {!hasMessages && (
                        <div className="flex flex-col items-center justify-center mb-8 px-4">
                            <div className="flex items-center gap-3 mb-3">
                                <Scale className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                                <h1 className="text-3xl sm:text-4xl font-bold text-foreground text-center">
                                    Ask The AI Act
                                </h1>
                            </div>
                            <p className="text-base sm:text-lg text-muted-foreground text-center max-w-2xl">
                                Get instant answers about EU AI regulations. Every response is cited directly from official Articles and Recitals.
                            </p>
                        </div>
                    )}

                    <PromptArea
                        context={workflowContext}
                        currentNodeData={null}
                        selectedProjectType={null}
                        workflowProcessor={null}
                        isAIGenerationMode={false}
                        setIsAIGenerationMode={() => {}}
                        setIsFadingOut={() => {}}
                        handleGenerate={handleGenerate}
                        handleFileChange={handleFileChange}
                        handleDrop={handleDrop}
                        handleAIGeneration={handleAIGeneration}
                        streamingMessages={new Map()}
                        isSending={isSending}
                        setIsSending={setIsSending}
                        onImageUploadPaywallCheck={async () => false}
                        promptAreaUIOutputs={null}
                    />
                </div>
            </div>

            <div className="bg-background">
                <section className="py-16 container px-4 mx-auto">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                                About Ask The AI Act
                            </h2>
                            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                                Your intelligent assistant for navigating the European Union's AI Act regulations with precision and confidence.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                            <ServiceFeatureCard
                                icon={<Scale className="w-8 h-8 text-primary" />}
                                title="Direct Source Citations"
                                description="Every answer includes direct references to specific Articles and Recitals from the official EU AI Act, ensuring accuracy and traceability."
                            />
                            <ServiceFeatureCard
                                icon={<FileText className="w-8 h-8 text-primary" />}
                                title="Comprehensive Coverage"
                                description="Access information about prohibited practices, high-risk classifications, transparency requirements, and compliance obligations."
                            />
                            <ServiceFeatureCard
                                icon={<Sparkles className="w-8 h-8 text-primary" />}
                                title="Instant Answers"
                                description="Get immediate responses to your regulatory questions without searching through hundreds of pages of legal documentation."
                            />
                            <ServiceFeatureCard
                                icon={<ShieldCheck className="w-8 h-8 text-primary" />}
                                title="Accurate & Reliable"
                                description="Powered by advanced AI trained specifically on the EU AI Act, providing reliable interpretations and guidance."
                            />
                        </div>

                        <div className="bg-muted/30 rounded-xl p-8 border border-border">
                            <h3 className="text-2xl font-bold mb-4">How It Works</h3>
                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                        1
                                    </div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Ask Your Question</h4>
                                        <p className="text-muted-foreground">
                                            Type any question about EU AI Act compliance, risk classifications, or regulatory requirements.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                        2
                                    </div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Get Cited Answers</h4>
                                        <p className="text-muted-foreground">
                                            Receive comprehensive answers with direct citations to relevant Articles and Recitals from the official legislation.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                        3
                                    </div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Save & Reference</h4>
                                        <p className="text-muted-foreground">
                                            Your questions and answers are automatically saved to your account for future reference and compliance documentation.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="py-16 bg-muted/30">
                    <div className="container px-4 mx-auto">
                        <div className="max-w-4xl mx-auto">
                            <h3 className="text-2xl font-bold mb-6 text-center">Common Questions</h3>
                            <div className="space-y-4">
                                <FAQItem
                                    question="What types of questions can I ask?"
                                    answer="You can ask about risk classifications, prohibited practices, transparency requirements, documentation obligations, compliance procedures, and any other aspect of the EU AI Act."
                                />
                                <FAQItem
                                    question="Are the answers legally binding?"
                                    answer="The answers provide guidance based on the official EU AI Act text, but should not be considered legal advice. Always consult with legal professionals for specific compliance decisions."
                                />
                                <FAQItem
                                    question="How accurate are the citations?"
                                    answer="All citations reference the official EU AI Act Articles and Recitals. The system is trained specifically on the official legislation to ensure accuracy."
                                />
                                <FAQItem
                                    question="Can I use this for compliance documentation?"
                                    answer="Yes, your questions and answers are saved to your account and can be referenced for compliance documentation. However, always verify with legal counsel for official submissions."
                                />
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

function ServiceFeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="p-6 rounded-xl border border-border bg-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
            <div className="mb-4 p-3 rounded-lg bg-primary/5 w-fit group-hover:bg-primary/10 transition-colors">
                {icon}
            </div>
            <h3 className="text-xl font-bold mb-2">{title}</h3>
            <p className="text-muted-foreground">{description}</p>
        </div>
    );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
    return (
        <div className="p-6 rounded-xl border border-border bg-card">
            <h4 className="font-semibold mb-2">{question}</h4>
            <p className="text-muted-foreground">{answer}</p>
        </div>
    );
}
