"use client";

import { useState, useEffect } from "react";
import { Eye, Loader2, Check } from "lucide-react";
import { motion } from "framer-motion";
import type { Message } from "@/types/workflow";
import { AudioTrackItem } from "./AudioTrackItem";
import { StreamingText } from "./StreamingText";
import { useAgentMessageDisplay } from "@/hooks/workflows/useAgentMessageDisplay";
import { AudioWaveformVisualizer } from "@/app/dashboard/create/chat/action/media_visualization/AudioVisualizer";
import { useTheme } from "@/contexts/ThemeContext";
import { ImageTheater } from "@/app/dashboard/create/chat/action/media_visualization/ImageTheater";
import { ActionHandler } from "@/app/dashboard/create/chat/action/ActionHandler";
import { PillOptions, type QuickOption } from "./PillOptions";

interface MessageItemProps {
  message: Message;
  isStreaming: boolean;
  streamingContent?: string;
  isTestMode: boolean;
  projectId?: string | null;
  onRawDataClick: (rawData: any) => void;
  lastRenderedRef: React.MutableRefObject<Map<string, string>>;
  isBackendStreaming?: boolean;
  shouldShowLoading?: boolean;
  onQuickOptionSelect?: (option: QuickOption) => void;
}

function AudioFileItem({ audio, projectId }: { audio: any; projectId?: string | null }) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!audio) {
      setAudioUrl(null);
      return;
    }

    if (audio instanceof File) {
      const blobUrl = URL.createObjectURL(audio);
      setAudioUrl(blobUrl);
      return () => URL.revokeObjectURL(blobUrl);
    }

    const fileInfo = audio as any;

    if (fileInfo.url || fileInfo.presigned_url) {
      setAudioUrl(fileInfo.url || fileInfo.presigned_url);
      return;
    }

    if (fileInfo.fileId && projectId) {
      fetch(`/api/storage/projects/${projectId}/files/${fileInfo.fileId}/url`)
        .then(res => res.json())
        .then(data => {
          if (data.data?.url) {
            setAudioUrl(data.data.url);
          }
        })
        .catch(err => {
          console.error('Failed to fetch file URL:', err);
        });
    }
  }, [audio, projectId]);

  const fileName = audio instanceof File ? audio.name : (audio as any).name || (audio as any).filename || 'Audio';
  const fileId = audio instanceof File ? undefined : (audio as any).fileId || (audio as any).id;

  return (
    <AudioTrackItem
      fileName={fileName}
      audioUrl={audioUrl}
      fileId={fileId}
    />
  );
}

function ImageFileItem({
  image,
  projectId,
  onImageClick
}: {
  image: any;
  projectId?: string | null;
  onImageClick: (url: string, alt: string) => void;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!image) {
      setImageUrl(null);
      return;
    }

    if (image instanceof File) {
      const blobUrl = URL.createObjectURL(image);
      setImageUrl(blobUrl);
      return () => URL.revokeObjectURL(blobUrl);
    }

    const fileInfo = image as any;

    if (fileInfo.url || fileInfo.presigned_url) {
      setImageUrl(fileInfo.url || fileInfo.presigned_url);
      return;
    }

    if (fileInfo.fileId && projectId) {
      fetch(`/api/storage/projects/${projectId}/files/${fileInfo.fileId}/url`)
        .then(res => res.json())
        .then(data => {
          if (data.data?.url) {
            setImageUrl(data.data.url);
          }
        })
        .catch(err => {
          console.error('Failed to fetch file URL:', err);
        });
    }
  }, [image, projectId]);

  if (!imageUrl) return null;

  const imageAlt = image instanceof File ? image.name : (image as any).name || 'Image';

  return (
    <div
      className="rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
      onClick={() => onImageClick(imageUrl, imageAlt)}
    >
      <img
        src={imageUrl}
        alt={imageAlt}
        className="w-[200px] h-[200px] object-cover max-w-full"
      />
    </div>
  );
}

export function MessageItem({
  message,
  isStreaming,
  streamingContent,
  isTestMode,
  projectId,
  onRawDataClick,
  lastRenderedRef,
  isBackendStreaming = false,
  shouldShowLoading = false,
  onQuickOptionSelect,
}: MessageItemProps) {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';
  const [theaterImage, setTheaterImage] = useState<{ url: string; alt: string } | null>(null);
  // Debug logging for waveform messages
  if (message.id?.startsWith('waveform-')) {
    const analysis = message.waveform?.analysis;
    console.log('[MessageItem] Rendering waveform message:', {
      id: message.id,
      hasWaveform: !!message.waveform,
      waveformKeys: message.waveform ? Object.keys(message.waveform) : [],
      hasAnalysis: !!analysis,
      analysisKeys: analysis ? Object.keys(analysis) : [],
      hasTrackSummary: !!analysis?.track_summary,
      hasOutput: !!analysis?.output,
      hasOutputTrackSummary: !!(analysis?.output && analysis.output.track_summary),
      trackSummaryKeys: analysis?.track_summary ? Object.keys(analysis.track_summary) : [],
      outputTrackSummaryKeys: analysis?.output?.track_summary ? Object.keys(analysis.output.track_summary) : [],
      content: message.content,
      fullAnalysisStructure: analysis
    });
  }

  const agentDisplay = useAgentMessageDisplay({
    message,
    streamingContent,
    isStreaming
  });

  const displayContent = agentDisplay.displayContent || message.content || '';
  const showProgress = message.loading && message.progress !== undefined;
  // Show loading if: assistant message, no content, and backend is streaming
  const isLoadingMessage = message.role === 'assistant' && (!displayContent || displayContent.trim() === '') && shouldShowLoading;
  const progressValue = message.progress || 0;

  // Use backend message content for streaming (single source of truth)
  // streamingContent prop contains backend content for animation detection
  const contentForStreaming = streamingContent || message.content || '';

  return (
    <div
      className={`flex gap-3 sm:gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start items-start'}`}
    >
      <div className={`max-w-[85%] sm:max-w-[80%] p-4 sm:p-6 min-h-fit overflow-wrap-break-word shadow-sm transition-all ${message.role === 'user'
        ? 'bg-gradient-to-br from-primary/20 to-purple-500/20 backdrop-blur-sm border border-primary/20 text-foreground rounded-2xl rounded-tr-sm'
        : isDarkMode
          ? 'bg-[#1A1D24] backdrop-blur-sm border border-white/5 shadow-black/5 rounded-2xl rounded-tl-sm'
          : 'bg-white border border-slate-200 shadow-sm rounded-2xl rounded-tl-sm'
        }`}>
        {isLoadingMessage && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-4 h-4">
                <span className="absolute w-full h-full rounded-full bg-primary/20 animate-ping" />
                <span className="relative w-2 h-2 rounded-full bg-primary" />
              </div>
              <span className={`text-sm font-medium ${isDarkMode ? 'text-muted-foreground' : 'text-slate-500'
                }`}>
                {message.agent ? 'Processing task...' : 'Thinking...'}
              </span>
            </div>
          </div>
        )}
        {!isLoadingMessage && showProgress && (
          <div className="mb-4">
            <div className="w-full bg-muted/20 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-500 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, progressValue))}%` }}
              />
            </div>
            <div className={`text-xs mt-2 flex justify-between ${isDarkMode ? 'text-muted-foreground' : 'text-slate-400'
              }`}>
              <span>Progress</span>
              <span>{Math.round(progressValue)}%</span>
            </div>
          </div>
        )}
        {/* Only show agent header if message has agent but NOT waveform (waveform messages should not show agent UI) */}
        {message.role === 'assistant' && message.agent && !message.waveform && (
          <div className={`mb-3 text-xs flex items-center gap-3 pb-3 border-b ${isDarkMode ? 'border-white/5 text-muted-foreground' : 'border-slate-100 text-slate-400'
            }`}>
            <span className="font-medium uppercase tracking-wider text-[10px]">Iteration {(message.agent as any).iteration || (message.agent as any).rawData?.iteration || 1}</span>
            {isTestMode && message.agent.validation !== undefined && (
              <span className={`flex items-center gap-1 ${message.agent.validation ? 'text-green-500' : 'text-red-500'}`}>
                {message.agent.validation ? (
                  <>
                    <div className="w-1.5 h-1.5 rounded-full bg-current" />
                    Valid
                  </>
                ) : (
                  <>
                    <div className="w-1.5 h-1.5 rounded-full bg-current" />
                    Invalid
                  </>
                )}
              </span>
            )}
            {(message.agent as any).rawData && (
              <button
                onClick={() => {
                  onRawDataClick((message.agent as any).rawData);
                }}
                className={`ml-auto hover:bg-white/5 p-1 rounded transition-colors ${isDarkMode
                  ? 'text-primary hover:text-primary/80'
                  : 'text-primary hover:text-primary/80'
                  }`}
                title="View raw input/output"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {message.waveform ? (
          <div className="mt-2 w-full">
            {message.waveform.analysis ? (
              <div className="space-y-3">
                <AudioWaveformVisualizer
                  audioUrl={(() => {
                    // Helper to check if URL is a blob URL (invalid after reload)
                    const isBlobUrl = (url: string | undefined | null): boolean => {
                      return !!url && typeof url === 'string' && url.startsWith('blob:');
                    };

                    // Get URL from waveform audioFile
                    const waveformUrl = message.waveform.audioFile?.url || message.waveform.audioFile?.presigned_url;
                    if (waveformUrl && !isBlobUrl(waveformUrl)) {
                      return waveformUrl;
                    }

                    // Get URL from files.audio
                    if (message.files?.audio?.[0] && !(message.files.audio[0] instanceof File)) {
                      const fileUrl = (message.files.audio[0] as any)?.url || (message.files.audio[0] as any)?.presigned_url;
                      if (fileUrl && !isBlobUrl(fileUrl)) {
                        return fileUrl;
                      }
                    }

                    // Return undefined if only blob URLs found (will trigger fileId fetch in visualizer)
                    return undefined;
                  })()}
                  audioFile={message.waveform.audioFile || message.files?.audio?.[0]}
                  analysis={message.waveform.analysis}
                  height={200}
                  showSegments={true}
                  showTempo={true}
                  interactive={true}
                  projectId={projectId}
                />
              </div>
            ) : (
              <div className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-muted-foreground' : 'text-slate-400'
                }`}>
                <Loader2 className="w-3 h-3 animate-spin" />
                Analyzing audio...
              </div>
            )}
          </div>
        ) : (agentDisplay.hasOutput || agentDisplay.isWaitingForFeedback) ? (
          <div className={`whitespace-pre-wrap break-words overflow-wrap-break-word min-h-fit text-[16px] leading-relaxed ${isDarkMode ? 'text-gray-200' : 'text-slate-700'
            }`}>
            {agentDisplay.displayContent ? (
              <StreamingText
                messageId={message.id}
                content={agentDisplay.displayContent}
                isStreaming={isStreaming || isBackendStreaming}
                lastRenderedRef={lastRenderedRef}
                isAgentMessage={!!message.agent}
                isUserMessage={message.role === 'user'}
              />
            ) : agentDisplay.validationStatus === true ? (
              <span className={`italic flex items-center gap-2 ${isDarkMode ? 'text-muted-foreground' : 'text-slate-400'
                }`}>
                <Check className="w-4 h-4" />
                Ready to proceed with the task.
              </span>
            ) : agentDisplay.isWaitingForFeedback ? (
              <span className={`italic flex items-center gap-2 ${isDarkMode ? 'text-muted-foreground' : 'text-slate-400'
                }`}>
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Waiting for your feedback...
              </span>
            ) : null}
          </div>
        ) : displayContent && message.role === 'assistant' && !message.waveform && !message.agent ? (
          <div className={`whitespace-pre-wrap break-words overflow-wrap-break-word min-h-fit text-[16px] leading-relaxed ${isDarkMode ? 'text-gray-200' : 'text-slate-700'
            }`}>
            <StreamingText
              messageId={message.id}
              content={contentForStreaming}
              isStreaming={isStreaming || isBackendStreaming}
              lastRenderedRef={lastRenderedRef}
              isAgentMessage={false}
              isUserMessage={false}
            />
          </div>
        ) : null}

        {message.files && !message.waveform && (
          <div className="mt-4 space-y-2">
            {message.files.audio?.map((audio, idx) => (
              <AudioFileItem key={idx} audio={audio} projectId={projectId} />
            ))}
            {message.files.images?.map((img, idx) => (
              <ImageFileItem
                key={idx}
                image={img}
                projectId={projectId}
                onImageClick={(url, alt) => setTheaterImage({ url, alt })}
              />
            ))}
          </div>
        )}

        {message.role === 'assistant' && message.quick_options && message.quick_options.length > 0 && (
          <PillOptions
            options={message.quick_options}
            onSelect={(option) => {
              if (onQuickOptionSelect) {
                onQuickOptionSelect(option);
              }
            }}
            disabled={isStreaming || isBackendStreaming}
          />
        )}
      </div>

      {theaterImage && (
        <ImageTheater
          open={!!theaterImage}
          onClose={() => setTheaterImage(null)}
          imageUrl={theaterImage.url}
          imageAlt={theaterImage.alt}
        />
      )}

      <ActionHandler
        actions={(message as any).actions}
        projectId={projectId}
      />
    </div>
  );
}

