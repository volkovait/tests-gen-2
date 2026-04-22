export interface GigaChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OAuthTokenResponse {
  access_token: string
  expires_at?: number
  /** Some responses use `expires_in` (seconds) instead of `expires_at`. */
  expires_in?: number
}

export interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      role?: string
      content?: string | null
    }
  }>
}
