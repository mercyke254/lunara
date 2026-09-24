import type { Metadata } from "next";
import Link from "next/link";
import { Eye, EyeOff, FileText, Pencil, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/db/prisma";
import { toggleArticlePublishedFormAction } from "@/lib/actions/admin-actions";
import { formatMedium } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Articles",
};

export const dynamic = "force-dynamic";

export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;

  const statusFilter =
    params.status === "published" ? true : params.status === "draft" ? false : undefined;

  const articles = await prisma.article.findMany({
    where: statusFilter === undefined ? {} : { published: statusFilter },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      readingTime: true,
      published: true,
      publishedAt: true,
      updatedAt: true,
      category: { select: { name: true } },
    },
  });

  const filters = [
    { value: undefined, label: "All" },
    { value: "published", label: "Published" },
    { value: "draft", label: "Drafts" },
  ] as const;

  return (
    <>
      <PageHeader
        title="Articles"
        description="Create, edit, publish, and remove education hub content."
        actions={
          <Button asChild size="sm">
            <Link href="/admin/articles/new">
              <Plus aria-hidden="true" />
              New article
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => {
          const active = params.status === filter.value;
          return (
            <Link
              key={filter.label}
              href={filter.value ? `/admin/articles?status=${filter.value}` : "/admin/articles"}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "rounded-full border border-primary bg-primary-soft px-3.5 py-2 text-sm font-medium text-primary"
                  : "rounded-full border border-input px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              }
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      {articles.length === 0 ? (
        <EmptyState
          icon={<FileText />}
          title="No articles here"
          description="Create the first article, or run the seed script to load the starter library."
          action={
            <Button asChild>
              <Link href="/admin/articles/new">
                <Plus aria-hidden="true" />
                New article
              </Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {articles.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell>
                      <Link
                        href={`/admin/articles/${article.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {article.title}
                      </Link>
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        /{article.slug}
                      </p>
                    </TableCell>

                    <TableCell className="text-sm text-muted-foreground">
                      {article.category.name}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={article.published ? "success" : "warning"}
                        className="font-normal"
                      >
                        {article.published ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>

                    <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                      {formatMedium(article.updatedAt)}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/admin/articles/${article.id}`}>
                            <Pencil aria-hidden="true" />
                            <span className="sr-only">Edit {article.title}</span>
                          </Link>
                        </Button>

                        <form action={toggleArticlePublishedFormAction}>
                          <input type="hidden" name="id" value={article.id} />
                          <input
                            type="hidden"
                            name="publish"
                            value={article.published ? "false" : "on"}
                          />
                          <Button type="submit" variant="ghost" size="sm">
                            {article.published ? (
                              <EyeOff aria-hidden="true" />
                            ) : (
                              <Eye aria-hidden="true" />
                            )}
                            <span className="sr-only">
                              {article.published ? "Unpublish" : "Publish"} {article.title}
                            </span>
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
