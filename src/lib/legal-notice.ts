export const legalNoticeKey = "legal_notice";

export const defaultFrenchLegalNotice = `# Mentions légales

## Éditeur du site
Le site ML-Helper (ml-helper.com) est édité à titre personnel et non
commercial par :
**[NOM DE L'ÉDITEUR — À COMPLÉTER]**
Contact : [ADRESSE EMAIL DE CONTACT — À COMPLÉTER]

## Directeur de la publication
[NOM DE L'ÉDITEUR — À COMPLÉTER]

## Hébergement
**[NOM DE L'HÉBERGEUR — À COMPLÉTER]**
[ADRESSE DE L'HÉBERGEUR — À COMPLÉTER]
[CONTACT DE L'HÉBERGEUR — À COMPLÉTER]

## Propriété intellectuelle
Le contenu original de ce site (guides, textes, code source, interface)
est la propriété de son éditeur, sauf mention contraire.

*Million Lords* et l'ensemble des noms, images, marques et éléments
visuels associés au jeu sont la propriété de leurs ayants droit
respectifs. ML-Helper est un site communautaire non officiel, non
affilié à l'éditeur du jeu, créé à des fins d'entraide entre joueurs.

## Développement et fiabilité des données
Ce site a été développé avec l'assistance d'outils d'intelligence
artificielle. Les formules, valeurs de jeu et contenus proposés dans les
simulateurs ont été **vérifiés par observation directe en jeu** par
l'équipe éditoriale, dans la mesure du possible — ils restent toutefois
issus d'une démarche communautaire et non officielle, susceptibles de
comporter des approximations ou des écarts avec des mises à jour
récentes du jeu. En cas de doute, se référer en priorité à ce que vous
observez vous-même en jeu.

## Données personnelles
Les paramètres de simulation (niveau, ligue, statistiques du joueur) que
vous saisissez sur ce site sont stockés **uniquement dans votre
navigateur** (localStorage), jamais transmis ni conservés sur nos
serveurs.

Seuls les comptes d'administration du site (réservés à l'équipe
éditoriale) sont enregistrés en base de données, avec un mot de passe
stocké de façon chiffrée.

Le formulaire de contact collecte votre adresse email, l'objet
sélectionné et le message que vous rédigez. Ces informations sont
envoyées par email à l'équipe éditoriale et ne sont jamais conservées
en base de données sur ce site.

## Cookies
Ce site n'utilise pas de cookies de suivi publicitaire ou d'analyse
tierce. [À AJUSTER SI DES COOKIES SONT AJOUTÉS ULTÉRIEUREMENT.]

## Limitation de responsabilité
Les informations et simulateurs proposés sur ce site sont fournis à
titre indicatif, établis à partir d'observations communautaires du jeu
*Million Lords*. L'éditeur ne garantit pas l'exactitude absolue de ces
données et ne saurait être tenu responsable des décisions prises par
les joueurs sur cette base.

## Droit applicable
Les présentes mentions légales sont soumises au droit français.`;

export const defaultEnglishLegalNotice = `# Legal Notice

## Site publisher
The ML-Helper website (ml-helper.com) is published on a personal,
non-commercial basis by:
**[PUBLISHER NAME — TO BE COMPLETED]**
Contact: [CONTACT EMAIL ADDRESS — TO BE COMPLETED]

## Publication director
[PUBLISHER NAME — TO BE COMPLETED]

## Hosting
**[HOST NAME — TO BE COMPLETED]**
[HOST ADDRESS — TO BE COMPLETED]
[HOST CONTACT — TO BE COMPLETED]

## Intellectual property
The original content of this site (guides, text, source code, interface)
is the property of its publisher, unless stated otherwise.

*Million Lords* and all names, images, trademarks, and visual elements
associated with the game are the property of their respective rights
holders. ML-Helper is an unofficial community site, not affiliated with
the game's publisher, created to help players support one another.

## Development and reliability of the data
This site was developed with the assistance of artificial intelligence
tools. The formulas, in-game values, and content offered in the
simulators have been **verified by direct in-game observation** by the
editorial team wherever possible — they nonetheless remain the product
of an unofficial, community-driven effort, and may contain
approximations or discrepancies following recent game updates. When in
doubt, always defer to what you observe yourself in-game.

## Personal data
The simulation settings (level, league, player stats) you enter on this
site are stored **only in your browser** (localStorage), never
transmitted to or kept on our servers.

Only the site's administration accounts (reserved for the editorial
team) are recorded in the database, with a password stored in encrypted
form.

The contact form collects your email address, the subject you select,
and the message you write. This information is sent by email to the
editorial team and is never kept in this site's database.

## Cookies
This site does not use advertising or third-party analytics tracking
cookies. [TO BE ADJUSTED IF NON-ESSENTIAL COOKIES ARE ADDED LATER.]

## Limitation of liability
The information and simulators offered on this site are provided for
guidance only, based on community observations of the game
*Million Lords*. The publisher does not guarantee the absolute accuracy
of this data and cannot be held responsible for decisions made by
players based on it.

## Governing law
This legal notice is governed by French law.`;

// Used as the fallback source (via localizedText) before a database row
// exists yet — e.g. before the one-time Super Admin setup has run. Locale
// blind here would mean an English visitor briefly sees French text.
export const defaultLegalNoticeContent = {
  fr: defaultFrenchLegalNotice,
  en: defaultEnglishLegalNotice,
};
