"use client"

import { LessonRunWorkspace } from "@/components/lesson-run-workspace"

export function CreateLessonBody(props: { defaultMaterialText: string }) {
  return (
    <LessonRunWorkspace
      variant="chat"
      appShellActive="create"
      defaultMaterialText={props.defaultMaterialText}
    />
  )
}
