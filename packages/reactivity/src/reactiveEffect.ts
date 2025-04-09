import { isFunction } from '@vue3/shared'
import { EffectScheduler, ReactiveEffectOptions } from '../types'
import { DirtyLevel as Dirty } from './constants'
import { Dep } from './dep'

export let activeEffect: ReactiveEffect

export class ReactiveEffect {
	// 记录运行状态，防止递归
	private _running = 0

	// 记录数据状态，脏的/不脏的
	private _dirty: Dirty = Dirty.Dirty

	// 用于记录当前 effect 执行了几次
	private _trackId: number = 0

	private _deps: Array<Dep> = []
	private _depsIndex = 0

	constructor(private _fn: EffectScheduler, private _options: ReactiveEffectOptions = {}) {}

	/**
	 * 是脏数据
	 */
	get dirty(): boolean {
		return this._dirty === Dirty.Dirty
	}

	/**
	 * 运行 effect
	 *
	 * @returns
	 */
	public run() {
		// 防止递归调用
		if (this._running !== 0 && !this._options.allowRecurse) return
		// 先备份上一个 effect，这里实际是个栈式调用
		let prevEffect = activeEffect
		this._start()
		try {
			return this._fn(this)
		} finally {
			this._stop(prevEffect)
		}
	}

	/**
	 * 收集依赖，记录双向关系
	 *
	 * @param dep
	 */
	public track(dep: Dep) {
		const oldTrackId = dep.get(this)
		if (oldTrackId !== this._trackId) {
			dep.set(this, this._trackId)
			const oldDep = this._deps[this._depsIndex]
			if (oldDep === dep) {
				this._depsIndex++
			} else {
				if (oldDep) {
					oldDep.clearup(this)
				}
				this._deps[this._depsIndex++] = dep
			}
		}
	}

	/**
	 * 派发更新
	 *
	 * @param dep
	 */
	public trigger() {
		const { scheduler } = this._options
		if (scheduler && isFunction(scheduler)) {
			// 数据变脏
			this._dirty = Dirty.Dirty
			scheduler(this)
		} else {
			this.run()
		}
	}

	/**
	 * 运行前的准备工作
	 */
	private _start() {
		this._running++
		// 活跃当前 effect
		activeEffect = this
		// 每个effect从头开始收集
		this._depsIndex = 0
		// 确保同一个收集时ID是相同的
		// 初始化时，从1开始
		this._trackId++
		// 执行前不脏，用于决定是否更新
		this._dirty = Dirty.NoDirty
	}

	/**
	 * 运行后的相关工作
	 * 1. 修正依赖
	 * 2. 裁剪双向关系
	 */
	private _stop(effect: ReactiveEffect) {
		let i = this._depsIndex,
			l = this._deps.length,
			t = i
		if (l > i) {
			for (; i < l; i++) {
				this._deps[i].clearup(this)
			}
			this._deps.length = t
		}
		// 还原备份的 effect
		activeEffect = effect
		this._running--
	}
}
