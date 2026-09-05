-- Replace only the still-unedited placeholder about the contact form.
-- Content already customized by an administrator is deliberately preserved.
UPDATE "static_content"
SET "content" = json_object('fr', '# Mentions légales

## Éditeur du site
Le site ML-Helper (ml-helper.com) est édité à titre personnel et non
commercial par :
**[NOM DE L''ÉDITEUR — À COMPLÉTER]**
Contact : [ADRESSE EMAIL DE CONTACT — À COMPLÉTER]

## Directeur de la publication
[NOM DE L''ÉDITEUR — À COMPLÉTER]

## Hébergement
**[NOM DE L''HÉBERGEUR — À COMPLÉTER]**
[ADRESSE DE L''HÉBERGEUR — À COMPLÉTER]
[CONTACT DE L''HÉBERGEUR — À COMPLÉTER]

## Propriété intellectuelle
Le contenu original de ce site (guides, textes, code source, interface)
est la propriété de son éditeur, sauf mention contraire.

*Million Lords* et l''ensemble des noms, images, marques et éléments
visuels associés au jeu sont la propriété de leurs ayants droit
respectifs. ML-Helper est un site communautaire non officiel, non
affilié à l''éditeur du jeu, créé à des fins d''entraide entre joueurs.

## Développement et fiabilité des données
Ce site a été développé avec l''assistance d''outils d''intelligence
artificielle. Les formules, valeurs de jeu et contenus proposés dans les
simulateurs ont été **vérifiés par observation directe en jeu** par
l''équipe éditoriale, dans la mesure du possible — ils restent toutefois
issus d''une démarche communautaire et non officielle, susceptibles de
comporter des approximations ou des écarts avec des mises à jour
récentes du jeu. En cas de doute, se référer en priorité à ce que vous
observez vous-même en jeu.

## Données personnelles
Les paramètres de simulation (niveau, ligue, statistiques du joueur) que
vous saisissez sur ce site sont stockés **uniquement dans votre
navigateur** (localStorage), jamais transmis ni conservés sur nos
serveurs.

Seuls les comptes d''administration du site (réservés à l''équipe
éditoriale) sont enregistrés en base de données, avec un mot de passe
stocké de façon chiffrée.

Le formulaire de contact collecte votre adresse email, l''objet
sélectionné et le message que vous rédigez. Ces informations sont
envoyées par email à l''équipe éditoriale et ne sont jamais conservées
en base de données sur ce site.

## Cookies
Ce site n''utilise pas de cookies de suivi publicitaire ou d''analyse
tierce. [À AJUSTER SI DES COOKIES SONT AJOUTÉS ULTÉRIEUREMENT.]

## Limitation de responsabilité
Les informations et simulateurs proposés sur ce site sont fournis à
titre indicatif, établis à partir d''observations communautaires du jeu
*Million Lords*. L''éditeur ne garantit pas l''exactitude absolue de ces
données et ne saurait être tenu responsable des décisions prises par
les joueurs sur cette base.

## Droit applicable
Les présentes mentions légales sont soumises au droit français.'),
    "updated_at" = CURRENT_TIMESTAMP
WHERE "key" = 'legal_notice'
  AND instr(json_extract("content", '$.fr'), 'SI FORMULAIRE DE CONTACT') > 0;
