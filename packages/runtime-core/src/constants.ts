export const VNodeFlags = {
	Node: Symbol('__vNode'),
	TextNode: Symbol('__vTextNode'),
	Fragment: Symbol('__vFragment')
}

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

export enum PatchFlags {
	/**
	 * Indicates an element with dynamic textContent (children fast path)
	 */
	TEXT = 1,

	/**
	 * Indicates an element with dynamic class binding.
	 */
	CLASS = 1 << 1,

	/**
	 * Indicates an element with dynamic style
	 * The compiler pre-compiles static string styles into static objects
	 * + detects and hoists inline static objects
	 * e.g. `style="color: red"` and `:style="{ color: 'red' }"` both get hoisted
	 * as:
	 * ```js
	 * const style = { color: 'red' }
	 * render() { return e('div', { style }) }
	 * ```
	 */
	STYLE = 1 << 2,

	/**
	 * Indicates an element that has non-class/style dynamic props.
	 * Can also be on a component that has any dynamic props (includes
	 * class/style). when this flag is present, the vnode also has a dynamicProps
	 * array that contains the keys of the props that may change so the runtime
	 * can diff them faster (without having to worry about removed props)
	 */
	PROPS = 1 << 3,

	/**
	 * Indicates an element with props with dynamic keys. When keys change, a full
	 * diff is always needed to remove the old key. This flag is mutually
	 * exclusive with CLASS, STYLE and PROPS.
	 */
	FULL_PROPS = 1 << 4,

	/**
	 * Indicates an element that requires props hydration
	 * (but not necessarily patching)
	 * e.g. event listeners & v-bind with prop modifier
	 */
	NEED_HYDRATION = 1 << 5,

	/**
	 * Indicates a fragment whose children order doesn't change.
	 */
	STABLE_FRAGMENT = 1 << 6,

	/**
	 * Indicates a fragment with keyed or partially keyed children
	 */
	KEYED_FRAGMENT = 1 << 7,

	/**
	 * Indicates a fragment with unkeyed children.
	 */
	UNKEYED_FRAGMENT = 1 << 8,

	/**
	 * Indicates an element that only needs non-props patching, e.g. ref or
	 * directives (onVnodeXXX hooks). since every patched vnode checks for refs
	 * and onVnodeXXX hooks, it simply marks the vnode so that a parent block
	 * will track it.
	 */
	NEED_PATCH = 1 << 9,

	/**
	 * Indicates a component with dynamic slots (e.g. slot that references a v-for
	 * iterated value, or dynamic slot names).
	 * Components with this flag are always force updated.
	 */
	DYNAMIC_SLOTS = 1 << 10,

	/**
	 * Indicates a fragment that was created only because the user has placed
	 * comments at the root level of a template. This is a dev-only flag since
	 * comments are stripped in production.
	 */
	DEV_ROOT_FRAGMENT = 1 << 11,

	/**
	 * SPECIAL FLAGS -------------------------------------------------------------
	 * Special flags are negative integers. They are never matched against using
	 * bitwise operators (bitwise matching should only happen in branches where
	 * patchFlag > 0), and are mutually exclusive. When checking for a special
	 * flag, simply check patchFlag === FLAG.
	 */

	/**
	 * Indicates a cached static vnode. This is also a hint for hydration to skip
	 * the entire sub tree since static content never needs to be updated.
	 */
	CACHED = -1,
	/**
	 * A special flag that indicates that the diffing algorithm should bail out
	 * of optimized mode. For example, on block fragments created by renderSlot()
	 * when encountering non-compiler generated slots (i.e. manually written
	 * render functions, which should always be fully diffed)
	 * OR manually cloneVNodes
	 */
	BAIL = -2
}
