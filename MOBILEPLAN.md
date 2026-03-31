# Plan: Mobile-Responsive Dashboard

## Context
The /dashboard and /dashboard/cardholders pages were built desktop-first with inline styles and fixed CSS grid columns. On a mobile viewport they break — the sidebar takes 88px of a 390px screen, and the 2-column/4-column grids overflow. This plan adapts the layout to work cleanly on mobile without breaking the desktop experience.

---

## Approach
All layout code uses inline styles (no Tailwind classes). The cleanest solution is a shared `useIsMobile` hook that each client component uses to swap style values at 768px breakpoint. No CSS-in-JS library or extra deps needed.

---

## Files to Create

### `lib/useIsMobile.js`
Custom hook using `useState` + `useEffect` with a `resize` listener.
```js
import { useEffect, useState } from "react"
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [breakpoint])
  return isMobile
}
```

### `app/dashboard/DashboardShell.js` (new client component)
Replaces the inline `<div>` in `layout.js`. Handles the flex direction switch and bottom padding for mobile. Renders `<DashboardSidebar>` internally.

```jsx
"use client"
import { useIsMobile } from "@/lib/useIsMobile"
import DashboardSidebar from "./DashboardSidebar"

export default function DashboardShell({ initials, children }) {
  const isMobile = useIsMobile()
  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(circle at top, #2f6f6a 0%, #1f4f4b 100%)",
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
    }}>
      <DashboardSidebar initials={initials} isMobile={isMobile} />
      <main style={{
        flex: 1,
        padding: isMobile ? "1rem" : "2rem",
        overflowY: "auto",
        paddingBottom: isMobile ? "5rem" : "2rem", // space for bottom nav
      }}>
        {children}
      </main>
    </div>
  )
}
```

---

## Files to Modify

### `app/dashboard/layout.js`
- Remove the inline `<div>` wrapper + direct `<DashboardSidebar>` usage
- Import and render `<DashboardShell initials={initials}>` instead
- Layout stays Server Component — DashboardShell handles the client-side mobile logic

### `app/dashboard/DashboardSidebar.js`
When `isMobile` (prop from DashboardShell):
- Render as `position: "fixed", bottom: 0, left: 0, right: 0` bar (height 60px)
- `flexDirection: "row"`, `justifyContent: "space-around"`, full width
- Remove the user avatar from top; add a logout icon button at far right of bottom bar
- Nav icons in a horizontal row — same active indicator (underline instead of left bar: `borderBottom: "3px solid #fff"`)
- Move logout dropdown to open upward (`bottom: "100%"` instead of `top: "100%"`)

Desktop behaviour unchanged (88px wide vertical sidebar).

### `app/dashboard/page.js`
Import `useIsMobile`. Apply to:

| Element | Desktop | Mobile |
|---------|---------|--------|
| Outer wrapper padding | `2rem` | `1rem` |
| Body grid columns | `"2fr 0.5fr"` | `"1fr"` |
| Payment Required + Expiring Soon grid | `"1fr 1fr"` | `"1fr"` |
| Recently Added grid | `"1fr 1fr 1fr 1fr"` | `"1fr 1fr"` |
| Action buttons grid | `"1fr 1fr 1fr"` | `"1fr 1fr 1fr"` (unchanged, small buttons ok) |
| Cardholder photo tiles | 56x56 | 48x48 |

Right sidebar (Company + Cardholders Overview + Credentials) stacks naturally below left column when grid collapses to 1 column.

### `app/dashboard/cardholders/page.js`
Import `useIsMobile`. The cardholder grid (if using multi-column) collapses to single column on mobile. Filter bar wraps instead of overflowing.

---

## Key Decisions
- **Bottom nav on mobile** (not hamburger) — simpler, faster to tap, no overlay needed
- **No new deps** — just a hook + conditional style values
- **isMobile passed as prop** to DashboardSidebar (from DashboardShell, which already has the hook) — avoids calling `useIsMobile` twice

---

## Verification
1. Resize browser to 375px wide — sidebar disappears from left, bottom nav appears
2. Dashboard 2-column grid stacks to single column
3. Payment Required + Expiring Soon stack vertically
4. Recently Added shows 2 columns x 4 rows instead of 4 x 2
5. Bottom nav active state highlights correct route
6. Logout accessible via bottom nav on mobile
7. Resize back to 1200px — desktop layout fully restored
