/** Client helpers for Convex-backed catalog rows. */
export type CatalogKind = "category" | "attribute";

export type CatalogItem = {
  _id: string;
  kind: CatalogKind;
  slug: string;
  label: string;
  names: Record<string, string>;
};
