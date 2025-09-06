/**
 * Integer math utilities to match C behavior exactly
 */

/**
 * Performs C-style integer division (truncation toward zero)
 * In C, when both operands are integers, division truncates toward zero.
 * This is different from Math.floor (rounds toward -infinity) for negative numbers.
 *
 * Examples:
 *   idiv(7, 2) = 3 (same as Math.trunc(7/2))
 *   idiv(-7, 2) = -3 (Math.floor would give -4)
 *   idiv(7, -2) = -3
 *   idiv(-7, -2) = 3
 */
export function idiv(a: number, b: number): number {
  // Ensure we're working with integers
  a = Math.trunc(a)
  b = Math.trunc(b)

  // Perform division and truncate toward zero
  return Math.trunc(a / b)
}

/**
 * Integer modulo operation matching C behavior
 * In C, the sign of the result matches the dividend (first operand)
 */
export function imod(a: number, b: number): number {
  // Ensure we're working with integers
  a = Math.trunc(a)
  b = Math.trunc(b)

  return a % b
}

/**
 * Integer multiplication - ensures result stays as integer
 */
export function imul(a: number, b: number): number {
  // Ensure we're working with integers
  a = Math.trunc(a)
  b = Math.trunc(b)

  return Math.imul(a, b)
}
