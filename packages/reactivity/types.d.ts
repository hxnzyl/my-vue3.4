import { ReactiveFlags, RefFlags } from './src/constants'
import { ReactiveEffect } from './src/reactiveEffect'

export interface Ref<T = any, S = T> {
	[RefFlags.IS_REF]: Symbol
	get value(): T
	set value(newValue: S)
}

export interface ReactiveEffectOptions {
	// 调度函数
	scheduler?: EffectScheduler
	// 是否允许递归
	allowRecurse?: boolean
}

export interface ComputedRef<T = any, S = T> extends Ref<T, S> {
	[ReactiveFlags.IS_READABLE]: Symbol
	[ReactiveFlags.IS_WRITABLE]: Symbol
}

export interface ComputedOptions<T, S> {
	get(): T
	set(value: S): void
}

export interface WatchOptions {
	immediate: boolean
	deep: boolean
	depth: number
}

export type EffectScheduler = (effect: ReactiveEffect) => any

export type Reactive<T extends WeakKey> = T & { [ReactiveFlags.IS_REACTIVE]: true }

export type ShallowReactive<T extends WeakKey> = T & { [ReactiveFlags.IS_SHALLOW_REACTIVE]: true }

export type Refs<T extends object> = { [K in keyof T]: Ref<any, any> }

export type ComputedGetter<T> = (oldValue?: T) => T

export type ComputedSetter<T> = (newValue: T) => void

export type ComputedProps<T, S = T> = ComputedGetter<T> | ComputedOptions<T, S>

export type WatchGetter<T> = () => T

export type WatchCallback<T> = (newValue?: T, oldValue?: T) => void
