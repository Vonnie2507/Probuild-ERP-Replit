import { useCallback, useRef } from "react";

// Simple notification sound using Web Audio API
// This creates a pleasant two-tone chime sound
export function useNotificationSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const playSound = useCallback(() => {
    try {
      // Create or reuse AudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioContextRef.current;

      // Resume context if suspended (browsers require user interaction)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Create a pleasant two-tone notification chime
      const playTone = (frequency: number, startTime: number, duration: number) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, startTime);

        // Envelope: quick attack, sustain, decay
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
        gainNode.gain.setValueAtTime(0.3, startTime + duration - 0.1);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      // Play two ascending tones for a friendly notification sound
      playTone(880, now, 0.15);        // A5
      playTone(1108.73, now + 0.12, 0.2); // C#6

    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  }, []);

  return { playSound };
}
