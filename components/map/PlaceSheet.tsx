"use client";

import {
  Authenticated,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import {
  Camera,
  Heart,
  MessageCircle,
  Navigation,
  Pencil,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { PublicPlace } from "@/lib/filter-places";
import { LANGS, LANG_LABELS, type Lang } from "@/lib/langs";

type Sheet = "preview" | "comments" | "edit" | "photo";

type Props = {
  place: PublicPlace;
  saved: boolean;
  onClose: () => void;
  onToggleSave: () => void;
};

export function PlaceSheet({ place, saved, onClose, onToggleSave }: Props) {
  const [sheet, setSheet] = useState<Sheet>("preview");
  const comments = useQuery(api.comments.listApprovedForPlace, {
    placeId: place._id as Id<"places">,
  });
  const photos = useQuery(api.photos.listApprovedForPlace, {
    placeId: place._id as Id<"places">,
  });
  const submitComment = useMutation(api.comments.submit);
  const suggestCopy = useMutation(api.places.suggestCopyChange);
  const generateUploadUrl = useMutation(api.photos.generateUploadUrl);
  const submitPhoto = useMutation(api.photos.submit);

  const [commentDraft, setCommentDraft] = useState("");
  const [commentLang, setCommentLang] = useState<Lang>("en");
  const [editDraft, setEditDraft] = useState("");
  const [editLang, setEditLang] = useState<Lang>("en");
  const [editSent, setEditSent] = useState(false);
  const [photoSent, setPhotoSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function postComment() {
    const body = commentDraft.trim();
    if (!body) return;
    setBusy(true);
    setStatus(null);
    try {
      await submitComment({
        placeId: place._id as Id<"places">,
        body,
        language: commentLang,
      });
      setCommentDraft("");
      setStatus("Comment sent for review.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not post");
    } finally {
      setBusy(false);
    }
  }

  async function sendEdit() {
    const body = editDraft.trim();
    if (!body) return;
    setBusy(true);
    setStatus(null);
    try {
      await suggestCopy({
        placeId: place._id as Id<"places">,
        language: editLang,
        field: "description",
        body,
        kind: "edit",
      });
      setEditDraft("");
      setEditSent(true);
      setStatus("Suggestion sent for review.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not send");
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setStatus(null);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: file,
      });
      if (!result.ok) throw new Error("Upload failed");
      const { storageId } = (await result.json()) as { storageId: Id<"_storage"> };
      await submitPhoto({
        placeId: place._id as Id<"places">,
        storageId,
      });
      setPhotoSent(true);
      setSheet("preview");
      setStatus("Photo sent for review.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not upload");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {sheet === "preview" ? (
        <>
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-[var(--ink)]">{place.name}</h2>
              <p className="text-xs text-[var(--ink-muted)]">
                {place.categories.join(" · ")}
                {place.address ? ` · ${place.address}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="map-fab h-8 w-8 rounded-full"
              aria-label="Close place"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {place.attributes.length > 0 ? (
            <p className="text-xs text-[var(--ink-muted)]">
              {place.attributes.join(" · ")}
            </p>
          ) : null}
          {place.description ? (
            <p className="text-sm text-[var(--ink)]">{place.description}</p>
          ) : null}
          {photos && photos.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto">
              {photos.slice(0, 4).map((photo) =>
                photo.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={photo._id}
                    src={photo.url}
                    alt=""
                    className="h-16 w-20 shrink-0 rounded-md object-cover ring-1 ring-[var(--line)]"
                  />
                ) : (
                  <div
                    key={photo._id}
                    className="h-16 w-20 shrink-0 rounded-md bg-[var(--panel)] ring-1 ring-[var(--line)]"
                  />
                ),
              )}
            </div>
          ) : null}
          <div className="grid grid-cols-5 gap-1.5">
            <RoundAction
              icon={<Navigation className="h-4 w-4" />}
              label="Directions"
              onClick={() => {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
                window.open(url, "_blank", "noopener,noreferrer");
              }}
            />
            <RoundAction
              icon={<Heart className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />}
              label={saved ? "Saved" : "Save"}
              onClick={onToggleSave}
            />
            <RoundAction
              icon={<MessageCircle className="h-4 w-4" />}
              label="Comments"
              onClick={() => setSheet("comments")}
            />
            <RoundAction
              icon={<Pencil className="h-4 w-4" />}
              label="Edit"
              onClick={() => setSheet("edit")}
            />
            <RoundAction
              icon={<Camera className="h-4 w-4" />}
              label="Photo"
              onClick={() => setSheet("photo")}
            />
          </div>
          {(comments ?? []).slice(-2).map((comment) => (
            <p key={comment._id} className="text-sm text-[var(--ink)]">
              <span className="font-semibold">{comment.who}. </span>
              {comment.body}
            </p>
          ))}
        </>
      ) : null}

      {sheet === "comments" ? (
        <SheetBody title="Comments" onBack={() => setSheet("preview")}>
          {(comments ?? []).map((comment) => (
            <p key={comment._id} className="text-sm text-[var(--ink)]">
              <span className="font-semibold">{comment.who}. </span>
              {comment.body}
            </p>
          ))}
          <AuthGate>
            <select
              value={commentLang}
              onChange={(e) => setCommentLang(e.target.value as Lang)}
              className="rounded-md border border-[var(--line)] px-2 py-1.5 text-sm"
            >
              {LANGS.map((lang) => (
                <option key={lang} value={lang}>
                  {LANG_LABELS[lang]}
                </option>
              ))}
            </select>
            <input
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              placeholder="Add a comment"
              className="rounded-md border border-[var(--line)] px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={busy}
              onClick={postComment}
              className="rounded-full bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:brightness-110 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
            >
              Post comment
            </button>
          </AuthGate>
        </SheetBody>
      ) : null}

      {sheet === "edit" ? (
        <SheetBody title="Suggest an edit" onBack={() => setSheet("preview")}>
          <p className="text-xs text-[var(--ink-muted)]">
            Describe what should change. An admin reviews it on the place.
          </p>
          <AuthGate>
            <select
              value={editLang}
              onChange={(e) => setEditLang(e.target.value as Lang)}
              className="rounded-md border border-[var(--line)] px-2 py-1.5 text-sm"
            >
              {LANGS.map((lang) => (
                <option key={lang} value={lang}>
                  {LANG_LABELS[lang]}
                </option>
              ))}
            </select>
            <textarea
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              placeholder="The entrance is on the other street"
              rows={3}
              className="rounded-md border border-[var(--line)] px-3 py-2 text-sm"
            />
            {editSent ? (
              <p className="text-sm text-[var(--ink)]">Sent for review.</p>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={sendEdit}
                className="rounded-full bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:brightness-110 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
              >
                Send suggestion
              </button>
            )}
          </AuthGate>
        </SheetBody>
      ) : null}

      {sheet === "photo" ? (
        <SheetBody title="Add a photo" onBack={() => setSheet("preview")}>
          <p className="text-xs text-[var(--ink-muted)]">
            {(photos?.length ?? place.photos)} on this place. A new photo waits
            for review.
          </p>
          <AuthGate>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="text-sm"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            {photoSent ? (
              <p className="text-sm text-[var(--ink)]">Sent for review.</p>
            ) : null}
          </AuthGate>
        </SheetBody>
      ) : null}

      {status ? (
        <p className="text-xs text-[var(--ink-muted)]">{status}</p>
      ) : null}
    </div>
  );
}

function SheetBody({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md px-2 py-1 text-sm text-[var(--ink-muted)] hover:bg-[var(--accent-soft)]"
        >
          Back
        </button>
        <h3 className="font-semibold text-[var(--ink)]">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function RoundAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1 text-[11px] text-[var(--ink)] transition hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <span className="map-fab inline-flex h-9 w-9 items-center justify-center rounded-full">
        {icon}
      </span>
      {label}
    </button>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Unauthenticated>
        <p className="text-sm text-[var(--ink-muted)]">
          <SignInButton mode="modal">
            <button type="button" className="text-primary underline">
              Sign in
            </button>
          </SignInButton>{" "}
          to contribute.
        </p>
      </Unauthenticated>
      <Authenticated>
        <div className="flex flex-col gap-2">{children}</div>
      </Authenticated>
    </>
  );
}
