/**
 * Type definitions for the modern multi-channel sound service
 *
 * This module defines the types used internally by the mixer implementation.
 * The public API (SoundService) is imported from sound/types.ts to ensure
 * backward compatibility.
 */

import type { SoundType } from '@/core/sound-shared'
import type { SampleGenerator } from '@/core/sound-shared'

/**
 * Number of simultaneous audio channels supported by the mixer
 * All 8 channels are available for SFX in Phase 2
 */
export const MAX_CHANNELS = 8

/**
 * Represents the state of a single audio channel
 */
export type ChannelState = {
  /** Channel index (0-7) */
  id: number

  /** Currently playing sound type (NO_SOUND if inactive) */
  soundType: SoundType

  /** Current priority of the sound playing on this channel */
  priority: number

  /** Whether this channel is currently active */
  active: boolean

  /** Generator instance for this channel (null if inactive) */
  generator: SampleGenerator | null
}

/**
 * Request to play a sound on a specific channel
 */
export type PlayRequest = {
  /** Channel to play on */
  channelId: number

  /** Sound type to play */
  soundType: SoundType

  /** Initial priority */
  priority: number

  /** Generator for producing samples */
  generator: SampleGenerator
}

/**
 * Request to stop a continuous sound if it's playing
 */
export type StopRequest = {
  /** Sound type to stop */
  soundType: SoundType
}

/**
 * Mixer configuration
 */
export type MixerConfig = {
  /** Number of channels (always 8 for Phase 2) */
  numChannels: number

  /** Size of ring buffer per channel (must be power of 2) */
  bufferSize: number

  /** Number of samples to generate per chunk */
  chunkSize: number
}

/**
 * Message types sent from main thread to worklet
 */
export enum WorkletMessageType {
  /** Start playing a sound on a channel */
  PLAY = 'play',

  /** Stop a continuous sound if it's playing */
  STOP = 'stop',

  /** Clear all sounds (like original clear_sound()) */
  CLEAR = 'clear',

  /** Update global volume */
  SET_VOLUME = 'setVolume'
}

/**
 * Message types sent from worklet to main thread
 */
export enum WorkletEventType {
  /** A sound has completed playing */
  SOUND_ENDED = 'soundEnded',

  /** Buffer underrun occurred (for debugging) */
  UNDERRUN = 'underrun'
}

/**
 * Play message payload
 */
export type PlayMessage = {
  type: WorkletMessageType.PLAY
  channelId: number
  soundType: SoundType
  priority: number
}

/**
 * Stop message payload
 */
export type StopMessage = {
  type: WorkletMessageType.STOP
  soundType: SoundType
}

/**
 * Clear message payload
 */
export type ClearMessage = {
  type: WorkletMessageType.CLEAR
}

/**
 * Set volume message payload
 */
export type SetVolumeMessage = {
  type: WorkletMessageType.SET_VOLUME
  volume: number
}

/**
 * Union of all message types
 */
export type WorkletMessage =
  | PlayMessage
  | StopMessage
  | ClearMessage
  | SetVolumeMessage

/**
 * Sound ended event payload
 */
export type SoundEndedEvent = {
  type: WorkletEventType.SOUND_ENDED
  channelId: number
  soundType: SoundType
}

/**
 * Underrun event payload
 */
export type UnderrunEvent = {
  type: WorkletEventType.UNDERRUN
  channelId: number
  available: number
  needed: number
}

/**
 * Union of all event types
 */
export type WorkletEvent = SoundEndedEvent | UnderrunEvent
