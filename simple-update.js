// SIMPLE UPDATE SCRIPT - Run this in browser console (F12)
// This updates the company directly via Zustand store

console.log("🔧 UPDATING COMPANY WORKFLOW STATUS...");

// Access the Zustand store from window
// First, let's make it accessible
const storeScript = document.createElement('script');
storeScript.textContent = `
    (async () => {
        // Get the store
        const { useStore } = await import('/src/store/useStore.ts');
        
        // Get current state
        const state = useStore.getState();
        
        console.log("📊 Current companies:", state.companies);
        
        // Find Acme
        const acme = state.companies.find(c => c.name === 'Acme');
        
        if (!acme) {
            console.error("❌ Company 'Acme' not found");
            return;
        }
        
        console.log("Found Acme:", acme);
        console.log("Current workflow status:", acme.workflowStatus);
        
        // Update the company
        state.updateCompany(acme.id, {
            workflowStatus: 'validation_pending'
        });
        
        console.log("✅ Updated Acme to validation_pending");
        
        // Verify
        const updated = useStore.getState().companies.find(c => c.id === acme.id);
        console.log("New workflow status:", updated.workflowStatus);
        
        console.log("\\n🔄 Reloading page...");
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    })();
`;
document.head.appendChild(storeScript);
