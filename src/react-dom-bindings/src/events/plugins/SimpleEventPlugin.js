import {
  registerSimpleEvents,
  topLevelEventsToReactNames
} from '../DOMEventProperties'
import { IS_CAPTURE_PHASE } from '../EventSystemFlags'
import { accumulateSinglePhaseListeners } from '../DOMPluginEventSystem'

/**
 * 根据事件类型和捕获／冒泡阶段，从目标 Fiber 及其祖先中
 * 收集对应的 React 事件回调，为后续执行做准备
 * 例如点击按钮：
 *  - 冒泡阶段：收集按钮及祖先上的 onClick
    - 捕获阶段：收集按钮及祖先上的 onClickCapture
 * 当前代码只收集回调，还没有执行
 * @param {*} dispatchQueue 
 * @param {*} domEventName 
 * @param {*} targetInst 
 * @param {*} nativeEvent 
 * @param {*} nativeEventTarget 
 * @param {*} eventSystemFlags 
 * @param {*} targetContainer 
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
}

export { registerSimpleEvents as registerEvents, extractEvents }
