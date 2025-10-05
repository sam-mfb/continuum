import { useState, useEffect } from 'react'

/**
 * Hook to detect user inactivity (no mouse or touch events)
 * Returns true if the user has been active recently, false otherwise
 *
 * @param timeout - Milliseconds of inactivity before considering user inactive (default: 3000)
 * @returns boolean - true if user is active, false if inactive
 */
export const useInactivityDetection = (timeout: number = 3000): boolean => {
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    let timeoutId: number | undefined

    const handleActivity = (): void => {
      setIsActive(true)
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId)
      }
      timeoutId = window.setTimeout(() => {
        setIsActive(false)
      }, timeout)
    }

    // Listen for mouse and touch events globally
    window.addEventListener('mousemove', handleActivity)
    window.addEventListener('touchstart', handleActivity)
    window.addEventListener('touchmove', handleActivity)

    // Start the initial timeout (controls visible on mount)
    handleActivity()

    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId)
      }
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('touchstart', handleActivity)
      window.removeEventListener('touchmove', handleActivity)
    }
  }, [timeout])

  return isActive
}
