/* Page-to-page handoff stays in this tab; no birthday in a URL or request. */
(()=>{
  const key='smy-page-handoff-v03',byId=id=>document.getElementById(id);
  document.querySelectorAll('[data-open-full]').forEach(link=>link.addEventListener('click',()=>{
    const fields={};for(const id of ['date-a','date-b','name-a','name-b','message','hide-year']){const field=byId(id);if(field)fields[id]=field.type==='checkbox'?field.checked:field.value;}
    try{sessionStorage.setItem(key,JSON.stringify({created:Date.now(),fields}));}catch{}
  }));
  if(byId('report-form')){
    let saved;try{saved=JSON.parse(sessionStorage.getItem(key)||'null');sessionStorage.removeItem(key);}catch{}
    if(saved&&Date.now()-saved.created<300000){
      for(const [id,value]of Object.entries(saved.fields||{})){const field=byId(id);if(field){if(field.type==='checkbox')field.checked=Boolean(value);else if(typeof value==='string')field.value=value;}}
      window.MoonDateFields?.refresh();if(byId('date-a').value&&byId('date-b').value){byId('carried-birthdays').hidden=false;byId('generate-report').click();}
    }
  }
})();
