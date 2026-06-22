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
