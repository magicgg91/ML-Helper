import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as core from "zod/v4/core";
import "./contact";

const root = path.join(process.cwd(), "src");

/**
 * La CSP de production n'autorise pas `unsafe-eval`, et Zod 4 teste `new
 * Function` avant de compiler ses schémas : le test échoue, Zod continue sans
 * compiler, et le navigateur journalise une violation de CSP. Relevé en
 * production sur `/fr/contact` et `/admin/config`.
 *
 * Ce fichier tient les deux moitiés du correctif : le réglage lui-même, et le
 * fait qu'aucun schéma atteignable depuis le client ne l'oublie.
 */
describe("Zod sans JIT dans le navigateur", () => {
  it("coupe la compilation dès qu'un schéma client est importé", () => {
    // L'import de `./contact` en tête de fichier est la moitié du test : il
    // passe forcément par `./zod-config`, dont le corps s'exécute avant le
    // sien. L'environnement de test a un `window`, donc le réglage s'applique.
    expect(core.globalConfig.jitless).toBe(true);
  });

  /**
   * Le serveur, lui, garde la compilation : elle y fonctionne, aucune CSP ne
   * s'y applique, et c'est là que passent toutes les validations d'API.
   */
  it("ne coupe rien hors du navigateur", () => {
    const source = readFileSync(
      path.join(root, "lib", "zod-config.ts"),
      "utf8",
    );
    expect(source).toContain('typeof window !== "undefined"');
  });

  /**
   * Le piège, sinon : un nouveau schéma importé par un composant client
   * ramènerait la violation sans que personne ne le voie. Les schémas qui ne
   * servent qu'au serveur (routes d'API, services) n'ont pas à s'en soucier —
   * ils ne partent pas dans le bundle du navigateur.
   */
  it("est importé par tout schéma atteignable depuis le client", () => {
    const serveurSeulement = [
      path.join("app", "api") + path.sep,
      "services" + path.sep,
    ];
    const fichiers = readdirSync(root, { recursive: true, encoding: "utf8" })
      .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f))
      .filter(
        (f) => !serveurSeulement.some((prefixe) => f.startsWith(prefixe)),
      );

    const oublis = fichiers.filter((f) => {
      if (f === path.join("lib", "zod-config.ts")) return false;
      const source = readFileSync(path.join(root, f), "utf8");
      const importeZod = /^import .*from "zod";$/m.test(source);
      return importeZod && !source.includes('import "./zod-config"');
    });
    expect(oublis).toEqual([]);
  });
});
