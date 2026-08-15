import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  isValidMapView,
  parseStoredDefaultMapView,
  resolveDefaultMapView,
} from '../../app/utils/map_default_view.js'
import type { StoredDefaultMapView } from '../../types/maps.js'

const valid: StoredDefaultMapView = {
  name: 'Berlin',
  longitude: 13.405,
  latitude: 52.52,
  zoom: 10.5,
  markerId: null,
}

test('isValidMapView accepts an in-range fractional zoom', () => {
  assert.equal(isValidMapView({ longitude: 13.4, latitude: 52.5, zoom: 10.5 }), true)
})

test('isValidMapView accepts zoom 0 and 22 inclusive', () => {
  assert.equal(isValidMapView({ longitude: 0, latitude: 0, zoom: 0 }), true)
  assert.equal(isValidMapView({ longitude: 0, latitude: 0, zoom: 22 }), true)
})

test('isValidMapView rejects out-of-range latitude', () => {
  assert.equal(isValidMapView({ longitude: 0, latitude: 91, zoom: 3 }), false)
})

test('isValidMapView rejects out-of-range longitude', () => {
  assert.equal(isValidMapView({ longitude: -181, latitude: 0, zoom: 3 }), false)
})

test('isValidMapView rejects zoom outside 0–22', () => {
  assert.equal(isValidMapView({ longitude: 0, latitude: 0, zoom: -0.1 }), false)
  assert.equal(isValidMapView({ longitude: 0, latitude: 0, zoom: 22.1 }), false)
})

test('isValidMapView rejects NaN / non-finite values', () => {
  assert.equal(isValidMapView({ longitude: Number.NaN, latitude: 0, zoom: 3 }), false)
  assert.equal(isValidMapView({ longitude: 0, latitude: Number.POSITIVE_INFINITY, zoom: 3 }), false)
})

test('parseStoredDefaultMapView accepts a JSON string', () => {
  assert.deepEqual(parseStoredDefaultMapView(JSON.stringify(valid)), valid)
})

test('parseStoredDefaultMapView accepts an already-decoded object', () => {
  assert.deepEqual(parseStoredDefaultMapView(valid), valid)
})

test('parseStoredDefaultMapView trims an empty name to null', () => {
  assert.deepEqual(parseStoredDefaultMapView({ ...valid, name: '  ' }), { ...valid, name: null })
})

test('parseStoredDefaultMapView treats a missing name / markerId as null', () => {
  assert.deepEqual(
    parseStoredDefaultMapView({
      longitude: valid.longitude,
      latitude: valid.latitude,
      zoom: valid.zoom,
    }),
    { ...valid, name: null, markerId: null }
  )
})

test('parseStoredDefaultMapView returns null for invalid JSON', () => {
  assert.equal(parseStoredDefaultMapView('{not json'), null)
})

test('parseStoredDefaultMapView returns null for missing coordinates', () => {
  assert.equal(parseStoredDefaultMapView({ name: 'Home', zoom: 8 }), null)
})

test('parseStoredDefaultMapView returns null for a non-integer markerId', () => {
  assert.equal(parseStoredDefaultMapView({ ...valid, markerId: 1.5 }), null)
  assert.equal(parseStoredDefaultMapView({ ...valid, markerId: 0 }), null)
  assert.equal(parseStoredDefaultMapView({ ...valid, markerId: '1' }), null)
})

test('parseStoredDefaultMapView returns null for a non-string name', () => {
  assert.equal(parseStoredDefaultMapView({ ...valid, name: 12 }), null)
})

test('resolveDefaultMapView uses live pin coordinates when the marker exists', () => {
  const stored: StoredDefaultMapView = {
    name: 'Old name',
    longitude: 0,
    latitude: 0,
    zoom: 12,
    markerId: 7,
  }
  const resolved = resolveDefaultMapView(stored, {
    id: 7,
    name: 'Camp',
    longitude: 151.2,
    latitude: -33.86,
  })
  assert.deepEqual(resolved, {
    name: 'Camp',
    longitude: 151.2,
    latitude: -33.86,
    zoom: 12,
    markerId: 7,
    source: 'marker',
  })
})

test('resolveDefaultMapView falls back to the snapshot when the pin is gone', () => {
  const stored: StoredDefaultMapView = {
    name: 'Camp',
    longitude: 151.2,
    latitude: -33.86,
    zoom: 11,
    markerId: 7,
  }
  assert.deepEqual(resolveDefaultMapView(stored, null), {
    ...stored,
    source: 'marker-fallback',
  })
})

test('resolveDefaultMapView ignores a lookup that does not match markerId', () => {
  const stored: StoredDefaultMapView = {
    name: 'Camp',
    longitude: 151.2,
    latitude: -33.86,
    zoom: 11,
    markerId: 7,
  }
  assert.equal(
    resolveDefaultMapView(stored, {
      id: 99,
      name: 'Other',
      longitude: 0,
      latitude: 0,
    }).source,
    'marker-fallback'
  )
})

test('resolveDefaultMapView marks a location with no pin as custom', () => {
  assert.deepEqual(resolveDefaultMapView(valid, null), { ...valid, source: 'custom' })
})
