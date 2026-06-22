import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { getUtilityEntryPath } from './runtime-paths'

describe('getUtilityEntryPath', () => {
	test('uses the local desktop bundle in development', () => {
		expect(
			getUtilityEntryPath({
				isPackaged: false,
				appPath: '/repo',
				resourcesPath: '/resources',
			})
		).toBe(path.join('/repo', '.desktop', 'utility.cjs'))
	})

	test('uses the unpacked utility entry when packaged', () => {
		expect(
			getUtilityEntryPath({
				isPackaged: true,
				appPath: '/resources/app.asar',
				resourcesPath: '/resources',
			})
		).toBe(path.join('/resources', 'app.asar.unpacked', '.desktop', 'utility.cjs'))
	})
})
