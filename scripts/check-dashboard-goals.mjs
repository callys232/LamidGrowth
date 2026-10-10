import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch();
const goal = {id:'goal-test',title:'Original goal',description:'Existing description',context:'Individual',priority:'High',status:'Active',targetDate:'2026-12-01',constraints:'Existing constraints',success:'Existing success',version:3,createdAt:new Date().toISOString()};
const state = {user:{id:'u',name:'Test User',email:'test@example.com',demo:false},workspace:{id:'w',name:'Test workspace',context:'Individual',tier:'free',role:'owner',member_limit:1},permissions:['work:write'],workspaces:[],objectives:[goal],actions:[],reviews:[],audit:[]};
let edited, deleted, created;
try {
  const page = await browser.newPage();
  await page.route('**/api/**', async route => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if(path === '/api/state') return route.fulfill({json:state});
    if(path === '/api/objectives/goal-test' && req.method()==='PATCH') {edited=req.postDataJSON(); Object.assign(goal,edited,{version:4}); return route.fulfill({json:goal});}
    if(path === '/api/objectives/goal-test' && req.method()==='DELETE') {deleted=req.postDataJSON(); state.objectives=[]; return route.fulfill({status:204});}
    if(path === '/api/objectives' && req.method()==='POST') {created=req.postDataJSON(); return route.fulfill({json:{...created,id:'new'}});}
    return route.fulfill({json:{}});
  });
  await page.goto('http://127.0.0.1:3100/os');
  await page.getByRole('button',{name:'Edit goal: Original goal',exact:true}).click();
  const dialog=page.getByRole('dialog');
  assert.equal(await dialog.locator('[name=description]').inputValue(),goal.description);
  await dialog.locator('[name=title]').fill('updated goal');
  assert.equal(await dialog.locator('[name=title]').inputValue(),'UPDATED GOAL');
  await dialog.getByRole('button',{name:'Save changes'}).click();
  await page.waitForFunction(()=>!document.querySelector('dialog'));
  assert.equal(edited.title,'UPDATED GOAL'); assert.equal(edited.version,3); assert.equal(edited.success,'Existing success');
  await page.getByRole('button',{name:'Delete goal',exact:true}).click();
  assert.equal(deleted,undefined);
  await page.getByRole('button',{name:'Keep goal'}).click();
  assert.equal(deleted,undefined);
  await page.getByRole('button',{name:'Delete goal',exact:true}).click();
  await page.getByRole('button',{name:'Confirm delete goal',exact:true}).click();
  await page.getByRole('button',{name:'Create your first objective'}).waitFor();
  assert.equal(deleted.version,4); assert.equal(deleted.confirm,true);
  await page.getByRole('button',{name:'Create your first objective'}).click();
  await page.getByRole('dialog').locator('[name=title]').fill('new goal');
  await page.getByRole('dialog').getByRole('button',{name:'Create objective',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('dialog'));
  assert.equal(created.title,'NEW GOAL');
  console.log('PASS: uppercase create/edit, retained fields and version, deletion confirmation/cancel, refreshed cards. Mocked API; no real user goals changed.');
} finally {await browser.close();}
