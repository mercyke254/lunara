import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { ArticleContent } from "@/components/education/article-content";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DisclaimerNote } from "@/components/shared/disclaimer-note";
import { prisma } from "@/lib/db/prisma";
import { formatMedium } from "@/lib/dates";

export const dynamic = "force-dynamic";

/**
 * Article detail.
 *
 * Related articles are chosen from the same category and fall back to the most
 * recent other articles, so a single-article category still offers somewhere to
 * go next rather than a dead end.
 */
export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const article = await prisma.article.findFirst({
    where: { slug, published: true },
    select: {
      id: true,
      title: true,
      excerpt: true,
      content: true,
      readingTime: true,
      tags: true,
      publishedAt: true,
      categoryId: true,
      category: { select: { name: true, slug: true } },
    },
  });

  if (!article) notFound();

  const [sameCategory, fallback] = await Promise.all([
    prisma.article.findMany({
      where: {
        published: true,
        categoryId: article.categoryId,
        id: { not: article.id },
      },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: { id: true, title: true, slug: true, readingTime: true },
    }),
    prisma.article.findMany({
      where: {
        published: true,
        id: { not: article.id },
        categoryId: { not: article.categoryId },
      },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: { id: true, title: true, slug: true, readingTime: true },
    }),
  ]);

  const related = sameCategory.length > 0 ? sameCategory : fallback;

  return (
    <div className="space-y-8">
      <Link
        href={`/education?category=${article.category.slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {article.category.name}
      </Link>

      <article className="space-y-6">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="font-normal">
              {article.category.name}
            </Badge>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3" aria-hidden="true" />
              {article.readingTime} min read
            </span>
            {article.publishedAt ? (
              <span className="text-xs text-muted-foreground">
                Updated {formatMedium(article.publishedAt)}
              </span>
            ) : null}
          </div>

          <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {article.title}
          </h1>

          <p className="text-base leading-relaxed text-muted-foreground">
            {article.excerpt}
          </p>
        </header>

        <ArticleContent content={article.content} className="max-w-2xl" />

        {article.tags.length > 0 ? (
          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            {article.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="font-normal">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </article>

      <DisclaimerNote kind="SYMPTOMS" className="max-w-2xl" />

      {related.length > 0 ? (
        <section className="space-y-4 border-t border-border pt-8">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            Related reading
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {related.map((item) => (
              <Card key={item.id} className="transition-shadow hover:shadow-lift">
                <CardHeader>
                  <CardTitle className="text-sm leading-snug">
                    <Link
                      href={`/education/${item.slug}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {item.title}
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" aria-hidden="true" />
                    {item.readingTime} min read
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
