"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import { useState, useEffect } from "react";

interface EditPromptPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sceneNumber: number;
  currentPrompt: string;
  onSave: (prompt: string) => void;
  isSaving?: boolean;
}

export function EditPromptPanel({
  isOpen,
  onClose,
  sceneNumber,
  currentPrompt,
  onSave,
  isSaving = false
}: EditPromptPanelProps) {
  const [prompt, setPrompt] = useState(currentPrompt);

  useEffect(() => {
    if (isOpen) {
      setPrompt(currentPrompt);
    }
  }, [currentPrompt, isOpen]);

  const handleSave = () => {
    onSave(prompt);
  };

  const handleClose = () => {
    setPrompt(currentPrompt);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Edit Prompt - Scene {sceneNumber}</SheetTitle>
          <SheetDescription>
            Modify the prompt for this scene. The image will be regenerated when you save.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter a detailed prompt for the scene..."
              className="min-h-[200px] resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !prompt.trim()}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save & Regenerate
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

