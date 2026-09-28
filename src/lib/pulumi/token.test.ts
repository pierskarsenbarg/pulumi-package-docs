import { describe, expect, it } from 'vitest'

import {
  findTokenBySlug,
  tokenDisplayName,
  tokenSlug,
} from '@/lib/pulumi/token'

describe('tokenDisplayName', () => {
  it('returns the segment after the last colon for a resource token', () => {
    expect(tokenDisplayName('random:index/randomString:RandomString')).toBe(
      'RandomString',
    )
  })

  it('returns the segment after the last colon for a function token', () => {
    expect(
      tokenDisplayName('random:index/randomInteger:getRandomInteger'),
    ).toBe('getRandomInteger')
  })

  it('returns the token unchanged when it has no colon', () => {
    expect(tokenDisplayName('plainName')).toBe('plainName')
  })
})

describe('tokenSlug', () => {
  it('replaces the token separators with dashes', () => {
    expect(tokenSlug('random:index/randomString:RandomString')).toBe(
      'random-index-randomString-RandomString',
    )
  })

  it('leaves an already-safe token unchanged', () => {
    expect(tokenSlug('plainName')).toBe('plainName')
  })

  it('collapses a run of unsafe characters into a single dash', () => {
    expect(tokenSlug('aws:s3//bucket:Bucket')).toBe('aws-s3-bucket-Bucket')
  })
})

describe('findTokenBySlug', () => {
  const tokens = [
    'random:index/randomString:RandomString',
    'random:index/randomPet:RandomPet',
  ]

  it('finds the token a slug was made from', () => {
    expect(findTokenBySlug(tokens, 'random-index-randomPet-RandomPet')).toBe(
      'random:index/randomPet:RandomPet',
    )
  })

  it('also accepts the raw token', () => {
    expect(
      findTokenBySlug(tokens, 'random:index/randomString:RandomString'),
    ).toBe('random:index/randomString:RandomString')
  })

  it('returns undefined when nothing matches', () => {
    expect(findTokenBySlug(tokens, 'nope')).toBeUndefined()
  })
})
