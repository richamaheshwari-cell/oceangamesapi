/**
 * Public search: PostgreSQL Full-Text Search + pg_trgm fuzzy + hybrid ranking.
 *
 * - PostgreSQL FTS: search_tsv (tsvector), plainto_tsquery, ts_rank. GIN(search_tsv).
 * - pg_trgm: similarity(lower(title), q) for typo tolerance. GIN(lower(title) gin_trgm_ops).
 * - Hybrid ranking: merge FTS and trigram results, combine scores, sort by type priority then score.
 * - Results limited to MAX_RESULTS (20). All queries use LIMIT; GIN indexes avoid table scans.
 */
const express = require("express");
const { Prisma } = require("@prisma/client");
const prisma = require("../../lib/prisma");
const asyncHandler = require("../../utils/asyncHandler");
const { ok, fail } = require("../../utils/http");

const router = express.Router();

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 80;
const MAX_RESULTS = 20;
const MAX_SUGGESTIONS = 5;
const TRIGRAM_THRESHOLD = 0.2;
const TRIGRAM_SUGGESTION_THRESHOLD = 0.2;
const FTS_WEIGHT = 0.6;
const TRIGRAM_WEIGHT = 0.4;
const PER_TYPE_LIMIT = 15;

// Priority: articles first (1–4), then rest (5–8)
const TYPE_PRIORITY = {
  casino_article: 1,
  game_article: 2,
  blog: 3,
  bonus_article: 4,
  news: 5,
  game: 6,
  bonus: 7,
  page: 8,
};

/**
 * Public path to open this result on the website (no leading slash).
 */
function pathFor(type, slug) {
  const paths = {
    casino_article: `casino-articles/${slug}`,
    game_article: `game-articles/${slug}`,
    blog: `blogs/${slug}`,
    bonus_article: `bonus-articles/${slug}`,
    news: `news/${slug}`,
    game: `games/${slug}`,
    bonus: `bonuses/${slug}`,
    page: `pages/${slug}`,
  };
  return paths[type] || slug;
}

/**
 * Full-text search: ts_rank over search_tsv (tables that have it). GIN(search_tsv). LIMIT per type.
 */
async function fullTextSearch(q) {
  const rows = await prisma.$queryRaw(
    Prisma.sql`
      (SELECT id, title, slug, 'casino_article' AS type,
              ts_rank(search_tsv, plainto_tsquery('english', ${q})) AS score
       FROM casino_articles
       WHERE status = 'published' AND search_tsv @@ plainto_tsquery('english', ${q})
       LIMIT ${PER_TYPE_LIMIT})
      UNION ALL
      (SELECT id, title, slug, 'game_article' AS type,
              ts_rank(search_tsv, plainto_tsquery('english', ${q})) AS score
       FROM game_articles
       WHERE status = 'published' AND search_tsv @@ plainto_tsquery('english', ${q})
       LIMIT ${PER_TYPE_LIMIT})
      UNION ALL
      (SELECT id, title, slug, 'blog' AS type,
              ts_rank(search_tsv, plainto_tsquery('english', ${q})) AS score
       FROM blogs
       WHERE status = 'published' AND search_tsv @@ plainto_tsquery('english', ${q})
       LIMIT ${PER_TYPE_LIMIT})
      UNION ALL
      (SELECT id, title, slug, 'bonus_article' AS type,
              ts_rank(search_tsv, plainto_tsquery('english', ${q})) AS score
       FROM bonus_articles
       WHERE status = 'published' AND search_tsv @@ plainto_tsquery('english', ${q})
       LIMIT ${PER_TYPE_LIMIT})
      UNION ALL
      (SELECT id, title, slug, 'news' AS type,
              ts_rank(search_tsv, plainto_tsquery('english', ${q})) AS score
       FROM news
       WHERE status = 'published' AND search_tsv @@ plainto_tsquery('english', ${q})
       LIMIT ${PER_TYPE_LIMIT})
      UNION ALL
      (SELECT id, title, slug, 'page' AS type,
              ts_rank(search_tsv, plainto_tsquery('english', ${q})) AS score
       FROM pages
       WHERE "isPublished" = true AND search_tsv @@ plainto_tsquery('english', ${q})
       LIMIT ${PER_TYPE_LIMIT})
    `
  );
  return (rows || []).map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    slug: r.slug,
    path: pathFor(r.type, r.slug),
    ftsScore: Number(r.score),
    trigramScore: 0,
  }));
}

/**
 * Trigram (fuzzy) search on title across all content types. GIN(lower(title) gin_trgm_ops). LIMIT per type.
 */
async function trigramSearch(q) {
  const rows = await prisma.$queryRaw(
    Prisma.sql`
      (SELECT id, title, slug, 'casino_article' AS type, similarity(lower(title), ${q}) AS score
       FROM casino_articles
       WHERE status = 'published' AND similarity(lower(title), ${q}) > ${TRIGRAM_THRESHOLD}
       ORDER BY score DESC LIMIT ${PER_TYPE_LIMIT})
      UNION ALL
      (SELECT id, title, slug, 'game_article' AS type, similarity(lower(title), ${q}) AS score
       FROM game_articles
       WHERE status = 'published' AND similarity(lower(title), ${q}) > ${TRIGRAM_THRESHOLD}
       ORDER BY score DESC LIMIT ${PER_TYPE_LIMIT})
      UNION ALL
      (SELECT id, title, slug, 'blog' AS type, similarity(lower(title), ${q}) AS score
       FROM blogs
       WHERE status = 'published' AND similarity(lower(title), ${q}) > ${TRIGRAM_THRESHOLD}
       ORDER BY score DESC LIMIT ${PER_TYPE_LIMIT})
      UNION ALL
      (SELECT id, title, slug, 'bonus_article' AS type, similarity(lower(title), ${q}) AS score
       FROM bonus_articles
       WHERE status = 'published' AND similarity(lower(title), ${q}) > ${TRIGRAM_THRESHOLD}
       ORDER BY score DESC LIMIT ${PER_TYPE_LIMIT})
      UNION ALL
      (SELECT id, title, slug, 'news' AS type, similarity(lower(title), ${q}) AS score
       FROM news
       WHERE status = 'published' AND similarity(lower(title), ${q}) > ${TRIGRAM_THRESHOLD}
       ORDER BY score DESC LIMIT ${PER_TYPE_LIMIT})
      UNION ALL
      (SELECT id, title, slug, 'game' AS type, similarity(lower(title), ${q}) AS score
       FROM games
       WHERE status = 'published' AND similarity(lower(title), ${q}) > ${TRIGRAM_THRESHOLD}
       ORDER BY score DESC LIMIT ${PER_TYPE_LIMIT})
      UNION ALL
      (SELECT id, title, slug, 'bonus' AS type, similarity(lower(title), ${q}) AS score
       FROM bonuses
       WHERE status = 'published' AND similarity(lower(title), ${q}) > ${TRIGRAM_THRESHOLD}
       ORDER BY score DESC LIMIT ${PER_TYPE_LIMIT})
      UNION ALL
      (SELECT id, title, slug, 'page' AS type, similarity(lower(title), ${q}) AS score
       FROM pages
       WHERE "isPublished" = true AND similarity(lower(title), ${q}) > ${TRIGRAM_THRESHOLD}
       ORDER BY score DESC LIMIT ${PER_TYPE_LIMIT})
    `
  );
  return (rows || []).map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    slug: r.slug,
    path: pathFor(r.type, r.slug),
    ftsScore: 0,
    trigramScore: Number(r.score),
  }));
}

/**
 * Hybrid ranking: merge FTS + trigram results, normalize scores, combine with weights.
 * ts_rank can be > 1 so we cap and normalize; similarity is 0..1.
 */
function mergeAndRank(ftsResults, trigramResults) {
  const byKey = new Map();
  const add = (r, fts, trig) => {
    const key = `${r.type}:${r.id}`;
    const existing = byKey.get(key);
    const ftsScore = existing ? Math.max(existing.ftsScore, fts) : fts;
    const trigramScore = existing ? Math.max(existing.trigramScore, trig) : trig;
    const ftsNorm = Math.min(1, ftsScore * 3);
    const hybridScore = FTS_WEIGHT * ftsNorm + TRIGRAM_WEIGHT * trigramScore;
    const out = {
      id: r.id,
      type: r.type,
      title: r.title,
      slug: r.slug,
      path: r.path || pathFor(r.type, r.slug),
      score: Math.round(hybridScore * 100) / 100,
      ftsScore,
      trigramScore,
    };
    byKey.set(key, out);
  };
  for (const r of ftsResults) add(r, r.ftsScore, r.trigramScore);
  for (const r of trigramResults) add(r, r.ftsScore, r.trigramScore);

  return Array.from(byKey.values())
    .sort((a, b) => {
      const pa = TYPE_PRIORITY[a.type] ?? 99;
      const pb = TYPE_PRIORITY[b.type] ?? 99;
      if (pa !== pb) return pa - pb;
      return b.score - a.score;
    })
    .slice(0, MAX_RESULTS)
    .map(({ ftsScore, trigramScore, ...r }) => r);
}

/**
 * Suggestions: distinct titles from all content types by trigram similarity (for "while typing").
 */
async function getSuggestions(q) {
  const rows = await prisma.$queryRaw(
    Prisma.sql`
      (SELECT title, similarity(lower(title), ${q}) AS sc FROM casino_articles
       WHERE status = 'published' AND similarity(lower(title), ${q}) > ${TRIGRAM_SUGGESTION_THRESHOLD})
      UNION ALL
      (SELECT title, similarity(lower(title), ${q}) AS sc FROM game_articles
       WHERE status = 'published' AND similarity(lower(title), ${q}) > ${TRIGRAM_SUGGESTION_THRESHOLD})
      UNION ALL
      (SELECT title, similarity(lower(title), ${q}) AS sc FROM blogs
       WHERE status = 'published' AND similarity(lower(title), ${q}) > ${TRIGRAM_SUGGESTION_THRESHOLD})
      UNION ALL
      (SELECT title, similarity(lower(title), ${q}) AS sc FROM bonus_articles
       WHERE status = 'published' AND similarity(lower(title), ${q}) > ${TRIGRAM_SUGGESTION_THRESHOLD})
      UNION ALL
      (SELECT title, similarity(lower(title), ${q}) AS sc FROM news
       WHERE status = 'published' AND similarity(lower(title), ${q}) > ${TRIGRAM_SUGGESTION_THRESHOLD})
      UNION ALL
      (SELECT title, similarity(lower(title), ${q}) AS sc FROM games
       WHERE status = 'published' AND similarity(lower(title), ${q}) > ${TRIGRAM_SUGGESTION_THRESHOLD})
      UNION ALL
      (SELECT title, similarity(lower(title), ${q}) AS sc FROM bonuses
       WHERE status = 'published' AND similarity(lower(title), ${q}) > ${TRIGRAM_SUGGESTION_THRESHOLD})
      UNION ALL
      (SELECT title, similarity(lower(title), ${q}) AS sc FROM pages
       WHERE "isPublished" = true AND similarity(lower(title), ${q}) > ${TRIGRAM_SUGGESTION_THRESHOLD})
      ORDER BY sc DESC
      LIMIT 50
    `
  );
  const seen = new Set();
  const suggestions = [];
  for (const r of rows || []) {
    const t = (r.title || "").trim();
    if (t && !seen.has(t.toLowerCase())) {
      seen.add(t.toLowerCase());
      suggestions.push(t);
      if (suggestions.length >= MAX_SUGGESTIONS) break;
    }
  }
  return suggestions;
}

// GET /api/v1/public/search?q=keyword
router.get(
  "/search",
  asyncHandler(async (req, res) => {
    let q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    q = q.toLowerCase();

    if (q.length < MIN_QUERY_LENGTH) {
      return fail(res, 400, "VALIDATION_ERROR", `Query must be at least ${MIN_QUERY_LENGTH} characters`);
    }
    if (q.length > MAX_QUERY_LENGTH) {
      return fail(res, 400, "VALIDATION_ERROR", `Query must be at most ${MAX_QUERY_LENGTH} characters`);
    }

    const [ftsResults, trigramResults] = await Promise.all([
      fullTextSearch(q),
      trigramSearch(q),
    ]);

    const results = mergeAndRank(ftsResults, trigramResults);
    const suggestions = await getSuggestions(q);

    return ok(res, {
      results,
      suggestions: suggestions.slice(0, MAX_SUGGESTIONS),
    });
  })
);

module.exports = router;
