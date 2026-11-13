// 无任何副作用
export const NoFlags = 0b0000000000000000000000000000000 // 0
// 插入
export const Placement = 0b0000000000000000000000000000010 // 2
// 更新
export const Update = 0b0000000000000000000000000000100 // 4
// 子节点删除
export const ChildDeletion = 0b0000000000000000000000000010000
// DOM ref 的绑定或解绑
export const Ref = 0b0000000000000000000001000000000
export const MutationMask = Placement | Update | ChildDeletion | Ref
// 如果函数组件使用了useEffect，那么此函数组件对应的fiber上有一个flags 2048
export const Passive = 0b0000000000000000000100000000000 // 2048
/**
 * LayoutMask 决定 layout 阶段是否遍历子树
 * 例如 DOM 属性没变，只把 refA 换成 refB，节点会有 Ref 标记，但没有 Update。
 * 如果 LayoutMask 只有 Update，这棵子树就会被跳过，导致旧 ref 已解绑，新 ref 却没有绑定
 * 原因在于：ref 是 element 和 Fiber 上的独立字段，不属于 props。创建 JSX 元素时就已经单独取出来了
 */
export const LayoutMask = Update | Ref
