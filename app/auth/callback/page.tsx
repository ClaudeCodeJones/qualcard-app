"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    async function handleCallback() {
      // Supabase JS automatically exchanges the ?code= param for a session
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        router.push("/login");
        return;
      }

      const { data: userData } = await supabase
        .from("users")
        .select("role, account_status")
        .eq("id", session.user.id)
        .single();

      if (!userData || userData.account_status !== "active") {
        await supabase.auth.signOut();
        router.push("/login?error=inactive");
        return;
      }

      const sessionKey = `last_login_updated_${session.user.id}`;
      if (!sessionStorage.getItem(sessionKey)) {
        await supabase
          .from("users")
          .update({ last_login: new Date().toISOString() })
          .eq("id", session.user.id);
        sessionStorage.setItem(sessionKey, "1");
      }

      router.push(userData.role === "qc_admin" ? "/superadmin" : "/dashboard");
    }

    handleCallback();
  }, [router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#D9DEE5",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <p style={{ color: "#2C3E50", fontSize: "14px" }}>Completing sign in…</p>
    </div>
  );
}
