import { reactive, shallowReactive } from '@vue3/reactivity'
import { hasOwn, isFunction, isObject, isOn } from '@vue3/shared'
import { ReactiveEffect } from 'packages/reactivity/src/reactiveEffect'
import { VNodeComponentInstance, VNodeComponentSlots, VNodeComponentType, VNodeProps } from '../types'
import { Renderer } from './renderer'
import { queueJob } from './scheduler'
import { VNode } from './vNode'

export function createComponentInstance<NODE, PROPS extends VNodeProps>(
	vNode: VNode<NODE, PROPS>,
	component: VNodeComponentType<NODE, PROPS>
) {
	const instance: VNodeComponentInstance<NODE, PROPS> = Object.seal({
		props: void 0,
		attrs: void 0,
		data: void 0,
		methods: void 0,
		proxy: void 0,
		emits: void 0,
		slots: vNode.children as VNodeComponentSlots<NODE, PROPS>,
		vNode,
		render: component.render,
		subTree: null,
		isMounted: false,
		scheduler: (ctx: ReactiveEffect) => queueJob(ctx.run, ctx),
		emit(type: string, ...args: any[]) {
			const onType = `on${type[0].toUpperCase() + type.substring(1)}`
			const event = instance.emits && instance.emits[onType]
			event && event(...args)
		}
	})

	instance.proxy = new Proxy(instance, componentProxyHandlers)

	return instance
}

export function initComponentMethods<NODE, PROPS extends VNodeProps>(
	instance: VNodeComponentInstance<NODE, PROPS>,
	component: VNodeComponentType<NODE, PROPS>
) {
	if (isObject(component.methods)) {
		instance.methods = {}
		for (const key in component.methods) {
			instance.methods[key] = component.methods[key].bind(instance.proxy)
		}
	}
}

export function initComponentData<NODE, PROPS extends VNodeProps>(
	instance: VNodeComponentInstance<NODE, PROPS>,
	component: VNodeComponentType<NODE, PROPS>
) {
	if (isFunction(component.data)) {
		instance.data = reactive(component.data.call(instance.proxy))
	}
}

export function initComponentProps<NODE, PROPS extends VNodeProps>(
	instance: VNodeComponentInstance<NODE, PROPS>,
	component: VNodeComponentType<NODE, PROPS>
) {
	const externalProps = instance.vNode.props
	if (isObject(externalProps)) {
		instance.attrs = {} as PROPS
		instance.emits = {}
		const internalProps = component.props
		if (internalProps) {
			// 区分 attrs、props、emits
			const props = {} as PROPS
			for (const key in externalProps) {
				if (isOn(key)) {
					// 以 on 开头定义 events
					instance.emits[key] = externalProps[key]
				} else if (key in internalProps) {
					// 在组件定义中的是 props
					props[key as keyof PROPS] = externalProps[key]
				} else {
					// 不在组件定义的是 attrs
					instance.attrs[key as keyof PROPS] = externalProps[key]
				}
			}
			instance.props = shallowReactive<PROPS>(props)
		} else {
			// 组件未定义 props，那区分 attrs、emits
			for (const key in externalProps) {
				if (isOn(key)) {
					instance.emits[key] = externalProps[key]
				} else {
					instance.attrs[key as keyof PROPS] = externalProps[key]
				}
			}
		}
	}
}

export function initComponentEffect<NODE, PROPS extends VNodeProps>(
	instance: VNodeComponentInstance<NODE, PROPS>,
	renderer: Renderer<NODE, NODE, PROPS>,
	container: NODE,
	anchor?: NODE | null
) {
	// reactive effect
	new ReactiveEffect(
		() => {
			const { vNode, proxy, render, isMounted, subTree: oldTree } = instance
			const newTree = render.call(proxy)
			if (isMounted) {
				renderer.patch(newTree, oldTree!, anchor, instance)
				instance.subTree = newTree
			} else {
				instance.isMounted = false
				instance.subTree = newTree
				renderer.mount(container, newTree, anchor, instance)
				vNode.el = newTree.el
				vNode.component = instance
				instance.isMounted = true
			}
		},
		{
			// 调度更新
			scheduler: instance.scheduler
		}
	).run()
}

const componentExternalKey = ['data', 'props', 'methods']
const componentInternalMap: { [key: string]: string } = { $slots: 'slots', $emit: 'emit', $attrs: 'attrs' }

const componentProxyHandlers: ProxyHandler<any> = {
	get(target: any, key: string) {
		// external
		for (const contextKey of componentExternalKey) {
			if (hasOwn(target[contextKey], key)) {
				return target[contextKey][key]
			}
		}
		// internal
		if (key in componentInternalMap) {
			return target[componentInternalMap[key]]
		}
	},
	set(target: any, key: string, value: any) {
		// external
		for (const contextKey of componentExternalKey) {
			if (hasOwn(target[contextKey], key)) {
				target[contextKey][key] = value
				return true
			}
		}
		// internal
		if (key in componentInternalMap) {
			target[componentInternalMap[key]] = value
			return true
		}
		return false
	}
}
