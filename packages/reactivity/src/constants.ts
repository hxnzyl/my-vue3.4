export const ReactiveFlags = {
	// 用于判断是否被代理
	// 极端情况下，如果对象中存在 __v_isReactive 时后会出现无法代理的问题
	// @TODO 优化一：源代码中使用的是字符串，此处使用 Symbol 可提升唯一性
	IS_REACTIVE: Symbol('__v_isReactive'),
	IS_SHALLOW_REACTIVE: Symbol('__v_isShallowReactive'),
	IS_READABLE: Symbol('__v_isReadable'),
	IS_WRITABLE: Symbol('__v_isWritable')
}

export const RefFlags = {
	IS_REF: Symbol('__v_isRef'),
	RAW: Symbol('__v_raw')
}

export enum TriggerOpTypes {
	SET = 'set',
	ADD = 'add',
	DELETE = 'delete',
	CLEAR = 'clear'
}

export enum DirtyLevel {
	Dirty = 'yes',
	NoDirty = 'no'
}
