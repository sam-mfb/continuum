/**
 * Tests for multi-channel mixer
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createMixer } from '../mixer'
import {
  SoundType,
  SOUND_PRIORITIES,
  createFireGenerator
} from '@/core/sound-shared'

describe('createMixer', () => {
  let mixer: ReturnType<typeof createMixer>

  beforeEach(() => {
    mixer = createMixer()
  })

  describe('initial state', () => {
    it('creates 8 inactive channels', () => {
      const channels = mixer.getChannels()
      expect(channels).toHaveLength(8)
      expect(channels.every(ch => !ch.active)).toBe(true)
      expect(channels.every(ch => ch.soundType === SoundType.NO_SOUND)).toBe(
        true
      )
    })
  })

  describe('allocateChannel', () => {
    it('allocates first available channel for new sound', () => {
      const generator = createFireGenerator()
      const request = mixer.allocateChannel(SoundType.FIRE_SOUND, generator)

      expect(request).not.toBeNull()
      expect(request!.channelId).toBe(0)
      expect(request!.soundType).toBe(SoundType.FIRE_SOUND)
      expect(request!.priority).toBe(SOUND_PRIORITIES[SoundType.FIRE_SOUND])

      const channels = mixer.getChannels()
      expect(channels[0]!.active).toBe(true)
      expect(channels[0]!.soundType).toBe(SoundType.FIRE_SOUND)
    })

    it('allocates multiple channels for different sounds', () => {
      const gen1 = createFireGenerator()
      const gen2 = createFireGenerator()
      const gen3 = createFireGenerator()

      const req1 = mixer.allocateChannel(SoundType.FIRE_SOUND, gen1)
      const req2 = mixer.allocateChannel(SoundType.EXP1_SOUND, gen2)
      const req3 = mixer.allocateChannel(SoundType.BUNK_SOUND, gen3)

      expect(req1!.channelId).toBe(0)
      expect(req2!.channelId).toBe(1)
      expect(req3!.channelId).toBe(2)

      const channels = mixer.getChannels()
      expect(channels[0]!.soundType).toBe(SoundType.FIRE_SOUND)
      expect(channels[1]!.soundType).toBe(SoundType.EXP1_SOUND)
      expect(channels[2]!.soundType).toBe(SoundType.BUNK_SOUND)
    })

    it('can allocate all 8 channels', () => {
      const requests = []
      for (let i = 0; i < 8; i++) {
        const gen = createFireGenerator()
        requests.push(mixer.allocateChannel(SoundType.FIRE_SOUND, gen))
      }

      expect(requests.every(req => req !== null)).toBe(true)
      expect(requests.map(req => req!.channelId)).toEqual([
        0, 1, 2, 3, 4, 5, 6, 7
      ])

      const channels = mixer.getChannels()
      expect(channels.every(ch => ch.active)).toBe(true)
    })

    it('interrupts lower-priority sound when all channels busy', () => {
      // Fill all channels with low-priority sounds (SOFT_SOUND priority=30)
      for (let i = 0; i < 8; i++) {
        mixer.allocateChannel(SoundType.SOFT_SOUND, createFireGenerator())
      }

      // Try to play high-priority sound (FIRE_SOUND priority=70)
      const request = mixer.allocateChannel(
        SoundType.FIRE_SOUND,
        createFireGenerator()
      )

      expect(request).not.toBeNull()
      expect(request!.soundType).toBe(SoundType.FIRE_SOUND)

      // Should have interrupted a SOFT_SOUND
      const channels = mixer.getChannels()
      const fireSounds = channels.filter(
        ch => ch.soundType === SoundType.FIRE_SOUND
      )
      const softSounds = channels.filter(
        ch => ch.soundType === SoundType.SOFT_SOUND
      )

      expect(fireSounds).toHaveLength(1)
      expect(softSounds).toHaveLength(7)
    })

    it('drops sound if priority too low and all channels busy', () => {
      // Fill all channels with high-priority sounds (FIRE_SOUND priority=70)
      for (let i = 0; i < 8; i++) {
        mixer.allocateChannel(SoundType.FIRE_SOUND, createFireGenerator())
      }

      // Try to play low-priority sound (SOFT_SOUND priority=30)
      const request = mixer.allocateChannel(
        SoundType.SOFT_SOUND,
        createFireGenerator()
      )

      expect(request).toBeNull()

      // All channels should still have FIRE_SOUND
      const channels = mixer.getChannels()
      expect(channels.every(ch => ch.soundType === SoundType.FIRE_SOUND)).toBe(
        true
      )
    })

    it('allocates thrust sound (no special continuous handling)', () => {
      const generator = createFireGenerator()
      const request = mixer.allocateChannel(SoundType.THRU_SOUND, generator)

      expect(request).not.toBeNull()
      expect(request!.soundType).toBe(SoundType.THRU_SOUND)

      const channels = mixer.getChannels()
      expect(channels[request!.channelId]!.active).toBe(true)
      expect(channels[request!.channelId]!.soundType).toBe(SoundType.THRU_SOUND)
    })

    it('interrupts channel with exactly equal priority', () => {
      // Play a FIRE_SOUND (priority 70)
      mixer.allocateChannel(SoundType.FIRE_SOUND, createFireGenerator())

      // Fill remaining 7 channels with same priority
      for (let i = 0; i < 7; i++) {
        mixer.allocateChannel(SoundType.FIRE_SOUND, createFireGenerator())
      }

      // All 8 channels now have FIRE_SOUND at priority 70
      // Try to play another FIRE_SOUND - should fail (priority not HIGHER)
      const request = mixer.allocateChannel(
        SoundType.FIRE_SOUND,
        createFireGenerator()
      )

      expect(request).toBeNull()
    })

    it('interrupts channel with lower priority after decay', () => {
      // Play a FIRE_SOUND (priority 70, decays by 5 per frame)
      const req1 = mixer.allocateChannel(
        SoundType.FIRE_SOUND,
        createFireGenerator()
      )
      expect(req1).not.toBeNull()

      // Decay priorities once
      mixer.updatePriorities()

      // Fire sound now at priority 65
      const channels = mixer.getChannels()
      expect(channels[req1!.channelId]!.priority).toBe(65)

      // Fill remaining channels with priority 60
      for (let i = 0; i < 7; i++) {
        mixer.allocateChannel(SoundType.FIRE_SOUND, createFireGenerator())
        // Decay once so they're at 55
        mixer.updatePriorities()
      }

      // Now try to play FIRE_SOUND (initial priority 70)
      // Should interrupt one of the decayed sounds
      const req2 = mixer.allocateChannel(
        SoundType.FIRE_SOUND,
        createFireGenerator()
      )
      expect(req2).not.toBeNull()
    })
  })

  describe('stopSound', () => {
    it('stops a playing sound by type', () => {
      // Start thrust sound
      const request = mixer.allocateChannel(
        SoundType.THRU_SOUND,
        createFireGenerator()
      )
      expect(request).not.toBeNull()

      const channelId = request!.channelId
      expect(mixer.getChannels()[channelId]!.active).toBe(true)

      // Stop it
      const stopRequest = mixer.stopSound(SoundType.THRU_SOUND)
      expect(stopRequest).not.toBeNull()
      expect(stopRequest!.soundType).toBe(SoundType.THRU_SOUND)

      // Channel should now be inactive
      expect(mixer.getChannels()[channelId]!.active).toBe(false)
    })

    it('returns null if sound not playing', () => {
      const stopRequest = mixer.stopSound(SoundType.THRU_SOUND)
      expect(stopRequest).toBeNull()
    })

    it('stops any sound type (not just continuous sounds)', () => {
      // Play a fire sound
      mixer.allocateChannel(SoundType.FIRE_SOUND, createFireGenerator())

      // Stop it with stopSound
      const stopRequest = mixer.stopSound(SoundType.FIRE_SOUND)
      expect(stopRequest).not.toBeNull()

      // Sound should be stopped
      const channels = mixer.getChannels()
      expect(channels[0]!.active).toBe(false)
    })
  })

  describe('clearAll', () => {
    it('clears all active channels', () => {
      // Fill all channels
      for (let i = 0; i < 8; i++) {
        mixer.allocateChannel(SoundType.FIRE_SOUND, createFireGenerator())
      }

      expect(mixer.getChannels().every(ch => ch.active)).toBe(true)

      // Clear all
      mixer.clearAll()

      // All channels should be inactive
      const channels = mixer.getChannels()
      expect(channels.every(ch => !ch.active)).toBe(true)
      expect(channels.every(ch => ch.soundType === SoundType.NO_SOUND)).toBe(
        true
      )
    })

    it('works on empty mixer', () => {
      mixer.clearAll() // Should not throw
      expect(mixer.getChannels().every(ch => !ch.active)).toBe(true)
    })
  })

  describe('markChannelEnded', () => {
    it('marks channel as inactive', () => {
      const request = mixer.allocateChannel(
        SoundType.FIRE_SOUND,
        createFireGenerator()
      )
      const channelId = request!.channelId

      expect(mixer.getChannels()[channelId]!.active).toBe(true)

      mixer.markChannelEnded(channelId)

      expect(mixer.getChannels()[channelId]!.active).toBe(false)
      expect(mixer.getChannels()[channelId]!.soundType).toBe(SoundType.NO_SOUND)
    })

    it('handles invalid channel ID gracefully', () => {
      expect(() => mixer.markChannelEnded(-1)).not.toThrow()
      expect(() => mixer.markChannelEnded(999)).not.toThrow()
    })
  })

  describe('updatePriorities', () => {
    it('decays FIRE_SOUND priority by 5', () => {
      const request = mixer.allocateChannel(
        SoundType.FIRE_SOUND,
        createFireGenerator()
      )
      const channelId = request!.channelId

      const initialPriority = SOUND_PRIORITIES[SoundType.FIRE_SOUND]
      expect(mixer.getChannels()[channelId]!.priority).toBe(initialPriority)

      mixer.updatePriorities()
      expect(mixer.getChannels()[channelId]!.priority).toBe(initialPriority - 5)

      mixer.updatePriorities()
      expect(mixer.getChannels()[channelId]!.priority).toBe(
        initialPriority - 10
      )
    })

    it('decays BUNK_SOUND priority by 1', () => {
      const request = mixer.allocateChannel(
        SoundType.BUNK_SOUND,
        createFireGenerator()
      )
      const channelId = request!.channelId

      const initialPriority = SOUND_PRIORITIES[SoundType.BUNK_SOUND]
      mixer.updatePriorities()
      expect(mixer.getChannels()[channelId]!.priority).toBe(initialPriority - 1)
    })

    it('does not decay THRU_SOUND priority', () => {
      const request = mixer.allocateChannel(
        SoundType.THRU_SOUND,
        createFireGenerator()
      )
      const channelId = request!.channelId

      const initialPriority = SOUND_PRIORITIES[SoundType.THRU_SOUND]
      mixer.updatePriorities()
      expect(mixer.getChannels()[channelId]!.priority).toBe(initialPriority)
    })

    it('does not decay EXP2_SOUND priority (ship explosion)', () => {
      const request = mixer.allocateChannel(
        SoundType.EXP2_SOUND,
        createFireGenerator()
      )
      const channelId = request!.channelId

      const initialPriority = SOUND_PRIORITIES[SoundType.EXP2_SOUND]
      mixer.updatePriorities()
      expect(mixer.getChannels()[channelId]!.priority).toBe(initialPriority)
    })

    it('does not decay below zero', () => {
      const request = mixer.allocateChannel(
        SoundType.FIRE_SOUND,
        createFireGenerator()
      )
      const channelId = request!.channelId

      // Decay many times
      for (let i = 0; i < 50; i++) {
        mixer.updatePriorities()
      }

      expect(mixer.getChannels()[channelId]!.priority).toBe(0)
    })

    it('only updates active channels', () => {
      const request = mixer.allocateChannel(
        SoundType.FIRE_SOUND,
        createFireGenerator()
      )
      const channelId = request!.channelId

      mixer.markChannelEnded(channelId)

      // Update priorities - should not affect inactive channel
      mixer.updatePriorities()
      expect(mixer.getChannels()[channelId]!.priority).toBe(0)
    })
  })

  describe('findChannelPlayingSound', () => {
    it('finds channel playing specific sound', () => {
      mixer.allocateChannel(SoundType.FIRE_SOUND, createFireGenerator())
      mixer.allocateChannel(SoundType.THRU_SOUND, createFireGenerator())

      const channel = mixer.findChannelPlayingSound(SoundType.THRU_SOUND)
      expect(channel).not.toBeNull()
      expect(channel!.soundType).toBe(SoundType.THRU_SOUND)
    })

    it('returns null if sound not playing', () => {
      const channel = mixer.findChannelPlayingSound(SoundType.FIRE_SOUND)
      expect(channel).toBeNull()
    })

    it('returns first matching channel if multiple playing', () => {
      mixer.allocateChannel(SoundType.FIRE_SOUND, createFireGenerator())
      mixer.allocateChannel(SoundType.FIRE_SOUND, createFireGenerator())

      const channel = mixer.findChannelPlayingSound(SoundType.FIRE_SOUND)
      expect(channel).not.toBeNull()
      expect(channel!.id).toBe(0) // First channel
    })
  })

  describe('singleton sounds', () => {
    it('prevents duplicate thrust sounds from playing simultaneously', () => {
      // Allocate thrust on first channel
      const req1 = mixer.allocateChannel(
        SoundType.THRU_SOUND,
        createFireGenerator()
      )
      expect(req1).not.toBeNull()
      expect(req1!.channelId).toBe(0)

      // Try to allocate another thrust - should be rejected
      const req2 = mixer.allocateChannel(
        SoundType.THRU_SOUND,
        createFireGenerator()
      )
      expect(req2).toBeNull()

      // Verify only one thrust sound is playing
      const channels = mixer.getChannels()
      const thrustChannels = channels.filter(
        ch => ch.soundType === SoundType.THRU_SOUND
      )
      expect(thrustChannels).toHaveLength(1)
    })

    it('prevents duplicate shield sounds', () => {
      mixer.allocateChannel(SoundType.SHLD_SOUND, createFireGenerator())
      const req2 = mixer.allocateChannel(
        SoundType.SHLD_SOUND,
        createFireGenerator()
      )
      expect(req2).toBeNull()
    })

    it('prevents duplicate ship explosion sounds', () => {
      mixer.allocateChannel(SoundType.EXP2_SOUND, createFireGenerator())
      const req2 = mixer.allocateChannel(
        SoundType.EXP2_SOUND,
        createFireGenerator()
      )
      expect(req2).toBeNull()
    })

    it('prevents duplicate fizz sounds', () => {
      mixer.allocateChannel(SoundType.FIZZ_SOUND, createFireGenerator())
      const req2 = mixer.allocateChannel(
        SoundType.FIZZ_SOUND,
        createFireGenerator()
      )
      expect(req2).toBeNull()
    })

    it('prevents duplicate echo sounds', () => {
      mixer.allocateChannel(SoundType.ECHO_SOUND, createFireGenerator())
      const req2 = mixer.allocateChannel(
        SoundType.ECHO_SOUND,
        createFireGenerator()
      )
      expect(req2).toBeNull()
    })

    it('allows multiple fire sounds (not a singleton)', () => {
      const req1 = mixer.allocateChannel(
        SoundType.FIRE_SOUND,
        createFireGenerator()
      )
      const req2 = mixer.allocateChannel(
        SoundType.FIRE_SOUND,
        createFireGenerator()
      )

      expect(req1).not.toBeNull()
      expect(req2).not.toBeNull()
      expect(req1!.channelId).not.toBe(req2!.channelId)

      const channels = mixer.getChannels()
      const fireChannels = channels.filter(
        ch => ch.soundType === SoundType.FIRE_SOUND
      )
      expect(fireChannels).toHaveLength(2)
    })

    it('allows multiple bunker explosions (not a singleton)', () => {
      const req1 = mixer.allocateChannel(
        SoundType.EXP1_SOUND,
        createFireGenerator()
      )
      const req2 = mixer.allocateChannel(
        SoundType.EXP1_SOUND,
        createFireGenerator()
      )

      expect(req1).not.toBeNull()
      expect(req2).not.toBeNull()
    })

    it('allows singleton to play again after previous instance ends', () => {
      // Play thrust
      const req1 = mixer.allocateChannel(
        SoundType.THRU_SOUND,
        createFireGenerator()
      )
      expect(req1).not.toBeNull()

      // Try to play again - blocked
      const req2 = mixer.allocateChannel(
        SoundType.THRU_SOUND,
        createFireGenerator()
      )
      expect(req2).toBeNull()

      // End the first thrust
      mixer.markChannelEnded(req1!.channelId)

      // Now we can play thrust again
      const req3 = mixer.allocateChannel(
        SoundType.THRU_SOUND,
        createFireGenerator()
      )
      expect(req3).not.toBeNull()
    })
  })

  describe('complex scenarios', () => {
    it('handles rapid allocation and deallocation', () => {
      // Allocate 4 sounds
      const req1 = mixer.allocateChannel(
        SoundType.FIRE_SOUND,
        createFireGenerator()
      )!
      mixer.allocateChannel(SoundType.BUNK_SOUND, createFireGenerator())!
      const req3 = mixer.allocateChannel(
        SoundType.FIRE_SOUND,
        createFireGenerator()
      )!
      mixer.allocateChannel(SoundType.THRU_SOUND, createFireGenerator())!

      // End first and third
      mixer.markChannelEnded(req1.channelId)
      mixer.markChannelEnded(req3.channelId)

      // Allocate two more - should reuse freed channels
      const req5 = mixer.allocateChannel(
        SoundType.EXP1_SOUND,
        createFireGenerator()
      )!
      const req6 = mixer.allocateChannel(
        SoundType.FUEL_SOUND,
        createFireGenerator()
      )!

      // Should have reused channels 0 and 2
      expect([req5.channelId, req6.channelId].sort()).toEqual([0, 2])

      // Verify state
      const channels = mixer.getChannels()
      expect(channels.filter(ch => ch.active).length).toBe(4)
    })

    it('priority system allows same sound to interrupt itself after decay', () => {
      // Fill all 8 channels with FIRE_SOUND (priority 70, decays by 5)
      for (let i = 0; i < 8; i++) {
        mixer.allocateChannel(SoundType.FIRE_SOUND, createFireGenerator())
      }

      // All channels busy with FIRE_SOUND at priority 70
      // Try to play FIRE_SOUND - should fail (not higher priority)
      let request = mixer.allocateChannel(
        SoundType.FIRE_SOUND,
        createFireGenerator()
      )
      expect(request).toBeNull()

      // Decay priorities once
      mixer.updatePriorities()

      // All FIRE_SOUND now at priority 65
      // New FIRE_SOUND at 70 should interrupt one of the decayed FIRE_SOUND
      request = mixer.allocateChannel(
        SoundType.FIRE_SOUND,
        createFireGenerator()
      )
      expect(request).not.toBeNull()

      // Verify all 8 channels still have FIRE_SOUND (interrupted one, added new one)
      const channels = mixer.getChannels()
      expect(
        channels.filter(ch => ch.soundType === SoundType.FIRE_SOUND).length
      ).toBe(8)

      // One should be at priority 70 (the new one)
      // Seven should be at priority 65 (the decayed ones)
      const priorities = channels.map(ch => ch.priority).sort((a, b) => b - a)
      expect(priorities).toEqual([70, 65, 65, 65, 65, 65, 65, 65])
    })
  })
})
