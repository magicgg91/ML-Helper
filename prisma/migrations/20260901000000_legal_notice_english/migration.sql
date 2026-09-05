-- Adds the English legal notice text alongside the existing French
-- content, as a second key in the same JSON-per-locale object (same
-- mechanism already used for guide title/excerpt/content). Never
-- overwrites an English value an administrator may already have entered.
UPDATE "static_content"
SET "content" = json_set("content", '$.en', '# Legal Notice

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
the game''s publisher, created to help players support one another.

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

Only the site''s administration accounts (reserved for the editorial
team) are recorded in the database, with a password stored in encrypted
form.

The contact form collects your email address, the subject you select,
and the message you write. This information is sent by email to the
editorial team and is never kept in this site''s database.

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
This legal notice is governed by French law.'),
    "updated_at" = CURRENT_TIMESTAMP
WHERE "key" = 'legal_notice'
  AND json_extract("content", '$.en') IS NULL;
