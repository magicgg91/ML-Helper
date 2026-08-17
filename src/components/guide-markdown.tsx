import { markdownToBlocks } from "../lib/guide-markdown";
import Image from "next/image";

export function GuideMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="guide-content">
      {markdownToBlocks(markdown).map((block) => {
        if (block.type === "heading2")
          return <h2 key={block.id}>{block.text}</h2>;
        if (block.type === "heading3")
          return <h3 key={block.id}>{block.text}</h3>;
        if (block.type === "quote")
          return <blockquote key={block.id}>{block.text}</blockquote>;
        if (block.type === "image")
          return block.url ? (
            <Image
              key={block.id}
              src={block.url}
              alt={block.text}
              width={1200}
              height={675}
              unoptimized
            />
          ) : null;
        if (block.type === "bullet")
          return (
            <ul key={block.id}>
              {block.text.split("\n").map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ul>
          );
        if (block.type === "numbered")
          return (
            <ol key={block.id}>
              {block.text.split("\n").map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ol>
          );
        return <p key={block.id}>{block.text}</p>;
      })}
    </div>
  );
}
