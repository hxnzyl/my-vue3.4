import { activeEffect, ReactiveEffect } from './reactiveEffect'

export class DepsMap extends Map<PropertyKey, Dep> {
	public getDep(key: PropertyKey) {
		let dep = this.get(key)
		if (!dep) {
			dep = new Dep(this, key)
			this.set(key, dep)
		}
		return dep
	}
}

export class Dep extends Map<ReactiveEffect, number> {
	constructor(private _depsMap?: DepsMap, private _key?: PropertyKey) {
		super()
	}

	public track() {
		activeEffect?.track(this)
	}

	public trigger() {
		this.forEach((_, effect: ReactiveEffect) => {
			effect.trigger()
		})
	}

	/**
	 * 删除 effect，如果为空则删除自己
	 *
	 * @param effect
	 */
	public clearup(effect: ReactiveEffect) {
		this.delete(effect)
		if (this._depsMap && this._key && this.size === 0) {
			this._depsMap.delete(this._key)
		}
	}
}
