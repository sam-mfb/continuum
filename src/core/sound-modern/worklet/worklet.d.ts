/**
 * TypeScript declarations for AudioWorklet API
 * These declarations are needed because AudioWorklet runs in a separate context
 */

declare class AudioWorkletProcessor {
  readonly port: MessagePort
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean
}

declare function registerProcessor(
  name: string,
  processorCtor: (new (
    options?: AudioWorkletNodeOptions
  ) => AudioWorkletProcessor) & {
    parameterDescriptors?: AudioParamDescriptor[]
  }
): void

declare const sampleRate: number
declare const currentFrame: number
declare const currentTime: number
