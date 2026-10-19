// DEBUG SCRIPT - Run BEFORE opening company
console.log("=== BEFORE OPEN ===");
const storeBefore = window.useStore?.getState?.();
const companyBefore = storeBefore?.companies?.find(c => c.name === 'Acme');
console.log("Company status BEFORE:", companyBefore?.workflowStatus);
console.log("Full company data:", companyBefore);
