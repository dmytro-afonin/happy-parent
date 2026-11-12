import type { Doc, Id } from "../_generated/dataModel";
import {
  displayPlaceName,
  emptyPlaceCopy,
  filledLangs,
  readCopyField,
  withPlaceCopy,
  type PlaceCopy,
} from "./copy";
export type NormalizedPlace = {
  _id: Id<"places">;
  copy: PlaceCopy;
  categoryIds: Id<"catalogItems">[];
  attributeIds: Id<"catalogItems">[];
  publishStatus: "public" | "draft";
  lat: number;
  lng: number;
  geometryType: "point" | "polygon";
  boundary?: Array<{ lat: number; lng: number }>;
  createdBy: Id<"users">;
  createdAt: number;
  updatedAt: number;
};

/** Resolve expanded or legacy place docs into the new shape. */
export function normalizePlace(doc: Doc<"places">): NormalizedPlace {
  const copy =
    doc.copy ??
    withPlaceCopy({
      en: {
        name: doc.name ?? "",
        description: doc.description ?? "",
        address: doc.address ?? "",
      },
    });

  let publishStatus: "public" | "draft" = "draft";
  if (doc.publishStatus) {
    publishStatus = doc.publishStatus;
  } else if (doc.status === "approved") {
    publishStatus = "public";
  }

  return {
    _id: doc._id,
    copy,
    categoryIds: doc.categoryIds ?? [],
    attributeIds: doc.attributeIds ?? [],
    publishStatus,
    lat: doc.lat,
    lng: doc.lng,
    geometryType: doc.geometryType,
    boundary: doc.boundary,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function placeDisplay(place: NormalizedPlace) {
  return {
    name: displayPlaceName(place.copy),
    description: readCopyField(place.copy, "description"),
    address: readCopyField(place.copy, "address"),
    filledLangs: filledLangs(place.copy),
  };
}

export { emptyPlaceCopy };
