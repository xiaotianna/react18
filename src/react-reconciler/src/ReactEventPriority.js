import {
  DefaultLane,
  IdleHydrationLane,
  IdleLane,
  InputContinuousLane,
  NoLane,
  SyncLane,
  getHighestPriorityLane
} from './ReactFiberLane'

// 离散事件优先级，例如click事件
export const DiscreteEventPriority = SyncLane // 1
// 连续事件优先级，例如mousemove
export const ContinuousEventPriority = InputContinuousLane // 4
// 默认事件车道
export const DefaultEventPriority = DefaultLane // 16
// 空闲事件优先级
export const IdleEventPriority = IdleLane // 很大

// 当前更新的lane车道
let currentUpdatePriority = NoLane

export function getCurrentUpdatePriority() {
  return currentUpdatePriority
}

export function setCurrentUpdatePriority(newPriority) {
  return (currentUpdatePriority = newPriority)
}

/**
 * 把lane转为事件优先级
 * 因为lane有31个，事件优先级是4个
 * @param {*} lanes 
 * @returns 
 */
export function lanesToEventPriority(lanes) {
  // 获取最高优先级的lane
  const lane = getHighestPriorityLane(lanes)
  if (lane !== NoLane && lane <= DiscreteEventPriority) {
    return DiscreteEventPriority // 1
  }
  if (lane !== NoLane && lane <= ContinuousEventPriority) {
    return ContinuousEventPriority // 4
  }
  if (lane !== NoLane && lane < IdleHydrationLane) {
    return DefaultEventPriority // 16
  }
  return IdleEventPriority // 很大
}
