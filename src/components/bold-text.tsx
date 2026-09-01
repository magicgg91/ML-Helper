import type { ReactNode } from "react";

// Bloc 62/B: **bold** support for Boutique's Nom/Description fields —
// deliberately not the full markdown pipeline (Blocs 55-58 already spent
// that complexity budget on guides). A single regex is all this needs:
// no italics, links, lists, or images to interpret, just **text** -> bold,
// literal everywhere else. Shared as one function so admin's live preview
// and the public table can never render it differently.
export function renderBoldText(text: string): ReactNode {
  const pattern = /\*\*(.+?)\*\*/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(<strong key={key++}>{match[1]}</strong>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}
