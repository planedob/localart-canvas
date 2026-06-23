import { Editor } from 'tldraw'

export type PngExportShape = ReturnType<Editor['getSelectedShapes']>[number]

interface PngExportEditor {
	getSelectedShapes(): PngExportShape[]
	getCurrentPageShapes(): PngExportShape[]
	toImage(
		shapes: PngExportShape[],
		options: typeof PNG_EXPORT_OPTIONS
	): Promise<{ blob: Blob }>
}

interface PngExportAnchor {
	click(): void
	download: string
	href: string
	remove(): void
}

interface PngExportEnvironment {
	document?: {
		body: { append(anchor: PngExportAnchor): void }
		createElement(tagName: 'a'): PngExportAnchor
	}
	url?: Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'>
}

export const PNG_EXPORT_FILENAME = 'localart-canvas.png'

export const PNG_EXPORT_OPTIONS = {
	format: 'png',
	background: true,
	padding: 16,
	pixelRatio: 2,
} as const

export function getPngExportTargets(editor: Pick<PngExportEditor, 'getSelectedShapes' | 'getCurrentPageShapes'>) {
	const selectedShapes = editor.getSelectedShapes()
	if (selectedShapes.length > 0) return selectedShapes

	const pageShapes = editor.getCurrentPageShapes()
	if (pageShapes.length > 0) return pageShapes

	throw new Error('There are no canvas shapes to export')
}

export async function downloadCanvasPng(
	editor: PngExportEditor,
	environment: PngExportEnvironment = {}
): Promise<void> {
	const urlApi = environment.url ?? URL
	const targets = getPngExportTargets(editor)
	const { blob } = await editor.toImage(targets, PNG_EXPORT_OPTIONS)
	const objectUrl = urlApi.createObjectURL(blob)

	try {
		if (environment.document) {
			const anchor = environment.document.createElement('a')
			anchor.href = objectUrl
			anchor.download = PNG_EXPORT_FILENAME
			environment.document.body.append(anchor)
			anchor.click()
			anchor.remove()
			return
		}

		const anchor = document.createElement('a')
		anchor.href = objectUrl
		anchor.download = PNG_EXPORT_FILENAME
		document.body.append(anchor)
		anchor.click()
		anchor.remove()
	} finally {
		urlApi.revokeObjectURL(objectUrl)
	}
}
