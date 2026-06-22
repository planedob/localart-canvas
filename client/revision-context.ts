type ShapeContextInput = {
	id: string
	type: string
	x: number
	y: number
	rotation: number
	props: unknown
}

export interface SelectedShapeSummary {
	id: string
	type: string
	x: number
	y: number
	rotation: number
	props: unknown
}

export function summarizeSelectedShapes<T extends ShapeContextInput>(
	shapes: readonly T[]
): SelectedShapeSummary[] {
	return shapes.map(({ id, type, x, y, rotation, props }) => ({
		id,
		type,
		x,
		y,
		rotation,
		props: structuredClone(props),
	}))
}

interface Bounds {
	x: number
	y: number
	w: number
	h: number
}

interface Dimensions {
	w: number
	h: number
}

export function getRevisionPlacement(
	sourceBounds: Bounds | null,
	revision: Dimensions,
	viewport: Bounds
): { x: number; y: number } {
	if (sourceBounds) {
		return {
			x: sourceBounds.x + sourceBounds.w + 48,
			y: sourceBounds.y,
		}
	}
	return {
		x: viewport.x + (viewport.w - revision.w) / 2,
		y: viewport.y + (viewport.h - revision.h) / 2,
	}
}
