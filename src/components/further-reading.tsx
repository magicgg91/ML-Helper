import { Link } from "@/i18n/navigation";

/**
 * Bloc 129 §3.8 : « Aller plus loin », sous une page outil.
 *
 * Trois cartes au plus, chacune annoncée par son genre — Guide ou Outil. Le
 * composant ne choisit rien : la page lui passe des entrées déjà résolues,
 * et rend `null` quand il n'y en a pas, comme le brief le demande.
 */
export type FurtherReadingCard = {
  href: string;
  /** « Guide » ou « Outil », déjà traduit. */
  kind: string;
  title: string;
};

export function FurtherReading({
  title,
  cards,
}: {
  title: string;
  cards: FurtherReadingCard[];
}) {
  if (cards.length === 0) return null;
  return (
    <section className="further-reading" aria-labelledby="further-reading">
      <h2 id="further-reading">{title}</h2>
      <ul>
        {cards.map((card) => (
          <li key={`${card.kind}-${card.href}`}>
            <Link href={card.href} prefetch={false}>
              <span className="eyebrow">{card.kind}</span>
              <span className="further-reading-title">{card.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
