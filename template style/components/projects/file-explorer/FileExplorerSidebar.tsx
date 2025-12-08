"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Folder, Menu } from "lucide-react";

interface FileItem {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileItem[];
}

interface FileExplorerSidebarProps {
  directories: FileItem[];
  currentPath: string;
  onPathChange: (path: string) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

export function FileExplorerSidebar({
  directories,
  currentPath,
  onPathChange,
  isMobileMenuOpen,
  setIsMobileMenuOpen
}: FileExplorerSidebarProps) {
  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <div className="hidden lg:block w-64 flex-shrink-0 border-r border-primary/10 bg-gradient-to-r from-primary/5 to-purple-500/5 backdrop-blur-sm relative z-10">
        <div className="absolute inset-0 bg-black/30 pointer-events-none"></div>
        <div className="relative z-10">
          <div className="p-4 border-b border-primary/10">
            <h1 className="text-xl font-bold text-foreground">File Explorer</h1>
            <p className="text-sm text-muted-foreground">Project directories</p>
          </div>
          <nav className="p-4 space-y-1">
            <Button
              variant={currentPath === '' ? "default" : "ghost"}
              className="w-full justify-start h-10"
              onClick={() => onPathChange('')}
            >
              <Folder className="w-4 h-4 mr-3" />
              Root
            </Button>
            {directories.map((dir) => (
              <Button
                key={dir.path}
                variant={currentPath === dir.path ? "default" : "ghost"}
                className="w-full justify-start h-10"
                onClick={() => onPathChange(dir.path)}
              >
                <Folder className="w-4 h-4 mr-3" />
                {dir.name}
              </Button>
            ))}
          </nav>
        </div>
      </div>

      {/* MOBILE HEADER */}
      <div className="lg:hidden p-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">File Explorer</h1>
            <p className="text-sm text-muted-foreground">Project directories</p>
          </div>
          
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Menu className="w-4 h-4 mr-2" />
                Menu
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">File Explorer</h2>
                <nav className="space-y-2">
                  <Button
                    variant={currentPath === '' ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => {
                      onPathChange('');
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <Folder className="w-4 h-4 mr-3" />
                    Root
                  </Button>
                  {directories.map((dir) => (
                    <Button
                      key={dir.path}
                      variant={currentPath === dir.path ? "default" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => {
                        onPathChange(dir.path);
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <Folder className="w-4 h-4 mr-3" />
                      {dir.name}
                    </Button>
                  ))}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </>
  );
}

