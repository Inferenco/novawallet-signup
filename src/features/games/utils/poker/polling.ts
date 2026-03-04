import { useCallback, useEffect, useRef, useState } from "react";

interface PollingOptions {
  interval: number;
  backgroundInterval?: number;
  urgentInterval?: number;
  enabled?: boolean;
}

interface UsePollingReturn {
  poll: () => void;
  setUrgent: (urgent: boolean) => void;
  isPolling: boolean;
}

function isPageVisible(): boolean {
  if (typeof document === "undefined") return true;
  return document.visibilityState === "visible";
}

export function usePolling(
  callback: () => Promise<void> | void,
  options: PollingOptions
): UsePollingReturn {
  const {
    interval,
    backgroundInterval = 0,
    urgentInterval,
    enabled = true
  } = options;

  const [isPolling, setIsPolling] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const visibleRef = useRef(isPageVisible());

  const getEffectiveInterval = useCallback(() => {
    if (!enabled) return 0;
    if (!visibleRef.current) return backgroundInterval;
    if (isUrgent && urgentInterval) return urgentInterval;
    return interval;
  }, [backgroundInterval, enabled, interval, isUrgent, urgentInterval]);

  const poll = useCallback(async () => {
    if (isPolling) return;
    setIsPolling(true);
    try {
      await callback();
    } catch (error) {
      console.error("Polling error:", error);
    } finally {
      setIsPolling(false);
    }
  }, [callback, isPolling]);

  const setupInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const effectiveInterval = getEffectiveInterval();
    if (effectiveInterval > 0) {
      intervalRef.current = window.setInterval(() => {
        void poll();
      }, effectiveInterval);
    }
  }, [getEffectiveInterval, poll]);

  useEffect(() => {
    if (typeof document === "undefined") return () => undefined;

    const onVisibilityChange = () => {
      const wasHidden = !visibleRef.current;
      visibleRef.current = isPageVisible();
      setupInterval();
      if (wasHidden && visibleRef.current && enabled) {
        void poll();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled, poll, setupInterval]);

  useEffect(() => {
    if (enabled) {
      void poll();
      setupInterval();
    }

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, poll, setupInterval]);

  useEffect(() => {
    setupInterval();
  }, [isUrgent, setupInterval]);

  return {
    poll: () => {
      void poll();
    },
    setUrgent: setIsUrgent,
    isPolling
  };
}

export class PollingManager {
  private intervalId: number | null = null;

  private callback: () => Promise<void>;

  private interval: number;

  private isRunning = false;

  constructor(callback: () => Promise<void>, interval: number) {
    this.callback = callback;
    this.interval = interval;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    void this.poll();
    this.intervalId = window.setInterval(() => {
      void this.poll();
    }, this.interval);
  }

  stop() {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  private async poll() {
    try {
      await this.callback();
    } catch (error) {
      console.error("PollingManager error:", error);
    }
  }

  setInterval(newInterval: number) {
    this.interval = newInterval;
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }
}

export default usePolling;
