import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Music,
  Video,
  Film,
  Calendar,
  Clock,
  Check,
  FolderOpen
} from 'lucide-react';
import { Project } from '@/lib/api/projects';

interface ProjectCardProps {
  project: Project;
  onDelete: (projectId: string) => void;
  onPlay?: (project: Project) => void;
  onViewFiles?: (project: Project) => void;
  viewMode?: 'grid' | 'list';
  isSelected?: boolean;
  onSelect?: (projectId: string, selected: boolean) => void;
  selectionMode?: boolean;
}

const PROJECT_ICONS = {
  'music-clip': Music,
  'video-clip': Video,
  'video-edit': Video, // Map video-edit to Video icon
  'audio-edit': Music, // Map audio-edit to Music icon
  'image-edit': Film, // Map image-edit to Film icon
  'short-clip': Film,
  'custom': Music, // Default to Music icon for custom types
  'undefined': Music, // Default to Music icon for undefined types
};

const STATUS_COLORS = {
  created: 'bg-gray-100 text-gray-800',
  uploading: 'bg-blue-100 text-blue-800',
  analyzing: 'bg-yellow-100 text-yellow-800',
  queued: 'bg-purple-100 text-purple-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
  draft: 'bg-gray-100 text-gray-800',
  archived: 'bg-gray-100 text-gray-800',
};

export function ProjectCard({
  project,
  onDelete,
  onPlay,
  onViewFiles,
  viewMode = 'grid',
  isSelected = false,
  onSelect,
  selectionMode = false
}: ProjectCardProps) {
  const IconComponent = PROJECT_ICONS[project.type] || PROJECT_ICONS['undefined'] || Music;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handlePlay = () => {
    onPlay?.(project);
  };

  const handleViewFiles = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewFiles?.(project);
  };

  const handleSelect = (e: React.MouseEvent) => {
    if (selectionMode && onSelect) {
      e.stopPropagation();
      onSelect(project.id, !isSelected);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (selectionMode && onSelect) {
      e.stopPropagation();
      onSelect(project.id, !isSelected);
    } else if (!selectionMode) {
      // Open the project in dashboard/create section
      onPlay?.(project);
    }
  };

  if (viewMode === 'list') {
    return (
      <div
        className={cn(
          "group transition-all duration-200 cursor-pointer p-3 rounded-xl bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/10",
          isSelected ? 'ring-2 ring-primary border-primary/20' : 'hover:from-primary/10 hover:to-purple-500/10'
        )}
        onClick={handleCardClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            {selectionMode && (
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-primary border-primary text-white' : 'border-gray-300'
                  }`}
                onClick={handleSelect}
              >
                {isSelected && <Check className="w-3 h-3" />}
              </div>
            )}
            <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
              <IconComponent className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg text-foreground truncate">{project.name || 'Untitled Project'}</h3>
              <div className="flex items-center space-x-3 mt-1">
                <p className="text-sm text-muted-foreground capitalize">
                  {project.type?.replace('-', ' ') || 'Music Clip'}
                </p>
                <span className="text-muted-foreground/60">•</span>
                <p className="text-sm text-muted-foreground/80">
                  Created {formatDate(project.created_at)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4 flex-shrink-0">
            <Badge className={`${STATUS_COLORS[project.status]} font-medium`}>
              {project.status}
            </Badge>
            {onViewFiles && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewFiles}
                className="hover:bg-primary/10"
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                Files
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative transition-all duration-200 cursor-pointer rounded-xl overflow-hidden bg-muted",
        isSelected ? 'ring-2 ring-primary border-primary/20' : 'hover:shadow-lg'
      )}
      onClick={handleCardClick}
    >
      {/* Image / Thumbnail */}
      <div className="relative w-full">
        {(project.thumbnail_url || project.preview_url) ? (
          <img
            src={project.thumbnail_url || project.preview_url}
            alt={project.name || 'Project preview'}
            className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full aspect-square bg-gradient-to-br from-primary/5 to-purple-500/5 flex items-center justify-center">
            <IconComponent className="w-12 h-12 text-primary/20" />
          </div>
        )}
      </div>

      {/* Selection Overlay (Always visible when selected or in selection mode) */}
      {selectionMode && (
        <div
          className={cn(
            "absolute top-2 left-2 z-20 transition-opacity duration-200",
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          <div
            className={cn(
              "w-6 h-6 rounded-full border-2 flex items-center justify-center backdrop-blur-sm",
              isSelected
                ? 'bg-primary border-primary text-white'
                : 'bg-black/20 border-white/50 text-transparent hover:bg-black/40 hover:border-white'
            )}
            onClick={handleSelect}
          >
            <Check className="w-3.5 h-3.5" />
          </div>
        </div>
      )}

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 z-10">

        {/* Top Actions (Visible on hover) */}
        <div className="absolute top-2 right-2 flex gap-2">
          <Badge className={cn("backdrop-blur-md bg-black/50 hover:bg-black/70 border-white/10 text-white", STATUS_COLORS[project.status])}>
            {project.status}
          </Badge>
        </div>

        {/* Center Play Button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75 pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white">
            <IconComponent className="w-6 h-6 fill-current" />
          </div>
        </div>

        {/* Bottom Details */}
        <div className="space-y-1 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
          <h3 className="text-white font-semibold text-lg leading-tight line-clamp-2">
            {project.name || 'Untitled Project'}
          </h3>

          <div className="flex items-center justify-between text-xs text-gray-300">
            <div className="flex items-center gap-2">
              <span className="capitalize">{project.type?.replace('-', ' ') || 'Music Clip'}</span>
              <span>•</span>
              <span>{formatDate(project.created_at)}</span>
            </div>

            {onViewFiles && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleViewFiles}
                className="h-8 w-8 text-white hover:bg-white/20 hover:text-white rounded-full"
                title="View Files"
              >
                <FolderOpen className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
