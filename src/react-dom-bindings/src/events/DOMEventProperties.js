import { registerTwoPhaseEvent } from './EventRegistry'

// 源码中有非常多的原生事件类型
const simpleEventPluginEvents = ['click']

// 保存“原生事件名 → React 事件名”的对应映射关系
export const topLevelEventsToReactNames = new Map()

function registerSimpleEvent(domEvnetName, reactName) {
  // 把原生事件名和处理函数名称进行映射，click -> onClick
  /**
   * 如何去取onClick值？
   * 在真实dom的internalPropsKey上获取到当前虚拟dom的props，然后通过props.onClick获取
   */
  topLevelEventsToReactNames.set(domEvnetName, reactName)
  // 注册两个阶段的事件
  registerTwoPhaseEvent(reactName, [domEvnetName])
}

// 注册简单事件
export function registerSimpleEvents() {
  for (let i = 0; i < simpleEventPluginEvents.length; i++) {
    const eventName = simpleEventPluginEvents[i] // click
    const domEvnetName = eventName.toLowerCase() // click
    const capitalizeEvent = eventName[0].toUpperCase() + eventName.slice(1) // Click
    registerSimpleEvent(domEvnetName, `on${capitalizeEvent}`) // click, onClick
  }
}
