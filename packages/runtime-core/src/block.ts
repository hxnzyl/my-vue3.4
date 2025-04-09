import { VNodeChildren, VNodeProps, VNodePropsPublic, VNodeTypes } from '../types'
import { PatchFlags } from './constants'
import { createVNode, VNode } from './vNode'

// 用于收集动态节点
let currentBlock: any = null

export function _openBlock() {
	currentBlock = []
}

export function _closeBlock() {
	currentBlock = null
}

export function _setupBlock<NODE, PROPS extends VNodeProps>(vNode: VNode<NODE, PROPS>) {
	vNode.dynamicChildren = currentBlock
	_closeBlock()
	return vNode
}

export function _createElementBlock<NODE, PROPS extends VNodeProps>(
	type: VNodeTypes<NODE, PROPS>,
	props?: VNodePropsPublic<PROPS>,
	children?: VNodeChildren<NODE, PROPS>,
	patchFlag?: PatchFlags
) {
	return _setupBlock(_createElementVNode(type, props, children, patchFlag))
}

export function _createElementVNode<NODE, PROPS extends VNodeProps>(
	type: VNodeTypes<NODE, PROPS>,
	props?: VNodePropsPublic<PROPS>,
	children?: VNodeChildren<NODE, PROPS>,
	patchFlag?: PatchFlags
) {
	const vNode = createVNode(type, props, children, patchFlag)
	if (currentBlock && patchFlag) {
		// 收集动态虚拟节点
		currentBlock.push(vNode)
	}
	return vNode
}
