"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { PlaceSearchResult } from "@/lib/place-search"

type SaveFavouriteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  place: PlaceSearchResult | null
  onSave: (name: string) => Promise<void>
}

export function SaveFavouriteDialog({
  open,
  onOpenChange,
  place,
  onSave,
}: SaveFavouriteDialogProps) {
  const [name, setName] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open && place) {
      setName(place.label)
    }
  }, [open, place])

  const handleSave = async () => {
    if (!place || name.trim().length === 0) {
      return
    }

    setIsSaving(true)
    try {
      await onSave(name.trim())
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save to favourites</DialogTitle>
          <DialogDescription>
            Give this place a name you&apos;ll recognize later.
          </DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="My favourite playground"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              void handleSave()
            }
          }}
        />
        {place?.subtitle ? (
          <p className="text-xs text-muted-foreground">{place.subtitle}</p>
        ) : null}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={isSaving}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
