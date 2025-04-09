/**
 * watch 系列API的实现
 *
 */

import { isObject } from '@vue3/shared'
import { Reactive, Ref, WatchCallback, WatchGetter, WatchOptions } from '../types'
import { isReactive } from './reactive'
import { ReactiveEffect } from './reactiveEffect'
import { isRef } from './ref'

/**
 * 监控响应式变量
 *
 * @param source
 * @param callback
 * @param options
 * @returns
 */
export function watch<T extends object>(
	source: Ref<T> | Reactive<T> | WatchGetter<T>,
	callback: WatchCallback<T>,
	options?: WatchOptions
) {
	let getter: WatchGetter<T>
	if (isRef(source)) {
		// 监控 ref
		getter = () => (source as Ref<T>).value
	} else if (isReactive(source)) {
		// 监牢 reactive
		getter = (() => source) as WatchGetter<T>
	} else {
		// 自定义方法
		getter = source as WatchGetter<T>
	}
	return new WatchEffect<T>(
		// 老值
		getter,
		// 选项
		Object.assign(
			{
				immediate: false,
				deep: false,
				depth: -1
			},
			options
		),
		// 回调函数
		callback
	)
}

/**
 * 监控响应式函数
 *
 * @param getter
 * @param options
 * @returns
 */
export function watchEffect<T extends object>(getter: WatchGetter<T>, options?: WatchOptions) {
	return new WatchEffect<T>(
		// 老值
		getter,
		// 选项
		Object.assign(
			{
				immediate: false,
				deep: false,
				depth: -1
			},
			options
		)
	)
}

class WatchEffect<T> {
	private _oldValue?: T
	private _newValue?: T
	private _effect: ReactiveEffect

	constructor(private _getter: WatchGetter<T>, private _options: WatchOptions, private _callback?: WatchCallback<T>) {
		if (!this._callback) {
			this._effect = new ReactiveEffect(() => this._runner())
		} else {
			this._effect = new ReactiveEffect(() => this._runner(), {
				// 调度器
				scheduler: () => {
					// -- setter 2.0
					this._effect.run()
					// -- setter 2.2
					this._callback!(this._newValue, this._oldValue)
				}
			})
		}

		if (this._options.immediate) {
			// - getter 1.0
			this._effect.trigger()
		} else {
			// - getter 1.0
			this._effect.run()
		}

		// 不可向实例中加入新属性，保证上下文安全
		Object.seal(this)
	}

	private _runner() {
		// - getter 1.1
		// -- setter 2.1
		this._oldValue = this._newValue
		// 访问自身
		this._newValue = this._getter()
		// 访问自身所有属性
		if (isObject(this._newValue)) {
			if (this._options.deep) {
				// 深访问
				this._deepGetter(this._newValue, 1)
			} else {
				// 浅访问
				for (const key in this._newValue) {
					this._newValue[key]
				}
			}
		}
	}

	private _deepGetter(source: any, currentDepth: number) {
		if (currentDepth <= this._options.depth) {
			for (const key in source) {
				const value = source[key]
				if (isObject(value)) {
					this._deepGetter(value, currentDepth + 1)
				}
			}
		}
	}
}
