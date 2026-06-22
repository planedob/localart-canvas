import { spawn, ChildProcess } from 'node:child_process'
import path from 'node:path'
import { app, BrowserWindow, utilityProcess, UtilityProcess } from 'electron'
import { getCanvasDir } from './canvas-dir'
import { createServiceController, ServiceController } from './service-controller'
import { ServiceEvent } from './service-lifecycle'

const DEVELOPMENT_URL = 'http://127.0.0.1:5173'
const STARTUP_TIMEOUT_MS = 30_000

let loadingWindow: BrowserWindow | null = null
let mainWindow: BrowserWindow | null = null
let utility: UtilityProcess | null = null
let developmentServer: ChildProcess | null = null
let controller: ServiceController | null = null
let isQuitting = false

function htmlPage(title: string, message: string, showCloseButton = false): string {
	const closeButton = showCloseButton
		? '<button onclick="window.close()">退出</button>'
		: '<div class="spinner"></div>'
	return `<!doctype html><meta charset="utf-8"><title>${title}</title><style>
		body{margin:0;min-height:100vh;display:grid;place-content:center;gap:16px;background:#18181b;color:#f4f4f5;font:14px system-ui;text-align:center;padding:28px}
		h1{font-size:18px;margin:0}.message{max-width:520px;color:#a1a1aa;white-space:pre-wrap;word-break:break-word}
		.spinner{width:28px;height:28px;margin:auto;border:3px solid #3f3f46;border-top-color:#60a5fa;border-radius:50%;animation:spin 1s linear infinite}
		button{justify-self:center;border:0;border-radius:8px;padding:8px 18px;background:#3b82f6;color:white}@keyframes spin{to{transform:rotate(360deg)}}
	</style><h1>${title}</h1><div class="message">${message}</div>${closeButton}`
}

function dataUrl(title: string, message: string, showCloseButton = false): string {
	return `data:text/html;charset=utf-8,${encodeURIComponent(htmlPage(title, message, showCloseButton))}`
}

function createLoadingWindow(): BrowserWindow {
	const window = new BrowserWindow({
		width: 460,
		height: 280,
		resizable: false,
		show: false,
		autoHideMenuBar: true,
		webPreferences: {
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true,
		},
	})
	void window.loadURL(dataUrl('LocalArt Canvas', '正在启动本地画布服务…'))
	window.once('ready-to-show', () => window.show())
	return window
}

function showFailure(message: string): void {
	const target = mainWindow && !mainWindow.isDestroyed() ? mainWindow : loadingWindow
	if (target && !target.isDestroyed()) {
		void target.loadURL(dataUrl('LocalArt Canvas 启动失败', message, true))
		target.show()
		return
	}
	loadingWindow = createLoadingWindow()
	void loadingWindow.loadURL(dataUrl('LocalArt Canvas 启动失败', message, true))
}

function getUtilityEnvironment(): Record<string, string> {
	const projectDirectory = app.getAppPath()
	const environment = Object.fromEntries(
		Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
	)
	environment.LOCALART_PROJECT_DIR = projectDirectory
	environment.LOCALART_CANVAS_DIR = getCanvasDir({
		override: process.env.LOCALART_CANVAS_DIR,
		isPackaged: app.isPackaged,
		projectDirectory,
		userDataDirectory: app.getPath('userData'),
	})
	environment.LOCALART_SERVE_RENDERER = app.isPackaged ? '1' : '0'

	if (app.isPackaged) {
		environment.LOCALART_RENDERER_DIR = path.join(process.resourcesPath, 'dist')
		if (!environment.COMFYUI_WORKFLOW_PATH) {
			environment.COMFYUI_WORKFLOW_PATH = path.join(
				process.resourcesPath,
				'comfyui-workflow.example.json'
			)
		}
	}
	return environment
}

function toServiceEvent(message: unknown): ServiceEvent | null {
	if (!message || typeof message !== 'object') return null
	const candidate = message as { type?: unknown; port?: unknown; message?: unknown }
	if (candidate.type === 'ready' && typeof candidate.port === 'number') {
		return { type: 'ready', port: candidate.port }
	}
	if (candidate.type === 'error' && typeof candidate.message === 'string') {
		return { type: 'error', message: candidate.message }
	}
	return null
}

async function waitForDevelopmentServer(child: ChildProcess): Promise<void> {
	const deadline = Date.now() + STARTUP_TIMEOUT_MS
	while (Date.now() < deadline) {
		if (child.exitCode !== null) {
			throw new Error(`Vite development server exited with code ${child.exitCode}`)
		}
		try {
			const response = await fetch(DEVELOPMENT_URL)
			if (response.ok) return
		} catch {
			// The server is still starting.
		}
		await new Promise((resolve) => setTimeout(resolve, 150))
	}
	throw new Error('Timed out waiting for the Vite development server')
}

async function startDevelopmentServer(apiOrigin: string): Promise<void> {
	const command = process.platform === 'win32' ? 'npm.cmd' : 'npm'
	developmentServer = spawn(
		command,
		['run', 'dev:client', '--', '--port', '5173', '--strictPort'],
		{
			cwd: app.getAppPath(),
			env: { ...process.env, LOCALART_API_TARGET: apiOrigin },
			stdio: 'inherit',
		}
	)
	await waitForDevelopmentServer(developmentServer)
}

async function openMainWindow(port: number): Promise<void> {
	const origin = `http://127.0.0.1:${port}`
	if (!app.isPackaged) await startDevelopmentServer(origin)

	const window = new BrowserWindow({
		width: 1440,
		height: 940,
		minWidth: 960,
		minHeight: 640,
		show: false,
		autoHideMenuBar: true,
		webPreferences: {
			preload: path.join(app.getAppPath(), '.desktop', 'preload.cjs'),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true,
			additionalArguments: [`--localart-packaged=${app.isPackaged ? '1' : '0'}`],
		},
	})
	mainWindow = window
	window.webContents.on('did-fail-load', (_event, code, description, url) => {
		showFailure(`页面加载失败 (${code}): ${description}\n${url}`)
	})
	window.once('ready-to-show', () => {
		window.show()
		loadingWindow?.close()
		loadingWindow = null
	})
	window.on('closed', () => {
		if (mainWindow === window) mainWindow = null
	})
	await window.loadURL(app.isPackaged ? origin : DEVELOPMENT_URL)
}

function startUtilityProcess(): void {
	const utilityPath = path.join(app.getAppPath(), '.desktop', 'utility.cjs')
	utility = utilityProcess.fork(utilityPath, [], {
		cwd: app.getAppPath(),
		env: getUtilityEnvironment(),
		serviceName: 'LocalArt Tool Server',
		stdio: 'inherit',
	})

	controller = createServiceController({
		openMainWindow(port) {
			void openMainWindow(port).catch((error) =>
				showFailure(error instanceof Error ? error.message : 'LocalArt window failed to open')
			)
		},
		showFailure,
		terminateUtility() {
			utility?.kill()
			utility = null
		},
	})
	utility.on('message', (message) => {
		const event = toServiceEvent(message)
		if (event) controller?.handle(event)
	})
	utility.on('error', (type, location) => {
		controller?.handle({ type: 'error', message: `${type} at ${location}` })
	})
	utility.on('exit', (code) => {
		utility = null
		if (!isQuitting) controller?.handle({ type: 'exit', code })
	})
}

app.whenReady().then(() => {
	loadingWindow = createLoadingWindow()
	startUtilityProcess()
})

app.on('before-quit', () => {
	isQuitting = true
	controller?.shutdown()
	if (developmentServer && developmentServer.exitCode === null) developmentServer.kill()
	developmentServer = null
})

app.on('window-all-closed', () => app.quit())
