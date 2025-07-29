function getSettings(){
  const defaults = {
    fuelCost: 3.50,
    laborRate: 30,
    truckMPG: 10,
    equipRates: { hydro: 100, skid: 80, excav: 120, custom: 90 },
    waterTruckFee: 200,
    profitMargin: { hydro: 15, skid: 15, excav: 15, custom: 15 },
    markupPrefs: { enabled: false, laborMarkup: 0, materialsMarkup: 0, overheadFlat: 0 },
    mulchCost: 140,
    tackifierCost: 16.67,
    dyeCost: 35,
    hydroFuelPerTank: 2,
    numEmployees: 3
  };
  const s = localStorage.getItem('quoteSettings');
  if(s) try { return JSON.parse(s); } catch {}
  return defaults;
}
function saveSettings(settings){
  localStorage.setItem('quoteSettings', JSON.stringify(settings));
}
function calculateQuote(settings, equipmentKey, hours, distance, attachments, customFuelPerHr){
  hours = Math.max(0,hours); distance = Math.max(0,distance);
  const fuelGallons = customFuelPerHr!=null
    ? customFuelPerHr * hours
    : (distance / settings.truckMPG);
  const fuelCost = fuelGallons * settings.fuelCost;
  const laborCost = hours * settings.laborRate;
  const equipRate = customFuelPerHr!=null
    ? settings.equipRates.custom
    : settings.equipRates[equipmentKey]||0;
  const equipmentCost = hours * equipRate;
  const waterTruck = distance>0 && settings.waterTruckFee ? settings.waterTruckFee : 0;
  const attachTotal = attachments.reduce((s,a)=>s + (parseFloat(a.cost)||0),0);
  const base = fuelCost + laborCost + equipmentCost + waterTruck + attachTotal;
  let total, profit=0;
  if(settings.markupPrefs.enabled){
    const laborM = laborCost * (1 + settings.markupPrefs.laborMarkup/100);
    const matCosts = fuelCost + equipmentCost + waterTruck + attachTotal;
    const matM = matCosts * (1 + settings.markupPrefs.materialsMarkup/100);
    total = laborM + matM + settings.markupPrefs.overheadFlat;
    profit = total - base;
  } else {
    const margin = settings.profitMargin[equipmentKey]/100;
    total = base * (1 + margin);
    profit = total - base;
  }
  return { fuelCost, laborCost, equipmentCost, waterTruck, attachTotal, subtotalBase: base, total, profit };
}
function addAttachmentOption(container){
  const row=document.createElement('div'); row.className='attachment-row';
  const name=document.createElement('input'); name.type='text'; name.placeholder='Attachment name';
  const cost=document.createElement('input'); cost.type='number'; cost.placeholder='Cost'; cost.step='0.01';
  row.appendChild(name); row.appendChild(cost); container.appendChild(row);
}
function setupSettingsPage(){
  const s=getSettings();
  document.getElementById('fuelCost').value=s.fuelCost;
  document.getElementById('laborRate').value=s.laborRate;
  document.getElementById('truckMPG').value=s.truckMPG;
  document.getElementById('waterTruckFee').value=s.waterTruckFee;
  document.getElementById('equipHydro').value=s.equipRates.hydro;
  document.getElementById('equipSkid').value=s.equipRates.skid;
  document.getElementById('equipExcav').value=s.equipRates.excav;
  document.getElementById('equipCustomRate').value=s.equipRates.custom;
  document.getElementById('profitHydro').value=s.profitMargin.hydro;
  document.getElementById('profitSkid').value=s.profitMargin.skid;
  document.getElementById('profitExcav').value=s.profitMargin.excav;
  document.getElementById('profitCustom').value=s.profitMargin.custom;
  document.getElementById('useMarkup').checked=s.markupPrefs.enabled;
  toggleMarkupFields(s.markupPrefs.enabled);
  document.getElementById('laborMarkup').value=s.markupPrefs.laborMarkup;
  document.getElementById('materialsMarkup').value=s.markupPrefs.materialsMarkup;
  document.getElementById('overheadFlat').value=s.markupPrefs.overheadFlat;
  document.getElementById('useMarkup').addEventListener('change', e=>toggleMarkupFields(e.target.checked));
  document.getElementById('saveSettings').addEventListener('click', ()=>{
    const newS = {
      fuelCost:parseFloat(document.getElementById('fuelCost').value)||0,
      laborRate:parseFloat(document.getElementById('laborRate').value)||0,
      truckMPG:parseFloat(document.getElementById('truckMPG').value)||1,
      waterTruckFee:parseFloat(document.getElementById('waterTruckFee').value)||0,
      equipRates:{
        hydro:parseFloat(document.getElementById('equipHydro').value)||0,
        skid:parseFloat(document.getElementById('equipSkid').value)||0,
        excav:parseFloat(document.getElementById('equipExcav').value)||0,
        custom:parseFloat(document.getElementById('equipCustomRate').value)||0
      },
      profitMargin:{
        hydro:parseFloat(document.getElementById('profitHydro').value)||0,
        skid:parseFloat(document.getElementById('profitSkid').value)||0,
        excav:parseFloat(document.getElementById('profitExcav').value)||0,
        custom:parseFloat(document.getElementById('profitCustom').value)||0
      },
      markupPrefs:{
        enabled:document.getElementById('useMarkup').checked,
        laborMarkup: parseFloat(document.getElementById('laborMarkup').value)||0,
        materialsMarkup: parseFloat(document.getElementById('materialsMarkup').value)||0,
        overheadFlat: parseFloat(document.getElementById('overheadFlat').value)||0
      }
    };
    saveSettings(newS); alert('Settings saved.');
  });
}
function toggleMarkupFields(show){
  document.getElementById('markupFields').style.display = show?'block':'none';
}
function setupEquipmentPage(){
  const settings = getSettings();
  const incl = document.getElementById('includeAttachments');
  const container=document.getElementById('attachmentsContainer');
  const addBtn=document.getElementById('addAttachment');
  const calcBtn=document.getElementById('calculate');
  const summary=document.getElementById('summary');
  const equipKey=document.body.dataset.equip;
  const useMarkupCB=document.getElementById('useMarkup');
  const daysIn=document.getElementById('days');
  const crewsIn=document.getElementById('crews');
  const dailyHIn=document.getElementById('dailyHours');

  toggleMarkupFields(useMarkupCB.checked);
  useMarkupCB.addEventListener('change', ()=>toggleMarkupFields(useMarkupCB.checked));
  addBtn.addEventListener('click', ()=>addAttachmentOption(container));

  calcBtn.addEventListener('click', ()=>{
    const days=parseFloat(daysIn.value)||1;
    const crews=parseFloat(crewsIn.value)||1;
    const daily=parseFloat(dailyHIn.value)||0;
    const hours=days*crews*daily;
    const distance=parseFloat(document.getElementById('distance').value)||0;
    let customFuelPerHr=null;
    if(equipKey==='custom'){
      customFuelPerHr = parseFloat(document.getElementById('customFuelPerHr').value)||0;
    }
    const attachs=[];
    if(incl.checked){
      container.querySelectorAll('.attachment-row').forEach(r=>{
        attachs.push({name:r.children[0].value, cost:r.children[1].value});
      });
    }
    const res=calculateQuote(settings, equipKey, hours, distance, attachs, customFuelPerHr);
    summary.innerHTML = `
      <div>Total Hours: ${hours.toFixed(1)}</div>
      <div>Fuel Cost: $${res.fuelCost.toFixed(2)}</div>
      <div>Labor Cost: $${res.laborCost.toFixed(2)}</div>
      <div>Equipment Cost: $${res.equipmentCost.toFixed(2)}</div>
      ${res.waterTruck?`<div>Water Truck Fee: $${res.waterTruck.toFixed(2)}</div>`:''}
      <div>Attachments: $${res.attachTotal.toFixed(2)}</div>
      <hr>
      <div>Subtotal: $${res.subtotalBase.toFixed(2)}</div>
      <div><strong>Total: $${res.total.toFixed(2)}</strong></div>
      <div>Profit / Markup Gain: $${res.profit.toFixed(2)}</div>
    `;
  });
}
function setupDarkMode(){
  const btn=document.querySelector('.toggle-mode');
  const cur=localStorage.getItem('theme')||'light';
  document.documentElement.setAttribute('data-theme', cur);
  btn.addEventListener('click', ()=>{
    const nxt= document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';
    document.documentElement.setAttribute('data-theme', nxt);
    localStorage.setItem('theme', nxt);
  });
}
document.addEventListener('DOMContentLoaded', ()=>{
  setupDarkMode();
  if(document.getElementById('settingsForm')) setupSettingsPage();
  if(document.getElementById('calculate')) setupEquipmentPage();
});
