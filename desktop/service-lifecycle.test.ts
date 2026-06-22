import { describe, expect, test } from 'vitest'
import { reduceServiceState } from './service-lifecycle'

describe('reduceServiceState', () => {
	test('becomes ready with a valid dynamic port', () => {
		expect(reduceServiceState({ status: 'starting' }, { type: 'ready', port: 43_123 })).toEqual({
			status: 'ready',
			port: 43_123,
		})
	})

	test('reports startup errors', () => {
		expect(
			reduceServiceState({ status: 'starting' }, { type: 'error', message: 'boom' })
		).toEqual({ status: 'failed', message: 'boom' })
	})

	test('reports an exit before ready', () => {
		expect(reduceServiceState({ status: 'starting' }, { type: 'exit', code: 1 })).toEqual({
			status: 'failed',
			message: 'LocalArt service exited before ready (code 1)',
		})
	})

	test('rejects invalid ready ports', () => {
		expect(reduceServiceState({ status: 'starting' }, { type: 'ready', port: 0 })).toEqual({
			status: 'failed',
			message: 'LocalArt service reported an invalid port: 0',
		})
	})

	test('reports an exit after ready', () => {
		expect(reduceServiceState({ status: 'ready', port: 43_123 }, { type: 'exit', code: 9 })).toEqual({
			status: 'failed',
			message: 'LocalArt service exited unexpectedly (code 9)',
		})
	})
})
