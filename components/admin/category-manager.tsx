"use client";

import { useActionState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/lib/actions/admin-actions";
import { IDLE_STATE } from "@/lib/actions/types";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Category management.
 *
 * Each existing category is an independently editable form, so editing one row
 * cannot accidentally submit changes to another. Deleting is blocked while
 * articles reference the category — the server enforces that, and the button is
 * disabled here so the reason is visible before the attempt rather than after.
 */

export interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  active: boolean;
  articleCount: number;
}

export function CategoryManager({ categories }: { categories: CategoryRecord[] }) {
  const [createState, createAction] = useActionState(createCategoryAction, IDLE_STATE);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="size-4 text-primary" aria-hidden="true" />
            New category
          </CardTitle>
          <CardDescription>
            Categories group articles and drive the education hub filter.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createAction} className="space-y-4">
            <FormMessage state={createState} />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" htmlFor="new-category-name" required error={createState.fieldErrors?.name}>
                <Input
                  id="new-category-name"
                  name="name"
                  type="text"
                  required
                  maxLength={80}
                  placeholder="Menstrual cycle"
                />
              </Field>

              <Field
                label="Slug"
                htmlFor="new-category-slug"
                hint="Leave blank to generate from the name."
              >
                <Input
                  id="new-category-slug"
                  name="slug"
                  type="text"
                  maxLength={80}
                  placeholder="menstrual-cycle"
                />
              </Field>
            </div>

            <Field label="Description" htmlFor="new-category-description" hint="Shown at the top of the category page.">
              <Textarea
                id="new-category-description"
                name="description"
                rows={2}
                maxLength={300}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Sort order" htmlFor="new-category-order" hint="Lower numbers appear first.">
                <Input
                  id="new-category-order"
                  name="sortOrder"
                  type="number"
                  min={0}
                  max={999}
                  defaultValue={categories.length + 1}
                />
              </Field>

              <div className="flex items-end gap-3 pb-2.5">
                <Checkbox id="new-category-active" name="active" defaultChecked />
                <Label htmlFor="new-category-active" className="font-normal">
                  Active
                </Label>
              </div>
            </div>

            <SubmitButton pendingLabel="Creating…">
              <Plus aria-hidden="true" />
              Create category
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing categories</CardTitle>
          <CardDescription>{categories.length} in total.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {categories.map((category) => (
              <CategoryRow key={category.id} category={category} />
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function CategoryRow({ category }: { category: CategoryRecord }) {
  const [updateState, updateAction] = useActionState(updateCategoryAction, IDLE_STATE);
  const [deleteState, deleteAction] = useActionState(deleteCategoryAction, IDLE_STATE);

  return (
    <li className="rounded-2xl border border-border bg-card p-4">
      <form action={updateAction} className="space-y-3">
        <FormMessage state={updateState} />
        <FormMessage state={deleteState} />

        <input type="hidden" name="id" value={category.id} />

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{category.name}</span>
          <Badge variant="outline" className="font-normal">
            {category.articleCount} article{category.articleCount === 1 ? "" : "s"}
          </Badge>
          <Badge variant={category.active ? "success" : "outline"} className="font-normal">
            {category.active ? "Active" : "Hidden"}
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Name" htmlFor={`name-${category.id}`} required>
            <Input
              id={`name-${category.id}`}
              name="name"
              type="text"
              required
              maxLength={80}
              defaultValue={category.name}
            />
          </Field>

          <Field label="Slug" htmlFor={`slug-${category.id}`}>
            <Input
              id={`slug-${category.id}`}
              name="slug"
              type="text"
              maxLength={80}
              defaultValue={category.slug}
            />
          </Field>

          <Field label="Sort order" htmlFor={`order-${category.id}`}>
            <Input
              id={`order-${category.id}`}
              name="sortOrder"
              type="number"
              min={0}
              max={999}
              defaultValue={category.sortOrder}
            />
          </Field>
        </div>

        <Field label="Description" htmlFor={`description-${category.id}`}>
          <Textarea
            id={`description-${category.id}`}
            name="description"
            rows={2}
            maxLength={300}
            defaultValue={category.description ?? ""}
          />
        </Field>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id={`active-${category.id}`}
              name="active"
              defaultChecked={category.active}
            />
            <Label htmlFor={`active-${category.id}`} className="font-normal">
              Active
            </Label>
          </div>

          <SubmitButton size="sm" variant="soft" pendingLabel="Saving…">
            <Save aria-hidden="true" />
            Save
          </SubmitButton>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10"
            disabled={category.articleCount > 0}
            title={
              category.articleCount > 0
                ? "Move or delete this category's articles first"
                : "Delete this category"
            }
            onClick={() => {
              if (confirm(`Delete the category "${category.name}"?`)) {
                const data = new FormData();
                data.set("id", category.id);
                deleteAction(data);
              }
            }}
          >
            <Trash2 aria-hidden="true" />
            Delete
          </Button>
        </div>
      </form>
    </li>
  );
}
