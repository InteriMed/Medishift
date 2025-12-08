'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Play, Pause } from 'lucide-react';
import { getAudioDuration } from '@/utils/music-clip-utils';
import { createValidatedBlobURL } from '@/utils/memory-management';

interface AudioDurationCropperProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (startTime: number, endTime: number) => void;
  audioFile: File | null;
  audioUrl?: string;
  maxDuration?: number;
  initialStartTime?: number;
  initialEndTime?: number;
}

export function AudioDurationCropper({
  open,
  onClose,
  onConfirm,
  audioFile,
  audioUrl,
  maxDuration,
  initialStartTime = 0,
  initialEndTime,
}: AudioDurationCropperProps) {
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(initialStartTime);
  const [endTime, setEndTime] = useState<number>(initialEndTime || 0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const drawWaveform = (bars: number[]) => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const barWidth = width / bars.length;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#3b82f6';

    bars.forEach((value, index) => {
      const barHeight = value * height * 0.8;
      const x = index * barWidth;
      const y = (height - barHeight) / 2;

      ctx.fillRect(x, y, barWidth - 1, barHeight);
    });
  };

  const generateWaveform = useCallback(() => {
    if (!audioFile && !audioUrl) return;

    const canvas = waveformCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const audio = audioRef.current || new Audio();
    if (audioFile) {
      audio.src = createValidatedBlobURL(audioFile);
    } else if (audioUrl) {
      audio.src = audioUrl;
    }

    audio.crossOrigin = 'anonymous';
    const source = audioContext.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    const generateBars = () => {
      analyser.getByteFrequencyData(dataArray);
      const bars: number[] = [];
      const step = Math.floor(bufferLength / 200);

      for (let i = 0; i < 200; i++) {
        const index = i * step;
        bars.push(dataArray[index] / 255);
      }

      setWaveformData(bars);
      drawWaveform(bars);
    };

    audio.addEventListener('loadeddata', () => {
      generateBars();
    });

    if (audio.readyState >= 2) {
      generateBars();
    }
  }, [audioFile, audioUrl]);

  useEffect(() => {
    if (!open || (!audioFile && !audioUrl)) return;

    const loadAudio = async () => {
      try {
        let duration = 0;
        if (audioFile) {
          duration = await getAudioDuration(audioFile);
        } else if (audioUrl) {
          const audio = new Audio(audioUrl);
          await new Promise((resolve, reject) => {
            audio.addEventListener('loadedmetadata', () => {
              duration = audio.duration;
              resolve(duration);
            });
            audio.addEventListener('error', reject);
            audio.load();
          });
        }

        setAudioDuration(duration);
        if (!initialEndTime) {
          const finalEndTime = maxDuration
            ? Math.min(duration, maxDuration)
            : duration;
          setEndTime(finalEndTime);
        } else {
          setEndTime(Math.min(initialEndTime, maxDuration || duration));
        }
        setStartTime(Math.min(initialStartTime, maxDuration || duration));

        generateWaveform();
      } catch (error) {
        console.error('Failed to load audio:', error);
      }
    };

    loadAudio();
  }, [
    open,
    audioFile,
    audioUrl,
    maxDuration,
    initialStartTime,
    initialEndTime,
    generateWaveform,
  ]);

  useEffect(() => {
    if (waveformData.length > 0) {
      drawWaveform(waveformData);
    }
  }, [waveformData, startTime, endTime, audioDuration]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, type: 'start' | 'end') => {
      e.preventDefault();
      setIsDragging(type);
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      const time = percentage * audioDuration;

      if (isDragging === 'start') {
        const newStartTime = Math.max(0, Math.min(time, endTime - 0.1));
        setStartTime(newStartTime);
        if (audioRef.current) {
          audioRef.current.currentTime = newStartTime;
        }
      } else if (isDragging === 'end') {
        const maxEnd = maxDuration
          ? Math.min(audioDuration, maxDuration)
          : audioDuration;
        const newEndTime = Math.max(startTime + 0.1, Math.min(time, maxEnd));
        setEndTime(newEndTime);
      }
    },
    [isDragging, audioDuration, startTime, endTime, maxDuration]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
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

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.currentTime = startTime;
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, startTime]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const time = audio.currentTime;
      setCurrentTime(time);

      if (time >= endTime) {
        audio.pause();
        setIsPlaying(false);
        audio.currentTime = startTime;
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      audio.currentTime = startTime;
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [startTime, endTime]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startPercentage =
    audioDuration > 0 ? (startTime / audioDuration) * 100 : 0;
  const endPercentage =
    audioDuration > 0 ? (endTime / audioDuration) * 100 : 100;
  const selectedDuration = endTime - startTime;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adjust Audio Duration</DialogTitle>
          <DialogDescription>
            Drag the borders to select the portion of the audio you want to use.
            {maxDuration && ` Maximum duration: ${formatTime(maxDuration)}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {(audioFile || audioUrl) && (
            <audio
              ref={audioRef}
              src={audioFile ? createValidatedBlobURL(audioFile) : audioUrl}
              preload="metadata"
              className="hidden"
            />
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button onClick={handlePlayPause} variant="outline" size="sm">
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>
              <div className="text-sm text-muted-foreground">
                {formatTime(currentTime)} / {formatTime(endTime)}
              </div>
            </div>
            <div className="text-sm font-medium">
              Selected: {formatTime(selectedDuration)}
            </div>
          </div>

          <div
            ref={containerRef}
            className="relative w-full h-32 bg-muted rounded-lg overflow-hidden cursor-pointer"
          >
            <canvas
              ref={waveformCanvasRef}
              className="absolute inset-0 w-full h-full"
              width={800}
              height={128}
            />

            <div
              className="absolute top-0 bottom-0 bg-primary/20 border-l-2 border-r-2 border-primary"
              style={{
                left: `${startPercentage}%`,
                width: `${endPercentage - startPercentage}%`,
              }}
            />

            <div
              className="absolute top-0 bottom-0 w-1 bg-primary cursor-ew-resize hover:bg-primary/80 transition-colors"
              style={{ left: `${startPercentage}%` }}
              onMouseDown={e => handleMouseDown(e, 'start')}
            >
              <div className="absolute -top-2 -bottom-2 left-1/2 -translate-x-1/2 w-4" />
            </div>

            <div
              className="absolute top-0 bottom-0 w-1 bg-primary cursor-ew-resize hover:bg-primary/80 transition-colors"
              style={{ left: `${endPercentage}%` }}
              onMouseDown={e => handleMouseDown(e, 'end')}
            >
              <div className="absolute -top-2 -bottom-2 left-1/2 -translate-x-1/2 w-4" />
            </div>

            <div className="absolute bottom-2 left-2 text-xs text-muted-foreground">
              {formatTime(startTime)}
            </div>
            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
              {formatTime(endTime)}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                onConfirm(startTime, endTime);
                onClose();
              }}
            >
              Confirm
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
