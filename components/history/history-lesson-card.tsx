"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ArrowRight, Calendar, Sparkles, Trash2 } from "lucide-react"
import { LABELS } from "@/lib/consts"

export type HistoryLessonCardProps = {
  lessonId: string
  title: string
  sourceType: string
  sourceFilename: string | null
  createdAtLabel: string
}

export function HistoryLessonCard({
  lessonId,
  title,
  sourceType,
  sourceFilename,
  createdAtLabel,
}: HistoryLessonCardProps) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleConfirmDelete() {
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/lessons/${lessonId}`, { method: "DELETE" })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        setDeleteError(body?.error ?? LABELS.HISTORY_DELETE_ERROR)
        return
      }
      setConfirmOpen(false)
      router.refresh()
    } catch {
      setDeleteError(LABELS.HISTORY_DELETE_ERROR)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Card className="transition-colors hover:border-primary/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <Link href={`/learn/${lessonId}/view`} className="min-w-0 flex-1">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--lb-gold)]/20">
                  <Sparkles className="h-6 w-6 text-[var(--lb-gold)]" />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-foreground">{title}</h3>
                  <p className="text-sm capitalize text-muted-foreground">{sourceType}</p>
                  {sourceFilename ? (
                    <p className="truncate text-xs text-muted-foreground">{sourceFilename}</p>
                  ) : null}
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {createdAtLabel}
                  </p>
                </div>
              </div>
            </Link>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                aria-label={LABELS.HISTORY_DELETE_ARIA}
                onClick={() => {
                  setDeleteError(null)
                  setConfirmOpen(true)
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/learn/${lessonId}/view`}>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!deleting) {
            setConfirmOpen(open)
            if (!open) setDeleteError(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{LABELS.HISTORY_DELETE_CONFIRM_TITLE}</AlertDialogTitle>
            <AlertDialogDescription>
              {LABELS.HISTORY_DELETE_CONFIRM_DESC}
              {deleteError ? (
                <span className="mt-2 block text-destructive">{deleteError}</span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{LABELS.HISTORY_DELETE_CANCEL}</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={handleConfirmDelete}
            >
              {deleting ? LABELS.HISTORY_DELETE_IN_PROGRESS : LABELS.HISTORY_DELETE_CONFIRM_ACTION}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
