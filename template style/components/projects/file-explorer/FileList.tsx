"use client";

import { cn } from '@/lib/utils';
import { getFileIcon, formatFileSize, formatDate } from './file-utils';

interface FileItem {
  name: string;
  type: 'file' | 'folder';
  path: string;
  size?: number;
  modified?: string;
  extension?: string;
}

interface FileListProps {
  files: FileItem[];
  selectedFiles: Set<string>;
  onFileClick: (file: FileItem, index: number, e: React.MouseEvent) => void;
  onFileDoubleClick: (file: FileItem) => void;
  onDownload: (file: FileItem) => void;
}

export function FileList({
  files,
  selectedFiles,
  onFileClick,
  onFileDoubleClick,
  onDownload
}: FileListProps) {
  return (
    <div className="space-y-2">
      {files.map((file, index) => {
        const IconComponent = getFileIcon(file);
        const isSelected = selectedFiles.has(file.path);
        
        return (
          <div
            key={file.path}
            className={cn(
              "cursor-pointer transition-all duration-200 group p-3 rounded-xl bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/10",
              isSelected 
                ? 'ring-2 ring-primary border-primary/20' 
                : 'hover:from-primary/10 hover:to-purple-500/10'
            )}
            onClick={(e) => onFileClick(file, index, e)}
            onDoubleClick={() => onFileDoubleClick(file)}
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-2 rounded-lg",
                file.type === 'folder' 
                  ? 'bg-primary/10 text-primary' 
                  : 'bg-muted text-muted-foreground'
              )}>
                <IconComponent className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{file.name}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <span className="capitalize font-medium">{file.type}</span>
                  {file.size && (
                    <span className="px-2 py-1 bg-muted rounded text-xs">
                      {formatFileSize(file.size)}
                    </span>
                  )}
                  {file.modified && (
                    <span className="text-xs">
                      {formatDate(file.modified)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

