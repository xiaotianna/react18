import { createRoot } from 'react-dom/client'

function FunctionComponent() {
  return (
    <h1
      onClick={(evnet) => console.log('父冒泡', evnet.currentTarget)}
      onClickCapture={(evnet) => console.log('父捕获', evnet.currentTarget)}
    >
      hello{' '}
      <span
        onClick={(evnet) => {
          console.log('子冒泡', evnet.currentTarget)
          evnet.stopPropagation()
        }}
        onClickCapture={(evnet) => console.log('子捕获', evnet.currentTarget)}
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
