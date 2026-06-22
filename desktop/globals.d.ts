export {}

declare global {
	interface Window {
		readonly localArtDesktop?: {
			readonly platform: NodeJS.Platform
			readonly isPackaged: boolean
		}
	}
}
