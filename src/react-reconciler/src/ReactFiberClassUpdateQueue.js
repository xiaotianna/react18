import assign from 'shared/assign'
import { markUpdateLaneFromFiberToRoot } from './ReactFiberConcurrentUpdates'

// 更新状态
export const UpdateState = 0

// 每个fiber节点上都有更新队列
export function initialUpdateQueue(fiber) {
  // 创建一个新的更新队列（链表）
  const queue = {
    shared: {
      // 等待生效的队列，pending其实是一个循环链表
      pending: null
    }
  }
  fiber.updateQueue = queue
}

// 创建更新
export function createUpdate() {
  const update = {
    tag: UpdateState
  }
  return update
}

// 入队更新（这部分可以去【docs/02-创建FiberRoot/index.md】中的【updateQueue.js】查看）
export function enqueueUpdate(fiber, update) {
  // 这里的数据结构可以看上面的initialUpdateQueue
  const updateQueue = fiber.updateQueue
  const pending = updateQueue.shared.pending
  if (pending === null) {
    // pending为null，表示这次更新加入之前，队列为空。
    // 加入 update 后，就需要让队列记录这个新节点。
    // 创建只有一个节点的环形链表，将自己指向自己
    update.next = update
  } else {
    // 将新的更新添加到末尾，因为是循环链表，那就是在头、尾节点之间（其实也是添加到头节点前的）
    update.next = pending.next
    pending.next = update
  }
  // pending 指向尾节点，pending.next 指向头节点
  updateQueue.shared.pending = update

  // 返回根节点，从当前fiber遍历到根节点
  // 目前还没有实现更新优先级
  return markUpdateLaneFromFiberToRoot(fiber)
}

/**
 * 根据老状态和更新队列中的更新去计算最新的状态
 * @param {*} workInProgress 需要计算的fiber
 */
export function processUpdateQueue(workInProgress) {
  const queue = workInProgress.updateQueue
  const pendingQueue = queue.shared.pending
  // 如果有更新
  if (pendingQueue !== null) {
    // 清除等待生效的等待
    queue.shared.pending = null
    // 获取更新队列中最后一个更新 update = {payload: { element }}
    const lastPendingUpdate = pendingQueue
    // 指向第一个更新（因为是环形链表）
    const firstPendingUpdate = lastPendingUpdate.next
    // 把链表剪开，变为单链表
    lastPendingUpdate.next = null
    // 获取老状态（虽然是叫做newState，但是因为workInProgress的值相比于更新后的就是老的）
    let newState = workInProgress.memoizedState
    // 因为需要按照入队的顺序，所以是从第一个开始处理
    let update = firstPendingUpdate
    while (update) {
      // 根据老状态和更新，去计算新状态
      newState = getStateFromUpdate(update, newState)
      update = update.next
    }
    // 更新状态
    workInProgress.memoizedState = newState
  }
}

/**
 * 根据老状态和更新计算新状态
 * @param {*} update 更新对象，有非常多种更新类型
 * @param {*} prevState 上一个状态（老状态）
 */
function getStateFromUpdate(update, prevState) {
  switch (update.tag) {
    case UpdateState:
      const { payload } = update
      return assign({}, prevState, payload)
  }
}
