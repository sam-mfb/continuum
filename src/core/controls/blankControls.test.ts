/**
 * @fileoverview Tests for blankControls utility
 */

import { describe, it, expect } from 'vitest'
import { blankControls } from './blankControls'

describe('blankControls', () => {
  it('creates blank controls with all values false', () => {
    const source = {
      a: true,
      b: true,
      c: true
    }

    const result = blankControls(source)

    expect(result).toEqual({
      a: false,
      b: false,
      c: false
    })
  })

  it('preserves keys from source regardless of their values', () => {
    const source = {
      foo: false,
      bar: false,
      baz: false
    }

    const result = blankControls(source)

    expect(result).toEqual({
      foo: false,
      bar: false,
      baz: false
    })
  })

  it('applies overrides to specific controls', () => {
    const source = {
      a: true,
      b: true,
      c: true
    }

    const result = blankControls(source, { b: true })

    expect(result).toEqual({
      a: false,
      b: true,
      c: false
    })
  })

  it('applies multiple overrides', () => {
    const source = {
      x: true,
      y: true,
      z: true
    }

    const result = blankControls(source, { x: true, z: true })

    expect(result).toEqual({
      x: true,
      y: false,
      z: true
    })
  })

  it('works with no overrides', () => {
    const source = {
      thrust: true,
      fire: true,
      shield: true
    }

    const result = blankControls(source, {})

    expect(result).toEqual({
      thrust: false,
      fire: false,
      shield: false
    })
  })

  it('handles source with different property names', () => {
    const source = {
      propA: true,
      propB: false,
      propC: true
    }

    const result = blankControls(source, { propC: true })

    expect(result.propA).toBe(false)
    expect(result.propB).toBe(false)
    expect(result.propC).toBe(true)
  })
})
