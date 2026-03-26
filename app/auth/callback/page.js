"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    async function handleCallback() {
      const code = new URLSearchParams(window.location.search).get("code")

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          router.replace("/login")
          return
        }
      }

      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.replace("/login")
        return
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role, account_status")
        .eq("id", session.user.id)
        .single()

      if (userError || !userData) {
        router.replace("/login")
        return
      }

      if (userData.account_status !== "active") {
        router.replace("/login?error=inactive")
        return
      }

      const sessionKey = `last_login_updated_${session.user.id}`
      if (!sessionStorage.getItem(sessionKey)) {
        await supabase
          .from("users")
          .update({ last_login: new Date().toISOString() })
          .eq("id", session.user.id)
        sessionStorage.setItem(sessionKey, "1")
      }

      router.replace(userData.role === "qc_admin" ? "/superadmin" : "/dashboard")
    }

    handleCallback()
  }, [router])

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#D9DEE5",
      fontFamily: "Inter, sans-serif",
    }}>
      <p style={{ color: "#5A5452", fontSize: "0.9375rem" }}>Signing you in...</p>
    </div>
  )
}
