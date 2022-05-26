const fs = require("fs")
const sqlite = require('./asqlite3.js')
const puppeteer = require('puppeteer');
const core = require('@actions/core');
const github = require('@actions/github');
const { tFormat, sleep, clearBrowser, getRndInteger, randomOne, randomString, findFrames, findFrame } = require('./common.js');
Date.prototype.format = tFormat;
const runId = github.context.runId;
let browser;
let setup = {};
if (!runId) {
  setup = JSON.parse(fs.readFileSync('./setup.json', 'utf8'));
} else {
  setup = JSON.parse(process.env.SETUP);
}

async function main() {
  console.log(await sqlite.open('./ssv.db'))
  const browser = await puppeteer.launch({
    headless: runId ? true : false,
    args: ['--window-size=1920,1080'],
    defaultViewport: null,
    ignoreHTTPSErrors: true,
  });
  const page = await browser.newPage();
  await page.goto('https://ayxj.xyz/all/', { timeout: 60000 });
  //let content = await page.$eval('body > div.main > div.container > div > div > div:nth-child(1)',e=>e.innerHTML);
  //console.log(content);
  const links = await page.$$eval('body > div.main > div.container  a',
    (links) => links.map((link) => link.href));
  console.log(links.length);
  for (let link of links) {
    let r = await sqlite.run("INSERT OR IGNORE INTO articles( url ) VALUES (?)", [link])
    //if (r) console.log(r)
  }
  //console.log(link);
//if (runId ? true : false) await browser.close();
await browser.close();
}
main();

