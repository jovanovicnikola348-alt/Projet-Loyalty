import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, updateDoc, increment, collection, onSnapshot, arrayUnion, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"; 

// --- CONFIGURATION ---
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
const auth = getAuth(app); 

let selectedUserId = null;
let allUsers = []; 
const lang = navigator.language.startsWith('sr') ? 'sr' : 'fr';
const translations = {
    fr: { subtitle: "Gestion Salon", search: "Chercher client...", add: "Point ajouté !", gift: "Cadeau !" },
    sr: { subtitle: "Upravljanje salonom", search: "Traži klijenta...", add: "Poen dodat !", gift: "Poklon !" }
};

// Fonction pour formater la date : "31 janvier à 20h36"
function getNiceDate() {
    const options = { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' };
    let d = new Date().toLocaleDateString(lang === 'sr' ? 'sr-RS' : 'fr-FR', options);
    return d.replace(':', 'h').replace(',', ' à');
}

// --- NORMALIZATION CONFIG ---
const RESET_DAYS = 33;

// Parse localized history entries (fr/sr) into ms since epoch (copied from app.js)
function parseHistoryEntryToMillis(text) {
    if (!text || typeof text !== 'string') return null;
    const d1 = new Date(text);
    if (!isNaN(d1.getTime())) return d1.getTime();
    const lower = text.toLowerCase();
    const now = new Date();
    const currentYear = now.getFullYear();
    const frMonths = { 'janvier':0, 'février':1, 'fevrier':1, 'mars':2, 'avril':3, 'mai':4, 'juin':5, 'juillet':6, 'août':7, 'aout':7, 'septembre':8, 'octobre':9, 'novembre':10, 'décembre':11, 'decembre':11 };
    const srMonths = { 'januar':0, 'februar':1, 'mart':2, 'april':3, 'maj':4, 'juni':5, 'jul':6, 'avgust':7, 'septembar':8, 'oktobar':9, 'novembar':10, 'decembar':11 };
    const frRegex = /([0-9]{1,2})\s+([a-zéûôàç]+)\s*(?:à| )\s*([0-9]{1,2})[:h]([0-9]{2})/i;
    const mfr = lower.match(frRegex);
    if (mfr) {
        const day = parseInt(mfr[1],10);
        const mon = frMonths[mfr[2]];
        const hour = parseInt(mfr[3],10);
        const min = parseInt(mfr[4],10);
        if (!isNaN(mon)) {
            let dt = new Date(currentYear, mon, day, hour, min);
            if (dt.getTime() - now.getTime() > 180*24*60*60*1000) dt.setFullYear(currentYear -1);
            return dt.getTime();
        }
    }
    const srRegex = /([0-9]{1,2})\.?\s*([a-zćčž]{3,})\s*(?:u|\s)\s*([0-9]{1,2})[:h]([0-9]{2})/i;
    const msr = lower.match(srRegex);
    if (msr) {
        const day = parseInt(msr[1],10);
        const mon = srMonths[msr[2]];
        const hour = parseInt(msr[3],10);
        const min = parseInt(msr[4],10);
        if (!isNaN(mon)) {
            let dt = new Date(currentYear, mon, day, hour, min);
            if (dt.getTime() - now.getTime() > 180*24*60*60*1000) dt.setFullYear(currentYear -1);
            return dt.getTime();
        }
    }
    return null;
}

function formatIsoToNice(iso) {
    if (!iso) return '—';
    try { const d = new Date(iso); return d.toLocaleString(lang === 'sr' ? 'sr-RS' : 'fr-FR', { day:'numeric', month:'long', hour:'2-digit', minute:'2-digit' }).replace(':','h').replace(',', ' à'); } catch(e) { return iso; }
}

async function normalizeUserDates(user) {
    if (!user || !user.id) return { updated: false };
    if (!(user.points > 0)) return { updated: false };
    try {
        let inferred = null;
        if (user.periodEndDate) {
            const pe = new Date(user.periodEndDate);
            if (!isNaN(pe.getTime())) {
                inferred = new Date(pe.getTime() - RESET_DAYS * 24 * 60 * 60 * 1000);
            }
        }
        if (!inferred && Array.isArray(user.history) && user.history.length > 0) {
            const parsed = user.history.map(h => parseHistoryEntryToMillis(h)).filter(t => t && !isNaN(t));
            if (parsed.length > 0) inferred = new Date(Math.min(...parsed));
        }
        if (inferred && !user.firstPointDate) {
            const periodEnd = new Date(inferred.getTime() + RESET_DAYS * 24 * 60 * 60 * 1000);
            const userRef = doc(db, 'users', user.id);
            await updateDoc(userRef, { firstPointDate: inferred.toISOString(), periodEndDate: periodEnd.toISOString() });
            return { updated: true, firstPointDate: inferred.toISOString(), periodEndDate: periodEnd.toISOString() };
        }
        // also normalize if firstPointDate exists but periodEndDate wrong
        if (user.firstPointDate) {
            const fp = new Date(user.firstPointDate);
            if (!isNaN(fp.getTime())) {
                const expectedEnd = new Date(fp.getTime() + RESET_DAYS * 24 * 60 * 60 * 1000);
                const currEnd = user.periodEndDate ? new Date(user.periodEndDate) : null;
                const diff = currEnd ? Math.abs(currEnd.getTime() - expectedEnd.getTime()) : Infinity;
                if (!currEnd || diff > 60*1000) {
                    const userRef = doc(db, 'users', user.id);
                    await updateDoc(userRef, { periodEndDate: expectedEnd.toISOString() });
                    return { updated: true, firstPointDate: user.firstPointDate, periodEndDate: expectedEnd.toISOString() };
                }
            }
        }
        return { updated: false };
    } catch (e) {
        console.error('normalizeUserDates error', e);
        return { updated: false, err: e };
    }
}


// --- DÉMARRAGE SÉCURISÉ DU CODE (Règle le bug "Cannot set properties of null") ---
document.addEventListener('DOMContentLoaded', () => {

    document.getElementById('admin-subtitle').innerText = translations[lang].subtitle;
    document.getElementById('user-search').placeholder = translations[lang].search;

    // --- CHARGER LA LISTE DES UTILISATEURS EN TEMPS RÉEL ---
    onSnapshot(collection(db, "users"), (snapshot) => {
        allUsers = [];
        snapshot.forEach((doc) => {
            allUsers.push({ id: doc.id, ...doc.data() });
        });
        renderUserList(allUsers);
    });

    // --- FONCTIONS INTERACTIVES (Elles utilisent les éléments HTML) ---

    function renderUserList(users) {
        const userList = document.getElementById('user-list');
        userList.innerHTML = "";
        
        users.forEach((user) => {
            const div = document.createElement('div');
            div.className = 'user-card';
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span>${user.email}</span>
                    <span class="badge">${user.points}/5</span>
                </div>
            `;
            div.onclick = () => openUserDetails(user.id, user);
            userList.appendChild(div);
        });
    }

    function openUserDetails(id, user) {
        selectedUserId = id;
        document.getElementById('modal-email').innerText = user.email;
        document.getElementById('modal-points').innerText = user.points;
        
        const historyDiv = document.getElementById('visit-history');
        historyDiv.innerHTML = user.history ? [...user.history].reverse().map(h => `<div class="history-item">📅 ${h}</div>`).join('') : "Aucune visite";

        // Show firstPointDate & periodEndDate in modal
        document.getElementById('modal-first-point').innerText = user.firstPointDate ? formatIsoToNice(user.firstPointDate) : '—';
        document.getElementById('modal-period-end').innerText = user.periodEndDate ? formatIsoToNice(user.periodEndDate) : '—';
        
        document.getElementById('user-modal').style.display = 'flex';
    }

    async function updatePoints(change) {
        if(!selectedUserId) return;
        const userRef = doc(db, "users", selectedUserId);
        const userSnap = await getDoc(userRef);
        
        const currentData = userSnap.data();
        if (change === "RESET") {
            await updateDoc(userRef, { points: 0, history: [], periodEndDate: null });
        } else {
            const updates = { points: increment(change) };
            if (change > 0) {
                updates.history = arrayUnion(getNiceDate());
                if (currentData.points === 0) {
                    const nowIso = new Date().toISOString();
                    const endDate = new Date(Date.now() + 33 * 24 * 60 * 60 * 1000);
                    updates.periodEndDate = endDate.toISOString();
                    updates.firstPointDate = nowIso; // set firstPointDate when first point is added
                }
            }
            await updateDoc(userRef, updates);
        }
        
        const newDoc = await getDoc(userRef);
        openUserDetails(selectedUserId, newDoc.data());
        
        // LOGIQUE : Reset Automatique après 5 points
        if (newDoc.data().points >= 5 && change > 0) {
            if (confirm(translations[lang].confirmGift)) {
                 await updateDoc(userRef, { points: 0, history: [], periodEndDate: null });
                 alert(translations[lang].resetDone);
            }
        }
    }
    
    function stopScanner() {
        if(html5QrCode.isScanning) {
            html5QrCode.stop().then(() => {
                document.getElementById('admin-main').style.display = 'block';
                document.getElementById('scanner-view').style.display = 'none';
            }).catch(() => {
                document.getElementById('admin-main').style.display = 'block';
                document.getElementById('scanner-view').style.display = 'none';
            });
        } else {
            document.getElementById('admin-main').style.display = 'block';
            document.getElementById('scanner-view').style.display = 'none';
        }
    }

    // --- ÉCOUTEURS D'ÉVÉNEMENTS (DANS LE DOMContentLoaded) ---

    // Réinitialisation & Suppression
    document.getElementById('add-point').onclick = () => updatePoints(1);
    document.getElementById('remove-point').onclick = () => updatePoints(-1);
    document.getElementById('use-reward').onclick = () => {
        if(confirm("Confirmer le reset des points à 0 ?")) updatePoints("RESET");
    };
    document.getElementById('close-modal').onclick = () => document.getElementById('user-modal').style.display = 'none';

    // Edit dates button
    const editDatesBtn = document.getElementById('edit-dates-btn');
    if (editDatesBtn) editDatesBtn.onclick = async () => {
        if (!selectedUserId) return; 
        const userRef = doc(db, 'users', selectedUserId);
        const userSnap = await getDoc(userRef);
        const user = userSnap.data();
        const currentFp = user && user.firstPointDate ? user.firstPointDate : '';
        const input = prompt('Entrez la date du premier point (YYYY-MM-DD HH:MM) ou laissez vide pour annuler', currentFp ? currentFp.replace('T',' ').substring(0,16) : '');
        if (!input) return;
        const parsed = new Date(input);
        if (isNaN(parsed.getTime())) { alert('Date invalide'); return; }
        const fpIso = parsed.toISOString();
        const periodEnd = new Date(parsed.getTime() + RESET_DAYS * 24 * 60 * 60 * 1000).toISOString();
        await updateDoc(userRef, { firstPointDate: fpIso, periodEndDate: periodEnd });
        alert('Dates mises à jour.');
        const newSnap = await getDoc(userRef);
        openUserDetails(selectedUserId, newSnap.data());
    };

    // Recompute from history button
    const recomputeFromHistory = document.getElementById('recompute-from-history');
    if (recomputeFromHistory) recomputeFromHistory.onclick = async () => {
        if (!selectedUserId) return;
        const userRef = doc(db, 'users', selectedUserId);
        const userSnap = await getDoc(userRef);
        const user = { id: selectedUserId, ...userSnap.data() };
        const res = await normalizeUserDates(user);
        if (res && res.updated) alert('Dates recalculées et mises à jour.'); else alert('Impossible d’inférer une date fiable à partir de l’historique.');
        const newSnap = await getDoc(userRef);
        openUserDetails(selectedUserId, newSnap.data());
    };

    // Normalize all users button
    const normalizeBtn = document.getElementById('normalize-users');
    if (normalizeBtn) normalizeBtn.onclick = async () => {
        if (!confirm('Confirmer : Normaliser les dates pour tous les utilisateurs (seulement si points>0 et si on peut inférer) ?')) return;
        let updatedCount = 0, total = allUsers.length;
        for (const u of allUsers) {
            const res = await normalizeUserDates(u);
            if (res && res.updated) updatedCount++;
        }
        alert('Normalisation terminée. Utilisateurs mis à jour : ' + updatedCount + '/' + total);
    };
    // Delete user handler
    document.getElementById('delete-user-btn').onclick = async () => {
        if (!selectedUserId) return;
        if (confirm("ATTENTION: Voulez-vous VRAIMENT supprimer cet utilisateur ? Cette action est irréversible.")) {
            try {
                await deleteDoc(doc(db, "users", selectedUserId));
                alert("Utilisateur supprimé (carte de fidélité retirée).");
                document.getElementById('user-modal').style.display = 'none';
            } catch (error) {
                console.error("Erreur suppression:", error);
                alert("Erreur lors de la suppression du client.");
            }
        }
    };
    
    // Logique de recherche
    document.getElementById('user-search').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredUsers = allUsers.filter(user => 
            user.email.toLowerCase().includes(searchTerm)
        );
        renderUserList(filteredUsers);
    });

    // Logique Scanner (Corrigée pour mobile)
    const html5QrCode = new Html5Qrcode("reader");
    document.getElementById('close-scanner').onclick = stopScanner;
    
    document.getElementById('open-scanner').onclick = () => {
        // SÉCURITÉ ADMIN : REMPLACE "TON_EMAIL_ADMIN@domaine.com" par ton VRAI email
        if (auth.currentUser && auth.currentUser.email !== "TON_EMAIL_ADMIN@domaine.com") {
            alert("Accès refusé. Veuillez vous connecter avec le compte administrateur.");
            return;
        }

        document.getElementById('admin-main').style.display = 'none';
        document.getElementById('scanner-view').style.display = 'block';

        setTimeout(() => {
            html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, (id) => {
                selectedUserId = id;
                updatePoints(1);
                alert(translations[lang].add);
                stopScanner();
            }).catch(err => {
                alert("Erreur Caméra: Assurez-vous d'être sur HTTPS et d'avoir autorisé l'accès.");
                stopScanner();
            });
        }, 500);
    };

});