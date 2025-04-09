import { isObject, isScalar } from '@vue3/shared'
import {
	VNodeChildren,
	VNodeComponentInstance,
	VNodeComponentType,
	VNodeProps,
	VNodePropsPublic,
	VNodeTypes
} from '../types'
import { VNodeComponentSlots } from './../types.d'
import { ShapeFlags, VNodeFlags } from './constants'

/**
 * 创建虚拟节点
 *
 * @param type
 * @param props
 * @param children
 * @returns
 */
export function createVNode<NODE, PROPS extends VNodeProps>(
	type: VNodeTypes<NODE, PROPS>,
	props?: VNodePropsPublic<PROPS>,
	children?: VNodeChildren<NODE, PROPS>
) {
	return new VNode<NODE, PROPS>(type, props, children)
}

/**
 * 判断是否为虚拟节点
 *
 * @param vNode
 * @returns
 */
export function isVNode<NODE, PROPS extends VNodeProps>(vNode: any): vNode is VNode<NODE, PROPS> {
	return vNode ? vNode.__vNode === VNodeFlags.Node : false
}

export class VNode<NODE, PROPS extends VNodeProps> {
	public __vNode = VNodeFlags.Node

	public el: NODE | null = null
	public key: PropertyKey | null = null

	public props: PROPS | null = null

	// 子级
	public children: string | VNode<NODE, PROPS>[] | VNodeComponentSlots<NODE, PROPS> | null = null

	// 组件
	public component: VNodeComponentInstance<NODE, PROPS> | null = null

	// 默认为元素
	public shapeFlag: number = ShapeFlags.ELEMENT

	constructor(
		public type: VNodeTypes<NODE, PROPS>,
		props?: VNodePropsPublic<PROPS>,
		children?: string | VNodeChildren<NODE, PROPS>
	) {
		// 组件
		if (isObject(type)) {
			this.shapeFlag = ShapeFlags.COMPONENT
			this.type = type as VNodeComponentType<NODE, PROPS>
		}

		// 子节点
		if (children != null) {
			if (isScalar(children)) {
				// 子节点是标量
				this.children = children as string
				this.shapeFlag |= ShapeFlags.TEXT_CHILDREN
			} else if (Array.isArray(children)) {
				// 子节点是元素数组
				for (let i = 0, l = children.length; i < l; i++) {
					if (isVNode(children[i])) {
						// VNode
						continue
					}
					if (isScalar(children[i])) {
						// VText
						children[i] = createVNode(VNodeFlags.TextNode, void 0, children[i])
					} else if (Array.isArray(children[i])) {
						// VFrag
						children[i] = createVNode(VNodeFlags.Fragment, void 0, children[i])
					} else {
						// Invalid
						throw new Error(`Invalid VNode Children: #${i} ${children[i]}`)
					}
				}
				this.children = children as VNode<NODE, PROPS>[]
				this.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
			} else if (isObject(children)) {
				// 子节点是插槽
				this.children = children as VNodeComponentSlots<NODE, PROPS>
				this.shapeFlag |= ShapeFlags.SLOTS_CHILDREN
			} else {
				// Invalid
				throw new Error(`Invalid VNode Children: ${children}`)
			}
		}

		// 有key则设置，但props中不保留，保证后续patch时不会出现多余的key
		if (props != null) {
			const key = props.key
			if (key != null) {
				this.key = key
				delete props.key
			}
			this.props = props
		}

		Object.seal(this)
	}
}
