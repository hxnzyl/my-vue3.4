export enum ShapeFlags {
	ELEMENT = 1, // 元素
	FUNCTIONAL_COMPONENT = 1 << 1, // 函数式组件
	STATEFUL_COMPONENT = 1 << 2, // 状态组件
	TEXT_CHILDREN = 1 << 3,
	ARRAY_CHILDREN = 1 << 4,
	SLOTS_CHILDREN = 1 << 5,
	TELEPORT = 1 << 6,
	SUSPENSE = 1 << 7,
	COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8,
	COMPONENT_KEPT_ALIVE = 1 << 9,
	COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT
}

export const VNodeFlags = {
	Node: Symbol('__vNode'),
	TextNode: Symbol('__vTextNode'),
	Fragment: Symbol('__vFragment')
}
