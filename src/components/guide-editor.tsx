"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  blocksToMarkdown,
  markdownToBlocks,
  newGuideBlock,
  type GuideBlock,
} from "../lib/guide-markdown";

type Locale = "fr" | "en";
type LocaleDraft = { title: string; excerpt: string; blocks: GuideBlock[] };
type GuideDraft = {
  id?: string;
  slug: string;
  category: string;
  coverImage: string;
  status: string;
  translations: Record<
    Locale,
    { title: string; excerpt: string; content: string }
  >;
};

const blockLabels: Record<GuideBlock["type"], string> = {
  paragraph: "Paragraphe",
  heading2: "Titre",
  heading3: "Sous-titre",
  bullet: "Liste à puces",
  numbered: "Liste numérotée",
  quote: "Citation",
  image: "Image",
};

export function GuideEditor({
  initial,
  canPublish,
}: {
  initial: GuideDraft;
  canPublish: boolean;
}) {
  const router = useRouter();
  const [id, setId] = useState(initial.id);
  const [locale, setLocale] = useState<Locale>("fr");
  const [slug, setSlug] = useState(initial.slug);
  const [category, setCategory] = useState(initial.category);
  const [coverImage, setCoverImage] = useState(initial.coverImage);
  const [status, setStatus] = useState(initial.status);
  const [message, setMessage] = useState("");
  const [translations, setTranslations] = useState<Record<Locale, LocaleDraft>>(
    {
      fr: {
        ...initial.translations.fr,
        blocks: markdownToBlocks(initial.translations.fr.content),
      },
      en: {
        ...initial.translations.en,
        blocks: markdownToBlocks(initial.translations.en.content),
      },
    },
  );

  function updateLocale(patch: Partial<LocaleDraft>) {
    setTranslations((current) => ({
      ...current,
      [locale]: { ...current[locale], ...patch },
    }));
  }
  function updateBlock(index: number, patch: Partial<GuideBlock>) {
    updateLocale({
      blocks: translations[locale].blocks.map((block, item) =>
        item === index ? { ...block, ...patch } : block,
      ),
    });
  }
  function moveBlock(index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (destination < 0 || destination >= translations[locale].blocks.length)
      return;
    const blocks = [...translations[locale].blocks];
    [blocks[index], blocks[destination]] = [blocks[destination], blocks[index]];
    updateLocale({ blocks });
  }
  async function save(nextStatus?: "pending_review" | "published" | "draft") {
    setMessage("Enregistrement…");
    const payload = {
      slug,
      category,
      coverImage,
      translations: Object.fromEntries(
        (["fr", "en"] as const).map((key) => [
          key,
          {
            title: translations[key].title,
            excerpt: translations[key].excerpt,
            content: blocksToMarkdown(translations[key].blocks),
          },
        ]),
      ),
    };
    const response = await fetch(
      id ? `/api/admin/guides/${id}` : "/api/admin/guides",
      {
        method: id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    ).catch(() => null);
    if (!response?.ok) {
      const error = response ? await response.json().catch(() => null) : null;
      setMessage(
        error?.error === "slug_already_exists"
          ? "Ce slug est déjà utilisé."
          : "Le guide contient des champs invalides ou incomplets.",
      );
      return;
    }
    const saved = await response.json();
    const guideId = id ?? saved.id;
    setId(guideId);
    if (nextStatus) {
      const statusResponse = await fetch(
        `/api/admin/guides/${guideId}/status`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        },
      );
      if (!statusResponse.ok) {
        setMessage(
          "Guide enregistré, mais ton rôle ne permet pas ce changement de statut.",
        );
        return;
      }
      setStatus(nextStatus);
    }
    setMessage("Guide enregistré.");
    if (!id) router.replace(`/admin/guides/${guideId}`);
    router.refresh();
  }

  const draft = translations[locale];
  return (
    <div className="guide-editor">
      <section className="admin-panel guide-metadata">
        <label>
          Slug
          <input
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            required
          />
        </label>
        <label>
          Catégorie
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="debutants">Débutants</option>
            <option value="expeditions">Expéditions</option>
            <option value="stuff">Stuff</option>
            <option value="combat">Combat</option>
            <option value="defense">Défense</option>
            <option value="evenements">Événements</option>
          </select>
        </label>
        <label>
          Image de couverture (URL)
          <input
            type="url"
            value={coverImage}
            onChange={(event) => setCoverImage(event.target.value)}
          />
        </label>
      </section>
      <nav className="tabs" aria-label="Langue du guide">
        {(["fr", "en"] as const).map((key) => (
          <button
            type="button"
            key={key}
            aria-current={locale === key ? "page" : undefined}
            onClick={() => setLocale(key)}
          >
            {key.toUpperCase()}
          </button>
        ))}
      </nav>
      <section className="admin-panel guide-locale-fields">
        <label>
          Titre ({locale.toUpperCase()})
          <input
            value={draft.title}
            onChange={(event) => updateLocale({ title: event.target.value })}
          />
        </label>
        <label>
          Résumé ({locale.toUpperCase()})
          <input
            value={draft.excerpt}
            maxLength={320}
            onChange={(event) => updateLocale({ excerpt: event.target.value })}
          />
        </label>
      </section>
      <section
        className="guide-block-editor"
        aria-label={`Contenu ${locale.toUpperCase()}`}
      >
        {draft.blocks.map((block, index) => (
          <article
            className={`guide-editor-block block-${block.type}`}
            key={block.id}
          >
            <div className="guide-block-toolbar">
              <span>{blockLabels[block.type]}</span>
              <button
                type="button"
                onClick={() => moveBlock(index, -1)}
                disabled={index === 0}
                aria-label="Monter le bloc"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveBlock(index, 1)}
                disabled={index === draft.blocks.length - 1}
                aria-label="Descendre le bloc"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() =>
                  updateLocale({
                    blocks: draft.blocks.filter((_, item) => item !== index),
                  })
                }
                aria-label="Supprimer le bloc"
              >
                ×
              </button>
            </div>
            {block.type === "image" ? (
              <>
                <label>
                  URL de l’image
                  <input
                    type="url"
                    value={block.url}
                    onChange={(event) =>
                      updateBlock(index, { url: event.target.value })
                    }
                  />
                </label>
                <label>
                  Texte alternatif
                  <input
                    value={block.text}
                    onChange={(event) =>
                      updateBlock(index, { text: event.target.value })
                    }
                  />
                </label>
              </>
            ) : (
              <div
                className="guide-rich-block"
                role="textbox"
                aria-label={`${blockLabels[block.type]} ${index + 1}`}
                contentEditable
                suppressContentEditableWarning
                onBlur={(event) =>
                  updateBlock(index, { text: event.currentTarget.innerText })
                }
              >
                {block.text}
              </div>
            )}
          </article>
        ))}
        <div className="guide-add-block" aria-label="Ajouter un bloc">
          {(Object.keys(blockLabels) as GuideBlock["type"][]).map((type) => (
            <button
              type="button"
              key={type}
              onClick={() =>
                updateLocale({ blocks: [...draft.blocks, newGuideBlock(type)] })
              }
            >
              + {blockLabels[type]}
            </button>
          ))}
        </div>
      </section>
      <div className="admin-actions">
        <button type="button" onClick={() => save()}>
          Enregistrer
        </button>
        {status !== "pending_review" && status !== "published" && (
          <button type="button" onClick={() => save("pending_review")}>
            Soumettre en review
          </button>
        )}
        {canPublish && status !== "published" && (
          <button type="button" onClick={() => save("published")}>
            Publier
          </button>
        )}
        {canPublish && status === "published" && (
          <button
            type="button"
            className="secondary-action"
            onClick={() => save("draft")}
          >
            Dépublier en brouillon
          </button>
        )}
      </div>
      {message && (
        <p className="form-status" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
