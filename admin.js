// 1. CONFIGURATION - REPLACE WITH YOUR ACTUAL FIREBASE KEYS
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ================= TAB SWITCHING =================
function switchTab(tabId) {
    // Hide all tabs
    document.querySelectorAll(".tab-content").forEach(t => t.classList.add("hidden"));
    // Remove active style from all buttons
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("bg-zinc-800", "text-red-500"));
    
    // Show selected tab
    document.getElementById(tabId).classList.remove("hidden");
}

// ================= DATA LOADING =================
async function loadClients() {
    try {
        const snap = await db.collection("users").limit(20).get();
        const container = document.getElementById("clients-list");
        container.innerHTML = snap.empty ? "<p>No users found.</p>" : "";

        snap.forEach(doc => {
            const u = doc.data();
            container.innerHTML += `
                <div class="card flex justify-between items-center">
                    <div>
                        <p class="font-bold text-lg">${u.name || 'Anonymous'}</p>
                        <p class="text-zinc-400 text-sm">${u.email}</p>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="blockUser('${doc.id}')" class="btn-outline">Block</button>
                        <button class="btn-outline">Profile</button>
                    </div>
                </div>`;
        });
        document.getElementById('total-users').innerText = snap.size;
    } catch (err) {
        console.error("Error loading clients:", err);
    }
}

async function loadTransactions() {
    try {
        const snap = await db.collection("transactions").orderBy("createdAt", "desc").limit(10).get();
        const container = document.getElementById("transactions-list");
        container.innerHTML = "";

        snap.forEach(doc => {
            const t = doc.data();
            container.innerHTML += `
                <div class="card border-l-4 ${t.status === 'paid' ? 'border-green-500' : 'border-yellow-500'}">
                    <div class="flex justify-between">
                        <span>ID: ${doc.id.substring(0,8)}</span>
                        <span class="font-bold text-green-400">MWK ${t.amount || 0}</span>
                    </div>
                    <p class="text-sm text-zinc-400 mt-2">Status: ${t.status}</p>
                </div>`;
        });
    } catch (err) {
        console.log("Transactions collection might be empty or missing index.");
    }
}

// ================= ACTIONS =================
async function sendMessage() {
    const user = document.getElementById("msg-user").value;
    const text = document.getElementById("msg-text").value;

    if(!user || !text) return alert("Please fill all fields");

    await db.collection("messages").add({
        to: user,
        message: text,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert("Message sent successfully!");
    document.getElementById("msg-text").value = "";
}

// Initial Run
loadClients();
loadTransactions();
