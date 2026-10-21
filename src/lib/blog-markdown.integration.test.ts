import { describe, expect, it } from "vitest";
import { MarkdownManager } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import { BlogCallout } from "@/app/admin/blogs/blog-callout";
import {
  editorMarkdownToMarkdown,
  markdownToEditorMarkdown,
} from "./blog-markdown";

function createManager() {
  return new MarkdownManager({
    extensions: [StarterKit, TableKit, BlogCallout],
    markedOptions: { gfm: true },
  });
}

describe("tiptap markdown integration", () => {
  it("parses callouts and serializes them back to the editor syntax", () => {
    const manager = createManager();

    const json = manager.parse(
      [
        "## Başlık",
        "",
        ":::tip",
        "İpucu metni.",
        "",
        "İkinci paragraf.",
        ":::",
        "",
        ":::faq",
        "Soru?",
        "",
        "Cevap.",
        ":::",
        "",
      ].join("\n"),
    );

    expect(json.content?.[0]?.type).toBe("heading");
    expect(json.content?.[1]?.type).toBe("callout");
    expect(json.content?.[1]?.attrs?.kind).toBe("tip");
    expect(json.content?.[2]?.attrs?.kind).toBe("faq");

    const markdown = manager.serialize(json);
    expect(markdown).toContain(":::tip");
    expect(markdown).toContain("İpucu metni.");
    expect(markdown).toContain("İkinci paragraf.");
    expect(markdown).toContain(":::faq");
    expect(markdown).toContain("Cevap.");

    const stored = editorMarkdownToMarkdown(markdown);
    expect(stored).toContain("> [!TIP] İpucu metni.");
    expect(stored).toContain("> İkinci paragraf.");
    expect(stored).toContain("> [!SSS] Soru?");
    expect(stored).toContain("> Cevap.");

    const reopened = manager.parse(markdownToEditorMarkdown(stored));
    expect(editorMarkdownToMarkdown(manager.serialize(reopened))).toBe(
      stored,
    );
  });

  it("parses an empty callout without exposing its syntax", () => {
    const manager = createManager();
    const json = manager.parse(":::tip\n:::\n");

    expect(json.content?.[0]?.type).toBe("callout");
    expect(json.content?.[0]?.content?.[0]?.type).toBe("paragraph");
  });
});
