(()=>{
  const timeline=document.querySelector('.timeline-disclosure');
  if(timeline){
    function reveal(id){
      const target=document.getElementById(id);
      if(!target||!target.matches('.agent-branch,.agent-heading'))return;
      for(let node=target;node;node=node.parentElement)if(node.tagName==='DETAILS')node.open=true;
      target.scrollIntoView({block:'nearest'});
      (target.querySelector('summary')||target).focus({preventScroll:true});
    }
    document.querySelectorAll('.agent-reference').forEach(link=>link.addEventListener('click',event=>{
      event.preventDefault();reveal(link.getAttribute('href').slice(1));
    }));
    document.querySelectorAll('.agent-clock[data-full-end]').forEach(clock=>{
      const grid=clock.querySelector('.clock-grid');
      const buttons=[...clock.querySelectorAll('[data-clock-window]')];
      const readout=clock.querySelector('.clock-readout');
      let start=Number(clock.dataset.focusStart),end=Number(clock.dataset.focusEnd);
      const stamp=value=>{const seconds=Math.floor(value/1000);return '+'+String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0')};
      function windowTo(mode){
        start=mode==='full'?0:Number(clock.dataset.focusStart);
        end=Number(mode==='full'?clock.dataset.fullEnd:clock.dataset.focusEnd);
        const position=value=>100*(value-start)/(end-start);
        clock.dataset.window=mode;
        buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.clockWindow===mode)));
        clock.querySelectorAll('.clock-ticks span').forEach((tick,i)=>tick.textContent=stamp(start+(end-start)*i/4));
        clock.querySelectorAll('[data-clock-ms]').forEach(mark=>{
          const value=Number(mark.dataset.clockMs);
          mark.hidden=value<start||value>end;
          mark.style.left=position(value)+'%';
        });
        clock.querySelectorAll('.clock-span').forEach(span=>{
          const a=Number(span.dataset.start),b=Number(span.dataset.end);
          span.hidden=b<start||a>end;
          span.style.left=position(Math.max(start,a))+'%';
          span.style.width=Math.max(0,position(Math.min(end,b))-position(Math.max(start,a)))+'%';
        });
        grid.classList.remove('scanning');readout.textContent='';
      }
      buttons.forEach(button=>button.addEventListener('click',()=>windowTo(button.dataset.clockWindow)));
      grid.addEventListener('pointermove',event=>{
        const axis=clock.querySelector('.clock-ticks').getBoundingClientRect();
        const x=event.clientX-axis.left;
        if(x<0||x>axis.width||event.target.closest('.clock-label,.clock-axis-label')){grid.classList.remove('scanning');readout.textContent='';return}
        grid.classList.add('scanning');
        clock.querySelector('.clock-scan').style.left=(event.clientX-grid.getBoundingClientRect().left)+'px';
        readout.textContent=stamp(start+(end-start)*x/axis.width);
      });
      grid.addEventListener('pointerleave',()=>{grid.classList.remove('scanning');readout.textContent=''});
    });
    if(location.hash.startsWith('#agent-'))reveal(location.hash.slice(1));
    return;
  }
  const panels=[...document.querySelectorAll('.board-panel')];
  const tabs=[...document.querySelectorAll('[data-board]')];
  function showBoard(id){
    panels.forEach(p=>p.hidden=p.id!==id);
    tabs.forEach(t=>t.setAttribute('aria-pressed',String(t.dataset.board===id)));
  }
  tabs.forEach(t=>t.addEventListener('click',()=>showBoard(t.dataset.board)));
  showBoard('board-overview');
  function sortValue(row,column){
    const cell=row.cells[column];
    const value=cell.dataset.sortValue??cell.dataset.ratio;
    return value===''?null:Number(value);
  }
  function sortBoard(table){
    const headers=[...table.tHead.rows[0].cells];
    if(headers[Number(table.dataset.sortColumn)].hidden){
      table.dataset.sortColumn='3';
      table.dataset.sortDirection='descending';
    }
    const column=Number(table.dataset.sortColumn),direction=table.dataset.sortDirection;
    const body=table.tBodies[0];
    const rows=[...body.rows];
    rows.filter(r=>r.dataset.agent!=='reference').sort((a,b)=>{
      const av=sortValue(a,column),bv=sortValue(b,column);
      if(av===null&&bv!==null)return 1;
      if(bv===null&&av!==null)return -1;
      return (av===null?0:(direction==='descending'?bv-av:av-bv))||Number(a.dataset.order)-Number(b.dataset.order);
    }).forEach((row,i)=>{
      row.querySelector('.rank').textContent=sortValue(row,column)===null?'—':String(i+1).padStart(2,'0');
      body.append(row);
    });
    body.append(rows.find(r=>r.dataset.agent==='reference'));
    headers.forEach((header,i)=>{
      const button=header.querySelector('.sort-button');
      if(!button)return;
      const active=i===column,next=active&&direction==='descending'?'ascending':'descending';
      header.setAttribute('aria-sort',active?direction:'none');
      button.setAttribute('aria-pressed',String(active));
      button.setAttribute('aria-label',`${button.dataset.label}: sort ${next}`);
      button.title=`Sort by ${button.dataset.label}, ${next}`;
      button.querySelector('.sort-arrow').textContent=active?(direction==='descending'?'↓':'↑'):'↕';
    });
  }
  document.querySelectorAll('.leaderboard-table').forEach(table=>{
    table.dataset.sortColumn='3';
    table.dataset.sortDirection='descending';
    [...table.tBodies[0].rows].forEach((row,i)=>row.dataset.order=String(i));
    [...table.tHead.rows[0].cells].slice(2).forEach(header=>{
      const detail=header.querySelector('small');
      if(detail)detail.remove();
      const button=document.createElement('button');
      button.type='button';
      button.className='sort-button';
      button.dataset.label=header.textContent.trim();
      button.append(...header.childNodes);
      const arrow=document.createElement('span');
      arrow.className='sort-arrow';
      arrow.setAttribute('aria-hidden','true');
      button.append(arrow);
      header.append(button);
      if(detail)header.append(detail);
      button.addEventListener('click',()=>{
        const column=String(header.cellIndex);
        table.dataset.sortDirection=table.dataset.sortColumn===column&&table.dataset.sortDirection==='descending'?'ascending':'descending';
        table.dataset.sortColumn=column;
        sortBoard(table);
      });
    });
    sortBoard(table);
  });
  const overview=document.getElementById('board-overview');
  const taskHeaders=[...overview.querySelectorAll('th[data-task]')];
  const matrixRows=[...overview.querySelectorAll('tbody tr')];
  const taskFilters=[...overview.querySelectorAll('input[type=checkbox]')];
  function selectedFilters(container){
    const selected={};
    container.querySelectorAll('[data-filter-count]').forEach(counter=>{
      const group=[...counter.closest('details').querySelectorAll('input[type=checkbox]')];
      const values=new Set(group.filter(f=>f.checked).map(f=>f.value));
      selected[counter.dataset.filterCount]=values;
      counter.textContent=`${values.size}/${group.length}`;
    });
    return selected;
  }
  document.addEventListener('click',event=>{
    document.querySelectorAll('.multi-filter[open]').forEach(filter=>{
      if(!filter.contains(event.target))filter.open=false;
    });
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape')document.querySelectorAll('.multi-filter[open]').forEach(filter=>{
      filter.open=false;
      filter.querySelector('summary').focus();
    });
  });
  document.querySelectorAll('[data-selection]').forEach(button=>button.addEventListener('click',()=>{
    const inputs=[...button.closest('fieldset').querySelectorAll('input[type=checkbox]')];
    inputs.forEach(input=>input.checked=button.dataset.selection==='all');
    inputs[0].dispatchEvent(new Event('change',{bubbles:true}));
  }));
  function updateOverview(){
    const selected=selectedFilters(overview);
    const visible=taskHeaders.filter(h=>selected.stage.has(h.dataset.stage)&&selected.scope.has(h.dataset.scope));
    const codes=new Set(visible.map(h=>h.dataset.task));
    taskHeaders.forEach(h=>h.hidden=!codes.has(h.dataset.task));
    matrixRows.forEach(row=>{
      const values=[];
      row.querySelectorAll('td[data-task]').forEach(cell=>{
        cell.hidden=!codes.has(cell.dataset.task);
        if(!cell.hidden&&cell.dataset.ratio!=='')values.push(Number(cell.dataset.ratio));
      });
      const gm=values.length?Math.exp(values.reduce((sum,x)=>sum+Math.log(x),0)/values.length):null;
      row.querySelector('.overview-valid').textContent=`${values.length}/${visible.length}`;
      row.querySelector('.overview-gm').textContent=gm===null?'—':`${gm.toFixed(2)}×`;
      row.querySelector('.overview-valid').dataset.sortValue=visible.length?String(values.length):'';
      row.querySelector('.overview-gm').dataset.sortValue=gm??'';
    });
    sortBoard(overview.querySelector('table'));
    overview.querySelector('table').style.setProperty('--visible-tasks',visible.length);
    document.getElementById('overview-count').textContent=`${visible.length} of ${taskHeaders.length} tasks`;
    document.getElementById('overview-empty').hidden=visible.length!==0;
  }
  taskFilters.forEach(f=>f.addEventListener('change',updateOverview));
  document.getElementById('overview-reset').addEventListener('click',()=>{
    taskFilters.forEach(f=>f.checked=true);
    updateOverview();
  });
  updateOverview();
  const rows=[...document.querySelectorAll('#run-rows tr')];
  const runFilters=document.getElementById('run-filters');
  const choices=[...runFilters.querySelectorAll('input[type=checkbox]')];
  const search=document.getElementById('run-search');
  const count=document.getElementById('run-count');
  const more=document.getElementById('show-more');
  const moreRow=document.getElementById('show-more-row');
  const empty=document.getElementById('empty-state');
  const params=new URLSearchParams(location.search);
  let limit=24;
  for(const kind of ['domain','scope','agent','outcome']){
    const group=choices.filter(f=>f.name===`runs-${kind}`);
    if(group.some(f=>f.value===params.get(kind)))group.forEach(f=>f.checked=f.value===params.get(kind));
  }
  function update(){
    const selected=selectedFilters(runFilters);
    const q=search.value.trim().toLowerCase();
    const matches=rows.filter(r=>['domain','scope','agent','outcome'].every(kind=>selected[kind].has(r.dataset[kind]))
      &&r.dataset.search.includes(q));
    rows.forEach(r=>r.hidden=true);
    matches.slice(0,limit).forEach(r=>r.hidden=false);
    count.textContent=`Showing ${Math.min(limit,matches.length)} of ${matches.length} runs`;
    moreRow.hidden=matches.length<=limit;
    more.textContent=`Show more runs (${Math.max(0,Math.min(24,matches.length-limit))} next) ↓`;
    empty.hidden=matches.length!==0;
  }
  search.addEventListener('input',()=>{limit=24;update()});
  choices.forEach(el=>el.addEventListener('change',()=>{limit=24;update()}));
  document.getElementById('run-reset').addEventListener('click',()=>{
    choices.forEach(f=>f.checked=true);
    search.value='';
    limit=24;
    update();
  });
  more.addEventListener('click',()=>{limit+=24;update()});
  update();
})();
