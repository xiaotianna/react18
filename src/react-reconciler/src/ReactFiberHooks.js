import ReactSharedInternals from 'shared/ReactSharedInternals'
import { scheduleUpdateOnFiber } from './ReactFiberWorkLoop'
import { enqueueConcurrentHookUpdate } from './ReactFiberConcurrentUpdates'

const { ReactCurrentDispatcher } = ReactSharedInternals

// 用来记录当前正在渲染的函数组件，对应哪个 Fiber
// currentRenderingFiber.memoizedState：保存链表的头节点
let currentRenderingFiber = null
// 当前正在工作中的hook，指向当前已创建的最后一个 Hook
let workInProgressHook = null
// 当前hook的老hook（也就是遍历旧 Hook 链表的指针）
let currentHook = null

const HooksDispatcherOnMount = {
  useReducer: mountReducer
}

const HooksDispatcherOnUpdate = {
  useReducer: updateReducer
}

/**
 * useReducer 在更新阶段的实现
 * 根据旧 Hook 创建新 Hook，复用更新队列，
 * 依次执行待处理的 action，保存新状态并返回 [状态, dispatch]。
 * @param {Function} reducer 状态更新函数
 * @returns {Array} [新状态, dispatch]
 */
function updateReducer(reducer) {
  // 获取新的hook
  const hook = updateWorkInProgressHook()
  // 新旧 Hook 共享的更新队列对象
  const queue = hook.queue
  // 获取老的hook
  const current = currentHook
  // 获取将要生效的队列（指向循环链表的最后一个更新）
  const pendingQueue = queue.pending
  // 初始化一个新的状态，取值为当前的状态
  let newState = current.memoizedState
  // 构建新 Fiber 时，遍历更新队列，调用 reducer 计算新状态（其中的action在dispatchReducerAction中调用）；此处尚未更新 DOM
  if (pendingQueue !== null) {
    queue.pending = null
    const firstQueue = pendingQueue.next
    let update = firstQueue
    do {
      const action = update.action
      newState = reducer(newState, action)
      update = update.next
    } while (update !== null && update !== firstQueue)
  }
  hook.memoizedState = newState
  return [hook.memoizedState, queue.dispatch]
}

/**
 * 按 Hook 的调用顺序，找到对应的旧 Hook，创建新 Hook，再把它接到新 Fiber 的 Hook 链表上
 * 【docs/15-updateReducer/hook.png】
 */
function updateWorkInProgressHook() {
  // 找到这次调用对应的旧 Hook
  if (currentHook === null) {
    // 第一次调用：通过 alternate 找到旧 Fiber，取出它的第一个 Hook
    const current = currentRenderingFiber.alternate
    currentHook = current.memoizedState
  } else {
    // 后续调用：沿着 next，取下一个旧 Hook
    currentHook = currentHook.next
  }
  // 根据老hook，创建新hook
  const newHook = {
    memoizedState: currentHook.memoizedState, // 先沿用旧状态，之后由 updateReducer 计算新状态
    queue: currentHook.queue,
    next: null
  }
  // 把新 Hook 接到新链表上
  if (workInProgressHook === null) {
    workInProgressHook = newHook
    currentRenderingFiber.memoizedState = newHook
  } else {
    workInProgressHook.next = newHook
    workInProgressHook = newHook
  }
  return workInProgressHook
}

/**
 * useReducer 在组件首次渲染时的初始化实现
 * 负责创建 Hook、保存初始状态，并返回 [状态, dispatch]
 * @param {*} reducer
 * @param {*} inheritArg
 * @returns
 */
function mountReducer(reducer, inheritArg) {
  /**
   * 创建一个 Hook，并挂到当前组件的 Hook 链表上
   * 这个 Hook 用来保存本次 useReducer 的状态和更新队列。
   */
  const hook = mountWorkInProgressHook()
  hook.memoizedState = inheritArg
  // 创建更新队列，保存在 Hook 上
  const queue = {
    pending: null,
    dispatch: null
  }
  hook.queue = queue
  // 创建当前 Hook 专属的 dispatch
  const dispatch = (queue.dispatch = dispatchReducerAction.bind(
    null,
    currentRenderingFiber, // 更新属于哪个组件
    queue // 更新放进哪个 Hook 的队列
  ))
  // 对应：const [count, dispatch] = [0, dispatch函数]
  return [hook.memoizedState, dispatch]
}

/**
 * 执行派发动作的方法，它要更新状态，并且让界面重新更新
 * @param {*} fiber 函数组件对应的fiber
 * @param {*} queue hook对应的更新队列
 * @param {*} action 派发的动作
 */
function dispatchReducerAction(fiber, queue, action) {
  // 在每个hook里会存放一个更新队列
  // 更新队列是一个更新对象的循环链表update1.next=update2.next=update1
  // 更新对象
  const update = {
    action, // {type: 'add', payload: 1}
    next: null
  }
  // 把当前最新的更新添加到更新队列中，返回当前的根fiber
  const root = enqueueConcurrentHookUpdate(fiber, queue, update)
  // 安排更新任务
  scheduleUpdateOnFiber(root)
}

/**
 * 创建一个新的 Hook，接到当前组件的 Hook 链表末尾，并返回它
 */
function mountWorkInProgressHook() {
  const hook = {
    memoizedState: null, // hook的状态，刚开始是初始值，例如useState(0)，那开始就是0
    queue: null, // 存放本hook的更新队列，queue.pending = update的循环链表
    next: null // 指向下一个hook，会组成一个单向链表
  }
  if (workInProgressHook === null) {
    workInProgressHook = hook
    // 当前函数组件对应的fiber的状态等于第一个hook
    // Fiber.memoizedState --> Hook1 <--- workInProgressHook
    // 因为不同的fiber的state是不一样的
    currentRenderingFiber.memoizedState = hook
  } else {
    // 把当前 hook 的 next 指向新 hook
    workInProgressHook.next = hook
    // 把 workInProgressHook 移到新 hook
    workInProgressHook = hook
  }
  return workInProgressHook
}

/**
 * 渲染函数组件
 * @param {*} current 老fiber
 * @param {*} workInProgress 新fiber
 * @param {*} Component 组件定义
 * @param {*} props 组件属性
 * @returns 虚拟dom或者说是react元素
 */
export function renderWithHooks(current, workInProgress, Component, props) {
  // 函数组件对应的fiber
  currentRenderingFiber = workInProgress
  if (current !== null && current.memoizedState !== null) {
    // 如果有老fiber，并且有老的hook链表，表示更新
    ReactCurrentDispatcher.current = HooksDispatcherOnUpdate
  } else {
    // 初次挂载
    ReactCurrentDispatcher.current = HooksDispatcherOnMount
  }
  // 需要在函数组件执行前，给 ReactCurrentDispatcher.current 赋值（在src/react/src/ReactCurrentDispatcher.js）
  const children = Component(props)
  currentRenderingFiber = null
  workInProgressHook = null
  return children
}
