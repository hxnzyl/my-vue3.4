import { isFunction } from '@vue3/shared'
import { ReactiveEffectOptions } from '../types'
import { ReactiveEffect } from './reactiveEffect'

export function effect(fun: any, options?: ReactiveEffectOptions) {
	if (isFunction(fun)) {
		const reactiveEffect = new ReactiveEffect(fun, options)
		reactiveEffect.run()
	}
}
