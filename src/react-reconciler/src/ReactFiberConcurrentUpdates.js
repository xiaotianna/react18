import { HostRoot } from './ReactWorkTags'

// 更新队列
const concurrentQueue = []
// 索引
let concurrentQueueIndex = 0

/**
 * 此方法需要处理更新优先级的问题，目前只实现向上冒泡找到根节点
 */
export function markUpdateLaneFromFiberToRoot(sourceFiber) {
  // 当前fiber
  let node = sourceFiber
  // 当前fiber的父fiber
  let parent = sourceFiber.return
  while (parent !== null) {
    node = parent
    parent = parent.return
  }
  // 一直找到parent为null，也就是HostRootFiber
  if (node.tag === HostRoot) {
    return node.stateNode
  }
  return null
}

/**
 * 把更新对象添加到更新队列中
 * @param {*} fiber 函数组件对应的fiber
 * @param {*} queue 要更新的hook对应的更新队列
 * @param {*} update 更新对象
 */
export function enqueueConcurrentHookUpdate(fiber, queue, update) {
  enqueueUpdate(fiber, queue, update)
  return getRootForUpdatedFiber(fiber)
}

// 从当前的fiber一直向上查找，直到为null，返回FiberRootNode div#root
function getRootForUpdatedFiber(sourceFiber) {
  let node = sourceFiber
  let parent = node.return
  while (parent !== null) {
    node = parent
    parent = node.return
  }
  return node.tag === HostRoot ? node.stateNode : null
}

/**
 * 把更新先缓存到concurrentQueue数组中
 * @param {*} fiber
 * @param {*} queue
 * @param {*} update
 */
function enqueueUpdate(fiber, queue, update) {
  concurrentQueue[concurrentQueueIndex++] = fiber // 0 函数组件对应的fiber
  concurrentQueue[concurrentQueueIndex++] = queue // 1 要更新的hook对应的更新队列
  concurrentQueue[concurrentQueueIndex++] = update // 2 更新对象
}

/**
 * 把暂存的更新放进各自 Hook 的队列
 * 把每个 update 接到对应 Hook 的 queue.pending 循环链表中
 */
export function finishQueueingConcurrentUpdates() {
  const endIndex = concurrentQueueIndex
  concurrentQueueIndex = 0
  let i = 0
  while (i < endIndex) {
    const fiber = concurrentQueue[i++]
    const queue = concurrentQueue[i++]
    const update = concurrentQueue[i++]
    if (queue !== null && update !== null) {
      const pending = queue.pending
      if (pending === null) {
        // 构建一个循环链表
        update.next = update
      } else {
        update.next = pending.next
        pending.next = update
      }
      queue.pending = update
    }
  }
}
