import { describe, expect, it, vi } from 'vitest'
import {
	downloadCanvasPng,
	getPngExportTargets,
	PNG_EXPORT_FILENAME,
	PNG_EXPORT_OPTIONS,
	PngExportShape,
} from './png-export'

function createShape(id: string): PngExportShape {
	return { id, type: 'geo', props: {} } as unknown as PngExportShape
}

describe('getPngExportTargets', () => {
	it('uses selected shapes first', () => {
		const selectedShape = createShape('shape:selected')
		const pageShape = createShape('shape:page')
		const editor = {
			getSelectedShapes: vi.fn(() => [selectedShape]),
			getCurrentPageShapes: vi.fn(() => [pageShape]),
		}

		expect(getPngExportTargets(editor)).toEqual([selectedShape])
		expect(editor.getCurrentPageShapes).not.toHaveBeenCalled()
	})

	it('falls back to all current page shapes', () => {
		const pageShape = createShape('shape:page')
		const editor = {
			getSelectedShapes: vi.fn(() => []),
			getCurrentPageShapes: vi.fn(() => [pageShape]),
		}

		expect(getPngExportTargets(editor)).toEqual([pageShape])
	})

	it('throws when the current page is empty', () => {
		const editor = {
			getSelectedShapes: vi.fn(() => []),
			getCurrentPageShapes: vi.fn(() => []),
		}

		expect(() => getPngExportTargets(editor)).toThrow('There are no canvas shapes to export')
	})
})

describe('downloadCanvasPng', () => {
	it('renders selected shapes to a PNG download', async () => {
		const anchor = {
			click: vi.fn(),
			download: '',
			href: '',
			remove: vi.fn(),
		}
		const documentLike = {
			body: { append: vi.fn() },
			createElement: vi.fn(() => anchor),
		}
		const urlApi = {
			createObjectURL: vi.fn(() => 'blob:localart-png'),
			revokeObjectURL: vi.fn(),
		}
		const selectedShape = createShape('shape:selected')
		const blob = new Blob(['png'], { type: 'image/png' })
		const editor = {
			getSelectedShapes: vi.fn(() => [selectedShape]),
			getCurrentPageShapes: vi.fn(() => []),
			toImage: vi.fn(async () => ({ blob })),
		}

		await downloadCanvasPng(editor, { document: documentLike, url: urlApi })

		expect(editor.toImage).toHaveBeenCalledWith([selectedShape], PNG_EXPORT_OPTIONS)
		expect(anchor.download).toBe(PNG_EXPORT_FILENAME)
		expect(anchor.href).toBe('blob:localart-png')
		expect(anchor.click).toHaveBeenCalled()
		expect(anchor.remove).toHaveBeenCalled()
		expect(urlApi.revokeObjectURL).toHaveBeenCalledWith('blob:localart-png')
	})
})
