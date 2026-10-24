const randomKey = Math.random().toString(36).slice(2)
const internalInstanceKey = '__reactFiber$' + randomKey
const internalPropsKey = '__reactProps$' + randomKey

/**
 * 从真实dom节点上获取它对应的fiber节点（取）
 * @param {*} targetNode 触发事件的真实dom
 * @returns 返回的是这个真实 DOM 对应的 Fiber 节点对象
 */
export function getClosestInstanceFromNode(targetNode) {
  const targetInst = targetNode[internalInstanceKey]
  if (targetInst) {
    return targetInst
  }
  // 如果真实dom上没有fiber，不要返回undefined，返回null
  return null
}
/**
 * 提前缓存fiber节点的实例到dom节点上（存）
 * 也就是给真实dom上添加一个属性，值是fiber
 * @param {*} hostInst
 * @param {*} node
 */
export function precacheFiberNode(hostInst, node) {
  node[internalInstanceKey] = hostInst
}

// 存
export function updateFiberProps(node, props) {
  node[internalPropsKey] = props
}
// 取
export function getFiberCurrentPropsFromNode(node) {
  return node[internalPropsKey] || null
}
