import { describe, expect, it } from "vitest";
import {
  editorMarkdownToMarkdown,
  markdownToEditorMarkdown,
} from "./blog-markdown";

describe("blog markdown bridge", () => {
  it("converts callout blockquotes to editor blocks", () => {
    const markdown = [
      "## Başlık",
      "",
      "> [!TIP]",
      "> İpucu metni.",
      "",
      "> [!WARNING]",
      "> Uyarı metni.",
      "",
      "> [!SSS] Soru?",
      "> Cevap.",
      "",
    ].join("\n");

    const editorMarkdown = markdownToEditorMarkdown(markdown);

    expect(editorMarkdown).toContain(":::tip\nİpucu metni.\n:::");
    expect(editorMarkdown).toContain(":::warning\nUyarı metni.\n:::");
    expect(editorMarkdown).toContain(":::faq\nSoru?\nCevap.\n:::");
  });

  it("converts editor blocks back to canonical callout markers", () => {
    const markdown = [
      ":::tip",
      "İpucu metni.",
      ":::",
      "",
      ":::warning",
      "Uyarı metni.",
      ":::",
      "",
      ":::faq",
      "Soru?",
      "Cevap.",
      ":::",
    ].join("\n");

    const stored = editorMarkdownToMarkdown(markdown);

    expect(stored).toContain("> [!TIP] İpucu metni.");
    expect(stored).toContain("> [!WARNING] Uyarı metni.");
    expect(stored).toContain("> [!SSS] Soru?");
    expect(stored).toContain("> Cevap.");
  });

  it("keeps normal blockquotes untouched", () => {
    const markdown = "> Normal alıntı\n\nMetin.\n";

    expect(markdownToEditorMarkdown(markdown)).toBe(markdown);
  });

  it("removes inline images before the editor sees them", () => {
    const markdown =
      "Metin.\n\n![Görsel](https://example.com/a.png)\n\n[![Görsel](https://example.com/b.png)](https://example.com)\n\nDevam.";

    const editorMarkdown = markdownToEditorMarkdown(markdown);

    expect(editorMarkdown).not.toContain("a.png");
    expect(editorMarkdown).not.toContain("b.png");
    expect(editorMarkdown).toContain("Metin.");
    expect(editorMarkdown).toContain("Devam.");
  });

  it("keeps image syntax inside fenced and inline code", () => {
    const markdown =
      "```md\n![alt](x.png)\n```\n\nÖrnek: `![alt](y.png)` ve metin.";

    const editorMarkdown = markdownToEditorMarkdown(markdown);

    expect(editorMarkdown).toContain("![alt](x.png)");
    expect(editorMarkdown).toContain("`![alt](y.png)`");
  });

  it("round-trips an empty callout", () => {
    const editorMarkdown = markdownToEditorMarkdown("> [!TIP]\n");
    expect(editorMarkdown).toBe(":::tip\n:::\n");
    expect(editorMarkdownToMarkdown(editorMarkdown)).toBe("> [!TIP]\n");
  });

  it("handles empty content", () => {
    expect(markdownToEditorMarkdown("")).toBe("");
    expect(editorMarkdownToMarkdown("")).toBe("");
  });
});
