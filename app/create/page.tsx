import { readFileSync } from "node:fs"
import { join } from "node:path"

import { CreateLessonBody } from "./create-lesson-body"

export default function CreateLessonPage() {
  let defaultMaterialText = ""
  try {
    defaultMaterialText = readFileSync(join(process.cwd(), "tesing-data", "raw.txt"), "utf8")
  } catch {
    defaultMaterialText = ""
  }
  return <CreateLessonBody defaultMaterialText={defaultMaterialText} />
}
