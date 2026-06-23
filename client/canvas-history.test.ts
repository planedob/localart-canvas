import { describe, expect, test, vi } from 'vitest'
import { listCanvasVersions, restoreCanvasVersion } from './canvas-history'

describe('canvas history api', () => {
	test('lists canvas versions from newest-first endpoint', async () => {
		const fetchImplementation = vi.fn(async () => new Response(JSON.stringify({
			versions: [
				{ id: 'v2', createdAt: '2026-06-24T12:00:00.000Z' },
				{ id: 'v1', createdAt: '2026-06-24T11:00:00.000Z' },
			],
		}))) as unknown as typeof fetch

		await expect(listCanvasVersions(fetchImplementation)).resolves.toEqual([
			{ id: 'v2', createdAt: '2026-06-24T12:00:00.000Z' },
			{ id: 'v1', createdAt: '2026-06-24T11:00:00.000Z' },
		])
		expect(fetchImplementation).toHaveBeenCalledWith('/api/canvas/versions')
	})

	test('restores a canvas version and returns its document snapshot', async () => {
		const document = { store: { 'shape:one': { id: 'shape:one' } } }
		const fetchImplementation = vi.fn(async () => new Response(JSON.stringify({ document }))) as unknown as typeof fetch

		await expect(restoreCanvasVersion('v1', fetchImplementation)).resolves.toEqual(document)
		expect(fetchImplementation).toHaveBeenCalledWith('/api/canvas/versions/v1/restore', { method: 'POST' })
	})

	test('throws a concise error when restore fails', async () => {
		const fetchImplementation = vi.fn(async () => new Response('nope', { status: 404 })) as unknown as typeof fetch

		await expect(restoreCanvasVersion('missing', fetchImplementation)).rejects.toThrow(
			'Canvas version restore failed (404)'
		)
	})
})
