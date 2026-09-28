/**
 * Bloc 129 §1.4 : le résumé d'un guide, en texte nu.
 *
 * Les résumés sont saisis en markdown, comme le corps des guides, et
 * s'affichaient tels quels : « **Million Lords** » avec ses astérisques, sur
 * l'accueil comme sur l'index. Un résumé tient sur une ligne sous un titre —
 * il n'a pas besoin de gras, d'italique ni de liens. On retire donc le
 * balisage plutôt que de l'interpréter, ce que le brief laisse au choix.
 *
 * Volontairement limité aux marques d'un résumé : emphase, code, liens,
 * titres et puces en tête de ligne. Ce n'est pas un analyseur markdown, et
 * ça n'a pas à en être un — le corps du guide, lui, passe par
 * markdownToBlocks.
 */
export function plainText(markdown: string): string {
  return (
    markdown
      // [texte](url) -> texte
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      // ![alt](url) a déjà perdu ses crochets ci-dessus ; reste le « ! ».
      .replace(/!(?=\s|$)/g, "")
      // ***fort***, **fort**, *emphase*, _emphase_, `code`
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
      .replace(/_{1,2}([^_]+)_{1,2}/g, "$1")
      .replace(/`([^`]*)`/g, "$1")
      // Une marque de titre ou de puce en début de ligne.
      .replace(/^\s{0,3}(#{1,6}|[-*+]|\d+\.)\s+/gm, "")
      .replace(/^\s{0,3}>\s?/gm, "")
      .trim()
  );
}
