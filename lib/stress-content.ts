import { getStressPreset } from "@/lib/prompts";

function repeatParagraph(label: string, index: number) {
  return `## ${label} ${index}\n\nThis benchmark slice measures queue growth, DOM pressure, and rendering efficiency during streaming. Track \`FPS\`, \`heap\`, \`queue depth\`, and \`input latency\` as output grows.\n\n- Render throughput matters.\n- Long-lived sessions expose memory leaks.\n- Virtualization protects the DOM from collapse.\n\n`;
}

function codeBlock(index: number) {
  return `\`\`\`ts\nexport function benchmarkSegment${index}(queueDepth: number, chunkRate: number) {\n  const pressure = queueDepth > 6 ? "high" : "normal";\n  return { pressure, renderCapacity: Math.max(1, Math.round(chunkRate * 0.82)) };\n}\n\`\`\`\n\n`;
}

function table(index: number) {
  return `| Sample | FPS | Queue | Heap MB |\n| --- | ---: | ---: | ---: |\n| ${index}-A | 59 | 1 | 142 |\n| ${index}-B | 57 | 4 | 168 |\n| ${index}-C | 52 | 7 | 214 |\n\n`;
}

export function createStressContent(presetId: string) {
  const preset = getStressPreset(presetId);
  let output = `# ${preset.label}\n\n${preset.description}\n\n`;
  let index = 1;

  while (output.length < preset.totalCharacters) {
    output += repeatParagraph(preset.label, index);
    if (preset.contentType === "code" || preset.contentType === "mixed") {
      output += codeBlock(index);
    }
    if (preset.contentType === "table" || preset.contentType === "mixed") {
      output += table(index);
    }
    if (preset.contentType === "markdown") {
      output += `> Streaming benchmark note ${index}: keep the main thread free for user input.\n\n`;
    }
    index += 1;
  }

  return output.slice(0, preset.totalCharacters);
}
