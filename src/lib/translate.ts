const TARGET_LANGUAGE = "zh-CN";
const MAX_CHUNK_CHARS = 2000;
const REQUEST_DELAY_MS = 120;

export interface TranslateMarkdownOptions {
  translate?: (text: string) => Promise<string>;
}

interface ProtectedMarkdown {
  text: string;
  restore: (translated: string) => string;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function stripFrontMatter(source: string): string {
  return source.replace(/^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/, "");
}

export function protectMarkdown(source: string): ProtectedMarkdown {
  const parts: string[] = [];
  const stash = (value: string) => {
    parts.push(value);
    return `[[${parts.length - 1}]]`;
  };

  const lines = source.split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const open = lines[i].match(/^ {0,3}(`{3,}|~{3,})/);
    if (!open) {
      out.push(lines[i]);
      continue;
    }

    const marker = open[1];
    let end = i + 1;
    for (; end < lines.length; end += 1) {
      const close = lines[end].match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/);
      if (close && close[1][0] === marker[0] && close[1].length >= marker.length) {
        end += 1;
        break;
      }
    }
    out.push(stash(lines.slice(i, end).join("\n")));
    i = end - 1;
  }

  let text = out.join("\n");
  text = text.replace(/(`+)[\s\S]*?\1/g, stash);
  text = text.replace(/<!--[\s\S]*?-->/g, stash);
  text = text.replace(/<\/?[A-Za-z][^>]*>/g, stash);
  text = text.replace(
    /(!?\[[^\]]*\]\()([^)]*)(\))/g,
    (_match, lead: string, url: string, tail: string) => `${lead}${stash(url)}${tail}`,
  );
  text = text.replace(/<https?:\/\/[^>\s]+>/g, stash);
  text = text.replace(/https?:\/\/[^\s)\]}>"']+/g, stash);

  return {
    text,
    restore(translated: string) {
      for (let i = 0; i < parts.length; i += 1) {
        if (!translated.includes(`[[${i}]]`)) {
          throw new Error(
            "Google Translate altered protected Markdown content. Please try again.",
          );
        }
      }
      return translated.replace(/\[\[(\d+)\]\]/g, (match, index: string) => {
        const value = parts[Number(index)];
        return value === undefined ? match : value;
      });
    },
  };
}

export function chunkText(text: string, maxChars = MAX_CHUNK_CHARS): string[] {
  const parts = text.split(/(\n[ \t]*\n+)/);
  const chunks: string[] = [];
  let current = "";

  const flush = () => {
    if (current.trim()) chunks.push(current);
    current = "";
  };

  for (const part of parts) {
    if (!part) continue;

    if (current.length + part.length <= maxChars) {
      current += part;
      continue;
    }

    if (part.trim() && part.length > maxChars) {
      flush();
      const lines = part.split("\n");
      let piece = "";
      for (const line of lines) {
        if (piece && piece.length + 1 + line.length > maxChars) {
          chunks.push(`${piece}\n`);
          piece = line;
        } else {
          piece += `${piece ? "\n" : ""}${line}`;
        }
      }
      current = piece;
      continue;
    }

    flush();
    current = part;
  }

  flush();
  return chunks;
}

export async function googleTranslate(text: string): Promise<string> {
  const params = new URLSearchParams({
    client: "gtx",
    sl: "auto",
    tl: TARGET_LANGUAGE,
    dt: "t",
    q: text,
  });
  const res = await fetch(
    `https://translate.googleapis.com/translate_a/single?${params.toString()}`,
  );
  if (!res.ok) {
    throw new Error(`Google Translate returned HTTP ${res.status}.`);
  }

  const raw = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(
      "Google Translate returned an unexpected page. Check that the system proxy can reach Google.",
    );
  }

  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw new Error("Google Translate returned an unexpected response.");
  }

  return (data[0] as unknown[])
    .map((segment) =>
      Array.isArray(segment) && typeof segment[0] === "string" ? segment[0] : "",
    )
    .join("");
}

async function translateChunk(text: string): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await googleTranslate(text);
    } catch (err) {
      lastError = err;
      if (attempt < 2) await sleep(800 * (attempt + 1));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function translateMarkdownToChinese(
  source: string,
  options: TranslateMarkdownOptions = {},
): Promise<string> {
  const translate = options.translate ?? translateChunk;
  const body = stripFrontMatter(source);
  const protectedBody = protectMarkdown(body);

  if (!protectedBody.text.trim()) {
    throw new Error("This document has no translatable text.");
  }

  const chunks = chunkText(protectedBody.text);
  const translated: string[] = [];
  for (let i = 0; i < chunks.length; i += 1) {
    translated.push(await translate(chunks[i]));
    if (i < chunks.length - 1) await sleep(REQUEST_DELAY_MS);
  }

  return protectedBody.restore(translated.join(""));
}
