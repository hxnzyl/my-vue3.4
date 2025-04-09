import { VNodeProps } from 'packages/runtime-core/types'
import { PathFlags } from './src/constants'

export interface PatchAttr {
	[key: string]: string | null
}

export interface PatchProps {
	attr?: PatchAttr
	style?: PatchStyle
	event?: PatchEvent
}

export type PatchStyleKey = Exclude<
	keyof CSSStyleDeclaration,
	'getPropertyPriority' | 'getPropertyValue' | 'item' | 'removeProperty' | 'setProperty' | number
>

export type PatchStyle = {
	[key in PatchStyleKey]?: string | null
}

export type PatchEventKey = Exclude<keyof GlobalEventHandlers, 'addEventListener' | 'removeEventListener'>

export type PatchEvent = EventListener | null

export type PatchProp = PatchStyle | PatchAttr | PatchEvent | VNodeProps | string

export type PatchEvi = { [PathFlags.EVENT]: { [key: string]: EventListener & { _handler: PatchEvent } } }
