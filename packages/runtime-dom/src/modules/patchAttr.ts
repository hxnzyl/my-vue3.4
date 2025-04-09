import { PatchAttr } from '../../types'

/**
 * 属性补丁
 *
 * @param el
 * @param newAttr
 * @param oldAttr
 */
export default function patchAttr(el: Element, newAttr: PatchAttr | null, oldAttr: PatchAttr | null) {
	// 设置新属性
	if (newAttr != null) {
		for (let key in newAttr) {
			if (newAttr[key] == null) {
				el.removeAttribute(key)
			} else {
				el.setAttribute(key, newAttr[key])
			}
		}
	}
	// 删除老属性（多余的属性）
	if (oldAttr != null) {
		for (let key in oldAttr) {
			if (!newAttr || newAttr[key] == null) {
				el.removeAttribute(key)
			}
		}
	}
}
