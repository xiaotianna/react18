import assign from 'shared/assign'
import {
  markUpdateLaneFromFiberToRoot,
  enqueueConcurrentClassUpdate
} from './ReactFiberConcurrentUpdates'
import { NoLanes, mergeLanes, NoLane, isSubSetOfLanes } from './ReactFiberLane'

// 更新状态
export const UpdateState = 0

// 每个fiber节点上都有更新队列，不同fiber的updateQueue不一样
// 用于根 Fiber、类组件 Fiber 的更新队列
export function initialUpdateQueue(fiber) {
  // 创建一个新的更新队列（链表）
  const queue = {
    baseState: fiber.memoizedState, // 本次更新前当前的fiber状态，更新会基于它进行计算
    /**
     * 它们可以保留因 lane 不符合本轮优先级而跳过的更新，具体更新链表的头尾，
     * 链表里的每个 update 保存自己的 lane、payload 等信息，通过 next 连接
     */
    firstBaseUpdate: null, // 本次更新前该fiber上保存的上次跳过的更新链表头
    lastBaseUpdate: null, // 本次更新前该fiber上保存的上次跳过的更新链表尾部，方便追加更新
    shared: {
      // 等待生效的队列，pending其实是一个循环链表
      pending: null
    }
  }
  fiber.updateQueue = queue
}

// 创建更新
export function createUpdate(lane) {
  const update = {
    tag: UpdateState,
    lane,
    next: null
  }
  return update
}

// 入队更新（这部分可以去【docs/02-创建FiberRoot/index.md】中的【updateQueue.js】查看）
export function enqueueUpdate(fiber, update, lane) {
  // 初始版本，未添加lane优先级更新
  // // 这里的数据结构可以看上面的initialUpdateQueue
  // const updateQueue = fiber.updateQueue
  // const pending = updateQueue.shared.pending
  // if (pending === null) {
  //   // pending为null，表示这次更新加入之前，队列为空。
  //   // 加入 update 后，就需要让队列记录这个新节点。
  //   // 创建只有一个节点的环形链表，将自己指向自己
  //   update.next = update
  // } else {
  //   // 将新的更新添加到末尾，因为是循环链表，那就是在头、尾节点之间（其实也是添加到头节点前的）
  //   update.next = pending.next
  //   pending.next = update
  // }
  // // pending 指向尾节点，pending.next 指向头节点
  // updateQueue.shared.pending = update

  // // 返回根节点，从当前fiber遍历到根节点
  // // 目前还没有实现更新优先级
  // return markUpdateLaneFromFiberToRoot(fiber)

  // 获取更新队列
  const updateQueue = fiber.updateQueue
  const sharedQueue = updateQueue.shared
  return enqueueConcurrentClassUpdate(fiber, sharedQueue, update, lane)
}

/**
 * 根据本轮渲染的优先级，从更新队列里计算出新状态，并保留以后还需要处理的更新
 * @param {*} workInProgress 正在构建的 Fiber，更新队列和计算结果都保存在它上面
 * @param {*} nextProps 新的 props，执行函数形式的 payload 时会传进去。
 *    当 payload 是一个函数时，计算新状态可能需要用到 props，所以调用它时，会把 nextProps 一起传进去。
 *    只在`getStateFromUpdate`函数中使用了
 * @param {*} renderLanes 本轮渲染要处理哪些 lane，用来判断某个更新现在能不能执行
 */
export function processUpdateQueue(workInProgress, nextProps, renderLanes) {
  // 初始版本：不带renderLanes
  // const queue = workInProgress.updateQueue
  // const pendingQueue = queue.shared.pending
  // // 如果有更新
  // if (pendingQueue !== null) {
  //   // 清除等待生效的等待
  //   queue.shared.pending = null
  //   // 获取更新队列中最后一个更新 update = {payload: { element }}
  //   const lastPendingUpdate = pendingQueue
  //   // 指向第一个更新（因为是环形链表）
  //   const firstPendingUpdate = lastPendingUpdate.next
  //   // 把链表剪开，变为单链表
  //   lastPendingUpdate.next = null
  //   // 获取老状态（虽然是叫做newState，但是因为workInProgress的值相比于更新后的就是老的）
  //   let newState = workInProgress.memoizedState
  //   // 因为需要按照入队的顺序，所以是从第一个开始处理
  //   let update = firstPendingUpdate
  //   while (update) {
  //     // 根据老状态和更新，去计算新状态
  //     newState = getStateFromUpdate(update, newState)
  //     update = update.next
  //   }
  //   // 更新状态
  //   workInProgress.memoizedState = newState
  // }
  const queue = workInProgress.updateQueue
  // 上次保留的基础更新链表头节点
  let firstBaseUpdate = queue.firstBaseUpdate
  // 上次保留的基础更新链表尾节点
  let lastBaseUpdate = queue.lastBaseUpdate
  // 待处理更新环形链表的尾节点
  const pendingQueue = queue.shared.pending
  // 把新来的更新，接到之前保留的更新后面
  if (pendingQueue !== null) {
    queue.shared.pending = null
    // 保存待处理更新环形链表的尾节点
    const lastPendingUpdate = pendingQueue
    // 环形链表中，尾节点的 next 指向头节点
    const firstPendingUpdate = lastPendingUpdate.next
    // 断开尾节点到头节点的连接，将环形链表转为单向链表
    lastPendingUpdate.next = null
    if (lastBaseUpdate === null) {
      firstBaseUpdate = firstPendingUpdate
    } else {
      lastBaseUpdate.next = firstPendingUpdate
    }
    lastBaseUpdate = lastPendingUpdate
  }
  // 链表里有更新，就开始处理
  if (firstBaseUpdate !== null) {
    // 上次跳过的更新前的状态
    let newState = queue.baseState
    // 尚未执行的更新lane
    let newLanes = NoLanes
    let newBaseState = null
    let newFirstBaseUpdate = null
    let newLastBaseUpdate = null
    let update = firstBaseUpdate
    // do while逐个处理更新
    do {
      // 此次更新车道
      const updateLane = update.lane
      // renderLanes是本次要更新的赛道，updateLane是当前更新的赛道
      // 如果updateLane不是renderLanes的子集的话，说明本次渲染不需要处理这次更新，需要跳过
      if (!isSubSetOfLanes(renderLanes, updateLane)) {
        // 跳过更新，跳过时，保留它的 lane，记录还有哪些更新没处理
        // 把更新克隆一份
        const clone = {
          id: update.id,
          lane: updateLane,
          payload: update.payload
        }
        // 新跳过的base链表为空，说明当前更新是第一个跳过的更新
        if (newLastBaseUpdate === null) {
          newFirstBaseUpdate = newLastBaseUpdate = clone
          newBaseState = newState
        } else {
          newLastBaseUpdate = newLastBaseUpdate.next = clone
        }
        newLanes = mergeLanes(newLanes, updateLane)
      } else {
        // 执行更新，计算newState，已经执行、但以后需要重算的更新，把副本设为 NoLane
        if (newLastBaseUpdate !== null) {
          const clone = {
            id: update.id,
            lane: NoLane,
            payload: update.payload
          }
          newLastBaseUpdate = newLastBaseUpdate.next = clone
        }
        newState = getStateFromUpdate(update, newState, nextProps)
      }
      update = update.next
    } while (update)
    if (!newLastBaseUpdate) {
      newBaseState = newState
    }
    queue.baseState = newBaseState
    queue.firstBaseUpdate = newFirstBaseUpdate
    queue.lastBaseUpdate = newLastBaseUpdate
    workInProgress.lanes = newLanes
    workInProgress.memoizedState = newState
  }
}

/**
 * 根据老状态和更新计算新状态
 * @param {*} update 更新对象，有非常多种更新类型
 * @param {*} prevState 上一个状态（老状态）
 * @param {*} nextProps
 */
function getStateFromUpdate(update, prevState, nextProps) {
  switch (update.tag) {
    case UpdateState:
      const { payload } = update
      let partialState
      if (typeof payload === 'function') {
        partialState = payload.call(null, prevState, nextProps)
      } else {
        partialState = payload
      }
      return assign({}, prevState, partialState)
  }
}

export function cloneUpdateQueue(current, workInProgress) {
  const workInProgressQueue = workInProgress.updateQueue
  const currentQueue = current.updateQueue
  if (workInProgressQueue === currentQueue) {
    const clone = {
      baseState: currentQueue.baseState,
      firstBaseUpdate: currentQueue.firstBaseUpdate,
      lastBaseUpdate: currentQueue.lastBaseUpdate,
      shared: currentQueue.shared
    }
    workInProgress.updateQueue = clone
  }
}
