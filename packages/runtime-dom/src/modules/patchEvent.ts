import { PatchEvent, PatchEventKey, PatchEvi } from '../../types'
import { PathFlags } from '../constants'

/**
 * 事件补丁
 *
 * @param el
 * @param eventName
 * @param newEvent
 * @param oldEvent
 */
export default function patchEvent(
	el: Element & PatchEvi,
	eventKey: PatchEventKey,
	newEvent: PatchEvent | null,
	oldEvent: PatchEvent | null
) {
	const invokers = el[PathFlags.EVENT] || (el[PathFlags.EVENT] = {} as PatchEvi)
	const eventType = eventKey.substring(2).toLowerCase()
	if (invokers[eventKey]) {
		if (newEvent == null) {
			el.removeEventListener(eventType, invokers[eventKey])
			delete invokers[eventKey]
		} else {
			invokers[eventKey]._handler = newEvent
		}
	} else {
		if (newEvent != null) {
			invokers[eventKey] = createInvoker(newEvent)
			el.addEventListener(eventType, invokers[eventKey])
		}
	}
}

function createInvoker(value: PatchEvent) {
	const invoker = (e: Event) => invoker._handler!(e)
	invoker._handler = value
	return invoker
}
