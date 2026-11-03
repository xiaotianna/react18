/**
 * 向最小堆里添加一个节点
 * @param {*} heap 最小堆
 * @param {*} node
 */
function push(heap, node) {
  // 获取元素数量
  const index = heap.length
  // 先把添加的元素放在数组的尾部
  heap.push(node)
  siftUp(heap, node, index)
}

/**
 * 查看最小堆顶的元素
 * @param {*} heap
 */
function peek(heap) {
  const first = heap[0]
  return first === undefined ? null : first
}

/**
 * 弹出最小堆的堆顶元素
 * @param {*} heap
 */
function pop(heap) {
  // 取出数组中第一个，也就是堆顶的元素
  const first = heap[0]
  if (first !== undefined) {
    // 弹出数组中的最后一个元素
    const last = heap.pop()
    if (last !== first) {
      heap[0] = last
      siftDown(heap, last, 0)
    }
    return first
  } else {
    return null
  }
}

/**
 * 向上调整某个节点，使其位于正确的位置
 * @param {*} heap
 * @param {*} node
 * @param {*} i 节点所在的索引
 */
function siftUp(heap, node, i) {
  let index = i
  while (index > 0) {
    // 获取父节点的索引
    const parentIndex = (index - 1) >>> 1 // 子节点索引-1  / 2
    // 获取父节点
    const parent = heap[parentIndex]
    // 如果父节点比子节点大，则交换位置
    if (compare(parent, node) > 0) {
      // 把儿子的值给父索引
      heap[parentIndex] = node
      // 把父亲的值给子索引
      heap[index] = parent
      // 让index等于父亲的索引
      index = parentIndex
    } else {
      return
    }
  }
}

/**
 * 向下调整某个节点，使其位于正确的位置
 * @param {*} heap
 * @param {*} node
 * @param {*} i
 */
function siftDown(heap, node, i) {
  let index = i
  const length = heap.length
  while (index < length) {
    // 左子节点的索引
    const leftIndex = (index + 1) * 2 - 1
    const left = heap[leftIndex]
    const rightIndex = leftIndex + 1
    const right = heap[rightIndex]
    // 如果左子节点存在，并且比当前节点小
    if (left !== undefined && compare(left, node) < 0) {
      // 如果右子节点更小，则与右子节点交换
      if (right !== undefined && compare(right, left) < 0) {
        heap[index] = right
        heap[rightIndex] = node
        index = rightIndex
      } else {
        heap[index] = left
        heap[leftIndex] = node
        index = leftIndex
      }
    } else if (right !== undefined && compare(right, node) < 0) {
      heap[index] = right
      heap[rightIndex] = node
      index = rightIndex
    } else {
      return
    }
  }
}

function compare(a, b) {
  const diff = a.sortIndex - b.sortIndex
  return diff !== 0 ? diff : a.id - b.id
}
