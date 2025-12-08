"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface RecreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  type: "image" | "video";
  price: {
    usd: number;
    credits: number;
  };
  isLoading?: boolean;
}

export function RecreateDialog({
  open,
  onOpenChange,
  onConfirm,
  type,
  price,
  isLoading = false,
}: RecreateDialogProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-800 border-zinc-700">
        <DialogHeader>
          <DialogTitle className="text-white">
            Recreate {type === "image" ? "Image" : "Video"}?
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            This will regenerate the {type} for this scene. The cost will be deducted from your credits balance.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-lg border border-zinc-700">
            <span className="text-white/70">Cost:</span>
            <div className="flex flex-col items-end gap-1">
              <span className="text-white font-semibold">{price.credits} credits</span>
              <span className="text-xs text-zinc-500">${price.usd.toFixed(2)} USD</span>
            </div>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="bg-zinc-700 text-white border-zinc-600 hover:bg-zinc-600"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              `Recreate ${type === "image" ? "Image" : "Video"}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}





