const root = {
  name: 'A1',
  children: [
    {
      name: 'B',
      children: [
        {
          name: 'B1'
        },
        {
          name: 'B2'
        }
      ]
    },
    {
      name: 'C',
      children: [
        {
          name: 'C1'
        },
        {
          name: 'C2'
        }
      ]
    }
  ]
}

function dfs(node) {
  console.log(node.name)
  node.children?.forEach(dfs)
}
dfs(root)
