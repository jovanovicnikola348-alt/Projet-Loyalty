import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyC0TZI_OpGJ5_-zlDY08KmYx4K9aodJRsU",
    authDomain: "project-loyalty-4a445.firebaseapp.com",
    projectId: "project-loyalty-4a445",
    storageBucket: "project-loyalty-4a445.firebasestorage.app",
    messagingSenderId: "645134286018",
    appId: "1:645134286018:web:5bf96b80d24393a2bd8f5b"
};
const SETMORE_REFRESH_TOKEN = "r1/2557ad16dcZ1aOBR0sCas6W2Z7MtRXgk25KLBL9cDIMW7";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- 1. LANGUES ---
const langData = {
    fr: { title: "Connexion", google: "Continuer avec Google", loyalty: "Ma Fidélité", gift: "🎁 Coupe offerte !", logout: "Déconnexion", qr: "Présentez ce code au salon :", next: "Prochain RDV" },
    sr: { title: "Prijava", google: "Nastavi sa Google-om", loyalty: "Moja Fidélité", gift: "🎁 Besplatno šišanje !", logout: "Odjavi se", qr: "Pokažite ovaj kod u salonu :", next: "Sledeći termin" },
    en: { title: "Login", google: "Continue with Google", loyalty: "My Loyalty", gift: "🎁 Free Haircut !", logout: "Logout", qr: "Show this code at the salon:", next: "Next Appointment" }
};

function updateLanguage(lang) {
    const t = langData[lang];
    if (!t) return; // Sécurité si la langue n'existe pas

    // On crée une petite fonction interne pour éviter de répéter "if (el)"
    const safeSetText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    };

    safeSetText('txt-title', t.title);
    safeSetText('txt-google', t.google);
    safeSetText('txt-loyalty', t.loyalty);
    safeSetText('txt-logout', t.logout); // Cherchera txt-logout
    safeSetText('btn-logout', t.logout); // Cherchera aussi btn-logout au cas où
    safeSetText('txt-show-qr', t.qr);
    
    const nextApt = document.getElementById('txt-next-apt');
    if (nextApt) nextApt.innerText = t.next + " / Prochain RDV";

    localStorage.setItem('userLang', lang);
}

// Initialisation langue
const langSelect = document.getElementById('lang-select');
const profileLangSelect = document.getElementById('lang-select-profile');
const savedLang = localStorage.getItem('userLang') || navigator.language.split('-')[0] || 'fr';
langSelect.value = savedLang;
profileLangSelect.value = savedLang;
updateLanguage(savedLang);

langSelect.onchange = (e) => { updateLanguage(e.target.value); profileLangSelect.value = e.target.value; };
profileLangSelect.onchange = (e) => { updateLanguage(e.target.value); langSelect.value = e.target.value; };

// --- 2. LOGIQUE SETMORE (Récupération directe) ---
async function fetchNextAppointment(email) {
    try {
        // A. Échange Refresh Token -> Access Token
        const tokenRes = await fetch(`https://api.setmore.com/api/v1/o/oauth2/token?grant_type=refresh_token&refresh_token=${SETMORE_REFRESH_TOKEN}`);
        const tokenData = await tokenRes.json();
        const accessToken = tokenData.data.token.access_token;

        // B. Trouver le Customer ID par email
        const custRes = await fetch(`https://api.setmore.com/api/v1/bookingapi/customer?email=${email}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const custData = await custRes.json();
        if (!custData.data.customer) return null;
        const customerKey = custData.data.customer.key;

        // C. Récupérer les RDV
        const appRes = await fetch(`https://api.setmore.com/api/v1/bookingapi/appointments/${customerKey}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const appData = await appRes.json();
        return appData.data.appointments[0] || null;
    } catch (e) { console.error("Setmore Error:", e); return null; }
}

// --- 3. AUTHENTIFICATION ---
async function setupUser(user) {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
        await setDoc(userRef, { email: user.email, points: 0, history: [] });
    }
}

document.getElementById('btn-google').onclick = async () => {
    const result = await signInWithPopup(auth, new GoogleAuthProvider());
    await setupUser(result.user);
};

document.getElementById('btn-login').onclick = () => {
    signInWithEmailAndPassword(auth, document.getElementById('email').value, document.getElementById('password').value).catch(e => alert(e.message));
};

document.getElementById('btn-signup').onclick = async () => {
    const res = await createUserWithEmailAndPassword(auth, document.getElementById('email').value, document.getElementById('password').value);
    await setupUser(res.user);
};

document.getElementById('btn-logout').onclick = () => signOut(auth);

// --- 4. TEMPS RÉEL ---
onAuthStateChanged(auth, async (user) => {
    const loginSec = document.getElementById('login-section');
    const clientSec = document.getElementById('client-section');

    if (user) {
        loginSec.style.display = 'none';
        clientSec.style.display = 'block';
        document.getElementById('user-email-display').innerText = user.email;

        // Récupérer RDV Setmore
        const appointment = await fetchNextAppointment(user.email);
        const appCard = document.getElementById('appointment-card');
        if (appointment) {
            appCard.style.display = 'block';
            const dateObj = new Date(appointment.start_time);
            document.getElementById('next-appointment-date').innerText = dateObj.toLocaleDateString();
            document.getElementById('next-appointment-time').innerText = dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        } else { appCard.style.display = 'none'; }

        // Écoute des points Firebase
        onSnapshot(doc(db, "users", user.uid), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                document.getElementById('points-display').innerText = `${data.points} / 5`;
                document.getElementById('progress-bar').style.width = (data.points / 5 * 100) + "%";
                
                const gift = document.getElementById('gift-msg');
                if (data.points >= 5) {
                    gift.innerText = langData[localStorage.getItem('userLang') || 'fr'].gift;
                    gift.style.display = 'block';
                } else { gift.style.display = 'none'; }

                document.getElementById('qrcode').innerHTML = "";
                new QRCode(document.getElementById('qrcode'), { text: user.uid, width: 140, height: 140 });
            }
        });
    } else {
        loginSec.style.display = 'block';
        clientSec.style.display = 'none';
    }
});