"use client"

import { useEffect, useState } from "react"
import { AlertTriangle } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { LABELS } from "@/lib/consts"
import { lessonPartialValidationBannerStorageKey } from "@/lib/lessons/lesson-partial-validation-meta"
import type { LessonSourceType } from "@/lib/lessons/save-lesson"

export function LessonPartialValidationBanner(props: {
  lessonId: string
  sourceType: LessonSourceType
  validationWarnings: readonly string[]
}) {
  const [hydrated, setHydrated] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    const key = lessonPartialValidationBannerStorageKey(props.lessonId)
    setDismissed(window.localStorage.getItem(key) === "1")
    setHydrated(true)
  }, [props.lessonId])

  if (props.sourceType !== "pdf" && props.sourceType !== "image") {
    return null
  }
  if (props.validationWarnings.length === 0) {
    return null
  }
  if (!hydrated || dismissed) {
    return null
  }

  const dismiss = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(lessonPartialValidationBannerStorageKey(props.lessonId), "1")
    }
    setDismissed(true)
  }

  return (
    <Alert className="mb-4 border-amber-600/40 bg-amber-50 text-amber-950">
      <AlertTriangle className="text-amber-700" />
      <div className="col-start-2 flex flex-wrap items-start justify-between gap-2">
        <AlertTitle>{LABELS.LESSON_PARTIAL_VALIDATION_ALERT_TITLE}</AlertTitle>
        <Button type="button" variant="ghost" size="sm" className="h-8 shrink-0 text-amber-900" onClick={dismiss}>
          {LABELS.LESSON_PARTIAL_BANNER_DISMISS}
        </Button>
      </div>
      <AlertDescription className="col-start-2 space-y-2 text-amber-900/90">
        <p>{LABELS.LESSON_PARTIAL_VALIDATION_ALERT_INTRO}</p>
        <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="link" className="h-auto p-0 text-amber-900 underline">
              {LABELS.LESSON_PARTIAL_BANNER_DETAILS}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {props.validationWarnings.map((warning, index) => (
                <li key={`${index}-${warning.slice(0, 40)}`}>{warning}</li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      </AlertDescription>
    </Alert>
  )
}
