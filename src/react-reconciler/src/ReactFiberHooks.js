import ReactSharedInternals from 'shared/ReactSharedInternals'
import { scheduleUpdateOnFiber } from './ReactFiberWorkLoop'
import { enqueueConcurrentHookUpdate } from './ReactFiberConcurrentUpdates'

const { ReactCurrentDispatcher } = ReactSharedInternals

// 用来记录当前正在渲染的函数组件，对应哪个 Fiber
// currentRenderingFiber.memoizedState：保存链表的头节点
let currentRenderingFiber = null
// 当前正在工作中的hook，指向当前已创建的最后一个 Hook
let workInProgressHook = null

const HooksDispatcherOnMount = {
  useReducer: mountReducer
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
  const update = { // 更新对象
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
  ReactCurrentDispatcher.current = HooksDispatcherOnMount
  // 需要在函数组件执行前，给 ReactCurrentDispatcher.current 赋值（在src/react/src/ReactCurrentDispatcher.js）
  const children = Component(props)
  return children
}
