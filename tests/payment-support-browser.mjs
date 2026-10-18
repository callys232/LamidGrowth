import assert from 'node:assert/strict';
import {expect} from '@playwright/test';
import {auditHarness} from './full-ui-harness.mjs';
const h=await auditHarness({});
try{
  const seed=await h.session('Founder','team');await seed.go('/os');
  const source=structuredClone(seed.snapshots.get('Founder:team').data.state);await seed.context.close();
  const item={id:'payment-fixture',kind:'funding',payment_status:'awaiting_provider',amount_minor:10000,currency:'NGN',provider_reference:'fixture-reference',review_status:null,note:null,assigned_to:null,provider_status:null,version:0},mutations=[];
  for(const operator of [false,true]){
    const s=await h.session('Founder','team',true),p=s.page;p.setDefaultTimeout(10000);
    const state={...source,user:{...source.user,id:operator?'operator':'owner',email:operator?'operator@example.test':'owner@example.test',demo:false,ecosystemAdmin:operator}};
    await s.context.route('**/api/**',async route=>{
      const request=route.request(),path=new URL(request.url()).pathname,body=request.method()==='GET'?null:request.postDataJSON();let data=[];
      if(path==='/api/auth/session')data={user:state.user,workspace:state.workspace};
      else if(path==='/api/state')data=state;
      else if(path==='/api/onboarding/user-guide/claim')data={showGuide:false};
      else if(path==='/api/finance/points')data={balance:0,unitPriceMinor:10,currency:'USD',totalPurchasedPoints:0,totalPurchasedMinor:0,recentLedger:[]};
      else if(path==='/api/finance/overview')data={escrow:{heldMinor:0,releasedMinor:0,refundedMinor:0,pendingMinor:10000,items:[]},transfers:[],billing:{lineItems:[],totalMinor:0,currency:'USD'}};
      else if(path==='/api/finance/payment-reviews')data={operator,items:[item]};
      else if(path.endsWith('/report')){mutations.push({path,body});Object.assign(item,{review_status:'open',note:body.note,version:1});data={ok:true};}
      else if(path.endsWith('/verify')){mutations.push({path,body});Object.assign(item,{review_status:'resolved',payment_status:'held',version:3});data={reconciled:true,message:'Provider-confirmed status applied. No new payment was sent.'};}
      else if(path.includes('/payment-reviews/')&&request.method()==='PATCH'){mutations.push({path,body});Object.assign(item,{review_status:body.status,note:body.note,assigned_to:'operator',version:2});data={ok:true};}
      await route.fulfill({json:data});
    });
    try{
      await s.go('/os/finance');await expect(p.getByRole('heading',{name:'Payment support and reconciliation',exact:true})).toBeVisible();
      await p.getByLabel('Case note (visible to the workspace owner)',{exact:true}).fill(operator?'Checked the reference and requested provider confirmation.':'My payment status has not updated after checkout.');
      if(!operator){
        assert.equal(await p.getByRole('button',{name:'Verify provider and reconcile',exact:true}).count(),0);
        await p.getByRole('button',{name:'Report payment issue',exact:true}).click();await expect(p.getByRole('button',{name:'Report payment issue',exact:true})).toBeDisabled();
      }else{
        await p.getByLabel('Case status',{exact:true}).selectOption('investigating');
        await p.getByRole('button',{name:'Save investigation',exact:true}).click();
        await expect(p.getByText(/An investigator has taken responsibility/)).toBeVisible();
        await p.getByRole('button',{name:'Verify provider and reconcile',exact:true}).click();
        await expect(p.getByText('Provider-confirmed status applied. No new payment was sent.',{exact:true})).toBeVisible();
      }
      assert.deepEqual(s.errors,[]);
    }catch(error){console.error(await p.locator('body').innerText());console.error(s.errors);throw error;}finally{await s.context.close();}
  }
  assert.equal(mutations.length,3);assert.equal(mutations[1].body.version,1);assert.equal(mutations[2].body.version,2);assert.equal(mutations[2].body.operation,'charge');
  console.log('Owner support report, operator assignment/note, versioned verification UI passed. API/provider responses are fixtures; real service authorization is tested separately.');
}finally{await h.close();}
