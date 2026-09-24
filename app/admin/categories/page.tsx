import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { CategoryManager } from "@/components/admin/category-manager";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Categories",
};

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const categories = await prisma.articleCategory.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      sortOrder: true,
      active: true,
      _count: { select: { articles: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Categories"
        description="Categories organise the education hub and are what readers filter by. Deactivating a category hides it without losing its articles."
      />

      <CategoryManager
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          sortOrder: category.sortOrder,
          active: category.active,
          articleCount: category._count.articles,
        }))}
      />
    </>
  );
}
