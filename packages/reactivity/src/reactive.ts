/**
 * reactive 系列API的实现
 *
 */

import { isObject } from '@vue3/shared'
import { Reactive, ShallowReactive } from '../types'
import { mutableHandlers, shallowReactiveHandlers } from './baseHandler'
import { ReactiveFlags } from './constants'

// @TODO Map 是强引用，如果对象作为键使用，即使该对象被垃圾回收，Map中对应键依旧存在。
// @TODO WeakMap 是弱引用，如果对象作为键使用，该对象被垃圾回收时，WeakMap中对应键自动销毁。

// 代理缓存，复用
const reactiveMap = new WeakMap()

export function reactive<T extends WeakKey>(target: T) {
	return createReactiveObject<T>(target, false, mutableHandlers) as Reactive<T>
}

export function shallowReactive<T extends WeakKey>(target: any) {
	return createReactiveObject<T>(target, true, shallowReactiveHandlers) as ShallowReactive<T>
}

export function isReactive(target: any) {
	return target ? target[ReactiveFlags.IS_REACTIVE] === ReactiveFlags.IS_REACTIVE : false
}

export function isReadable(target: any) {
	return target ? target[ReactiveFlags.IS_READABLE] === ReactiveFlags.IS_READABLE : false
}

export function isWritable(target: any) {
	return target ? target[ReactiveFlags.IS_WRITABLE] === ReactiveFlags.IS_WRITABLE : false
}

function createReactiveObject<T extends WeakKey>(target: T, isShallow: boolean, baseHandlers: ProxyHandler<any>) {
	if (!isObject(target) || isReactive(target)) {
		return target
	}

	// 是否已缓存，复用
	const existsProxy = reactiveMap.get(target)
	if (existsProxy != null) {
		return existsProxy
	}

	// 创建代理
	const proxy = new Proxy(target, baseHandlers)

	// 缓存代理
	reactiveMap.set(target, proxy)

	return proxy
}
