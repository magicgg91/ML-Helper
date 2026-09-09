-- Bloc 31/B: the Combat Equipment Comparator is removed entirely (not
-- deactivated) — its Calculator row must go too, or it would keep showing
-- up in the admin Outils table with no matching code or translation.
DELETE FROM "calculators" WHERE "slug" = 'stuff-comparison';
