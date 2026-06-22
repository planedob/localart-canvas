export interface ServiceHealth {
	status: 'ok' | 'degraded'
	services: {
		ollama: { available: boolean; url: string }
		comfyui: { available: boolean; url: string }
	}
	canvas: { directory: string }
}

export interface FormattedServiceStatus {
	label: '已连接' | '未找到'
	tone: 'connected' | 'disconnected'
	guidance: string | null
}

export async function fetchServiceHealth(
	fetchImplementation: typeof fetch = fetch
): Promise<ServiceHealth> {
	const response = await fetchImplementation('/api/health')
	if (!response.ok) {
		throw new Error(`Local service health failed (${response.status})`)
	}
	return (await response.json()) as ServiceHealth
}

export function formatServiceStatus(
	available: boolean,
	service: 'Ollama' | 'ComfyUI'
): FormattedServiceStatus {
	if (available) {
		return { label: '已连接', tone: 'connected', guidance: null }
	}

	return {
		label: '未找到',
		tone: 'disconnected',
		guidance:
			service === 'Ollama'
				? '运行 ollama serve，并确认已安装模型。'
				: '启动 ComfyUI，并确认监听下方配置地址。',
	}
}
