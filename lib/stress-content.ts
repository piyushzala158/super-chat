import { getStressPreset } from "@/lib/prompts";

function repeatParagraph(label: string, index: number) {
  return `## ${label} ${index}\n\nThis benchmark slice measures queue growth, DOM pressure, render stability, and markdown parsing overhead during streaming. Track \`FPS\`, \`heap\`, \`queue depth\`, \`input latency\`, and the time it takes for the assistant view to settle after each burst.\n\n- Render throughput matters when chunks arrive faster than paints.\n- Long-lived sessions expose memory leaks and stale cache growth.\n- Virtualization protects the DOM from collapse when the transcript becomes dense.\n- Batching should reduce thrash without hiding pressure.\n\n> Streaming benchmark note ${index}: the UI should stay readable even when the stream gets noisy.\n\n`;
}

function analysisBlock(index: number) {
  return `### Telemetry Snapshot ${index}\n\n- \`fps\`: sample the paint loop.\n- \`queue depth\`: measure backlog in the client.\n- \`heap\`: watch for drift over time.\n- \`markdown\`: parse cost grows with structure.\n\n`;
}

function numberedList(index: number) {
  return `1. Measure the incoming chunk rate.\n2. Compare it with the flush cadence.\n3. Check whether render work outruns the frame budget.\n4. Record whether the queue clears after each burst.\n\n`;
}

function checklist(index: number) {
  return `- [x] Validate chunk cadence for slice ${index}\n- [x] Observe queue depth under burst traffic\n- [ ] Confirm the transcript stays responsive under pressure\n- [ ] Keep heap growth from drifting upward\n\n`;
}

function codeBlock(index: number) {
  return `\`\`\`ts\nexport function benchmarkSegment${index}(queueDepth: number, chunkRate: number) {\n  const pressure = queueDepth > 6 ? "high" : "normal";\n  const renderCapacity = Math.max(1, Math.round(chunkRate * 0.82));\n  const backlog = Math.max(0, queueDepth - renderCapacity / 4);\n  return { pressure, renderCapacity, backlog };\n}\n\`\`\`\n\n`;
}

function table(index: number) {
  return `| Sample | FPS | Queue | Heap MB |\n| --- | ---: | ---: | ---: |\n| ${index}-A | 59 | 1 | 142 |\n| ${index}-B | 57 | 4 | 168 |\n| ${index}-C | 52 | 7 | 214 |\n\n`;
}

function mixedExpansion(index: number) {
  return `| Metric | Target | Observed |\n| --- | ---: | ---: |\n| Queue depth | < 4 | ${Math.max(1, (index % 5) + 1)} |\n| Frame drops | < 5% | ${Math.max(3, (index % 9) + 3)}% |\n| Heap growth | flat | rising slightly |\n\n`;
}

export function createStressContent(presetId: string) {
  const preset = getStressPreset(presetId);
  let output = `# ${preset.label}\n\n${preset.description}\n\n`;
  let index = 1;

  while (output.length < preset.totalCharacters) {
    output += repeatParagraph(preset.label, index);
    output += analysisBlock(index);
    output += numberedList(index);
    output += checklist(index);

    if (preset.contentType === "code" || preset.contentType === "mixed") {
      output += codeBlock(index);
    }

    if (preset.contentType === "table" || preset.contentType === "mixed") {
      output += table(index);
    }

    if (preset.contentType === "markdown") {
      output += `> Streaming benchmark note ${index}: keep the main thread free for user input.\n\n`;
      output +=
        `- Avoid large synchronous work inside render.\n- Keep the transcript readable while the stream is active.\n\n`;
    }

    if (preset.contentType === "mixed") {
      output += mixedExpansion(index);
    }

    index += 1;
  }

  return output.slice(0, preset.totalCharacters);
}
