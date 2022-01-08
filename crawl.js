const fs = require("fs")
const crypto = require('crypto');
const sqlite = require('./asqlite3.js')
const puppeteer = require('puppeteer')
const core = require('@actions/core')
const github = require('@actions/github')
const { tFormat, sleep, clearBrowser, getRndInteger, randomOne, randomString, md5, findFrame } = require('./common.js')
const { changeContent,cutString,filterContent} = require('./utils.js');
Date.prototype.format = tFormat
const runId = github.context.runId
let browser
let setup = {}
if (!runId) {
  setup = JSON.parse(fs.readFileSync('./setup.json', 'utf8'))
} else {
  setup = JSON.parse(process.env.SETUP)
}

async function crawlArticles(row,page) {
  await page.goto(row.url, { timeout: 60000 })
  //await page.goto('https://www.streamstorevip.xyz/2021/10/26/%e4%ba%ba%e7%b1%bb%e7%96%af%e7%8b%82-human-madness/', { timeout: 60000 })
  let title = await page.$eval('body > div.main > div > div.content-wrap > div > article > header > h1',e=>e.innerText)
  let content = ''
  //content = await page.$eval('body > div.main > div > div.content-wrap > div > article > div.article-content',e=>e.innerHTML)
  let divs = await page.$$eval('body > div.main > div > div.content-wrap > div > article > div:not(.article-act,.article-tags)',(divs) => divs.map((div) => div.innerHTML))
  for (let div of divs) {
    //console.log('div',div)
    content = content +'<br>'+ div
  }
  row.md5 = md5(content)  //原始md5值
  let video = ''
  ({content,video} = filterContent(content))
  let labels = await page.$$eval('body > div.main > div > div.content-wrap > div > article > div.article-tags a',
    (links) => links.map((link) => link.innerText))
  console.log(labels.join(),row.url.substr(31,10))
  //fs.writeFileSync('./title.html',content )
  //return Promise.reject(new Error('调试退出'))
  let result = changeContent(content)
  //console.log(!result.vip)
  if (!result.vip) {
    let cut = cutString(result.content,'<fieldset class="erphpdown"','</fieldset>	')
    if (cut) {
      //console.log(cut)
      let url = cutString(cut,'<a href="','"',false)
      //console.log('url',url)
      result.content = result.content.replace(cut,'')
      cut = cutString(result.content,'<fieldset class=','</fieldset>	')
      if (cut) {
        result.content = result.content.replace(cut,'')
      }
      if (url) {
        await page.goto('https://www.streamstorevip.xyz'+url)
        await page.waitForSelector('body > div.main > div > div > div > article')
        //天翼
        let url1 = await page.$eval('body > div.main > div > div > div > article > div > div > p:nth-child(2) > a', el => el.href)
              .catch(async (error)=>{console.log('error: ', error.message);}) 
        //baidu
        let url2 = await page.$eval('body > div.main > div > div > div > article > div > div > p:nth-child(3) > a.link.erphpdown-down-btn', el => el.href) 
              .catch(async (error)=>{console.log('error: ', error.message);}) 
        //提取码
        let tqm = await page.$eval('body > div.main > div > div > div > article > div > div > p:nth-child(3)', el => el.innerText)
              .catch(async (error)=>{console.log('error: ', error.message);}) 
        //解压码     
        let jym = await page.$eval('body > div.main > div > div > div > article > div > div > div.hidden-content', el => el.innerText)
              .catch(async (error)=>{console.log('error: ', error.message);}) 
        if (tqm) {
          result.vip = tqm + jym
          result.vip = result.vip.replace(/复制/g,'  ')
        } else {
          result.vip =  jym
        }
        console.log(url1,url2,result.vip)
        if (url1) {
          await page.goto(url1)
          url1  = await page.url()
          result.vip = result.vip.replace('点击下载',url1+' ')
        } 
        if (url2) {
          await page.goto(url2)
          url2  = await page.url()    
          result.vip = result.vip + '<br>天翼云：' + url2
        }

      }
    }
  }
  row.title = title
  row.content = result.content
  row.vip = result.vip
  row.video = video ? video : result.video
  row.label = labels.join()
  row.date = row.url.substr(31,10)
  row.crawled = 1
  console.log (row.title,row.vip,row.md5,row.video)
  //fs.writeFileSync('./title2.html', row.content)
  return row
  //return Promise.reject(new Error('调试退出'))
}
async function  main () {
    console.log(await sqlite.open('./ssv.db'))
    const browser = await puppeteer.launch({
      headless: runId ? true : false,
      args: ['--window-size=1920,1080'],
      defaultViewport: null,
      ignoreHTTPSErrors: true,
    });
    const page = await browser.newPage();
    // 当页面中的脚本使用“alert”、“prompt”、“confirm”或“beforeunload”时发出
    page.on('dialog', async dialog => {
        //console.info(`➞ ${dialog.message()}`);
        await dialog.dismiss();
    });
    await page.goto('https://www.streamstorevip.xyz/help/', { timeout: 60000 })
    await page.click('body > header > div > ul.nav-right > li.nav-login.no > a.signin-loader > span')
    await page.waitForSelector('#user_login', { timeout: 15000 })
    await sleep(500)
    await page.type('#user_login', setup.usr.ssv)
    await page.type('#user_pass', setup.pwd.ssv)
    //return Promise.reject(new Error('临时退出'))
    await Promise.all([
      page.waitForNavigation({timeout: 60000}), 
      //等待页面跳转完成，一般点击某个按钮需要跳转时，都需要等待 page.waitForNavigation() 执行完毕才表示跳转成功
      page.click('#sign-in > div.sign-submit > input.btn.signinsubmit-loader'),    
    ])
    .then(()=>console.log ('登录成功'))
    await sleep(500)
    console.log(`*****************开始crawlArticles ${Date()}*******************\n`);  
    //let sql = "SELECT * FROM freeok WHERE level IS NULL  and (level_end_time < datetime('now') or level_end_time IS NULL);"
    //let sql = "select * from articles where vip = '' limit 1;"
    let sql = "select * from articles where video is null;"
    let r = await sqlite.all(sql, []);
    let i = 0;
    console.log(`共有${r.length}个文章要爬取`);
    for (let row of r) {
      i++;
      console.log(row.id, row.url);
      if (i % 3 == 0) await sleep(500).then(()=>console.log('暂停3秒！'));
      if (row.url) await crawlArticles(row,page)
      .then(async row => {
        //console.log(row);
        await sqlite.run("UPDATE articles SET title=?, content=?, vip=?, video=?, category='游戏', label=?, date=?, crawled=1, md5=?  WHERE id=?",
                                            [row.title,row.content,row.vip,row.video,row.label,row.date,row.md5,row.id])
        .then(async (reslut)=>{console.log(reslut);await sleep(50);})
        })
      .catch(error => console.log('error: ', error.message));;
     }
    sqlite.close();
    if ( runId?true:false ) await browser.close();
}
main();

