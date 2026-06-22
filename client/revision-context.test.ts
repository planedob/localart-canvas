import { describe, expect, it } from 'vitest'
import { summarizeSelectedShapes } from './revision-context'

describe('summarizeSelectedShapes', () => {
	it('keeps only serializable shape context needed by the local model', () => {
		const summary = summarizeSelectedShapes([
			{
				id: 'shape:box',
				type: 'geo',
				x: 20,
				y: 30,
				rotation: 0.5,
				props: { geo: 'rectangle', w: 100, h: 80, color: 'red' },
				meta: { ignored: true },
			},
		])

		expect(summary).toEqual([
			{
				id: 'shape:box',
				type: 'geo',
				x: 20,
				y: 30,
				rotation: 0.5,
				props: { geo: 'rectangle', w: 100, h: 80, color: 'red' },
			},
		])
	})
})
