// DIAGNOSTIC SCRIPT - Run this in browser console (F12)
// This will show you what data is in localStorage vs SQLite

console.log("=== DIAGNOSTIC: Data Persistence Issue ===");

// 1. Check localStorage
const localStorageData = localStorage.getItem('safesite-storage');
if (localStorageData) {
    const parsed = JSON.parse(localStorageData);
    console.log("\n📦 localStorage Data:");
    console.log("- Total companies:", parsed.state?.companies?.length || 0);

    const companies = parsed.state?.companies || [];
    companies.forEach(c => {
        console.log(`  • ${c.name}: status=${c.status}, workflow=${c.workflowStatus}`);
    });

    console.log("\nFirst 3 companies detail:");
    console.log(companies.slice(0, 3));
} else {
    console.log("❌ No localStorage data found");
}

// 2. Check SQLite (via store)
console.log("\n💾 Current Zustand State:");
const store = window.useStore?.getState();
if (store) {
    console.log("- Total companies:", store.companies?.length || 0);

    store.companies?.forEach(c => {
        console.log(`  • ${c.name}: status=${c.status}, workflow=${c.workflowStatus}`);
    });

    console.log("\nFirst 3 companies detail:");
    console.log(store.companies?.slice(0, 3));
} else {
    console.log("❌ Store not accessible");
}

// 3. Check if initialized
console.log("\n🔧 Initialization Status:");
console.log("- isInitialized:", store?.isInitialized);

console.log("\n=== END DIAGNOSTIC ===");
console.log("\nℹ️ Compare the data above:");
console.log("1. Are companies the same in localStorage and Zustand?");
console.log("2. Which one has the correct workflowStatus?");
console.log("3. Are archived companies showing in either?");
