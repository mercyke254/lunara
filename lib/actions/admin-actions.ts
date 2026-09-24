"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { slugify } from "@/lib/utils";
import { adminArticleSchema, adminCategorySchema } from "@/lib/validation/schemas";
import {
  errorState,
  successState,
  withErrorHandling,
  type ActionState,
} from "@/lib/actions/types";

/**
 * Administration actions.
 *
 * AUTHORISATION: every function re-derives the caller from the session and
 * checks `role === "ADMIN"` before doing anything. The admin layout also guards
 * the UI, but that is presentation — these checks are the actual boundary, and
 * they are repeated per action so a route-level mistake cannot become a
 * privilege escalation.
 *
 * PRIVACY BOUNDARY: nothing in this module reads or writes user health data.
 * Article and category management is the only capability here, and the statistics
 * on the admin dashboard are anonymous counts. There is deliberately no
 * "view user logs" function to call.
 */

async function requireAdminOrFail(): Promise<
  { ok: true; userId: string } | { ok: false; state: ActionState }
> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, state: errorState("Your session has expired. Please sign in again.") };
  }
  if (user.role !== "ADMIN") {
    // Generic message: an unauthorised caller learns nothing about the admin area.
    return { ok: false, state: errorState("You do not have permission to do that.") };
  }
  return { ok: true, userId: user.id };
}

function revalidateContent() {
  revalidatePath("/admin");
  revalidatePath("/admin/articles");
  revalidatePath("/admin/categories");
  revalidatePath("/education");
}

// ---------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------

export async function createArticleAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("create-article", async () => {
    const auth = await requireAdminOrFail();
    if (!auth.ok) return auth.state;

    const parsed = adminArticleSchema.safeParse({
      title: String(formData.get("title") ?? ""),
      slug: String(formData.get("slug") ?? "") || undefined,
      categoryId: String(formData.get("categoryId") ?? ""),
      excerpt: String(formData.get("excerpt") ?? ""),
      content: String(formData.get("content") ?? ""),
      readingTime: String(formData.get("readingTime") ?? "5"),
      tags: String(formData.get("tags") ?? "") || undefined,
      published: formData.get("published") === "on",
    });

    if (!parsed.success) {
      return errorState(
        "Please check the highlighted fields.",
        Object.fromEntries(
          parsed.error.issues.map((issue) => [issue.path.join(".") || "form", issue.message]),
        ),
      );
    }

    const slug = parsed.data.slug ? slugify(parsed.data.slug) : slugify(parsed.data.title);

    const existing = await prisma.article.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (existing) {
      return errorState("An article already uses that slug.", {
        slug: "This slug is taken. Choose another.",
      });
    }

    const category = await prisma.articleCategory.findUnique({
      where: { id: parsed.data.categoryId },
      select: { id: true },
    });
    if (!category) {
      return errorState("Choose a valid category.", { categoryId: "Unknown category." });
    }

    // Note on auditing: AuditEventType covers sensitive ACCOUNT actions
    // (logins, credential changes, recovery, deletion). Content edits are not in
    // that enum, and reusing an unrelated value would corrupt the audit trail's
    // meaning. Article changes carry `createdAt`/`updatedAt`/`authorId` on the
    // row itself, which is the appropriate record for editorial changes.
    const article = await prisma.article.create({
      data: {
        title: parsed.data.title,
        slug,
        categoryId: parsed.data.categoryId,
        excerpt: parsed.data.excerpt,
        content: parsed.data.content,
        readingTime: parsed.data.readingTime,
        tags: parsed.data.tags,
        published: parsed.data.published,
        publishedAt: parsed.data.published ? new Date() : null,
        authorId: auth.userId,
      },
      select: { id: true },
    });

    revalidateContent();
    redirect(`/admin/articles/${article.id}?created=1`);
  });
}

export async function updateArticleAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("update-article", async () => {
    const auth = await requireAdminOrFail();
    if (!auth.ok) return auth.state;

    const id = String(formData.get("id") ?? "").trim();
    if (!id) return errorState("That article could not be found.");

    const parsed = adminArticleSchema.safeParse({
      title: String(formData.get("title") ?? ""),
      slug: String(formData.get("slug") ?? "") || undefined,
      categoryId: String(formData.get("categoryId") ?? ""),
      excerpt: String(formData.get("excerpt") ?? ""),
      content: String(formData.get("content") ?? ""),
      readingTime: String(formData.get("readingTime") ?? "5"),
      tags: String(formData.get("tags") ?? "") || undefined,
      published: formData.get("published") === "on",
    });

    if (!parsed.success) {
      return errorState(
        "Please check the highlighted fields.",
        Object.fromEntries(
          parsed.error.issues.map((issue) => [issue.path.join(".") || "form", issue.message]),
        ),
      );
    }

    const current = await prisma.article.findUnique({
      where: { id },
      select: { published: true, publishedAt: true, slug: true },
    });
    if (!current) return errorState("That article could not be found.");

    const slug = parsed.data.slug ? slugify(parsed.data.slug) : current.slug;

    // Only set publishedAt the first time it becomes published, so the
    // "updated" date does not overwrite the original publication date.
    const publishedAt = parsed.data.published
      ? (current.publishedAt ?? new Date())
      : null;

    await prisma.article.update({
      where: { id },
      data: {
        title: parsed.data.title,
        slug,
        categoryId: parsed.data.categoryId,
        excerpt: parsed.data.excerpt,
        content: parsed.data.content,
        readingTime: parsed.data.readingTime,
        tags: parsed.data.tags,
        published: parsed.data.published,
        publishedAt,
      },
    });

    revalidateContent();
    return successState("Article saved.");
  });
}

export async function deleteArticleAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("delete-article", async () => {
    const auth = await requireAdminOrFail();
    if (!auth.ok) return auth.state;

    const id = String(formData.get("id") ?? "").trim();
    if (!id) return errorState("That article could not be found.");

    const result = await prisma.article.deleteMany({ where: { id } });
    if (result.count === 0) return errorState("That article could not be found.");

    revalidateContent();
    return successState("Article deleted.");
  });
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function createCategoryAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("create-category", async () => {
    const auth = await requireAdminOrFail();
    if (!auth.ok) return auth.state;

    const parsed = adminCategorySchema.safeParse({
      name: String(formData.get("name") ?? ""),
      slug: String(formData.get("slug") ?? "") || undefined,
      description: String(formData.get("description") ?? "") || undefined,
      sortOrder: String(formData.get("sortOrder") ?? "0"),
      active: formData.get("active") === "on",
    });

    if (!parsed.success) {
      return errorState(
        "Please check the highlighted fields.",
        Object.fromEntries(
          parsed.error.issues.map((issue) => [issue.path.join(".") || "form", issue.message]),
        ),
      );
    }

    const slug = parsed.data.slug ? slugify(parsed.data.slug) : slugify(parsed.data.name);

    const clash = await prisma.articleCategory.findFirst({
      where: { OR: [{ slug }, { name: parsed.data.name }] },
      select: { id: true },
    });
    if (clash) {
      return errorState("A category with that name or slug already exists.", {
        name: "Already in use.",
      });
    }

    await prisma.articleCategory.create({
      data: {
        name: parsed.data.name,
        slug,
        description: parsed.data.description ?? null,
        sortOrder: parsed.data.sortOrder,
        active: parsed.data.active,
      },
    });

    revalidateContent();
    return successState("Category created.");
  });
}

export async function updateCategoryAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("update-category", async () => {
    const auth = await requireAdminOrFail();
    if (!auth.ok) return auth.state;

    const id = String(formData.get("id") ?? "").trim();
    if (!id) return errorState("That category could not be found.");

    const parsed = adminCategorySchema.safeParse({
      name: String(formData.get("name") ?? ""),
      slug: String(formData.get("slug") ?? "") || undefined,
      description: String(formData.get("description") ?? "") || undefined,
      sortOrder: String(formData.get("sortOrder") ?? "0"),
      active: formData.get("active") === "on",
    });

    if (!parsed.success) {
      return errorState(
        "Please check the highlighted fields.",
        Object.fromEntries(
          parsed.error.issues.map((issue) => [issue.path.join(".") || "form", issue.message]),
        ),
      );
    }

    await prisma.articleCategory.update({
      where: { id },
      data: {
        name: parsed.data.name,
        ...(parsed.data.slug ? { slug: slugify(parsed.data.slug) } : {}),
        description: parsed.data.description ?? null,
        sortOrder: parsed.data.sortOrder,
        active: parsed.data.active,
      },
    });

    revalidateContent();
    return successState("Category saved.");
  });
}

/**
 * Delete a category.
 *
 * Refuses while articles still reference it. The schema uses
 * `onDelete: Restrict`, so a naive delete would raise an opaque foreign-key
 * error; checking first lets us return a message a human can act on.
 */
export async function deleteCategoryAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("delete-category", async () => {
    const auth = await requireAdminOrFail();
    if (!auth.ok) return auth.state;

    const id = String(formData.get("id") ?? "").trim();
    if (!id) return errorState("That category could not be found.");

    const articleCount = await prisma.article.count({ where: { categoryId: id } });
    if (articleCount > 0) {
      return errorState(
        `That category still has ${articleCount} article${articleCount === 1 ? "" : "s"}. Move or delete them first.`,
      );
    }

    const result = await prisma.articleCategory.deleteMany({ where: { id } });
    if (result.count === 0) return errorState("That category could not be found.");

    revalidateContent();
    return successState("Category deleted.");
  });
}

/** Publish or unpublish an article from the list view. */
export async function toggleArticlePublishedAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withErrorHandling("toggle-article-published", async () => {
    const auth = await requireAdminOrFail();
    if (!auth.ok) return auth.state;

    const id = String(formData.get("id") ?? "").trim();
    const publish = formData.get("publish") === "on";
    if (!id) return errorState("That article could not be found.");

    const existing = await prisma.article.findUnique({
      where: { id },
      select: { publishedAt: true },
    });
    if (!existing) return errorState("That article could not be found.");

    await prisma.article.update({
      where: { id },
      data: {
        published: publish,
        publishedAt: publish ? (existing.publishedAt ?? new Date()) : null,
      },
    });

    revalidateContent();
    return successState(publish ? "Article published." : "Article unpublished.");
  });
}

/**
 * Form-handler wrapper around `toggleArticlePublishedAction`.
 *
 * `<form action={...}>` passes only FormData, so the `useActionState` signature
 * cannot be used directly in the articles table. This adapter supplies the
 * initial state; the message is discarded because the table is server-rendered.
 */
export async function toggleArticlePublishedFormAction(
  formData: FormData,
): Promise<void> {
  await toggleArticlePublishedAction({ status: "idle" }, formData);
}


