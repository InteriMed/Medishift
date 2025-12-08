"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface StoryboardProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  sceneId?: string;
  generationStep?: string;
}

export function Storyboard({
  open,
  onClose,
  projectId,
  sceneId,
  generationStep
}: StoryboardProps) {
  const router = useRouter();

  useEffect(() => {
    if (open && projectId) {
      let path = `/dashboard/storyboard/${projectId}`;
      const params = new URLSearchParams();
      if (sceneId) params.set("scene", sceneId);
      if (generationStep) params.set("step", generationStep);
      
      const queryString = params.toString();
      if (queryString) {
        path += `?${queryString}`;
      }
      
      router.push(path);
    }
  }, [open, projectId, sceneId, generationStep, router]);

  return null;
}

