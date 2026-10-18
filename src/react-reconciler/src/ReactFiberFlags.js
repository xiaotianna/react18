// 无任何副作用
export const NoFlags = 0b0000000000000000000000000000000 // 0
// 插入
export const Placement = 0b0000000000000000000000000000010 // 2
// 更新
export const Update = 0b0000000000000000000000000000100 // 4
// 子节点删除
export const ChildDeletion = 0b0000000000000000000000000010000
export const MutationMask = Placement | Update
