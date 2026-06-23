import type { GenerationResponse } from './local-api'
import { getRevisionPlacement } from './revision-context'
import {
	AI_IMAGE_HOLDER_DEFAULT_PROPS,
	AI_IMAGE_HOLDER_TYPE,
} from './shapes/ai-image-holder-model'

type Bounds = {
	x: number
	y: number
	w: number
	h: number
}

type RevisionEditor<ShapeId extends string> = {
	getSelectionPageBounds(): Bounds | null | undefined
	getViewportPageBounds(): Bounds
	createShape<T>(shape: T): void
	select(id: ShapeId): void
}

type ShapeIdFactory<ShapeId extends string> = () => ShapeId

export function insertGeneratedRevisionShape<ShapeId extends string>(
	editor: RevisionEditor<ShapeId>,
	generation: Pick<GenerationResponse, 'url'>,
	revisionPrompt: string,
	createId: ShapeIdFactory<ShapeId>
) {
	const sourceBounds = editor.getSelectionPageBounds() ?? null
	const placement = getRevisionPlacement(
		sourceBounds,
		AI_IMAGE_HOLDER_DEFAULT_PROPS,
		editor.getViewportPageBounds()
	)
	const id = createId()
	editor.createShape({
		id,
		type: AI_IMAGE_HOLDER_TYPE,
		x: placement.x,
		y: placement.y,
		props: {
			...AI_IMAGE_HOLDER_DEFAULT_PROPS,
			assetUrl: generation.url,
			prompt: revisionPrompt,
		},
	})
	editor.select(id)
}
