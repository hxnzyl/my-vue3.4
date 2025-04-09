import { createRenderer, Renderer } from 'packages/runtime-core/src/renderer'
import { VNode } from 'packages/runtime-core/src/vNode'
import { PatchProp, PatchProps } from '../types'
import { PatchPropKey } from './constants'
import renderOptions from './renderOptions'

let renderer: Renderer<Node, Element, PatchProps, PatchPropKey, PatchProp>

export function render(vNode: VNode<Element, PatchProps>, container: Element) {
	if (!renderer) {
		renderer = createRenderer(renderOptions)
	}

	return renderer.render(vNode, container)
}
