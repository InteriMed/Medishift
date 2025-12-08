'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  GripVertical,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { getUserSubscriptionTier } from '@/hooks/workflows/utils/paywallChecker';
import { UpgradePopup } from '@/app/dashboard/pricing/components/UpgradePopup';

interface Segment {
  segment_number: number;
  start_sec: number;
  end_sec: number;
  section_type?: string;
  lyrics?: string;
  music_features?: {
    energy_level?: string;
  };
}

interface AudioWaveformVisualizerProps {
  audioUrl?: string;
  audioFile?:
    | File
    | {
        url?: string;
        s3_url?: string;
        presigned_url?: string;
        fileId?: string;
        id?: string;
        music_s3_url?: string;
      };
  analysis?: {
    track_summary?: {
      duration_seconds: number;
      tempo_bpm?: number;
      segments_count?: number;
      time_signature?: string;
    };
    segment_analyses?: Segment[];
    output?: {
      track_summary?: {
        duration_seconds: number;
        tempo_bpm?: number;
        segments_count?: number;
        time_signature?: string;
      };
      segment_analyses?: Segment[];
    };
  };
  height?: number;
  showSegments?: boolean;
  showLyrics?: boolean;
  showTempo?: boolean;
  interactive?: boolean;
  onCropChange?: (startTime: number, endTime: number) => void;
  projectId?: string | null;
}

export function AudioWaveformVisualizer({
  audioUrl,
  audioFile,
  analysis,
  height = 200,
  showSegments = true,
  showTempo = true,
  interactive = true,
  onCropChange,
  projectId,
}: AudioWaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';

  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [duration, setDuration] = useState(0);
  const [cropStart, setCropStart] = useState(0);
  const [cropEnd, setCropEnd] = useState(0);
  const [isDragging, setIsDragging] = useState<
    'start' | 'end' | 'area' | 'timeline' | null
  >(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [subscriptionTier, setSubscriptionTier] = useState<
    'free' | 'creator' | 'pro' | 'business' | 'enterprise' | 'plus' | 'premium'
  >('free');
  const [maxDuration, setMaxDuration] = useState<number | null>(null);
  const [showUpgradePopup, setShowUpgradePopup] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [resolvedAudioUrl, setResolvedAudioUrl] = useState<string | null>(null);

  const trackSummary =
    analysis?.track_summary || analysis?.output?.track_summary;
  const segments = useMemo(
    () =>
      analysis?.segment_analyses || analysis?.output?.segment_analyses || [],
    [analysis]
  );
  const audioDuration = trackSummary?.duration_seconds || duration || 0;

  useEffect(() => {
    const loadSubscription = async () => {
      const tier = await getUserSubscriptionTier();
      setSubscriptionTier(tier);

      if (tier === 'free') {
        setMaxDuration(30);
      } else {
        setMaxDuration(null);
      }
    };
    loadSubscription();
  }, []);

  useEffect(() => {
    if (audioDuration > 0) {
      if (subscriptionTier === 'free' && segments.length > 0) {
        const loudestSegment = segments.reduce((loudest, seg) => {
          const loudestEnergy =
            loudest.music_features?.energy_level === 'high' ? 1 : 0;
          const currentEnergy =
            seg.music_features?.energy_level === 'high' ? 1 : 0;
          return currentEnergy > loudestEnergy ? seg : loudest;
        }, segments[0]);

        const startAtLoudest = loudestSegment.start_sec;
        setCropStart(startAtLoudest);
        setCropEnd(Math.min(audioDuration, startAtLoudest + 30));
      } else {
        setCropStart(0);
        setCropEnd(audioDuration);
      }
    }
  }, [audioDuration, segments, subscriptionTier]);

  useEffect(() => {
    if (onCropChange && cropStart !== undefined && cropEnd !== undefined) {
      onCropChange(cropStart, cropEnd);
    }
  }, [cropStart, cropEnd, onCropChange]);

  const generateSyntheticWaveform = useCallback(() => {
    const summary =
      trackSummary ||
      analysis?.track_summary ||
      analysis?.output?.track_summary;
    if (!summary || !summary.duration_seconds) {
      setIsLoading(false);
      return;
    }

    const duration = summary.duration_seconds;
    const numBars = 400;
    const bars: number[] = [];

    if (segments.length > 0) {
      segments.forEach(segment => {
        const segmentStart = segment.start_sec;
        const segmentEnd = segment.end_sec;
        const segmentDuration = segmentEnd - segmentStart;
        const barsInSegment = Math.floor(
          (segmentDuration / duration) * numBars
        );
        const startBar = Math.floor((segmentStart / duration) * numBars);

        const sectionType = segment.section_type || 'verse';
        let baseAmplitude = 0.3;

        if (sectionType === 'intro' || sectionType === 'outro') {
          baseAmplitude = 0.2;
        } else if (sectionType === 'chorus' || sectionType === 'hook') {
          baseAmplitude = 0.7;
        } else if (sectionType === 'bridge') {
          baseAmplitude = 0.4;
        } else {
          baseAmplitude = 0.5;
        }

        for (let i = 0; i < barsInSegment && startBar + i < numBars; i++) {
          const variation = 0.3 + Math.random() * 0.4;
          const amplitude = Math.min(1, baseAmplitude * variation);
          bars[startBar + i] = amplitude;
        }
      });
    } else {
      for (let i = 0; i < numBars; i++) {
        bars[i] = 0.3 + Math.random() * 0.4;
      }
    }

    for (let i = 0; i < numBars; i++) {
      if (bars[i] === undefined) {
        bars[i] = 0.1 + Math.random() * 0.2;
      }
    }

    setWaveformData(bars);
    setIsLoading(false);
  }, [trackSummary, segments, analysis]);

  const hasGeneratedWaveform = useRef(false);
  const lastAnalysisRef = useRef<any>(null);

  const generateWaveform = useCallback(
    async (audio: HTMLAudioElement) => {
      try {
        const audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;

        const source = audioContext.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioContext.destination);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const generateBars = () => {
          analyser.getByteFrequencyData(dataArray);
          const bars: number[] = [];
          const step = Math.floor(bufferLength / 400);

          for (let i = 0; i < 400; i++) {
            const index = i * step;
            bars.push(dataArray[index] / 255);
          }

          setWaveformData(bars);
          setIsLoading(false);
        };

        audio.addEventListener('loadeddata', generateBars);
        audio.addEventListener('error', () => {
          if (!hasGeneratedWaveform.current) {
            console.warn(
              'Audio loading failed, generating synthetic waveform from analysis data'
            );
            generateSyntheticWaveform();
            hasGeneratedWaveform.current = true;
          }
        });

        if (audio.readyState >= 2) {
          generateBars();
        } else {
          const timeout = setTimeout(() => {
            if (!hasGeneratedWaveform.current) {
              console.warn(
                'Audio loading timeout, generating synthetic waveform from analysis data'
              );
              generateSyntheticWaveform();
              hasGeneratedWaveform.current = true;
            }
          }, 5000);

          audio.addEventListener('loadeddata', () => {
            clearTimeout(timeout);
          });
        }
      } catch (error) {
        console.error('Failed to generate waveform:', error);
        generateSyntheticWaveform();
      }
    },
    [generateSyntheticWaveform]
  );

  useEffect(() => {
    if (analysis !== lastAnalysisRef.current) {
      lastAnalysisRef.current = analysis;
      if (analysis) {
        hasGeneratedWaveform.current = false;
      }
    }
  }, [analysis]);

  // Resolve audio URL using the same logic as AudioFileItem
  useEffect(() => {
    if (!audioFile && !audioUrl) {
      setResolvedAudioUrl(null);
      return;
    }

    if (audioFile instanceof File) {
      const blobUrl = URL.createObjectURL(audioFile);
      setResolvedAudioUrl(blobUrl);
      return () => URL.revokeObjectURL(blobUrl);
    }

    // Handle string S3 URLs - convert to object structure
    let fileInfo: any = audioFile;
    if (typeof audioFile === 'string') {
      fileInfo = {
        s3_url: audioFile,
        music_s3_url: audioFile,
      };
    }

    // Check for fileId in various locations (root level, nested file object, etc.)
    const fileId =
      fileInfo?.fileId ||
      fileInfo?.id ||
      fileInfo?.file?.fileId ||
      fileInfo?.file?.id;

    // Helper to check if URL is a blob URL (invalid after reload)
    const isBlobUrl = (url: string | undefined | null): boolean => {
      return !!url && typeof url === 'string' && url.startsWith('blob:');
    };

    // If we have a direct playable URL that's NOT a blob URL, use it
    const directUrl = fileInfo?.url || fileInfo?.presigned_url;
    if (directUrl && !isBlobUrl(directUrl)) {
      console.log(
        '[AudioWaveformVisualizer] ✅ Using direct playable URL:',
        directUrl?.substring(0, 100) + '...'
      );
      setResolvedAudioUrl(directUrl);
      return;
    }

    // If we have fileId and projectId, fetch a fresh presigned URL (especially important after reload)
    if (fileId && projectId) {
      fetch(`/api/storage/projects/${projectId}/files/${fileId}/url`)
        .then(res => res.json())
        .then(data => {
          if (data.data?.url) {
            console.log(
              '[AudioWaveformVisualizer] ✅ Fetched presigned URL:',
              data.data.url.substring(0, 100) + '...'
            );
            setResolvedAudioUrl(data.data.url);
          } else {
            console.warn(
              '[AudioWaveformVisualizer] ⚠️ No URL in response:',
              data
            );
            setResolvedAudioUrl(null);
          }
        })
        .catch(err => {
          console.error(
            '[AudioWaveformVisualizer] ❌ Failed to fetch file URL:',
            err
          );
          setResolvedAudioUrl(null);
        });
      return;
    }

    // If we have an S3 URL string but no fileId, we can't play it directly
    // But we can still show the waveform if we have analysis data
    if (fileInfo?.s3_url || fileInfo?.music_s3_url) {
      const s3Url = fileInfo.s3_url || fileInfo.music_s3_url;
      if (typeof s3Url === 'string') {
        console.warn(
          '[AudioWaveformVisualizer] ⚠️ Audio file has S3 URL but no fileId. Cannot play directly, but waveform will still render if analysis data is available.'
        );
        setResolvedAudioUrl(null);
        return;
      }
    }

    // Fallback to audioUrl prop if provided and NOT a blob URL
    if (audioUrl && !isBlobUrl(audioUrl)) {
      setResolvedAudioUrl(audioUrl);
      return;
    }

    // If audioUrl is a blob URL, try to get fileId from audioFile and fetch fresh URL
    if (audioUrl && isBlobUrl(audioUrl) && fileId && projectId) {
      fetch(`/api/storage/projects/${projectId}/files/${fileId}/url`)
        .then(res => res.json())
        .then(data => {
          if (data.data?.url) {
            console.log(
              '[AudioWaveformVisualizer] ✅ Reloaded presigned URL after blob URL detected:',
              data.data.url.substring(0, 100) + '...'
            );
            setResolvedAudioUrl(data.data.url);
          } else {
            console.warn(
              '[AudioWaveformVisualizer] ⚠️ No URL in response after blob URL reload:',
              data
            );
            setResolvedAudioUrl(null);
          }
        })
        .catch(err => {
          console.error(
            '[AudioWaveformVisualizer] ❌ Failed to reload file URL after blob URL:',
            err
          );
          setResolvedAudioUrl(null);
        });
      return;
    }

    setResolvedAudioUrl(null);
  }, [audioFile, audioUrl, projectId]);

  // Get the audio URL for the audio element
  const getAudioUrl = useCallback(() => {
    return resolvedAudioUrl;
  }, [resolvedAudioUrl]);

  useEffect(() => {
    if (hasGeneratedWaveform.current && waveformData.length > 0) {
      return;
    }

    if (!resolvedAudioUrl) {
      if (trackSummary?.duration_seconds) {
        generateSyntheticWaveform();
        hasGeneratedWaveform.current = true;
      } else if (
        analysis &&
        (analysis.track_summary || analysis.output?.track_summary)
      ) {
        const summary =
          analysis.track_summary || analysis.output?.track_summary;
        if (summary?.duration_seconds) {
          generateSyntheticWaveform();
          hasGeneratedWaveform.current = true;
        } else {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
      return;
    }

    if (!audioRef.current) {
      if (trackSummary?.duration_seconds) {
        generateSyntheticWaveform();
        hasGeneratedWaveform.current = true;
      } else if (
        analysis &&
        (analysis.track_summary || analysis.output?.track_summary)
      ) {
        const summary =
          analysis.track_summary || analysis.output?.track_summary;
        if (summary?.duration_seconds) {
          generateSyntheticWaveform();
          hasGeneratedWaveform.current = true;
        } else {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
      return;
    }

    const audio = audioRef.current;

    const handleLoadedMetadata = () => {
      if (
        audio.duration &&
        !isNaN(audio.duration) &&
        audio.duration !== Infinity
      ) {
        setDuration(audio.duration);
        generateWaveform(audio);
      }
    };

    const handleError = (e: Event) => {
      console.warn('Audio file failed to load, using synthetic waveform', e);
      if (!hasGeneratedWaveform.current) {
        if (trackSummary?.duration_seconds) {
          generateSyntheticWaveform();
          hasGeneratedWaveform.current = true;
        } else {
          setIsLoading(false);
        }
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('error', handleError);

    const loadTimeout = setTimeout(() => {
      if (
        isLoading &&
        !hasGeneratedWaveform.current &&
        trackSummary?.duration_seconds
      ) {
        console.warn('Audio loading timeout, using synthetic waveform');
        generateSyntheticWaveform();
        hasGeneratedWaveform.current = true;
      }
    }, 3000);

    return () => {
      clearTimeout(loadTimeout);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('error', handleError);
    };
  }, [
    resolvedAudioUrl,
    trackSummary,
    generateSyntheticWaveform,
    isLoading,
    audioRef,
    waveformData.length,
    analysis,
    generateWaveform,
  ]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !resolvedAudioUrl) {
      setIsPlaying(false);
      return;
    }

    audio.load();

    const handleTimeUpdate = () => {
      if (audio) {
        setCurrentTime(audio.currentTime);
        setIsPlaying(!audio.paused);
        if (
          audio.duration &&
          !isNaN(audio.duration) &&
          audio.duration !== Infinity &&
          duration === 0
        ) {
          setDuration(audio.duration);
        }
      }
    };
    const handlePlay = () => {
      setIsPlaying(true);
    };
    const handlePause = () => {
      setIsPlaying(false);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handlePlaying = () => {
      setIsPlaying(true);
    };
    const handleLoadedMetadata = () => {
      if (
        audio.duration &&
        !isNaN(audio.duration) &&
        audio.duration !== Infinity
      ) {
        setDuration(audio.duration);
      }
    };

    setIsPlaying(!audio.paused);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [resolvedAudioUrl, duration]);

  useEffect(() => {
    if (waveformData.length === 0) {
      if (
        !isLoading &&
        (trackSummary?.duration_seconds ||
          analysis?.track_summary?.duration_seconds ||
          analysis?.output?.track_summary?.duration_seconds)
      ) {
        if (!hasGeneratedWaveform.current) {
          generateSyntheticWaveform();
          hasGeneratedWaveform.current = true;
        }
      }
      return;
    }

    if (!canvasRef.current || !containerRef.current) return;

    const drawWaveform = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const containerWidth = container.clientWidth;
      const dpr = window.devicePixelRatio || 1;

      canvas.width = containerWidth * dpr;
      canvas.height = height * dpr;

      ctx.scale(dpr, dpr);

      const width = containerWidth;
      const canvasHeight = height;
      const barWidth = width / waveformData.length;

      ctx.clearRect(0, 0, width, canvasHeight);

      const centerY = canvasHeight / 2;
      const maxBarHeight = canvasHeight * 0.5;

      const maxValue = Math.max(...waveformData, 0.1);
      const normalizationFactor = maxValue > 0 ? 1 / maxValue : 1;

      waveformData.forEach((value, index) => {
        const normalizedValue = value * normalizationFactor;
        const barHeight = normalizedValue * maxBarHeight;
        const x = index * barWidth;

        const alphaValue = Math.max(0.1, normalizedValue);
        const alpha = isDarkMode
          ? 0.6 + alphaValue * 0.4
          : 0.7 + alphaValue * 0.3;

        const gradient = ctx.createLinearGradient(x, 0, x, canvasHeight);

        // Use global gradient colors: cyan-400, purple-500, pink-500
        // cyan-400: rgb(34, 211, 238)
        // purple-500: rgb(168, 85, 247)
        // pink-500: rgb(236, 72, 153)

        if (index % 3 === 0) {
          // Cyan
          gradient.addColorStop(
            0,
            isDarkMode
              ? `rgba(34, 211, 238, ${alpha * 0.8})`
              : `rgba(14, 165, 233, ${alpha})`
          ); // blue-500 for light mode
          gradient.addColorStop(
            0.5,
            isDarkMode
              ? `rgba(34, 211, 238, ${alpha})`
              : `rgba(14, 165, 233, ${alpha * 1.2})`
          );
          gradient.addColorStop(
            1,
            isDarkMode
              ? `rgba(34, 211, 238, ${alpha * 0.6})`
              : `rgba(14, 165, 233, ${alpha * 0.8})`
          );
        } else if (index % 3 === 1) {
          // Purple
          gradient.addColorStop(
            0,
            isDarkMode
              ? `rgba(168, 85, 247, ${alpha * 0.8})`
              : `rgba(139, 92, 246, ${alpha})`
          ); // violet-500 for light mode
          gradient.addColorStop(
            0.5,
            isDarkMode
              ? `rgba(168, 85, 247, ${alpha})`
              : `rgba(139, 92, 246, ${alpha * 1.2})`
          );
          gradient.addColorStop(
            1,
            isDarkMode
              ? `rgba(168, 85, 247, ${alpha * 0.6})`
              : `rgba(139, 92, 246, ${alpha * 0.8})`
          );
        } else {
          // Pink
          gradient.addColorStop(
            0,
            isDarkMode
              ? `rgba(236, 72, 153, ${alpha * 0.8})`
              : `rgba(219, 39, 119, ${alpha})`
          ); // pink-600 for light mode
          gradient.addColorStop(
            0.5,
            isDarkMode
              ? `rgba(236, 72, 153, ${alpha})`
              : `rgba(219, 39, 119, ${alpha * 1.2})`
          );
          gradient.addColorStop(
            1,
            isDarkMode
              ? `rgba(236, 72, 153, ${alpha * 0.6})`
              : `rgba(219, 39, 119, ${alpha * 0.8})`
          );
        }

        ctx.fillStyle = gradient;

        const topY = centerY - barHeight / 2;
        ctx.fillRect(x, topY, barWidth - 1, barHeight);

        if (normalizedValue > 0.3) {
          const glowGradient = ctx.createRadialGradient(
            x + barWidth / 2,
            centerY,
            0,
            x + barWidth / 2,
            centerY,
            barHeight / 2
          );
          glowGradient.addColorStop(
            0,
            isDarkMode
              ? `rgba(255, 255, 255, ${alpha * 0.5})`
              : `rgba(255, 255, 255, ${alpha * 0.3})`
          );
          glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = glowGradient;
          ctx.fillRect(x, topY, barWidth - 1, barHeight);
        }
      });

      if (audioDuration > 0) {
        const startX = (cropStart / audioDuration) * width;
        const endX = (cropEnd / audioDuration) * width;

        const overlayColor =
          resolvedTheme === 'dark'
            ? 'rgba(255, 255, 255, 0.05)'
            : 'rgba(0, 0, 0, 0.05)';

        ctx.fillStyle = overlayColor;
        ctx.fillRect(0, 0, startX, canvasHeight);
        ctx.fillRect(endX, 0, width - endX, canvasHeight);
      }
    };

    drawWaveform();

    const resizeObserver = new ResizeObserver(() => {
      drawWaveform();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [
    waveformData,
    audioDuration,
    showSegments,
    interactive,
    height,
    cropStart,
    cropEnd,
    resolvedTheme,
    isDarkMode,
  ]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (
      !interactive ||
      !audioRef.current ||
      !canvasRef.current ||
      audioDuration === 0
    )
      return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickTime = (x / rect.width) * audioDuration;

    if (audioRef.current) {
      audioRef.current.currentTime = clickTime;
    }
  };

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current || !resolvedAudioUrl) return;

    const audio = audioRef.current;

    if (audio.paused) {
      if (audio.readyState === 0) {
        audio.load();
      }
      audio.play().catch(err => {
        console.error('Failed to play audio:', err);
        setIsPlaying(false);
        if (audio.readyState === 0) {
          audio.load();
          setTimeout(() => {
            audio.play().catch(e => {
              console.error('Retry play failed:', e);
            });
          }, 100);
        }
      });
    } else {
      audio.pause();
    }
  }, [audioRef, resolvedAudioUrl]);

  const getCurrentSegment = useCallback(() => {
    if (!segments.length || audioDuration === 0) return null;
    return (
      segments.find(
        seg => currentTime >= seg.start_sec && currentTime <= seg.end_sec
      ) || null
    );
  }, [segments, currentTime, audioDuration]);

  const skipToStartOfTrack = useCallback(() => {
    if (!audioRef.current || audioDuration === 0) return;
    audioRef.current.currentTime = 0;
  }, [audioRef, audioDuration]);

  const skipToEndOfTrack = useCallback(() => {
    if (!audioRef.current || audioDuration === 0) return;
    audioRef.current.currentTime = audioDuration;
  }, [audioRef, audioDuration]);

  const skipToStartOfSegment = useCallback(() => {
    if (!audioRef.current || audioDuration === 0) return;
    const currentSegment = getCurrentSegment();
    if (currentSegment) {
      audioRef.current.currentTime = currentSegment.start_sec;
    } else {
      audioRef.current.currentTime = 0;
    }
  }, [audioRef, audioDuration, getCurrentSegment]);

  const skipToEndOfSegment = useCallback(() => {
    if (!audioRef.current || audioDuration === 0) return;
    const currentSegment = getCurrentSegment();
    if (currentSegment) {
      audioRef.current.currentTime = currentSegment.end_sec;
    } else {
      audioRef.current.currentTime = audioDuration;
    }
  }, [audioRef, audioDuration, getCurrentSegment]);

  const skipToPreviousSegment = useCallback(() => {
    if (!audioRef.current || !segments.length || audioDuration === 0) return;

    const sortedSegments = [...segments].sort(
      (a, b) => a.start_sec - b.start_sec
    );
    const currentSegment = getCurrentSegment();
    let targetTime = 0;

    if (currentSegment) {
      const currentIndex = sortedSegments.findIndex(
        seg =>
          seg.start_sec === currentSegment.start_sec &&
          seg.end_sec === currentSegment.end_sec
      );
      if (currentIndex > 0) {
        targetTime = sortedSegments[currentIndex - 1].start_sec;
      } else {
        targetTime = 0;
      }
    } else {
      const previousSegment = sortedSegments
        .filter(seg => seg.start_sec < currentTime)
        .sort((a, b) => b.start_sec - a.start_sec)[0];
      targetTime = previousSegment ? previousSegment.start_sec : 0;
    }

    audioRef.current.currentTime = targetTime;
  }, [audioRef, segments, audioDuration, getCurrentSegment, currentTime]);

  const skipToNextSegment = useCallback(() => {
    if (!audioRef.current || !segments.length || audioDuration === 0) return;

    const sortedSegments = [...segments].sort(
      (a, b) => a.start_sec - b.start_sec
    );
    const currentSegment = getCurrentSegment();
    let targetTime = audioDuration;

    if (currentSegment) {
      const currentIndex = sortedSegments.findIndex(
        seg =>
          seg.start_sec === currentSegment.start_sec &&
          seg.end_sec === currentSegment.end_sec
      );
      if (currentIndex < sortedSegments.length - 1) {
        targetTime = sortedSegments[currentIndex + 1].start_sec;
      } else {
        targetTime = audioDuration;
      }
    } else {
      const nextSegment = sortedSegments
        .filter(seg => seg.start_sec > currentTime)
        .sort((a, b) => a.start_sec - b.start_sec)[0];
      targetTime = nextSegment ? nextSegment.start_sec : audioDuration;
    }

    audioRef.current.currentTime = targetTime;
  }, [audioRef, segments, audioDuration, getCurrentSegment, currentTime]);

  const skipToCropStart = useCallback(() => {
    if (!audioRef.current || audioDuration === 0) return;
    audioRef.current.currentTime = cropStart;
  }, [audioRef, audioDuration, cropStart]);

  const skipToCropEnd = useCallback(() => {
    if (!audioRef.current || audioDuration === 0) return;
    audioRef.current.currentTime = cropEnd;
  }, [audioRef, audioDuration, cropEnd]);

  const handleCropMarkerMouseDown = (
    e: React.MouseEvent,
    type: 'start' | 'end'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(type);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const time = (x / rect.width) * audioDuration;
      setDragOffset(type === 'start' ? time - cropStart : time - cropEnd);
    }
  };

  const handleCropAreaMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect && audioDuration > 0) {
      const x = e.clientX - rect.left;
      const time = (x / rect.width) * audioDuration;

      if (time >= cropStart && time <= cropEnd) {
        setIsDragging('area');
        setDragOffset(time - cropStart);
      }
    }
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (
      !interactive ||
      !audioRef.current ||
      !timelineRef.current ||
      audioDuration === 0
    )
      return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickTime = Math.max(
      0,
      Math.min(audioDuration, (x / rect.width) * audioDuration)
    );

    if (audioRef.current) {
      audioRef.current.currentTime = clickTime;
      setCurrentTime(clickTime);
    }
  };

  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (
      !interactive ||
      !audioRef.current ||
      !timelineRef.current ||
      audioDuration === 0
    )
      return;

    e.preventDefault();
    e.stopPropagation();

    setIsDragging('timeline');
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = Math.max(
      0,
      Math.min(audioDuration, (x / rect.width) * audioDuration)
    );

    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
    setDragOffset(0);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || audioDuration === 0) return;

      if (isDragging === 'timeline') {
        if (!timelineRef.current) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const time = Math.max(
          0,
          Math.min(audioDuration, (x / rect.width) * audioDuration)
        );

        if (audioRef.current) {
          audioRef.current.currentTime = time;
          setCurrentTime(time);
        }
        return;
      }

      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const time = Math.max(
        0,
        Math.min(audioDuration, (x / rect.width) * audioDuration)
      );

      if (isDragging === 'start') {
        const newStart = Math.max(
          0,
          Math.min(time - dragOffset, cropEnd - 0.1)
        );
        const requestedDuration = cropEnd - newStart;

        // Check if user is trying to extend beyond maxDuration (free tier limit)
        if (
          maxDuration &&
          subscriptionTier === 'free' &&
          requestedDuration > maxDuration
        ) {
          setShowUpgradePopup(true);
          setIsDragging(null); // Stop dragging
          return; // Don't allow the drag
        }

        const finalEnd = maxDuration
          ? Math.min(audioDuration, newStart + (maxDuration || audioDuration))
          : cropEnd;
        setCropStart(newStart);
        if (finalEnd < cropEnd) {
          setCropEnd(finalEnd);
        }
      } else if (isDragging === 'end') {
        const requestedEnd = Math.max(cropStart + 0.1, time - dragOffset);
        const requestedDuration = requestedEnd - cropStart;

        // Check if user is trying to extend beyond maxDuration (free tier limit)
        if (
          maxDuration &&
          subscriptionTier === 'free' &&
          requestedDuration > maxDuration
        ) {
          setShowUpgradePopup(true);
          setIsDragging(null); // Stop dragging
          return; // Don't allow the drag
        }

        const finalEnd = maxDuration
          ? Math.min(audioDuration, cropStart + (maxDuration || audioDuration))
          : audioDuration;
        const newEnd = Math.max(
          cropStart + 0.1,
          Math.min(requestedEnd, finalEnd)
        );
        setCropEnd(newEnd);
      } else if (isDragging === 'area') {
        const cropDuration = cropEnd - cropStart;
        const newStart = Math.max(
          0,
          Math.min(time - dragOffset, audioDuration - cropDuration)
        );
        let finalEnd = newStart + cropDuration;

        if (maxDuration && subscriptionTier === 'free') {
          finalEnd = Math.min(audioDuration, newStart + maxDuration);

          if (finalEnd - newStart < cropDuration) {
            const adjustedStart = Math.max(0, finalEnd - maxDuration);
            setCropStart(adjustedStart);
            setCropEnd(finalEnd);
          } else {
            setCropStart(newStart);
            setCropEnd(finalEnd);
          }
        } else {
          finalEnd = Math.min(audioDuration, finalEnd);
          setCropStart(newStart);
          setCropEnd(finalEnd);
        }
      }
    },
    [
      isDragging,
      audioDuration,
      cropStart,
      cropEnd,
      dragOffset,
      maxDuration,
      subscriptionTier,
    ]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
    setDragOffset(0);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="w-full bg-black/20 rounded-lg p-4" style={{ height }}>
        <div className="text-sm text-muted-foreground">Loading waveform...</div>
      </div>
    );
  }

  const startPercentage =
    audioDuration > 0 ? (cropStart / audioDuration) * 100 : 0;
  const endPercentage =
    audioDuration > 0 ? (cropEnd / audioDuration) * 100 : 100;

  return (
    <div className="w-full space-y-3">
      <div
        ref={containerRef}
        className={`relative w-full rounded-lg overflow-hidden ${
          isDarkMode ? 'bg-black/30' : 'bg-slate-100'
        }`}
        style={{ height }}
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={height}
          className={`w-full h-full cursor-pointer ${
            isDarkMode ? 'bg-black/20' : 'bg-slate-50'
          }`}
          onClick={handleCanvasClick}
          style={{ imageRendering: 'pixelated' }}
        />

        <div
          className={`absolute top-0 bottom-0 cursor-move border-l-2 border-r-2 pointer-events-auto ${
            isDarkMode ? 'border-cyan-400/50' : 'border-blue-600/50'
          }`}
          style={{
            left: `${startPercentage}%`,
            width: `${endPercentage - startPercentage}%`,
            zIndex: 5,
          }}
          onMouseDown={handleCropAreaMouseDown}
        />

        <div
          className={`absolute top-0 bottom-0 w-0.5 cursor-ew-resize transition-colors group pointer-events-auto ${
            isDarkMode
              ? 'bg-cyan-400 hover:bg-cyan-300'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
          style={{ left: `${startPercentage}%`, zIndex: 10 }}
          onMouseDown={e => handleCropMarkerMouseDown(e, 'start')}
        >
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div
              className={`rounded px-1 py-0.5 ${
                isDarkMode ? 'bg-cyan-400' : 'bg-blue-600'
              }`}
            >
              <GripVertical className="w-3 h-3 text-white" />
            </div>
          </div>
        </div>

        <div
          className={`absolute top-0 bottom-0 w-0.5 cursor-ew-resize transition-colors group pointer-events-auto ${
            isDarkMode
              ? 'bg-cyan-400 hover:bg-cyan-300'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
          style={{ left: `${endPercentage}%`, zIndex: 10 }}
          onMouseDown={e => handleCropMarkerMouseDown(e, 'end')}
        >
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div
              className={`rounded px-1 py-0.5 ${
                isDarkMode ? 'bg-cyan-400' : 'bg-blue-600'
              }`}
            >
              <GripVertical className="w-3 h-3 text-white" />
            </div>
          </div>
        </div>
      </div>

      {showSegments && segments.length > 0 && (
        <div className="space-y-1">
          <div
            ref={timelineRef}
            className={`relative w-full h-8 rounded border cursor-pointer overflow-visible ${
              isDarkMode
                ? 'bg-muted/30 border-cyan-400/20'
                : 'bg-slate-50 border-blue-600/20'
            }`}
            onClick={handleTimelineClick}
            onMouseDown={handleTimelineMouseDown}
          >
            {segments.map((segment, index) => {
              const segmentStart = (segment.start_sec / audioDuration) * 100;

              return (
                <div
                  key={segment.segment_number || index}
                  className={`absolute top-0 bottom-0 w-px ${
                    isDarkMode ? 'bg-cyan-400/60' : 'bg-blue-600/60'
                  }`}
                  style={{ left: `${segmentStart}%` }}
                />
              );
            })}
            {audioDuration > 0 && (
              <>
                <div
                  className={`absolute top-0 bottom-0 ${
                    isDarkMode ? 'bg-pink-500' : 'bg-pink-600'
                  }`}
                  style={{
                    left: `${(currentTime / audioDuration) * 100}%`,
                    width: '1px',
                    zIndex: 10,
                    transform: 'translateX(-50%)',
                  }}
                />
                <div
                  className={`absolute top-full mt-1 text-[10px] font-mono whitespace-nowrap ${
                    isDarkMode ? 'text-pink-400' : 'text-pink-600'
                  }`}
                  style={{
                    left: `${(currentTime / audioDuration) * 100}%`,
                    transform: 'translateX(-50%)',
                    zIndex: 10,
                  }}
                >
                  {formatTime(currentTime)}
                </div>
              </>
            )}
          </div>
          <div
            className={`flex items-center justify-between px-2 text-[10px] font-mono ${
              isDarkMode ? 'text-cyan-300/60' : 'text-blue-600/70'
            }`}
          >
            <span>{formatTime(cropStart)}</span>
            <span>{formatTime(cropEnd)}</span>
          </div>
        </div>
      )}

      {interactive && (
        <div className="flex items-center justify-center gap-2 relative z-10">
          <button
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              skipToStartOfTrack();
            }}
            className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative z-10 ${
              isDarkMode
                ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300'
                : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-700'
            }`}
            title="Start of track"
            disabled={audioDuration === 0}
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              skipToPreviousSegment();
            }}
            className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative z-10 ${
              isDarkMode
                ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300'
                : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-700'
            }`}
            title="Previous segment"
            disabled={!segments.length || audioDuration === 0}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              skipToCropStart();
            }}
            className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative z-10 ${
              isDarkMode
                ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300'
                : 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-700'
            }`}
            title="Start of selected area"
            disabled={audioDuration === 0}
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              togglePlayPause();
            }}
            className={`p-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative z-10 ${
              isDarkMode
                ? 'bg-cyan-500/30 hover:bg-cyan-500/40 text-cyan-200'
                : 'bg-blue-600/30 hover:bg-blue-600/40 text-blue-700'
            }`}
            title={isPlaying ? 'Pause' : 'Play'}
            disabled={!resolvedAudioUrl}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              skipToCropEnd();
            }}
            className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative z-10 ${
              isDarkMode
                ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300'
                : 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-700'
            }`}
            title="End of selected area"
            disabled={audioDuration === 0}
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
          <button
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              skipToNextSegment();
            }}
            className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative z-10 ${
              isDarkMode
                ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300'
                : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-700'
            }`}
            title="Next segment"
            disabled={!segments.length || audioDuration === 0}
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              skipToEndOfTrack();
            }}
            className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative z-10 ${
              isDarkMode
                ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300'
                : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-700'
            }`}
            title="End of track"
            disabled={audioDuration === 0}
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      )}

      <UpgradePopup
        isOpen={showUpgradePopup}
        onClose={() => setShowUpgradePopup(false)}
        origin="visualizer"
        membership={
          subscriptionTier === 'enterprise' ||
          subscriptionTier === 'plus' ||
          subscriptionTier === 'premium'
            ? 'business'
            : subscriptionTier
        }
      />

      {/* Hidden audio element for playback - always render like AudioTrackItem */}
      <audio
        ref={audioRef}
        src={getAudioUrl() || undefined}
        preload="metadata"
        key={resolvedAudioUrl || 'audio-placeholder'}
      />
    </div>
  );
}

export { AudioWaveformVisualizer as AudioVisualizer };
