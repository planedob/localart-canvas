import { describe, expect, test } from 'vitest'
import { getApiTarget } from './api-target'

describe('getApiTarget', () => {
	test('uses the browser development server default', () => {
		expect(getApiTarget({})).toBe('http://127.0.0.1:3001')
	})

	test('accepts a dynamic loopback target', () => {
		expect(getApiTarget({ LOCALART_API_TARGET: 'http://127.0.0.1:43123/' })).toBe(
			'http://127.0.0.1:43123'
		)
	})

	test('rejects a non-loopback target', () => {
		expect(() => getApiTarget({ LOCALART_API_TARGET: 'http://example.com:3001' })).toThrow(
			'LOCALART_API_TARGET must use http://127.0.0.1'
		)
	})
})
