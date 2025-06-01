/**
 * Checks if we're in a Node.js environment
 */
function isNodeEnvironment(): boolean {
  // Check for Node.js by looking for the 'fs' module availability
  try {
    if (typeof require === 'undefined') {
      return false
    }
    require.resolve('fs')
    return true
  } catch {
    return false
  }
}

/**
 * Reads a binary file and returns its contents as an ArrayBuffer.
 * Works in both Node.js and browser environments.
 * 
 * In Node.js: reads from the file system
 * In browsers: uses fetch() to load the file (must be served via HTTP/HTTPS)
 * 
 * @param filePath - Path to the binary file to read
 * @returns Promise that resolves to an ArrayBuffer containing the file's binary data
 * @throws Error if the file cannot be read
 */
export async function readBinaryFile(filePath: string): Promise<ArrayBuffer> {
  if (isNodeEnvironment()) {
    // Node.js implementation
    const fs = await import('fs/promises')
    
    try {
      // Read file as a Buffer
      const buffer = await fs.readFile(filePath)
      
      // Convert Node.js Buffer to ArrayBuffer
      // Node.js Buffer is a subclass of Uint8Array, so we can access its underlying ArrayBuffer
      return buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      )
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to read binary file '${filePath}': ${error.message}`)
      }
      throw error
    }
  } else {
    // Browser implementation using fetch
    try {
      const response = await fetch(filePath)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.arrayBuffer()
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch binary file '${filePath}': ${error.message}`)
      }
      throw error
    }
  }
}

/**
 * Reads a binary file from a File object (browser only).
 * 
 * @param file - File object from an input element or drag-and-drop
 * @returns Promise that resolves to an ArrayBuffer containing the file's binary data
 */
export async function readBinaryFileFromBlob(file: File | Blob): Promise<ArrayBuffer> {
  // Check if arrayBuffer method is available (modern browsers)
  if (file.arrayBuffer) {
    return file.arrayBuffer()
  }
  
  // Fallback for older environments or test environments
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (): void => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result)
      } else {
        reject(new Error('Failed to read file as ArrayBuffer'))
      }
    }
    reader.onerror = (): void => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Synchronous version of readBinaryFile (Node.js only).
 * 
 * @param filePath - Path to the binary file to read
 * @returns ArrayBuffer containing the file's binary data
 * @throws Error if the file cannot be read or if called in a browser environment
 */
export function readBinaryFileSync(filePath: string): ArrayBuffer {
  if (!isNodeEnvironment()) {
    throw new Error('readBinaryFileSync is only available in Node.js environments. Use readBinaryFile() or readBinaryFileFromBlob() in browsers.')
  }

  const fs = require('fs')
  
  try {
    // Read file as a Buffer
    const buffer = fs.readFileSync(filePath)
    
    // Convert Node.js Buffer to ArrayBuffer
    return buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    )
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to read binary file '${filePath}': ${error.message}`)
    }
    throw error
  }
}