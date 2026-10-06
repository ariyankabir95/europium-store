"use client";
import { useState } from "react";
import Page from "@/components/layout/Page";
import AuthForm, { safeNext } from "@/components/auth/AuthForm";
export default function Login() {
    const [mode, setMode] = useState("login");
    return (<Page title={mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : "Reset password"}>
      <AuthForm mode={mode} onModeChange={setMode} getNext={() => safeNext(new URLSearchParams(location.search).get("next"), "/account")}/>
    </Page>);
}
