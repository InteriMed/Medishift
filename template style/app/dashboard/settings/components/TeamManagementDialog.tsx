"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, Plus, AlertCircle, Crown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface TeamManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeamManagementDialog({
  open,
  onOpenChange,
}: TeamManagementDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Management
          </DialogTitle>
          <DialogDescription>
            Manage team members and permissions for your organization
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <Crown className="h-4 w-4" />
          <AlertDescription>
            Team management is available for Business and Enterprise plans. 
            This feature allows you to invite team members, manage roles, and 
            control access to projects and resources.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 py-4">
          <div className="text-center py-8 space-y-4">
            <div className="flex items-center justify-center">
              <div className="p-4 rounded-full bg-muted">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Team Management Coming Soon</h3>
              <p className="text-sm text-muted-foreground mb-4">
                We're working on team collaboration features. This will include:
              </p>
              <ul className="text-sm text-muted-foreground space-y-2 text-left max-w-md mx-auto">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Invite team members by email</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Assign roles and permissions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Manage project access and sharing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Track team usage and activity</span>
                </li>
              </ul>
            </div>
            <div className="pt-4">
              <Button
                variant="outline"
                onClick={() => window.location.href = "/dashboard/settings"}
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Business Plan
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}









