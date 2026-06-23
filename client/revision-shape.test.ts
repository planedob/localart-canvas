import { describe, expect, it } from 'vitest'
import { insertGeneratedRevisionShape } from './revision-shape'
import { AI_IMAGE_HOLDER_TYPE } from './shapes/ai-image-holder-model'

describe('insertGeneratedRevisionShape', () => {
	it('creates and selects an AI image holder for the generated asset', () => {
		const createdShapes: unknown[] = []
		const selectedIds: unknown[] = []
		const editor = {
			getSelectionPageBounds: () => ({ x: 100, y: 80, w: 300, h: 200 }),
			getViewportPageBounds: () => ({ x: 0, y: 0, w: 1200, h: 800 }),
			createShape: (shape: unknown) => createdShapes.push(shape),
			select: (id: unknown) => selectedIds.push(id),
		}

		insertGeneratedRevisionShape(
			editor,
			{ url: '/assets/generated.png' },
			'minimalist green triangle',
			() => 'shape:generated'
		)

		expect(createdShapes).toEqual([
			expect.objectContaining({
				id: 'shape:generated',
				type: AI_IMAGE_HOLDER_TYPE,
				x: 448,
				y: 80,
				props: expect.objectContaining({
					assetUrl: '/assets/generated.png',
					prompt: 'minimalist green triangle',
					status: 'ready',
				}),
			}),
		])
		expect(selectedIds).toEqual(['shape:generated'])
	})
})
