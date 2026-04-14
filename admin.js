// ================= TAB SWITCHING =================
function switchTab(tab) {
    document.querySelectorAll(".tab").forEach(t => t.classList.add("hidden"));
    document.getElementById(tab).classList.remove("hidden");
}

// ================= FIREBASE INIT =================
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ================= LOAD CLIENTS =================
async function loadClients() {
    const snap = await db.collection("users").get();
    const container = document.getElementById("clients-list");
    container.innerHTML = "";

    snap.forEach(doc => {
        const u = doc.data();

        container.innerHTML += `
        <div class="card">
            <p>👤 ${u.name || "No Name"}</p>
            <p>📧 ${u.email}</p>
            <p>📍 ${u.location || "Unknown"}</p>

            <button onclick="blockUser('${doc.id}')" class="btn">Block</button>
            <button onclick="viewClient('${doc.id}')" class="btn">View</button>
        </div>
        `;
    });
}

// ================= LOAD TRANSACTIONS =================
async function loadTransactions() {
    const snap = await db.collection("transactions").orderBy("createdAt","desc").get();
    const container = document.getElementById("transactions-list");
    container.innerHTML = "";

    snap.forEach(doc => {
        const t = doc.data();

        container.innerHTML += `
        <div class="card">
            <p>💳 ${t.transactionId}</p>
            <p>👤 Buyer: ${t.buyerName}</p>
            <p>🏪 Seller: ${t.sellerName}</p>
            <p>💰 MWK ${t.amount}</p>
            <p>📡 Status: ${t.status}</p>

            <button onclick="updateStatus('${doc.id}','paid')" class="btn">Mark Paid</button>
            <button onclick="updateStatus('${doc.id}','failed')" class="btn">Fail</button>
        </div>
        `;
    });
}

// ================= IMAGE APPROVAL =================
async function loadImages() {
    const snap = await db.collection("products").where("status","==","pending").get();
    const container = document.getElementById("image-queue");
    container.innerHTML = "";

    snap.forEach(doc => {
        const p = doc.data();

        container.innerHTML += `
        <div class="card">
            <p>📦 ${p.title}</p>

            <div class="flex gap-2">
                ${p.images.map(img => `<img src="${img}" width="80"/>`).join("")}
            </div>

            <button onclick="approve('${doc.id}')" class="btn">Approve</button>
            <button onclick="reject('${doc.id}')" class="btn">Reject</button>
        </div>
        `;
    });
}

// ================= BLOCK USER =================
async function blockUser(id) {
    await db.collection("users").doc(id).update({
        status: "blocked"
    });
    alert("User blocked");
    loadClients();
}

// ================= TRANSACTION UPDATE =================
async function updateStatus(id, status) {
    await db.collection("transactions").doc(id).update({
        status
    });
    loadTransactions();
}

// ================= MESSAGE SYSTEM =================
async function sendMessage() {
    const user = document.getElementById("msg-user").value;
    const text = document.getElementById("msg-text").value;

    await db.collection("messages").add({
        to: user,
        message: text,
        createdAt: new Date()
    });

    alert("Message sent");
}

// ================= INITIAL LOAD =================
loadClients();
loadTransactions();
loadImages();
