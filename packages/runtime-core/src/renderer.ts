import { isSameObject } from '@vue3/shared'
import { RendererOptions, VNodeComponentInstance, VNodeComponentType, VNodeProps } from '../types'
import {
	createComponentInstance,
	initComponentData,
	initComponentEffect,
	initComponentMethods,
	initComponentProps
} from './component'
import { ShapeFlags, VNodeFlags } from './constants'
import { getSequence } from './seq'
import { VNode } from './vNode'

export function createRenderer<NODE, ELEM extends NODE, PROPS extends VNodeProps>(
	options: RendererOptions<NODE, ELEM, PROPS>
) {
	return new Renderer<NODE, ELEM, PROPS>(options)
}

export class Renderer<NODE, ELEM extends NODE, PROPS extends VNodeProps> {
	constructor(private _options: RendererOptions<NODE, ELEM, PROPS>) {
		Object.seal(this)
	}

	/**
	 * 将 vNode 渲染到 container
	 *
	 * @param newVNode 全新的 vNode
	 * @param container
	 */
	render(newVNode: VNode<NODE, PROPS> | null, container: NODE) {
		// @ts-ignore
		const oldVNode = container[VNodeFlags.Node]
		if (newVNode == null) {
			if (oldVNode != null) {
				this.unmount(oldVNode)
				// @ts-ignore
				delete container[VNodeFlags.Node]
			}
		} else {
			// container 中挂载一个 vNode
			// @ts-ignore
			// 虚拟节点都相同都不需要补丁
			if (oldVNode == null) {
				// 老的没有则是初始化
				this.mount(container, newVNode)
			} else if (this.isSameNode(newVNode, oldVNode)) {
				// 节点相同则挂载元素
				this.patch(newVNode, oldVNode)
			} else {
				// type 不一样 或 key 不一样
				this.unmount(oldVNode)
				this.mount(container, newVNode)
			}
			// @ts-ignore
			container[VNodeFlags.Node] = newVNode
		}
	}

	/**
	 * 节点是否相同
	 *
	 * @param newVNode
	 * @param oldVNode
	 * @returns
	 */
	isSameNode(newVNode: VNode<NODE, PROPS>, oldVNode: VNode<NODE, PROPS>) {
		return oldVNode.type === newVNode.type && oldVNode.key === newVNode.key
	}

	/**
	 * 元素挂载
	 *
	 * @param container
	 * @param newVNode
	 * @param anchor
	 */
	mount(
		container: NODE,
		newVNode: VNode<NODE, PROPS>,
		anchor?: NODE | null,
		parentComponent?: VNodeComponentInstance<NODE, PROPS> | null
	) {
		let el = newVNode.el,
			init = !el
		if (newVNode.type == VNodeFlags.TextNode) {
			// TextNode
			el || (el = newVNode.el = this._options.createText(newVNode.children as string))
			// 挂载文本
			init || this._options.setText(el, newVNode.children as string)
		} else if (newVNode.type == VNodeFlags.Fragment) {
			// Fragment
			el || (el = newVNode.el = this._options.createFragment())
			// 挂载数组
			this.mountChildren(el, newVNode.children as VNode<NODE, PROPS>[], anchor, parentComponent)
		} else if (newVNode.shapeFlag & ShapeFlags.COMPONENT) {
			// Component
			this.mountComponent(container, newVNode, anchor)
		} else {
			// Element
			el || (el = newVNode.el = this._options.createElement(newVNode.type as string))
			// props 补丁
			this.mountProps(el, newVNode)
			// 挂载文本
			if (newVNode.shapeFlag & ShapeFlags.TEXT_CHILDREN) {
				this._options.setElementText(el, newVNode.children as string)
			}
			// 挂载数组
			else if (newVNode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
				this.mountChildren(el, newVNode.children as VNode<NODE, PROPS>[], anchor, parentComponent)
			}
		}
		// 如果是 Component 时，需要等 mounted 之后才会挂载
		el && this._options.insert(el, container, anchor)
	}

	/**
	 * 挂载组件
	 *
	 * @param container
	 * @param vNode
	 * @param anchor
	 */
	mountComponent(container: NODE, vNode: VNode<NODE, PROPS>, anchor?: NODE | null) {
		// init instance
		const component = vNode.type as VNodeComponentType<NODE, PROPS>
		const instance = createComponentInstance<NODE, PROPS>(vNode, component)
		// init methods
		initComponentMethods<NODE, PROPS>(instance, component)
		// init data
		initComponentData<NODE, PROPS>(instance, component)
		// init props
		initComponentProps<NODE, PROPS>(instance, component)
		// reactive effect
		initComponentEffect<NODE, PROPS>(instance, this, container, anchor)
	}

	/**
	 * 挂载props
	 *
	 * @param container
	 * @param newVNode
	 */
	mountProps(container: NODE, newVNode: VNode<NODE, PROPS>) {
		if (newVNode.props != null) {
			for (let key in newVNode.props) {
				this._options.patchProp(container, key, newVNode.props[key], null)
			}
		}
	}

	/**
	 * 挂载子节点
	 *
	 * @param container
	 * @param children
	 */
	mountChildren(
		container: NODE,
		children: VNode<NODE, PROPS>[],
		anchor?: NODE | null,
		parentComponent?: VNodeComponentInstance<NODE, PROPS> | null
	) {
		for (let i = 0, l = children.length; i < l; i++) {
			this.mount(container, children[i], anchor, parentComponent)
		}
	}

	/**
	 * 卸载节点
	 *
	 * @param vNode
	 */
	unmount(vNode?: VNode<NODE, PROPS> | null) {
		if (vNode && vNode.el != null) {
			if (vNode.type == VNodeFlags.Fragment) {
				// Fragment
				this.unmountChildren(vNode.children as VNode<NODE, PROPS>[])
			} else if (vNode.shapeFlag % ShapeFlags.COMPONENT) {
				// Component
				this.unmount(vNode.component?.subTree)
			} else {
				// TextNode or Element
				this._options.remove(vNode.el)
			}
		}
	}

	/**
	 * 卸载子节点
	 *
	 * @param vNode
	 */
	unmountChildren(children: VNode<NODE, PROPS>[]) {
		for (let i = 0, l = children.length; i < l; i++) {
			this.unmount(children[i])
		}
	}

	/**
	 * 补丁
	 *
	 * @param newVNode
	 * @param oldVNode
	 * @param anchor
	 * @param parentComponent
	 */
	patch(
		newVNode: VNode<NODE, PROPS>,
		oldVNode: VNode<NODE, PROPS>,
		anchor?: NODE | null,
		parentComponent?: VNodeComponentInstance<NODE, PROPS> | null
	) {
		// 新的复用老的元素
		const el = (newVNode.el = oldVNode.el) as NODE
		// 新的复用老的组件
		const component = (newVNode.component = oldVNode.component)
		// 挂载属性
		this.patchProps(el, newVNode, oldVNode, component, parentComponent)
		// 挂载子级
		this.patchChildren(el, newVNode, oldVNode, anchor, component, parentComponent)
	}

	/**
	 * props 补丁
	 *
	 * @param container
	 * @param newVNode
	 * @param oldVNode
	 */
	patchProps(
		container: NODE,
		newVNode: VNode<NODE, PROPS>,
		oldVNode: VNode<NODE, PROPS>,
		component?: VNodeComponentInstance<NODE, PROPS> | null,
		parentComponent?: VNodeComponentInstance<NODE, PROPS> | null
	) {
		const { props: newProps } = newVNode
		const { props: oldProps } = oldVNode

		// props 一样
		if (isSameObject(newProps, oldProps)) {
			return
		}

		if (newProps != null) {
			for (let key in newProps) {
				this._options.patchProp(container, key, newProps[key], null, component)
			}
		}

		if (oldProps != null) {
			for (let key in oldProps) {
				if (!newProps || newProps[key] == null) {
					this._options.patchProp(container, key, null, oldProps[key], component)
				}
			}
		}
	}

	/**
	 * 两个数组的全量 diff 算法（比较消耗性能）
	 *
	 * @param container
	 * @param newVNode
	 * @param oldVNode
	 */
	patchKeyedChildren(
		container: NODE,
		newVNodes: VNode<NODE, PROPS>[],
		oldVNodes: VNode<NODE, PROPS>[],
		component?: VNodeComponentInstance<NODE, PROPS> | null,
		parentComponent?: VNodeComponentInstance<NODE, PROPS> | null
	) {
		// 双端比较
		let i = 0
		let newEnd = newVNodes.length - 1
		let oldEnd = oldVNodes.length - 1

		//#region 从头开始 diff

		while (i <= newEnd && i <= oldEnd) {
			const newVNode = newVNodes[i]
			const oldVNode = oldVNodes[i]
			if (this.isSameNode(newVNode, oldVNode)) {
				// 节点相同则复用
				this.patch(newVNode, oldVNode, void 0, parentComponent)
				i++
			} else {
				break
			}
		}

		//#endregion 从头开始 diff

		//#region 从尾开始 diff

		while (i <= newEnd && i <= oldEnd) {
			const newVNode = newVNodes[newEnd]
			const oldVNode = oldVNodes[oldEnd]
			if (this.isSameNode(newVNode, oldVNode)) {
				// 节点相同则重新挂载元素
				this.patch(newVNode, oldVNode, void 0, parentComponent)
				newEnd--
				oldEnd--
			} else {
				break
			}
		}

		//#endregion 从尾开始 diff

		//#region mount 和 unmount

		if (i > oldEnd) {
			// i > oldEnd
			// 新的比老的多，范围是 i -> newEnd
			if (i <= newEnd) {
				const anchor = newVNodes[newEnd + 1]?.el as NODE
				while (i <= newEnd) {
					this.mount(container, newVNodes[i], anchor, component)
					i++
				}
			}
		} else if (i > newEnd) {
			// i <= oldEnd
			// 老的比新的多，范围是 i -> oldEnd
			while (i <= oldEnd) {
				this.unmount(oldVNodes[i])
				i++
			}
		} else {
			// 中间部分
			// newStart = i, newStart -> newEnd
			// oldStart = i, oldStart -> oldEnd
			let oldStart = i,
				newStart = i,
				moved = false,
				maxNewIndexSoFar = 0
			// 收集新的 key
			const keyToNewIndexMap = new Map()
			const newIndexToOldIndexMap = new Array(newEnd - i + 1).fill(0)
			while (newStart <= newEnd) {
				const newVNode = newVNodes[newStart]
				if (newVNode.key != null) {
					if (keyToNewIndexMap.has(newVNode.key)) {
						// key 重复了
						console.warn(`VNode Key "${newVNode.key.toString()}" duplicate.`)
					}
					keyToNewIndexMap.set(newVNode.key, newStart)
				}
				newStart++
			}
			// 新老 patch
			while (oldStart <= oldEnd) {
				const oldVNode = oldVNodes[oldStart]
				const newIndex = keyToNewIndexMap.get(oldVNode.key)
				if (newIndex == null) {
					// 老的有，新的没有，则卸载老的
					this.unmount(oldVNode)
				} else {
					// + 1: 区分索引0
					newIndexToOldIndexMap[newIndex - i] = oldStart + 1
					if (newIndex >= maxNewIndexSoFar) {
						maxNewIndexSoFar = newIndex
					} else {
						moved = true
					}
					// 老的有，新的也有，则复用
					this.patch(newVNodes[newIndex], oldVNode, void 0, component)
				}
				oldStart++
			}
			// 调整顺序，倒序插入
			const sequence = moved ? getSequence(newIndexToOldIndexMap) : []
			let seq = sequence.length - 1
			while (newEnd >= i) {
				const newVNode = newVNodes[newEnd]
				const anchor = newVNodes[newEnd + 1]?.el
				if (newVNode.el) {
					if (sequence[seq] === newEnd - i) {
						// 在递增子序列中则不需要进行 dom 操作
						// console.log(newVNode)
						seq--
					} else {
						// 有元素则移动
						this._options.insert(newVNode.el, container, anchor)
					}
				} else {
					// 没元素则挂载
					this.mount(container, newVNode, anchor, component)
				}
				newEnd--
			}
		}

		//#endregion mount 和 unmount
	}

	/**
	 * children 补丁
	 *
	 * @param newVNode
	 * @param oldVNode
	 * @returns
	 */
	patchChildren(
		container: NODE,
		newVNode: VNode<NODE, PROPS>,
		oldVNode: VNode<NODE, PROPS>,
		anchor?: NODE | null,
		component?: VNodeComponentInstance<NODE, PROPS> | null,
		parentComponent?: VNodeComponentInstance<NODE, PROPS> | null
	) {
		const { shapeFlag: newShapeFlag, children: newChildren } = newVNode
		const { shapeFlag: oldShapeFlag, children: oldChildren } = oldVNode

		// shapeFlag 与 children 一样
		if (newShapeFlag === oldShapeFlag && isSameObject(newChildren, oldChildren)) {
			return
		}

		const ops = this._options

		if (newShapeFlag & ShapeFlags.TEXT_CHILDREN) {
			// 新的是文本

			if (oldShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
				// 新的是文本，老的是数组，卸载老的
				this.unmountChildren(oldChildren as VNode<NODE, PROPS>[])
			}

			if (newChildren !== oldChildren) {
				// 新的是文本，设置文本
				ops.setElementText(container, newChildren as string)
			}
		} else if (oldShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
			// 老的是数组，新的是数组或空

			if (newShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
				// 老的是数组，新的是数组，全量 diff 算法
				this.patchKeyedChildren(
					container,
					newChildren as VNode<NODE, PROPS>[],
					oldChildren as VNode<NODE, PROPS>[],
					component,
					parentComponent
				)
				// 无 diff 算法
				// 卸载老的
				// this.unmountChildren(oldChildren as VNode<NODE, PROPS>[])
				// 挂载新的
				// this.mountChildren(el, newChildren as VNode<NODE, PROPS>[])
			} else {
				// 老的是数组，新的是空，卸载老的
				this.unmountChildren(oldChildren as VNode<NODE, PROPS>[])
			}
		} else {
			// 老的是文本或空，新的是数组或空

			if (oldShapeFlag & ShapeFlags.TEXT_CHILDREN) {
				// 老的是文本，新的是数组或空，清空文本
				ops.setElementText(container, '')
			}

			if (newShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
				// 新的是数组，挂载新的
				this.mountChildren(container, newChildren as VNode<NODE, PROPS>[], anchor, component)
			}
		}
	}
}
