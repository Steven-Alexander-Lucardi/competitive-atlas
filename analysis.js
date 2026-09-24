/* Transparent calculations shared by the three Chester decision views. */
globalThis.EmpireMath = (() => {
  const defaults = {margin:30, lowDays:15, excessDays:60, nearCapacity:180, underuse:90, cssGap:10, automationGap:2};
  const ranges = {margin:[0,60],lowDays:[0,60],excessDays:[30,365],nearCapacity:[100,200],underuse:[0,100],cssGap:[1,100],automationGap:[1,9]};
  function thresholds(input={}) { const out={...defaults}; for(const k in out) if(Number.isFinite(Number(input[k]))) out[k]=Math.min(ranges[k][1],Math.max(ranges[k][0],Number(input[k])));out.excessDays=Math.max(out.excessDays,out.lowDays);return out; }
  const own = r => r.products.filter(p=>p.company==='Chester');
  const finance = (r,c,key,section='Income Statement') => r.finance[c]?.[section+'|'+key] ?? null;
  const days = p => p.unitsSold>0 ? 365*p.inventory/p.unitsSold : null;
  function plan(p,uplift=0,buffer=30,spread=20) {
    if(p.forecastBase===null || !Number.isFinite(p.forecastBase))return null;
    const demand=Math.max(0,p.forecastBase*(1+uplift/100)), inventoryTarget=demand*buffer/365;
    const required=Math.max(0,demand+inventoryTarget-p.inventory),ceiling=2*p.capacityNext;
    const feasible=Math.min(required,ceiling),available=p.inventory+feasible;
    const cases=[['Low',Math.max(0,demand*(1-spread/100))],['Base',demand],['High',demand*(1+spread/100)]].map(([name,sales])=>({name,demand:sales,ending:Math.max(0,available-sales),unserved:Math.max(0,sales-available)}));
    return {demand,inventoryTarget,required,ceiling,feasible,shortfall:Math.max(0,required-ceiling),utilization:p.capacityNext>0?100*required/p.capacityNext:null,headroom:ceiling-required,cases};
  }
  function threat(D,ri,segment) {
    const r=D.operations[ri],rows=r.markets[segment],model=D.models.slide.primary[segment].rounds[ri];
    const chester=model.nodes.map((n,i)=>n.company==='Chester'?i:-1).filter(i=>i>=0);
    const maxDistance=Math.max(...model.distances.flat(),1e-9);
    const sums=D.companies.map(c=>({company:c,css:rows.filter(p=>p.company===c).reduce((a,p)=>a+p.satisfaction,0),potential:rows.filter(p=>p.company===c).reduce((a,p)=>a+p.potentialSold,0),actual:rows.filter(p=>p.company===c).reduce((a,p)=>a+p.units,0)}));
    const maxCSS=Math.max(...sums.map(x=>x.css),1e-9),maxPotential=Math.max(...sums.map(x=>x.potential),1e-9);
    return sums.filter(x=>x.company!=='Chester').map(x=>{
      const indices=model.nodes.map((n,i)=>n.company===x.company?i:-1).filter(i=>i>=0),distances=chester.flatMap(i=>indices.map(j=>model.distances[i][j]));
      const distance=distances.length?Math.min(...distances):null,similarity=distance===null?null:1-distance/maxDistance;
      const score=similarity===null?null:40*x.css/maxCSS+35*x.potential/maxPotential+25*similarity;
      return {...x,distance,score,cssComponent:40*x.css/maxCSS,demandComponent:35*x.potential/maxPotential,similarityComponent:similarity===null?null:25*similarity};
    }).sort((a,b)=>(b.score??-1)-(a.score??-1)||a.company.localeCompare(b.company));
  }
  function overallThreat(D,ri) {
    const r=D.operations[ri],weights=D.segments.map(s=>r.markets[s].filter(p=>p.company==='Chester').reduce((sum,p)=>sum+p.units,0)),total=weights.reduce((a,b)=>a+b,0);
    return D.companies.filter(c=>c!=='Chester').map(company=>{
      const segments=D.segments.map((s,i)=>({...threat(D,ri,s).find(x=>x.company===company),segment:s,weight:total?weights[i]/total:1/5}));
      return {company,score:segments.some(s=>s.score===null)?null:segments.reduce((a,s)=>a+s.score*s.weight,0),segments,strongest:segments.slice().sort((a,b)=>(b.score??-1)-(a.score??-1))[0].segment};
    }).sort((a,b)=>(b.score??-1)-(a.score??-1)||a.company.localeCompare(b.company));
  }
  function alerts(D,ri,t=defaults) {
    const r=D.operations[ri],items=[];const f=x=>Number(x).toFixed(1);
    const add=(p,key,level,title,evidence,action,page='capacity')=>items.push({id:p.id+'-'+key,product:p.id,label:p.label,segment:p.segment,level,title,evidence,action,page,source:p.source});
    for(const p of own(r)) {
      const cover=days(p),scenario=plan(p,0,30);
      if(p.stockout)add(p,'stockout',3,'Reported stockout',`${p.label} ran out of stock in at least one reported segment. Listed potential sales exceeded listed actual sales by ${Math.round(p.potentialGap||0)} thousand units in aggregate.`,`Gengjun Intelligence should revisit the demand range and production schedule before raising demand-building spend. Use the capacity board to test supply; the potential gap is a report benchmark, not guaranteed recoverable sales.`);
      else if(p.inventory===0)add(p,'zero',2,'No ending inventory',`${p.label} ended the year with zero inventory; the segment tables do not report a stockout.`,`Gengjun Intelligence should stress-test next-round supply. Zero ending stock alone does not establish a lost sale.`);
      else if(cover!==null&&cover<t.lowDays)add(p,'thin',2,'Thin inventory buffer',`${f(cover)} days of ending inventory at the reported annual sales rate; the alert threshold is ${t.lowDays} days.`,`Gengjun Intelligence should test stronger demand against the proposed production schedule. This coverage measure is not the date of a predicted stockout.`);
      if(cover!==null&&cover>t.excessDays)add(p,'excess',2,'Inventory tying up resources',`${f(cover)} days of ending inventory exceeds the ${t.excessDays}-day review threshold.`,`Gengjun Intelligence should use existing inventory before scheduling additional production, and test a weaker-demand case before committing more cash.`);
      if(scenario?.shortfall>0)add(p,'ceiling',3,'Base scenario exceeds next-round ceiling',`The default scenario requires ${Math.round(scenario.required)}k production versus ${Math.round(scenario.ceiling)}k theoretical two-shift capacity. Includes a 30-day ending-stock target.`,`Gengjun Intelligence should adjust the demand or buffer assumptions and evaluate capacity for the following year. New capacity orders do not solve next round’s immediate shortage.`);
      else if(scenario?.utilization>=t.nearCapacity)add(p,'headroom',2,'Limited next-round headroom',`Default scenario utilization is ${f(scenario.utilization)}% of next-round first-shift capacity; review threshold ${t.nearCapacity}%.`,`Gengjun Intelligence should test upside demand and investigate material or productivity constraints before relying on the theoretical 200% ceiling.`);
      if(p.utilization<t.underuse)add(p,'idle',1,'Review underused capacity',`Reported utilization is ${f(p.utilization)}%, below the ${t.underuse}% review threshold.`,`Gengjun Intelligence should compare spare capacity with the growth scenario before selling assets. Spare capacity may be deliberate growth preparation.`);
      if(p.utilization>=t.nearCapacity)add(p,'current-headroom',2,'Reported plant near its ceiling',`Reported plant utilization is ${f(p.utilization)}%.`,`Gengjun Intelligence should examine next-round capacity and forecast sensitivity; second shift alone is not an error.`);
      if(p.margin<t.margin)add(p,'margin',p.margin<=25?3:2,'Contribution margin needs attention',`Reported contribution margin is ${f(p.margin)}%, below the ${t.margin}% review threshold.`,`Gengjun Intelligence should compare price, material cost and labor cost with rivals, then assess whether volume gains compensate for lower unit contribution.`,'review');
      const leader=Math.max(...r.markets[p.segment].map(x=>x.satisfaction)),gap=p.satisfaction===null?null:leader-p.satisfaction;
      if(gap!==null&&gap>=t.cssGap)add(p,'css',2,'Customer satisfaction gap',`Primary-segment satisfaction is ${p.satisfaction}, versus a leading product score of ${leader}; gap ${gap} points.`,`Gengjun Intelligence should compare the changed price, awareness, accessibility and revision timing in the round review. The annual report cannot isolate a single cause.`,'review');
      if(['Traditional','Low End'].includes(p.segment)){
        const leaderAuto=Math.max(...r.products.filter(x=>x.segment===p.segment).map(x=>x.automation));
        if(leaderAuto-p.automation>=t.automationGap)add(p,'automation',1,'Automation gap to review',`Next-round automation ${f(p.automation)} trails the segment maximum ${f(leaderAuto)} by ${f(leaderAuto-p.automation)} points.`,`Gengjun Intelligence should weigh potential labor savings against capital cost and slower future R&D. Matching the leader is not automatically the best choice.`);
      }
      const year=Number(String(p.revisionDate).match(/\d{4}$/)?.[0]);
      if(year>r.year)add(p,'revision',2,'Future revision on the calendar',`Reported revision date ${p.revisionDate} is after the current report year ${r.year}.`,`Gengjun Intelligence should verify project timing in Capsim before assuming the revised product will support the full next year’s demand.`,'review');
    }
    const profit=finance(r,'Chester','Net Profit'),sales=finance(r,'Chester','Sales'),sg=finance(r,'Chester','SG&A');
    if(profit<=0 || profit/sales<.01)items.push({id:'company-profit',label:'Chester',product:null,segment:'Company',level:profit<=0?3:2,title:'Thin company profitability',evidence:`Net profit is $${f(profit/1000)}m on $${f(sales/1000)}m sales. SG&A is ${f(100*sg/sales)}% of sales.`,action:'Gengjun Intelligence should inspect the profit bridge and fixed-cost growth before committing further spending. A stronger product position does not by itself fund the whole company.',page:'review',source:r.financeSources['Income Statement|Net Profit']});
    return items.sort((a,b)=>b.level-a.level||a.label.localeCompare(b.label));
  }
  function profitBridge(before,after,company='Chester') {
    const specs=[['Sales','Sales',1],['Variable costs','Total Variable Costs (Labor, Material, Carry)',-1],['Depreciation','Depreciation',-1],['SG&A','SG&A',-1],['Other costs','Other (Fees/Write-offs/Bonuses/Relocation Fee)',-1],['Interest','Interest (Short term/Long Term)',-1],['Taxes','Taxes',-1],['Profit sharing','Profit Sharing',-1]];
    const start=finance(before,company,'Net Profit'),end=finance(after,company,'Net Profit');
    const items=specs.map(([label,key,sign])=>({label,key,value:sign*(finance(after,company,key)-finance(before,company,key)),source:after.financeSources['Income Statement|'+key]}));
    const residual=end-start-items.reduce((a,x)=>a+x.value,0);if(Math.abs(residual)>1e-9)items.push({label:'Report rounding',value:residual,source:'Reported income statement reconciliation'});
    return {start,end,items,residual};
  }
  return {defaults,ranges,thresholds,own,finance,days,plan,threat,overallThreat,alerts,profitBridge};
})();
