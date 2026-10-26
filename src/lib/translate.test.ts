import { describe, expect, it } from "vitest";
import {
  chunkText,
  protectMarkdown,
  stripFrontMatter,
  translateMarkdownToChinese,
} from "./translate";

describe("stripFrontMatter", () => {
  it("removes a leading YAML block", () => {
    const body = stripFrontMatter("---\ntitle: Hello\n---\n\n# Hi");
    expect(body).not.toContain("title: Hello");
    expect(body).toContain("# Hi");
  });

  it("leaves a thematic break without a closing marker alone", () => {
    const source = "---\n\n# Hi";
    expect(stripFrontMatter(source)).toBe(source);
  });

  it("leaves a mid-document break alone", () => {
    const source = "# Hi\n\n---\ntext\n---";
    expect(stripFrontMatter(source)).toBe(source);
  });
});

describe("protectMarkdown", () => {
  it("round-trips code, links and HTML unchanged", () => {
    const source = [
      "# Title",
      "",
      "Use `code` and [link](https://example.com) plus <b>bold</b>.",
      "",
      "```ts",
      "const x = 1;",
      "```",
      "",
      "<!-- comment -->",
    ].join("\n");

    const protectedBody = protectMarkdown(source);
    expect(protectedBody.text).toContain("[[");
    expect(protectedBody.text).not.toContain("const x = 1;");
    expect(protectedBody.restore(protectedBody.text)).toBe(source);
  });

  it("keeps fenced code blocks out of the text sent for translation", () => {
    const protectedBody = protectMarkdown("before\n\n```\nsecret\n```\n\nafter");
    expect(protectedBody.text).not.toContain("secret");
    expect(protectedBody.text).not.toContain("```");
  });
});

describe("chunkText", () => {
  it("preserves the original text when chunks are joined", () => {
    const paragraphs = Array.from({ length: 5 }, (_, i) => `Paragraph ${i} ${"x".repeat(700)}`);
    const source = paragraphs.join("\n\n");
    const chunks = chunkText(source, 1200);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join("")).toBe(source);
  });
});

describe("translateMarkdownToChinese", () => {
  it("translates prose while preserving Markdown structure", async () => {
    const source = [
      "---",
      "title: Hello",
      "---",
      "",
      "# Hello",
      "",
      "Text with `code` and [link](https://example.com).",
      "",
      "```ts",
      "const x = 1;",
      "```",
      "",
    ].join("\n");

    const result = await translateMarkdownToChinese(source, {
      translate: async (text) => text.replace("Hello", "你好").replace("Text", "文本"),
    });

    expect(result).not.toContain("title: Hello");
    expect(result).toContain("# 你好");
    expect(result).toContain("文本");
    expect(result).toContain("`code`");
    expect(result).toContain("https://example.com");
    expect(result).toContain("const x = 1;");
  });

  it("splits long documents into multiple requests", async () => {
    const source = Array.from({ length: 4 }, (_, i) => `Block ${i} ${"x".repeat(900)}`).join(
      "\n\n",
    );
    const calls: string[] = [];
    const result = await translateMarkdownToChinese(source, {
      translate: async (text) => {
        calls.push(text);
        return text;
      },
    });

    expect(calls.length).toBeGreaterThan(1);
    expect(result).toBe(source);
  });

  it("fails if the translator drops protected content", async () => {
    await expect(
      translateMarkdownToChinese("Use `code` here.", {
        translate: async () => "译文",
      }),
    ).rejects.toThrow(/protected/);
  });

  it("rejects documents without translatable text", async () => {
    await expect(
      translateMarkdownToChinese("---\ntitle: x\n---\n", { translate: async () => "" }),
    ).rejects.toThrow(/no translatable text/);
  });
});
