import { describe, expect, it } from 'vitest'
import { getRevisionPlacement, summarizeSelectedShapes } from './revision-context'

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

describe('getRevisionPlacement', () => {
	it('places a revision to the right of the selected source bounds', () => {
		expect(
			getRevisionPlacement(
				{ x: 100, y: 80, w: 300, h: 200 },
				{ w: 512, h: 512 },
				{ x: 0, y: 0, w: 1200, h: 800 }
			)
		).toEqual({ x: 448, y: 80 })
	})

	it('centers a revision in the viewport when nothing is selected', () => {
		expect(
			getRevisionPlacement(
				null,
				{ w: 400, h: 300 },
				{ x: 100, y: 50, w: 1000, h: 700 }
			)
		).toEqual({ x: 400, y: 250 })
	})
})
