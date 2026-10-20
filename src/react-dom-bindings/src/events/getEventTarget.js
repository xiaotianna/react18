/**
 * 获取事件源，也就是事件最初发生在哪个目标上
 * @param {*} nativeEvent 原生事件对象e
 * @returns
 */
export default function getEventTarget(nativeEvent) {
  /**
   * e.target => 被点击的dom，e.type => click
   *  nativeEvent.target：标准属性，获取事件目标。
      nativeEvent.srcElement：旧浏览器的兼容写法。
      window：前两个都取不到时的兜底值
   */
  const target = nativeEvent.target || nativeEvent.srcElement || window
  return target
}
