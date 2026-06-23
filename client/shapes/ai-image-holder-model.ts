export const AI_IMAGE_HOLDER_TYPE = 'ai-image-holder' as const

export interface AIImageHolderProps {
	w: number
	h: number
	assetUrl: string
	prompt: string
	status: 'ready' | 'error'
}

export const AI_IMAGE_HOLDER_DEFAULT_PROPS: AIImageHolderProps = {
	w: 512,
	h: 512,
	assetUrl: '',
	prompt: '',
	status: 'ready',
}
