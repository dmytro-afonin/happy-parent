"use client"

import { useRef, useState } from "react"
import { useAction } from "convex/react"
import { upload } from "@imagekit/react"
import { ImagePlusIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { api } from "../../../convex/_generated/api"

export type UploadedPlacePhoto = {
  imageKitFileId: string
  url: string
  thumbnailUrl?: string
  fileName?: string
}

type PlaceImageUploaderProps = {
  photos: UploadedPlacePhoto[]
  onChange: (photos: UploadedPlacePhoto[]) => void
}

export function PlaceImageUploader({ photos, onChange }: PlaceImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const getUploadAuth = useAction(api.imagekit.getUploadAuth)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return
    }

    setUploading(true)
    setError(null)

    try {
      const uploaded: UploadedPlacePhoto[] = []

      for (const file of Array.from(files)) {
        const auth = await getUploadAuth({})

        const response = await upload({
          file,
          fileName: file.name,
          folder: "/happy-parent/places",
          tags: ["place", "admin"],
          publicKey: auth.publicKey,
          signature: auth.signature,
          token: auth.token,
          expire: auth.expire,
        })

        if (!response.fileId || !response.url) {
          throw new Error("ImageKit upload did not return file metadata.")
        }

        uploaded.push({
          imageKitFileId: response.fileId,
          url: response.url,
          thumbnailUrl: response.thumbnailUrl ?? undefined,
          fileName: response.name ?? file.name,
        })
      }

      onChange([...photos, ...uploaded])
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Image upload failed",
      )
    } finally {
      setUploading(false)
      if (inputRef.current) {
        inputRef.current.value = ""
      }
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
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
          variant="outline"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlusIcon className="size-4" />
          {uploading ? "Uploading…" : "Add photos"}
        </Button>
        <span className="text-xs text-muted-foreground">
          Upload as many images as you need.
        </span>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {photos.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((photo) => (
            <div
              key={photo.imageKitFileId}
              className="group relative overflow-hidden rounded-lg border bg-muted/20"
            >
              <img
                src={photo.thumbnailUrl ?? photo.url}
                alt={photo.fileName ?? "Place photo"}
                className="aspect-[4/3] w-full object-cover"
              />
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute top-2 right-2 size-8 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() =>
                  onChange(
                    photos.filter(
                      (entry) => entry.imageKitFileId !== photo.imageKitFileId,
                    ),
                  )
                }
              >
                <Trash2Icon className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No photos yet. Add a cover image and gallery shots for this place.
        </div>
      )}
    </div>
  )
}
