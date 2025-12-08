"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Play,
  Download,
} from 'lucide-react';
import { Project } from '@/lib/api/projects';
import { FileExplorerSidebar } from './file-explorer/FileExplorerSidebar';
import { FileExplorerToolbar } from './file-explorer/FileExplorerToolbar';
import { FileGrid } from './file-explorer/FileGrid';
import { FileList } from './file-explorer/FileList';
import { TheaterMode } from './file-explorer/TheaterMode';
import { FileItem } from './file-explorer/file-utils';

interface ProjectFileExplorerProps {
  project: Project & { name: string };
  onClose: () => void;
  onOpenProject: (project: Project) => void;
}

export function ProjectFileExplorer({ project, onClose, onOpenProject }: ProjectFileExplorerProps) {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [fileTree, setFileTree] = useState<FileItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number>(-1);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [itemSize, setItemSize] = useState(150);
  const [theaterFile, setTheaterFile] = useState<FileItem | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const generateMockFileStructure = (project: Project): FileItem[] => {
    const baseStructure: FileItem[] = [
      {
        name: 'music',
        type: 'folder',
        path: '/music',
        children: [
          {
            name: 'track1.wav',
            type: 'file',
            path: '/music/track1.wav',
            size: 10240000,
            modified: project.updated_at,
            extension: '.wav'
          },
          {
            name: 'track2.mp3',
            type: 'file',
            path: '/music/track2.mp3',
            size: 5120000,
            modified: project.updated_at,
            extension: '.mp3'
          },
          {
            name: 'background_music.wav',
            type: 'file',
            path: '/music/background_music.wav',
            size: 8000000,
            modified: project.updated_at,
            extension: '.wav'
          }
        ]
      },
      {
        name: 'video',
        type: 'folder',
        path: '/video',
        children: [
          {
            name: 'final_video.mp4',
            type: 'file',
            path: '/video/final_video.mp4',
            size: 50000000,
            modified: project.updated_at,
            extension: '.mp4'
          },
          {
            name: 'draft_video.mp4',
            type: 'file',
            path: '/video/draft_video.mp4',
            size: 25000000,
            modified: project.updated_at,
            extension: '.mp4'
          },
          {
            name: 'preview.mp4',
            type: 'file',
            path: '/video/preview.mp4',
            size: 12000000,
            modified: project.updated_at,
            extension: '.mp4'
          }
        ]
      },
      {
        name: 'image',
        type: 'folder',
        path: '/image',
        children: [
          {
            name: 'thumbnail.png',
            type: 'file',
            path: '/image/thumbnail.png',
            size: 500000,
            modified: project.updated_at,
            extension: '.png'
          },
          {
            name: 'cover.jpg',
            type: 'file',
            path: '/image/cover.jpg',
            size: 800000,
            modified: project.updated_at,
            extension: '.jpg'
          },
          {
            name: 'background.jpg',
            type: 'file',
            path: '/image/background.jpg',
            size: 1200000,
            modified: project.updated_at,
            extension: '.jpg'
          },
          {
            name: 'logo.png',
            type: 'file',
            path: '/image/logo.png',
            size: 150000,
            modified: project.updated_at,
            extension: '.png'
          }
        ]
      },
      {
        name: 'audio',
        type: 'folder',
        path: '/audio',
        children: [
          {
            name: 'voiceover.wav',
            type: 'file',
            path: '/audio/voiceover.wav',
            size: 2000000,
            modified: project.updated_at,
            extension: '.wav'
          },
          {
            name: 'sound_effects.wav',
            type: 'file',
            path: '/audio/sound_effects.wav',
            size: 800000,
            modified: project.updated_at,
            extension: '.wav'
          }
        ]
      }
    ];

    return baseStructure;
  };

  useEffect(() => {
    setTimeout(() => {
      setFileTree(generateMockFileStructure(project));
      setLoading(false);
    }, 500);
  }, [project]);

  const getAllFiles = (items: FileItem[]): FileItem[] => {
    let allFiles: FileItem[] = [];
    for (const item of items) {
      if (item.type === 'file') {
        allFiles.push(item);
      }
      if (item.children) {
        allFiles = allFiles.concat(getAllFiles(item.children));
      }
    }
    return allFiles;
  };

  const getCurrentFiles = (): FileItem[] => {
    if (!currentPath) return fileTree;
    
    const findFolder = (items: FileItem[], path: string): FileItem | null => {
      for (const item of items) {
        if (item.path === path) return item;
        if (item.children) {
          const found = findFolder(item.children, path);
          if (found) return found;
        }
      }
      return null;
    };

    const folder = findFolder(fileTree, currentPath);
    return folder?.children || [];
  };

  const handleFileClick = (file: FileItem, index: number, e: React.MouseEvent) => {
    if (file.type === 'folder') {
      setCurrentPath(file.path);
      setSelectedFiles(new Set());
      setLastSelectedIndex(-1);
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      const newSelection = new Set(selectedFiles);
      if (newSelection.has(file.path)) {
        newSelection.delete(file.path);
      } else {
        newSelection.add(file.path);
      }
      setSelectedFiles(newSelection);
      setLastSelectedIndex(index);
    } else if (e.shiftKey && lastSelectedIndex !== -1) {
      const currentFiles = getCurrentFiles();
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const newSelection = new Set(selectedFiles);
      for (let i = start; i <= end; i++) {
        if (currentFiles[i]?.type === 'file') {
          newSelection.add(currentFiles[i].path);
        }
      }
      setSelectedFiles(newSelection);
    } else {
      setSelectedFiles(new Set([file.path]));
      setLastSelectedIndex(index);
    }
  };

  const handleFileDoubleClick = (file: FileItem) => {
    if (file.type === 'file') {
      setTheaterFile(file);
    }
  };

  const handlePathChange = (path: string) => {
    setCurrentPath(path);
    setSelectedFiles(new Set());
    setLastSelectedIndex(-1);
  };

  const handleBack = () => {
    if (currentPath) {
      const parentPath = currentPath.split('/').slice(0, -1).join('/') || '';
      handlePathChange(parentPath);
    }
  };

  const handleDownload = (file: FileItem) => {
    console.log('Download:', file.path);
  };

  const handleDownloadSelected = () => {
    selectedFiles.forEach(path => {
      const file = getAllFiles(fileTree).find(f => f.path === path);
      if (file) handleDownload(file);
    });
  };

  const getDirectories = (): FileItem[] => {
    const getAllDirs = (items: FileItem[], basePath: string = ''): FileItem[] => {
      let dirs: FileItem[] = [];
      for (const item of items) {
        if (item.type === 'folder') {
          dirs.push({ ...item, path: basePath + item.path });
          if (item.children) {
            dirs = dirs.concat(getAllDirs(item.children, basePath + item.path));
          }
        }
      }
      return dirs;
    };
    return getAllDirs(fileTree);
  };

  const directories = useMemo(() => getDirectories(), [fileTree]);
  const currentFiles = useMemo(() => getCurrentFiles(), [currentPath, fileTree]);
  const allFiles = useMemo(() => getAllFiles(fileTree), [fileTree]);

  const handleTheaterPrevious = () => {
    if (!theaterFile) return;
    const fileIndex = allFiles.findIndex(f => f.path === theaterFile.path);
    if (fileIndex > 0) {
      setTheaterFile(allFiles[fileIndex - 1]);
    }
  };

  const handleTheaterNext = () => {
    if (!theaterFile) return;
    const fileIndex = allFiles.findIndex(f => f.path === theaterFile.path);
    if (fileIndex < allFiles.length - 1) {
      setTheaterFile(allFiles[fileIndex + 1]);
    }
  };

  if (loading) {
    return (
      <div className="h-full bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading project files...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <FileExplorerSidebar
        directories={directories}
        currentPath={currentPath}
        onPathChange={handlePathChange}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full">
        {/* HEADER */}
        <div className="p-4 lg:p-6 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <FileExplorerToolbar
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
              <div className="flex-1 flex justify-center">
                <h2 className="text-xl font-semibold text-foreground">
                  {project.name || 'Untitled Project'}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedFiles.size > 0 && (
                <Button variant="outline" size="sm" onClick={handleDownloadSelected}>
                  <Download className="w-4 h-4 mr-2" />
                  Download ({selectedFiles.size})
                </Button>
              )}
              <Button 
                onClick={() => onOpenProject(project)} 
                className="btn-ai-gradient"
              >
                <Play className="w-4 h-4 mr-2" />
                Open Project
              </Button>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="max-w-5xl mx-auto h-full">
            <div className="space-y-6 h-full flex flex-col">
              {viewMode === 'grid' ? (
                <FileGrid
                  files={currentFiles}
                  selectedFiles={selectedFiles}
                  itemSize={itemSize}
                  onFileClick={handleFileClick}
                  onFileDoubleClick={handleFileDoubleClick}
                  onDownload={handleDownload}
                />
              ) : (
                <FileList
                  files={currentFiles}
                  selectedFiles={selectedFiles}
                  onFileClick={handleFileClick}
                  onFileDoubleClick={handleFileDoubleClick}
                  onDownload={handleDownload}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <TheaterMode
        open={theaterFile !== null}
        onClose={() => setTheaterFile(null)}
        file={theaterFile}
        files={allFiles}
        onPrevious={handleTheaterPrevious}
        onNext={handleTheaterNext}
      />
    </div>
  );
}
