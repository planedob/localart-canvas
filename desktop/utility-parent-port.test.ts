import { describe, expect, test, vi } from 'vitest'
import { getUtilityParentPort } from './utility-parent-port'

describe('getUtilityParentPort', () => {
	test('uses the utility process parentPort', () => {
		const parentPort = { postMessage: vi.fn() }
		expect(getUtilityParentPort({ parentPort })).toBe(parentPort)
	})

	test('rejects a process without an Electron parent port', () => {
		expect(() => getUtilityParentPort({})).toThrow('Electron utility parentPort is unavailable')
	})
})
