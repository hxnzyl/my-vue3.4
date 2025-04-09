import { isObject } from '@vue3/shared'
import { ReactiveFlags, TriggerOpTypes } from './constants'
import { Dep, DepsMap } from './dep'
import { reactive } from './reactive'
import { activeEffect } from './reactiveEffect'
import { isRef, unref } from './ref'

//  用于存放依赖收集关系的map
class TargetMap extends WeakMap<any, DepsMap> {
	// 格式如下：
	// user = { name: '1', age: '2' }
	// struct {
	// 	'[user Object]': {
	// 		// 属性被 get 后才存在
	// 		name: {
	// 			'0': 'ReactiveEffect Instance'
	// 		},
	// 		age: {
	// 			'0': 'ReactiveEffect Instance'
	// 		}
	// 	}
	// }

	getDepsMap(target: any) {
		let depsMap = this.get(target)
		if (!depsMap) {
			depsMap = new DepsMap()
			this.set(target, depsMap)
		}
		return depsMap
	}
}

class MutableReactiveHandler implements ProxyHandler<any> {
	constructor(private _isShallow: boolean) {}

	get(target: any, key: PropertyKey, receiver: any): any {
		// 如果读取到 __v_isReactive 则表示已代理
		if (key === ReactiveFlags.IS_REACTIVE) {
			return ReactiveFlags.IS_REACTIVE
		}

		// 收集依赖，绑定 effect
		track(target, key)

		// receiver 是代理对象
		// Reflect：用于对象的基本操作，隐式的，有哪基本属性可以详见W3C官网
		// 使用 Reflect 是为了防止对象中存在的读取器通过 this. 访问自身属性时也命中 get
		const result = Reflect.get(target, key, receiver)

		// 深度代理
		return !this._isShallow && isObject(result) ? reactive(result) : result
	}

	set(target: any, key: PropertyKey, value: any, receiver: any): boolean {
		const oldValue = target[key]
		if (oldValue === value) {
			return true
		}

		const result = Reflect.set(target, key, value, receiver)

		// 派发更新，新老值不同时
		trigger(target, TriggerOpTypes.SET, key, value, oldValue)

		return result
	}
}

class ShallowUnwrapHandler {
	get(target: any, key: PropertyKey, receiver: any): any {
		return unref(Reflect.get(target, key, receiver))
	}

	set(target: any, key: PropertyKey, value: any, receiver: any): boolean {
		const oldValue = target[key]
		if (isRef(oldValue) && !isRef(value)) {
			oldValue.value = value
			return true
		} else {
			return Reflect.set(target, key, value, receiver)
		}
	}
}

/**
 * 依赖收集：用于将每个对象的属性依赖关系记录下来
 *
 * @param target
 * @param key
 */
function track(target: object, key: PropertyKey) {
	// 如果全局没有 effect 则表示不是在 effect 函数中调用的依赖，则不需要处理
	if (activeEffect !== void 0) {
		// 获取对象容器
		const depsMap: DepsMap = targetMap.getDepsMap(target)
		// 初始化属性收集器
		const dep: Dep = depsMap.getDep(key)
		// 绑定关系
		activeEffect.track(dep)
	}
}

/**
 * 派发更新：运行所有 target 的依赖
 *
 * @param target
 * @param opType
 * @param key
 * @param newValue
 * @param oldValue
 * @returns
 */
function trigger(target: object, opType: TriggerOpTypes, key: PropertyKey, newValue: any, oldValue: any) {
	const depsMap = targetMap.get(target)
	if (!depsMap) {
		return
	}

	switch (opType) {
		case TriggerOpTypes.CLEAR:
			// 依赖清理
			break
		case TriggerOpTypes.SET:
			// 依赖更新
			depsMap.get(key)?.trigger()
			break
	}
}

const targetMap = new TargetMap()

export const mutableHandlers = new MutableReactiveHandler(false)
export const shallowReactiveHandlers = new MutableReactiveHandler(true)

export const shallowUnwrapHandlers = new ShallowUnwrapHandler()

// setTimeout(() => {
// 	console.log(targetMap)
// }, 3000)
