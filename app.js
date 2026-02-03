import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, setPersistence, browserSessionPersistence, browserLocalPersistence, updateProfile, signInWithCredential } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyC0TZI_OpGJ5_-zlDY08KmYx4K9aodJRsU",
    authDomain: "project-loyalty-4a445.firebaseapp.com",
    projectId: "project-loyalty-4a445",
    storageBucket: "project-loyalty-4a445.firebasestorage.app",
    messagingSenderId: "645134286018",
    appId: "1:645134286018:web:5bf96b80d24393a2bd8f5b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Si tu veux utiliser le fallback Google Identity Services (GSI) pour Safari iOS,
// renseigne ici ton client ID OAuth2 (type "Web application") créé dans Google Cloud Console.
// Ex: const GOOGLE_CLIENT_ID = '1234-abc.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID = '645134286018-kgkl7kh851c162jkoa325v72oi57v96v.apps.googleusercontent.com';

function loadGsiScript() {
    return new Promise((resolve, reject) => {
        if (window.google && window.google.accounts && window.google.accounts.id) return resolve();
        const s = document.createElement('script');
        s.src = 'https://accounts.google.com/gsi/client';
        s.async = true; s.defer = true;
        s.onload = () => { setTimeout(() => resolve(), 50); };
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

async function setupGsiButton() {
    if (!GOOGLE_CLIENT_ID) {
        if (DEBUG) debug('GSI client id non configuré; ignorer fallback GSI', 'err');
        return;
    }
    try {
        await loadGsiScript();
        if (DEBUG) debug('GSI script chargé');
        // Si le container existe, on ne réinitialise pas
        if (document.getElementById('gsi-container')) return;
        const btn = document.getElementById('btn-google');
        const container = document.createElement('div'); container.id = 'gsi-container';
        // Placer le container à la place du bouton original pour éviter les doublons
        if (btn && btn.parentNode) {
            btn.parentNode.insertBefore(container, btn);
            btn.style.display = 'none'; // masquer le bouton fallback
        } else {
            if (btn && btn.parentNode) btn.parentNode.insertBefore(container, btn.nextSibling);
        }
        container.style = 'display:flex;justify-content:center;margin-top:8px;';
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGsiCredentialResponse,
            ux_mode: 'popup'
        });
        // Render dans le container (apparence moderne GSI)
        google.accounts.id.renderButton(container, { theme: 'outline', size: 'large', shape: 'rectangular', text: 'signin_with' });
        // Si une aide mobile était affichée, la retirer car GSI est disponible
        const mh = document.getElementById('mobile-help'); if (mh && mh.parentNode) mh.parentNode.removeChild(mh);
    } catch (err) {
        if (DEBUG) debug('Erreur chargement GSI: ' + (err && err.message ? err.message : err), 'err');
    }
}

async function handleGsiCredentialResponse(resp) {
    if (DEBUG) debug('GSI response received, credential=' + (resp && (resp.credential ? 'present' : 'none')));
    if (!resp || !resp.credential) return;
    try {
        const credential = GoogleAuthProvider.credential(resp.credential);
        const userCred = await signInWithCredential(auth, credential);
        if (DEBUG) debug('GSI signInWithCredential OK uid=' + (userCred && userCred.user && userCred.user.uid));
        const userRef = doc(db, "users", userCred.user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
            await setDoc(userRef, { email: userCred.user.email, displayName: userCred.user.displayName, points: 0, history: [] });
        } else {
            await updateDoc(userRef, { email: userCred.user.email, displayName: userCred.user.displayName });
        }
        showClientUI(userCred.user);
    } catch (err) {
        if (DEBUG) debug('GSI -> signInWithCredential ERREUR: ' + (err && err.message ? err.message : err), 'err');
    }
}

const DEBUG = typeof window !== 'undefined' && /[?&]debug=1/.test(window.location.search);
const debugLog = [];
function debug(msg, type = 'info') {
    const t = new Date().toLocaleTimeString();
    const line = `[${t}] ${type === 'err' ? '❌' : type === 'ok' ? '✅' : '•'} ${msg}`;
    debugLog.push(line);
    if (typeof console !== 'undefined') console.log(line);
    const el = document.getElementById('debug-log');
    if (el) {
        el.appendChild(document.createElement('div')).textContent = line;
        el.scrollTop = el.scrollHeight;
    }
}

// CONFIG : durée avant reset à partir du premier point (en jours)
const RESET_DAYS = 33; // *toujours* 33 jours selon demande

function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function formatDateForDisplay(date) {
    if (!date) return '';
    try {
        const d = new Date(date);
        return d.toLocaleDateString(localStorage.getItem('userLang') === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch(e) { return String(date); }
}

function isMobileOrWebView() {
    const ua = navigator.userAgent || navigator.vendor || window.opera || '';
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i.test(ua);
}

function showClientUI(user) {
    if (DEBUG) debug('showClientUI appelé, uid=' + (user && user.uid));
    const loginSection = document.getElementById('login-section');
    const clientSection = document.getElementById('client-section');
    const homeTab = document.getElementById('tab-home');
    if (loginSection) loginSection.style.display = 'none';
    if (clientSection) clientSection.style.display = 'flex';
    if (homeTab) {
        homeTab.style.display = 'flex';
        homeTab.style.opacity = '1';
    }
    const displayName = user.displayName || (user.email ? user.email.split('@')[0] : '');
    const profileNameInput = document.getElementById('profile-display-name');
    const emailDisplay = document.getElementById('user-email-display');
    if (profileNameInput) profileNameInput.value = displayName;
    if (emailDisplay) emailDisplay.innerText = user.email || '';
    setupUserSnapshot(user);
    if (DEBUG) debug('showClientUI terminé', 'ok');
}

function initApp() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            showClientUI(user);
        } else {
            const loginSection = document.getElementById('login-section');
            const clientSection = document.getElementById('client-section');
            if (loginSection) loginSection.style.display = 'block';
            if (clientSection) clientSection.style.display = 'none';
        }
    });
}

function setupUserSnapshot(user) {
    if (DEBUG) debug('setupUserSnapshot uid=' + user.uid);
    onSnapshot(doc(db, "users", user.uid), async (snap) => {
        if (DEBUG) debug('onSnapshot: exists=' + snap.exists());
        if (!snap.exists()) return;
        const data = snap.data();

        // ----- Ensure firstPointDate + periodEndDate exists for users with points (migration & new behavior)
        try {
            if (data.points > 0 && !data.firstPointDate) {
                // Prefer to compute firstPointDate only if we can infer it reliably
                let inferred = null;

                // If periodEndDate exists and is valid, derive firstPointDate from it
                if (data.periodEndDate) {
                    const pe = new Date(data.periodEndDate);
                    if (!isNaN(pe.getTime())) {
                        inferred = new Date(pe.getTime() - RESET_DAYS * 24 * 60 * 60 * 1000);
                        if (DEBUG) debug('Inferred firstPointDate from existing periodEndDate for uid=' + user.uid, 'ok');
                    }
                }

                // Else, try to parse any history entries that are valid dates
                if (!inferred && Array.isArray(data.history) && data.history.length > 0) {
                    try {
                        const times = data.history.map(h => new Date(h).getTime()).filter(t => !isNaN(t));
                        if (times.length > 0) inferred = new Date(Math.min(...times));
                        if (inferred && DEBUG) debug('Inferred firstPointDate from history for uid=' + user.uid, 'ok');
                    } catch (e) { if (DEBUG) debug('infer history date failed: ' + (e && e.message ? e.message : e), 'err'); }
                }

                // Only set values if we have a reliable inferred date
                if (inferred) {
                    const periodEnd = addDays(inferred, RESET_DAYS);
                    await updateDoc(doc(db, "users", user.uid), { firstPointDate: inferred.toISOString(), periodEndDate: periodEnd.toISOString() });
                    if (DEBUG) debug('Set firstPointDate & periodEndDate from snapshot for uid=' + user.uid, 'ok');
                } else {
                    if (DEBUG) debug('Unable to infer firstPointDate for uid=' + user.uid + ' — skipping auto-set to avoid wrong dates', 'info');
                }
            }
        } catch (e) {
            if (DEBUG) debug('Erreur ensureFirstPointDate: ' + (e && e.message ? e.message : e), 'err');
        }

        const currentLang = localStorage.getItem('userLang') || 'sr';
        const t = langData[currentLang] || langData.sr;
        if (document.getElementById('profile-display-name') && data.displayName !== undefined)
            document.getElementById('profile-display-name').value = data.displayName;

        // Ensure periodEndDate aligns with RESET_DAYS from firstPointDate if available
        try {
            if (data.points > 0 && data.firstPointDate) {
                const fp = new Date(data.firstPointDate);
                if (!isNaN(fp.getTime())) {
                    const expectedEnd = addDays(fp, RESET_DAYS);
                    const currentEnd = data.periodEndDate ? new Date(data.periodEndDate) : null;
                    const diff = currentEnd ? Math.abs(currentEnd.getTime() - expectedEnd.getTime()) : Infinity;
                    // If periodEndDate missing or differs by more than 1 minute, normalize it
                    if (!currentEnd || diff > 60 * 1000) {
                        await updateDoc(doc(db, "users", user.uid), { periodEndDate: expectedEnd.toISOString() });
                        if (DEBUG) debug('Normalized periodEndDate to ' + expectedEnd.toISOString() + ' for uid=' + user.uid, 'ok');
                    }
                }
            }
        } catch (e) {
            if (DEBUG) debug('Erreur normalize periodEndDate: ' + (e && e.message ? e.message : e), 'err');
        }

        // We intentionally do NOT display 'Premier point' in the UI to avoid confusion.
        // The period end countdown remains shown based on periodEndDate.

        const periodEnd = data.periodEndDate ? new Date(data.periodEndDate) : null;
        const now = new Date();
        if (periodEnd && periodEnd <= now && data.points > 0) {
            await updateDoc(doc(db, "users", user.uid), { points: 0, history: [], periodEndDate: null });
            return;
        }
        document.getElementById('points-display').innerText = `${data.points} / 5`;
        if (document.getElementById('progress-bar')) document.getElementById('progress-bar').style.width = (data.points / 5 * 100) + "%";
        const gift = document.getElementById('gift-msg');
        gift.style.display = data.points >= 5 ? 'block' : 'none';
        gift.innerText = t.gift;
        const countdownCard = document.getElementById('countdown-card');
        const countdownText = document.getElementById('countdown-text');
        if (periodEnd && periodEnd > now && data.points > 0 && countdownCard && countdownText && t.resetOnDate) {
            const locale = currentLang === 'fr' ? 'fr-FR' : currentLang === 'sr' ? 'sr-RS' : 'en-US';
            const dateStr = periodEnd.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
            const msLeft = periodEnd - now;
            const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
            const weeks = Math.floor(daysLeft / 7);
            const wLabel = weeks === 1 ? t.week : t.weeks;
            const dLabel = daysLeft === 1 ? t.day : t.days;
            const paren = daysLeft >= 7 ? `${weeks} ${wLabel}` : `${daysLeft} ${dLabel}`;
            const parts = t.resetOnDate.split('%s');
            countdownText.innerText = (parts[0] || '') + dateStr + (parts[1] || '') + paren + (parts[2] || '');
            countdownCard.style.display = "block";
        } else if (countdownCard) {
            countdownCard.style.display = "none";
        }
        const qrEl = document.getElementById('qrcode');
        if (qrEl) {
            qrEl.innerHTML = "";
            if (typeof QRCode !== 'undefined') {
                new QRCode(qrEl, { text: user.uid, width: 140, height: 140, colorDark: '#1A1A1A' });
            }
        }
        const histDiv = document.getElementById('visit-history-client');
        const history = data.history || [];
        if (histDiv) {
            if (history.length === 0) {
                histDiv.innerHTML = `<p style="text-align:center; color: var(--secondary);">${t.noHistory}</p>`;
            } else {
                histDiv.innerHTML = history.slice().reverse().map(date =>
                    `<div class="history-item-client"><span>${t.visitOn}</span>${date}</div>`
                ).join('');
            }
        }
    });
}

async function applyRedirectResult(result) {
    if (!result || !result.user) return false;
    if (DEBUG) debug('Redirect Google OK, mise à jour Firestore...');
    const userRef = doc(db, "users", result.user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
        await setDoc(userRef, { email: result.user.email, displayName: result.user.displayName, points: 0, history: [] });
    } else {
        await updateDoc(userRef, { email: result.user.email, displayName: result.user.displayName });
    }
    if (DEBUG) debug('Firestore OK, appel showClientUI');
    showClientUI(result.user);
    return true;
}

// Detecte Safari sur iOS (utile pour afficher des conseils spécifiques)
function isSafariIOS() {
    const ua = navigator.userAgent || '';
    return /iP(hone|od|ad)/.test(ua) && /Safari/.test(ua) && !(/CriOS|FxiOS|OPiOS|Chrome|Chromium|Edg\//.test(ua));
}

function showMobileRedirectHelp() {
    if (document.getElementById('mobile-help')) return;
    const loginSection = document.getElementById('login-section');
    const div = document.createElement('div');
    div.id = 'mobile-help';
    div.style = 'background:#fff3cd;border:1px solid #ffeeba;padding:12px;margin:12px;border-radius:8px;color:#856404;';
    div.innerHTML = `<strong>Problème de connexion sur Safari iOS</strong>
        <p>Safari peut bloquer les cookies nécessaires au retour OAuth. Essayez :</p>
        <ul style="margin:6px 0 8px 18px;">
            <li>Désactiver <em>Prevent Cross‑Site Tracking</em> dans Réglages → Safari</li>
            <li>Ouvrir ce site dans Chrome mobile</li>
        </ul>
        <div style="display:flex;gap:8px;">
            <button id="mobile-help-retry" class="primary-btn">Réessayer la connexion</button>
            <button id="mobile-help-openchrome" class="secondary-btn">Ouvrir dans Chrome</button>
        </div>`;
    if (loginSection) loginSection.insertBefore(div, loginSection.firstChild);
    const retryBtn = document.getElementById('mobile-help-retry');
    retryBtn.onclick = () => { const el = document.getElementById('btn-google'); if (el) el.click(); };
    const chromeBtn = document.getElementById('mobile-help-openchrome');
    chromeBtn.onclick = () => {
        const url = window.location.href;
        // Essayez d'ouvrir dans Chrome via le scheme (si Chrome installé), sinon ouvre l'URL normale
        try { window.location.href = url.replace(/^https?:\/\//, 'googlechrome://'); } catch (e) { /* ignore */ }
        setTimeout(() => { window.open(url, '_blank'); }, 600);
    };
}

if (DEBUG) debug('app.js chargé, getRedirectResult démarré');
const REDIRECT_RETRY_DELAYS = [500, 1200, 2500, 5000];
function tryGetRedirectResult(attempt) {
    getRedirectResult(auth).then(async (result) => {
        if (DEBUG) debug('getRedirectResult (tentative ' + (attempt + 1) + '): result=' + (result && result.user ? result.user.uid : 'null'));
        const applied = await applyRedirectResult(result);
        if (!applied && isMobileOrWebView() && attempt < REDIRECT_RETRY_DELAYS.length) {
            const delay = REDIRECT_RETRY_DELAYS[attempt];
            if (DEBUG) debug('Redirect null sur mobile, retry dans ' + delay + 'ms');
            setTimeout(() => tryGetRedirectResult(attempt + 1), delay);
        } else if (!applied && isMobileOrWebView() && attempt >= REDIRECT_RETRY_DELAYS.length) {
            // After all retries still null — helpful debugging hints
            if (DEBUG) debug('getRedirectResult toujours null après tentatives sur mobile. Vérifie : autorized domains dans Firebase, redirect URIs dans Google Cloud OAuth, et le blocage des cookies dans Safari (ITP).', 'err');
            // Friendly suggestion to user/developer
            const panelEl = document.getElementById('debug-log');
            if (panelEl) {
                panelEl.appendChild(document.createElement('div')).textContent = '[⚠️] Redirection mobile non appliquée — essayer avec Chrome mobile ou vérifier les paramètres de cookies / domaines autorisés.';
            }
            // Si GSI est disponible, proposer le fallback GSI plutôt que la bannière d'aide
            if (GOOGLE_CLIENT_ID && isSafariIOS()) {
                if (DEBUG) debug('GSI disponible — afficher bouton GSI et masquer l’aide.', 'ok');
                try { await setupGsiButton(); } catch (e) { if (DEBUG) debug('Erreur setupGsiButton: ' + (e && e.message ? e.message : e), 'err'); }
                const panelEl2 = document.getElementById('debug-log'); if (panelEl2) panelEl2.appendChild(document.createElement('div')).textContent = '[ℹ️] Essayez le bouton Google en haut (GSI) sur Safari iOS.';
            } else {
                // Affiche un message d'aide visible sur mobile (bannière + bouton Réessayer)
                try { showMobileRedirectHelp(); } catch (e) { if (DEBUG) debug('Erreur showMobileRedirectHelp: ' + (e && e.message ? e.message : e), 'err'); }
                if (isSafariIOS()) { if (DEBUG) debug('iOS Safari détecté — afficher conseils spécifiques', 'ok'); }
            }
        }
    }).catch((err) => {
        if (DEBUG) debug('getRedirectResult ERREUR: ' + (err && err.message ? err.message : String(err)), 'err');
        if (isMobileOrWebView() && attempt < REDIRECT_RETRY_DELAYS.length) {
            setTimeout(() => tryGetRedirectResult(attempt + 1), REDIRECT_RETRY_DELAYS[attempt] || 1000);
        }
    });
}
tryGetRedirectResult(0);

const langData = {
    fr: { title: "Connexion", google: "Continuer avec Google", loyalty: "Ma Fidélité", gift: "🎁 Coupe offerte !", logout: "Déconnexion", qr: "Présentez ce code au salon :", next: "Prochain RDV", navHome: "Accueil", navBooking: "Rendez-vous", navProfile: "Profil", navHistory: "Visites", profileTitle: "Mon Profil", langLabel: "Changer la langue :", phEmail: "Email", phPassword: "Mot de passe", phUsername: "Nom/Pseudo", login: "Se connecter", signup: "Inscription", signupToggle: "Vous n'avez pas de compte ? S'inscrire", historyTitle: "Historique des visites", noHistory: "Aucune visite enregistrée.", emailInvalid: "L'adresse email n'est pas valide.", emailUsed: "Cet email est déjà utilisé.", passTooWeak: "Mot de passe trop faible (min 6)", visitOn: "Visite du", settingsTitle: "Paramètres du compte", displayNameLabel: "Nom affiché", emailLabel: "Email", saveProfile: "Enregistrer", profileUpdated: "Profil mis à jour.", nameRequired: "Le nom est requis.", resetOnDate: "Les points seront réinitialisés le %s (%s).", week: "semaine", weeks: "semaines", day: "jour", days: "jours", and: " et " },
    sr: { title: "Prijava", google: "Nastavi sa Google-om", loyalty: "Moja lojalnost", gift: "🎁 Besplatno šišanje !", logout: "Odjavi se", qr: "Pokažite ovaj kod u salonu :", next: "Sledeći termin", navHome: "Početna", navBooking: "Termini", navProfile: "Profil", navHistory: "Posete", profileTitle: "Moj Profil", langLabel: "Promeni jezik :", phEmail: "Email", phPassword: "Lozinka", phUsername: "Ime/Nadimak", login: "Prijavi se", signup: "Registracija", signupToggle: "Nemate nalog? Registracija", historyTitle: "Istorija poseta", noHistory: "Nema zabeleženih poseta.", emailInvalid: "Neispravna adresa e-pošte.", emailUsed: "Ovaj e-mail je već u upotrebi.", passTooWeak: "Lozinka je preslaba (min 6)", visitOn: "Poseta dana", settingsTitle: "Podešavanja naloga", displayNameLabel: "Prikazano ime", emailLabel: "Email", saveProfile: "Sačuvaj", profileUpdated: "Profil ažuriran.", nameRequired: "Ime je obavezno.", resetOnDate: "Poeni će se resetovati %s (%s).", week: "nedelja", weeks: "nedelja", day: "dan", days: "dana", and: " i " },
    en: { title: "Login", google: "Continue with Google", loyalty: "My Loyalty", gift: "🎁 Free Haircut !", logout: "Logout", qr: "Show this code at the salon:", next: "Next Appointment", navHome: "Home", navBooking: "Booking", navProfile: "Profile", navHistory: "History", profileTitle: "My Profile", langLabel: "Change Language :", phEmail: "Email", phPassword: "Password", phUsername: "Name/Nickname", login: "Login", signup: "Signup", signupToggle: "Don't have an account? Sign up", historyTitle: "Visit History", noHistory: "No recorded visits.", emailInvalid: "Invalid email address.", emailUsed: "This email is already in use.", passTooWeak: "Password too weak (min 6)", visitOn: "Visit on", settingsTitle: "Account settings", displayNameLabel: "Display name", emailLabel: "Email", saveProfile: "Save", profileUpdated: "Profile updated.", nameRequired: "Name is required.", resetOnDate: "Points will reset on %s (%s).", week: "week", weeks: "weeks", day: "day", days: "days", and: " and " }
};

function updateLanguage(lang) {
    const t = langData[lang];
    if (!t) return;
    const safeSetText = (id, text) => { const el = document.getElementById(id); if (el) el.innerText = text; };
    const safeSetPlaceholder = (id, text) => { const el = document.getElementById(id); if (el) el.placeholder = text; };

    safeSetText('txt-title', t.title); safeSetText('txt-google', t.google); safeSetText('txt-loyalty', t.loyalty);
    safeSetText('txt-show-qr', t.qr); safeSetText('txt-profile-title', t.profileTitle);
    safeSetText('txt-lang-label', t.langLabel); safeSetText('nav-home', t.navHome);
    safeSetText('nav-booking', t.navBooking); safeSetText('nav-profile', t.navProfile);
    safeSetText('nav-history', t.navHistory); safeSetText('history-title', t.historyTitle);
    safeSetText('txt-next-apt', t.next);
    if (t.settingsTitle) safeSetText('txt-settings-title', t.settingsTitle);
    if (t.displayNameLabel) safeSetText('txt-display-name-label', t.displayNameLabel);
    if (t.emailLabel) safeSetText('txt-email-label', t.emailLabel);
    if (t.saveProfile) { const sp = document.getElementById('btn-save-profile'); if (sp) sp.innerText = t.saveProfile; }
    safeSetPlaceholder('email', t.phEmail); safeSetPlaceholder('password', t.phPassword); safeSetPlaceholder('username', t.phUsername);

    document.getElementById('btn-login').innerText = t.login;
    document.getElementById('btn-signup').innerText = t.signup;
    document.getElementById('btn-logout').innerText = t.logout;
    document.getElementById('toggle-signup').innerText = t.signupToggle;

    localStorage.setItem('userLang', lang);
}

document.addEventListener('DOMContentLoaded', () => {
    if (DEBUG) {
        const panel = document.getElementById('debug-panel');
        if (panel) panel.style.display = 'block';
        debug('DOMContentLoaded, userAgent=' + (navigator.userAgent || '').substring(0, 60));
        debug('Mobile/WebView=' + isMobileOrWebView());
        // Added logs to help debug redirect results on mobile/Safari
        debug('location.href=' + (location.href || ''));
        debug('location.search=' + (location.search || '') + ' location.hash=' + (location.hash || ''));
        debug('document.referrer=' + (document.referrer || ''));
        const closeBtn = document.getElementById('debug-close');
        if (closeBtn) closeBtn.onclick = () => { if (panel) panel.style.display = 'none'; };
    }

    // If on iOS Safari and GSI client is configured, proactively render the modern button
    if (isSafariIOS() && GOOGLE_CLIENT_ID) {
        if (DEBUG) debug('iOS Safari & GSI configured — rendering modern Google button on load');
        try { setupGsiButton(); } catch(e) { if (DEBUG) debug('setupGsiButton on load failed: ' + (e && e.message ? e.message : e), 'err'); }
    }
    initApp();
    const savedLang = localStorage.getItem('userLang') || 'sr';
    updateLanguage(savedLang);

    const lSelect = document.getElementById('lang-select');
    const pLSelect = document.getElementById('lang-select-profile');
    if(lSelect) lSelect.value = savedLang;
    if(pLSelect) pLSelect.value = savedLang;

    if(lSelect) lSelect.onchange = (e) => { updateLanguage(e.target.value); if(pLSelect) pLSelect.value = e.target.value; };
    if(pLSelect) pLSelect.onchange = (e) => { updateLanguage(e.target.value); if(lSelect) lSelect.value = e.target.value; };

    const usernameInput = document.getElementById('username');
    const toggleLink = document.getElementById('toggle-signup');
    const btnLogin = document.getElementById('btn-login');
    const btnSignup = document.getElementById('btn-signup');
    let isSigningUp = false;

    if(toggleLink) toggleLink.onclick = () => {
        isSigningUp = !isSigningUp;
        const currentLang = localStorage.getItem('userLang') || 'sr';
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
});

document.getElementById('btn-google').onclick = async () => {
    if (DEBUG) debug('Clic Google, isMobile=' + isMobileOrWebView());
    const provider = new GoogleAuthProvider();

    // Sur iOS Safari, tenter d'abord le fallback GSI si configuré
    if (isSafariIOS()) {
        if (GOOGLE_CLIENT_ID) {
            if (DEBUG) debug('iOS Safari détecté - utiliser GSI fallback');
            await setupGsiButton();
            // Essayer d'ouvrir la prompt GSI si disponible, sinon simuler un clic sur le bouton rendu
            if (window.google && google.accounts && google.accounts.id && typeof google.accounts.id.prompt === 'function') {
                try { google.accounts.id.prompt(); return; } catch(e) { if (DEBUG) debug('google.accounts.id.prompt failed: ' + e, 'err'); }
            }
            const gsiBtn = document.querySelector('#gsi-container button, #gsi-container [role="button"]');
            if (gsiBtn) { gsiBtn.click(); return; }
            // sinon afficher l'aide et laisser l'utilisateur réessayer manuellement
            showMobileRedirectHelp();
            return;
        } else {
            if (DEBUG) debug('iOS Safari détecté mais GSI client id non configuré; continuer avec redirect', 'err');
        }
    }

    if (isMobileOrWebView()) {
        if (DEBUG) debug('Persistance mobile: essayer session puis local, puis redirection Google...');
        try {
            await setPersistence(auth, browserSessionPersistence);
            if (DEBUG) debug('setPersistence: session OK');
        } catch (e) {
            if (DEBUG) debug('session persistence failed: ' + (e.message || e));
            try {
                await setPersistence(auth, browserLocalPersistence);
                if (DEBUG) debug('setPersistence: local OK');
            } catch (e2) {
                if (DEBUG) debug('setPersistence local failed: ' + (e2.message || e2));
            }
        }
        await signInWithRedirect(auth, provider);
        return;
    }
    try {
        if (DEBUG) debug('Popup Google...');
        const res = await signInWithPopup(auth, provider);
        if (DEBUG) debug('Popup OK uid=' + res.user.uid);
        const userRef = doc(db, "users", res.user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
            await setDoc(userRef, { email: res.user.email, displayName: res.user.displayName, points: 0, history: [] });
        } else {
            await updateDoc(userRef, { email: res.user.email, displayName: res.user.displayName });
        }
        showClientUI(res.user);
    } catch (err) {
        if (DEBUG) debug('Google erreur: ' + (err.code || '') + ' ' + (err.message || ''), 'err');
        if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request' || (err.message && err.message.includes('disallowed_useragent'))) {
            await signInWithRedirect(auth, provider);
        } else {
            throw err;
        }
    }
};
document.getElementById('btn-login').onclick = () => {
    if (DEBUG) debug('Clic connexion email...');
    signInWithEmailAndPassword(auth, document.getElementById('email').value, document.getElementById('password').value)
        .then(() => { if (DEBUG) debug('signInWithEmailAndPassword résolu (auth va mettre à jour)'); })
        .catch((err) => { if (DEBUG) debug('Connexion email ERREUR: ' + (err.code || '') + ' ' + (err.message || ''), 'err'); });
};
document.getElementById('btn-signup').onclick = () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    const username = document.getElementById('username').value;
    if (!username) { alert("Nom/Pseudo requis"); return; }
    createUserWithEmailAndPassword(auth, e, p).then(res => updateProfile(res.user, { displayName: username })).then(() => {
        setDoc(doc(db, "users", auth.currentUser.uid), { email: auth.currentUser.email, displayName: username, points: 0, history: [] });
    }).catch(error => {
        const currentLang = localStorage.getItem('userLang') || 'sr';
        const emailErr = document.getElementById('email-error');
        const passErr = document.getElementById('password-error');
        if(emailErr) emailErr.style.display = 'none'; 
        if(passErr) passErr.style.display = 'none';
        if (error.code === "auth/weak-password" && passErr) { passErr.innerText = langData[currentLang].passTooWeak; passErr.style.display = 'block'; }
        else if (error.code === "auth/email-already-in-use" && emailErr) { emailErr.innerText = langData[currentLang].emailUsed; emailErr.style.display = 'block'; }
        else if (error.code === "auth/invalid-email" && emailErr) { emailErr.innerText = langData[currentLang].emailInvalid; emailErr.style.display = 'block'; }
    });
};
document.getElementById('btn-logout').onclick = () => signOut(auth);

document.getElementById('btn-save-profile').onclick = async () => {
    const input = document.getElementById('profile-display-name');
    const name = (input && input.value) ? input.value.trim() : '';
    const currentLang = localStorage.getItem('userLang') || 'sr';
    if (!name) {
        alert(langData[currentLang].nameRequired);
        return;
    }
    const user = auth.currentUser;
    if (!user) return;
    try {
        await updateProfile(user, { displayName: name });
        await updateDoc(doc(db, "users", user.uid), { displayName: name });
        alert(langData[currentLang].profileUpdated);
    } catch (err) {
        console.error(err);
        alert(err.message || 'Erreur');
    }
};