const fs = require("fs")
exports.filterContent = function filterContent(content) {
    let cut = cutString(content,'<script src="/wp-content/themes/modown/module/ckplayer','<img src="undefined"></div></div></div>')
    let video = ''
    while (cut) {
        if (video == '') video = cutString(content,'data-video="','"><div class="ckplayer',false)
        //row.content = row.content.replace(cut,`游戏视频预览：<a href="${video}" target="_blank" rel="noopener">    点击查看</a>`)
        content = content.replace(cut,'') //去ckplayer
        cut = cutString(content,'<script src="/wp-content/themes/modown/module/ckplayer','<img src="undefined"></div></div></div>')
    }
    cut = cutString(content,'<script src="/wp-content/themes/modown/module/ckplayer','data-video=""></div>')
    while (cut) {
        content = content.replace(cut,'') //去ckplayer
        cut = cutString(content,'<script src="/wp-content/themes/modown/module/ckplayer','data-video=""></div>')
    }
    cut = cutString(content,'<script src="/wp-content/themes/modown/module/ckplayer','</object></div></div>')
    while (cut) {
        content = content.replace(cut,'') //去ckplayer
        cut = cutString(content,'<script src="/wp-content/themes/modown/module/ckplayer','</object></div></div>')
    }
    cut = cutString(content,'<div class="ckplayer','</object></div>')
    while (cut) {
        content = content.replace(cut,'') //去ckplayer
        cut = cutString(content,'<div class="ckplayer','</object></div>')
    }
    let pos = content.indexOf('<a href="javascript:;" class="article')
    if (pos != -1) content = content.slice(0,pos)
    return {content,video}
}
exports.changeContent = function changeContent(content) {

    function whoIs(str) {
        let who = ['百度', '下载', '赠品']
        let arr = []
        for (let i = 0; i < who.length; i++) {
            let pos = str.lastIndexOf(who[i])
            if (pos !== -1) {
                arr[i] = pos
            } else {
                arr[i] = 99
            }
        }
        let min = Math.min(...arr)
        if (min === 99) return ''
        return who[arr.indexOf(min)]
    }

    let vip = '', video = ''
    let vips = { bd: '', ty: '', zp: '' }
    //console.log(content)
    const regex = /(https?|http):\/\/[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]/g
    const vipurl = 'https://www.kxnn.xyz/vip'
    let myArray = [] 
    let result = content
    while ((myArray = regex.exec(content)) !== null) {
        //console.log(`Found ${myArray[0]}. Next starts at ${regex.lastIndex}.`)
        if (myArray[0].includes('streamstorevip.xyz')) {
            result = result.replace(myArray[0], vipurl)
            continue
        }
        if (myArray[0].includes('media.st.dl.pinyuncloud.com') && myArray[0].includes('movie')) {
            if (video == '') video = myArray[0]
            continue
        }
        if (myArray[0].includes('cloud.189.cn')) {
            if (vips.ty == '') vips.ty = '天翼云: ' + myArray[0]
            result = result.replace(myArray[0], vipurl)
            continue
        }
        if (myArray[0].includes('pan.baidu.com')) {
            let pos = content.indexOf(myArray[0])
            if (pos !== -1) {
                let cut = ''
                //console.log(content.substring(pos2, pos), pos - pos2)
                if (pos > 50) {
                    cut = content.slice(pos - 50, pos)
                } else {
                    cut = content.slice(0, pos)
                }
                let type = whoIs(cut)
                //console.log(type)
                switch (type) {
                    case '百度':
                        if (vips.bd == '') vips.bd = '百度云: ' + myArray[0]
                        break
                    case '下载':
                        if (vips.bd == '') vips.ty = '百度云: ' + myArray[0]
                        break
                    case '赠品':
                        if (vips.zp == '') vips.zp = '赠品链接: ' + myArray[0]
                        break
                    default:
                }
            }
            result = result.replace(myArray[0], vipurl)
        }

    }
    for (let k in vips) {
        //console.log(vips[k])
        if (vips[k] != '') vip = vip + '<br>' + vips[k]
    }
    return {
        content: result,
        vip,
        video
    }
}
exports.cutString = function cutString(origin, preStr, aftStr, includeBorders = true) {
    let pos = origin.indexOf(preStr)
    let pos2 = origin.indexOf(aftStr, pos+preStr.length)
    //console.log(pos,pos2,origin.length)
    if (pos == -1 || pos2 == -1) return ''
    if (includeBorders) return origin.slice(pos, pos2 + aftStr.length)
    return origin.slice(pos + preStr.length, pos2)
    //return origin.substring(pos,pos2+aftStr.length)
}
/*  let content = fs.readFileSync('./title.html', 'utf8')
//let result = exports.cutString(content,'<script src="/wp-content/themes/modown/module/ckplayer','<img src="undefined"></div></div></div>');
let cut = exports.cutString(content,'<script src="/wp-content/themes/modown/module/ckplayer','<img src="undefined"></div></div></div>')
if (cut) {
    let cutUrl = exports.cutString(content,'data-video="','"><div class="ckplayer',false)
    content = content.replace(cut,`游戏视频预览：<a href="${cutUrl}" target="_blank" rel="noopener">    点击查看</a>`)
}
let result = exports.changeContent(content)
fs.writeFileSync('./title2.html', content)
console.log(result.vip)    */
