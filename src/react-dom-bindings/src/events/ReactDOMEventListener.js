import getEventTarget from './getEventTarget'
import { dispatchEventForPluginEventSystem } from './DOMPluginEventSystem'
import { getClosestInstanceFromNode } from '../client/ReactDOMComponentTree'

/**
 * 提前给 dispatchDiscreteEvent 绑定三个参数，然后返回一个新函数。
 * 返回的新函数的参数，就是 dispatchDiscreteEvent 的第四个参数，也就是原生事件对象
 * @param {*} targetContainer 
 * @param {*} domEventName 
 * @param {*} eventSystemFlags 
 * @returns 
 */
export function createEventListenerWrapperWithPriority(
  targetContainer,
  domEventName,
  eventSystemFlags
) {
  const listenerWrapper = dispatchDiscreteEvent
  return listenerWrapper.bind(
    null, // this绑定为null
    domEventName,
    eventSystemFlags,
    targetContainer
  )
}

/**
 * 派发离散的事件的监听函数
 * 离散是指不连续触发的，例如click，不离散就例如滚动事件
 * @param {*} domEventName 事件名，click
 * @param {*} eventSystemFlags 阶段，0是冒泡，4是捕获
 * @param {*} container 容器 div#root
 */
function dispatchDiscreteEvent(
  domEventName,
  eventSystemFlags,
  container,
  nativeEvent
) {
  dispatchEvent(domEventName, eventSystemFlags, container, nativeEvent)
}

/**
 * 此方法就是委托给容器的回调，当容器#root在捕获/冒泡阶段处理事件的时候会执行此函数
 * @param {*} domEventName
 * @param {*} eventSystemFlags
 * @param {*} targetContainer
 * @param {*} nativeEvent
 */
export function dispatchEvent(
  domEventName,
  eventSystemFlags,
  targetContainer,
  nativeEvent
) {
  // 获取事件源，是一个真实dom，也就是获取是哪个dom触发的事件
  const nativeEventTarget = getEventTarget(nativeEvent)
  // 返回触发这个事件的真实dom元素所对应的fiber节点
  const targetInst = getClosestInstanceFromNode(nativeEventTarget)
  // 把事件信息交给 React 的事件插件系统，找到应该处理这次事件的 React 回调
  dispatchEventForPluginEventSystem(
    domEventName, // click
    eventSystemFlags, // 0 4
    nativeEvent, // 原生事件
    targetInst, // 真实dom对应的fiber
    targetContainer // 目标容器
  )
}
