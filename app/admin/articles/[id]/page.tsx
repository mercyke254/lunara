import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ArticleForm } from "@/components/admin/article-form";
import { DeleteArticleForm } from "@/components/admin/delete-article-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Edit article",
};

export const dynamic = "force-dynamic";

export default async function EditArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);

  const [article, categories] = await Promise.all([
    prisma.article.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        slug: true,
        categoryId: true,
        excerpt: true,
        content: true,
        readingTime: true,
        tags: true,
        published: true,
      },
    }),
    prisma.articleCategory.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, active: true },
    }),
  ]);

  if (!article) notFound();

  return (
    <>
      <Link
        href="/admin/articles"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to articles
      </Link>

      <PageHeader
        title="Edit article"
        description={article.published ? "This article is live." : "This article is a draft."}
        actions={
          article.published ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/education/${article.slug}`} target="_blank">
                <ExternalLink aria-hidden="true" />
                View live
              </Link>
            </Button>
          ) : null
        }
      />

      {query.created === "1" ? (
        <Alert variant="success">
          <AlertDescription>
            Article created. It is {article.published ? "published" : "saved as a draft"}.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardContent className="pt-6">
          <ArticleForm
            categories={categories.filter((category) => category.active || category.id === article.categoryId)}
            article={{
              id: article.id,
              title: article.title,
              slug: article.slug,
              categoryId: article.categoryId,
              excerpt: article.excerpt,
              content: article.content,
              readingTime: article.readingTime,
              tags: article.tags,
              published: article.published,
            }}
          />
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardContent className="pt-6">
          <DeleteArticleForm id={article.id} title={article.title} />
        </CardContent>
      </Card>
    </>
  );
}
