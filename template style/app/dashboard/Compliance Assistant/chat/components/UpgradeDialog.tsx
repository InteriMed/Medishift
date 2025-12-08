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
import { Sparkles } from "lucide-react";
import { getBackendUrl } from "@/lib/config";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: string;
  featureName: string;
}

export function UpgradeDialog({
  open,
  onOpenChange,
  tier,
  featureName,
}: UpgradeDialogProps) {
  const handleUpgrade = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        console.error("No authentication token found");
        return;
      }

      const planIdMap: Record<string, string> = {
        creator: "creator",
        pro: "pro",
        business: "business",
      };

      const planId = planIdMap[tier.toLowerCase()] || tier.toLowerCase();

      const response = await fetch(
        `${getBackendUrl()}/api/credits/checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            plan_id: planId,
            plan_type: "subscription",
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail ||
            errorData.message ||
            "Failed to create checkout session"
        );
      }

      const data = await response.json();

      if (data.data && data.data.checkout_url) {
        window.location.href = data.data.checkout_url;
      } else {
        throw new Error("No checkout URL received from server");
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
    }
  };

  const tierDisplayName =
    tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Upgrade Required
          </DialogTitle>
          <DialogDescription>
            {featureName} is available on the {tierDisplayName} plan.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Upgrade to {tierDisplayName} to unlock this feature and more.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpgrade} className="bg-primary">
            Upgrade to {tierDisplayName}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}




