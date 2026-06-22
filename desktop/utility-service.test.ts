import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { startUtilityService } from './utility-service'

const temporaryDirectories: string[] = []

async function createTemporaryDirectory(): Promise<string> {
	const directory = await mkdtemp(path.join(os.tmpdir(), 'localart-electron-'))
	temporaryDirectories.push(directory)
	return directory
}

afterEach(async () => {
	await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })))
})

describe('startUtilityService', () => {
	test('binds a dynamic loopback port and serves the API and renderer fallback', async () => {
		const projectDirectory = await createTemporaryDirectory()
		const rendererDirectory = path.join(projectDirectory, 'dist')
		await mkdir(rendererDirectory)
		await writeFile(
			path.join(rendererDirectory, 'index.html'),
			'<!doctype html><title>LocalArt test shell</title>'
		)

		const service = await startUtilityService({
			environment: { LOCALART_CANVAS_DIR: './canvas' },
			projectDirectory,
			rendererDirectory,
			serveRenderer: true,
			fetchImplementation: vi.fn(async () => new Response(null, { status: 503 })),
		})

		try {
			expect(service.host).toBe('127.0.0.1')
			expect(service.port).toBeGreaterThan(0)
			expect(await fetch(`${service.origin}/api/health`).then((response) => response.status)).toBe(
				200
			)
			expect(await fetch(`${service.origin}/nested/route`).then((response) => response.text())).toContain(
				'LocalArt test shell'
			)
		} finally {
			await service.close()
		}
	})

	test('rejects a missing production renderer directory', async () => {
		const projectDirectory = await createTemporaryDirectory()
		const rendererDirectory = path.join(projectDirectory, 'missing-dist')

		await expect(
			startUtilityService({
				environment: {},
				projectDirectory,
				rendererDirectory,
				serveRenderer: true,
			})
		).rejects.toThrow(rendererDirectory)
	})
})
