import assign from 'shared/assign'

function functionThatReturnsTrue() {
  return true
}
function functionThatReturnsFalse() {
  return false
}

const MouseEventInterface = {
  clientX: 0,
  clientY: 0,
  // ...还有很多属性，省略
}

/**
 * 创建合成事件
 */
function createSyntheitcMouseEvent(eventInterface) {
  /**
   * 合成事件的基类
   * @param {*} reactName react事件名称，放在属性上 onClick
   * @param {*} reactEventType click
   * @param {*} targetInst 事件真实dom对应的fiber实例
   * @param {*} nativeEvent 原生事件对象e
   * @param {*} nativeEventTarget 原生事件对应的真实dom
   */
  function SyntheitcBaseEvent(
    reactName,
    reactEventType,
    targetInst,
    nativeEvent,
    nativeEventTarget
  ) {
    this._reactName = reactName
    this.type = reactEventType
    this._targetInst = targetInst
    this.nativeEvent = nativeEvent
    this.target = nativeEventTarget
    // 把此接口上对应的属性从原生事件上拷贝到合成事件实例上
    for (const propName in eventInterface) {
      if (!eventInterface.hasOwnProperty(propName)) {
        continue
      }
      this[propName] = nativeEvent[propName]
    }
    // 是否已经阻止默认事件
    this.isDefaultPrevented = functionThatReturnsFalse
    // 是否已经阻止继续传播
    this.isPropagationStopped = functionThatReturnsFalse
  }

  // 做兼容
  assign(SyntheitcBaseEvent.prototype, {
    preventDefault() {
      const event = this.nativeEvent
      if (event.preventDefault) {
        event.preventDefault()
      } else {
        event.returnValue = false
      }
      this.isDefaultPrevented = functionThatReturnsTrue
    },
    stopPropagation() {
      const event = this.nativeEvent
      if (event.stopPropagation) {
        event.stopPropagation()
      } else {
        event.cancelBubble = true
      }
      this.isPropagationStopped = functionThatReturnsTrue
    }
  })

  return SyntheitcBaseEvent
}

export const SyntheitcMouseEvent =
  createSyntheitcMouseEvent(MouseEventInterface)
