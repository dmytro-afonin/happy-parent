import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { langNamesValidator, readLangName, emptyLangNames } from "./lib/copy";
import { LANGS } from "./lib/langs";
import { requireAdmin } from "./users";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("catalogItems").collect();
    return items
      .map((item) => ({
        _id: item._id,
        kind: item.kind,
        slug: item.slug,
        names: item.names,
        label: readLangName(item.names),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "pl"));
  },
});

export const upsert = mutation({
  args: {
    id: v.optional(v.id("catalogItems")),
    kind: v.union(v.literal("category"), v.literal("attribute")),
    slug: v.string(),
    names: langNamesValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const slug = args.slug.trim().toLowerCase();
    if (!slug) throw new Error("Slug is required");
    if (slug.length > 64) throw new Error("Slug is too long");

    const names = emptyLangNames();
    for (const lang of LANGS) {
      names[lang] = args.names[lang].trim();
    }
    if (!LANGS.some((lang) => names[lang])) {
      throw new Error("At least one language name is required");
    }

    const now = Date.now();
    if (args.id) {
      const existing = await ctx.db.get(args.id);
      if (!existing) throw new Error("Catalog item not found");
      const clash = await ctx.db
        .query("catalogItems")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique();
      if (clash && clash._id !== args.id) {
        throw new Error(`Slug already used: ${slug}`);
      }
      await ctx.db.patch(args.id, { kind: args.kind, slug, names, updatedAt: now });
      return args.id;
    }

    const clash = await ctx.db
      .query("catalogItems")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (clash) throw new Error(`Slug already used: ${slug}`);

    return await ctx.db.insert("catalogItems", {
      kind: args.kind,
      slug,
      names,
      createdAt: now,
      updatedAt: now,
    });
  },
});
