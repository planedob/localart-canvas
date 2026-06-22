import { describe, expect, it } from 'vitest'
import {
	AI_IMAGE_HOLDER_DEFAULT_PROPS,
	getAIImageHolderGeometry,
} from './AIImageHolderShape'

describe('AIImageHolderShape', () => {
	it('has useful defaults for a generated revision', () => {
		expect(AI_IMAGE_HOLDER_DEFAULT_PROPS).toEqual({
			w: 512,
			h: 512,
			assetUrl: '',
			prompt: '',
			status: 'ready',
		})
	})

	it('uses the shape dimensions for rectangular geometry', () => {
		const geometry = getAIImageHolderGeometry({
			...AI_IMAGE_HOLDER_DEFAULT_PROPS,
			w: 640,
			h: 384,
		})

		expect(geometry.bounds.w).toBe(640)
		expect(geometry.bounds.h).toBe(384)
		expect(geometry.isFilled).toBe(true)
	})
})
