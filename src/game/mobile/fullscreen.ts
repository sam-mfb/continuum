/**
 * @fileoverview Fullscreen API utilities with vendor prefix support
 */

// Type definitions for vendor-prefixed fullscreen API
type DocumentElementWithFullscreen = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>
  mozRequestFullScreen?: () => Promise<void>
  msRequestFullscreen?: () => Promise<void>
}

type DocumentWithFullscreen = Document & {
  webkitExitFullscreen?: () => Promise<void>
  mozCancelFullScreen?: () => Promise<void>
  msExitFullscreen?: () => Promise<void>
  webkitFullscreenElement?: Element
  mozFullScreenElement?: Element
  msFullscreenElement?: Element
}

/**
 * Request fullscreen mode for the entire document
 */
export const enterFullscreen = async (): Promise<void> => {
  const elem = document.documentElement as DocumentElementWithFullscreen

  if (elem.requestFullscreen) {
    await elem.requestFullscreen()
  } else if (elem.webkitRequestFullscreen) {
    await elem.webkitRequestFullscreen()
  } else if (elem.mozRequestFullScreen) {
    await elem.mozRequestFullScreen()
  } else if (elem.msRequestFullscreen) {
    await elem.msRequestFullscreen()
  }
}

/**
 * Exit fullscreen mode
 */
export const exitFullscreen = async (): Promise<void> => {
  const doc = document as DocumentWithFullscreen

  if (doc.exitFullscreen) {
    await doc.exitFullscreen()
  } else if (doc.webkitExitFullscreen) {
    await doc.webkitExitFullscreen()
  } else if (doc.mozCancelFullScreen) {
    await doc.mozCancelFullScreen()
  } else if (doc.msExitFullscreen) {
    await doc.msExitFullscreen()
  }
}

/**
 * Check if currently in fullscreen mode
 */
export const isFullscreen = (): boolean => {
  const doc = document as DocumentWithFullscreen

  return !!(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement
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
