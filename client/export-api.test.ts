import { describe, expect, it } from 'vitest'
import { getCanvasExportFilename, getCanvasExportUrl } from './export-api'

describe('canvas export links', () => {
	it('maps supported formats to stable download endpoints', () => {
		expect(getCanvasExportUrl('json')).toBe('/api/export/canvas.json')
		expect(getCanvasExportUrl('zip')).toBe('/api/export/canvas.zip')
		expect(getCanvasExportFilename('json')).toBe('localart-canvas.json')
		expect(getCanvasExportFilename('zip')).toBe('localart-canvas.zip')
	})
})
