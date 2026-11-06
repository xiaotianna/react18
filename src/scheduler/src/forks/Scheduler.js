export const ImmediatePriority = 1
export const UserBlockingPriority = 2
export const NormalPriority = 3
export const IdlePriority = 5

// shortcut: 暂不处理优先级，接入调度队列时再实现。
export function scheduleCallback(priorityLevel, callback) {
  requestIdleCallback(callback)
}

export {
  scheduleCallback as unstable_scheduleCallback,
  ImmediatePriority as unstable_ImmediatePriority,
  UserBlockingPriority as unstable_UserBlockingPriority,
  NormalPriority as unstable_NormalPriority,
  IdlePriority as unstable_IdlePriority
}
