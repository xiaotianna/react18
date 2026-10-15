// 判断当前的虚拟dom是否是纯文本
export function shouldSetTextContent(type, props) {
  return (
    typeof props.children === 'string' || typeof props.children === 'number'
  )
}
