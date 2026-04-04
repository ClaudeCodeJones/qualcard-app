import { useEffect, useState, useSyncExternalStore } from "react"

function getSnapshot(breakpoint) {
  return window.innerWidth < breakpoint
}

function getServerSnapshot() {
  return true // assume mobile on server to avoid desktop flash
}

export function useIsMobile(breakpoint = 768) {
  const isMobile = useSyncExternalStore(
    (callback) => {
      window.addEventListener("resize", callback)
      return () => window.removeEventListener("resize", callback)
    },
    () => getSnapshot(breakpoint),
    () => getServerSnapshot()
  )
  return isMobile
}
