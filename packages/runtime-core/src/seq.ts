/**
 * 最长递增子序列，VUE3.5的实现
 *
 * @param arr
 * @returns
 */
export function getSequence(arr: number[]) {
	const p = arr.slice()
	const result = [0]
	let i, j, u, v, c
	const len = arr.length
	for (i = 0; i < len; i++) {
		const arrI = arr[i]
		if (arrI !== 0) {
			j = result[result.length - 1]
			if (arr[j] < arrI) {
				p[i] = j
				result.push(i)
			} else {
				u = 0
				v = result.length - 1
				while (u < v) {
					c = (u + v) >> 1
					if (arr[result[c]] < arrI) {
						u = c + 1
					} else {
						v = c
					}
				}
				if (arrI < arr[result[u]]) {
					if (u > 0) {
						p[i] = result[u - 1]
					}
					result[u] = i
				}
			}
		}
	}
	u = result.length
	v = result[u - 1]
	while (u-- > 0) {
		result[u] = v
		v = p[v]
	}
	return result
}
