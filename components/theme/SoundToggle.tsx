"use client";

import React from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useSoundEffects } from "@/lib/audio/sound-effects";

interface SoundToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function SoundToggle({ className = "", showLabel = false }: SoundToggleProps) {
  const { isSoundEnabled, toggleSound } = useSoundEffects();

  return (
    <button
      type="button"
      onClick={toggleSound}
      className={`relative inline-flex items-center justify-center p-1.5 sm:p-2 rounded-full border border-line bg-paper hover:bg-raised text-muted hover:text-ink transition-all cursor-pointer touch-manipulation active:scale-95 focus-visible:outline-2 focus-visible:outline-ink ${className}`}
      title={
        isSoundEnabled
          ? "Sound Effects: Active (Click to mute)"
          : "Sound Effects: Muted (Click to turn on)"
      }
      aria-label={
        isSoundEnabled
          ? "Sound Effects: Active (Click to mute)"
          : "Sound Effects: Muted (Click to turn on)"
      }
    >
      {isSoundEnabled ? (
        <Volume2 className="size-3.5 sm:size-4 text-safe transition-transform duration-200 hover:scale-110" />
      ) : (
        <VolumeX className="size-3.5 sm:size-4 text-muted/80 transition-transform duration-200 hover:scale-110" />
      )}
      {showLabel && (
        <span className="ml-2 text-xs font-mono font-medium">
          {isSoundEnabled ? "Sound On" : "Muted"}
        </span>
      )}
    </button>
  );
}
