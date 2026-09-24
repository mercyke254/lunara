import { prisma } from "@/lib/db/prisma";
import { addDays, today } from "@/lib/dates";
import { MOOD_OPTIONS, PHASE_META, SYMPTOM_OPTIONS } from "@/lib/constants";
import type { CyclePhase } from "@/lib/calculations/cycle";

/**
 * Global search.
 *
 * PERSONAL RESULTS ARE ALWAYS SCOPED BY `userId`. Article results are public;
 * log, symptom, and mood results are not. This module is the only place that
 * searches across both, so the scoping rule is enforced in one file.
 *
 * Matching is a case-insensitive substring search on a bounded window of the
 * user's recent data. That is deliberate: at personal-log volumes it is fast and
 * predictable, and it avoids the false confidence of fuzzy matching in a health
 * context (a user searching "cramps" should not see "cramps" replaced by an
 * approximate match from an unrelated entry).
 */

export type SearchScope = "all" | "articles" | "logs" | "symptoms";

export interface ArticleResult {
  kind: "article";
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  readingTime: number;
}

export interface LogResult {
  kind: "log";
  id: string;
  date: Date;
  snippet: string;
}

export interface SymptomResult {
  kind: "symptom";
  id: string;
  symptom: string;
  date: Date;
  severity: number | null;
}

export interface MoodResult {
  kind: "mood";
  id: string;
  mood: string;
  date: Date;
}

export interface GuideResult {
  kind: "guide";
  id: string;
  title: string;
  href: string;
  description: string;
}

export type SearchResult = ArticleResult | LogResult | SymptomResult | MoodResult | GuideResult;

export interface SearchResults {
  query: string;
  scope: SearchScope;
  articles: ArticleResult[];
  logs: LogResult[];
  symptoms: SymptomResult[];
  moods: MoodResult[];
  guides: GuideResult[];
  total: number;
}

/** Recent window for personal-log searching. */
const LOG_WINDOW_DAYS = 365;

/** Snippet window around a match, so results are readable in a list. */
function snippetAround(text: string, query: string, radius = 70): string {
  const lower = text.toLowerCase();
  const index = lower.indexOf(query.toLowerCase());
  if (index === -1) return text.slice(0, radius * 2).trim();

  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + query.length + radius);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

/**
 * Static quick answers for cycle concepts.
 *
 * These are navigation shortcuts into existing screens, not generated medical
 * content, so they can never contradict the rest of the app.
 */
const CONCEPT_GUIDES: Array<{
  id: string;
  title: string;
  href: string;
  description: string;
  keywords: string[];
}> = [
  {
    id: "concept-cycle-day",
    title: "Cycle day",
    href: "/dashboard",
    description: "Where you are in your current cycle, counted from your last period start.",
    keywords: ["cycle day", "day of cycle", "where am i"],
  },
  {
    id: "concept-fertile-window",
    title: "Fertile window",
    href: "/fertility",
    description: "Your estimated fertile window, with the uncertainty made explicit.",
    keywords: ["fertile", "fertility", "conceive", "conception", "ovulation window"],
  },
  {
    id: "concept-ovulation",
    title: "Ovulation",
    href: "/fertility",
    description: "How Lunara estimates ovulation, and why it cannot confirm it.",
    keywords: ["ovulation", "ovulating", "egg"],
  },
  {
    id: "concept-average-cycle",
    title: "Average cycle length",
    href: "/insights",
    description: "Your average, shortest, and longest cycles, measured from your own logs.",
    keywords: ["average cycle", "cycle length", "shortest", "longest", "regular", "regularity"],
  },
  {
    id: "concept-period-length",
    title: "Period duration",
    href: "/insights",
    description: "How long your periods typically last, based on what you record.",
    keywords: ["period length", "bleeding", "how long"],
  },
  {
    id: "concept-symptoms",
    title: "Symptom patterns",
    href: "/insights",
    description: "Which symptoms you log most, and which cycle phase they cluster in.",
    keywords: ["symptom", "symptoms", "cramps", "headache", "bloating", "pattern"],
  },
  {
    id: "concept-mood",
    title: "Mood tracking",
    href: "/insights",
    description: "The distribution of the moods you record, without any scoring.",
    keywords: ["mood", "moods", "feeling", "anxious", "low"],
  },
  {
    id: "concept-pms",
    title: "PMS and the luteal phase",
    href: "/education?category=pms",
    description: "Articles on premenstrual symptoms and the phase they usually fall in.",
    keywords: ["pms", "premenstrual", "luteal"],
  },
  {
    id: "concept-pregnancy",
    title: "Pregnancy mode",
    href: "/pregnancy",
    description: "Week-by-week timeline, estimated due date, and appointment reminders.",
    keywords: ["pregnancy", "pregnant", "due date", "baby", "trimester"],
  },
  {
    id: "concept-sleep",
    title: "Sleep and the cycle",
    href: "/education?category=sleep",
    description: "Articles on sleep and hormonal change across the cycle.",
    keywords: ["sleep", "insomnia", "tired", "fatigue"],
  },
  {
    id: "concept-contraception",
    title: "Sexual health",
    href: "/education?category=sexual-health",
    description: "Articles on contraception, screening, and sexual wellbeing.",
    keywords: ["contraception", "birth control", "sexual health", "protection"],
  },
];

function matchGuides(query: string): GuideResult[] {
  const needle = query.toLowerCase();
  return CONCEPT_GUIDES.filter(
    (guide) =>
      guide.title.toLowerCase().includes(needle) ||
      guide.keywords.some((keyword) => keyword.includes(needle) || needle.includes(keyword)),
  ).map((guide) => ({
    kind: "guide" as const,
    id: guide.id,
    title: guide.title,
    href: guide.href,
    description: guide.description,
  }));
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function search(
  userId: string,
  rawQuery: string,
  scope: SearchScope = "all",
): Promise<SearchResults> {
  const query = rawQuery.trim();
  const empty: SearchResults = {
    query,
    scope,
    articles: [],
    logs: [],
    symptoms: [],
    moods: [],
    guides: [],
    total: 0,
  };

  if (query.length < 1) return empty;

  const wantsArticles = scope === "all" || scope === "articles";
  const wantsLogs = scope === "all" || scope === "logs";
  // Symptom/mood matching also answers from the static option lists, so it stays
  // useful even when the user has no matching entries.
  const wantsSymptoms = scope === "all" || scope === "symptoms";

  const [articles, logs, symptoms, moods] = await Promise.all([
    wantsArticles
      ? prisma.article.findMany({
          where: {
            published: true,
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { excerpt: { contains: query, mode: "insensitive" } },
              { content: { contains: query, mode: "insensitive" } },
              { tags: { has: query.toLowerCase() } },
            ],
          },
          orderBy: { publishedAt: "desc" },
          take: 12,
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            readingTime: true,
            category: { select: { name: true } },
          },
        })
      : Promise.resolve([]),

    wantsLogs
      ? prisma.dailyLog.findMany({
          where: {
            userId,
            date: { gte: addDays(today(), -LOG_WINDOW_DAYS) },
            notes: { contains: query, mode: "insensitive" },
          },
          orderBy: { date: "desc" },
          take: 12,
          select: { id: true, date: true, notes: true },
        })
      : Promise.resolve([]),

    wantsSymptoms
      ? prisma.symptom.findMany({
          where: {
            dailyLog: {
              userId,
              date: { gte: addDays(today(), -LOG_WINDOW_DAYS) },
            },
            OR: [
              // Match the stored enum via a name lookup performed below.
              { type: { in: SYMPTOM_OPTIONS.filter((option) =>
                  option.label.toLowerCase().includes(query.toLowerCase()),
                ).map((option) => option.value) } },
            ],
          },
          orderBy: { dailyLog: { date: "desc" } },
          take: 20,
          select: { id: true, type: true, severity: true, dailyLog: { select: { date: true } } },
        })
      : Promise.resolve([]),

    wantsSymptoms
      ? prisma.mood.findMany({
          where: {
            dailyLog: {
              userId,
              date: { gte: addDays(today(), -LOG_WINDOW_DAYS) },
            },
            type: {
              in: MOOD_OPTIONS.filter((option) =>
                option.label.toLowerCase().includes(query.toLowerCase()),
              ).map((option) => option.value),
            },
          },
          orderBy: { dailyLog: { date: "desc" } },
          take: 20,
          select: { id: true, type: true, dailyLog: { select: { date: true } } },
        })
      : Promise.resolve([]),
  ]);

  const symptomLabels = new Map(SYMPTOM_OPTIONS.map((o) => [o.value, o.label]));
  const moodLabels = new Map(MOOD_OPTIONS.map((o) => [o.value, o.label]));

  const articleResults: ArticleResult[] = articles.map((article) => ({
    kind: "article",
    id: article.id,
    title: article.title,
    slug: article.slug,
    category: article.category.name,
    excerpt: article.excerpt,
    readingTime: article.readingTime,
  }));

  const logResults: LogResult[] = logs.map((log) => ({
    kind: "log",
    id: log.id,
    date: log.date,
    snippet: snippetAround(log.notes ?? "", query),
  }));

  const symptomResults: SymptomResult[] = symptoms.map((symptom) => ({
    kind: "symptom",
    id: symptom.id,
    symptom: symptomLabels.get(symptom.type) ?? symptom.type,
    date: symptom.dailyLog.date,
    severity: symptom.severity,
  }));

  const moodResults: MoodResult[] = moods.map((mood) => ({
    kind: "mood",
    id: mood.id,
    mood: moodLabels.get(mood.type) ?? mood.type,
    date: mood.dailyLog.date,
  }));

  const guides = scope === "articles" || scope === "logs" ? [] : matchGuides(query);

  return {
    query,
    scope,
    articles: articleResults,
    logs: logResults,
    symptoms: symptomResults,
    moods: moodResults,
    guides,
    total:
      articleResults.length +
      logResults.length +
      symptomResults.length +
      moodResults.length +
      guides.length,
  };
}

/** Phase descriptions surfaced as search suggestions. */
export function phaseGuides(): GuideResult[] {
  return (Object.keys(PHASE_META) as CyclePhase[]).map((phase) => ({
    kind: "guide",
    id: `phase-${phase}`,
    title: PHASE_META[phase].label,
    href: "/education?category=menstrual-cycle",
    description: PHASE_META[phase].summary,
  }));
}
