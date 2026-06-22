import path from 'node:path'

export interface CanvasDirOptions {
	override?: string
	isPackaged: boolean
	projectDirectory: string
	userDataDirectory: string
}

export function getCanvasDir(options: CanvasDirOptions): string {
	if (options.override?.trim()) {
		return path.resolve(options.projectDirectory, options.override)
	}

	return options.isPackaged
		? path.join(options.userDataDirectory, 'canvas')
		: path.join(options.projectDirectory, 'canvas')
}
