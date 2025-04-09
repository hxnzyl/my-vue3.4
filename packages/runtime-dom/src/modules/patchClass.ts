/**
 * 类名补丁
 *
 * @param el
 * @param newClass
 * @param oldClass
 */
export default function patchClass(el: Element, newClass: string | null, oldClass: string | null) {
	if (newClass == null && oldClass == null) {
		el.className = ''
	} else {
		if (newClass != null) {
			el.classList.add(newClass)
		}
		if (oldClass != null) {
			el.classList.remove(oldClass)
		}
	}
}
