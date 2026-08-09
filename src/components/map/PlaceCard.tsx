"use client"

import { useEffect, useRef, useState } from "react"
import { Show, SignInButton } from "@clerk/react"
import { useConvexAuth, useAction, useMutation, useQuery } from "convex/react"
import { upload } from "@imagekit/react"
import {
  CheckIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  HeartIcon,
  ImagePlusIcon,
  Loader2Icon,
  MapPinIcon,
  NavigationIcon,
  RouteIcon,
  SendIcon,
  Share2Icon,
  XIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useLocalizedNames } from "@/hooks/use-localized-catalog"
import type { PlaceLabel } from "@/hooks/use-localized-catalog"
import { useI18n } from "@/lib/i18n"
import type { MapPlace } from "@/lib/map/place-layers"
import {
  formatCoordinatesAddress,
  getNavigationLinks,
  getPlaceShareUrl,
} from "@/lib/navigation-links"
import { PLACE_CATEGORY_META } from "@/lib/place-categories"
import { cn } from "@/lib/utils"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"

type PlaceCardProps = {
  place: MapPlace
  labels: PlaceLabel[] | undefined
  onClose: () => void
  onShowRoute: () => void
  onClearRoute: () => void
  routeLoading: boolean
  routeSummary: string | null
  routeError: string | null
}

export function PlaceCard({
  place,
  labels,
  onClose,
  onShowRoute,
  onClearRoute,
  routeLoading,
  routeSummary,
  routeError,
}: PlaceCardProps) {
  const { t } = useI18n()
  const { isAuthenticated } = useConvexAuth()
  const { categoryName, labelName } = useLocalizedNames()

  const placeId = place._id as Id<"places">
  const photos = useQuery(api.placePhotos.listByPlace, { placeId })
  const comments = useQuery(api.placeComments.listByPlace, { placeId })
  const saved = useQuery(
    api.savedPlaces.isSaved,
    isAuthenticated ? { placeId } : "skip"
  )
  const toggleSaved = useMutation(api.savedPlaces.toggle)

  const isSaved = saved === true

  const [shareCopied, setShareCopied] = useState(false)
  const [directionsOpen, setDirectionsOpen] = useState(false)
  const directionsRef = useRef<HTMLDivElement>(null)

  const meta = PLACE_CATEGORY_META[place.category]
  const navigation = getNavigationLinks(place.lat, place.lng, place.name)
  const address =
    place.address ?? formatCoordinatesAddress(place.lat, place.lng)
  const coverUrl =
    photos?.[0]?.thumbnailUrl ??
    photos?.[0]?.url ??
    place.coverPhotoThumbnailUrl ??
    place.coverPhotoUrl

  const placeLabels = (place.labelIds ?? [])
    .map((labelId) => labels?.find((label) => label._id === labelId))
    .filter((label): label is PlaceLabel => Boolean(label))

  useEffect(() => {
    if (!directionsOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (
        directionsRef.current &&
        !directionsRef.current.contains(event.target as Node)
      ) {
        setDirectionsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDirectionsOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [directionsOpen])

  const handleShare = async () => {
    const url = getPlaceShareUrl(place._id)
    const shareData = { title: place.name, url }

    if (
      typeof navigator.share === "function" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare(shareData)
    ) {
      try {
        await navigator.share(shareData)
        return
      } catch {
        // fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      setShareCopied(true)
      window.setTimeout(() => setShareCopied(false), 2000)
      return
    } catch {
      // Clipboard API can be unavailable — fall back to execCommand copy.
      const textarea = document.createElement("textarea")
      textarea.value = url
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()
      const copied = document.execCommand("copy")
      textarea.remove()
      if (copied) {
        setShareCopied(true)
        window.setTimeout(() => setShareCopied(false), 2000)
      }
    }
  }

  return (
    <div className="pointer-events-auto flex max-h-full w-[min(360px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-xl border bg-background shadow-xl">
      <div className="relative shrink-0">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={place.name}
            className="block h-36 w-full object-cover"
          />
        ) : (
          <div
            className="h-16 w-full"
            style={{ backgroundColor: `${meta.color}22` }}
          />
        )}
        <Button
          type="button"
          size="icon-sm"
          variant="secondary"
          className="absolute top-2 right-2 shadow"
          aria-label={t("common.close")}
          onClick={onClose}
        >
          <XIcon className="size-4" />
        </Button>
      </div>

      <div className="min-h-0 space-y-3 overflow-y-auto p-3">
        <div>
          <h3 className="text-base leading-snug font-semibold">{place.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <Badge
              variant="secondary"
              style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
            >
              {categoryName(place.category)}
            </Badge>
            {placeLabels.map((label) => (
              <Badge key={label._id} variant="outline">
                {labelName(label)}
              </Badge>
            ))}
            {place.geometryType === "polygon" ? (
              <Badge variant="outline">{t("place.area")}</Badge>
            ) : null}
            {place.status === "pending" ? (
              <Badge className="bg-amber-500/15 text-amber-600">
                {t("place.pendingReview")}
              </Badge>
            ) : null}
            {place.status === "rejected" ? (
              <Badge variant="destructive">{t("place.rejected")}</Badge>
            ) : null}
          </div>
          {place.status === "pending" ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("place.pendingNote")}
            </p>
          ) : null}
        </div>

        {place.description ? (
          <p className="text-sm leading-relaxed text-foreground/90">
            {place.description}
          </p>
        ) : null}

        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPinIcon className="mt-0.5 size-4 shrink-0" />
          <span className="leading-snug">{address}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative" ref={directionsRef}>
            <Button
              type="button"
              size="sm"
              aria-expanded={directionsOpen}
              aria-haspopup="menu"
              onClick={() => setDirectionsOpen((open) => !open)}
            >
              <NavigationIcon className="size-3.5" />
              {t("place.directions")}
              <ChevronDownIcon className="size-3" />
            </Button>
            {directionsOpen ? (
              <div
                role="menu"
                className="absolute bottom-full left-0 z-10 mb-1 w-44 rounded-md border bg-popover p-1 shadow-md"
              >
                <a
                  role="menuitem"
                  href={navigation.google}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                  onClick={() => setDirectionsOpen(false)}
                >
                  {t("place.googleMaps")}
                  <ExternalLinkIcon className="ml-auto size-3" />
                </a>
                <a
                  role="menuitem"
                  href={navigation.apple}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                  onClick={() => setDirectionsOpen(false)}
                >
                  {t("place.appleMaps")}
                  <ExternalLinkIcon className="ml-auto size-3" />
                </a>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    setDirectionsOpen(false)
                    onShowRoute()
                  }}
                >
                  <RouteIcon className="size-3.5" />
                  {t("place.routeOnMap")}
                </button>
              </div>
            ) : null}
          </div>

          {isAuthenticated ? (
            <Button
              type="button"
              size="sm"
              variant={isSaved ? "secondary" : "outline"}
              onClick={() => void toggleSaved({ placeId })}
            >
              <HeartIcon
                className={cn(
                  "size-3.5",
                  isSaved && "fill-red-500 text-red-500"
                )}
              />
              {isSaved ? t("place.saved") : t("place.save")}
            </Button>
          ) : null}

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void handleShare()}
          >
            {shareCopied ? (
              <>
                <CheckIcon className="size-3.5 text-green-600" />
                {t("place.linkCopied")}
              </>
            ) : (
              <>
                <Share2Icon className="size-3.5" />
                {t("place.share")}
              </>
            )}
          </Button>
        </div>

        {routeLoading || routeSummary || routeError ? (
          <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1.5 text-xs">
            {routeLoading ? (
              <>
                <Loader2Icon className="size-3.5 animate-spin" />
                {t("place.routeOnMap")}…
              </>
            ) : routeError ? (
              <span className="text-destructive">{routeError}</span>
            ) : (
              <>
                <RouteIcon className="size-3.5" />
                <span>{routeSummary}</span>
                <button
                  type="button"
                  className="ml-auto underline"
                  onClick={onClearRoute}
                >
                  {t("place.clearRoute")}
                </button>
              </>
            )}
          </div>
        ) : null}

        <PlacePhotosSection placeId={placeId} photos={photos} />

        <PlaceCommentsSection placeId={placeId} comments={comments} />
      </div>
    </div>
  )
}

type PhotosSectionProps = {
  placeId: Id<"places">
  photos:
    | Array<{
        _id: Id<"photos">
        url: string
        thumbnailUrl?: string
        status: "pending" | "approved" | "rejected"
        isOwn: boolean
      }>
    | undefined
}

function PlacePhotosSection({ placeId, photos }: PhotosSectionProps) {
  const { t } = useI18n()
  const { isAuthenticated } = useConvexAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const getUploadAuth = useAction(api.imagekit.getUploadAuth)
  const attachPhotos = useMutation(api.placePhotos.attachMany)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const visiblePhotos = (photos ?? []).filter(
    (photo) => photo.status !== "rejected"
  )

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return
    }

    setUploading(true)
    setError(null)

    try {
      const uploaded = []
      for (const file of Array.from(files)) {
        const auth = await getUploadAuth({})
        const response = await upload({
          file,
          fileName: file.name,
          folder: "/happy-parent/places",
          tags: ["place", "contribution"],
          publicKey: auth.publicKey,
          signature: auth.signature,
          token: auth.token,
          expire: auth.expire,
        })

        if (!response.fileId || !response.url) {
          throw new Error("Image upload did not return file metadata.")
        }

        uploaded.push({
          imageKitFileId: response.fileId,
          url: response.url,
          thumbnailUrl: response.thumbnailUrl ?? undefined,
          fileName: response.name ?? file.name,
        })
      }

      await attachPhotos({ placeId, photos: uploaded })
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : t("place.uploadError")
      )
    } finally {
      setUploading(false)
      if (inputRef.current) {
        inputRef.current.value = ""
      }
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t("place.photos")}
        </p>
        {isAuthenticated ? (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => void handleFiles(event.target.files)}
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                <ImagePlusIcon className="size-3.5" />
              )}
              {t("place.addPhotos")}
            </Button>
          </>
        ) : null}
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {visiblePhotos.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {visiblePhotos.map((photo) => (
            <div key={photo._id} className="relative shrink-0">
              <img
                src={photo.thumbnailUrl ?? photo.url}
                alt=""
                className="h-20 w-28 rounded-md border object-cover"
              />
              {photo.status === "pending" ? (
                <span className="absolute bottom-1 left-1 rounded bg-amber-500/90 px-1 text-[10px] font-medium text-white">
                  {t("place.pendingReview")}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

type CommentsSectionProps = {
  placeId: Id<"places">
  comments:
    | Array<{
        _id: Id<"placeComments">
        text: string
        status: "pending" | "approved" | "rejected"
        rejectionComment?: string
        createdAt: number
        authorName?: string
        isOwn: boolean
      }>
    | undefined
}

function PlaceCommentsSection({ placeId, comments }: CommentsSectionProps) {
  const { t } = useI18n()
  const { isAuthenticated } = useConvexAuth()
  const addComment = useMutation(api.placeComments.add)
  const [text, setText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const visibleComments = (comments ?? []).filter(
    (comment) => comment.status !== "rejected" || comment.isOwn
  )

  const handleSubmit = async () => {
    const trimmed = text.trim()
    if (trimmed.length === 0 || submitting) {
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await addComment({ placeId, text: trimmed })
      setText("")
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t("place.commentError")
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-2 border-t pt-2">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {t("place.comments")}
        {visibleComments.length > 0 ? ` (${visibleComments.length})` : ""}
      </p>

      {visibleComments.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("place.noComments")}</p>
      ) : (
        <ul className="space-y-2">
          {visibleComments.map((comment) => (
            <li
              key={comment._id}
              className="rounded-md bg-muted/40 px-2 py-1.5"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium">
                  {comment.authorName ?? t("place.anonymous")}
                </span>
                {comment.status === "pending" ? (
                  <Badge className="h-4 bg-amber-500/15 px-1 text-[10px] text-amber-600">
                    {t("place.pendingReview")}
                  </Badge>
                ) : null}
                {comment.status === "rejected" ? (
                  <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                    {t("place.rejected")}
                  </Badge>
                ) : null}
              </div>
              <p className="text-sm leading-snug">{comment.text}</p>
              {comment.status === "rejected" && comment.rejectionComment ? (
                <p className="mt-0.5 text-xs text-destructive">
                  {comment.rejectionComment}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {isAuthenticated ? (
        <div className="flex items-end gap-1.5">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t("place.addComment")}
            rows={2}
            className="min-h-9 w-full flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:outline-none"
          />
          <Button
            type="button"
            size="icon-sm"
            disabled={submitting || text.trim().length === 0}
            aria-label={t("place.send")}
            onClick={() => void handleSubmit()}
          >
            {submitting ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <SendIcon className="size-4" />
            )}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button type="button" className="underline">
                {t("place.signInToContribute")}
              </button>
            </SignInButton>
          </Show>
        </p>
      )}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
