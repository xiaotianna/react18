// 位运算时，会按32位有符合整数处理
// 32 位 = 1 位符号位 + 31 位用于表示 lane
export const TotalLanes = 31
// 无
export const NoLanes = 0b0000000000000000000000000000000
export const NoLane = 0b0000000000000000000000000000000
export const SyncHydrationLane = 0b0000000000000000000000000000001
// 同步车道
export const SyncLane = 0b0000000000000000000000000000010
export const SyncLaneIndex = 1
// 输入连续水合赛道
export const InputContinuousHydrationLane = 0b0000000000000000000000000000100
// 输入连续车道
export const InputContinuousLane = 0b0000000000000000000000000001000
// 默认水合车道
export const DefaultHydrationLane = 0b0000000000000000000000000010000
// 默认车道
export const DefaultLane = 0b0000000000000000000000000100000 // 16
const RetryLane1 = 0b0000000010000000000000000000000
export const SomeRetryLane = RetryLane1
export const SelectiveHydrationLane = 0b0000100000000000000000000000000
export const IdleHydrationLane = 0b0001000000000000000000000000000
export const IdleLane = 0b0010000000000000000000000000000
export const OffscreenLane = 0b0100000000000000000000000000000
export const DeferredLane = 0b1000000000000000000000000000000

export function markRootUpdated(root, updateLane) {
  // pendingLanes表示此根上等待生效的lane
  root.pendingLanes |= updateLane
}

// 从 root.pendingLanes 中选出最高优先级的 lane
export function getNextLanes(root) {
  // 先获取所有的有更新的车道
  const pendingLanes = root.pendingLanes
  if (pendingLanes === NoLanes) {
    return NoLanes
  }
  const nextLanes = getHighestPriorityLanes(pendingLanes)
  return nextLanes
}

function getHighestPriorityLanes(lanes) {
  return getHighestPriorityLane(lanes)
}

// 找到二进制中最右侧的1，只能返回一个车道
export function getHighestPriorityLane(lanes) {
  return lanes & -lanes
}

// 判断是否是子集
export function isSubSetOfLanes(set, subset) {
  return (set & subset) === subset
}

// 合并赛道
export function mergeLanes(a, b) {
  return a | b
}
