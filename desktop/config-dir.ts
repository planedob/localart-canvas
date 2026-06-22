import path from 'node:path'

export interface ConfigDirOptions {
	override?: string
	projectDirectory: string
	userDataDirectory: string
}

export function getConfigDir(options: ConfigDirOptions): string {
	if (options.override?.trim()) {
		return path.resolve(options.projectDirectory, options.override)
	}

	return path.join(options.userDataDirectory, 'config')
}
