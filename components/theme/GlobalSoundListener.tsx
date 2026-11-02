"use client";

import { useEffect } from "react";
import { soundManager } from "@/lib/audio/sound-effects";

/**
 * Attaches a passive capture click listener to the window so every user interaction
 * across the entire portal triggers the tactile micro-click sound when sound is un-muted.
 */
export function GlobalSoundListener() {
  useEffect(() => {
    const handleGlobalClick = () => {
      soundManager.playClick();
    };

    window.addEventListener("click", handleGlobalClick, { capture: true, passive: true });
    return () => {
      window.removeEventListener("click", handleGlobalClick, { capture: true });
    };
  }, []);

  return null;
}
