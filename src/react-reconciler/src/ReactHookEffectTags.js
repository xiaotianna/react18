export const NoFlags = 0b0000
// 有effect
export const HasEffect = 0b0001 // 1
export const Insertion = 0b0010 // 2
// useLayoutEffect：会在ui绘制前执行，类似微任务
export const Layout = 0b0100 // 4
// useEffect，在ui绘制之后执行，类似宏任务
export const Passive = 0b1000 // 8
