export interface MarkdownInlineSegment {
  text: string;
  bold: boolean;
}

export type TermsMarkdownBlock =
  | { type: "heading1"; text: string }
  | { type: "heading2"; text: string }
  | { type: "paragraph"; segments: MarkdownInlineSegment[] }
  | { type: "list"; items: MarkdownInlineSegment[][] };

export interface ParsedTermsMarkdown {
  title: string;
  blocks: TermsMarkdownBlock[];
}

function parseInlineSegments(text: string): MarkdownInlineSegment[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part) => {
    const bold = part.startsWith("**") && part.endsWith("**");
    return {
      text: bold ? part.slice(2, -2) : part,
      bold
    };
  });
}

export function parseTermsMarkdown(markdown: string): ParsedTermsMarkdown {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: TermsMarkdownBlock[] = [];
  let title = "";
  let paragraphBuffer: string[] = [];
  let listBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return;
    const text = paragraphBuffer.join(" ").trim();
    if (text) {
      blocks.push({ type: "paragraph", segments: parseInlineSegments(text) });
    }
    paragraphBuffer = [];
  };

  const flushList = () => {
    if (listBuffer.length === 0) return;
    blocks.push({
      type: "list",
      items: listBuffer.map((item) => parseInlineSegments(item.trim()))
    });
    listBuffer = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    if (trimmed.startsWith("# ")) {
      flushParagraph();
      flushList();
      const nextTitle = trimmed.slice(2).trim();
      title = title || nextTitle;
      blocks.push({ type: "heading1", text: nextTitle });
      return;
    }

    if (trimmed.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading2", text: trimmed.slice(3).trim() });
      return;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      flushParagraph();
      listBuffer.push(trimmed.slice(2));
      return;
    }

    flushList();
    paragraphBuffer.push(trimmed);
  });

  flushParagraph();
  flushList();

  return {
    title,
    blocks
  };
}
