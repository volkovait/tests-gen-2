import { DOMMatrix, ImageData, Path2D } from '@napi-rs/canvas'

/**
 * pdf.js (via pdf-parse) expects browser canvas geometry globals at module load time.
 * Node does not provide them; @napi-rs/canvas does.
 * This module must load before any import of `pdf-parse`.
 */
function defineGlobalIfMissing(name: 'DOMMatrix' | 'Path2D' | 'ImageData', implementation: unknown): void {
  if (Reflect.get(globalThis, name) !== undefined) {
    return
  }
  Reflect.defineProperty(globalThis, name, {
    value: implementation,
    writable: true,
    configurable: true,
  })
}

defineGlobalIfMissing('DOMMatrix', DOMMatrix)
defineGlobalIfMissing('Path2D', Path2D)
defineGlobalIfMissing('ImageData', ImageData)
