"use client";

import { cn } from '@/lib/utils';
import { getFileIcon, formatFileSize } from './file-utils';

interface FileItem {
  name: string;
  type: 'file' | 'folder';
  path: string;
  size?: number;
  extension?: string;
}

interface FileGridProps {
  files: FileItem[];
  selectedFiles: Set<string>;
  itemSize: number;
  onFileClick: (file: FileItem, index: number, e: React.MouseEvent) => void;
  onFileDoubleClick: (file: FileItem) => void;
  onDownload: (file: FileItem) => void;
}

export function FileGrid({
  files,
  selectedFiles,
  itemSize,
  onFileClick,
  onFileDoubleClick,
  onDownload
}: FileGridProps) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${itemSize}px, 1fr))` }}>
      {files.map((file, index) => {
        const IconComponent = getFileIcon(file);
        const isSelected = selectedFiles.has(file.path);
        
        return (
          <div
            key={file.path}
            className={cn(
              "cursor-pointer transition-all duration-200 group relative p-3 rounded-xl bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/10",
              isSelected 
                ? 'ring-2 ring-primary border-primary/20' 
                : 'hover:from-primary/10 hover:to-purple-500/10'
            )}
            onClick={(e) => onFileClick(file, index, e)}
            onDoubleClick={() => onFileDoubleClick(file)}
          >
            <div className="flex flex-col items-center justify-center h-full min-h-[120px]">
              <div className={cn(
                "p-3 rounded-lg mb-2",
                file.type === 'folder' 
                  ? 'bg-primary/10 text-primary' 
                  : 'bg-muted text-muted-foreground'
              )}>
                <IconComponent className="w-8 h-8" />
              </div>
              <p className="font-medium text-foreground text-center text-sm truncate w-full">{file.name}</p>
              {file.size && (
                <p className="text-xs text-muted-foreground mt-1">{formatFileSize(file.size)}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

