import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
	ComfyGenerationResult,
	ComfyUIClient,
	ComfyWorkflow,
} from './ComfyUIClient'

interface ComfyClientLike {
	generate(prompt: string): Promise<ComfyGenerationResult>
}

interface GenerationServiceOptions {
	canvasDirectory: string
	comfyClient: ComfyClientLike
	createId?: () => string
}

export interface StoredGeneration {
	assetId: string
	url: string
	promptId: string
}

function extensionForMimeType(mimeType: string): string {
	if (mimeType === 'image/jpeg') return '.jpg'
	if (mimeType === 'image/webp') return '.webp'
	return '.png'
}

export class GenerationService {
	private readonly canvasDirectory: string
	private readonly comfyClient: ComfyClientLike
	private readonly createId: () => string

	constructor({
		canvasDirectory,
		comfyClient,
		createId = randomUUID,
	}: GenerationServiceOptions) {
		this.canvasDirectory = canvasDirectory
		this.comfyClient = comfyClient
		this.createId = createId
	}

	async generate(prompt: string): Promise<StoredGeneration> {
		const result = await this.comfyClient.generate(prompt)
		const assetId = this.createId()
		const extension = extensionForMimeType(result.mimeType)
		const filename = `${assetId}${extension}`
		const assetsDirectory = path.join(this.canvasDirectory, 'assets')

		await mkdir(assetsDirectory, { recursive: true })
		await writeFile(path.join(assetsDirectory, filename), result.imageBytes)

		return {
			assetId,
			url: `/assets/${filename}`,
			promptId: result.promptId,
		}
	}
}

interface CreateGenerationServiceOptions {
	baseUrl: string
	workflowPath: string
	promptNodeId: string
	canvasDirectory: string
	fetchImplementation?: typeof fetch
}

export async function createGenerationService({
	baseUrl,
	workflowPath,
	promptNodeId,
	canvasDirectory,
	fetchImplementation,
}: CreateGenerationServiceOptions): Promise<GenerationService> {
	const workflow = JSON.parse(await readFile(workflowPath, 'utf8')) as ComfyWorkflow
	const comfyClient = new ComfyUIClient({
		baseUrl,
		workflow,
		promptNodeId,
		...(fetchImplementation ? { fetchImplementation } : {}),
	})
	return new GenerationService({ canvasDirectory, comfyClient })
}
