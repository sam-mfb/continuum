/**
 * TypeScript type definitions for AudioWorklet
 * These types are needed for worklet code to compile
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

declare const currentFrame: number
declare const currentTime: number
declare const sampleRate: number
