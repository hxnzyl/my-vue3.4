import { isSameObject } from '@vue3/shared'
import { PatchPropKey } from 'packages/runtime-dom/src/constants'
import { RendererOptions, VNodeComponentInstance, VNodeComponentType, VNodeProps } from '../types'
import {
	createComponentInstance,
	initComponentData,
	initComponentEffect,
	initComponentMethods,
	initComponentProps
} from './component'
import { PatchFlags, ShapeFlags, VNodeFlags } from './constants'
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
			this.patchIf(container, newVNode, oldVNode)
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
	mount(container: NODE, newVNode: VNode<NODE, PROPS>, anchor?: NODE | null) {
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
			this.mountChildren(el, newVNode.children as VNode<NODE, PROPS>[], anchor)
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
				this.mountChildren(el, newVNode.children as VNode<NODE, PROPS>[], anchor)
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
	 * @param el
	 * @param newVNode
	 */
	mountProps(el: NODE, newVNode: VNode<NODE, PROPS>) {
		if (newVNode.props != null) {
			for (let key in newVNode.props) {
				this._options.patchProp(el, key, newVNode.props[key], null)
			}
		}
	}

	/**
	 * 挂载子节点
	 *
	 * @param el
	 * @param children
	 */
	mountChildren(el: NODE, children: VNode<NODE, PROPS>[], anchor?: NODE | null) {
		for (let i = 0, l = children.length; i < l; i++) {
			this.mount(el, children[i], anchor)
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
	 * 补丁，与原实现不同
	 * 这里只做补丁，不考虑oldVNode不存在的情况，因为我在patch之前都有判断
	 *
	 * @param newVNode
	 * @param oldVNode
	 * @param anchor
	 * @param parentComponent
	 */
	patch(newVNode: VNode<NODE, PROPS>, oldVNode: VNode<NODE, PROPS>, anchor?: NODE | null) {
		// 复用元素
		const el = (newVNode.el = oldVNode.el) as NODE
		// 复用组件
		const component = (newVNode.component = oldVNode.component)
		// props diff
		this.patchProps(el, newVNode, oldVNode, component)
		// children diff
		this.patchChildren(el, newVNode, oldVNode, anchor, component)
	}

	/**
	 * 补丁，如果 oldVNode 不存在
	 *
	 * @param container
	 * @param newVNode
	 * @param oldVNode
	 * @param anchor
	 */
	patchIf(container: NODE, newVNode: VNode<NODE, PROPS>, oldVNode?: VNode<NODE, PROPS> | null, anchor?: NODE | null) {
		if (oldVNode == null) {
			// 老的没有则是初始化
			this.mount(container, newVNode, anchor)
		} else if (this.isSameNode(newVNode, oldVNode)) {
			// 节点相同则挂载元素
			this.patch(newVNode, oldVNode, anchor)
		} else {
			// type 不一样 或 key 不一样
			this.unmount(oldVNode)
			this.mount(container, newVNode, anchor)
		}
	}

	/**
	 * 全量diff - props 补丁
	 *
	 * @param el
	 * @param newVNode
	 * @param oldVNode
	 */
	patchProps(
		el: NODE,
		newVNode: VNode<NODE, PROPS>,
		oldVNode: VNode<NODE, PROPS>,
		component?: VNodeComponentInstance<NODE, PROPS> | null
	) {
		const { props: newProps, dynamicProps, patchFlag } = newVNode
		const { props: oldProps } = oldVNode

		// props 一样
		if (isSameObject(newProps, oldProps)) {
			return
		}

		if (patchFlag && newProps && oldProps && !(patchFlag & PatchFlags.FULL_PROPS)) {
			// 靶向更新
			this.patchBlockProps(el, patchFlag, dynamicProps, newProps, oldProps, component)
		} else {
			// 全量更新
			if (newProps != null) {
				for (let key in newProps) {
					this._options.patchProp(el, key, newProps[key], null, component)
				}
			}
			if (oldProps != null) {
				for (let key in oldProps) {
					if (!newProps || newProps[key] == null) {
						this._options.patchProp(el, key, null, oldProps[key], component)
					}
				}
			}
		}
	}

	/**
	 * 全量diff - children 补丁
	 *
	 * @param newVNode
	 * @param oldVNode
	 * @returns
	 */
	patchChildren(
		el: NODE,
		newVNode: VNode<NODE, PROPS>,
		oldVNode: VNode<NODE, PROPS>,
		anchor?: NODE | null,
		component?: VNodeComponentInstance<NODE, PROPS> | null
	) {
		const { patchFlag, dynamicChildren } = newVNode
		if (patchFlag && dynamicChildren && patchFlag & PatchFlags.STABLE_FRAGMENT) {
			// 靶向更新
			this.patchBlockChildren(el, dynamicChildren, oldVNode.dynamicChildren!, anchor)
		} else {
			// 全量更新

			// shapeFlag 与 children 一样
			const { shapeFlag: newShapeFlag, children: newChildren } = newVNode
			const { shapeFlag: oldShapeFlag, children: oldChildren } = oldVNode
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
					ops.setElementText(el, newChildren as string)
				}
			} else if (oldShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
				// 老的是数组，新的是数组或空

				if (newShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
					// 老的是数组，新的是数组，全量 diff 算法
					this.patchKeyedChildren(
						el,
						newChildren as VNode<NODE, PROPS>[],
						oldChildren as VNode<NODE, PROPS>[],
						component
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
					ops.setElementText(el, '')
				}

				if (newShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
					// 新的是数组，挂载新的
					this.mountChildren(el, newChildren as VNode<NODE, PROPS>[], anchor, component)
				}
			}
		}
	}

	/**
	 * 线性diff - props 补丁
	 *
	 * @param el
	 * @param newVNode
	 * @param oldVNode
	 */
	patchBlockProps(
		el: NODE,
		patchFlag: PatchFlags,
		dynamicProps: string[] | null,
		newProps: PROPS,
		oldProps: PROPS,
		component?: VNodeComponentInstance<NODE, PROPS> | null
	) {
		const ops = this._options

		// class
		if (patchFlag & PatchFlags.CLASS) {
			if (oldProps.class !== newProps.class) {
				ops.patchProp(el, PatchPropKey.CLASS, null, newProps.class)
			}
		}

		// style
		if (patchFlag & PatchFlags.STYLE) {
			if (oldProps.style !== newProps.style) {
				ops.patchProp(el, PatchPropKey.STYLE, oldProps.style, newProps.style)
			}
		}

		// props
		if (dynamicProps && patchFlag & PatchFlags.PROPS) {
			for (let i = 0, l = dynamicProps.length; i < l; i++) {
				const key = dynamicProps[i]
				const prev = oldProps[key]
				const next = newProps[key]
				if (next !== prev || key === 'value') {
					ops.patchProp(el, key, prev, next, component)
				}
			}
		}
	}

	/**
	 * 线性diff - children 补丁
	 *
	 * @param newVNode
	 * @param oldVNode
	 * @returns
	 */
	patchBlockChildren(
		el: NODE,
		newChildren: VNode<NODE, PROPS>[],
		oldChildren: VNode<NODE, PROPS>[],
		anchor?: NODE | null
	) {
		for (let i = 0, l = newChildren.length; i < l; i++) {
			this.patchIf(el, newChildren[i], oldChildren[i], anchor)
		}
	}

	/**
	 * 全量 diff - children 补丁（递归深度diff，消耗性能）
	 *
	 * @param el
	 * @param newVNode
	 * @param oldVNode
	 */
	patchKeyedChildren(el: NODE, newVNodes: VNode<NODE, PROPS>[], oldVNodes: VNode<NODE, PROPS>[]) {
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
				this.patch(newVNode, oldVNode)
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
				this.patch(newVNode, oldVNode)
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
					this.mount(el, newVNodes[i], anchor)
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
					this.patch(newVNodes[newIndex], oldVNode)
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
						this._options.insert(newVNode.el, el, anchor)
					}
				} else {
					// 没元素则挂载
					this.mount(el, newVNode, anchor, component)
				}
				newEnd--
			}
		}

		//#endregion mount 和 unmount
	}
}
