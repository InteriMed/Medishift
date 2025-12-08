'use client';

import { useRef, useEffect, useState } from 'react';

const CHAR_DELAY = 1;
const BASE_DURATION = 400;

interface StreamingTextProps {
  messageId: string;
  content: string;
  isStreaming: boolean;
  lastRenderedRef: React.MutableRefObject<Map<string, string>>;
  isAgentMessage?: boolean;
  isUserMessage?: boolean;
}

export function StreamingText({
  messageId,
  content,
  isStreaming,
  lastRenderedRef,
  isAgentMessage = false,
  isUserMessage = false,
}: StreamingTextProps) {
  const [renderedBlocks, setRenderedBlocks] = useState<string[]>([]);
  const [animatedBlockIndices, setAnimatedBlockIndices] = useState<Set<number>>(
    new Set()
  );
  const animationTimeoutRef = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const blockStartDelaysRef = useRef<Map<number, number>>(new Map());
  const animationStartTimeRef = useRef<Map<number, number>>(new Map());
  const [visibleCharCount, setVisibleCharCount] = useState(0);
  const previousIsStreamingRef = useRef<Map<string, boolean>>(new Map());
  const [isInitialStreaming, setIsInitialStreaming] = useState(false);
  const previousMessageIdRef = useRef<string>(messageId);

  useEffect(() => {
    if (previousMessageIdRef.current !== messageId) {
      previousMessageIdRef.current = messageId;
      setIsInitialStreaming(false);
      setRenderedBlocks([]);
      setAnimatedBlockIndices(new Set());
      setVisibleCharCount(0);
    }
  }, [messageId]);

  useEffect(() => {
    const styleId = 'streaming-text-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes streamFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes messageFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .stream-word {
        display: inline;
        animation: streamFadeIn 0.4s ease-out forwards;
        opacity: 0;
        word-break: break-word;
        overflow-wrap: break-word;
      }
      .stream-message {
        animation: messageFadeIn 0.4s ease-out forwards;
        opacity: 0;
      }
    `;
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  useEffect(() => {
    const lastRendered = lastRenderedRef.current.get(messageId) || '';
    const wasStreaming = previousIsStreamingRef.current.get(messageId) ?? false;
    const isStartingToStream = !wasStreaming && isStreaming;

    // Detect content changes from backend (single source of truth)
    // When backend updates content, we should animate the new portion
    const contentChanged = content !== lastRendered;
    const contentIncreased = content.length > lastRendered.length;

    if (isStartingToStream) {
      // Reset animation state when starting to stream
      animationTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
      animationTimeoutRef.current.clear();
      blockStartDelaysRef.current.clear();
      animationStartTimeRef.current.clear();
      setRenderedBlocks([]);
      setAnimatedBlockIndices(new Set());
      setVisibleCharCount(0);
      lastRenderedRef.current.set(messageId, '');
      previousIsStreamingRef.current.set(messageId, isStreaming);
      setIsInitialStreaming(content.length > 0);
      // If content is empty, wait for backend to start sending tokens
      if (content.length === 0) {
        return;
      }
    }

    previousIsStreamingRef.current.set(messageId, isStreaming);

    // If content hasn't changed, don't re-render
    if (content === lastRendered) {
      return;
    }

    // Backend content increased - ensure animation triggers
    // The code below will handle creating new blocks and animating them letter-by-letter

    const contentLengthDiff = content.length - lastRendered.length;
    const isFirstRender = lastRendered.length === 0 && content.length > 0;
    const isNonAgentInstantContent =
      !isAgentMessage && !isStreaming && isFirstRender && content.length > 200;

    if (isNonAgentInstantContent) {
      animationTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
      animationTimeoutRef.current.clear();
      blockStartDelaysRef.current.clear();
      setIsInitialStreaming(false);
      setRenderedBlocks([content]);
      setAnimatedBlockIndices(new Set([0]));
      animationStartTimeRef.current.set(0, performance.now());
      lastRenderedRef.current.set(messageId, content);

      const charCount = content.length;
      const animationDuration =
        charCount > 0
          ? (charCount - 1) * CHAR_DELAY + BASE_DURATION
          : BASE_DURATION;

      const timeout = setTimeout(() => {
        setAnimatedBlockIndices(new Set());
        animationTimeoutRef.current.delete(0);
        animationStartTimeRef.current.delete(0);
      }, animationDuration);

      animationTimeoutRef.current.set(0, timeout);
      return;
    }

    // Backend content increased - create new block and animate it letter-by-letter
    if (content.length > lastRendered.length) {
      const newBlock = content.slice(lastRendered.length);

      setIsInitialStreaming(false);

      setRenderedBlocks(prev => {
        const newBlocks = [...prev];
        const existingText = newBlocks.join('');

        // If existing blocks match lastRendered, add new block
        if (existingText === lastRendered) {
          newBlocks.push(newBlock);
          const newIndex = newBlocks.length - 1;

          const charCount = newBlock.length;
          const animationDuration =
            charCount > 0
              ? (charCount - 1) * CHAR_DELAY + BASE_DURATION
              : BASE_DURATION;

          let blockStartDelay = 0;
          if (isAgentMessage && newIndex > 0) {
            const previousIndex = newIndex - 1;
            const prevBlock = newBlocks[previousIndex];
            const prevCharCount = prevBlock?.length || 0;
            const prevBlockStartDelay =
              blockStartDelaysRef.current.get(previousIndex) || 0;
            blockStartDelay = prevBlockStartDelay + prevCharCount * CHAR_DELAY;
          }

          blockStartDelaysRef.current.set(newIndex, blockStartDelay);
          if (newIndex === 0 || !animationStartTimeRef.current.has(0)) {
            animationStartTimeRef.current.set(0, performance.now());
          }

          setAnimatedBlockIndices(prevIndices => {
            const newIndices = new Set(prevIndices);
            newIndices.add(newIndex);
            return newIndices;
          });

          if (animationTimeoutRef.current.has(newIndex)) {
            clearTimeout(animationTimeoutRef.current.get(newIndex)!);
          }

          const timeout = setTimeout(() => {
            setAnimatedBlockIndices(prevIndices => {
              const newIndices = new Set(prevIndices);
              newIndices.delete(newIndex);
              return newIndices;
            });
            animationTimeoutRef.current.delete(newIndex);
          }, blockStartDelay + animationDuration);

          animationTimeoutRef.current.set(newIndex, timeout);

          lastRenderedRef.current.set(messageId, content);
        } else {
          const difference = content.slice(existingText.length);
          if (difference) {
            newBlocks.push(difference);
            const newIndex = newBlocks.length - 1;

            const charCount = difference.length;
            const animationDuration =
              charCount > 0
                ? (charCount - 1) * CHAR_DELAY + BASE_DURATION
                : BASE_DURATION;

            let blockStartDelay = 0;
            if (isAgentMessage && newIndex > 0) {
              const previousIndex = newIndex - 1;
              const prevBlock = newBlocks[previousIndex];
              const prevCharCount = prevBlock?.length || 0;
              const prevBlockStartDelay =
                blockStartDelaysRef.current.get(previousIndex) || 0;
              blockStartDelay =
                prevBlockStartDelay + prevCharCount * CHAR_DELAY;
            }

            blockStartDelaysRef.current.set(newIndex, blockStartDelay);
            if (newIndex === 0 || !animationStartTimeRef.current.has(0)) {
              animationStartTimeRef.current.set(0, performance.now());
            }

            setAnimatedBlockIndices(prevIndices => {
              const newIndices = new Set(prevIndices);
              newIndices.add(newIndex);
              return newIndices;
            });

            if (animationTimeoutRef.current.has(newIndex)) {
              clearTimeout(animationTimeoutRef.current.get(newIndex)!);
            }

            const timeout = setTimeout(() => {
              setAnimatedBlockIndices(prevIndices => {
                const newIndices = new Set(prevIndices);
                newIndices.delete(newIndex);
                return newIndices;
              });
              animationTimeoutRef.current.delete(newIndex);
            }, blockStartDelay + animationDuration);

            animationTimeoutRef.current.set(newIndex, timeout);

            lastRenderedRef.current.set(messageId, content);
          } else {
            blockStartDelaysRef.current.clear();
            setRenderedBlocks([content]);
            setAnimatedBlockIndices(new Set());
            lastRenderedRef.current.set(messageId, content);
          }
        }

        return newBlocks;
      });
    } else if (
      content !== lastRendered &&
      content.length <= lastRendered.length
    ) {
      animationTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
      animationTimeoutRef.current.clear();
      blockStartDelaysRef.current.clear();
      animationStartTimeRef.current.clear();
      setRenderedBlocks([content]);
      setAnimatedBlockIndices(new Set());
      setVisibleCharCount(content.length);
      setIsInitialStreaming(false);
      lastRenderedRef.current.set(messageId, content);
    }

    if (!isStreaming && isInitialStreaming) {
      setIsInitialStreaming(false);
    }

    const animationTimeouts = animationTimeoutRef.current;
    return () => {
      animationTimeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [
    content,
    messageId,
    lastRenderedRef,
    isStreaming,
    isAgentMessage,
    isInitialStreaming,
  ]);

  const splitBlockIntoChars = (
    block: string,
    blockIndex: number,
    shouldAnimate: boolean,
    blockStartCharIndex: number
  ) => {
    if (!shouldAnimate) {
      return <span key={`${messageId}-block-${blockIndex}`}>{block}</span>;
    }

    const blockStartDelay = isAgentMessage
      ? blockStartDelaysRef.current.get(blockIndex) || 0
      : 0;
    const startTime = animationStartTimeRef.current.get(0);
    const now = performance.now();
    const elapsed = startTime ? Math.max(0, now - startTime) : 0;

    return block.split('').map((char, idx) => {
      const charDelay = blockStartDelay + idx * CHAR_DELAY;
      const charIndex = blockStartCharIndex + idx;

      if (charIndex >= visibleCharCount) {
        return null;
      }

      const timeSinceDelay = elapsed - charDelay;

      if (timeSinceDelay < 0) {
        return null;
      }

      const fadeProgress = Math.min(timeSinceDelay / BASE_DURATION, 1);
      const minVisibleOpacity = 0.8;

      if (fadeProgress < minVisibleOpacity) {
        return null;
      }

      return (
        <span
          key={`${messageId}-char-${blockIndex}-${idx}`}
          className="stream-word"
          style={{ animationDelay: `${charDelay}ms` }}
        >
          {char}
        </span>
      );
    });
  };

  useEffect(() => {
    if (renderedBlocks.length === 0 || animatedBlockIndices.size === 0) {
      setVisibleCharCount(content.length);
      return;
    }

    const calculateVisibleChars = () => {
      let totalVisible = 0;
      const startTime = animationStartTimeRef.current.get(0);
      if (!startTime) {
        return 0;
      }

      const now = performance.now();
      const elapsed = Math.max(0, now - startTime);

      renderedBlocks.forEach((block, blockIndex) => {
        const shouldAnimate = animatedBlockIndices.has(blockIndex);
        if (!shouldAnimate) {
          totalVisible += block.length;
          return;
        }

        const blockStartDelay = isAgentMessage
          ? blockStartDelaysRef.current.get(blockIndex) || 0
          : 0;
        const blockStartTime = blockStartDelay;
        const blockElapsed = Math.max(0, elapsed - blockStartTime);

        if (blockElapsed < 0) {
          return;
        }

        const minVisibleOpacity = 0.8;
        const minVisibleDelay = minVisibleOpacity * BASE_DURATION;
        const effectiveElapsed = Math.max(0, blockElapsed - minVisibleDelay);

        const charsVisible = Math.min(
          Math.max(0, Math.floor(effectiveElapsed / CHAR_DELAY) + 1),
          block.length
        );
        totalVisible += charsVisible;
      });

      return Math.min(totalVisible, content.length);
    };

    setVisibleCharCount(calculateVisibleChars());

    const interval = setInterval(() => {
      setVisibleCharCount(prevCount => {
        const newCount = calculateVisibleChars();
        return newCount !== prevCount ? newCount : prevCount;
      });
    }, CHAR_DELAY);

    return () => clearInterval(interval);
  }, [renderedBlocks, content, animatedBlockIndices, isAgentMessage]);

  const allBlocksContent = renderedBlocks.join('');
  const displayContent = renderedBlocks.length > 0 ? allBlocksContent : content;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!(window as any).streamingAnimationState) {
        (window as any).streamingAnimationState = new Map();
      }
      const isAnimating = animatedBlockIndices.size > 0 && content.length > 0;
      const isFullyVisible = visibleCharCount >= content.length;
      const isComplete =
        !isStreaming && !isAnimating && isFullyVisible && content.length > 0;

      (window as any).streamingAnimationState.set(messageId, {
        isAnimating,
        isFullyVisible,
        isComplete,
        visibleCharCount,
        contentLength: content.length,
        animatedBlockCount: animatedBlockIndices.size,
      });

      if (isComplete) {
        setTimeout(() => {
          const currentState = (window as any).streamingAnimationState?.get(
            messageId
          );
          if (currentState && currentState.isComplete) {
            (window as any).streamingAnimationState.set(messageId, {
              ...currentState,
              isComplete: true,
              isAnimating: false,
            });
          }
        }, 100);
      }
    }
  }, [
    messageId,
    animatedBlockIndices.size,
    visibleCharCount,
    content.length,
    isStreaming,
  ]);

  if (isUserMessage) {
    return <span className="stream-message">{content}</span>;
  }

  if (isInitialStreaming && isStreaming && renderedBlocks.length === 0) {
    return null;
  }

  if (renderedBlocks.length > 0) {
    let charIndex = 0;
    return (
      <>
        {renderedBlocks.map((block, blockIndex) => {
          const shouldAnimate = animatedBlockIndices.has(blockIndex);
          const blockStart = charIndex;
          const blockEnd = charIndex + block.length;
          charIndex = blockEnd;

          if (blockEnd <= visibleCharCount) {
            return (
              <span
                key={`${messageId}-block-${blockIndex}`}
                style={{ display: 'inline' }}
              >
                {splitBlockIntoChars(
                  block,
                  blockIndex,
                  shouldAnimate,
                  blockStart
                )}
              </span>
            );
          } else if (blockStart < visibleCharCount) {
            const visiblePart = block.slice(0, visibleCharCount - blockStart);
            return (
              <span
                key={`${messageId}-block-${blockIndex}`}
                style={{ display: 'inline' }}
              >
                {splitBlockIntoChars(
                  visiblePart,
                  blockIndex,
                  shouldAnimate,
                  blockStart
                )}
              </span>
            );
          } else {
            return null;
          }
        })}
      </>
    );
  }

  return <>{content}</>;
}
