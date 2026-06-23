export type CanvasExportFormat = 'json' | 'zip'

const EXPORT_TARGETS: Record<CanvasExportFormat, { url: string; filename: string }> = {
	json: {
		url: '/api/export/canvas.json',
		filename: 'localart-canvas.json',
	},
	zip: {
		url: '/api/export/canvas.zip',
		filename: 'localart-canvas.zip',
	},
}

export function getCanvasExportUrl(format: CanvasExportFormat): string {
	return EXPORT_TARGETS[format].url
}

export function getCanvasExportFilename(format: CanvasExportFormat): string {
	return EXPORT_TARGETS[format].filename
}
