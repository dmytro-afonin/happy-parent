import { query } from "./_generated/server"
import { v } from "convex/values"

const placeValidator = v.object({
  _id: v.id("places"),
  _creationTime: v.number(),
  name: v.string(),
  lat: v.number(),
  lng: v.number(),
  tags: v.array(v.string()),
  createdBy: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
})

export const list = query({
  args: {},
  returns: v.array(placeValidator),
  handler: async (ctx) => {
    return await ctx.db.query("places").order("desc").take(50)
  },
})
