import { allNativeEvents } from './EventRegistry'
import * as SimpleEventPlugin from './plugins/SimpleEventPlugin'
import { IS_CAPTURE_PHASE } from './EventSystemFlags'
import { createEventListenerWrapperWithPriority } from './ReactDOMEventListener'
import {
  addEventCaptureListener,
  addEventBubbleListener
} from './EventListener'
import getEventTarget from './getEventTarget'
import { HostComponent } from 'react-reconciler/src/ReactWorkTags'
import getListener from './getListener'

// 会往allNativeEvents中添加事件名称，供listenToAllSupportedEvents方法使用
SimpleEventPlugin.registerEvents()

// 随机数标识
const listeningMarker = `_reactListening` + Math.random().toString(36).slice(2)

/**
 * 让这个根容器监听 React 能处理的所有原生事件，
 * 是 React 事件委托机制的初始化入口
 * @param {*} rootContainerElement 根容器元素 div#root
 */
export function listenToAllSupportedEvents(rootContainerElement) {
  // 监听根容器，只监听一次
  if (!rootContainerElement[listeningMarker]) {
    rootContainerElement[listeningMarker] = true
    // 遍历所有的原生事件
    allNativeEvents.forEach((domEventName) => {
      // click
      listenToNativeEvent(domEventName, true, rootContainerElement) // 捕获
      listenToNativeEvent(domEventName, false, rootContainerElement) // 冒泡
    })
  }
}

/**
 * 注册原生事件
 * @param {*} domEventName 原生事件
 * @param {*} isCapturePhaseListener 是否是捕获阶段
 * @param {*} target 目标dom，也就是 div#root 容器节点
 */
export function listenToNativeEvent(
  domEventName,
  isCapturePhaseListener,
  target
) {
  // 系统事件标识，默认是0，0是冒泡，4是捕获
  let eventSystemFlags = 0
  if (isCapturePhaseListener) {
    // eventSystemFlags为4
    eventSystemFlags |= IS_CAPTURE_PHASE
  }
  // 创建react的事件函数监听，再把它注册到根容器上
  addTrappedEventListener(
    target,
    domEventName,
    eventSystemFlags,
    isCapturePhaseListener
  )
}

/**
 * 创建react的事件函数监听，再把它注册到根容器上
 * @param {*} targetContainer 绑定事件监听器的根容器 DOM，例如 div#root
 * @param {*} domEventName 原生事件名称，例如 'click'、'keydown'
 * @param {*} eventSystemFlags React 内部的事件标记，当前实现中 0 表示冒泡，4 表示捕获
 * @param {*} isCapturePhaseListener 是否监听捕获阶段：true 为捕获，false 为冒泡
 */
function addTrappedEventListener(
  targetContainer,
  domEventName,
  eventSystemFlags,
  isCapturePhaseListener
) {
  // 创建监听函数
  // 只是创建函数，还没有执行事件处理
  const listener = createEventListenerWrapperWithPriority(
    targetContainer,
    domEventName,
    eventSystemFlags
  )
  // 根据阶段注册监听
  if (isCapturePhaseListener) {
    // 捕获监听
    addEventCaptureListener(targetContainer, domEventName, listener)
  } else {
    // 冒泡监听
    addEventBubbleListener(targetContainer, domEventName, listener)
  }
}

/**
 * 把参数透传给 dispatchEventForPlugins 方法，
 * 后续插件会：
    1. 根据 'click' 找到 React 事件名 onClick
    2. 根据阶段，选择查找 onClick 或 onClickCapture
    3. 从按钮的 Fiber 开始，沿父 Fiber 向上，收集对应的回调函数
 * @param {*} domEventName 
 * @param {*} eventSystemFlags 
 * @param {*} nativeEvent 
 * @param {*} targetInst 
 * @param {*} targetContainer 
 */
export function dispatchEventForPluginEventSystem(
  domEventName,
  eventSystemFlags,
  nativeEvent,
  targetInst,
  targetContainer
) {
  dispatchEventForPlugins(
    domEventName,
    eventSystemFlags,
    nativeEvent,
    targetInst,
    targetContainer
  )
}

/**
 * 把事件信息交给 React 的事件插件系统，找到应该处理这次事件的 React 回调
 * @param {*} domEventName dom触发事件名称 click
 * @param {*} eventSystemFlags 事件类型：0冒泡，4捕获
 * @param {*} nativeEvent 浏览器原生事件对象e
 * @param {*} targetInst 触发事件的真实dom对应的fiber对象
 * @param {*} targetContainer 注册事件监听器的根容器dom div#root
 */
function dispatchEventForPlugins(
  domEventName,
  eventSystemFlags,
  nativeEvent,
  targetInst,
  targetContainer
) {
  const nativeEventTarget = getEventTarget(nativeEvent)
  // 派发事件的数组
  const dispatchQueue = []
  // 提取事件
  extractEvents(
    dispatchQueue,
    domEventName,
    targetInst,
    nativeEvent,
    nativeEventTarget,
    eventSystemFlags,
    targetContainer
  )
  // 遍历已经收集好的事件队列，把事件交给对应的监听器处理
  processDispatchQueue(dispatchQueue, eventSystemFlags)
}

// 遍历事件队列
function processDispatchQueue(dispatchQueue, eventSystemFlags) {
  // 判断是否在捕获阶段
  const inCapturePhase = (eventSystemFlags & IS_CAPTURE_PHASE) !== 0
  for (let i = 0; i < dispatchQueue.length; i++) {
    const { event, listeners } = dispatchQueue[i]
    processDispatchQueueItemsInOrder(event, listeners, inCapturePhase)
  }
}

/**
 * 按捕获或冒泡顺序遍历回调，并检查是否停止传播
 * @param {*} event 
 * @param {*} dispatchListeners 
 * @param {*} inCapturePhase 
 * @returns 
 */
function processDispatchQueueItemsInOrder(
  event,
  dispatchListeners,
  inCapturePhase
) {
  if (inCapturePhase) {
    // 存入dispatchListeners的时候是[子，父]，拿的时候就需要[父，子]
    for (let i = dispatchListeners.length - 1; i >= 0; i--) {
      const { listener, currentTarget } = dispatchListeners[i]
      if (event.isPropagationStopped()) {
        return
      }
      executeDispatch(event, listener, currentTarget)
    }
  } else {
    for (let i = 0; i < dispatchListeners.length; i++) {
      const { listener, currentTarget } = dispatchListeners[i]
      if (event.isPropagationStopped()) {
        return
      }
      executeDispatch(event, listener, currentTarget)
    }
  }
}

// 真正执行事件回调
function executeDispatch(event, listener, currentTarget) {
  // 合成事件实例event的currentTarget是在不断变化的，因为同一次事件、同一阶段的多个回调，共用同一个合成事件对象。
  // event.nativeEvent是原生事件对象，是永远不变的
  // event.currentTarget是当前的事件源，它会随着事件回调的执行不断变化的
  event.currentTarget = currentTarget
  listener(event)
}

function extractEvents(
  dispatchQueue,
  domEventName,
  targetInst,
  nativeEvent,
  nativeEventTarget,
  eventSystemFlags,
  targetContainer
) {
  SimpleEventPlugin.extractEvents(
    dispatchQueue,
    domEventName,
    targetInst,
    nativeEvent,
    nativeEventTarget,
    eventSystemFlags,
    targetContainer
  )
}

/**
 * 从目标 Fiber 开始，沿父 Fiber 向上查找，收集指定阶段的事件回调，最后返回数组
 * @param {*} targetFiber
 * @param {*} reactName
 * @param {*} nativeEventType
 * @param {*} isCapturePhase
 * @returns
 */
export function accumulateSinglePhaseListeners(
  targetFiber,
  reactName,
  nativeEventType,
  isCapturePhase
) {
  const captureName = reactName + 'Capture'
  const reactEventName = isCapturePhase ? captureName : reactName
  const listeners = []
  // 从目标 Fiber 开始查找
  let instance = targetFiber
  while (instance !== null) {
    const { stateNode, tag } = instance
    // 遇到真实 DOM 对应的 Fiber，就读取它的回调
    if (tag === HostComponent && stateNode !== null) {
      const listener = getListener(instance, reactEventName)
      if (listener) {
        listeners.push(createDispatchListener(instance, listener, stateNode))
      }
    }
    // 继续查找父 Fiber
    instance = instance.return
  }
  // 返回targetFiber及其祖先中，当前事件在指定阶段的回调数组（冒泡/捕获）
  // 例如点击按钮，收集冒泡回调的结果就是：[buttonClick, parentClick]
  return listeners
}

function createDispatchListener(instance, listener, currentTarget) {
  return { instance, listener, currentTarget }
}
