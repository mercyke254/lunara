import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ArticleForm } from "@/components/admin/article-form";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { FolderOpen } from "lucide-react";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "New article",
};

export const dynamic = "force-dynamic";

export default async function NewArticlePage() {
  const categories = await prisma.articleCategory.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });

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
        title="New article"
        description="Write in plain language and avoid clinical claims. Articles inform; they do not diagnose."
      />

      {categories.length === 0 ? (
        <EmptyState
          icon={<FolderOpen />}
          title="Create a category first"
          description="Every article belongs to a category, and none exist yet."
          action={
            <Button asChild>
              <Link href="/admin/categories">Manage categories</Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <ArticleForm categories={categories} />
          </CardContent>
        </Card>
      )}
    </>
  );
}
