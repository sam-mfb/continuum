export type DebugOptions = {
  SHOW_COLLISION_MAP: boolean
}

let debug: Partial<DebugOptions> | undefined = undefined

export function enableDebugOption(options: Partial<DebugOptions>): void {
  debug = { ...debug, ...options }
}

export function getDebug(): Partial<DebugOptions> | undefined {
  if (import.meta.env.PROD) {
    return undefined
  }
  return debug
}
