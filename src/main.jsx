import { createRoot } from 'react-dom/client'

function FunctionComponent() {
  return (
    <h1
      onClick={() => console.log('父冒泡')}
      onClickCapture={() => console.log('父捕获')}
    >
      hello{' '}
      <span
        onClick={() => console.log('子冒泡')}
        onClickCapture={() => console.log('子捕获')}
        style={{ color: 'red' }}
      >
        world
      </span>
    </h1>
  )
}

const element = <FunctionComponent />
// console.log(element)

const root = createRoot(document.querySelector('#root'))
// console.log(root);

// 把element虚拟dom渲染到容器中
root.render(element)
