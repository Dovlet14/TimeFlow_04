/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EventNotificationConfig } from '../types';
import { getCustomSound } from './audioDb';

// Multi-platform audio playback engine
let activeAudioElement: HTMLAudioElement | null = null;
let activeOscillators: { osc: OscillatorNode; gain: GainNode; ctx: AudioContext }[] = [];
let durationTimeoutId: any = null;
let fadeIntervalId: any = null;
let isPlayingSound = false;
let onPlaybackStateChange: ((isPlaying: boolean) => void) | null = null;

export const setPlaybackStateListener = (listener: (isPlaying: boolean) => void) => {
  onPlaybackStateChange = listener;
};

const updateState = (playing: boolean) => {
  isPlayingSound = playing;
  if (onPlaybackStateChange) {
    onPlaybackStateChange(playing);
  }
};

export const isAudioActive = (): boolean => {
  return isPlayingSound;
};

// Stops all currently playing audios (Custom files or Web Audio beeps)
export const stopActiveSound = () => {
  console.log('Stopping all active notification playbacks...');
  
  // Clear any timers
  if (durationTimeoutId) {
    clearTimeout(durationTimeoutId);
    durationTimeoutId = null;
  }
  if (fadeIntervalId) {
    clearInterval(fadeIntervalId);
    fadeIntervalId = null;
  }

  // Stop custom HTML audio files
  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.src = '';
      activeAudioElement.load(); // releases the buffer
    } catch (e) {
      console.warn('Error releasing HTML audio element:', e);
    }
    activeAudioElement = null;
  }

  // Stop Web Audio API oscillators
  if (activeOscillators.length > 0) {
    activeOscillators.forEach(({ osc, gain, ctx }) => {
      try {
        osc.stop();
        osc.disconnect();
        gain.disconnect();
        ctx.close();
      } catch (e) {
        // quiet ignore for already stopped nodes
      }
    });
    activeOscillators = [];
  }

  updateState(false);
};

// Synthesize fallback beep sounds inside AudioContext safely
const playOscillatorFallback = (
  soundMode: 'default' | 'calm' | 'tech',
  volume: number,
  globalVolume: number,
  loop: boolean,
  fadeIn: boolean,
  durationLimitSeconds: number
) => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('Web Audio API not supported in this environment.');
      return;
    }

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Basic protection against volume bounds
    const targetVolume = Math.max(0, Math.min(1, volume * globalVolume));
    
    // Choose synth style
    if (soundMode === 'calm') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.8);
    } else if (soundMode === 'tech') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.15);
      osc.frequency.setValueAtTime(600, ctx.currentTime + 0.3);
    } else {
      // Default alarm beep
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
    }

    // Handle Fade-In (Volume Ramping)
    if (fadeIn) {
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(targetVolume, ctx.currentTime + 2.0); // 2 seconds fade
    } else {
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(targetVolume, ctx.currentTime + 0.05);
    }

    osc.start();
    
    // Record node for cancellation
    const nodeRef = { osc, gain: gainNode, ctx };
    activeOscillators.push(nodeRef);
    updateState(true);

    const stopTime = durationLimitSeconds > 0 ? durationLimitSeconds : 5; // standard max limit for beeps is 5s unless requested
    
    if (loop && soundMode === 'default' && durationLimitSeconds > 0) {
      // For synthetic alarms inside loops, we repeat after 1s
      let repeatCount = 0;
      const maxRepeats = Math.floor(durationLimitSeconds);
      
      const interval = setInterval(() => {
        repeatCount++;
        if (repeatCount >= maxRepeats || !isPlayingSound) {
          clearInterval(interval);
          stopActiveSound();
          return;
        }
        try {
          // Play subsequent beep pulse
          const nextOsc = ctx.createOscillator();
          const nextGain = ctx.createGain();
          nextOsc.connect(nextGain);
          nextGain.connect(ctx.destination);
          
          nextOsc.type = 'sine';
          nextOsc.frequency.setValueAtTime(880, ctx.currentTime);
          nextOsc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
          
          nextGain.gain.setValueAtTime(0, ctx.currentTime);
          nextGain.gain.linearRampToValueAtTime(targetVolume, ctx.currentTime + 0.05);
          nextGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
          
          nextOsc.start();
          nextOsc.stop(ctx.currentTime + 0.9);
        } catch (e) {
          clearInterval(interval);
        }
      }, 1000);
    }

    durationTimeoutId = setTimeout(() => {
      stopActiveSound();
    }, stopTime * 1000);

  } catch (err) {
    console.error('Synthesized sound playback failed:', err);
  }
};

// Play sound based on configuration
export const playSoundConfig = async (
  config: EventNotificationConfig,
  globalVolume: number
) => {
  // First, stop any outstanding active notification audio cleanly
  stopActiveSound();

  const { soundMode, volume, loop, fadeIn, durationLimit, customSoundId } = config;

  console.log(`AudioEngine: Triggering sound config mode="${soundMode}" volume=${volume}`);

  if (soundMode === 'silent') {
    console.log('Sound mode is set to Silent. Skipping playback.');
    return;
  }

  // Handle standard synthesized options
  if (soundMode === 'default' || soundMode === 'calm' || soundMode === 'tech') {
    playOscillatorFallback(soundMode, volume, globalVolume, loop, fadeIn, durationLimit);
    return;
  }

  if (soundMode === 'custom') {
    try {
      // Read custom track from IndexedDB
      const soundData = await getCustomSound(customSoundId);
      
      if (!soundData) {
        console.warn(`Custom sound data with ID "${customSoundId}" was not found! Falling back to Default standard sound.`);
        playOscillatorFallback('default', volume, globalVolume, loop, fadeIn, durationLimit);
        return;
      }

      // Convert stored base64 into a safe Object URL
      const binaryString = atob(soundData.base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: soundData.type });
      const audioUrl = URL.createObjectURL(blob);

      const audio = new Audio(audioUrl);
      activeAudioElement = audio;
      audio.loop = loop;

      const maxLevel = Math.max(0, Math.min(1.0, volume * globalVolume)); // Volume safety guard

      if (fadeIn) {
        audio.volume = 0;
        let currentVol = 0;
        const fadeDurationMs = 3000; // 3 seconds smooth ramp
        const step = maxLevel / (fadeDurationMs / 50);

        fadeIntervalId = setInterval(() => {
          if (!activeAudioElement || activeAudioElement !== audio) {
            clearInterval(fadeIntervalId);
            return;
          }
          currentVol = Math.min(maxLevel, currentVol + step);
          audio.volume = Math.max(0, Math.min(1, currentVol));
          if (currentVol >= maxLevel) {
            clearInterval(fadeIntervalId);
          }
        }, 50);
      } else {
        audio.volume = maxLevel;
      }

      // Safe asynchronous playback trigger
      await audio.play();
      updateState(true);

      // Trigger duration limit restriction
      if (durationLimit > 0) {
        durationTimeoutId = setTimeout(() => {
          console.log(`Playback reached configured duration limit of ${durationLimit} seconds. Terminating playback.`);
          stopActiveSound();
        }, durationLimit * 1000);
      }

      // Clean metadata URLs after loaded/completed
      audio.onended = () => {
        try {
          URL.revokeObjectURL(audioUrl);
        } catch (e) {
          // silent ignore
        }
        if (!loop) {
          stopActiveSound();
        }
      };

    } catch (err) {
      console.warn('Custom uploaded audio failed to play. Reverting to safe default sound fallback:', err);
      playOscillatorFallback('default', volume, globalVolume, loop, fadeIn, durationLimit);
    }
  }
};
