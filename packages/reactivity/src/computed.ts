/**
 * computed 系列API的实现
 *
 */

import { isFunction } from '@vue3/shared'
import { ComputedGetter, ComputedOptions, ComputedProps, ComputedRef, ComputedSetter } from '../types'
import { ReactiveFlags } from './constants'
import { Dep } from './dep'
import { ReactiveEffect } from './reactiveEffect'

export function computed<T extends object, S = T>(target: ComputedProps<T, S>) {
	return new ComputedRefImpl<T, S>(target)
}

class ComputedRefImpl<T, S = T> implements ComputedRef<T | void, S> {
	public [ReactiveFlags.IS_READABLE] = ReactiveFlags.IS_READABLE
	public [ReactiveFlags.IS_WRITABLE] = ReactiveFlags.IS_WRITABLE

	// 依赖
	private _dep = new Dep()

	private _effect: ReactiveEffect
	private _getter: ComputedGetter<T>

	// 缓存值，最新的
	private _value?: T

	private _setter?: ComputedSetter<S>

	constructor(getterOrOptions: ComputedProps<T, S>) {
		if (isFunction(getterOrOptions)) {
			this._getter = getterOrOptions as ComputedGetter<T>
			this[ReactiveFlags.IS_WRITABLE] = ReactiveFlags.IS_READABLE
		} else {
			const options = getterOrOptions as ComputedOptions<T, S>
			this._getter = options.get
			this._setter = options.set
			this[ReactiveFlags.IS_READABLE] = ReactiveFlags.IS_WRITABLE
		}

		this._effect = new ReactiveEffect(
			() => {
				// 这里会触发 依赖收集
				const oldValue = this._value
				this._value = this._getter(oldValue)
			},
			{
				scheduler: () => {
					// 派发更新
					this._dep.trigger()
				}
			}
		)

		// 不可向实例中加入新属性，保证上下文安全
		Object.seal(this)
	}

	get value(): T | void {
		// 数据变脏后进行依赖收集
		if (this._effect.dirty) {
			this._effect.run()
			this._dep.track()
		}

		return this._value
	}

	set value(newValue: S) {
		if (this._setter === void 0) {
			throw new Error("Computed can't writable.")
		}

		this._setter(newValue)
	}
}
