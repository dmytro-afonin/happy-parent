import { v } from "convex/values"

export const userRoleValidator = v.union(v.literal("user"), v.literal("admin"))

export type UserRole = "user" | "admin"

export function isAdminRole(role: UserRole | undefined) {
  return role === "admin"
}
