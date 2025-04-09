import { PatchStyle, PatchStyleKey } from '../../types'

/**
 * 样式补丁
 *
 * @param el
 * @param newStyle
 * @param oldStyle
 */
export default function patchStyle(el: HTMLElement, newStyle: PatchStyle | null, oldStyle: PatchStyle | null) {
	// 设置新样式
	let key: PatchStyleKey
	if (newStyle != null) {
		for (key in newStyle) {
			if (newStyle[key] == null) {
				// 为 null 则删除
				el.style.removeProperty(key)
			} else {
				el.style.setProperty(key, newStyle[key]!)
			}
		}
	}
	// 删除老样式（多余的样式）
	if (oldStyle != null) {
		for (key in oldStyle) {
			if (!newStyle || newStyle[key] == null) {
				el.style.removeProperty(key)
			}
		}
	}
}
