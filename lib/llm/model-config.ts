import {
  getGigaChatModel,
  getGigaChatModelPlanner,
  getGigaChatModelRepair,
  getGigaChatModelSpec,
} from '@/lib/gigachat/config'
import {
  getPolzaModel,
  getPolzaModelPlanner,
  getPolzaModelRepair,
  getPolzaModelSpec,
} from '@/lib/polza/config'

import { getLlmProvider } from './provider'

export function getLlmModel(): string {
  return getLlmProvider() === 'polza' ? getPolzaModel() : getGigaChatModel()
}

export function getLlmModelSpec(): string {
  return getLlmProvider() === 'polza' ? getPolzaModelSpec() : getGigaChatModelSpec()
}

export function getLlmModelRepair(): string {
  return getLlmProvider() === 'polza' ? getPolzaModelRepair() : getGigaChatModelRepair()
}

export function getLlmModelPlanner(): string {
  return getLlmProvider() === 'polza' ? getPolzaModelPlanner() : getGigaChatModelPlanner()
}
