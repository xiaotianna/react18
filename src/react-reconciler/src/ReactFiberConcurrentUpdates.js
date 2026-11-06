import { HostRoot } from './ReactWorkTags'

// 更新队列
const concurrentQueues = []
// 索引
let concurrentQueuesIndex = 0

/**
 * 此方法需要处理更新优先级的问题，目前只实现向上冒泡找到根节点
 * 这个方法是在src/react-reconciler/src/ReactFiberClassUpdateQueue.js中的enqueueUpdate方法中使用，
 * 由于现在引入了lane更新，这个方法就不需要了
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
 * @param {*} lane 此更新的车道
 */
export function enqueueConcurrentHookUpdate(fiber, queue, update, lane) {
  enqueueUpdate(fiber, queue, update, lane)
  return getRootForUpdatedFiber(fiber)
}

/**
 * 把更新入队
 * @param {*} fiber 根fiber
 * @param {*} queue sharedQueue 待生效的队列
 * @param {*} update 更新对象
 * @param {*} lane 此更新的车道
 */
export function enqueueConcurrentClassUpdate(fiber, queue, update, lane) {
  // 暂存更新
  enqueueUpdate(fiber, queue, update, lane)
  // 找到所属根，沿着 fiber.return 向上找到根 Fiber，返回它的 stateNode，也就是 FiberRootNode
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
 * 把更新先缓存到concurrentQueues数组中
 * @param {*} fiber
 * @param {*} queue
 * @param {*} update
 * @param {*} lane
 */
function enqueueUpdate(fiber, queue, update, lane) {
  concurrentQueues[concurrentQueuesIndex++] = fiber // 0 函数组件对应的fiber
  concurrentQueues[concurrentQueuesIndex++] = queue // 1 要更新的hook对应的更新队列
  concurrentQueues[concurrentQueuesIndex++] = update // 2 更新对象
  concurrentQueues[concurrentQueuesIndex++] = lane // 3 更新对应的车道
}

/**
 * 把更新放到更新队列中（不只是有hook的更新）
 * - 根fiber的更新队列：{payload: {element}}
 * - hook的更新队列： update 环形链表，update对象：{action: 更新函数,next,...}
 *    如图【docs/15-updateReducer/image3.png】
 *    - 把暂存的更新放进各自 Hook 的队列
 *    - 把每个 update 接到对应 Hook 的 queue.pending 循环链表中
 * 
 * ⚠️注意：在fiber层和hook层都有自己的更新队列
 * - fiber层：函数组件的fiber.updateQueue是effect链表
 * - hook 层：状态更新存在 hook.queue
 */
export function finishQueueingConcurrentUpdates() {
  const endIndex = concurrentQueuesIndex
  concurrentQueuesIndex = 0
  let i = 0
  while (i < endIndex) {
    const fiber = concurrentQueues[i++]
    const queue = concurrentQueues[i++]
    const update = concurrentQueues[i++]
    const lane = concurrentQueues[i++]
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
