// 1. CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyCPUBkJzJhLUVD0qXMg2_tyvsZ9ZxtfWuc",
  authDomain: "levels-ecommerce.firebaseapp.com",
  projectId: "levels-ecommerce",
  storageBucket: "levels-ecommerce.firebasestorage.app",
  messagingSenderId: "637669858543",
  appId: "1:637669858543:web:9f61dafba8842416f58f1a",
  measurementId: "G-RQJSBPTWC9"
};

// Initialize
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ================= TAB SWITCHING =================
function switchTab(tabId) {
    document.querySelectorAll(".tab-content").forEach(t => t.classList.add("hidden"));
    document.getElementById(tabId).classList.remove("hidden");
}

// ================= LOAD DATA =================
async function loadClients() {
    try {
        const snap = await db.collection("users").get();
        const container = document.getElementById("clients-list");
        container.innerHTML = "";
        snap.forEach(doc => {
            const u = doc.data();
            container.innerHTML += `
                <div class="card flex justify-between items-center">
                    <div><p class="font-bold">${u.name || 'No Name'}</p><p class="text-sm text-zinc-400">${u.email}</p></div>
                    <button onclick="blockUser('${doc.id}')" class="btn-outline text-red-500">Block</button>
                </div>`;
        });
        document.getElementById('total-users').innerText = snap.size;
    } catch (e) { console.error(e); }
}

async function loadTransactions() {
    try {
        const snap = await db.collection("transactions").orderBy("createdAt", "desc").limit(10).get();
        const container = document.getElementById("transactions-list");
        container.innerHTML = "";
        snap.forEach(doc => {
            const t = doc.data();
            container.innerHTML += `
                <div class="card flex justify-between">
                    <span>${t.buyerName || 'Order'}</span>
                    <span class="text-green-500 font-bold">MWK ${t.amount}</span>
                </div>`;
        });
    } catch (e) { console.log("Transactions table empty."); }
}

async function loadImages() {
    try {
        const snap = await db.collection("products").where("status", "==", "pending").get();
        const container = document.getElementById("image-queue");
        container.innerHTML = snap.empty ? "<p>No images pending.</p>" : "";
        snap.forEach(doc => {
            const p = doc.data();
            container.innerHTML += `
                <div class="card">
                    <p class="mb-2 font-bold">${p.title}</p>
                    <div class="flex gap-2 mb-4">${p.images?.map(img => `<img src="${img}" class="w-20 h-20 object-cover rounded"/>`).join("")}</div>
                    <div class="flex gap-2">
                        <button onclick="updateStatus('products','${doc.id}','approved')" class="btn-outline text-green-500">Approve</button>
                        <button onclick="updateStatus('products','${doc.id}','rejected')" class="btn-outline text-red-500">Reject</button>
                    </div>
                </div>`;
        });
    } catch (e) { console.error(e); }
}

// ================= ACTIONS =================
async function updateStatus(collection, id, status) {
    await db.collection(collection).doc(id).update({ status });
    alert("Updated to " + status);
    if(collection === 'products') loadImages();
}

async function blockUser(id) {
    if(!confirm("Block this user?")) return;
    await db.collection("users").doc(id).update({ status: 'blocked' });
    loadClients();
}

async function sendMessage() {
    const user = document.getElementById("msg-user").value;
    const text = document.getElementById("msg-text").value;
    await db.collection("messages").add({
        to: user, message: text, createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert("Sent!");
}

// Start
loadClients();
loadTransactions();
loadImages();
