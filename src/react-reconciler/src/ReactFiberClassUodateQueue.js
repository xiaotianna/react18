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
