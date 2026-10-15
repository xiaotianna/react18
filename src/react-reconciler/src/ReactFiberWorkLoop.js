import { scheduleCallback } from 'scheduler'
import { createWorkInProgress } from './ReactFiber'
import { beginWork } from './ReactFiberBeginWork'

// 当前正在处理的 Fiber 节点；没有工作时为 null
let workInProgress = null

/**
 * 计划更新root
 * 在源码中此处有一个任务的功能
 * @param {*} root
 */
export function scheduleUpdateOnFiber(root) {
  // 确保调度执行root上的更新
  ensureRootIsscheduled(root)
}

function ensureRootIsscheduled(root) {
  // 告诉浏览器需要执行performConcurrentWorkOnRoot
  scheduleCallback(performConcurrentWorkOnRoot.bind(null, root))
}

/**
 * 根据fiber构建fiber树，要创建真实dom节点，还要把真实dom节点插入容器
 * @param {*} root
 */
function performConcurrentWorkOnRoot(root) {
  // 第一次渲染以同步的方式渲染根节点，初次渲染的时候，都是同步的（为了保证初始化加载的完整）
  renderRootSync(root)
}

function renderRootSync(root) {
  // 开始构建fiber树
  prepareFreshStack(root)
  workLoopSync()
}

function prepareFreshStack(root) {
  workInProgress = createWorkInProgress(root.current, null)
  console.log(workInProgress)
}

function workLoopSync() {
  while(workInProgress !== null) {
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
  const next = beginWork(current, unitOfWork)
  unitOfWork.memoizedProps = unitOfWork.pendingProps
  if (next === null) {
    // 如果没有子节点，表示当前fiber已经完成
    // completeUnitOfWork(unitOfWork)
    workInProgress = null
  } else {
    // 如果有子节点，就让子节点成为下一个工作单元
    workInProgress = next
  }
}