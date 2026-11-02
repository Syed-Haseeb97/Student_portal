import test from "node:test";
import assert from "node:assert/strict";
import { soundManager } from "./sound-effects";

test("Sound Manager: Muted by default and respects explicit toggle state", () => {
  // STRICT REQUIREMENT: Sound is MUTED by default
  assert.equal(soundManager.getSoundEnabled(), false, "Sound must be muted by default");

  // Explicitly enable sound
  soundManager.setSoundEnabled(true);
  assert.equal(soundManager.getSoundEnabled(), true, "Sound should be enabled after setSoundEnabled(true)");

  // Toggle back to mute
  soundManager.setSoundEnabled(false);
  assert.equal(soundManager.getSoundEnabled(), false, "Sound should return to muted state");

  // Calling playClick and playHover when muted does not throw
  assert.doesNotThrow(() => {
    soundManager.playClick();
    soundManager.playHover();
  });
});

test("Sound Manager: Rapid clicks are debounced cleanly", () => {
  soundManager.setSoundEnabled(true);
  assert.doesNotThrow(() => {
    soundManager.playClick();
    soundManager.playClick(); // immediate subsequent click within 35ms debounce
  });
  soundManager.setSoundEnabled(false);
});
