/**
 * @fileoverview Tests for mergeControls utility
 */

import { describe, it, expect } from 'vitest'
import { mergeControls } from './mergeControls'

describe('mergeControls', () => {
  it('merges two control sets with OR logic', () => {
    const controls1 = {
      a: true,
      b: false,
      c: true
    }

    const controls2 = {
      a: false,
      b: true,
      c: true
    }

    const result = mergeControls(controls1, controls2)

    expect(result).toEqual({
      a: true, // true OR false = true
      b: true, // false OR true = true
      c: true // true OR true = true
    })
  })

  it('handles all false controls', () => {
    const controls1 = {
      x: false,
      y: false,
      z: false
    }

    const controls2 = {
      x: false,
      y: false,
      z: false
    }

    const result = mergeControls(controls1, controls2)

    expect(result).toEqual({
      x: false,
      y: false,
      z: false
    })
  })

  it('handles all true in first set', () => {
    const controls1 = {
      foo: true,
      bar: true
    }

    const controls2 = {
      foo: false,
      bar: false
    }

    const result = mergeControls(controls1, controls2)

    expect(result).toEqual({
      foo: true,
      bar: true
    })
  })

  it('merges more than two control sets', () => {
    const controls1 = {
      a: true,
      b: false,
      c: false
    }

    const controls2 = {
      a: false,
      b: true,
      c: false
    }

    const controls3 = {
      a: false,
      b: false,
      c: true
    }

    const result = mergeControls(controls1, controls2, controls3)

    expect(result.a).toBe(true)
    expect(result.b).toBe(true)
    expect(result.c).toBe(true)
  })

  it('works with different property names', () => {
    const controls1 = {
      thrust: true,
      shield: false
    }

    const controls2 = {
      thrust: false,
      shield: true
    }

    const result = mergeControls(controls1, controls2)

    expect(result.thrust).toBe(true)
    expect(result.shield).toBe(true)
  })

  it('throws error when called with no arguments', () => {
    expect(() => mergeControls()).toThrow(
      'mergeControls requires at least one control set'
    )
  })
})
