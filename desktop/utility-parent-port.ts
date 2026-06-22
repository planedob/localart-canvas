export interface UtilityParentPort {
	postMessage(message: unknown): void
}

interface UtilityProcessLike {
	parentPort?: UtilityParentPort
}

export function getUtilityParentPort(runtimeProcess: UtilityProcessLike): UtilityParentPort {
	if (!runtimeProcess.parentPort) {
		throw new Error('Electron utility parentPort is unavailable')
	}
	return runtimeProcess.parentPort
}
