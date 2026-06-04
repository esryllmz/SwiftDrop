"use client";

import { useState } from "react";
import { Button, Card, ErrorState, Field, JsonBlock, PageHeader, SecondaryButton } from "@/components/ui";
import { postJson } from "@/lib/api";
import type { AuthResponse } from "@/types/api";

export default function AuthPage() {
  const [registerEmail, setRegisterEmail] = useState("customer@swiftdrop.com");
  const [registerPassword, setRegisterPassword] = useState("123456");
  const [loginEmail, setLoginEmail] = useState("customer@swiftdrop.com");
  const [loginPassword, setLoginPassword] = useState("123456");
  const [response, setResponse] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  async function run(label: string, action: () => Promise<unknown>) {
    setLoading(label);
    setError(null);
    try {
      setResponse(await action());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setResponse(err);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Auth"
        description="Register, login, refresh, and logout through the Gateway."
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <h3 className="text-lg font-semibold text-white">Register</h3>
          <p className="mt-1 text-sm text-slate-400">Public registration always creates CUSTOMER users.</p>
          <div className="mt-4 grid gap-3">
            <Field label="Email" value={registerEmail} onChange={setRegisterEmail} />
            <Field label="Password" type="password" value={registerPassword} onChange={setRegisterPassword} />
            <Button
              disabled={loading !== null}
              onClick={() =>
                run("register", () =>
                  postJson<AuthResponse>("/api/v1/auth/register", {
                    email: registerEmail,
                    password: registerPassword,
                  }),
                )
              }
            >
              {loading === "register" ? "Registering..." : "Register"}
            </Button>
          </div>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold text-white">Login</h3>
          <div className="mt-4 grid gap-3">
            <Field label="Email" value={loginEmail} onChange={setLoginEmail} />
            <Field label="Password" type="password" value={loginPassword} onChange={setLoginPassword} />
            <Button
              disabled={loading !== null}
              onClick={() =>
                run("login", () =>
                  postJson<AuthResponse>("/api/v1/auth/login", {
                    email: loginEmail,
                    password: loginPassword,
                  }),
                )
              }
            >
              {loading === "login" ? "Logging in..." : "Login"}
            </Button>
          </div>
        </Card>
      </div>
      <Card className="mt-4">
        <div className="flex flex-wrap gap-2">
          <SecondaryButton disabled={loading !== null} onClick={() => run("refresh", () => postJson("/api/v1/auth/refresh"))}>
            {loading === "refresh" ? "Refreshing..." : "Refresh"}
          </SecondaryButton>
          <SecondaryButton disabled={loading !== null} onClick={() => run("logout", () => postJson("/api/v1/auth/logout"))}>
            {loading === "logout" ? "Logging out..." : "Logout"}
          </SecondaryButton>
        </div>
        <p className="mt-3 text-sm text-slate-400">
          refreshToken is stored as HttpOnly cookie and cannot be read by JavaScript.
        </p>
      </Card>
      <div className="mt-4 grid gap-4">
        {error ? <ErrorState message={error} /> : null}
        <Card>
          <h3 className="mb-3 text-lg font-semibold text-white">Last response</h3>
          <JsonBlock value={response ?? "No API call yet."} />
        </Card>
      </div>
    </div>
  );
}
