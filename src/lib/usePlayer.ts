/**
 * usePlayer — Centralized audio-synced learner player controller.
 *
 * Architecture:
 *  - PlayerState: single source of truth for all playback state
 *  - AudioEngine: encapsulated in this hook via a persisted HTMLAudioElement ref
 *  - Actions: play, pause, seek, loadSlide, nextSlide, prevSlide
 *
 * TTS integration note:
 *  - Pass `audioSrc` to `loadSlide(slideId, audioSrc)` when a TTS URL is available.
 *  - Without audioSrc, hasAudio = false and controls gracefully degrade.
 */

import { useRef, useState, useCallback, useEffect } from 'react';

/** Android WebView / Capacitor often has no speechSynthesis — guard every call. */
function getSpeechSynthesis(): SpeechSynthesis | null {
  try {
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
    return synth ?? null;
  } catch {
    return null;
  }
}

function cancelSpeechSynthesis() {
  getSpeechSynthesis()?.cancel();
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlayerState {
  activeSlideId: string;
  audioSrc: string | null;
  ttsText: string | null;
  /** Audio duration in seconds. 0 until audio metadata loads. */
  duration: number;
  /** Current playback position in seconds. */
  currentTime: number;
  isPlaying: boolean;
  /** True while the user is dragging the seekbar thumb. */
  isSeeking: boolean;
  /** True after audio playback reaches the end. */
  isEnded: boolean;
  /** True when a valid audioSrc is loaded. */
  hasAudio: boolean;
  /** True while audio metadata is loading. */
  isLoading: boolean;
  /** Master volume 0–1. Default 1. */
  volume: number;
}

export interface PlayerActions {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  beginSeek: () => void;
  endSeek: (time: number) => void;
  loadSlide: (slideId: string, audioSrc?: string | null, ttsText?: string | null) => void;
  /** Set master volume 0–1. Applies immediately to audio element. */
  setVolume: (v: number) => void;
}

export type Player = PlayerState & PlayerActions;

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_STATE: PlayerState = {
  activeSlideId: '',
  audioSrc: null,
  ttsText: null,
  duration: 0,
  currentTime: 0,
  isPlaying: false,
  isSeeking: false,
  isEnded: false,
  hasAudio: false,
  isLoading: false,
  volume: 1,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePlayer(): Player {
  const [state, setState] = useState<PlayerState>(DEFAULT_STATE);

  // Persisted audio instance — never re-created on re-renders
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // rAF handle for time update throttling
  const rafRef = useRef<number | null>(null);
  // Guard against race conditions during rapid slide switching
  const loadingSlideId = useRef<string>('');
  // Stores current event listener functions so they can be removed on slide change
  const listenersRef = useRef<{
    loadedmetadata: (() => void) | null;
    ended: (() => void) | null;
    error: (() => void) | null;
  }>({ loadedmetadata: null, ended: null, error: null });

  /**
   * Initialise the shared audio element once.
   */
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;

    return () => {
      cancelRaf();
      audio.pause();
      audio.src = '';
      audio.load();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  const cancelRaf = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const scheduleTimeUpdate = useCallback(() => {
    cancelRaf();
    let startTimestamp: number | null = null;
    const tick = (now: number) => {
      setState(prev => {
        if (prev.isSeeking || !prev.isPlaying) return prev;
        
        // Handles browser Audio element
        if (prev.audioSrc && audioRef.current && !audioRef.current.paused) {
          return { ...prev, currentTime: audioRef.current.currentTime };
        }
        
        // Handles mocked TTS duration tracking
        if (!prev.audioSrc && prev.ttsText) {
           if (!startTimestamp) startTimestamp = now - (prev.currentTime * 1000);
           const nextTime = (now - startTimestamp) / 1000;
           // Cap at slightly over duration to avoid flickering past end
           return { ...prev, currentTime: Math.min(nextTime, prev.duration) };
        }
        
        return prev;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const play = useCallback(() => {
    if (!state.hasAudio) return;
    
    // TTS Mock Path
    if (state.ttsText && !state.audioSrc) {
       if (!state.isPlaying) {
         const synth = getSpeechSynthesis();
         if (!synth) return;
         cancelSpeechSynthesis();
         
         // Substring from currentTime to simulate accurate scrub/resume
         const fraction = state.duration > 0 ? (state.currentTime / state.duration) : 0;
         const charIndex = Math.floor(state.ttsText.length * fraction);
         let startIdx = charIndex;
         while (startIdx > 0 && ![' ', '.', ',', '!'].includes(state.ttsText[startIdx])) {
            startIdx--;
         }
         
         const remainingText = state.ttsText.substring(startIdx).trim() || state.ttsText;
         if (remainingText.length > 0) {
           const utterance = new SpeechSynthesisUtterance(remainingText);
           utterance.rate = 0.95;
           // Prefer a natural female English voice (Aria/Jenny/Zira/Samantha on macOS/Windows/Edge)
           const _voices = synth.getVoices();
           const _female = _voices.find(v =>
             v.lang.startsWith('en') && (
               v.name.includes('Aria') || v.name.includes('Jenny') ||
               v.name.includes('Zira') || v.name.includes('Samantha') ||
               v.name.includes('Karen') || v.name.includes('Moira')
             )
           ) || _voices.find(v =>
             v.lang.startsWith('en') && !v.name.toLowerCase().includes('david') &&
             !v.name.toLowerCase().includes('mark') && !v.name.toLowerCase().includes('alex')
           );
           if (_female) utterance.voice = _female;
           
           utterance.onend = () => {
             console.log(`[usePlayer] TTS playback completed successfully for slide: ${state.activeSlideId}`);
             setState(prev => {
                if (prev.activeSlideId !== state.activeSlideId) return prev;
                return { ...prev, isPlaying: false, isEnded: true, currentTime: prev.duration };
             });
             cancelRaf();
           };

           utterance.onerror = (e) => {
             console.warn(`[usePlayer] TTS playback error for slide: ${state.activeSlideId}`, e);
             setState(prev => prev.activeSlideId === state.activeSlideId ? { ...prev, isPlaying: false } : prev);
             cancelRaf();
           };

           synth.speak(utterance);
           console.log(`[usePlayer] Started TTS playback for slide: ${state.activeSlideId}`);
         } else {
           setState(prev => ({ ...prev, isPlaying: false, isEnded: true, currentTime: state.duration }));
           return;
         }
       }
       setState(prev => ({ ...prev, isPlaying: true, isEnded: false }));
       scheduleTimeUpdate();
       return;
    }

    const audio = audioRef.current;
    if (!audio) return;
    
    // Strict Validation before applying playback
    if (!audio.src || audio.src === window.location.href) {
      console.warn(`[usePlayer] Validation failed: Audio source missing for slide ${state.activeSlideId}`);
      return;
    }

    console.log(`[usePlayer] Orchestrating hardware audio playback for slide: ${state.activeSlideId}. Expected duration: ${state.duration > 0 ? state.duration + 's' : 'Pending metadata'}`);

    audio.play().then(() => {
      setState(prev => ({ ...prev, isPlaying: true, isEnded: false }));
      scheduleTimeUpdate();
    }).catch(err => {
      console.warn(`[usePlayer] Audio playback rejected for slide ${state.activeSlideId}:`, err);
    });
  }, [state.hasAudio, state.ttsText, state.audioSrc, state.currentTime, state.duration, state.isPlaying, state.activeSlideId, scheduleTimeUpdate]);

  const pause = useCallback(() => {
    cancelRaf();
    if (state.ttsText && !state.audioSrc) {
       cancelSpeechSynthesis(); // Cancel instead of pause to allow substring resume
       setState(prev => ({ ...prev, isPlaying: false }));
       return;
    }

    const audio = audioRef.current;
    if (audio) audio.pause();
    setState(prev => ({ ...prev, isPlaying: false }));
  }, [state.ttsText, state.audioSrc]);

  const seek = useCallback((time: number) => {
    if (!state.hasAudio) return;
    const clamped = Math.max(0, Math.min(time, state.duration));
    
    if (state.audioSrc && audioRef.current) {
      audioRef.current.currentTime = clamped;
    } else if (state.ttsText) {
      if (state.isPlaying) {
         const synth = getSpeechSynthesis();
         cancelSpeechSynthesis();
         if (synth) {
         const fraction = state.duration > 0 ? (clamped / state.duration) : 0;
         const charIndex = Math.floor(state.ttsText.length * fraction);
         let startIdx = charIndex;
         while (startIdx > 0 && ![' ', '.', ',', '!'].includes(state.ttsText[startIdx])) startIdx--;
         const remainingText = state.ttsText.substring(startIdx).trim() || state.ttsText;
         
         if (remainingText.length > 0 && clamped < state.duration) {
           const utterance = new SpeechSynthesisUtterance(remainingText);
           utterance.rate = 0.95;
           synth.speak(utterance);
         }
         }
      }
    }
    setState(prev => ({ ...prev, currentTime: clamped, isEnded: false }));
  }, [state.hasAudio, state.duration, state.audioSrc, state.ttsText, state.isPlaying]);

  const beginSeek = useCallback(() => {
    cancelRaf();
    setState(prev => ({ ...prev, isSeeking: true }));
  }, []);

  const endSeek = useCallback((time: number) => {
    const clamped = Math.max(0, Math.min(time, state.duration));
    if (state.audioSrc && audioRef.current) {
      audioRef.current.currentTime = clamped;
    } else if (state.ttsText && state.isPlaying) {
         const synth = getSpeechSynthesis();
         cancelSpeechSynthesis();
         if (synth) {
         const fraction = state.duration > 0 ? (clamped / state.duration) : 0;
         const charIndex = Math.floor(state.ttsText.length * fraction);
         let startIdx = charIndex;
         while (startIdx > 0 && ![' ', '.', ',', '!'].includes(state.ttsText[startIdx])) startIdx--;
         const remainingText = state.ttsText.substring(startIdx).trim() || state.ttsText;
         
         if (remainingText.length > 0 && clamped < state.duration) {
           const utterance = new SpeechSynthesisUtterance(remainingText);
           utterance.rate = 0.95;
           synth.speak(utterance);
         }
         }
    }
    setState(prev => {
      const wasPlaying = prev.isPlaying;
      if (wasPlaying) scheduleTimeUpdate();
      return { ...prev, isSeeking: false, currentTime: clamped };
    });
  }, [state.duration, state.audioSrc, state.ttsText, scheduleTimeUpdate]);

  /**
   * Load a new slide into the player.
   * Stops any current playback, resets all state, attaches new audio listeners.
   */
  const loadSlide = useCallback((slideId: string, audioSrc?: string | null, ttsText?: string | null) => {
    const audio = audioRef.current;
    if (!audio) return;

    console.log(`[usePlayer] ------------------------------------------------`);
    console.log(`[usePlayer] Lifecycle Step 1/3: Halting previous playback (Slide -> ${slideId})`);

    // Stop and unload previous audio
    cancelRaf();
    cancelSpeechSynthesis();
    audio.pause();
    audio.removeAttribute('src'); // Strictly unbind old source
    audio.load();

    console.log(`[usePlayer] Lifecycle Step 2/3: Resetting internal time to 0`);
    
    loadingSlideId.current = slideId;
    const hasAudio = !!audioSrc || !!ttsText;

    // Reset state immediately (snap to new slide) — use functional form to preserve volume
    setState(prev => ({
      activeSlideId: slideId,
      audioSrc: audioSrc ?? null,
      ttsText: ttsText ?? null,
      duration: ttsText && !audioSrc ? Math.max(2, (ttsText.split(' ').length / 1.8)) : 0,
      currentTime: 0,
      isPlaying: false,
      isSeeking: false,
      isEnded: false,
      hasAudio,
      isLoading: !!audioSrc, // loading = true only for actual network audio
      volume: prev.volume,   // preserve user's volume setting across slides
    }));


    if (!hasAudio) return;
    if (ttsText && !audioSrc) return; // TTS is ready instantly

    // ----- Attach event handlers -----

    const onLoadedMetadata = () => {
      // Guard: ignore stale callbacks from a previous slide
      if (loadingSlideId.current !== slideId) return;
      console.log(`[usePlayer] Metadata confirmed for slide ${slideId}. Valid duration: ${audio.duration}s`);
      setState(prev =>
        prev.activeSlideId === slideId
          ? { ...prev, duration: audio.duration, isLoading: false }
          : prev
      );
    };

    const onEnded = () => {
      if (loadingSlideId.current !== slideId) return;
      console.log(`[usePlayer] Hardware playback lifecycle completed natively for slide: ${slideId}`);
      cancelRaf();
      setState(prev =>
        prev.activeSlideId === slideId
          ? { ...prev, isPlaying: false, isEnded: true }
          : prev
      );
    };

    const onError = () => {
      console.warn('[usePlayer] Audio failed to load:', audioSrc);
      setState(prev =>
        prev.activeSlideId === slideId
          ? { ...prev, hasAudio: false, isLoading: false }
          : prev
      );
    };

    // Remove previous listeners before attaching new ones
    const prev = listenersRef.current;
    if (prev.loadedmetadata) audio.removeEventListener('loadedmetadata', prev.loadedmetadata);
    if (prev.ended) audio.removeEventListener('ended', prev.ended);
    if (prev.error) audio.removeEventListener('error', prev.error);

    // Store references to the new listeners for cleanup on next slide
    listenersRef.current = { loadedmetadata: onLoadedMetadata, ended: onEnded, error: onError };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    // Begin loading
    audio.src = audioSrc!;
    audio.load();
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    if (audioRef.current) audioRef.current.volume = clamped;
    setState(prev => ({ ...prev, volume: clamped }));
  }, []);

  return {
    ...state,
    play,
    pause,
    seek,
    beginSeek,
    endSeek,
    loadSlide,
    setVolume,
  };
}
