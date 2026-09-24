import Link from "next/link";
import { BookOpen, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { prisma } from "@/lib/db/prisma";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Education hub index.
 *
 * Filtering is done with a query parameter and a server render rather than
 * client state: the list is small, every category is linkable and shareable, and
 * the page works without JavaScript.
 */
export default async function EducationIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;

  const [categories, articles] = await Promise.all([
    prisma.articleCategory.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true, description: true, _count: { select: { articles: true } } },
    }),
    prisma.article.findMany({
      where: {
        published: true,
        ...(params.category ? { category: { slug: params.category } } : {}),
      },
      orderBy: [{ publishedAt: "desc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        readingTime: true,
        category: { select: { name: true, slug: true } },
      },
    }),
  ]);

  const activeCategory = params.category
    ? categories.find((category) => category.slug === params.category)
    : null;

  return (
    <div className="space-y-8">
      <div>
        <Badge variant="outline" className="mb-4 gap-1.5">
          <BookOpen className="size-3.5" aria-hidden="true" />
          Education hub
        </Badge>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {activeCategory ? activeCategory.name : "Understand what your body is doing"}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
          {activeCategory?.description ??
            "Clear, plain-language articles about the menstrual cycle, symptoms, fertility, pregnancy, and everyday wellbeing. Written to inform, not to diagnose."}
        </p>
      </div>

      {/* ---- Category filter -------------------------------------------- */}
      <nav aria-label="Article categories" className="flex flex-wrap gap-2">
        <Link
          href="/education"
          aria-current={!params.category ? "page" : undefined}
          className={cn(
            "rounded-full border px-3.5 py-2 text-sm transition-colors",
            !params.category
              ? "border-primary bg-primary-soft font-medium text-primary"
              : "border-input text-muted-foreground hover:border-primary/40 hover:text-foreground",
          )}
        >
          All topics
        </Link>

        {categories.map((category) => {
          const active = params.category === category.slug;
          return (
            <Link
              key={category.id}
              href={`/education?category=${category.slug}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-full border px-3.5 py-2 text-sm transition-colors",
                active
                  ? "border-primary bg-primary-soft font-medium text-primary"
                  : "border-input text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {category.name}
              <span className="ml-1.5 text-xs opacity-60">
                {category._count.articles}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* ---- Articles ---------------------------------------------------- */}
      {articles.length === 0 ? (
        <EmptyState
          icon={<BookOpen />}
          title="No articles here yet"
          description={
            params.category
              ? "This category has no published articles at the moment. Try another topic."
              : "Articles have not been published yet. Run the seed script to load the starter library."
          }
          action={
            params.category ? (
              <Link
                href="/education"
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                View all topics
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <article key={article.id} className="h-full">
              <Card className="h-full transition-shadow hover:shadow-lift">
                <CardHeader>
                  <Link
                    href={`/education/${article.slug}`}
                    className="font-display text-base font-semibold leading-snug underline-offset-4 hover:underline"
                  >
                    {article.title}
                  </Link>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Badge variant="secondary" className="font-normal">
                      {article.category.name}
                    </Badge>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" aria-hidden="true" />
                      {article.readingTime} min read
                    </span>
                  </div>
                  <CardDescription className="pt-2">{article.excerpt}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link
                    href={`/education/${article.slug}`}
                    className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Read article
                  </Link>
                </CardContent>
              </Card>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
