const fs = require("fs")
//const sqlite = require('./asqlite3.js')
const puppeteer = require('puppeteer');
const core = require('@actions/core');
const github = require('@actions/github');
const { tFormat, sleep, clearBrowser, getRndInteger, randomOne, randomString, findFrames, findFrame } = require('./common.js');
Date.prototype.format = tFormat;
const mysql = require('mysql2/promise')
const runId = github.context.runId;
let browser;
let setup = {};
if (!runId) {
  setup = JSON.parse(fs.readFileSync('./setup.json', 'utf8'));
} else {
  setup = JSON.parse(process.env.SETUP);
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
async function main() {
  browser = await puppeteer.launch({
    headless: runId ? true : false,
    args: [
      '--window-size=1920,1080',
      runId ? '' : setup.proxy.normal
    ],
    defaultViewport: null,
    ignoreHTTPSErrors: true,
  });
  const page = await browser.newPage();
  await page.goto('https://ayxj.xyz/', { timeout: 60000 });
  //let content = await page.$eval('body > div.main > div.container > div > div > div:nth-child(1)',e=>e.innerHTML);
  //console.log(content);
  const links = await page.$$eval('#posts  a',
    (links) => links.map((link) => link.href));
  console.log(links.length);
  for (let link of links) {
    //console.log(link);
    let r = await pool.query("INSERT IGNORE INTO articles( url ) VALUES (?)", [link])
    //if (r) console.log(r)
  }
  
await pool.end();
if (runId ? true : false) await browser.close()
}
main();

