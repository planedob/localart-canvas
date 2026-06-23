import { ContextMenu, DefaultContextMenuContent } from 'tldraw'
import { AgentPanelAction, dispatchAgentPanelAction } from '../agent-events'

export function LocalArtContextMenuActions({
	dispatchAgentAction = dispatchAgentPanelAction,
}: {
	dispatchAgentAction?: (action: AgentPanelAction) => void
}) {
	return (
		<div className="localart-context-menu-actions" data-testid="localart-context-menu-actions">
			<div className="localart-context-menu-title">LocalArt</div>
			<button type="button" onClick={() => dispatchAgentAction('exportPng')}>
				<span>Export selection PNG</span>
				<small>⌘/Ctrl+Shift+P</small>
			</button>
			<button type="button" onClick={() => dispatchAgentAction('addPlaceholder')}>
				Add AI placeholder
			</button>
			<button type="button" onClick={() => dispatchAgentAction('generateRevision')}>
				<span>Generate revision</span>
				<small>⌘/Ctrl+Shift+G</small>
			</button>
		</div>
	)
}

export function LocalArtContextMenu() {
	return (
		<ContextMenu>
			<DefaultContextMenuContent />
			<LocalArtContextMenuActions />
		</ContextMenu>
	)
}
