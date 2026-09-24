"use client";

import { useActionState, useState } from "react";
import { Save } from "lucide-react";
import { createArticleAction, updateArticleAction } from "@/lib/actions/admin-actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Field } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect } from "@/components/ui/native-select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArticleContent } from "@/components/education/article-content";
import { Button } from "@/components/ui/button";

/**
 * Article editor.
 *
 * Includes a live preview rendered with the SAME component the reader page uses.
 * That matters because article bodies use a small custom markup: previewing with
 * a different renderer would let an author publish something that looks correct
 * in the editor and wrong on the site.
 */

export interface CategoryOption {
  id: string;
  name: string;
}

export function ArticleForm({
  categories,
  article,
}: {
  categories: CategoryOption[];
  article?: {
    id: string;
    title: string;
    slug: string;
    categoryId: string;
    excerpt: string;
    content: string;
    readingTime: number;
    tags: string[];
    published: boolean;
  };
}) {
  const isEdit = Boolean(article);
  const action = isEdit ? updateArticleAction : createArticleAction;
  const [state, formAction] = useActionState(action, IDLE_STATE);

  const [content, setContent] = useState(article?.content ?? "");
  const [showPreview, setShowPreview] = useState(false);

  return (
    <form action={formAction} className="space-y-5">
      <FormMessage state={state} />

      {isEdit ? <input type="hidden" name="id" value={article?.id} /> : null}

      <Field label="Title" htmlFor="article-title" required error={state.fieldErrors?.title}>
        <Input
          id="article-title"
          name="title"
          type="text"
          required
          maxLength={160}
          defaultValue={article?.title ?? ""}
          aria-invalid={Boolean(state.fieldErrors?.title) || undefined}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Slug"
          htmlFor="article-slug"
          hint="Leave blank to generate it from the title."
          error={state.fieldErrors?.slug}
        >
          <Input
            id="article-slug"
            name="slug"
            type="text"
            maxLength={80}
            defaultValue={article?.slug ?? ""}
            placeholder="lowercase-with-hyphens"
            aria-invalid={Boolean(state.fieldErrors?.slug) || undefined}
          />
        </Field>

        <div className="space-y-1.5">
          <Label htmlFor="article-category">Category</Label>
          <NativeSelect
            id="article-category"
            name="categoryId"
            required
            defaultValue={article?.categoryId ?? ""}
          >
            <option value="" disabled>
              Choose a category…
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </NativeSelect>
          {state.fieldErrors?.categoryId ? (
            <p role="alert" className="text-xs font-medium text-destructive">
              {state.fieldErrors.categoryId}
            </p>
          ) : null}
        </div>
      </div>

      <Field
        label="Excerpt"
        htmlFor="article-excerpt"
        required
        hint="One or two sentences shown in listings and search results."
        error={state.fieldErrors?.excerpt}
      >
        <Textarea
          id="article-excerpt"
          name="excerpt"
          required
          rows={2}
          maxLength={400}
          defaultValue={article?.excerpt ?? ""}
          aria-invalid={Boolean(state.fieldErrors?.excerpt) || undefined}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Reading time"
          htmlFor="article-reading-time"
          hint="minutes"
          error={state.fieldErrors?.readingTime}
        >
          <Input
            id="article-reading-time"
            name="readingTime"
            type="number"
            min={1}
            max={60}
            required
            defaultValue={article?.readingTime ?? 5}
          />
        </Field>

        <Field
          label="Tags"
          htmlFor="article-tags"
          hint="Comma-separated. Used by search."
        >
          <Input
            id="article-tags"
            name="tags"
            type="text"
            maxLength={300}
            defaultValue={article?.tags.join(", ") ?? ""}
            placeholder="cycle, pms, nutrition"
          />
        </Field>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="article-content">Content</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview((value) => !value)}
          >
            {showPreview ? "Hide preview" : "Show preview"}
          </Button>
        </div>

        <Textarea
          id="article-content"
          name="content"
          required
          rows={18}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className="font-mono text-xs leading-relaxed"
          aria-invalid={Boolean(state.fieldErrors?.content) || undefined}
        />
        {state.fieldErrors?.content ? (
          <p role="alert" className="text-xs font-medium text-destructive">
            {state.fieldErrors.content}
          </p>
        ) : null}

        <Alert variant="info">
          <AlertTitle>Formatting</AlertTitle>
          <AlertDescription>
            Blank line between blocks. <code>## Heading</code> for a section,{" "}
            <code>- item</code> for a bullet list, <code>1. item</code> for a
            numbered list, <code>&gt; text</code> for a quote, and{" "}
            <code>! text</code> for a highlighted callout. No HTML is rendered.
          </AlertDescription>
        </Alert>
      </div>

      {showPreview ? (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Preview
          </p>
          {content.trim().length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
          ) : (
            <ArticleContent content={content} />
          )}
        </div>
      ) : null}

      <div className="flex items-start gap-3 border-t border-border pt-5">
        <Checkbox
          id="article-published"
          name="published"
          defaultChecked={article?.published ?? false}
          className="mt-0.5"
        />
        <Label htmlFor="article-published" className="items-start font-normal">
          <span>
            <span className="block text-sm font-medium">Published</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Unpublished articles are only visible in the admin area.
            </span>
          </span>
        </Label>
      </div>

      <SubmitButton pendingLabel="Saving…">
        <Save aria-hidden="true" />
        {isEdit ? "Save article" : "Create article"}
      </SubmitButton>
    </form>
  );
}
