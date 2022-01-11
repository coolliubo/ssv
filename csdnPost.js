const fs = require("fs")
const crypto = require('crypto');
//const sqlite = require('./asqlite3.js')
const puppeteer = require('puppeteer')
const core = require('@actions/core')
const github = require('@actions/github')
/* const puppeteer = require('puppeteer-extra');
// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin()); */
const { tFormat, sleep, clearBrowser, getRndInteger, randomOne, randomString, md5, waitForString, findFrames  } = require('./common.js')
const { changeContent, cutStrin, filterContent } = require('./utils.js')
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

async function postArticles(row, page) {
    await page.goto('https://mp.csdn.net/mp_blog/creation/editor', { timeout: 60000 })
    await sleep(3000)
    await page.waitForSelector('#txtTitle', { timeout: 15000 })
    //await page.evaluate((selecter, text) => document.querySelector(selecter).value = text, '#txtTitle', row.title)
    await page.type('#txtTitle',row.title)
    await sleep(200)
    //await findFrames(page)
    const frame = ( await page.mainFrame().childFrames() )[0];//通过索引得到我的iframe
    let content = row.content + `<br>原文地址:<a href="${row.url_kxnn}">${row.title}</a>`
    //await page.type('#title',row.title)
    //await page.$eval('#title', el => el.value = row.title) //出错，不能使用node环境中的变量 
    //await page.$eval('#content', el => el.value = row.content+'<p>[rihide]</p>'+row.vip+'<p>[/rihide]</p>')
    await frame.evaluate((selecter, text) => document.querySelector(selecter).innerHTML = text, 'body > p', content)
    let selecter =''
    selecter = '#moreDiv > div:nth-child(5) > div > label.el-radio.originalRadio > span.el-radio__input > span' //文章类型
    await page.evaluate((selecter) => document.querySelector(selecter).click(), selecter)
    await sleep(200)
    //await page.click("#moreDiv > div.el-form-item.mb8.mt16.is-required.is-no-asterisk > div > div > label:nth-child(3) > span.el-radio__input")  //封面
    selecter = '#moreDiv > div.el-form-item.mb8.mt16.is-required.is-no-asterisk > div > div > label:nth-child(3) > span.el-radio__input' //封面
    await page.evaluate((selecter) => document.querySelector(selecter).click(), selecter)
    await sleep(200)
    selecter = '#moreDiv > div.el-form-item.mb8.mt16.form-item-flex.is-no-asterisk > div > div > div > button' //标签
    await page.evaluate((selecter) => document.querySelector(selecter).click(), selecter)
    await sleep(200)
    await page.evaluate((selecter) => document.querySelector(selecter).click(), '#pane-0 > span:nth-child(2)')
    await sleep(200)
    await page.evaluate((selecter) => document.querySelector(selecter).click(), '#moreDiv > div.el-form-item.publish-opt-box.is-no-asterisk > div > div > div.btn-box > button.el-button.btn-outline-danger.ml16.el-button--primary.is-round')
    console.log('click:#publish')
    await waitForString(page, '#alertSuccess > div > div.pos-top > div.text-center.status-box > div', 'https://blog.csdn.net/eroslp/article/details', 30000)
        .catch(async (error) => {
            console.log('再次点击')
            await page.click('#moreDiv > div.el-form-item.publish-opt-box.is-no-asterisk > div > div > div.btn-box > button.el-button.btn-outline-danger.ml16.el-button--primary.is-round')
            await waitForString(page, '#alertSuccess > div > div.pos-top > div.text-center.status-box > div', 'https://blog.csdn.net/eroslp/article/details', 30000)
        })
    await sleep(100)
    //return Promise.reject(new Error('临时退出'))
    return row
}
async function main() {
    browser = await puppeteer.launch({
        headless: runId ? true : false,
        //headless: true,
        args: ['--window-size=1920,1080'],
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
    let cookies = []
    cookies = JSON.parse(fs.readFileSync('./csdn.json', 'utf8'))
    await page.setCookie(...cookies)
    console.log("写入cookies")
    await page.goto('https://mp.csdn.net/', { timeout: 60000 })
    //await page.click('body > header > div > ul.nav-right > li.nav-login.no > a.signin-loader > span')
/*     await page.waitForSelector('body > div.passport-container > div > div.passport-main > div.login-box > div.login-box-top > div.login-box-tabs > div.login-box-tabs-items > span:nth-child(4)', { timeout: 15000 })
    await sleep(200)
    page.click('body > div.passport-container > div > div.passport-main > div.login-box > div.login-box-top > div.login-box-tabs > div.login-box-tabs-items > span:nth-child(4)')
    await sleep(200)
    await page.type('body > div.passport-container > div > div.passport-main > div.login-box > div.login-box-top > div > div.login-box-tabs-main > div > div:nth-child(1) > div > input', setup.usr.csdn)
    await page.type('body > div.passport-container > div > div.passport-main > div.login-box > div.login-box-top > div > div.login-box-tabs-main > div > div:nth-child(2) > div > input', setup.pwd.csdn)
    //await page.evaluate((selecter,text) => document.querySelector(selecter).value=text,'#user_login',setup.usr.kxnn)
    //await page.evaluate((selecter,text) => document.querySelector(selecter).value=text,'#user_pass',setup.pwd.kxnn)
    await sleep(200)
    //return Promise.reject(new Error('临时退出'))
    await Promise.all([
        page.waitForNavigation({ timeout: 60000 }),
        //等待页面跳转完成，一般点击某个按钮需要跳转时，都需要等待 page.waitForNavigation() 执行完毕才表示跳转成功
        page.click('body > div.passport-container > div > div.passport-main > div.login-box > div.login-box-top > div > div.login-box-tabs-main > div > div:nth-child(4) > button'),
    ])
        .then(() => console.log('登录成功'))
    await sleep(300) */
    //return
    cookies = await page.cookies();
    fs.writeFileSync('./csdn.json', JSON.stringify(cookies, null, '\t'))
    //return Promise.reject(new Error('调试退出'))
    console.log(`*****************开始postArticles ${Date()}*******************\n`)
    //let sql = "SELECT * FROM freeok WHERE level IS NULL  and (level_end_time < datetime('now') or level_end_time IS NULL);"
    let sql = "SELECT * FROM articles WHERE csdn = 0 and posted = 1  order by  date asc limit 8;"
    //let sql = "SELECT * FROM articles WHERE posted = 1 limit 1;"
    let r = await pool.query(sql)
    let i = 0
    console.log(`共有${r[0].length}个文章要发布`)
    for (let row of r[0]) {
        i++
        console.log(i, row.url)
        if (i % 3 == 0) await sleep(3000).then(() => console.log('暂停3秒！'))
        if (row.url) await postArticles(row, page)
            .then(async row => {
                let sql, arr
                sql = 'UPDATE articles SET  csdn=1 WHERE id=?'
                arr = [row.id]
                sql = await pool.format(sql, arr)
                //console.log(row);
                await pool.query(sql)
                    .then(async (result) => { console.log('changedRows', result[0].changedRows);await sleep(30000); })
                    .catch(async (error) => { console.log('UPDATEerror: ', error.message);await sleep(3000); })
            })
            .catch(error => console.log('error: ', error.message))
    }
    await pool.end()
    if (runId ? true : false) await browser.close()
    //await browser.close()
}
main();