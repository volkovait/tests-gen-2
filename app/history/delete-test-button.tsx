"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Trash2, Loader2 } from "lucide-react"
import { LABELS } from "@/lib/consts"

interface DeleteTestButtonProps {
  testId: string
  testTitle: string
}

export function DeleteTestButton({ testId, testTitle }: DeleteTestButtonProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [open, setOpen] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/tests/${testId}`, {
        method: "DELETE"
      })

      if (response.ok) {
        setOpen(false)
        router.refresh()
      } else {
        console.error("[v0] Failed to delete test")
      }
    } catch (error) {
      console.error("[v0] Error deleting test:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{LABELS.DELETE_TEST_TITLE}</AlertDialogTitle>
          <AlertDialogDescription>
            {LABELS.DELETE_TEST_DESCRIPTION.replace("{title}", testTitle)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>{LABELS.DELETE_TEST_CANCEL}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {LABELS.DELETE_TEST_DELETING}
              </>
            ) : (
              LABELS.DELETE_TEST_CONFIRM
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
