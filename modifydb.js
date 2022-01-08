const fs = require("fs")
const crypto = require('crypto');
const sqlite = require('./asqlite3.js')
const puppeteer = require('puppeteer')
const core = require('@actions/core')
const github = require('@actions/github')
const { tFormat, sleep, clearBrowser, getRndInteger, randomOne, randomString, md5, findFrame } = require('./common.js')
const { changeContent,cutString, filterContent } = require('./utils.js');
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
  let content = row.content
  let video = ''
  fs.writeFileSync('./title.html',content )
  ({content,video} = filterContent(content))
  fs.writeFileSync('./title2.html',content )
 row.video = row.video?row.video:video
 row.content = content
  //row.vip = row.vip.replace('天赠品链接','赠品链接')
  //console.log (row.title,row.vip,row.md5,row.video)
  //fs.writeFileSync('./title2.html', row.content)
  return row
  //return Promise.reject(new Error('调试退出'))
}
async function  main () {
    console.log(await sqlite.open('./ssv.db'))
    console.log(`*****************开始crawlArticles ${Date()}*******************\n`);  
    //let sql = "SELECT * FROM freeok WHERE level IS NULL  and (level_end_time < datetime('now') or level_end_time IS NULL);"
    //let sql = "select * from articles where video = '' limit 1;"
    let sql = "select * from articles where content like '%ckplayer%' "
    let r = await sqlite.all(sql, []);
    let i = 0;
    console.log(`共有${r.length}个文章要爬取`);
    for (let row of r) {
      i++;
      console.log(row.id, row.url);
      //if (i % 3 == 0) await sleep(10).then(()=>console.log('暂停3秒！'));
      if (row.url) await crawlArticles(row,'page')
      .then(async row => {
        //console.log(row);
        await sqlite.run("UPDATE articles SET content=?, video=?, posted=0  WHERE id=?",
                                            [row.content,row.video,row.id])
        .then(async (reslut)=>{console.log(reslut);})
        })
      .catch(error => console.log('error: ', error.message));;
     }
    sqlite.close();
    if ( runId?true:false ) await browser.close();
}
main();

