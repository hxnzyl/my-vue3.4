/**
 * ref 系列API的实现
 *
 */

import { Ref, Refs } from '../types'
import { shallowUnwrapHandlers } from './baseHandler'
import { RefFlags } from './constants'
import { Dep } from './dep'
import { reactive } from './reactive'

/**
 * 不确定类型的响应式对象
 *
 * @param value
 * @returns
 */
export function ref<T extends object>(value: T): Ref<T> {
	return createRefObject<T>(value, false)
}

/**
 * 返回 ref 的值
 *
 * @param value
 * @returns
 */
export function unref<T extends object>(value: Ref<T>): T {
	return isRef(value) ? value.value : (value as T)
}

/**
 * 将对象中某个属性转成响应式对象
 *
 * @param target
 * @param key
 * @returns
 */
export function toRef<T extends object, K extends keyof T>(target: T, key: K): Ref<T[K], any> {
	return new ObjectRefImpl<T, K>(target, key)
}

/**
 * 将对象中所有属性转成响应式对象
 *
 * @param target
 * @param key
 * @returns
 */
export function toRefs<T extends object>(target: T): Refs<T> {
	const refs = {} as Refs<T>

	for (const key in target) {
		refs[key] = toRef<T, typeof key>(target, key)
	}

	return refs
}

/**
 * 代理 refs
 *
 * @param target
 * @returns
 */
export function proxyRefs<T extends object>(target: Refs<T>) {
	return new Proxy(target, shallowUnwrapHandlers)
}

/**
 * 判断是否为 ref 对象
 *
 * @param value
 * @returns
 */
export function isRef(value: any): boolean {
	return value ? value[RefFlags.IS_REF] === RefFlags.IS_REF : false
}

/**
 * 创建一个响应式对象
 *
 * @param value
 * @param isShallow
 * @returns
 */
function createRefObject<T extends object>(value: T, isShallow: boolean): RefImpl<T> {
	return isRef(value) ? (value as RefImpl<T>) : new RefImpl<T>(value, isShallow)
}

class RefImpl<T extends object> implements Ref<T, any> {
	public [RefFlags.IS_REF] = RefFlags.IS_REF

	// 如果为 复杂类型 则是 reactive，否则是原始值
	private _value: any

	// 依赖
	private _dep = new Dep()

	/**
	 *
	 * @param _rawValue
	 */
	constructor(private _rawValue: T, private _isShallow: boolean) {
		// 这里需要转成 reactive 对象
		// 如果不是对象 会返回 this._rawValue
		this._value = reactive(this._rawValue)
		// 不可向实例中加入新属性，保证上下文安全
		Object.seal(this)
	}

	/**
	 * 读取 代理值
	 *
	 * @returns
	 */
	public get value(): T {
		// 收集依赖
		this._dep.track()

		// 返回新值
		return this._value
	}

	/**
	 * 设置 代理值
	 *
	 * @param newValue
	 */
	public set value(newValue: any) {
		// Object.is 更加严格，比如: NaN与NaN为true，+0与-0为false
		if (Object.is(this._rawValue, newValue)) {
			return
		}

		this._rawValue = newValue

		// 此处保证了响应式的延续
		this._value = reactive(newValue)

		// 派发更新
		this._dep.trigger()
	}
}

class ObjectRefImpl<T, K extends keyof T> implements Ref<T[K], any> {
	public [RefFlags.IS_REF] = RefFlags.IS_REF

	constructor(private _object: T, private _key: K) {
		// 不可操作
		Object.seal(this)
	}

	get value(): T[K] {
		return this._object[this._key]
	}

	set value(newValue: any) {
		this._object[this._key] = newValue
	}
}
