"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface PanoramaImageViewerProps {
  imageUrl: string;
  alt?: string;
  className?: string;
  onImageClick?: (e: React.MouseEvent) => void;
  onImageLoad?: (img: HTMLImageElement) => void;
}

export function PanoramaImageViewer({
  imageUrl,
  alt = "Panorama",
  className,
  onImageClick,
  onImageLoad
}: PanoramaImageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const imageWidthRef = useRef<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const dragStartXRef = useRef<number>(0);
  const hasDraggedRef = useRef<boolean>(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    hasDraggedRef.current = false;
    const offsetX = e.pageX - scrollRef.current.offsetLeft;
    setStartX(offsetX);
    dragStartXRef.current = e.pageX;
    setScrollLeft(scrollRef.current.scrollLeft);
    scrollRef.current.style.cursor = 'grabbing';
    scrollRef.current.style.userSelect = 'none';
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    if (Math.abs(walk) > 2) {
      hasDraggedRef.current = true;
    }
    scrollRef.current.scrollLeft = scrollLeft - walk;
  }, [isDragging, startX, scrollLeft]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    const wasDragging = isDragging;
    const hadDragged = hasDraggedRef.current;
    setIsDragging(false);
    scrollRef.current.style.cursor = 'grab';
    scrollRef.current.style.userSelect = '';
    
    if (wasDragging && hadDragged) {
      e.stopPropagation();
    }
  }, [isDragging]);

  const handleMouseLeave = useCallback(() => {
    if (!scrollRef.current) return;
    setIsDragging(false);
    scrollRef.current.style.cursor = 'grab';
    scrollRef.current.style.userSelect = '';
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    hasDraggedRef.current = false;
    const offsetX = e.touches[0].pageX - scrollRef.current.offsetLeft;
    setStartX(offsetX);
    dragStartXRef.current = e.touches[0].pageX;
    setScrollLeft(scrollRef.current.scrollLeft);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.touches[0].pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    if (Math.abs(walk) > 2) {
      hasDraggedRef.current = true;
    }
    scrollRef.current.scrollLeft = scrollLeft - walk;
  }, [isDragging, startX, scrollLeft]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const wasDragging = isDragging;
    const hadDragged = hasDraggedRef.current;
    setIsDragging(false);
    
    if (wasDragging && hadDragged) {
      e.stopPropagation();
    }
  }, [isDragging]);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement || !imageLoaded || imageWidthRef.current === 0) return;

    const handleScroll = () => {
      if (!scrollElement) return;
      
      const scrollLeft = scrollElement.scrollLeft;
      const imageWidth = imageWidthRef.current;

      if (scrollLeft <= imageWidth * 0.5) {
        scrollElement.scrollLeft = imageWidth * 1.5;
      } else if (scrollLeft >= imageWidth * 2.5) {
        scrollElement.scrollLeft = imageWidth * 1.5;
      }
    };

    scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    
    if (scrollElement.scrollLeft === 0) {
      scrollElement.scrollLeft = imageWidthRef.current;
    }

    return () => {
      scrollElement.removeEventListener('scroll', handleScroll);
    };
  }, [imageLoaded]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (scrollRef.current && img.naturalWidth > 0) {
      const containerWidth = scrollRef.current.clientWidth;
      const imageAspectRatio = img.naturalWidth / img.naturalHeight;
      const containerHeight = scrollRef.current.clientHeight;
      const displayedImageWidth = containerHeight * imageAspectRatio;
      imageWidthRef.current = displayedImageWidth;
      
      setImageLoaded(true);
      
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollLeft = displayedImageWidth;
        }
      });
    }
    if (onImageLoad) {
      onImageLoad(img);
    }
  };

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (!hasDraggedRef.current && onImageClick) {
      onImageClick(e);
    }
  }, [onImageClick]);

  return (
    <div
      ref={containerRef}
      className={cn("w-full h-full relative overflow-hidden", className)}
      onClick={handleContainerClick}
    >
      <div
        ref={scrollRef}
        className="w-full h-full overflow-x-auto overflow-y-hidden flex snap-x snap-mandatory scrollbar-hide"
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          scrollBehavior: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={(e) => {
          handleMouseLeave();
          if (isDragging) {
            setIsDragging(false);
            if (scrollRef.current) {
              scrollRef.current.style.cursor = 'grab';
              scrollRef.current.style.userSelect = '';
            }
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex h-full" style={{ minWidth: '300%' }}>
          <div className="flex-shrink-0 h-full w-full flex items-center justify-center">
            <img
              src={imageUrl}
              alt={alt}
              className="h-full w-auto object-contain"
              onLoad={handleImageLoad}
              draggable={false}
            />
          </div>
          <div className="flex-shrink-0 h-full w-full flex items-center justify-center">
            <img
              src={imageUrl}
              alt={alt}
              className="h-full w-auto object-contain"
              draggable={false}
            />
          </div>
          <div className="flex-shrink-0 h-full w-full flex items-center justify-center">
            <img
              src={imageUrl}
              alt={alt}
              className="h-full w-auto object-contain"
              draggable={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

