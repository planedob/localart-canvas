import { describe, expect, test, vi } from 'vitest'
import { getModelRouting, saveModelRouting, testModelSlot } from './model-routing'

describe('model routing API', () => {
	test('reads sanitized routing configuration', async () => {
		const body = { primary: { preset: 'ollama' }, backup: { preset: 'aibuff' } }
		const fetchImplementation = vi.fn().mockResolvedValue(
			new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
		)
		await expect(getModelRouting(fetchImplementation)).resolves.toEqual(body)
	})

	test('saves routing and tests a selected slot', async () => {
		const fetchImplementation = vi.fn()
			.mockResolvedValueOnce(new Response(null, { status: 204 }))
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ message: 'OK', model: 'm' }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				})
			)
		await saveModelRouting({ config: {} as never, secretUpdates: {} as never }, fetchImplementation)
		await expect(testModelSlot('backup', fetchImplementation)).resolves.toEqual({ message: 'OK', model: 'm' })
		expect(fetchImplementation.mock.calls[1][1].body).toBe(JSON.stringify({ slot: 'backup' }))
	})
})
