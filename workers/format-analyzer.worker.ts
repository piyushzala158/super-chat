self.onmessage = (event: MessageEvent<{ text: string }>) => {
  const text = event.data.text;
  const codeFences = (text.match(/```/g) ?? []).length;
  const tablePipes = (text.match(/\|/g) ?? []).length;
  const headings = (text.match(/^#{1,3}\s/mg) ?? []).length;
  const heavy = text.length > 12000 || codeFences >= 6 || tablePipes >= 80 || headings >= 40;
  self.postMessage({ heavy });
};
