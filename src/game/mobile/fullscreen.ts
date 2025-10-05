/**
 * @fileoverview Fullscreen API utilities with vendor prefix support
 */

/**
 * Request fullscreen mode for the entire document
 */
export const enterFullscreen = async (): Promise<void> => {
  const elem = document.documentElement

  if (elem.requestFullscreen) {
    await elem.requestFullscreen()
  } else if ((elem as any).webkitRequestFullscreen) {
    await (elem as any).webkitRequestFullscreen()
  } else if ((elem as any).mozRequestFullScreen) {
    await (elem as any).mozRequestFullScreen()
  } else if ((elem as any).msRequestFullscreen) {
    await (elem as any).msRequestFullscreen()
  }
}

/**
 * Exit fullscreen mode
 */
export const exitFullscreen = async (): Promise<void> => {
  if (document.exitFullscreen) {
    await document.exitFullscreen()
  } else if ((document as any).webkitExitFullscreen) {
    await (document as any).webkitExitFullscreen()
  } else if ((document as any).mozCancelFullScreen) {
    await (document as any).mozCancelFullScreen()
  } else if ((document as any).msExitFullscreen) {
    await (document as any).msExitFullscreen()
  }
}

/**
 * Check if currently in fullscreen mode
 */
export const isFullscreen = (): boolean => {
  return !!(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullscreenElement
  )
}

/**
 * Toggle fullscreen mode on/off
 */
export const toggleFullscreen = async (): Promise<void> => {
  if (isFullscreen()) {
    await exitFullscreen()
  } else {
    await enterFullscreen()
  }
}
