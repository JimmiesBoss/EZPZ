"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface State {
  isRecording: boolean;
  duration: number;
  error: string | null;
}

export function useVoiceRecorder() {
  const [state, setState] = useState<State>({
    isRecording: false,
    duration: 0,
    error: null,
  });
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const start = useCallback(async () => {
    try {
      setState({ isRecording: false, duration: 0, error: null });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.start();
      mediaRef.current = mr;
      setState({ isRecording: true, duration: 0, error: null });
      tickRef.current = setInterval(() => {
        setState((s) => ({ ...s, duration: s.duration + 1 }));
      }, 1000);
    } catch (err) {
      setState({
        isRecording: false,
        duration: 0,
        error: err instanceof Error ? err.message : "Microphone unavailable",
      });
    }
  }, []);

  const stop = useCallback(async (): Promise<Blob | null> => {
    const mr = mediaRef.current;
    if (!mr) return null;
    return new Promise((resolve) => {
      mr.onstop = () => {
        if (tickRef.current) {
          clearInterval(tickRef.current);
          tickRef.current = null;
        }
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setState((s) => ({ ...s, isRecording: false }));
        resolve(blob);
      };
      mr.stop();
    });
  }, []);

  return { ...state, start, stop };
}
