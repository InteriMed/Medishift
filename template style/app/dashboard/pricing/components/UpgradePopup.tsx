"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, ArrowRight } from "lucide-react";
import { upgradeMessages } from "../upgrade-messages";

interface UpgradePopupProps {
  isOpen: boolean;
  onClose: () => void;
  origin: string;
  membership: "free" | "creator" | "pro" | "business";
  customMessage?: {
    title: string;
    description: string;
    cta: string;
    features?: string[];
  };
}

export function UpgradePopup({
  isOpen,
  onClose,
  origin,
  membership,
  customMessage
}: UpgradePopupProps) {
  // Fetch message based on origin and membership, or use custom message
  const defaultMessage = upgradeMessages[origin]?.[membership] || null;
  const message = customMessage || defaultMessage;

  // Don't display if message is null
  if (!message) {
    return null;
  }

  const handleUpgrade = () => {
    onClose();
    // Navigate to pricing page
    window.location.href = "/dashboard/compliance-settings";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center">
              <Crown className="w-4 h-4 text-primary" />
            </div>
            <span>{message.title}</span>
          </DialogTitle>
          <DialogDescription>
            {message.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {message.features && message.features.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Upgrade benefits:</p>
              <ul className="space-y-1.5">
                {message.features.map((feature, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpgrade}
            className="w-full sm:w-auto btn-ai-gradient text-white"
          >
            <Crown className="w-4 h-4 mr-2" />
            {message.cta}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

