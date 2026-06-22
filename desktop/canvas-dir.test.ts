import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { getCanvasDir } from './canvas-dir'

describe('getCanvasDir', () => {
	test('resolves an explicit override from the project directory', () => {
		expect(
			getCanvasDir({
				override: './external',
				isPackaged: true,
				projectDirectory: '/repo',
				userDataDirectory: '/user',
			})
		).toBe(path.resolve('/repo', 'external'))
	})

	test('uses repository canvas in development', () => {
		expect(
			getCanvasDir({
				isPackaged: false,
				projectDirectory: '/repo',
				userDataDirectory: '/user',
			})
		).toBe(path.join('/repo', 'canvas'))
	})

	test('uses userData canvas when packaged', () => {
		expect(
			getCanvasDir({
				isPackaged: true,
				projectDirectory: '/repo',
				userDataDirectory: '/user',
			})
		).toBe(path.join('/user', 'canvas'))
	})
})
