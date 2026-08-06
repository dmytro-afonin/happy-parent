"use client"

import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import {
  CheckIcon,
  Loader2Icon,
  ShieldCheckIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PLACE_CATEGORY_META } from "@/lib/place-categories"
import { LOCALE_NAMES } from "@/lib/i18n"
import { api } from "../../../convex/_generated/api"

type Submitter = {
  name?: string
  email?: string
  submissionsApproved: number
  submissionsRejected: number
}

function SubmitterInfo({ submitter }: { submitter: Submitter }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      <span>{submitter.name ?? submitter.email ?? "Unknown user"}</span>
      <span
        className="inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5"
        title="Approved / rejected submissions (trust rating)"
      >
        <ShieldCheckIcon className="size-3" />
        <span className="text-green-600">✓{submitter.submissionsApproved}</span>
        <span className="text-red-500">✗{submitter.submissionsRejected}</span>
      </span>
    </span>
  )
}

type DecisionControlsProps = {
  onDecide: (approve: boolean, comment?: string) => Promise<unknown>
}

function DecisionControls({ onDecide }: DecisionControlsProps) {
  const [rejecting, setRejecting] = useState(false)
  const [comment, setComment] = useState("")
  const [busy, setBusy] = useState(false)

  const decide = async (approve: boolean) => {
    setBusy(true)
    try {
      await onDecide(approve, approve ? undefined : comment)
    } finally {
      setBusy(false)
    }
  }

  if (rejecting) {
    return (
      <div className="flex w-full flex-wrap items-center gap-1.5">
        <Input
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Rejection comment (optional)"
          className="h-8 flex-1 text-sm"
        />
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={busy}
          onClick={() => void decide(false)}
        >
          {busy ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <ThumbsDownIcon className="size-4" />
          )}
          Reject
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setRejecting(false)}
        >
          Cancel
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        type="button"
        size="sm"
        disabled={busy}
        onClick={() => void decide(true)}
      >
        {busy ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <ThumbsUpIcon className="size-4" />
        )}
        Approve
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setRejecting(true)}
      >
        <ThumbsDownIcon className="size-4" />
        Reject
      </Button>
    </div>
  )
}

export function ModerationQueue() {
  const pending = useQuery(api.moderation.listPending, {})
  const decidePlace = useMutation(api.moderation.decidePlace)
  const decidePhoto = useMutation(api.moderation.decidePhoto)
  const decideComment = useMutation(api.moderation.decideComment)
  const decideTranslation = useMutation(api.moderation.decideTranslation)

  if (pending === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Moderation queue</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </CardContent>
      </Card>
    )
  }

  const total =
    pending.places.length +
    pending.photos.length +
    pending.comments.length +
    pending.translations.length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Moderation queue
          <Badge variant={total > 0 ? "default" : "secondary"}>{total}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {total === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckIcon className="size-4 text-green-600" />
            Nothing awaiting review.
          </p>
        ) : null}

        {pending.places.length > 0 ? (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">
              Places ({pending.places.length})
            </h3>
            {pending.places.map((place) => (
              <div key={place._id} className="space-y-2 rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{place.name}</span>
                  <Badge
                    variant="secondary"
                    style={{
                      backgroundColor: `${PLACE_CATEGORY_META[place.category].color}22`,
                      color: PLACE_CATEGORY_META[place.category].color,
                    }}
                  >
                    {PLACE_CATEGORY_META[place.category].label}
                  </Badge>
                  {place.labelNames.map((name) => (
                    <Badge key={name} variant="outline">
                      {name}
                    </Badge>
                  ))}
                </div>
                {place.description ? (
                  <p className="text-sm text-muted-foreground">
                    {place.description}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {place.address ??
                    `${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}`}
                </p>
                <SubmitterInfo submitter={place.submitter} />
                <DecisionControls
                  onDecide={(approve, comment) =>
                    decidePlace({ placeId: place._id, approve, comment })
                  }
                />
              </div>
            ))}
          </section>
        ) : null}

        {pending.photos.length > 0 ? (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">
              Photos ({pending.photos.length})
            </h3>
            {pending.photos.map((photo) => (
              <div
                key={photo._id}
                className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
              >
                <img
                  src={photo.thumbnailUrl ?? photo.url}
                  alt=""
                  className="size-20 rounded-md border object-cover"
                />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-sm font-medium">
                    {photo.placeName ?? "Unknown place"}
                  </p>
                  <SubmitterInfo submitter={photo.submitter} />
                  <DecisionControls
                    onDecide={(approve, comment) =>
                      decidePhoto({ photoId: photo._id, approve, comment })
                    }
                  />
                </div>
              </div>
            ))}
          </section>
        ) : null}

        {pending.comments.length > 0 ? (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">
              Comments ({pending.comments.length})
            </h3>
            {pending.comments.map((comment) => (
              <div
                key={comment._id}
                className="space-y-2 rounded-lg border p-3"
              >
                <p className="text-sm font-medium">
                  {comment.placeName ?? "Unknown place"}
                </p>
                <p className="text-sm">{comment.text}</p>
                <SubmitterInfo submitter={comment.submitter} />
                <DecisionControls
                  onDecide={(approve, rejection) =>
                    decideComment({
                      commentId: comment._id,
                      approve,
                      comment: rejection,
                    })
                  }
                />
              </div>
            ))}
          </section>
        ) : null}

        {pending.translations.length > 0 ? (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">
              Translations ({pending.translations.length})
            </h3>
            {pending.translations.map((translation) => (
              <div
                key={translation._id}
                className="space-y-2 rounded-lg border p-3"
              >
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="outline">
                    {translation.entityType === "label"
                      ? "place type"
                      : translation.entityType}
                  </Badge>
                  <span className="font-medium">{translation.entityKey}</span>
                  <span className="text-muted-foreground">
                    → {LOCALE_NAMES[translation.locale]}:
                  </span>
                  <span className="font-medium">{translation.value}</span>
                </div>
                <SubmitterInfo submitter={translation.submitter} />
                <DecisionControls
                  onDecide={(approve, comment) =>
                    decideTranslation({
                      translationId: translation._id,
                      approve,
                      comment,
                    })
                  }
                />
              </div>
            ))}
          </section>
        ) : null}
      </CardContent>
    </Card>
  )
}
