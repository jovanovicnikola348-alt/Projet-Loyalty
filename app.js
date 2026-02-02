import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
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
        navHistory: "Visites", profileTitle: "Mon Profil", langLabel: "Changer la langue :",
        phEmail: "Email", phPassword: "Mot de passe", phUsername: "Nom/Pseudo",
        login: "Se connecter", signup: "Inscription", signupToggle: "Vous n'avez pas de compte ? S'inscrire",
        historyTitle: "Historique des visites", noHistory: "Aucune visite enregistrée.",
        emailInvalid: "L'adresse email n'est pas valide.",
        emailUsed: "Cet email est déjà utilisé.",
        passTooWeak: "Mot de passe trop faible (min 6)"
    },
    sr: { 
        title: "Prijava", google: "Nastavi sa Google-om", loyalty: "Moja lojalnost", 
        gift: "🎁 Besplatno šišanje !", logout: "Odjavi se", qr: "Pokažite ovaj kod u salonu :", 
        next: "Sledeći termin", navHome: "Početna", navBooking: "Termini", navProfile: "Profil",
        navHistory: "Posete", profileTitle: "Moj Profil", langLabel: "Promeni jezik :",
        phEmail: "Email", phPassword: "Lozinka", phUsername: "Ime/Nadimak",
        login: "Prijavi se", signup: "Registracija", signupToggle: "Nemate nalog? Registracija",
        historyTitle: "Istorija poseta", noHistory: "Nema zabeleženih poseta.",
        emailInvalid: "Neispravna adresa e-pošte.",
        emailUsed: "Ovaj e-mail je već u upotrebi.",
        passTooWeak: "Lozinka je preslaba (min 6)"
    },
    en: { 
        title: "Login", google: "Continue with Google", loyalty: "My Loyalty", 
        gift: "🎁 Free Haircut !", logout: "Logout", qr: "Show this code at the salon:", 
        next: "Next Appointment", navHome: "Home", navBooking: "Booking", navProfile: "Profile",
        navHistory: "History", profileTitle: "My Profile", langLabel: "Change Language :",
        phEmail: "Email", phPassword: "Password", phUsername: "Name/Nickname",
        login: "Login", signup: "Signup", signupToggle: "Don't have an account? Sign up",
        historyTitle: "Visit History", noHistory: "No recorded visits.",
        emailInvalid: "Invalid email address.",
        emailUsed: "This email is already in use.",
        passTooWeak: "Password too weak (min 6)"
    }
};

function updateLanguage(lang) {
    const t = langData[lang];
    if (!t) return;

    const safeSetText = (id, text) => { const el = document.getElementById(id); if (el) el.innerText = text; };
    const safeSetPlaceholder = (id, text) => { const el = document.getElementById(id); if (el) el.placeholder = text; };

    safeSetText('txt-title', t.title); safeSetText('txt-google', t.google); safeSetText('txt-loyalty', t.loyalty);
    safeSetText('txt-show-qr', t.qr); safeSetText('txt-profile-title', t.profileTitle);
    safeSetText('txt-lang-label', t.langLabel);
    safeSetText('nav-home', t.navHome); safeSetText('nav-booking', t.navBooking);
    safeSetText('nav-profile', t.navProfile); safeSetText('nav-history', t.navHistory);
    safeSetText('history-title', t.historyTitle);
    safeSetText('txt-next-apt', t.next);
    
    safeSetPlaceholder('email', t.phEmail); safeSetPlaceholder('password', t.phPassword); safeSetPlaceholder('username', t.phUsername);

    document.getElementById('btn-login').innerText = t.login;
    document.getElementById('btn-signup').innerText = t.signup;
    document.getElementById('btn-logout').innerText = t.logout;
    document.getElementById('toggle-signup').innerText = t.signupToggle;

    localStorage.setItem('userLang', lang);
}

// --- 2. LOGIQUE SETMORE (Désactivé pour la stabilité) ---
async function updateAppointmentUI(email) {
    const cardHome = document.getElementById('appointment-card');
    const cardProfile = document.getElementById('appointment-card-profile');
    if (cardHome) cardHome.style.display = 'none';
    if (cardProfile) cardProfile.style.display = 'none';
}

// --- 3. INITIALISATION & LOGIQUE INSCRIPTION/LOGIN ---
document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('userLang') || 'fr';
    const detectedLang = navigator.language.startsWith('sr') ? 'sr' : savedLang;
    updateLanguage(detectedLang);

    const lSelect = document.getElementById('lang-select');
    const pLSelect = document.getElementById('lang-select-profile');
    
    if(lSelect) lSelect.value = detectedLang;
    if(pLSelect) pLSelect.value = detectedLang;

    if(lSelect) lSelect.onchange = (e) => { updateLanguage(e.target.value); if(pLSelect) pLSelect.value = e.target.value; };
    if(pLSelect) pLSelect.onchange = (e) => { updateLanguage(e.target.value); if(lSelect) lSelect.value = e.target.value; };

    // LOGIQUE DE BASCULE LOGIN/SIGNUP (CORRIGÉE)
    const usernameInput = document.getElementById('username');
    const toggleLink = document.getElementById('toggle-signup');
    const btnLogin = document.getElementById('btn-login');
    const btnSignup = document.getElementById('btn-signup');
    
    let isSigningUp = false;

    if(toggleLink) toggleLink.onclick = () => {
        isSigningUp = !isSigningUp;
        const currentLang = localStorage.getItem('userLang') || 'fr';
        if(isSigningUp) {
            usernameInput.style.display = 'block';
            btnLogin.style.display = 'none';
            btnSignup.style.display = 'block';
        } else {
            usernameInput.style.display = 'none';
            btnSignup.style.display = 'none';
            btnLogin.style.display = 'block';
        }
        updateLanguage(currentLang); 
    };
    
    if(usernameInput) usernameInput.style.display = 'none';
    if(btnSignup) btnSignup.style.display = 'none';
});

// --- 4. AUTH & TEMPS RÉEL ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('client-section').style.display = 'flex'; 
        
        const displayName = user.displayName || user.email.split('@')[0];
        document.getElementById('user-email-display').innerText = displayName;

        updateAppointmentUI(user.email);
        
        window.addEventListener('refreshAppointments', () => { updateAppointmentUI(user.email); });

        onSnapshot(doc(db, "users", user.uid), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                const currentLang = localStorage.getItem('userLang') || 'fr';
                
                // Points
                document.getElementById('points-display').innerText = `${data.points} / 5`;
                const progress = document.getElementById('progress-bar');
                if(progress) progress.style.width = (data.points / 5 * 100) + "%";
                document.getElementById('gift-msg').style.display = data.points >= 5 ? 'block' : 'none';
                document.getElementById('gift-msg').innerText = langData[currentLang].gift;

                // QR Code
                document.getElementById('qrcode').innerHTML = "";
                new QRCode(document.getElementById('qrcode'), { text: user.uid, width: 140, height: 140, colorDark: '#1A1A1A' });

                // HISTORIQUE CLIENT
                const histDiv = document.getElementById('visit-history-client');
                const history = data.history || [];
                if (histDiv) {
                    if (history.length === 0) {
                        histDiv.innerHTML = `<p style="text-align:center; color: var(--secondary);">${langData[currentLang].noHistory}</p>`;
                    } else {
                        histDiv.innerHTML = history.slice().reverse().map(date => 
                            `<div class="history-item-client"><span>Visite du</span>${date}</div>`
                        ).join('');
                    }
                }
            }
        });
    } else {
        document.getElementById('login-section').style.display = 'block';
        document.getElementById('client-section').style.display = 'none';
    }
});

// --- 5. Boutons Auth (Mis à jour pour le pseudo et la gestion des erreurs) ---
document.getElementById('btn-google').onclick = () => {
    signInWithPopup(auth, new GoogleAuthProvider()).then(res => {
        setDoc(doc(db, "users", res.user.uid), { email: res.user.email, displayName: res.user.displayName, points: 0, history: [] }, { merge: true });
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
    const username = document.getElementById('username').value;
    
    const emailErrorSpan = document.getElementById('email-error');
    const usernameErrorSpan = document.getElementById('username-error');
    const passErrorSpan = document.getElementById('password-error');
    
    emailErrorSpan.innerText = ''; usernameErrorSpan.innerText = ''; passErrorSpan.innerText = '';
    emailErrorSpan.style.display = 'none'; usernameErrorSpan.style.display = 'none'; passErrorSpan.style.display = 'none';

    if (!username) {
        alert("Veuillez entrer un nom/pseudo pour vous inscrire.");
        return;
    }
    
    createUserWithEmailAndPassword(auth, e, p)
        .then(res => {
            return updateProfile(res.user, { displayName: username });
        })
        .then(() => {
            setDoc(doc(db, "users", auth.currentUser.uid), { 
                email: auth.currentUser.email, 
                displayName: username,
                points: 0, 
                history: [] 
            });
        })
        .catch(error => {
            let errorMessage = error.message;
            
            if (error.code === "auth/weak-password") {
                errorMessage = langData[localStorage.getItem('userLang') || 'fr'].passTooWeak;
                passErrorSpan.innerText = errorMessage;
                passErrorSpan.style.display = 'block';
            } else if (error.code === "auth/email-already-in-use") {
                errorMessage = langData[localStorage.getItem('userLang') || 'fr'].emailUsed;
                emailErrorSpan.innerText = errorMessage; 
                emailErrorSpan.style.display = 'block';
            } else if (error.code === "auth/invalid-email") {
                errorMessage = langData[localStorage.getItem('userLang') || 'fr'].emailInvalid;
                emailErrorSpan.innerText = errorMessage; 
                emailErrorSpan.style.display = 'block';
            } else {
                passErrorSpan.innerText = error.code;
                passErrorSpan.style.display = 'block';
            }
        });
};
document.getElementById('btn-logout').onclick = () => signOut(auth);