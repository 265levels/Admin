const firebaseConfig = {
  apiKey: "AIzaSyCPUBkJzJhLUVD0qXMg2_tyvsZ9ZxtfWuc",
  authDomain: "levels-ecommerce.firebaseapp.com",
  projectId: "levels-ecommerce",
  storageBucket: "levels-ecommerce.firebasestorage.app",
  messagingSenderId: "637669858543",
  appId: "1:637669858543:web:9f61dafba8842416f58f1a",
  measurementId: "G-RQJSBPTWC9"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

function switchTab(tabId) {
    document.querySelectorAll(".tab-content").forEach(t => t.classList.add("hidden"));
    document.getElementById(tabId).classList.remove("hidden");
}

async function loadClients() {
    try {
        const snap = await db.collection("users").get();
        const container = document.getElementById("clients-list");
        container.innerHTML = "";
        snap.forEach(doc => {
            const u = doc.data();
            container.innerHTML += `
                <div class="card flex justify-between items-center">
                    <div>
                        <p class="font-bold">${u.name || 'Anonymous'}</p>
                        <p class="text-sm text-zinc-400">${u.email}</p>
                    </div>
                    <button onclick="blockUser('${doc.id}')" class="btn-outline text-red-500 border-red-900">Block</button>
                </div>`;
        });
        document.getElementById('total-users').innerText = snap.size;
    } catch (e) { console.error("Error loading clients:", e); }
}

async function loadTransactions() {
    try {
        const snap = await db.collection("transactions").orderBy("createdAt", "desc").limit(15).get();
        const container = document.getElementById("transactions-list");
        container.innerHTML = "";
        snap.forEach(doc => {
            const t = doc.data();
            container.innerHTML += `
                <div class="card flex justify-between items-center border-l-4 ${t.status === 'paid' ? 'border-green-600' : 'border-zinc-700'}">
                    <span>${t.buyerName || 'Order'}</span>
                    <span class="text-green-500 font-bold font-mono">MWK ${t.amount}</span>
                </div>`;
        });
    } catch (e) { console.log("No transactions found."); }
}

async function loadImages() {
    try {
        const snap = await db.collection("products").where("status", "==", "pending").get();
        const container = document.getElementById("image-queue");
        container.innerHTML = snap.empty ? "<p class='text-zinc-500'>Queue clear!</p>" : "";
        snap.forEach(doc => {
            const p = doc.data();
            container.innerHTML += `
                <div class="card">
                    <p class="mb-3 font-bold text-lg">${p.title}</p>
                    <div class="flex flex-wrap gap-2 mb-4">
                        ${p.images?.map(img => `<img src="${img}" class="w-24 h-24 object-cover rounded-lg border border-zinc-700"/>`).join("")}
                    </div>
                    <div class="flex gap-3">
                        <button onclick="updateStatus('products','${doc.id}','approved')" class="flex-1 btn-outline text-green-500 border-green-900 hover:bg-green-950">Approve</button>
                        <button onclick="updateStatus('products','${doc.id}','rejected')" class="flex-1 btn-outline text-red-500 border-red-900 hover:bg-red-950">Reject</button>
                    </div>
                </div>`;
        });
    } catch (e) { console.error("Error loading images:", e); }
}

async function updateStatus(collection, id, status) {
    await db.collection(collection).doc(id).update({ status });
    alert("Updated to " + status);
    if(collection === 'products') loadImages();
}

async function blockUser(id) {
    if(!confirm("Block this user?")) return;
    await db.collection("users").doc(id).update({ status: 'blocked' });
    alert("User blocked.");
    loadClients();
}

async function sendMessage() {
    const user = document.getElementById("msg-user").value;
    const text = document.getElementById("msg-text").value;
    if(!user || !text) return alert("Fill all fields");
    await db.collection("messages").add({
        to: user, message: text, createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert("Message sent!");
    document.getElementById("msg-text").value = "";
}

// Startup
loadClients();
loadTransactions();
loadImages();
