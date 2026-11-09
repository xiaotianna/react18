import {
  DiscreteEventPriority,
  getCurrentUpdatePriority,
  setCurrentUpdatePriority
} from './ReactEventPriority'

// 同步队列
let syncQueue = null
// 是否正在执行同步队列
let isFlushingSyncQueue = false

// 把一个同步任务放进队列，等后面统一执行
export function scheduleSyncCallback(callback) {
  if (syncQueue === null) {
    syncQueue = [callback]
  } else {
    syncQueue.push(callback)
  }
}

/**
 * 把之前存进 syncQueue 的同步任务，依次取出来执行，完成后清空队列
 * 存：
 *  scheduleSyncCallback(taskA) // 队列：[taskA]
    scheduleSyncCallback(taskB) // 队列：[taskA, taskB]
   执行：
    flushSyncCallbacks()       // 执行 taskA、taskB，然后清空
 */
export function flushSyncCallbacks() {
  if (!isFlushingSyncQueue && syncQueue !== null) {
    isFlushingSyncQueue = true
    let i = 0
    // 暂存当前的更新优先级
    const previousUpdatePriority = getCurrentUpdatePriority()
    try {
      const isSync = true
      const queue = syncQueue
      // 把优先级设置为同步优先级
      setCurrentUpdatePriority(DiscreteEventPriority)
      for (; i < queue.length; i++) {
        let callback = queue[i]
        do {
          callback = callback(isSync)
        } while (callback !== null)
      }
      syncQueue = null
    } finally {
      setCurrentUpdatePriority(previousUpdatePriority)
      isFlushingSyncQueue = false
    }
  }
}
