import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  Compass,
  Filter,
  NotebookPen,
  Search as SearchIcon,
  Smile,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/current-user";
import { search, type SearchScope } from "@/lib/queries/search";
import { searchQuerySchema } from "@/lib/validation/schemas";
import { formatMedium, toISODate } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Search",
  description: "Search articles, symptoms, cycle concepts, and your own logs.",
};

export const dynamic = "force-dynamic";

const SCOPES: Array<{ value: SearchScope; label: string }> = [
  { value: "all", label: "Everything" },
  { value: "articles", label: "Articles" },
  { value: "symptoms", label: "Symptoms & mood" },
  { value: "logs", label: "My notes" },
];

/**
 * Global search.
 *
 * Implemented as a GET form so the query lives in the URL: results are
 * shareable, bookmarkable, and survive a refresh. Personal results are scoped to
 * the signed-in user inside `search()` — the query string only ever carries the
 * search term, never an owner.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; scope?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const parsedQuery = searchQuerySchema.safeParse({
    q: params.q ?? "",
    scope: (params.scope as SearchScope) ?? "all",
  });

  const hasQuery = parsedQuery.success;
  const scope: SearchScope = hasQuery ? parsedQuery.data.scope : "all";
  const query = hasQuery ? parsedQuery.data.q : "";

  const results = hasQuery ? await search(user.id, query, scope) : null;

  return (
    <>
      <PageHeader
        title="Search"
        description="Find an article, look up a symptom, or search the notes you have written."
      />

      {/* ---- Query form --------------------------------------------------- */}
      <Card>
        <CardContent className="pt-6">
          <form method="GET" action="/search" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <SearchIcon
                  className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  name="q"
                  defaultValue={query}
                  placeholder="e.g. cramps, fertile window, sleep, my notes on stress"
                  className="pl-10"
                  aria-label="Search Lunara"
                  autoComplete="off"
                  maxLength={100}
                />
              </div>
              <Button type="submit" className="sm:w-auto">
                <SearchIcon aria-hidden="true" />
                Search
              </Button>
            </div>

            <fieldset className="flex flex-wrap items-center gap-2">
              <legend className="sr-only">Limit results to</legend>
              <Filter className="size-3.5 text-muted-foreground" aria-hidden="true" />
              {SCOPES.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "cursor-pointer rounded-full border px-3 py-1.5 text-xs transition-colors",
                    scope === option.value
                      ? "border-primary bg-primary-soft font-medium text-primary"
                      : "border-input text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  <input
                    type="radio"
                    name="scope"
                    value={option.value}
                    defaultChecked={scope === option.value}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
            </fieldset>
          </form>
        </CardContent>
      </Card>

      {/* ---- Results ------------------------------------------------------ */}
      {!results ? (
        <Card>
          <CardHeader>
            <CardTitle>What you can search</CardTitle>
            <CardDescription>
              Lunara searches four things at once. Personal results always stay
              inside your own account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 sm:grid-cols-2">
              {[
                { icon: BookOpen, title: "Education articles", body: "Eleven categories, from cycle basics to sexual health." },
                { icon: Smile, title: "Symptoms and moods", body: "Every symptom and mood you have logged, by name." },
                { icon: NotebookPen, title: "Your notes", body: "Free-text notes from your daily logs." },
                { icon: Compass, title: "Cycle concepts", body: "Short explanations that link to the right screen." },
              ].map(({ icon: Icon, title, body }) => (
                <li key={title} className="rounded-2xl border border-border bg-muted/40 p-4">
                  <Icon className="size-4 text-primary" aria-hidden="true" />
                  <p className="mt-2 text-sm font-medium">{title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : results.total === 0 ? (
        <EmptyState
          icon={<SearchIcon />}
          title={`No matches for “${results.query}”`}
          description="Try a broader term, or switch the filter to Everything. Articles are always searchable, even if you have not logged anything yet."
        />
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground" role="status">
            {results.total} {results.total === 1 ? "result" : "results"} for{" "}
            <span className="font-medium text-foreground">“{results.query}”</span>
          </p>

          {/* Concepts */}
          {results.guides.length > 0 ? (
            <ResultSection title="Cycle concepts" icon={<Compass className="size-4" aria-hidden="true" />}>
              <div className="grid gap-3 sm:grid-cols-2">
                {results.guides.map((guide) => (
                  <Link
                    key={guide.id}
                    href={guide.href}
                    className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
                  >
                    <p className="text-sm font-medium">{guide.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {guide.description}
                    </p>
                  </Link>
                ))}
              </div>
            </ResultSection>
          ) : null}

          {/* Articles */}
          {results.articles.length > 0 ? (
            <ResultSection title="Articles" icon={<BookOpen className="size-4" aria-hidden="true" />}>
              <ul className="space-y-3">
                {results.articles.map((article) => (
                  <li key={article.id}>
                    <Link
                      href={`/education/${article.slug}`}
                      className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{article.title}</p>
                        <Badge variant="secondary" className="font-normal">
                          {article.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {article.readingTime} min
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {article.excerpt}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </ResultSection>
          ) : null}

          {/* Symptoms */}
          {results.symptoms.length > 0 ? (
            <ResultSection title="Symptoms you have logged" icon={<Smile className="size-4" aria-hidden="true" />}>
              <ul className="space-y-2">
                {results.symptoms.map((symptom) => (
                  <li
                    key={symptom.id}
                    className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"
                  >
                    <Badge variant="rose" className="font-normal">
                      {symptom.symptom}
                    </Badge>
                    {symptom.severity ? (
                      <span className="text-xs text-muted-foreground">
                        {symptom.severity}/5
                      </span>
                    ) : null}
                    <span className="text-xs text-muted-foreground">
                      {formatMedium(symptom.date)}
                    </span>
                    <Link
                      href={`/log?date=${toISODate(symptom.date)}`}
                      className="ml-auto text-xs font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Open that day
                    </Link>
                  </li>
                ))}
              </ul>
            </ResultSection>
          ) : null}

          {/* Moods */}
          {results.moods.length > 0 ? (
            <ResultSection title="Moods you have logged" icon={<Smile className="size-4" aria-hidden="true" />}>
              <ul className="space-y-2">
                {results.moods.map((mood) => (
                  <li
                    key={mood.id}
                    className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"
                  >
                    <Badge variant="secondary" className="font-normal">
                      {mood.mood}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatMedium(mood.date)}
                    </span>
                    <Link
                      href={`/log?date=${toISODate(mood.date)}`}
                      className="ml-auto text-xs font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Open that day
                    </Link>
                  </li>
                ))}
              </ul>
            </ResultSection>
          ) : null}

          {/* Notes */}
          {results.logs.length > 0 ? (
            <ResultSection title="Your notes" icon={<NotebookPen className="size-4" aria-hidden="true" />}>
              <ul className="space-y-3">
                {results.logs.map((log) => (
                  <li key={log.id}>
                    <Link
                      href={`/log?date=${toISODate(log.date)}`}
                      className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
                    >
                      <p className="text-xs font-medium text-muted-foreground">
                        {formatMedium(log.date)}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed">{log.snippet}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </ResultSection>
          ) : null}

          {results.logs.length === 0 &&
          results.symptoms.length === 0 &&
          results.moods.length === 0 &&
          scope === "all" ? (
            <p className="flex items-start gap-2 rounded-2xl bg-muted/50 p-4 text-xs leading-relaxed text-muted-foreground">
              <Sparkles className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              Nothing in your personal logs matched. Only your own entries are
              ever searched, and only while you are signed in.
            </p>
          ) : null}
        </div>
      )}
    </>
  );
}

function ResultSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}
