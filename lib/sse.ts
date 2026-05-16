import type { StreamEnvelope, StreamEventMap, StreamEventName } from "@/lib/types";

export function encodeSseEvent<T extends StreamEventName>(
  event: T,
  data: StreamEventMap[T]
) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function parseSseResponse(
  response: Response,
  onEvent: <T extends StreamEventName>(event: StreamEnvelope<T>) => void
) {
  if (!response.body) {
    throw new Error("Missing response body for SSE stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let separatorIndex = buffer.indexOf("\n\n");
    while (separatorIndex !== -1) {
      const rawEvent = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);

      const eventName = rawEvent
        .split("\n")
        .find((line) => line.startsWith("event:"))
        ?.replace("event:", "")
        .trim() as StreamEventName | undefined;
      const dataLine = rawEvent
        .split("\n")
        .find((line) => line.startsWith("data:"))
        ?.replace("data:", "")
        .trim();

      if (eventName && dataLine) {
        onEvent({
          event: eventName,
          data: JSON.parse(dataLine)
        } as StreamEnvelope);
      }

      separatorIndex = buffer.indexOf("\n\n");
    }
  }
}
