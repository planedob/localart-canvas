import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadCanvasState, saveCanvasState, startCanvasAutosave } from './canvas-persistence'

afterEach(() => {
	vi.useRealTimers()
})

describe('canvas persistence client', () => {
	it('loads a saved editor snapshot', async () => {
		const editor = { loadSnapshot: vi.fn() }
		const fetchImplementation = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ document: { document: { store: {} } } }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		)

		await loadCanvasState(editor, fetchImplementation)

		expect(editor.loadSnapshot).toHaveBeenCalledWith({ document: { store: {} } })
	})

	it('saves the current editor snapshot', async () => {
		const editor = { getSnapshot: vi.fn(() => ({ document: { store: { a: 1 } } })) }
		const fetchImplementation = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))

		await saveCanvasState(editor, fetchImplementation)

		expect(fetchImplementation).toHaveBeenCalledWith('/api/canvas/state', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ document: { store: { a: 1 } } }),
		})
	})

	it('debounces store changes before saving', async () => {
		vi.useFakeTimers()
		let listener: (() => void) | undefined
		const dispose = vi.fn()
		const editor = {
			getSnapshot: vi.fn(() => ({ document: { store: {} } })),
			store: {
				listen: vi.fn((callback: () => void) => {
					listener = callback
					return dispose
				}),
			},
		}
		const fetchImplementation = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))

		const stop = startCanvasAutosave(editor, fetchImplementation, 250)
		listener?.()
		listener?.()
		await vi.advanceTimersByTimeAsync(249)
		expect(fetchImplementation).not.toHaveBeenCalled()
		await vi.advanceTimersByTimeAsync(1)
		expect(fetchImplementation).toHaveBeenCalledTimes(1)

		stop()
		expect(dispose).toHaveBeenCalled()
	})
})
