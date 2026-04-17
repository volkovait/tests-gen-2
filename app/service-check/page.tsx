"use client"

import { useCallback, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Activity, ArrowLeft } from "lucide-react"

type CheckState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; payload: unknown }
  | { status: "error"; statusCode: number; payload: unknown }

export default function ServiceCheckPage() {
  const [state, setState] = useState<CheckState>({ status: "idle" })

  const runCheck = useCallback(async () => {
    setState({ status: "loading" })
    try {
      const res = await fetch("/api/backend-health", { cache: "no-store" })
      const payload: unknown = await res.json().catch(() => ({}))
      if (res.ok) {
        setState({ status: "success", payload })
      } else {
        setState({ status: "error", statusCode: res.status, payload })
      }
    } catch (e) {
      setState({
        status: "error",
        statusCode: 0,
        payload: { error: e instanceof Error ? e.message : String(e) },
      })
    }
  }, [])

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-lg space-y-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/upload">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif">
              <Activity className="h-5 w-5 text-primary" />
              Проверка бэкенда
            </CardTitle>
            <CardDescription>
              Запрос к Next API <code className="text-xs">/api/backend-health</code>, который
              обращается к Express static-server (<code className="text-xs">/health</code>).
              Перед проверкой запустите{" "}
              <code className="text-xs">pnpm serve:static</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              type="button"
              onClick={runCheck}
              disabled={state.status === "loading"}
              className="w-full"
            >
              {state.status === "loading" ? (
                <>
                  <Spinner className="mr-2" />
                  Проверяю…
                </>
              ) : (
                "Проверить сервис"
              )}
            </Button>

            {state.status !== "idle" && state.status !== "loading" ? (
              <div
                className={
                  state.status === "success"
                    ? "rounded-lg border border-green-500/30 bg-green-500/5 p-4 text-sm"
                    : "rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
                }
              >
                <p className="mb-2 font-medium text-foreground">
                  {state.status === "success"
                    ? "Успех"
                    : `Ошибка${state.statusCode ? ` (${state.statusCode})` : ""}`}
                </p>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">
                  {JSON.stringify(state.payload, null, 2)}
                </pre>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
