// src/app/(tenant)/[tenant]/dashboard/components/FloatingActionButton.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

interface FloatingActionButtonProps {
  actions: { label: string; href: string }[];
}

export function FloatingActionButton({ actions }: FloatingActionButtonProps) {
  const [open, setOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<{ label: string; href: string } | null>(null);
  const router = useRouter();

  return (
    <>
      <Button
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Actions</DialogTitle>
            <DialogDescription>Select an action to perform.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {actions.map((action) => (
              <Button
                key={action.href}
                variant="outline"
                onClick={() => setSelectedAction(action)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      {selectedAction && (
        <Dialog open={!!selectedAction} onOpenChange={() => setSelectedAction(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Action</DialogTitle>
              <DialogDescription>
                Are you sure you want to create a {selectedAction.label.toLowerCase()}?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedAction(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  router.push(selectedAction.href);
                  setSelectedAction(null);
                  setOpen(false);
                }}
              >
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}