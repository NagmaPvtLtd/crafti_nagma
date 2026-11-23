"use client";

import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import getAxiosErrorMessage from "../../../../utils/Auth/Auth.axiosErrorHelper.util";
import PageWrapper from "../../utils/PageWrapper";
import ErrorState from "../../utils/ErrorState";
import CustomLoader from "../../CustomLoader";
import ConfirmDialog from "../../utils/ConfirmDialog";
import { SectionDivider, SectionEyebrow } from "../../utils/SectionDiv";
import { inputClass } from "../../utils/Form/fieldStyles";
import type {
  TagListItem,
  TagListResponse,
} from "../../../../utils/zod/product/manager.tag.zod";

const BASE = "/api/manager/product-studio/tags";

export default function GlobalTagsClient() {
  const [tags, setTags] = useState<TagListItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const [editing, setEditing] = useState<TagListItem | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<TagListItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get<TagListResponse>(BASE, {
        params: { search: search || undefined },
        withCredentials: true,
      });
      setTags(res.data.tags);
    } catch (err) {
      setError(getAxiosErrorMessage(err, "Could not load the tags"));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const run = () => {
      void load();
    };
    run();
  }, [load]);

  async function createTag(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name || creating) return;

    setCreating(true);
    try {
      await axios.post(BASE, { name }, { withCredentials: true });
      setNewName("");
      toast.success("Tag saved");
      await load();
    } catch (err) {
      toast.error(getAxiosErrorMessage(err, "Could not create the tag"));
    } finally {
      setCreating(false);
    }
  }

  async function renameTag() {
    if (!editing || saving) return;
    const name = editName.trim();
    if (!name) return;

    setSaving(true);
    try {
      await axios.put(
        `${BASE}/${editing.id}`,
        { name },
        { withCredentials: true },
      );
      toast.success("Tag renamed");
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(getAxiosErrorMessage(err, "Could not rename the tag"));
    } finally {
      setSaving(false);
    }
  }

  async function deleteTag() {
    if (!deleting || saving) return;
    setSaving(true);
    setDeleteError(null);
    try {
      await axios.delete(`${BASE}/${deleting.id}`, { withCredentials: true });
      toast.success("Tag deleted");
      setDeleting(null);
      await load();
    } catch (err) {
      const message = getAxiosErrorMessage(err, "Could not delete the tag");
      setDeleteError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  const totalUsage = (tags ?? []).reduce(
    (sum, tag) => sum + tag.usage.totalUsage,
    0,
  );

  return (
    <PageWrapper variant="content" position="fixed">
      <div className="mx-auto w-full max-w-7xl px-4 pt-6 pb-12 sm:px-6 sm:pt-10 sm:pb-16">
        <SectionEyebrow href="/manager/product-studio">
          PRODUCT STUDIO
        </SectionEyebrow>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
          Global Tags
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">
          One tag master for the whole catalogue — rename a tag here and every
          product, variant and search result follows.
        </p>

        <SectionDivider className="my-6" size={11} />

        <div className="flex flex-col gap-3 rounded-2xl border border-white/60 bg-white/85 p-4 backdrop-blur-sm sm:flex-row sm:items-center sm:rounded-3xl sm:p-5">
          <form onSubmit={createTag} className="flex flex-1 gap-2">
            <div className="relative flex-1">
              <Tag className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Create a tag — e.g. Mobile Accessory"
                maxLength={100}
                className={`${inputClass(false)} pl-9`}
              />
            </div>
            <button
              type="submit"
              disabled={!newName.trim() || creating}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Add tag
            </button>
          </form>

          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search tags"
              aria-label="Search tags"
              className={`${inputClass(false)} pr-8 pl-9`}
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                aria-label="Clear search"
                className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer rounded-full p-0.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <button
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-rose-200/70 bg-white px-3 py-2 text-xs font-semibold text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-stone-500">
          <span>
            {(tags ?? []).length} tag{(tags ?? []).length === 1 ? "" : "s"}
            {search ? ` matching “${search}”` : ""} · {totalUsage} total use
            {totalUsage === 1 ? "" : "s"}
          </span>
          <span>Unused tags can be deleted; in-use tags are protected.</span>
        </div>

        <div className="mt-3">
          {loading && !tags ? (
            <CustomLoader fullScreen={false} label="Loading the tag master…" />
          ) : error ? (
            <ErrorState
              title="Couldn't load the tags"
              message={error}
              onRetry={() => void load()}
            />
          ) : (tags ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-rose-200 bg-white/70 px-6 py-12 text-center backdrop-blur-sm sm:rounded-3xl">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-500">
                <Tag className="h-5 w-5" />
              </div>
              <h2 className="mt-3 text-sm font-semibold text-stone-900">
                {search ? "No tags match that search" : "No tags yet"}
              </h2>
              <p className="mt-1 max-w-sm text-xs text-stone-600">
                {search
                  ? "Try another word, or clear the search."
                  : "Create one above, or add tags while editing a product."}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {(tags ?? []).map((tag) => (
                <li
                  key={tag.id}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/60 bg-white/85 px-4 py-3 backdrop-blur-sm sm:rounded-3xl"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-stone-900">
                      {tag.name}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-stone-400">
                      {tag.slug}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 font-medium text-stone-600">
                      {tag.usage.productCount} product
                      {tag.usage.productCount === 1 ? "" : "s"}
                    </span>
                    <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 font-medium text-stone-600">
                      {tag.usage.variantCount} variant
                      {tag.usage.variantCount === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(tag);
                        setEditName(tag.name);
                      }}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-stone-600 transition-colors hover:border-rose-200 hover:text-rose-600"
                    >
                      <Pencil className="h-3 w-3" />
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleting(tag);
                      }}
                      disabled={tag.usage.totalUsage > 0}
                      title={
                        tag.usage.totalUsage > 0
                          ? "In use — remove it from products and variants first"
                          : "Delete this unused tag"
                      }
                      className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-rose-200/70 bg-rose-50/60 px-2.5 py-1 text-[10px] font-semibold text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <button
              type="button"
              aria-label="Close"
              onClick={() => setEditing(null)}
              className="absolute inset-0 cursor-default bg-white/80"
            />
            <div className="relative w-full max-w-md rounded-2xl border border-white/70 bg-white p-5 shadow-xl shadow-rose-100/60 sm:rounded-3xl">
              <h2 className="text-base font-semibold text-stone-900">
                Rename tag
              </h2>
              <p className="mt-1 text-xs text-stone-500">
                Every product and variant using this tag shows the new name
                immediately. Its URL slug is regenerated; no mapping is rebuilt.
              </p>

              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={100}
                autoFocus
                className={`${inputClass(false)} mt-3`}
              />

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="cursor-pointer rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void renameTag()}
                  disabled={!editName.trim() || saving}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-stone-900 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  Save name
                </button>
              </div>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={deleting !== null}
          title={`Delete “${deleting?.name ?? ""}”?`}
          description={
            <span>
              This tag is unused, so nothing on the website will change.
              Deleting is permanent.
              {deleteError && (
                <span className="mt-2 flex items-start gap-1.5 text-rose-600">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {deleteError}
                </span>
              )}
            </span>
          }
          confirmLabel="Delete tag"
          loading={saving}
          onConfirm={() => void deleteTag()}
          onClose={() => setDeleting(null)}
        />
      </div>
    </PageWrapper>
  );
}
