import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { getConfigDir } from './config-dir'

describe('getConfigDir', () => {
	test('uses the Electron user data config directory', () => {
		expect(
			getConfigDir({
				projectDirectory: '/repo',
				userDataDirectory: '/user',
			})
		).toBe(path.join('/user', 'config'))
	})

	test('resolves an explicit override from the project directory', () => {
		expect(
			getConfigDir({
				override: './private',
				projectDirectory: '/repo',
				userDataDirectory: '/user',
			})
		).toBe(path.resolve('/repo', 'private'))
	})
})
