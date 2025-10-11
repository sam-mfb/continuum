/**
 * Multi-channel audio mixer
 *
 * Manages allocation of 8 audio channels for simultaneous sound playback.
 * Implements priority-based channel selection where higher-priority sounds
 * can interrupt lower-priority sounds.
 *
 * Traced from: orig/Sources/Sound.c (priority system)
 */

import {
  SoundType,
  SOUND_PRIORITIES,
  SOUND_PRIORITY_DECAY,
  SINGLETON_SOUNDS
} from '@/core/sound-shared'
import type { SampleGenerator } from '@/core/sound-shared'
import type { ChannelState, PlayRequest, StopRequest } from './types'
import { MAX_CHANNELS } from './types'

/**
 * Creates a mixer instance for managing multiple audio channels
 *
 * @returns Mixer instance with channel management methods
 */
export function createMixer(): {
  /** Get current state of all channels */
  getChannels(): ReadonlyArray<ChannelState>

  /** Allocate a channel for a sound, returns channel ID or null if can't play */
  allocateChannel(
    soundType: SoundType,
    generator: SampleGenerator
  ): PlayRequest | null

  /** Stop a sound if it's playing */
  stopSound(soundType: SoundType): StopRequest | null

  /** Clear all channels (like original clear_sound()) */
  clearAll(): void

  /** Mark a channel as ended (called when sound completes) */
  markChannelEnded(channelId: number): void

  /** Update priority decay for all active channels (called per frame) */
  updatePriorities(): void

  /** Get the channel currently playing a specific sound type (if any) */
  findChannelPlayingSound(soundType: SoundType): ChannelState | null
} {
  // Initialize 8 channels, all inactive
  const channels: ChannelState[] = Array.from(
    { length: MAX_CHANNELS },
    (_, i) => ({
      id: i,
      soundType: SoundType.NO_SOUND,
      priority: 0,
      active: false,
      generator: null
    })
  )

  /**
   * Find an available channel or the lowest priority channel
   * Returns null if no suitable channel found (new sound priority too low)
   */
  function findChannelForSound(
    _soundType: SoundType,
    priority: number
  ): number | null {
    // First, try to find an inactive channel
    const inactiveChannel = channels.find(ch => !ch.active)
    if (inactiveChannel) {
      return inactiveChannel.id
    }

    // All channels busy - find lowest priority channel
    let lowestPriorityChannel: ChannelState | null = null
    let lowestPriority = priority // Only consider channels with lower priority

    for (const channel of channels) {
      if (channel.priority < lowestPriority) {
        lowestPriority = channel.priority
        lowestPriorityChannel = channel
      }
    }

    // If we found a channel with lower priority, we can claim it
    if (lowestPriorityChannel) {
      return lowestPriorityChannel.id
    }

    // No suitable channel found
    return null
  }

  /**
   * Allocate a channel for playing a sound
   *
   * This implements the priority-based channel allocation system:
   * 1. Check if this is a singleton sound already playing - if so, drop request
   * 2. Find first available (inactive) channel
   * 3. If all busy, find channel with lowest priority
   * 4. If new sound priority > channel priority, claim that channel
   * 5. Otherwise, drop the new sound
   *
   * @param soundType - Type of sound to play
   * @param generator - Generator for producing samples
   * @returns PlayRequest if channel allocated, null if sound should be dropped
   */
  function allocateChannel(
    soundType: SoundType,
    generator: SampleGenerator
  ): PlayRequest | null {
    // Check if this is a singleton sound that's already playing
    // Singleton sounds (thrust, shield, ship explosion, etc.) can only play one instance
    if (SINGLETON_SOUNDS.has(soundType)) {
      const existingChannel = channels.find(
        ch => ch.active && ch.soundType === soundType
      )
      if (existingChannel) {
        // Singleton already playing - drop this request
        return null
      }
    }

    // Get initial priority for this sound type
    const priority = SOUND_PRIORITIES[soundType]

    // Find a suitable channel
    const channelId = findChannelForSound(soundType, priority)
    if (channelId === null) {
      // No channel available, drop this sound
      return null
    }

    // Claim the channel
    const channel = channels[channelId]!
    channel.soundType = soundType
    channel.priority = priority
    channel.active = true
    channel.generator = generator

    return {
      channelId,
      soundType,
      priority,
      generator
    }
  }

  /**
   * Stop a sound if it's currently playing
   *
   * This is used for stopShipThrust() and stopShipShield() to stop
   * the sound if it's active.
   *
   * @param soundType - Type of sound to stop
   * @returns StopRequest if sound was playing, null otherwise
   */
  function stopSound(soundType: SoundType): StopRequest | null {
    // Find channel playing this sound
    const channel = channels.find(ch => ch.active && ch.soundType === soundType)

    if (!channel) {
      // Sound not currently playing
      return null
    }

    // Mark channel as inactive
    channel.active = false
    channel.soundType = SoundType.NO_SOUND
    channel.priority = 0
    channel.generator = null

    return { soundType }
  }

  /**
   * Clear all channels
   *
   * Implements the original game's clear_sound() function which stops
   * all currently playing sounds.
   */
  function clearAll(): void {
    for (const channel of channels) {
      channel.active = false
      channel.soundType = SoundType.NO_SOUND
      channel.priority = 0
      channel.generator = null
    }
  }

  /**
   * Mark a channel as ended
   *
   * Called when a sound completes playing (generator returns true from generateChunk)
   *
   * @param channelId - Channel that ended
   */
  function markChannelEnded(channelId: number): void {
    if (channelId < 0 || channelId >= MAX_CHANNELS) {
      console.warn(`[Mixer] Invalid channel ID: ${channelId}`)
      return
    }

    const channel = channels[channelId]!
    channel.active = false
    channel.soundType = SoundType.NO_SOUND
    channel.priority = 0
    channel.generator = null
  }

  /**
   * Update priority decay for all active channels
   *
   * Based on orig/Sources/Sound.c priority decay system.
   * Some sounds have their priority decrease over time, allowing
   * sounds of the same type to interrupt each other.
   *
   * Should be called once per game frame.
   */
  function updatePriorities(): void {
    for (const channel of channels) {
      if (!channel.active) continue

      const decay = SOUND_PRIORITY_DECAY[channel.soundType]
      if (decay !== undefined) {
        channel.priority = Math.max(0, channel.priority - decay)
      }
    }
  }

  /**
   * Find the channel currently playing a specific sound type
   *
   * @param soundType - Sound type to search for
   * @returns Channel state if found, null otherwise
   */
  function findChannelPlayingSound(soundType: SoundType): ChannelState | null {
    return channels.find(ch => ch.active && ch.soundType === soundType) ?? null
  }

  return {
    getChannels: () => channels as ReadonlyArray<ChannelState>,
    allocateChannel,
    stopSound,
    clearAll,
    markChannelEnded,
    updatePriorities,
    findChannelPlayingSound
  }
}
