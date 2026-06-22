import { useMemo, useState } from 'react'
import { DefaultSizeStyle, Editor, ErrorBoundary, TLComponents, Tldraw, TldrawUiToastsProvider } from 'tldraw'
import { ChatPanel } from './components/ChatPanel'
import { ChatPanelFallback } from './components/ChatPanelFallback'
import { CanvasPersistence } from './components/CanvasPersistence'
import { ServiceStatus } from './components/ServiceStatus'
import { ModelRoutingPanel } from './components/ModelRoutingPanel'
import { AIImageHolderShapeUtil } from './shapes/AIImageHolderShape'

// Customize tldraw's styles to play to the agent's strengths
DefaultSizeStyle.setDefaultValue('s')

function App() {
	const [editor, setEditor] = useState<Editor | null>(null)

	const components: TLComponents = useMemo(() => {
		return {
			HelperButtons: null,
		}
	}, [])

	return (
		<TldrawUiToastsProvider>
			<div className="tldraw-agent-container">
				<div className="tldraw-canvas">
					<Tldraw
						licenseKey={import.meta.env.VITE_TLDRAW_LICENSE_KEY}
						onMount={setEditor}
						shapeUtils={[AIImageHolderShapeUtil]}
						components={components}
					>
						<CanvasPersistence />
					</Tldraw>
				</div>
				<div className="localart-sidebar">
					<ServiceStatus />
					<ModelRoutingPanel />
					<ErrorBoundary fallback={ChatPanelFallback}>
						{editor && <ChatPanel editor={editor} />}
					</ErrorBoundary>
				</div>
			</div>
		</TldrawUiToastsProvider>
	)
}

export default App
