import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
	createDefaultRoutingConfig,
	ModelEnvironment,
	parseRoutingConfig,
	resolveRoutingConfig,
} from './config-schema'
import {
	ModelSlotName,
	ResolvedRoutingConfig,
	RoutingConfig,
	RoutingConfigUpdate,
	SanitizedRoutingConfig,
} from './types'

interface ModelConfigStoreOptions {
	directory: string
	environment?: ModelEnvironment
}

type StoredSecrets = Partial<Record<ModelSlotName, string>>

async function readJsonFile<T>(filePath: string): Promise<T | undefined> {
	try {
		return JSON.parse(await readFile(filePath, 'utf8')) as T
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
		throw error
	}
}

async function writeJsonAtomic(filePath: string, value: unknown, secret = false): Promise<void> {
	const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
	await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, {
		encoding: 'utf8',
		mode: secret ? 0o600 : 0o644,
	})
	if (secret) await chmod(temporaryPath, 0o600).catch(() => undefined)
	await rename(temporaryPath, filePath)
}

export class ModelConfigStore {
	private readonly directory: string
	private readonly environment: ModelEnvironment

	constructor({ directory, environment = process.env }: ModelConfigStoreOptions) {
		this.directory = directory
		this.environment = environment
	}

	private get providersPath(): string {
		return path.join(this.directory, 'model-providers.json')
	}

	private get secretsPath(): string {
		return path.join(this.directory, 'model-secrets.json')
	}

	private async readSavedConfig(): Promise<RoutingConfig> {
		const saved = await readJsonFile<unknown>(this.providersPath)
		return saved === undefined
			? createDefaultRoutingConfig(this.environment)
			: parseRoutingConfig(saved)
	}

	private async readSecrets(): Promise<StoredSecrets> {
		const secrets = (await readJsonFile<StoredSecrets>(this.secretsPath)) ?? {}
		return Object.fromEntries(
			Object.entries(secrets).filter((entry): entry is [ModelSlotName, string] =>
				(['primary', 'backup'].includes(entry[0]) && typeof entry[1] === 'string')
			)
		)
	}

	async readResolved(): Promise<ResolvedRoutingConfig> {
		const { config } = resolveRoutingConfig(await this.readSavedConfig(), this.environment)
		const secrets = await this.readSecrets()
		return {
			primary: {
				...config.primary,
				...(this.environment.LOCALART_PRIMARY_API_KEY || secrets.primary
					? { apiKey: this.environment.LOCALART_PRIMARY_API_KEY || secrets.primary }
					: {}),
			},
			backup: {
				...config.backup,
				...(this.environment.LOCALART_BACKUP_API_KEY || secrets.backup
					? { apiKey: this.environment.LOCALART_BACKUP_API_KEY || secrets.backup }
					: {}),
			},
		}
	}

	async readSanitized(): Promise<SanitizedRoutingConfig> {
		const saved = await this.readSavedConfig()
		const { config, environmentOverrides } = resolveRoutingConfig(saved, this.environment)
		const resolved = await this.readResolved()
		return {
			primary: {
				...config.primary,
				hasApiKey: Boolean(resolved.primary.apiKey),
				environmentOverrides: [
					...environmentOverrides.primary,
					...(this.environment.LOCALART_PRIMARY_API_KEY ? (['apiKey'] as const) : []),
				],
			},
			backup: {
				...config.backup,
				hasApiKey: Boolean(resolved.backup.apiKey),
				environmentOverrides: [
					...environmentOverrides.backup,
					...(this.environment.LOCALART_BACKUP_API_KEY ? (['apiKey'] as const) : []),
				],
			},
		}
	}

	async update(update: RoutingConfigUpdate): Promise<void> {
		const config = parseRoutingConfig(update.config)
		const secrets = await this.readSecrets()
		for (const slotName of ['primary', 'backup'] as const) {
			const secretUpdate = update.secretUpdates[slotName]
			if (secretUpdate.action === 'clear') delete secrets[slotName]
			if (secretUpdate.action === 'set') {
				const value = secretUpdate.value.trim()
				if (!value) throw new Error(`${slotName} API key must not be empty`)
				secrets[slotName] = value
			}
		}

		await mkdir(this.directory, { recursive: true })
		await writeJsonAtomic(this.providersPath, config)
		await writeJsonAtomic(this.secretsPath, secrets, true)
	}
}
