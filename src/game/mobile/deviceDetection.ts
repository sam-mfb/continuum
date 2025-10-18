/**
 * @fileoverview Device detection utilities for mobile adaptation
 * Determines if the device supports touch input
 */

/**
 * Detects if the current device has touch capability
 * Returns true for phones AND tablets (including iPads)
 * This is used for auto-detecting whether to enable touch controls
 */
export const isTouchDevice = (): boolean => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}
