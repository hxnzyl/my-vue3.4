let queue = new Map<any, VoidFunction>(),
	isRunning = false
const promiseResolved = Promise.resolve()

/**
 * 简单的调度，多个同步任务 转 一个微任务
 *
 * @param task
 * @param context
 */
export function queueJob(task: VoidFunction, context: any) {
	queue.set(context, task)
	if (isRunning) return
	isRunning = true
	try {
		promiseResolved.then(resolved)
	} finally {
		if (isRunning) {
			resolved()
		}
	}
}

function resolved() {
	queue.forEach((fun, ctx) => fun.call(ctx))
	queue.clear()
	isRunning = false
}
