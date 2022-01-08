const regex = /(https?|http):\/\/[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]/g
let myArray = [] 
let result = `
解压码876488
天翼：https://cloud.189.cn/t/y6Ffa2A7zAze
百度：https://pan.baidu.com/s/1cFiPrSELCz425vc-oqVRg
提取码：fl30
`
while ((myArray = regex.exec(result)) !== null) {
    console.log(`Found ${myArray[0]}. Next starts at ${regex.lastIndex}.`)
}