// DEBUG SCRIPT - Run AFTER closing company
console.log("=== AFTER CLOSE ===");
const storeAfter = window.useStore?.getState?.();
const companyAfter = storeAfter?.companies?.find(c => c.name === 'Acme');
console.log("Company status AFTER:", companyAfter?.workflowStatus);
console.log("Full company data:", companyAfter);
