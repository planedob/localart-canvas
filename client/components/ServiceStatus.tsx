import { useCallback, useEffect, useState } from 'react'
import {
	fetchServiceHealth,
	formatServiceStatus,
	ServiceHealth,
} from '../service-status'

interface ServiceStatusViewProps {
	health: ServiceHealth
	onRefresh: () => void
}

export function ServiceStatusView({ health, onRefresh }: ServiceStatusViewProps) {
	const services = [
		{ name: 'Ollama' as const, ...health.services.ollama },
		{ name: 'ComfyUI' as const, ...health.services.comfyui },
	]

	return (
		<section className="service-status" aria-label="Local service status">
			<header>
				<strong>服务状态</strong>
				<button type="button" onClick={onRefresh}>
					刷新
				</button>
			</header>
			{services.map((service) => {
				const status = formatServiceStatus(service.available, service.name)
				return (
					<div className="service-status-row" key={service.name}>
						<div>
							<span>{service.name}</span>
							<b className={`service-status-badge ${status.tone}`}>{status.label}</b>
						</div>
						<code>{service.url}</code>
						{status.guidance && <small>{status.guidance}</small>}
					</div>
				)
			})}
			<div className="service-status-canvas">
				<span>Canvas</span>
				<code>{health.canvas.directory}</code>
			</div>
		</section>
	)
}

export function ServiceStatus() {
	const [health, setHealth] = useState<ServiceHealth | null>(null)
	const [error, setError] = useState<string | null>(null)

	const loadHealth = useCallback(async () => {
		setError(null)
		try {
			setHealth(await fetchServiceHealth())
		} catch (loadError) {
			setError(loadError instanceof Error ? loadError.message : '服务状态读取失败')
		}
	}, [])

	useEffect(() => {
		void loadHealth()
	}, [loadHealth])

	if (error) {
		return (
		<section className="service-status service-status-error" aria-label="Local service status">
			<span>{error}</span>
			<button type="button" onClick={loadHealth}>
				重试
			</button>
		</section>
		)
	}

	if (!health) {
		return <section className="service-status">正在检查本地服务…</section>
	}

	return <ServiceStatusView health={health} onRefresh={loadHealth} />
}
