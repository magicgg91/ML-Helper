import { z } from "zod";

/**
 * Zod sans compilation JIT dans le navigateur.
 *
 * Zod 4 compile ses schémas en fonctions optimisées avec `new Function`, et
 * teste d'abord si l'environnement le permet. Notre CSP de production
 * n'autorise pas `unsafe-eval` (src/proxy.ts) : le test échoue, Zod retombe
 * sans bruit sur son chemin non compilé — mais le navigateur, lui, journalise
 * une violation de CSP à chaque page qui valide côté client. Relevé en
 * production sur `/fr/contact` et `/admin/config`, les deux écrans dont le
 * bundle client embarque un schéma.
 *
 * `jitless` court-circuite le test : plus de `new Function`, donc plus de
 * violation, et le même chemin d'exécution qu'avant puisque la compilation
 * était de toute façon refusée. Zod garde sa compilation côté serveur, où
 * elle fonctionne et où aucune CSP ne s'applique.
 *
 * À importer AVANT de construire un schéma : Zod mémorise le résultat de son
 * test au premier accès. Un module qui importe celui-ci est évalué après lui
 * (ordre des modules ES), ce qui suffit — d'où l'import en tête des modules
 * de schéma atteignables depuis le client, et le test qui vérifie qu'aucun
 * n'est oublié.
 */
if (typeof window !== "undefined") z.config({ jitless: true });
