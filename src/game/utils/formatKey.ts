/**
 * Formats a keyboard event code for display
 * @param keyCode - The keyboard event code (e.g., 'KeyA', 'Space', 'ArrowLeft')
 * @returns A human-readable string representation of the key
 */
export const formatKey = (keyCode: string): string => {
  // Remove 'Key' prefix and make uppercase
  if (keyCode.startsWith('Key')) {
    return keyCode.slice(3)
  }
  // Special keys
  switch (keyCode) {
    case 'Space':
      return 'SPACE'
    case 'Escape':
      return 'ESC'
    case 'Period':
      return '.'
    case 'Slash':
      return '/'
    case 'ArrowLeft':
      return '←'
    case 'ArrowRight':
      return '→'
    case 'ArrowUp':
      return '↑'
    case 'ArrowDown':
      return '↓'
    default:
      return keyCode.toUpperCase()
  }
}
