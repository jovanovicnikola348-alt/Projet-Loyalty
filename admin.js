import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, increment, collection, onSnapshot, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyC0TZI_OpGJ5_-zlDY08KmYx4K9aodJRsU",
    authDomain: "project-loyalty-4a445.firebaseapp.com",
    projectId: "project-loyalty-4a445",
    storageBucket: "project-loyalty-4a445.firebasestorage.app",
    messagingSenderId: "645134286018",
    appId: "1:645134286018:web:5bf96b80d24393a2bd8f5b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const lang = navigator.language.startsWith('sr') ? 'sr' : 'fr';

// Fonction pour formater la date comme demandé : "31 janvier à 20h36"
function getNiceDate() {
    const options = { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' };
    let d = new Date().toLocaleDateString(lang === 'sr' ? 'sr-RS' : 'fr-FR', options);
    return d.replace(':', 'h').replace(',', ' à');
}

let selectedUserId = null;
let allUsers = [];

onSnapshot(collection(db, "users"), (snapshot) => {
    allUsers = [];
    const userList = document.getElementById('user-list');
    userList.innerHTML = "";
    snapshot.forEach((doc) => {
        const user = { id: doc.id, ...doc.data() };
        allUsers.push(user);
        const div = document.createElement('div');
        div.className = 'user-card';
        div.innerHTML = `<div style="display:flex; justify-content:space-between;"><span>${user.email}</span><span class="badge">${user.points}/5</span></div>`;
        div.onclick = () => openUserDetails(user.id, user);
        userList.appendChild(div);
    });
});

function openUserDetails(id, user) {
    selectedUserId = id;
    document.getElementById('modal-email').innerText = user.email;
    document.getElementById('modal-points').innerText = user.points;
    const historyDiv = document.getElementById('visit-history');
    historyDiv.innerHTML = user.history ? [...user.history].reverse().map(h => `<div class="history-item">📅 ${h}</div>`).join('') : "Aucune visite";
    document.getElementById('user-modal').style.display = 'flex';
}

async function updatePoints(change) {
    if(!selectedUserId) return;
    const userRef = doc(db, "users", selectedUserId);
    
    // Si change est "RESET", on met à 0, sinon on incrémente
    if (change === "RESET") {
        await updateDoc(userRef, { points: 0 });
    } else {
        const updates = { points: increment(change) };
        if (change > 0) updates.history = arrayUnion(getNiceDate());
        await updateDoc(userRef, updates);
    }
    
    const newDoc = await getDoc(userRef);
    openUserDetails(selectedUserId, newDoc.data());
}

document.getElementById('add-point').onclick = () => updatePoints(1);
document.getElementById('remove-point').onclick = () => updatePoints(-1);

// Gestion du bouton Reset (assure-toi que l'id est bien use-reward dans admin.html)
const btnReset = document.getElementById('use-reward');
if(btnReset) {
    btnReset.onclick = () => {
        if(confirm("Remettre les points à 0 ?")) updatePoints("RESET");
    };
}

document.getElementById('close-modal').onclick = () => document.getElementById('user-modal').style.display = 'none';
document.getElementById('user-search').oninput = (e) => {
    const search = e.target.value.toLowerCase();
    const filtered = allUsers.filter(u => u.email.toLowerCase().includes(search));
    const userList = document.getElementById('user-list');
    userList.innerHTML = "";
    filtered.forEach(user => {
        const div = document.createElement('div');
        div.className = 'user-card';
        div.innerHTML = `<div style="display:flex; justify-content:space-between;"><span>${user.email}</span><span class="badge">${user.points}/5</span></div>`;
        div.onclick = () => openUserDetails(user.id, user);
        userList.appendChild(div);
    });
};