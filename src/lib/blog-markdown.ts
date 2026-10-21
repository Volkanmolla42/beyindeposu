const CALLOUT_MARKERS: Record<string, string> = {
  TIP: "tip",
  WARNING: "warning",
  CAUTION: "warning",
  NOTE: "note",
  INFO: "note",
  IMPORTANT: "important",
  FAQ: "faq",
  SSS: "faq",
};

const KIND_MARKERS: Record<string, string> = {
  tip: "[!TIP]",
  warning: "[!WARNING]",
  note: "[!NOTE]",
  important: "[!IMPORTANT]",
  faq: "[!SSS]",
};

const CALLOUT_LINE_RE =
  /^>\s*\[!(TIP|WARNING|CAUTION|NOTE|INFO|IMPORTANT|FAQ|SSS)\]\s?(.*)$/i;
const FENCE_RE = /^\s*(```|~~~)/;
const CALLOUT_OPEN_RE = /^:::(\w+)[ \t]*$/;
const CALLOUT_CLOSE_RE = /^:::[ \t]*$/;

function stripInlineImages(line: string): string {
  return line
    .split(/(`[^`]*`)/g)
    .map((part, index) => {
      if (index % 2 === 1) return part;

      return part
        .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, "")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
        .replace(/<img\b[^>]*>/gi, "");
    })
    .join("");
}

function trimBlankEdges(lines: string[]): void {
  while (lines.length > 0 && !lines[0].trim()) lines.shift();
  while (lines.length > 0 && !lines[lines.length - 1].trim()) lines.pop();
}

function joinNormalizedLines(lines: string[]): string {
  const output: string[] = [];
  let inFence = false;
  let previousBlank = false;

  for (const line of lines) {
    if (FENCE_RE.test(line)) inFence = !inFence;

    const isBlank = line.trim() === "";
    if (!inFence && isBlank) {
      if (previousBlank) continue;
      previousBlank = true;
    } else {
      previousBlank = false;
    }

    output.push(line);
  }

  const result = output.join("\n").trim();
  return result ? `${result}\n` : "";
}

export function markdownToEditorMarkdown(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const output: string[] = [];
  let inFence = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      output.push(line);
      continue;
    }

    const cleanedLine = inFence ? line : stripInlineImages(line);
    const match = inFence ? null : CALLOUT_LINE_RE.exec(cleanedLine);
    if (!match) {
      output.push(cleanedLine);
      continue;
    }

    const kind = CALLOUT_MARKERS[match[1].toUpperCase()];
    const body: string[] = [];
    if (match[2]) body.push(match[2]);

    index += 1;
    let bodyInFence = false;
    while (index < lines.length && lines[index].startsWith(">")) {
      const bodyLine = lines[index].replace(/^>\s?/, "");
      if (FENCE_RE.test(bodyLine)) {
        bodyInFence = !bodyInFence;
        body.push(bodyLine);
      } else {
        body.push(bodyInFence ? bodyLine : stripInlineImages(bodyLine));
      }
      index += 1;
    }
    index -= 1;

    trimBlankEdges(body);
    output.push(`:::${kind}`, ...body, ":::", "");
  }

  return joinNormalizedLines(output);
}

export function editorMarkdownToMarkdown(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const output: string[] = [];
  let inFence = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      output.push(line);
      continue;
    }

    const open = inFence ? null : CALLOUT_OPEN_RE.exec(line);
    if (!open) {
      output.push(line);
      continue;
    }

    const body: string[] = [];
    let cursor = index + 1;
    let bodyInFence = false;

    while (cursor < lines.length) {
      const bodyLine = lines[cursor];

      if (FENCE_RE.test(bodyLine)) {
        bodyInFence = !bodyInFence;
        body.push(bodyLine);
        cursor += 1;
        continue;
      }

      if (!bodyInFence && CALLOUT_CLOSE_RE.test(bodyLine)) break;

      body.push(bodyLine);
      cursor += 1;
    }

    if (cursor >= lines.length) {
      output.push(line);
      continue;
    }

    trimBlankEdges(body);
    const marker = KIND_MARKERS[open[1].toLowerCase()] ?? "[!TIP]";
    const first = body.shift() ?? "";
    const block = [`${marker}${first ? ` ${first}` : ""}`, ...body];
    output.push(...block.map((item) => (item ? `> ${item}` : ">")));
    index = cursor;
  }

  return joinNormalizedLines(output);
}
