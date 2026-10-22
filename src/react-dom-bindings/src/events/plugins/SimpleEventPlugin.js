import {
  registerSimpleEvents,
  topLevelEventsToReactNames
} from '../DOMEventProperties'
import { IS_CAPTURE_PHASE } from '../EventSystemFlags'
import { accumulateSinglePhaseListeners } from '../DOMPluginEventSystem'
import { SyntheitcMouseEvent } from '../SyntheitcEvent'

/**
 * 根据事件类型和捕获／冒泡阶段，从目标 Fiber 及其祖先中收集对应的 React 事件回调，为后续执行做准备
 * 例如点击按钮：
 *  - 冒泡阶段：收集按钮及祖先上的 onClick
    - 捕获阶段：收集按钮及祖先上的 onClickCapture
 * 当前代码只收集回调，还没有执行，会把执行回调函数添加到dispatchQueue中
 * @param {*} dispatchQueue 派发队列，里面放置监听函数
 * @param {*} domEventName dom事件名称 click
 * @param {*} targetInst 目标fiber
 * @param {*} nativeEvent 原生事件对象e
 * @param {*} nativeEventTarget 原生事件源，也就是触发事件的真实dom
 * @param {*} eventSystemFlags 事件系统标识，0冒泡，4捕获
 * @param {*} targetContainer 目标容器 div#root
 */
function extractEvents(
  dispatchQueue,
  domEventName,
  targetInst,
  nativeEvent,
  nativeEventTarget,
  eventSystemFlags,
  targetContainer
) {
  // 根据原生事件名，查找对应的 React 事件名（'click' → 'onClick'）
  const reactName = topLevelEventsToReactNames.get(domEventName)
  // 合成事件的构建函数
  let SyntheticEventCtor
  switch (domEventName) {
    case 'click':
      SyntheticEventCtor = SyntheitcMouseEvent
      break
    default:
      break
  }

  // 是否是捕获阶段
  const inCapturePhase = (eventSystemFlags & IS_CAPTURE_PHASE) !== 0
  // 从fiber树中找到对应事件的回调函数
  // 累加单个阶段的监听
  const listeners = accumulateSinglePhaseListeners(
    targetInst,
    reactName,
    nativeEvent.type,
    inCapturePhase
  )
  // 如果有要执行的监听函数，[onClickCapture, onClickCapture]分别对应的是[ChildCapture, ParentCapture]
  if (listeners.length > 0) {
    // 创建合成事件类的实例
    const event = new SyntheticEventCtor(
      reactName,
      domEventName,
      null,
      nativeEvent,
      nativeEventTarget
    )
    dispatchQueue.push({
      event, // 合成事件实例
      listeners // 监听函数数组
    })
  }
}

export { registerSimpleEvents as registerEvents, extractEvents }
