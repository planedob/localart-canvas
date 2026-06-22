import {
	BaseBoxShapeUtil,
	HTMLContainer,
	Rectangle2d,
	T,
	TLBaseShape,
} from 'tldraw'

export const AI_IMAGE_HOLDER_TYPE = 'ai-image-holder' as const

export interface AIImageHolderProps {
	w: number
	h: number
	assetUrl: string
	prompt: string
	status: 'ready' | 'error'
}

export type AIImageHolderShape = TLBaseShape<
	typeof AI_IMAGE_HOLDER_TYPE,
	AIImageHolderProps
>

declare module '@tldraw/tlschema' {
	export interface TLGlobalShapePropsMap {
		[AI_IMAGE_HOLDER_TYPE]: AIImageHolderProps
	}
}

export const AI_IMAGE_HOLDER_DEFAULT_PROPS: AIImageHolderProps = {
	w: 512,
	h: 512,
	assetUrl: '',
	prompt: '',
	status: 'ready',
}

export function getAIImageHolderGeometry(props: Pick<AIImageHolderProps, 'w' | 'h'>) {
	return new Rectangle2d({
		width: props.w,
		height: props.h,
		isFilled: true,
	})
}

export class AIImageHolderShapeUtil extends BaseBoxShapeUtil<AIImageHolderShape> {
	static override type = AI_IMAGE_HOLDER_TYPE
	static override props = {
		w: T.number,
		h: T.number,
		assetUrl: T.string,
		prompt: T.string,
		status: T.literalEnum('ready', 'error'),
	}

	override canResize() {
		return true
	}

	override isAspectRatioLocked() {
		return false
	}

	override getDefaultProps(): AIImageHolderProps {
		return { ...AI_IMAGE_HOLDER_DEFAULT_PROPS }
	}

	override getGeometry(shape: AIImageHolderShape) {
		return getAIImageHolderGeometry(shape.props)
	}

	component(shape: AIImageHolderShape) {
		const { assetUrl, h, prompt, status, w } = shape.props

		return (
			<HTMLContainer
				data-testid="ai-image-holder"
				style={{
					background: '#18181b',
					border: status === 'error' ? '2px solid #ef4444' : '2px solid #2563eb',
					borderRadius: 12,
					boxShadow: '0 8px 24px rgb(0 0 0 / 18%)',
					overflow: 'hidden',
					pointerEvents: 'all',
				}}
			>
				{assetUrl ? (
					<img
						alt={prompt || 'AI-generated revision'}
						draggable={false}
						src={assetUrl}
						style={{
							display: 'block',
							height: '100%',
							objectFit: 'cover',
							pointerEvents: 'none',
							width: '100%',
						}}
					/>
				) : (
					<div
						style={{
							alignItems: 'center',
							color: '#d4d4d8',
							display: 'flex',
							height: h,
							justifyContent: 'center',
							padding: 24,
							textAlign: 'center',
							width: w,
						}}
					>
						{status === 'error' ? 'Generation failed' : 'AI revision'}
					</div>
				)}
				<div
					style={{
						background: 'rgb(24 24 27 / 88%)',
						bottom: 8,
						color: 'white',
						font: '600 12px/1.2 system-ui, sans-serif',
						left: 8,
						padding: '6px 8px',
						position: 'absolute',
						borderRadius: 6,
					}}
				>
					AI revision
				</div>
			</HTMLContainer>
		)
	}

	getIndicatorPath(shape: AIImageHolderShape) {
		const path = new Path2D()
		path.roundRect(0, 0, shape.props.w, shape.props.h, 12)
		return path
	}
}
