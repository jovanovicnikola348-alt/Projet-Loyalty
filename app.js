import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// --- 1. LANGUES COMPLÈTES ---
const langData = {
    fr: { 
        title: "Connexion", google: "Continuer avec Google", loyalty: "Ma Fidélité", 
        gift: "🎁 Coupe offerte !", logout: "Déconnexion", qr: "Présentez ce code au salon :", 
        next: "Prochain RDV", navHome: "Accueil", navBooking: "Rendez-vous", navProfile: "Profil",
        profileTitle: "Mon Profil", langLabel: "Changer la langue :"
    },
    sr: { 
        title: "Prijava", google: "Nastavi sa Google-om", loyalty: "Moja Fidélité", 
        gift: "🎁 Besplatno šišanje !", logout: "Odjavi se", qr: "Pokažite ovaj kod u salonu :", 
        next: "Sledeći termin", navHome: "Početna", navBooking: "Termini", navProfile: "Profil",
        profileTitle: "Moj Profil", langLabel: "Promeni jezik :"
    },
    en: { 
        title: "Login", google: "Continue with Google", loyalty: "My Loyalty", 
        gift: "🎁 Free Haircut !", logout: "Logout", qr: "Show this code at the salon:", 
        next: "Next Appointment", navHome: "Home", navBooking: "Booking", navProfile: "Profile",
        profileTitle: "My Profile", langLabel: "Change Language :"
    }
};

function updateLanguage(lang) {
    const t = langData[lang];
    if (!t) return;

    const safeSetText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    };

    // Login & Client
    safeSetText('txt-title', t.title);
    safeSetText('txt-google', t.google);
    safeSetText('txt-loyalty', t.loyalty);
    safeSetText('txt-logout', t.logout);
    safeSetText('btn-logout', t.logout);
    safeSetText('txt-show-qr', t.qr);
    safeSetText('txt-profile-title', t.profileTitle);
    safeSetText('txt-lang-label', t.langLabel);
    
    // Navigation basse
    safeSetText('nav-home', t.navHome);
    safeSetText('nav-booking', t.navBooking);
    safeSetText('nav-profile', t.navProfile);

    const nextApt = document.getElementById('txt-next-apt');
    if (nextApt) nextApt.innerText = t.next;

    localStorage.setItem('userLang', lang);
}

// --- 2. LOGIQUE SETMORE ---
async function fetchNextAppointment(email) {
    try {
        const proxy = "https://api.allorigins.win/raw?url=";
        const tokenUrl = encodeURIComponent(`https://api.setmore.com/api/v1/o/oauth2/token?grant_type=refresh_token&refresh_token=${SETMORE_REFRESH_TOKEN}`);
        const tokenRes = await fetch(proxy + tokenUrl);
        const tokenData = await tokenRes.json();
        const accessToken = tokenData.data.token.access_token;

        const custUrl = encodeURIComponent(`https://api.setmore.com/api/v1/bookingapi/customer?email=${email}`);
        const custRes = await fetch(proxy + custUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        const custData = await custRes.json();
        
        if (!custData.data.customer) return null;

        const appUrl = encodeURIComponent(`https://api.setmore.com/api/v1/bookingapi/appointments/${custData.data.customer.key}`);
        const appRes = await fetch(proxy + appUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        const appData = await appRes.json();
        
        // Retourne le premier rendez-vous futur trouvé
        return appData.data.appointments[0] || null;
    } catch (e) { return null; }
}

// --- 3. INITIALISATION ---
document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('userLang') || 'fr';
    updateLanguage(savedLang);

    const lSelect = document.getElementById('lang-select');
    const pLSelect = document.getElementById('lang-select-profile');
    
    if(lSelect) lSelect.onchange = (e) => { updateLanguage(e.target.value); if(pLSelect) pLSelect.value = e.target.value; };
    if(pLSelect) pLSelect.onchange = (e) => { updateLanguage(e.target.value); if(lSelect) lSelect.value = e.target.value; };
});

// --- 4. AUTH & TEMPS RÉEL ---
// Fonction pour mettre à jour l'affichage du RDV aux deux endroits
async function updateAppointmentUI(email) {
    const appointment = await fetchNextAppointment(email);
    const cardHome = document.getElementById('appointment-card');
    const cardProfile = document.getElementById('appointment-card-profile');
    
    if (appointment) {
        const dateObj = new Date(appointment.start_time);
        const currentLang = localStorage.getItem('userLang') || 'fr';
        const dateStr = dateObj.toLocaleDateString(currentLang, { day: 'numeric', month: 'long' });
        const timeStr = dateObj.toLocaleTimeString(currentLang, { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');

        // Mise à jour Accueil
        if (cardHome) {
            cardHome.style.display = 'block';
            document.getElementById('next-appointment-date').innerText = dateStr;
            document.getElementById('next-appointment-time').innerText = timeStr;
        }
        // Mise à jour Profil
        if (cardProfile) {
            cardProfile.style.display = 'block';
            document.getElementById('next-appointment-date-profile').innerText = dateStr;
            document.getElementById('next-appointment-time-profile').innerText = timeStr;
        }
    } else {
        if (cardHome) cardHome.style.display = 'none';
        if (cardProfile) cardProfile.style.display = 'none';
    }
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('client-section').style.display = 'block';
        document.getElementById('user-email-display').innerText = user.email;

        // Premier chargement
        updateAppointmentUI(user.email);

        // Écouter l'événement de rafraîchissement quand on change d'onglet
        window.addEventListener('refreshAppointments', () => {
            updateAppointmentUI(user.email);
        });

        // Points & QR Code
        onSnapshot(doc(db, "users", user.uid), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                document.getElementById('points-display').innerText = `${data.points} / 5`;
                document.getElementById('progress-bar').style.width = (data.points / 5 * 100) + "%";
                document.getElementById('gift-msg').style.display = data.points >= 5 ? 'block' : 'none';
                document.getElementById('gift-msg').innerText = langData[localStorage.getItem('userLang') || 'fr'].gift;
                document.getElementById('qrcode').innerHTML = "";
                new QRCode(document.getElementById('qrcode'), { text: user.uid, width: 140, height: 140 });
            }
        });
    } else {
        document.getElementById('login-section').style.display = 'block';
        document.getElementById('client-section').style.display = 'none';
    }
});

// Boutons Auth
document.getElementById('btn-google').onclick = () => {
    signInWithPopup(auth, new GoogleAuthProvider()).then(res => {
        setDoc(doc(db, "users", res.user.uid), { email: res.user.email, points: 0, history: [] }, { merge: true });
    });
};
document.getElementById('btn-login').onclick = () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    signInWithEmailAndPassword(auth, e, p);
};
document.getElementById('btn-signup').onclick = () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    createUserWithEmailAndPassword(auth, e, p).then(res => {
        setDoc(doc(db, "users", res.user.uid), { email: e, points: 0, history: [] });
    });
};
document.getElementById('btn-logout').onclick = () => signOut(auth);