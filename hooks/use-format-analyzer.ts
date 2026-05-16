"use client";

import { useEffect, useState } from "react";

export function useFormatAnalyzer(text: string) {
  const [heavy, setHeavy] = useState(false);

  useEffect(() => {
    if (!text) {
      setHeavy(false);
      return;
    }

    const worker = new Worker(new URL("../workers/format-analyzer.worker.ts", import.meta.url));
    worker.onmessage = (event: MessageEvent<{ heavy: boolean }>) => {
      setHeavy(event.data.heavy);
      worker.terminate();
    };
    worker.postMessage({ text });

    return () => worker.terminate();
  }, [text]);

  return { heavy };
}
