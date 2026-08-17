export type GuideBlock = {
  id: string;
  type:
    | "paragraph"
    | "heading2"
    | "heading3"
    | "quote"
    | "bullet"
    | "numbered"
    | "image";
  text: string;
  url?: string;
};

let nextId = 0;
export function newGuideBlock(
  type: GuideBlock["type"] = "paragraph",
): GuideBlock {
  nextId += 1;
  return {
    id: `block-${nextId}`,
    type,
    text: "",
    url: type === "image" ? "" : undefined,
  };
}

export function markdownToBlocks(markdown: string): GuideBlock[] {
  const blocks: GuideBlock[] = [];
  for (const raw of markdown
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean)) {
    const image = raw.match(/^!\[([\s\S]*)\]\((.+)\)$/);
    if (image)
      blocks.push({ ...newGuideBlock("image"), text: image[1], url: image[2] });
    else if (raw.startsWith("### "))
      blocks.push({ ...newGuideBlock("heading3"), text: raw.slice(4) });
    else if (raw.startsWith("## "))
      blocks.push({ ...newGuideBlock("heading2"), text: raw.slice(3) });
    else if (raw.split("\n").every((line) => line.startsWith("- ")))
      blocks.push({
        ...newGuideBlock("bullet"),
        text: raw
          .split("\n")
          .map((line) => line.slice(2))
          .join("\n"),
      });
    else if (raw.split("\n").every((line) => /^\d+\. /.test(line)))
      blocks.push({
        ...newGuideBlock("numbered"),
        text: raw
          .split("\n")
          .map((line) => line.replace(/^\d+\. /, ""))
          .join("\n"),
      });
    else if (raw.split("\n").every((line) => line.startsWith("> ")))
      blocks.push({
        ...newGuideBlock("quote"),
        text: raw
          .split("\n")
          .map((line) => line.slice(2))
          .join("\n"),
      });
    else blocks.push({ ...newGuideBlock("paragraph"), text: raw });
  }
  return blocks.length ? blocks : [newGuideBlock()];
}

export function blocksToMarkdown(blocks: GuideBlock[]) {
  return blocks
    .map((block) => {
      const text = block.text.trim();
      if (block.type === "image")
        return block.url?.trim() ? `![${text}](${block.url.trim()})` : "";
      if (!text) return "";
      if (block.type === "heading2") return `## ${text}`;
      if (block.type === "heading3") return `### ${text}`;
      if (block.type === "quote")
        return text
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n");
      if (block.type === "bullet")
        return text
          .split("\n")
          .filter(Boolean)
          .map((line) => `- ${line}`)
          .join("\n");
      if (block.type === "numbered")
        return text
          .split("\n")
          .filter(Boolean)
          .map((line, index) => `${index + 1}. ${line}`)
          .join("\n");
      return text;
    })
    .filter(Boolean)
    .join("\n\n");
}
