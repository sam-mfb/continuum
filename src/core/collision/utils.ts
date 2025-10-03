export function copy2dArray<T extends number | string>(orig: T[][]): T[][] {
  return orig.map(row => [...row])
}

export function deepFreeze<T>(obj: T): T {
  Object.freeze(obj)
  if (Array.isArray(obj)) {
    obj.forEach(item => deepFreeze(item))
  }
  return obj
}
