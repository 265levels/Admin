// ================= MOBILE NAVIGATION =================
function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('hidden');
    sidebar.classList.toggle('flex');
}

// Special switch tab function that closes the menu on mobile after clicking
function switchTabMobile(tabId) {
    switchTab(tabId); // Call original function
    if (window.innerWidth < 1024) { // 1024px is the Tailwind 'lg' breakpoint
        toggleMenu();
    }
}

// 1. FIREBASE CONFIGURATION (Linked to levels-ecommerce)
const firebaseConfig = {
  apiKey: "AIzaSyCPUBkJzJhLUVD0qXMg2_tyvsZ9ZxtfWuc",
  authDomain: "levels-ecommerce.firebaseapp.com",
  projectId: "levels-ecommerce",
  storageBucket: "levels-ecommerce.firebasestorage.app",
  messagingSenderId: "637669858543",
  appId: "1:637669858543:web:9f61dafba8842416f58f1a",
  measurementId: "G-RQJSBPTWC9"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ================= NAVIGATION =================
function switchTab(tabId) {
    document.querySelectorAll(".tab-content").forEach(t => t.classList.add("hidden"));
    document.getElementById(tabId).classList.remove("hidden");
}

// ================= OVERVIEW MONITORS =================
function updateOverviewStats() {
    // Live Pending Images
    db.collection("products").where("status", "==", "pending")
        .onSnapshot(snap => {
            document.getElementById('counter-pending-images').innerText = snap.size;
        });

    // Live Queue Transactions
    db.collection("transactions").where("status", "==", "pending")
        .onSnapshot(snap => {
            document.getElementById('counter-queue-transactions').innerText = snap.size;
        });

    // Live Failed Transactions
    db.collection("transactions").where("status", "==", "failed")
        .onSnapshot(snap => {
            document.getElementById('counter-failed-transactions').innerText = snap.size;
        });
}


// ================= CLIENT SEARCH & RENDERING =================
async function searchClients() {
    const type = document.getElementById("search-type").value;
    const value = document.getElementById("client-search-input").value.trim();
    const container = document.getElementById("clients-list");

    if (!value) return alert("Please enter a search term");
    container.innerHTML = "<p class='text-zinc-500'>Searching...</p>";

    try {
        let query;
        if (type === "transactionId") {
            // Step 1: Find transaction
            const transSnap = await db.collection("transactions").where("transactionId", "==", value).get();
            if (transSnap.empty) {
                container.innerHTML = "<p class='text-red-400'>No transaction found with that ID.</p>";
                return;
            }
            // Step 2: Get user via email linked to transaction
            const buyerEmail = transSnap.docs[0].data().buyerEmail;
            query = db.collection("users").where("email", "==", buyerEmail);
        } else {
            // Search by email or phone directly
            query = db.collection("users").where(type, "==", value);
        }

        const snap = await query.get();
        renderClients(snap);
    } catch (e) {
        console.error(e);
        container.innerHTML = "<p class='text-red-500'>Error executing search.</p>";
    }
}

function renderClients(snap) {
    const container = document.getElementById("clients-list");
    if (snap.empty) {
        container.innerHTML = "<p class='p-4 text-zinc-500'>No clients found.</p>";
        return;
    }
    container.innerHTML = "";
    snap.forEach(doc => {
        const u = doc.data();
        container.innerHTML += `
            <div class="card flex justify-between items-center border border-zinc-800">
                <div>
                    <p class="font-bold text-lg">${u.name || 'Anonymous'}</p>
                    <div class="flex gap-4 text-sm text-zinc-400">
                        <span>📧 ${u.email || 'N/A'}</span>
                        <span>📞 ${u.phone || 'N/A'}</span>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="blockUser('${doc.id}')" class="btn-outline text-red-500 border-red-900 hover:bg-red-950">Block</button>
                </div>
            </div>`;
    });
}

async function loadClients() {
    try {
        const snap = await db.collection("users").limit(20).get();
        renderClients(snap);
        document.getElementById('total-users').innerText = snap.size;
    } catch (e) { console.error("Error loading users:", e); }
}

// ================= TRANSACTIONS =================
async function loadTransactions() {
    try {
        const snap = await db.collection("transactions").orderBy("createdAt", "desc").limit(15).get();
        const container = document.getElementById("transactions-list");
        container.innerHTML = "";
        snap.forEach(doc => {
            const t = doc.data();
            container.innerHTML += `
                <div class="card flex justify-between items-center border-l-4 ${t.status === 'paid' ? 'border-green-600' : 'border-zinc-700'}">
                    <div>
                        <p class="font-bold">${t.buyerName || 'Buyer'}</p>
                        <p class="text-xs text-zinc-500">ID: ${t.transactionId || doc.id}</p>
                    </div>
                    <span class="text-green-500 font-bold">MWK ${t.amount || 0}</span>
                </div>`;
        });
    } catch (e) { console.log("Transactions missing or empty."); }
}

// ================= IMAGE APPROVAL =================
async function loadImages() {
    try {
        const snap = await db.collection("products").where("status", "==", "pending").get();
        const container = document.getElementById("image-queue");
        container.innerHTML = snap.empty ? "<p class='text-zinc-500'>All caught up!</p>" : "";
        snap.forEach(doc => {
            const p = doc.data();
            container.innerHTML += `
                <div class="card border border-zinc-800">
                    <p class="mb-3 font-bold text-lg">${p.title}</p>
                    <div class="flex flex-wrap gap-2 mb-4">
                        ${p.images?.map(img => `<img src="${img}" class="w-24 h-24 object-cover rounded-lg"/>`).join("")}
                    </div>
                    <div class="flex gap-3">
                        <button onclick="updateProductStatus('${doc.id}','approved')" class="flex-1 btn-outline text-green-500 border-green-900 hover:bg-green-950">Approve</button>
                        <button onclick="updateProductStatus('${doc.id}','rejected')" class="flex-1 btn-outline text-red-500 border-red-900 hover:bg-red-950">Reject</button>
                    </div>
                </div>`;
        });
    } catch (e) { console.error(e); }
}

async function updateProductStatus(id, status) {
    await db.collection("products").doc(id).update({ status });
    alert("Product " + status);
    loadImages();
}

// ================= ACTIONS =================
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

// STARTUP
loadClients();
loadTransactions();
loadImages();
updateOverviewStats(); 
