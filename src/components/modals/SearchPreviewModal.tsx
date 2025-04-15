"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import EditModal from "@/components/modals/EditModal";

interface SearchResult {
  id: string;
  type: "Asset" | "WorkOrder" | "Incident" | "MaintenanceSchedule" | "Part";
  title: string;
  description: string | null;
  status?: string;
  priority?: string;
}

interface SearchPreviewModalProps {
  result: SearchResult;
  tenantId: string;
}

export default function SearchPreviewModal({ result, tenantId }: SearchPreviewModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <div
        className="cursor-pointer p-2 hover:bg-accent w-full"
        onClick={() => setIsOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setIsOpen(true)}
      >
        <span className="font-medium">{result.title}</span> ({result.type})
        <p className="text-sm text-muted-foreground">{result.description || "No description"}</p>
        {result.status && <p className="text-xs text-muted-foreground">Status: {result.status}</p>}
        {result.priority && <p className="text-xs text-muted-foreground">Priority: {result.priority}</p>}
      </div>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {result.title} ({result.type})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              <strong>ID:</strong> {result.id}
            </p>
            <p>
              <strong>Description:</strong> {result.description || "None"}
            </p>
            {result.status && (
              <p>
                <strong>Status:</strong> {result.status}
              </p>
            )}
            {result.priority && (
              <p>
                <strong>Priority:</strong> {result.priority}
              </p>
            )}
            <Button onClick={() => { setIsOpen(false); setEditOpen(true); }}>
              Edit {result.type}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {editOpen && (
        <EditModal
          open={editOpen}
          setOpen={setEditOpen}
          modelType={result.type}
          modelId={result.id}
          tenantId={tenantId}
        />
      )}
    </>
  );
}