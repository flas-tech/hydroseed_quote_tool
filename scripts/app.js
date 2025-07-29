// Shared utility functions and default settings

function getSettings() {
  return {
    fuelCost: parseFloat(localStorage.getItem("fuelCost") || 4.25),
    laborRate: parseFloat(localStorage.getItem("laborRate") || 25),
    truckMPG: parseFloat(localStorage.getItem("truckMPG") || 10),
    equipmentHourlyRate: parseFloat(localStorage.getItem("equipmentHourlyRate") || 85),
    waterTruckFee: parseFloat(localStorage.getItem("waterTruckFee") || 150),
    defaultProfit: parseFloat(localStorage.getItem("defaultProfit") || 20) / 100
  };
}

function addAttachmentOption(containerId) {
  const container = document.getElementById(containerId);
  const div = document.createElement("div");
  div.innerHTML = `
    <input type="text" placeholder="Attachment name" class="attachment-name" />
    <input type="number" placeholder="Cost ($)" class="attachment-cost" />
  `;
  container.appendChild(div);
}

function calculateQuote(hours, distance, useAttachments, attachments) {
  const s = getSettings();

  const fuelCost = (distance / s.truckMPG) * s.fuelCost;
  const laborCost = hours * s.laborRate;
  const equipmentCost = hours * s.equipmentHourlyRate;

  let attachmentCost = 0;
  if (useAttachments && attachments.length > 0) {
    attachmentCost = attachments.reduce((sum, a) => sum + (parseFloat(a.cost) || 0), 0);
  }

  const subtotal = fuelCost + laborCost + equipmentCost + attachmentCost;
  const total = subtotal * (1 + s.defaultProfit);
  const profit = total - subtotal;

  return {
    subtotal: subtotal.toFixed(2),
    total: total.toFixed(2),
    profit: profit.toFixed(2)
  };
}
