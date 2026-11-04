const NoLanes = 0b00
const NoLane = 0b00
const SyncLane = 0b01 // 1
const InputContinueousHydrationLane = 0b10 // 2

// 判断是否是子集
function isSubSetOfLanes(set, subset) {
  return (set & subset) === subset
}

// 合并赛道
function mergeLanes(a, b) {
  return a | b
}

function initializeUpdateQueue(fiber) {
  const queue = {
    baseState: fiber.memoizedState, // 本地更新前当前的fiber状态，更新会基于它进行计算
    firstBaseUpdate: null, // 本次更新前该fiber上保存的上次跳过的更新链表头
    lastBaseUpdate: null, // 本次更新前该fiber上保存的上次跳过的更新链表尾部
    shared: {
      pending: null
    }
  }
  fiber.updateQueue = queue
}

function enqueueUpdate(fiber, update) {
  let updateQueue = fiber.updateQueue
  const sharedQueue = updateQueue.shared
  const pending = sharedQueue.pending
  if (pending === null) {
    update.next = update
  } else {
    update.next = pending.next
    pending.next = update
  }
  sharedQueue.pending = update
}

function processUpdateQueue(fiber, renderLanes) {
  const queue = fiber.updateQueue
  // 上次保留的基础更新链表头节点
  let firstBaseUpdate = queue.firstBaseUpdate
  // 上次保留的基础更新链表尾节点
  let lastBaseUpdate = queue.lastBaseUpdate
  // 待处理更新环形链表的尾节点
  const pendingQueue = queue.shared.pending
  // 合并新的老链表为单链表
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
  if (firstBaseUpdate !== null) {
    // 上次跳过的更新前的状态
    let newState = queue.baseState
    // 尚未执行的更新lane
    let newLanes = NoLanes
    let newBaseState = null
    let newFirstBaseUpdate = null
    let newLastBaseUpdate = null
    let update = firstBaseUpdate
    do {
      // 此次更新车道
      const updateLane = update.lane
      // renderLanes是本次要更新的赛道，updateLane是当前更新的赛道
      // 如果updateLane不是renderLanes的子集的话，说明本次渲染不需要处理这次更新，需要跳过
      if (!isSubSetOfLanes(renderLanes, updateLane)) {
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
        if (newLastBaseUpdate !== null) {
          const clone = {
            id: update.id,
            lane: NoLane,
            payload: update.payload
          }
          newLastBaseUpdate = newLastBaseUpdate.next = clone
        }
        newState = getStateFromUpdate(update, newState)
      }
      update = update.next
    } while (update)
      if (!newLastBaseUpdate) {
        newBaseState = newState
      }
      queue.baseState = newBaseState
      queue.firstBaseUpdate = newFirstBaseUpdate
      queue.lastBaseUpdate = newLastBaseUpdate
      fiber.lanes = newLanes
      fiber.memoizedState = newState
  }
}

function getStateFromUpdate(update, prevState) {
  const payload = update.payload
  let partialState = payload(prevState)
  return Object.assign({}, prevState, partialState)
}

// 演示如何给fiber添加不同优先级的更新
// 在执行渲染的时候总是优先级最高的先执行，调高优先级低的更新
let fiber = { memoizedState: '' }
initializeUpdateQueue(fiber)
let update1 = {
  id: 'A',
  payload: (state) => state + 'A',
  lane: InputContinueousHydrationLane
}
enqueueUpdate(fiber, update1)
let update2 = {
  id: 'B',
  payload: (state) => state + 'B',
  lane: SyncLane
}
enqueueUpdate(fiber, update2)
let update3 = {
  id: 'C',
  payload: (state) => state + 'C',
  lane: InputContinueousHydrationLane
}
enqueueUpdate(fiber, update3)
let update4 = {
  id: 'D',
  payload: (state) => state + 'D',
  lane: SyncLane
}
enqueueUpdate(fiber, update4)
// 处理更新队列，在处理的时候需要指定一个渲染优先级
processUpdateQueue(fiber, SyncLane)
