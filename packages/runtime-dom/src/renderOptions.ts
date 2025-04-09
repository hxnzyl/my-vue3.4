import { isOn } from '@vue3/shared'
import { RendererOptions, VNodeComponentInstance, VNodeProps } from 'packages/runtime-core/types'
import { PatchAttr, PatchEvent, PatchEventKey, PatchEvi, PatchProp, PatchStyle } from '../types'
import { PatchPropKey } from './constants'
import patchAttr from './modules/patchAttr'
import patchClass from './modules/patchClass'
import patchEvent from './modules/patchEvent'
import patchStyle from './modules/patchStyle'

const renderOptions: RendererOptions<Node, Element, VNodeProps> = {
	insert(node: Node, parent: Node, child?: Node | null) {
		parent.insertBefore(node, child || null)
	},
	remove(node: Node) {
		node.parentNode?.removeChild(node)
	},
	setElementText(node: Node, text: string) {
		node.textContent = text
	},
	createFragment(): Node {
		return document.createDocumentFragment()
	},
	createElement(tag: string, namespace?: string, is?: ElementCreationOptions['is']): Element {
		return namespace === 'svg'
			? document.createElementNS('http://www.w3.org/2000/svg', tag)
			: namespace === 'MathML'
			? document.createElementNS('http://www.w3.org/1998/Math/MathML', tag)
			: is
			? document.createElement(tag, { is })
			: document.createElement(tag)
	},
	setScopeId(el: Element, id: string) {
		el.setAttribute(id, '')
	},
	setText(node: Node, text: string) {
		node.nodeValue = text
	},
	parentNode(node: Node): Node | null {
		return node.parentNode
	},
	nextSibling(node: Node): Node | null {
		return node.nextSibling
	},
	createText(text: string): Node {
		return document.createTextNode(text)
	},
	createComment(text: string): Node {
		return document.createComment(text)
	},
	querySelector(selector: string): Element | null {
		return document.querySelector(selector)
	},
	patchProp(
		node: Element,
		key: PatchPropKey | PatchEventKey,
		newValue: PatchProp | null,
		oldValue: PatchProp | null,
		component: VNodeComponentInstance<Element, VNodeProps> | null
	) {
		if (key === PatchPropKey.STYLE) {
			// HTMLElement 才有样式
			return patchStyle(node as HTMLElement, newValue as PatchStyle | null, oldValue as PatchStyle | null)
		}
		if (key === PatchPropKey.CLASS) {
			return patchClass(node, newValue as string | null, oldValue as string | null)
		}
		if (key === PatchPropKey.ATTR) {
			return patchAttr(node, newValue as PatchAttr | null, oldValue as PatchAttr | null)
		}
		if (key === PatchPropKey.EVENT || isOn(key)) {
			return patchEvent(
				node as Element & PatchEvi,
				key as PatchEventKey,
				newValue as PatchEvent,
				oldValue as PatchEvent
			)
		}
		if (component != null) {
			component.proxy[key] = newValue
			return
		}
	}
}

export default renderOptions
