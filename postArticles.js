const fs = require("fs")
//const crypto = require('crypto');
//const sqlite = require('./asqlite3.js')
const puppeteer = require('puppeteer')
const core = require('@actions/core')
const github = require('@actions/github')
/* const puppeteer = require('puppeteer-extra');
// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin()); */
const { tFormat, sleep, clearBrowser, getRndInteger, randomOne, randomString, md5,  waitForString } = require('./common.js')
const { changeContent,cutStrin,filterContent} = require('./utils.js')
Date.prototype.format = tFormat
const mysql = require('mysql2/promise')
const runId = github.context.runId
let browser
let setup = {}
if (!runId) {
  setup = JSON.parse(fs.readFileSync('./setup.json', 'utf8'))
} else {
  setup = JSON.parse(process.env.SETUP)
}
const pool = mysql.createPool({
  host: setup.mysql.host,
  user: setup.mysql.user,
  password: setup.mysql.password,
  port: setup.mysql.port,
  database: setup.mysql.database,
  waitForConnections: true, //连接超额是否等待
  connectionLimit: 10, //一次创建的最大连接数
  queueLimit: 0 //可以等待的连接的个数
});

async function postArticles(row,page) {
  //console.log(row.content)
  //fs.writeFileSync('./title.html',row.content )
  let update = false 
  let content = row.content
  content = content.replace(/www.cmdw.top/g,'www.kxyz.eu.org')
  //let video = ''
  //({content,video} = filterContent(content)) */
  //row.vip = row.vip.replace('天赠品链接','赠品链接')
  //fs.writeFileSync('./title2.html',row.content )
  //return Promise.reject(new Error('调试退出'))
  if (row.url_kxnn){
    update = true
    let id = row.url_kxnn.slice(row.url_kxnn.lastIndexOf('/')+1,row.url_kxnn.lastIndexOf('.'))
    //console.log(id,`https://www.kxnn.xyz/wp-admin/post.php?post=${id}&action=edit`)
    await page.goto(`https://www.kxyz.eu.org/wp-admin/post.php?post=${id}&action=edit`, { timeout: 60000 })
  } else {
    await page.goto('https://www.kxyz.eu.org/wp-admin/post-new.php', { timeout: 60000 })
  }
  //return Promise.reject(new Error('临时退出'))
  await page.waitForSelector('#title', { timeout: 15000 })
  await sleep(200)
  //await page.type('#title',row.title)
  //await page.$eval('#title', el => el.value = row.title) //出错，不能使用node环境中的变量
  await page.evaluate((selecter,text) => document.querySelector(selecter).value=text,'#title',row.title)
  await page.evaluate((selecter) => document.querySelector(selecter).click(),'#content-html')
  //await page.$eval('#content', el => el.value = '')
  await sleep(100)
  //await page.$eval('#content', el => el.value = row.content+'<p>[rihide]</p>'+row.vip+'<p>[/rihide]</p>')
  if (row.vip)  content = content + '<p>[rihide]</p>'+row.vip+'<p>[/rihide]</p>'
  //if (row.video) content = `[mine_video type="mp4" vid="${row.video}"][/mine_video]`+content
  await page.evaluate((selecter,text) => document.querySelector(selecter).value=text,'#content',content)
  //await page.type('#content',row.content+'<p>[rihide]</p>'+row.vip+'<p>[/rihide]</p>')
  await page.evaluate((selecter,text) => document.querySelector(selecter).value=text,'div#_cao_post_options > div:nth-of-type(2) > div > div > div > div > div > div > div:nth-of-type(2) > input',"3")
  await page.evaluate((selecter,text) => document.querySelector(selecter).value=text,'div#_cao_post_options > div:nth-of-type(2) > div > div > div > div > div > div:nth-of-type(2) > div:nth-of-type(2) > input',"0")
  await sleep(200)
  await page.evaluate((selecter) => document.querySelector(selecter).checked=true,'#in-category-4')
  await sleep(200)
  await page.type('#new-tag-post_tag',row.label)
  await sleep(200)
  await page.click('div#post_tag > div > div:nth-of-type(2) > input:nth-of-type(2)')
  await sleep(100)
  await page.evaluate((selecter) => document.querySelector(selecter).checked=true,'#_cao_post_options > div.inside > div > div > div.csf-content > div > div > div:nth-child(5) > div.csf-fieldset > label > input.csf--checkbox')
  await sleep(200)

  //return Promise.reject(new Error('临时退出'))
  //await page.click('#publish')
  await page.evaluate((selecter) => document.querySelector(selecter).click(),'#publish')
  console.log('click:#publish')
  await waitForString(page,'#message > p','查看文章',30000)
   .catch(async (error)=>{
    console.log('再次点击')
    await page.click('#publish')
    await waitForString(page,'#message > p','查看文章',30000)
  }) 
  await sleep(100)
  await page.waitForSelector('#sample-permalink', { visible:true,  timeout: 15000 })
  if (!row.url_kxnn) row.url_kxnn = await page.$eval('#sample-permalink', el => el.href)
  //return Promise.reject(new Error('临时退出'))
  return row
}
async function  main () {
    //console.log(await sqlite.open('./ssv.db'))
    browser = await puppeteer.launch({
      headless: runId ? true : false,
      //headless: true,
      args: [
        '--window-size=1920,1080',
        runId ? '' : setup.proxy.normal
      ],
      defaultViewport: null,
      ignoreHTTPSErrors: true,
    })
  //console.log(await sqlite.open('./freeok.db'))
  const page = await browser.newPage()
  //await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36')
  //await page.authenticate({username:setup.proxy.usr, password:setup.proxy.pwd});
  page.on('dialog', async dialog => {
    //console.info(`➞ ${dialog.message()}`);
    await dialog.dismiss();
  })
    await page.goto('https://www.kxyz.eu.org/wp-login.php', { timeout: 60000 })
    //await page.click('body > header > div > ul.nav-right > li.nav-login.no > a.signin-loader > span')
    await page.waitForSelector('#user_login', { timeout: 15000 })
    await sleep(200)
    //await page.type('#user_login', setup.usr.kxnn)
    //await page.type('#user_pass', setup.pwd.kxnn)
    await page.evaluate((selecter,text) => document.querySelector(selecter).value=text,'#user_login',setup.usr.kxnn)
    await page.evaluate((selecter,text) => document.querySelector(selecter).value=text,'#user_pass',setup.pwd.kxnn)
    await sleep(200)
    //return Promise.reject(new Error('临时退出'))
    await Promise.all([
      page.waitForNavigation({timeout: 60000}), 
      //等待页面跳转完成，一般点击某个按钮需要跳转时，都需要等待 page.waitForNavigation() 执行完毕才表示跳转成功
      page.click('#wp-submit'),    
    ])
    .then(()=>console.log ('登录成功'))
    await sleep(300)
    console.log(`*****************开始postArticles ${Date()}*******************\n`)
    //let sql = "SELECT * FROM freeok WHERE level IS NULL  and (level_end_time < datetime('now') or level_end_time IS NULL);"
    let sql = "SELECT * FROM articles WHERE title is not null and posted is null  order by  date asc limit 10 ;"
    //let sql = "SELECT * FROM articles WHERE posted = 1 limit 1;"
  let r = await pool.query(sql)
    let i = 0
    console.log(`共有${r[0].length}个文章要发布`)
    for (let row of r[0]) {
      i++
      console.log(i, row.url)
      if (i % 3 == 0) await sleep(500).then(()=>console.log('暂停3秒！'))
      if (row.url) await postArticles(row,page)
      .then(async row => {
        let sql, arr
        sql = 'UPDATE articles SET  content=?, posted=1, url_kxnn=?  WHERE id=?'
        arr = [row.content,row.url_kxnn,row.id]
        sql = await pool.format(sql, arr)
        //console.log(row);
        await pool.query(sql)
          .then((result) => { console.log('changedRows', result[0].changedRows);sleep(3000); })
          .catch((error) => { console.log('UPDATEerror: ', error.message);sleep(3000); })
        })
      .catch(error => console.error('error: ', error.message))
     }
  await pool.end()
  if (runId ? true : false) await browser.close()
    //await browser.close()
}
main();