import { allowConcurrentByDefault } from 'shared/ReactFeatureFlags'

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

// 没有时间戳
export const NoTimestamp = -1

export function markRootUpdated(root, updateLane) {
  // pendingLanes表示此根上等待生效的lane
  root.pendingLanes |= updateLane
}

/**
 * 从 root.pendingLanes 中选出最高优先级的 lane，也就是选出接下来要处理的 lane
 * @param {*} root 根节点
 * @param {*} wipLanes 正在渲染的车道
 * @returns
 */
export function getNextLanes(root, wipLanes) {
  // 先获取所有的有更新的车道
  const pendingLanes = root.pendingLanes
  if (pendingLanes === NoLanes) {
    return NoLanes
  }
  // 从待处理更新中，选出优先级最高的 lane
  const nextLanes = getHighestPriorityLanes(pendingLanes)
  if (wipLanes !== NoLane && wipLanes !== nextLanes) {
    // 候选车道优先级更低，继续当前渲染
    if (nextLanes > wipLanes) {
      return wipLanes
    }
  }
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

// 是否开启“默认允许分段渲染”
export function includesBlockingLane(root, lanes) {
  // 如果允许默认并行渲染，不要求一次性完成
  if (allowConcurrentByDefault) {
    return false
  }
  // 如果没开启并行渲染，然后如果这次又包含连续交互更新或普通更新，就必须要一次性完成
  const SyncDefaultLanes = InputContinuousLane | DefaultLane
  return (lanes & SyncDefaultLanes) !== NoLane
}

// 是否包含过期车道
export function includesExpiredLane(root, lanes) {
  return (lanes & root.expiredLanes) !== NoLanes
}

// 取最左侧1的索引
function pickArbitraryLaneIndex(lanes) {
  // clz32返回最左侧的1，它左边0的个数
  // 00011000 -> 那么1的索引就是4
  return 31 - Math.clz32(lanes)
}

// 检查所有待处理的 lane，给它们设置截止时间，并把等待超时的 lane 标记为过期
export function markStarvedLanesAsExpired(root, currentTime) {
  // 获取当前有更新的赛道
  const pendingLanes = root.pendingLanes
  // 记录每个赛道上的过期时间
  const expirationTimes = root.expirationTimes
  let lanes = pendingLanes
  while (lanes > 0) {
    const index = pickArbitraryLaneIndex(lanes)
    const lane = 1 << index
    const expirationTime = expirationTimes[index]
    if (expirationTime === NoTimestamp) {
      // 如果此赛道上没有过期时间，说明没为此车道设置过期时间，需要设置一个
      expirationTimes[index] = computeExpirationTime(lane, currentTime)
    } else if (expirationTime <= currentTime) {
      // 如果当前车道的过期时间已经 <= 当前时间了，证明已经过期了，需要添加到过期的车道参数中
      root.expiredLanes |= lane
    }
    lanes &= ~lane
  }
}

// 根据 lane 的优先级，计算它的截止时间，供后续判断是否过期
function computeExpirationTime(lane, currentTime) {
  switch (lane) {
    case SyncLane:
    case InputContinuousLane:
      return currentTime + 250
    case DefaultLane:
      return currentTime + 5000
    case IdleLane:
      return NoTimestamp
    default:
      return NoTimestamp
  }
}

// 记录每个 lane 的截止时间，是一个长度为 31 的数组，全部为 -1，表示尚未设置截止时间
export function createLaneMap(initial) {
  const laneMap = []
  for (let i = 0; i < TotalLanes; i++) {
    laneMap.push(initial)
  }
  return laneMap
}

/**
 * 一轮渲染完成后，清理已经处理完的 lane，并保留还需要继续处理的 lane
 * @param {*} root
 * @param {*} remainingLanes 这一轮结束后，仍然有更新待处理的 lane 集合
 */
export function markRootFinished(root, remainingLanes) {
  // pendingLanes是根上将要被渲染的车道
  // noLongerPendingLanes是已经更新过的车道
  const noLongerPendingLanes = root.pendingLanes & ~remainingLanes
  root.pendingLanes = remainingLanes
  root.expiredLanes &= remainingLanes
  const expirationTimes = root.expirationTimes
  let lanes = noLongerPendingLanes
  while (lanes > 0) {
    const index = pickArbitraryLaneIndex(lanes)
    const lane = 1 << index
    // 清除已经计算过的车道的过期时间
    expirationTimes[index] = NoTimestamp
    lanes &= ~lane
  }
}
