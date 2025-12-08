import {
  Folder,
  File,
  Image,
  Video,
  Music,
  FileText,
} from 'lucide-react';

export interface FileItem {
  name: string;
  type: 'file' | 'folder';
  path: string;
  size?: number;
  modified?: string;
  extension?: string;
  children?: FileItem[];
  url?: string;
}

export const FILE_ICONS = {
  '.png': Image,
  '.jpg': Image,
  '.jpeg': Image,
  '.gif': Image,
  '.webp': Image,
  '.svg': Image,
  '.mp4': Video,
  '.avi': Video,
  '.mov': Video,
  '.wmv': Video,
  '.flv': Video,
  '.webm': Video,
  '.mp3': Music,
  '.wav': Music,
  '.flac': Music,
  '.aac': Music,
  '.ogg': Music,
  '.json': FileText,
  '.txt': FileText,
  '.md': FileText,
  '.pdf': FileText,
  default: File
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getFileIcon = (file: FileItem) => {
  if (file.type === 'folder') return Folder;
  const extension = file.extension?.toLowerCase();
  return FILE_ICONS[extension as keyof typeof FILE_ICONS] || FILE_ICONS.default;
};

