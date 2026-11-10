import {
  scheduleCallback as Scheduler_scheduleCallback,
  ImmediatePriority as ImmediateSchedulerPriority,
  UserBlockingPriority as UserBlockingSchedulerPriority,
  NormalPriority as NormalSchedulerPriority,
  IdlePriority as IdleSchedulerPriority,
  shouldYield,
  cancelCallback as Scheduler_cancelCallback
} from './Scheduler'
import { createWorkInProgress } from './ReactFiber'
import { beginWork } from './ReactFiberBeginWork'
import { completeWork } from './ReactFiberCompleteWork'
import { MutationMask, NoFlags, Passive } from './ReactFiberFlags'
import {
  commitMutationEffectsOnFiber,
  commitPassiveUnmountEffects,
  commitPassiveMountEffects,
  commitLayoutEffects
} from './ReactFiberCommitWork'
import { finishQueueingConcurrentUpdates } from './ReactFiberConcurrentUpdates'
import {
  NoLanes,
  markRootUpdated,
  getNextLanes,
  getHighestPriorityLane,
  SyncLane,
  includesBlockingLane,
  NoLane
} from './ReactFiberLane'
import {
  DiscreteEventPriority,
  ContinuousEventPriority,
  DefaultEventPriority,
  IdleEventPriority,
  getCurrentUpdatePriority,
  lanesToEventPriority,
  setCurrentUpdatePriority
} from './ReactEventPriority'
import { getCurrentEventPriority } from 'react-dom-bindings/src/client/ReactDOMHostConfig'
import {
  scheduleSyncCallback,
  flushSyncCallbacks
} from './ReactFiberSyncTaskQueue'

// 当前正在处理的 Fiber 节点；没有工作时为 null
let workInProgress = null
// 正在构建中的根节点
let workInProgressRoot = null
// 此根节点上是否有useEffect的副作用
let rootDoesHavePassiveEffect = false
// 具有useEffect副作用的根节点 => FiberRootNode 也就是根fiber.stateNode
let rootWithPendingPassiveEffect = null
let workInProgressRootRenderLanes = NoLanes

// 正在构建fiber树
const RootInProgress = 0
// fiber树已经构建完成
const RootCompleted = 5
// 当渲染工作结束的时候，当前的fiber树处于什么状态，默认为进行中
let workInProgressRootExitStatus = RootInProgress

/**
 * 计划更新root
 * 在源码中此处有一个任务的功能
 * @param {*} root
 */
export function scheduleUpdateOnFiber(root, fiber, lane) {
  // 在根节点上登记，这个 lane 有更新等待处理
  // 也就是记录有哪些车道有工作（会不断累加）
  markRootUpdated(root, lane)
  // 确保调度执行root上的更新，也就是根据这些车道安排工作
  ensureRootIsscheduled(root)
}

// 根据根节点上的待处理更新，选出优先级，并安排执行更新的任务
function ensureRootIsscheduled(root) {
  // 先获取当前根上执行的任务
  const existingCallbackNode = root.callbackNode
  // 获取当前优先级最高的车道
  const nextLanes = getNextLanes(root, workInProgressRootRenderLanes)
  // NoLanes表示没有任何更新车道，当前 root 没有待处理的更新，就直接退出，不安排渲染任务
  if (nextLanes === NoLanes) {
    return
  }
  // 获取新的调度优先级，仍然是lane值
  let newCallbackPriority = getHighestPriorityLane(nextLanes)
  // 获取现在根上正在运行的优先级
  const existingCallbackPriority = root.callbackPriority
  if (existingCallbackPriority === newCallbackPriority) {
    // 如果新的优先级和老的优先级一样，可以进行批量更新
    // 也就是多次setState，会合并成一次的原理（同步添加任务，异步调用处理任务）
    return
  }
  if (existingCallbackNode !== null) {
    Scheduler_cancelCallback(existingCallbackNode)
  }
  // 新的回调任务
  let newCallbackNode = null
  // 如果新的优先级是同步 -> 16
  if (newCallbackPriority === SyncLane) {
    // 同步更新
    scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root))
    // 执行任务
    queueMicrotask(flushSyncCallbacks)
    // 如果是同步执行，不需要回调任务
    newCallbackNode = null
  } else {
    // 非同步，将 lane 转成事件优先级，再映射成 Scheduler 的优先级
    let schedulerPriorityLevel
    switch (lanesToEventPriority(nextLanes)) {
      case DiscreteEventPriority:
        // ImmediateSchedulerPriority：立即执行的优先级
        schedulerPriorityLevel = ImmediateSchedulerPriority
        break
      case ContinuousEventPriority:
        // UserBlockingSchedulerPriority：较高优先级，优先响应用户交互
        schedulerPriorityLevel = UserBlockingSchedulerPriority
        break
      case DefaultEventPriority:
        // 普通优先级
        schedulerPriorityLevel = NormalSchedulerPriority
        break
      case IdleEventPriority:
        // IdleSchedulerPriority：空闲优先级
        schedulerPriorityLevel = IdleSchedulerPriority
        break
      default:
        schedulerPriorityLevel = NormalSchedulerPriority
        break
    }
    // 告诉浏览器需要执行performConcurrentWorkOnRoot
    newCallbackNode = Scheduler_scheduleCallback(
      schedulerPriorityLevel,
      performConcurrentWorkOnRoot.bind(null, root)
    )
  }
  root.callbackNode = newCallbackNode
  root.callbackPriority = newCallbackPriority
  // 实现批量更新，只有第一次才进入，commitRoot后清空
  // if (workInProgressRoot) return
  // workInProgressRoot = root
}

/**
 * 在根上执行同步工作
 * @param {*} root
 */
function performSyncWorkOnRoot(root) {
  // 获取最高优先级的lane
  const lanes = getNextLanes(root)
  // 渲染fiber树
  renderRootSync(root, lanes)
  // 获取新渲染完成的fiber根节点
  const finishedWork = root.current.alternate
  root.finishedWork = finishedWork
  commitRoot(root)
  return null
}

/**
 * 并发渲染
 * 根据fiber构建fiber树，要创建真实dom节点，还要把真实dom节点插入容器
 * @param {*} root
 */
function performConcurrentWorkOnRoot(root, didTimeout) {
  // 获取当前根节点上的任务
  const originalCallbackNode = root.callbackNode
  // 获取当前优先级最高的车道
  const lanes = getNextLanes(root, NoLanes)
  if (lanes === NoLanes) {
    return null
  }
  // 如果不包含阻塞的车道，并且没有超时，就可以启用时间分片，并行渲染
  // 默认更新车道是同步的，不能启用时间分片
  const shouldTimeSlice = !includesBlockingLane(root, lanes) && !didTimeout
  // 执行渲染，得到退出的状态
  const exitStatus = shouldTimeSlice
    ? renderRootConcurrent(root, lanes)
    : renderRootSync(root, lanes)
  // 渲染完成
  if (exitStatus !== RootInProgress) {
    const finishedWork = root.current.alternate
    root.finishedWork = finishedWork
    commitRoot(root)
  }
  // 任务未完成，将此函数返回，下次继续执行
  if (root.callbackNode === originalCallbackNode) {
    return performConcurrentWorkOnRoot.bind(null, root)
  }
  // // 第一次渲染以同步的方式渲染根节点，初次渲染的时候，都是同步的（为了保证初始化加载的完整）
  // renderRootSync(root, lanes)
  // // 开始进入提交阶段，就是执行副作用，修改真实dom
  // // finishedWork表示最新完成的工作，也就是新构建的fiber树（root.current是老fiber）
  // const finishedWork = root.current.alternate
  // root.finishedWork = finishedWork
  // commitRoot(root)
  return null
}

// 异步执行，需要等待commitRoot执行完成后执行（但也需要等浏览器空闲才执行）
// 也就是当真实dom更新后，再执行该函数内容
function flushPassiveEffect() {
  if (rootWithPendingPassiveEffect !== null) {
    const root = rootWithPendingPassiveEffect
    // 下面的两步其实就是：当函数更新的时候，执行destroy，以及执行effect的create
    // 先执行需要清理的 effect 的 destroy
    commitPassiveUnmountEffects(root.current)
    // 再执行本轮需要运行的 effect 的 create
    commitPassiveMountEffects(root, root.current)
  }
}

function commitRoot(root) {
  // 暂存当前的更新优先级
  const previousUpdatePriority = getCurrentUpdatePriority()
  try {
    setCurrentUpdatePriority(DiscreteEventPriority)
    commitRootImpl(root)
  } finally {
    setCurrentUpdatePriority(previousUpdatePriority)
  }
}

function commitRootImpl(root) {
  const { finishedWork } = root
  workInProgressRoot = null
  workInProgressRootRenderLanes = NoLanes
  root.callbackNode = null
  root.callbackPriority = NoLane
  // 发现需要处理的 useEffect，安排任务
  if (
    (finishedWork.subtreeFlags & Passive) !== NoFlags ||
    (finishedWork.flags & Passive) !== NoFlags
  ) {
    // 本轮已经安排了处理被动副作用的任务。为 true 时跳过重复安排
    if (!rootDoesHavePassiveEffect) {
      rootDoesHavePassiveEffect = true
      // 异步执行，在commitRoot的commitMutationEffectsOnFiber执行完成后执行
      // 也就是当dom更新后，执行回调，可以看【docs/20-useEffect/index.md #`src/react-reconciler/src/ReactFiberWorkLoop.js`】
      Scheduler_scheduleCallback(NormalSchedulerPriority, flushPassiveEffect)
    }
  }
  // 判断子树是否有副作用
  const subtreeHasEffects =
    (finishedWork.subtreeFlags & MutationMask) !== NoFlags
  // 判断自身是否有副作用
  const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags
  // 如果自己有副作用或者子节点有副作用，就进行提交dom操作
  if (subtreeHasEffects || rootHasEffect) {
    // 提交dom变更，先修改真实 DOM
    commitMutationEffectsOnFiber(finishedWork, root)
    // 执行layoutEffect
    commitLayoutEffects(finishedWork, root)
    // 记录待处理的根节点，重置标记
    if (rootDoesHavePassiveEffect) {
      rootDoesHavePassiveEffect = false
      rootWithPendingPassiveEffect = root
    }
  }
  // 等dom变更后，就可以把root的current指向新的fiber树
  root.current = finishedWork
}

function renderRootConcurrent(root, lanes) {
  // 因为在构建fiber树的过程中，此方法会多次进入，只有在第一次进入的时候，会创建新的fiber树
  if (workInProgressRoot !== root || workInProgressRootRenderLanes !== lanes) {
    prepareFreshStack(root, lanes)
  }
  // 在当前分配的时间片5ms内执行fiber树的构建或者渲染
  workLoopConcurrent()
  if (workInProgress !== null) {
    // fiber构建未完成
    return RootInProgress
  }
  // 渲染结束
  return workInProgressRootExitStatus
}

function renderRootSync(root, renderLanes) {
  // 判断这次渲染是否需要重新从根 Fiber 开始准备工作
  if (
    // 表示要处理的根变了
    root !== workInProgressRoot ||
    // 本轮要处理的车道变了，就需要按照新的车道重新开始计算
    workInProgressRootRenderLanes !== renderLanes
  ) {
    // 开始构建fiber树
    prepareFreshStack(root, renderLanes)
  }
  workLoopSync()
  return RootCompleted
}

// 为本轮渲染做好准备——准备工作中的根 Fiber，并把暂存的更新放进各自 Hook 的队列
function prepareFreshStack(root, renderLanes) {
  // 判断这次渲染是否需要重新从根 Fiber 开始准备工作
  if (
    // 表示要处理的根变了
    root !== workInProgressRoot ||
    // 本轮要处理的车道变了，就需要按照新的车道重新开始计算
    workInProgressRootRenderLanes !== renderLanes
  ) {
    workInProgress = createWorkInProgress(root.current, null)
  }
  workInProgressRootRenderLanes = renderLanes
  // 把暂存的更新放进各自 Hook 的队列
  finishQueueingConcurrentUpdates()
}

function workLoopConcurrent() {
  // 如果有下一个需要构建的fiber并且时间分片没有过期
  while (workInProgress !== null && !shouldYield()) {
    performUnitOfWork(workInProgress)
  }
}

function workLoopSync() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress)
  }
}

/**
 * 执行一个工作单元
 * @param {*} unitOfWork
 */
function performUnitOfWork(unitOfWork) {
  // unitOfWork -> workInProgress，也就是新fiber
  // unitOfWork.alternate就是指向老fiber
  const current = unitOfWork.alternate
  // 完成当前fiber的子fiber链表构建后
  const next = beginWork(current, unitOfWork, workInProgressRootRenderLanes)
  unitOfWork.memoizedProps = unitOfWork.pendingProps
  if (next === null) {
    // 如果没有子节点，表示当前fiber已经完成
    completeUnitOfWork(unitOfWork)
  } else {
    // 如果有子节点，就让子节点成为下一个工作单元
    workInProgress = next
  }
}

/**
 * 执行当前 Fiber 的完成工作，并确定下一个工作单元。
 * 1、先执行当前 Fiber 的 completeWork。
 * 2、有兄弟 Fiber，则将其设为下一个工作单元，后续执行 beginWork。
 * 3、没有兄弟 Fiber，说明父 Fiber 的所有子 Fiber 均已完成，
 *    向上执行父 Fiber 的 completeWork，并重复上述过程。
 * 4、回溯到根 Fiber 并完成后，结束本轮遍历。
 * @param {*} unitOfWork 待执行完成工作的 Fiber
 * @returns {void}
 */
function completeUnitOfWork(unitOfWork) {
  // 已完成的工作单元
  let completedWork = unitOfWork
  do {
    // 当前fiber的老fiber
    const current = completedWork.alternate
    // 当前fiber的父fiber
    const returnFiber = completedWork.return
    // 执行此fiber的完成工作，如果是原生组件的话就是创建真实dom组件
    completeWork(current, completedWork)
    // 已经完成工作的fiber，需要找他的兄弟fiber
    const siblingFiber = completedWork.sibling
    if (siblingFiber !== null) {
      // 如果有兄弟fiber，就构建兄弟所对应的fiber子链表
      workInProgress = siblingFiber
      return
    } else {
      // 如果没有兄弟，就说明当前完成的就是父fiber的最后一个节点
      // 也就是说一个父fiber的所有子fiber都已经全部完成
      completedWork = returnFiber
      workInProgress = completedWork
    }
  } while (completedWork !== null)
  // 如果走到这里，说明整个fiber树完全构建完成
  if (workInProgressRootExitStatus === RootInProgress) {
    workInProgressRootExitStatus = RootCompleted
  }
}

// 获取当前的更新优先级
export function requestUpdateLane() {
  // 获取当前全局定义的lane
  const updateLane = getCurrentUpdatePriority()
  // updateLane !== 0，表示已经设置了优先级，直接返回
  if (updateLane !== NoLanes) {
    return updateLane
  }
  // 没有设置优先级，根据事件来选择当前的优先级
  // 例如离散事件DiscreteEventPriority = SyncLane
  const eventLane = getCurrentEventPriority()
  return eventLane
}
