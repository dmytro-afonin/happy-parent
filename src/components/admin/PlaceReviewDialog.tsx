"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import { useMutation, useQuery } from "convex/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useI18n } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n"
import { LOCALE_NAMES } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { api } from "../../../convex/_generated/api"

type ReviewMode = "updates" | "translations"

type PlaceReviewDialogProps = {
  mode: ReviewMode | null
  onOpenChange: (open: boolean) => void
}

type Submitter = {
  name?: string
  email?: string
  registeredAt: number
  placesRequested: number
  placesApproved: number
  changesRequested: number
  changesApproved: number
  titleChangesRequested: number
  titleChangesApproved: number
  descriptionChangesRequested: number
  descriptionChangesApproved: number
  locationChangesRequested: number
  locationChangesApproved: number
  photoChangesRequested: number
  photoChangesApproved: number
  commentsRequested: number
  commentsApproved: number
}

function smooth(approved: number, requested: number) {
  return Math.round((100 * approved) / (requested + 1))
}

function ratio(approved: number, requested: number) {
  return `${approved}/${requested}`
}

export function PlaceReviewDialog({
  mode,
  onOpenChange,
}: PlaceReviewDialogProps) {
  const { t } = useI18n()
  const places = useQuery(api.review.list, mode ? { mode } : "skip")
  const decidePlace = useMutation(api.moderation.decidePlace)
  const decidePhoto = useMutation(api.moderation.decidePhoto)
  const decideComment = useMutation(api.moderation.decideComment)
  const decideSuggestion = useMutation(api.placeSuggestions.decide)
  const saveTranslation = useMutation(api.review.saveTranslation)
  const [index, setIndex] = useState(0)
  const [seenMode, setSeenMode] = useState(mode)
  const [drafts, setDrafts] = useState<Partial<Record<Locale, string>>>({})

  if (mode !== seenMode) {
    setSeenMode(mode)
    setIndex(0)
    setDrafts({})
  }

  const item = places?.[index] ?? places?.[0]
  const yellow = "rounded-lg bg-amber-100 px-2 py-1 dark:bg-amber-500/20"

  const goNext = () => {
    if (!places || places.length === 0) {
      onOpenChange(false)
      return
    }
    setDrafts({})
    setIndex((current) => (current + 1) % places.length)
  }

  return (
    <Dialog open={mode !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "translations"
              ? t("review.missingTranslations")
              : t("review.updates")}
          </DialogTitle>
          <DialogDescription>
            {item ? `${index + 1} / ${places?.length ?? 1}` : t("review.empty")}
          </DialogDescription>
        </DialogHeader>

        {!item ? (
          <p className="text-sm text-muted-foreground">{t("review.empty")}</p>
        ) : (
          <div
            className={cn(
              "space-y-4 rounded-xl border p-3",
              item.isNew && "border-amber-400 bg-amber-50 dark:bg-amber-500/10"
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold">{item.name}</h3>
              {item.isNew ? (
                <Badge className="bg-amber-500 text-white">
                  {t("review.new")}
                </Badge>
              ) : null}
              <Badge variant="outline">{item.category}</Badge>
            </div>

            <Field
              label={t("suggest.description")}
              highlight={
                item.isNew ||
                item.descriptionChanges.length > 0 ||
                (!item.savedDescription && item.descriptionChanges.length > 0)
              }
              className={yellow}
            >
              <p className="text-sm">
                {item.description || item.descriptionChanges[0]?.text || "—"}
              </p>
              {item.descriptionChanges.map((change) => (
                <ChangeRow
                  key={change.id}
                  text={change.text}
                  submitter={change.submitter}
                  onApprove={() =>
                    void decideSuggestion({
                      suggestionId: change.id,
                      approve: true,
                    })
                  }
                  onReject={() =>
                    void decideSuggestion({
                      suggestionId: change.id,
                      approve: false,
                    })
                  }
                />
              ))}
            </Field>

            {item.nameChanges.map((change) => (
              <Field
                key={change.id}
                label={t("review.title")}
                highlight
                className={yellow}
              >
                <ChangeRow
                  text={change.text}
                  submitter={change.submitter}
                  onApprove={() =>
                    void decideSuggestion({
                      suggestionId: change.id,
                      approve: true,
                    })
                  }
                  onReject={() =>
                    void decideSuggestion({
                      suggestionId: change.id,
                      approve: false,
                    })
                  }
                />
              </Field>
            ))}

            <Field
              label={t("suggest.location")}
              highlight={item.isNew || item.locationChanges.length > 0}
              className={yellow}
            >
              <p className="text-sm">
                {item.address ??
                  `${item.lat.toFixed(5)}, ${item.lng.toFixed(5)}`}
              </p>
              {item.locationChanges.map((change) => (
                <ChangeRow
                  key={change.id}
                  text={change.text}
                  submitter={change.submitter}
                  onApprove={() =>
                    void decideSuggestion({
                      suggestionId: change.id,
                      approve: true,
                    })
                  }
                  onReject={() =>
                    void decideSuggestion({
                      suggestionId: change.id,
                      approve: false,
                    })
                  }
                />
              ))}
            </Field>

            <Field
              label={t("suggest.labels")}
              highlight={item.labelChanges.length > 0}
              className={yellow}
            >
              <div className="flex flex-wrap gap-1.5">
                {item.labelNames.map((name) => (
                  <Badge key={name} variant="secondary">
                    {name}
                  </Badge>
                ))}
              </div>
              {item.labelChanges.map((change) => (
                <ChangeRow
                  key={change.id}
                  text={change.text}
                  submitter={change.submitter}
                  onApprove={() =>
                    void decideSuggestion({
                      suggestionId: change.id,
                      approve: true,
                    })
                  }
                  onReject={() =>
                    void decideSuggestion({
                      suggestionId: change.id,
                      approve: false,
                    })
                  }
                />
              ))}
            </Field>

            {item.photos.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {item.photos.map((photo) => (
                  <div
                    key={photo.id}
                    className={cn("w-28 space-y-1", photo.pending && yellow)}
                  >
                    <img
                      src={photo.thumbnailUrl ?? photo.url}
                      alt=""
                      className="h-20 w-full rounded-md object-cover"
                    />
                    {photo.pending ? (
                      <ChangeRow
                        text={t("review.new")}
                        submitter={photo.submitter}
                        onApprove={() =>
                          void decidePhoto({ photoId: photo.id, approve: true })
                        }
                        onReject={() =>
                          void decidePhoto({
                            photoId: photo.id,
                            approve: false,
                          })
                        }
                      />
                    ) : (
                      <p className="text-[0.7rem] text-muted-foreground">
                        {t("review.saved")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : null}

            {item.comments.map((comment) => (
              <Field
                key={comment.id}
                label={t("place.comments")}
                highlight
                className={yellow}
              >
                <ChangeRow
                  text={comment.text}
                  submitter={comment.submitter}
                  onApprove={() =>
                    void decideComment({ commentId: comment.id, approve: true })
                  }
                  onReject={() =>
                    void decideComment({
                      commentId: comment.id,
                      approve: false,
                    })
                  }
                />
              </Field>
            ))}

            {item.translationChanges.map((change) => (
              <Field
                key={change.id}
                label={`${LOCALE_NAMES[change.locale]} · ${change.field}`}
                highlight
                className={yellow}
              >
                <ChangeRow
                  text={change.text}
                  submitter={change.submitter}
                  onApprove={() =>
                    void decideSuggestion({
                      suggestionId: change.id,
                      approve: true,
                    })
                  }
                  onReject={() =>
                    void decideSuggestion({
                      suggestionId: change.id,
                      approve: false,
                    })
                  }
                />
              </Field>
            ))}

            {mode === "translations"
              ? item.missingLocales.map((missing) => (
                  <label
                    key={missing}
                    className={cn("block space-y-1 text-sm", yellow)}
                  >
                    <span className="font-medium">{LOCALE_NAMES[missing]}</span>
                    <Input
                      value={drafts[missing] ?? ""}
                      placeholder={item.name}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [missing]: event.target.value,
                        }))
                      }
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={(drafts[missing] ?? "").trim().length === 0}
                      onClick={() =>
                        void saveTranslation({
                          placeId: item.placeId,
                          locale: missing,
                          field: "name",
                          value: drafts[missing] ?? "",
                        })
                      }
                    >
                      {t("translations.submit")}
                    </Button>
                  </label>
                ))
              : null}

            {item.isNew ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() =>
                    void decidePlace({ placeId: item.placeId, approve: true })
                  }
                >
                  {t("review.approve")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    void decidePlace({ placeId: item.placeId, approve: false })
                  }
                >
                  {t("review.reject")}
                </Button>
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button type="button" onClick={goNext}>
                {t("review.next")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  highlight,
  className,
  children,
}: {
  label: string
  highlight?: boolean
  className: string
  children: ReactNode
}) {
  return (
    <div className={cn("space-y-1", highlight && className)}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}

function ChangeRow({
  text,
  submitter,
  onApprove,
  onReject,
}: {
  text: string
  submitter: Submitter
  onApprove: () => void
  onReject: () => void
}) {
  const { t } = useI18n()
  const registered = new Date(submitter.registeredAt).toLocaleDateString()

  return (
    <div className="space-y-1 text-sm">
      <p>{text}</p>
      <p className="text-xs text-muted-foreground">
        {t("review.by")}{" "}
        {submitter.name ?? submitter.email ?? t("place.anonymous")}
        {" · "}
        {t("review.registered")} {registered}
      </p>
      <p className="text-xs text-muted-foreground">
        {t("review.places")}{" "}
        {ratio(submitter.placesApproved, submitter.placesRequested)} (
        {smooth(submitter.placesApproved, submitter.placesRequested)}%)
        {" · "}
        {t("review.changes")}{" "}
        {ratio(submitter.changesApproved, submitter.changesRequested)} (
        {smooth(submitter.changesApproved, submitter.changesRequested)}%)
        {" · "}
        {t("review.comments")}{" "}
        {ratio(submitter.commentsApproved, submitter.commentsRequested)} (
        {smooth(submitter.commentsApproved, submitter.commentsRequested)}%)
      </p>
      <p className="text-[0.7rem] text-muted-foreground">
        {t("review.title")}{" "}
        {ratio(submitter.titleChangesApproved, submitter.titleChangesRequested)}
        {" · "}
        {t("suggest.description")}{" "}
        {ratio(
          submitter.descriptionChangesApproved,
          submitter.descriptionChangesRequested
        )}
        {" · "}
        {t("suggest.location")}{" "}
        {ratio(
          submitter.locationChangesApproved,
          submitter.locationChangesRequested
        )}
        {" · "}
        {t("place.photos")}{" "}
        {ratio(submitter.photoChangesApproved, submitter.photoChangesRequested)}
      </p>
      <div className="flex gap-1">
        <Button type="button" size="sm" variant="outline" onClick={onApprove}>
          {t("review.approve")}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onReject}>
          {t("review.reject")}
        </Button>
      </div>
    </div>
  )
}
