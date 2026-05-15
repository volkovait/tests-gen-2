import { MemorySaver } from '@langchain/langgraph'
import type { BaseCheckpointSaver } from '@langchain/langgraph'
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres'

let memorySaver: MemorySaver | null = null
let postgresSaver: PostgresSaver | null = null

export async function getLessonGenerationCheckpointer(): Promise<BaseCheckpointSaver> {
  const connectionString =
    process.env.POSTGRES_URL?.trim() || process.env.DATABASE_URL?.trim() || process.env.SUPABASE_DB_URL?.trim()
  if (connectionString) {
    if (!postgresSaver) {
      postgresSaver = PostgresSaver.fromConnString(connectionString)
      await postgresSaver.setup()
    }
    return postgresSaver
  }
  memorySaver ??= new MemorySaver()
  return memorySaver
}
