import { createRoot } from 'react-dom/client'
import * as React from 'react'

function FunctionComponent() {
  const [number, setNumber] = React.useState(0)

  React.useEffect(() => {
    console.log('useEffect 执行，number =', number)
    return () => {
      console.log('useEffect 清理，number =', number)
    }
  })

  return <button onClick={() => setNumber(number + 1)}>{number}</button>
}

const element = <FunctionComponent />
// console.log(element)

const root = createRoot(document.querySelector('#root'))
// console.log(root);

// 把element虚拟dom渲染到容器中
root.render(element)
