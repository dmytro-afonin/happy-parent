import { useSyncExternalStore } from "react"

const MOBILE_BREAKPOINT = 768

function subscribe(listener: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", listener)
  return () => mql.removeEventListener("change", listener)
}

function getSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT
}

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
