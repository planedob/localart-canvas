import type { GenerationResponse } from './local-api'
import type { TLShapeId } from 'tldraw'
import { getRevisionPlacement } from './revision-context'
import {
	AI_IMAGE_HOLDER_DEFAULT_PROPS,
	AI_IMAGE_HOLDER_TYPE,
	type AIImageHolderProps,
} from './shapes/ai-image-holder-model'

type Bounds = {
	x: number
	y: number
	w: number
	h: number
}

type RevisionEditor = {
	getSelectionPageBounds(): Bounds | null | undefined
	getViewportPageBounds(): Bounds
	createShape(shape: GeneratedRevisionShape): unknown
	select(id: TLShapeId): void
}

type ShapeIdFactory = () => TLShapeId

type GeneratedRevisionShape = {
	id: TLShapeId
	type: typeof AI_IMAGE_HOLDER_TYPE
	x: number
	y: number
	props: AIImageHolderProps
}

export function insertGeneratedRevisionShape(
	editor: RevisionEditor,
	generation: Pick<GenerationResponse, 'url'>,
	revisionPrompt: string,
	createId: ShapeIdFactory
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
