export type AgentPanelAction = 'exportPng' | 'addPlaceholder' | 'generateRevision'

export const LOCALART_AGENT_ACTION_EVENT = 'localart:agent-action'

export function dispatchAgentPanelAction(action: AgentPanelAction, target: EventTarget = window): void {
	target.dispatchEvent(new CustomEvent<AgentPanelAction>(LOCALART_AGENT_ACTION_EVENT, { detail: action }))
}

export function readAgentPanelAction(event: Event): AgentPanelAction | null {
	if (!(event instanceof CustomEvent)) return null
	if (event.type !== LOCALART_AGENT_ACTION_EVENT) return null
	if (event.detail === 'exportPng' || event.detail === 'addPlaceholder' || event.detail === 'generateRevision') {
		return event.detail
	}
	return null
}
