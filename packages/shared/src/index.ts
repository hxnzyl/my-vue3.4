// 修改后将自动同步到依赖源

const hasOwnProperty = Object.prototype.hasOwnProperty
const scalarArr = ['string', 'number', 'boolean', 'symbol']

export const isObject = (val: any): val is Object => val !== null && typeof val === 'object'

export const isFunction = (val: any): val is Function => typeof val === 'function'

export const isString = (val: any): val is String => typeof val === 'string'

export const isScalar = (val: any) => scalarArr.includes(typeof val)

export const isElement = (val: any) => val && val.nodeType === Node.ELEMENT_NODE

export const isTextNode = (val: any) => val && val.nodeType === Node.TEXT_NODE

export const isOn = (val: any) => val && val.substring(0, 2) === 'on'

export const hasOwn = (val: any, key: PropertyKey) => isObject(val) && hasOwnProperty.call(val, key)

/**
 * 判断对象是否相同
 *
 * @param target
 * @param destination
 * @returns
 */
export function isSameObject(target: any, destination: any) {
	if (target !== destination && destination != null && target != null) {
		for (const key in target) {
			if (destination[key] !== target[key]) {
				return false
			}
		}
	}
	return true
}
