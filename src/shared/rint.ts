// Helper to mimic rint(n) - random integer from 0 to n-1
export function rint(n: number): number {
  return Math.floor(Math.random() * n)
}
