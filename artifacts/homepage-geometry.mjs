import { chromium } from 'playwright';
const browser = await chromium.launch({channel:'msedge'});
const page = await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
await page.goto('http://127.0.0.1:3107', {waitUntil:'networkidle'});
console.log(await page.locator('.lamid-home > *').evaluateAll(elements => elements.map(e=>({name:e.className,height:e.getBoundingClientRect().height}))));
await browser.close();
