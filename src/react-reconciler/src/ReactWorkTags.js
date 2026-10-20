// 组件tag标识，每种虚拟DOM都会对应自己的fiber tag类型
export const FunctionComponent = 0 // 函数组件
export const ClassComponent = 1 // 类组件
export const IndeterminateComponent = 2 // 未决定类型（因为会有函数组件和类组件，本质都是函数，所以需要暂定）
export const HostRoot = 3 // 容器根节点
export const HostComponent = 5 // 原生节点 span、div
export const HostText = 6 // 纯文本节点
