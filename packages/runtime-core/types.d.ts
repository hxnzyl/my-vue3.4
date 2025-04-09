import { EffectScheduler, Reactive, ShallowReactive } from 'packages/reactivity/types'
import { VNode } from './src/vNode'

export interface RendererOptions<NODE, ELEM extends NODE, PROPS extends VNodeProps> {
	insert(node: NODE, parent: NODE, child?: NODE | null): void
	remove(node: NODE): void
	setElementText(node: NODE, text: string): void
	createFragment(): NODE
	createElement(tag: string, namespace?: string, is?: string): ELEM
	setScopeId(el: ELEM, id: string): void
	setText(node: NODE, text: string): void
	parentNode(node: NODE): NODE | null
	nextSibling(node: NODE): NODE | null
	createText(text: string): NODE
	createComment(text: string): NODE
	querySelector(selector: string): ELEM | null
	patchProp(
		node: NODE | null,
		key: PropertyKey,
		newValue: any,
		oldValue: any,
		component?: VNodeComponentInstance<NODE, PROPS> | null
	): void
}

export interface VNodeComponentMethods {
	[key: string]: Function
}

export interface VNodeComponentSlots<NODE, PROPS extends VNodeProps> {
	[key: string]: (...args: any) => VNode<NODE, PROPS>
}

export interface VNodeComponentType<NODE, PROPS extends VNodeProps> {
	data?: () => any
	props?: VNodePropsPublic<PROPS>
	methods?: VNodeComponentMethods
	setup?: (props: PROPS) => VNode<NODE, PROPS>
	render: () => VNode<NODE, PROPS>
}

export interface VNodeComponentInstance<NODE, PROPS extends VNodeProps> {
	props?: ShallowReactive<PROPS>
	attrs?: PROPS
	data?: Reactive<any>
	methods?: VNodeComponentMethods
	slots?: VNodeComponentSlots<NODE, PROPS>
	emits?: VNodeComponentEmits
	emit: (type: string, ...args: any) => void
	proxy: any
	vNode: VNode<NODE, PROPS>
	subTree: VNode<NODE, PROPS> | null
	scheduler: EffectScheduler
	isMounted: boolean
	render: () => VNode<NODE, PROPS>
}

export interface VNodeComponentEmits {
	[key: string]: VNodeComponentEvent
}

export type VNodeComponentEvent = (...args: any[]) => void

export interface VNodeProps {
	[key: string]: any
}

export type VNodePropsPublic<PROPS extends VNodeProps> = PROPS & { key?: PropertyKey }

export type VNodeTypes<NODE, PROPS extends VNodeProps> = string | Symbol | VNodeComponentType<NODE, PROPS>

export type VNodeChildren<NODE, PROPS extends VNodeProps> =
	| string
	| VNode<NODE, PROPS>
	| string[]
	| VNode<NODE, PROPS>[]
	| (string | VNode<NODE, PROPS>)[]
	| VNodeComponentSlots<NODE, PROPS>
