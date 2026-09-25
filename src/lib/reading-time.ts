/**
 * Bloc 129 §3.5 : le temps de lecture affiché en pastille.
 *
 * Calculé, pas saisi : une valeur écrite à la main vieillit dès la première
 * relecture du guide. 200 mots par minute est la cadence usuelle pour de la
 * prose ; arrondi à la minute supérieure, et jamais zéro.
 *
 * Le balisage markdown est retiré avant de compter, sinon les URL des liens
 * et les marques d'emphase gonfleraient le total.
 */
export const wordsPerMinute = 200;

export function readingMinutes(markdown: string): number {
  const words = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~|-]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}
