// 无任何副作用
export const NoFlags = 0b0000000000000000000000000000000 // 0
// 插入
export const Placement = 0b0000000000000000000000000000010 // 2
// 更新
export const Update = 0b0000000000000000000000000000100 // 4
// 子节点删除
export const ChildDeletion = 0b0000000000000000000000000010000
export const MutationMask = Placement | Update
// 如果函数组件使用了useEffect，那么此函数组件对应的fiber上有一个flags 2048
export const Passive = 0b0000000000000000000100000000000 // 2048
export const LayoutMask = Update
