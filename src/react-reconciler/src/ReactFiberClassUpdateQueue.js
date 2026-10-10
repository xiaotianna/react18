import { markUpdateLaneFromFiberToRoot } from './ReactFiberConcurrentUpdates'

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
  const update = {}
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
