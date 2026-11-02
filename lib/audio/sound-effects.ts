"use client";

import React from "react";

/**
 * Native Web Audio API synthesis engine for UI micro-interactions.
 * Zero external audio assets (0 KB network transfer, sub-millisecond response).
 *
 * STRICT REQUIREMENT:
 * Sound effects are MUTED BY DEFAULT. Audio is only played when the user explicitly
 * toggles sound ON via the SoundToggle button next to the theme toggle.
 */
class SoundManager {
  private ctx: AudioContext | null = null;
  private isEnabled: boolean = false;
  private lastHoverTime: number = 0;
  private lastClickTime: number = 0;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("portal_sound_enabled");
        // STRICT REQUIREMENT: Muted (false) by default unless explicitly turned on
        this.isEnabled = stored === "true";
      } catch {
        this.isEnabled = false;
      }

      // Attach global capture click listener so all clicks across the portal produce tactile audio feedback when un-muted
      try {
        window.addEventListener(
          "click",
          () => {
            this.playClick();
          },
          { capture: true, passive: true }
        );
      } catch {
        // ignore
      }
    }
  }

  public getSoundEnabled(): boolean {
    return this.isEnabled;
  }

  public setSoundEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("portal_sound_enabled", enabled ? "true" : "false");
        window.dispatchEvent(
          new CustomEvent("portal_sound_changed", { detail: { enabled } })
        );
      } catch {
        // Storage access error or private browsing mode
      }
      if (enabled && !this.ctx) {
        this.initContext();
      }
    }
  }

  private initContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Gentle, subtle micro-tick for timetable card hover motion.
   * Debounced by 45ms to provide tactile cascades without audio overload.
   */
  public playHover(): void {
    if (!this.isEnabled) return;
    const now = performance.now();
    if (now - this.lastHoverTime < 45) return;
    this.lastHoverTime = now;

    try {
      const ctx = this.initContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      const startTime = ctx.currentTime;

      // Soft 480Hz -> 280Hz tick
      osc.frequency.setValueAtTime(480, startTime);
      osc.frequency.exponentialRampToValueAtTime(280, startTime + 0.018);

      gain.gain.setValueAtTime(0.025, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.018);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.02);
    } catch {
      // Graceful fallback
    }
  }

  /**
   * Crisp tactile pop for element clicks, buttons, and card selections.
   * Debounced by 35ms to prevent double-firing on synthetic events while ensuring zero latency.
   */
  public playClick(): void {
    if (!this.isEnabled) return;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now - this.lastClickTime < 35) return;
    this.lastClickTime = now;

    try {
      const ctx = this.initContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      const startTime = ctx.currentTime;

      // Crisp mechanical click
      osc.frequency.setValueAtTime(620, startTime);
      osc.frequency.exponentialRampToValueAtTime(200, startTime + 0.03);

      gain.gain.setValueAtTime(0.065, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.035);
    } catch {
      // Graceful fallback
    }
  }
}

export const soundManager = new SoundManager();

export function playHoverSound(): void {
  soundManager.playHover();
}

export function playClickSound(): void {
  soundManager.playClick();
}

/**
 * React hook to observe and toggle sound effects state.
 */
export function useSoundEffects() {
  const [enabled, setEnabledState] = React.useState(false);

  React.useEffect(() => {
    setEnabledState(soundManager.getSoundEnabled());

    const handleSoundChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ enabled: boolean }>;
      if (typeof customEvent.detail?.enabled === "boolean") {
        setEnabledState(customEvent.detail.enabled);
      }
    };

    window.addEventListener("portal_sound_changed", handleSoundChange);
    return () => window.removeEventListener("portal_sound_changed", handleSoundChange);
  }, []);

  const toggleSound = React.useCallback(() => {
    const next = !soundManager.getSoundEnabled();
    soundManager.setSoundEnabled(next);
    setEnabledState(next);
    if (next) {
      soundManager.playClick();
    }
  }, []);

  return {
    isSoundEnabled: enabled,
    toggleSound,
    playHover: playHoverSound,
    playClick: playClickSound,
  };
}
