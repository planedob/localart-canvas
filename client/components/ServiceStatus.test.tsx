import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { ServiceStatusView } from './ServiceStatus'

describe('ServiceStatusView', () => {
	test('shows endpoints and canvas directory', () => {
		const markup = renderToStaticMarkup(
			<ServiceStatusView
				health={{
					status: 'ok',
					services: {
						ollama: { available: true, url: 'http://ollama.test' },
						comfyui: { available: true, url: 'http://comfy.test' },
					},
					canvas: { directory: '/data/canvas' },
				}}
				onRefresh={() => undefined}
			/>
		)

		expect(markup).toContain('http://ollama.test')
		expect(markup).toContain('http://comfy.test')
		expect(markup).toContain('/data/canvas')
	})

	test('shows startup guidance when services are unavailable', () => {
		const markup = renderToStaticMarkup(
			<ServiceStatusView
				health={{
					status: 'degraded',
					services: {
						ollama: { available: false, url: 'http://ollama.test' },
						comfyui: { available: false, url: 'http://comfy.test' },
					},
					canvas: { directory: '/data/canvas' },
				}}
				onRefresh={() => undefined}
			/>
		)

		expect(markup).toContain('ollama serve')
		expect(markup).toContain('启动 ComfyUI')
	})
})
