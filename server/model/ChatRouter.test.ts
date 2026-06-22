import { describe, expect, test, vi } from 'vitest'
import { ChatRouter } from './ChatRouter'
import { ProviderError, ProviderErrorKind } from './ProviderError'
import { ChatBackend, ChatRequest } from './types'

const request: ChatRequest = { message: 'Revise', selectedShapes: [] }

function backend(result?: { message: string; model: string }): ChatBackend & { chat: ReturnType<typeof vi.fn> } {
	return { chat: vi.fn().mockResolvedValue(result ?? { message: 'ok', model: 'model' }) }
}

describe('ChatRouter', () => {
	test('returns primary route metadata without calling backup', async () => {
		const primary = backend({ message: 'local', model: 'gemma3' })
		const backup = backend()
		const router = new ChatRouter({
			primary: { backend: primary, provider: 'ollama', preset: 'ollama' },
			backup: { backend: backup, provider: 'openai-compatible', preset: 'aibuff' },
		})

		await expect(router.chat(request)).resolves.toMatchObject({
			message: 'local',
			model: 'gemma3',
			slot: 'primary',
			provider: 'ollama',
			preset: 'ollama',
		})
		expect(backup.chat).not.toHaveBeenCalled()
	})

	test.each(['network', 'timeout', 'rate_limit', 'server'] as ProviderErrorKind[])(
		'falls back once for %s errors',
		async (kind) => {
			const primary = backend()
			primary.chat.mockRejectedValue(
				new ProviderError(kind, `Primary ${kind}`, { retryable: true })
			)
			const backup = backend({ message: 'cloud', model: 'cloud-model' })
			const router = new ChatRouter({
				primary: { backend: primary, provider: 'ollama', preset: 'ollama' },
				backup: { backend: backup, provider: 'openai-compatible', preset: 'aibuff' },
			})

			await expect(router.chat(request)).resolves.toMatchObject({
				message: 'cloud',
				slot: 'backup',
				fallback: { from: 'primary', reason: `Primary ${kind}` },
			})
			expect(primary.chat).toHaveBeenCalledTimes(1)
			expect(backup.chat).toHaveBeenCalledTimes(1)
		}
	)

	test.each(['auth', 'invalid_request', 'model_not_found', 'policy', 'config'] as ProviderErrorKind[])(
		'does not fall back for %s errors',
		async (kind) => {
			const primary = backend()
			primary.chat.mockRejectedValue(new ProviderError(kind, `Primary ${kind}`, { retryable: false }))
			const backup = backend()
			const router = new ChatRouter({
				primary: { backend: primary, provider: 'ollama', preset: 'ollama' },
				backup: { backend: backup, provider: 'openai-compatible', preset: 'aibuff' },
			})

			await expect(router.chat(request)).rejects.toMatchObject({ kind, message: `Primary ${kind}` })
			expect(backup.chat).not.toHaveBeenCalled()
		}
	)

	test('reports when no backup is configured', async () => {
		const primary = backend()
		primary.chat.mockRejectedValue(new ProviderError('network', 'Primary offline', { retryable: true }))
		const router = new ChatRouter({
			primary: { backend: primary, provider: 'ollama', preset: 'ollama' },
		})

		await expect(router.chat(request)).rejects.toThrow('Primary offline; no backup model is available')
	})
})
