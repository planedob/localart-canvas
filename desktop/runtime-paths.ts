import path from 'node:path'

interface RuntimePathOptions {
	isPackaged: boolean
	appPath: string
	resourcesPath: string
}

export function getUtilityEntryPath(options: RuntimePathOptions): string {
	return options.isPackaged
		? path.join(options.resourcesPath, 'app.asar.unpacked', '.desktop', 'utility.cjs')
		: path.join(options.appPath, '.desktop', 'utility.cjs')
}

export function getUtilityWorkingDirectory(options: RuntimePathOptions): string {
	return options.isPackaged ? options.resourcesPath : options.appPath
}
