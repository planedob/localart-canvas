import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { getUtilityEntryPath, getUtilityWorkingDirectory } from './runtime-paths'

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

describe('getUtilityWorkingDirectory', () => {
	test('uses the repository in development', () => {
		expect(
			getUtilityWorkingDirectory({
				isPackaged: false,
				appPath: '/repo',
				resourcesPath: '/resources',
			})
		).toBe('/repo')
	})

	test('uses the resources directory instead of the app.asar file when packaged', () => {
		expect(
			getUtilityWorkingDirectory({
				isPackaged: true,
				appPath: '/resources/app.asar',
				resourcesPath: '/resources',
			})
		).toBe('/resources')
	})
})
