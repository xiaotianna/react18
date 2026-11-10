import { push, peek, pop } from './SchedulerMinHeap'

// 立即优先级，最紧急
export const ImmediatePriority = 1
// 用户交互优先级，需要尽快响应，避免用户感觉卡顿
export const UserBlockingPriority = 2
// 普通优先级，处理一般任务
export const NormalPriority = 3
// 空闲优先级，适合不着急的任务
export const IdlePriority = 5

// 存放等待执行的任务，底层用数组实现最小堆，按任务的过期时间排序，堆顶是最早过期的任务
const taskQueue = []
// 每轮执行的时间片长度，单位是毫秒
// 执行过程中会检查是否已经用了约 5ms，决定是否让出主线程
const frameInterval = 5
// 给任务生成递增的编号，过期时间相同时，可以用编号保证先加入的任务排在前面
let taskIdCounter = 1
// 记录本轮时间片开始执行的时刻，-1 是尚未开始时的初始值，每轮开始都会更新
let frameStartTime = -1
// 表示调度循环是否已经启动
let isMessageLoopRunning = false

/**
 * 把你要执行的函数包装成一个任务，按紧急程度放入队列，并确保调度循环启动
 * @param {*} priorityLevel 任务优先级
 * @param {*} callback 
 * @returns 
 */
export function scheduleCallback(priorityLevel, callback) {
  const startTime = performance.now()
  let timeout
  switch (priorityLevel) {
    case ImmediatePriority:
      timeout = -1
      break
    case UserBlockingPriority:
      timeout = 250
      break
    case IdlePriority:
      timeout = 1073741823
      break
    case NormalPriority:
    default:
      timeout = 5000
      break
  }

  // 计算过期时间
  const expirationTime = startTime + timeout
  // 创建任务对象
  const newTask = {
    id: taskIdCounter++,
    callback,
    priorityLevel,
    startTime,
    expirationTime,
    sortIndex: expirationTime
  }
  push(taskQueue, newTask)

  if (!isMessageLoopRunning) {
    isMessageLoopRunning = true
    // 安排下一轮执行，让 performWorkUntilDeadline 有机会运行
    schedulePerformWorkUntilDeadline()
  }
  return newTask
}

export function shouldYield() {
  return performance.now() - frameStartTime >= frameInterval
}

function workLoop(initialTime) {
  let currentTime = initialTime
  let currentTask = peek(taskQueue)
  while (currentTask !== null) {
    // 已过期的任务继续执行，避免低优先级任务一直得不到处理。
    if (currentTask.expirationTime > currentTime && shouldYield()) {
      break
    }

    const callback = currentTask.callback
    if (typeof callback === 'function') {
      // 先清空，回调抛错后不会在下一个时间片重复执行。
      currentTask.callback = null
      const didTimeout = currentTask.expirationTime <= currentTime
      const continuationCallback = callback(didTimeout)
      currentTime = performance.now()

      if (typeof continuationCallback === 'function') {
        currentTask.callback = continuationCallback
      } else if (currentTask === peek(taskQueue)) {
        // 回调可能插入更紧急的任务，只有仍在堆顶时才能弹出。
        pop(taskQueue)
      }
    } else {
      pop(taskQueue)
    }
    currentTask = peek(taskQueue)
  }
  return currentTask !== null
}

// 开始本轮执行，记录开始时间，并调用 workLoop
function performWorkUntilDeadline() {
  const currentTime = performance.now()
  frameStartTime = currentTime
  let hasMoreWork = true
  try {
    hasMoreWork = workLoop(currentTime)
  } finally {
    // 记录本轮开始时间，执行任务；还有任务就发消息安排下一轮，然后退出当前调用，把主线程交还给浏览器
    if (hasMoreWork) {
      schedulePerformWorkUntilDeadline()
    } else {
      isMessageLoopRunning = false
    }
  }
}

let schedulePerformWorkUntilDeadline
// 做polyfill，可以只看最后的else逻辑
if (typeof setImmediate === 'function') {
  // Node 中优先使用 setImmediate，避免 MessageChannel 阻止进程退出。
  schedulePerformWorkUntilDeadline = () =>
    setImmediate(performWorkUntilDeadline)
} else if (typeof MessageChannel !== 'undefined') {
  const channel = new MessageChannel()
  channel.port1.onmessage = performWorkUntilDeadline
  schedulePerformWorkUntilDeadline = () => channel.port2.postMessage(null)
} else {
  schedulePerformWorkUntilDeadline = () =>
    setTimeout(performWorkUntilDeadline, 0)
}

function cancelCallback(task) {
  task.callback = null
}

export {
  scheduleCallback as unstable_scheduleCallback,
  shouldYield as unstable_shouldYield,
  ImmediatePriority as unstable_ImmediatePriority,
  UserBlockingPriority as unstable_UserBlockingPriority,
  NormalPriority as unstable_NormalPriority,
  IdlePriority as unstable_IdlePriority,
  cancelCallback as unstable_cancelCallback
}
