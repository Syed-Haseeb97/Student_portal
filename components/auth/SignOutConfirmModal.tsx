"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { LogOut, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface SignOutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  userEmail?: string | null;
}

export function SignOutConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  userEmail,
}: SignOutConfirmModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  const content = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150 min-h-[100dvh]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="signout-modal-title"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-surface border border-line p-6 shadow-2xl relative space-y-5 animate-in zoom-in-95 duration-150 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-muted hover:text-ink hover:bg-canvas transition-colors touch-manipulation cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-start gap-3.5">
          <div className="size-11 rounded-2xl bg-risk/15 border border-risk/30 flex items-center justify-center text-risk shrink-0">
            <LogOut className="size-5" />
          </div>
          <div className="space-y-1">
            <h3 id="signout-modal-title" className="text-base sm:text-lg font-bold text-ink">
              Sign Out Confirmation
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Are you sure you want to sign out of the IIIT Trichy Academic Attendance Portal?
            </p>
            {userEmail && (
              <p className="text-[11px] font-mono text-muted/80 pt-1">
                Active account: <span className="text-ink font-semibold">{userEmail}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-line">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="w-full sm:w-auto font-mono text-xs min-h-[40px] touch-manipulation"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={async () => {
              onClose();
              await onConfirm();
            }}
            className="w-full sm:w-auto font-mono text-xs min-h-[40px] bg-risk text-white hover:bg-risk/90 border-risk touch-manipulation cursor-pointer"
          >
            <LogOut className="size-3.5 mr-1.5" />
            Yes, Sign Out
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
