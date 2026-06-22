import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('localArtDesktop', {
	platform: process.platform,
	isPackaged: process.argv.includes('--localart-packaged=1'),
})
