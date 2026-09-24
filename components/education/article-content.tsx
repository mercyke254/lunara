import { cn } from "@/lib/utils";

/**
 * Minimal, safe article renderer.
 *
 * Article bodies are stored as lightweight plain-text markup (headings, lists,
 * blockquotes, paragraphs) rather than HTML or MDX. Two reasons:
 *
 *  1. SECURITY: content is rendered as React elements, never via
 *     `dangerouslySetInnerHTML`. A compromised or admin-authored article
 *     therefore cannot inject script into a reader's page.
 *  2. No dependency: a full Markdown pipeline would be a large addition for the
 *     small subset of formatting that health articles actually need.
 *
 * Blocks are separated by blank lines. Inline emphasis is intentionally not
 * supported — nothing in the content set requires it, and skipping it removes a
 * whole class of parsing edge cases.
 */

type Block =
  | { kind: "heading"; level: 2 | 3; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "quote"; text: string }
  | { kind: "callout"; text: string };

function parseBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  const rawBlocks = content.replace(/\r\n?/g, "\n").split(/\n{2,}/);

  for (const raw of rawBlocks) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const lines = trimmed.split("\n");

    // Callout: every line prefixed with "! " on the first line marker.
    if (trimmed.startsWith("! ")) {
      blocks.push({ kind: "callout", text: trimmed.slice(2).replace(/\n/g, " ").trim() });
      continue;
    }

    if (trimmed.startsWith("### ")) {
      blocks.push({ kind: "heading", level: 3, text: trimmed.slice(4).trim() });
      continue;
    }

    if (trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
      const level = trimmed.startsWith("## ") ? 2 : 2;
      blocks.push({
        kind: "heading",
        level,
        text: trimmed.replace(/^#+\s*/, "").trim(),
      });
      continue;
    }

    if (trimmed.startsWith("> ")) {
      blocks.push({ kind: "quote", text: lines.map((l) => l.replace(/^>\s?/, "")).join(" ").trim() });
      continue;
    }

    // Unordered list.
    if (lines.every((line) => /^[-*]\s+/.test(line.trim()))) {
      blocks.push({
        kind: "list",
        ordered: false,
        items: lines.map((line) => line.trim().replace(/^[-*]\s+/, "")),
      });
      continue;
    }

    // Ordered list.
    if (lines.every((line) => /^\d+[.)]\s+/.test(line.trim()))) {
      blocks.push({
        kind: "list",
        ordered: true,
        items: lines.map((line) => line.trim().replace(/^\d+[.)]\s+/, "")),
      });
      continue;
    }

    // Default: paragraph. Soft-wrapped lines are joined.
    blocks.push({ kind: "paragraph", text: lines.map((l) => l.trim()).join(" ") });
  }

  return blocks;
}

export function ArticleContent({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const blocks = parseBlocks(content);

  return (
    <div className={cn("space-y-4", className)}>
      {blocks.map((block, index) => {
        switch (block.kind) {
          case "heading":
            return block.level === 3 ? (
              <h3
                key={index}
                className="pt-2 font-display text-lg font-semibold tracking-tight"
              >
                {block.text}
              </h3>
            ) : (
              <h2
                key={index}
                className="pt-3 font-display text-xl font-semibold tracking-tight"
              >
                {block.text}
              </h2>
            );

          case "list":
            return block.ordered ? (
              <ol key={index} className="ml-5 list-decimal space-y-2 text-sm leading-relaxed text-muted-foreground">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="pl-1 marker:text-primary">
                    {item}
                  </li>
                ))}
              </ol>
            ) : (
              <ul key={index} className="ml-5 list-disc space-y-2 text-sm leading-relaxed text-muted-foreground">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="pl-1 marker:text-primary">
                    {item}
                  </li>
                ))}
              </ul>
            );

          case "quote":
            return (
              <blockquote
                key={index}
                className="border-l-2 border-primary/40 pl-4 text-sm italic leading-relaxed text-muted-foreground"
              >
                {block.text}
              </blockquote>
            );

          case "callout":
            return (
              <aside
                key={index}
                className="rounded-2xl border border-primary/25 bg-primary-soft/60 p-4 text-sm leading-relaxed"
              >
                {block.text}
              </aside>
            );

          default:
            return (
              <p key={index} className="text-sm leading-relaxed text-muted-foreground">
                {block.text}
              </p>
            );
        }
      })}
    </div>
  );
}
