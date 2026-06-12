"use node"

import ImageKit from "@imagekit/nodejs"
import { v } from "convex/values"

import { action } from "./_generated/server"
import { api } from "./_generated/api"

const uploadAuthValidator = v.object({
  token: v.string(),
  expire: v.number(),
  signature: v.string(),
  publicKey: v.string(),
  urlEndpoint: v.string(),
})

function getImageKitClient() {
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT

  if (!publicKey || !privateKey || !urlEndpoint) {
    throw new Error(
      "ImageKit is not configured. Set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT in Convex.",
    )
  }

  return {
    client: new ImageKit({ privateKey }),
    publicKey,
    urlEndpoint,
  }
}

export const getUploadAuth = action({
  args: {},
  returns: uploadAuthValidator,
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Not authenticated")
    }

    const currentUser = await ctx.runQuery(api.users.getAdminStatus, {})
    if (!currentUser.isAdmin) {
      throw new Error("Admin access required")
    }

    const { client, publicKey, urlEndpoint } = getImageKitClient()
    const auth = client.helper.getAuthenticationParameters()

    return {
      token: auth.token,
      expire: auth.expire,
      signature: auth.signature,
      publicKey,
      urlEndpoint,
    }
  },
})

export const getPublicConfig = action({
  args: {},
  returns: v.union(
    v.object({
      publicKey: v.string(),
      urlEndpoint: v.string(),
    }),
    v.null(),
  ),
  handler: async () => {
    const publicKey = process.env.IMAGEKIT_PUBLIC_KEY
    const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT

    if (!publicKey || !urlEndpoint) {
      return null
    }

    return { publicKey, urlEndpoint }
  },
})
