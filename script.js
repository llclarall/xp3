const world = document.getElementById('world-track');
const knob = document.getElementById('knob');
const navContainer = document.getElementById('nav-container');
const liko = document.getElementById('liko');
const ghost = document.getElementById('ghost');
const arrowL = document.getElementById('arrow-left');
const arrowR = document.getElementById('arrow-right');
const trackName = document.getElementById('track-name');
const victoryScreen = document.getElementById('victory');
const eq = document.getElementById('eq');

let currentZoneIndex = -1; 
const ambiences = ['bg-pre', 'bg-ant', 'bg-moy', 'bg-mod'];

let scrollPct = 0;
let isNav = false;
let isLikoDrag = false;
let audioActive = false;


window.toggleAudio = () => {
    audioActive = !audioActive;
    const eq = document.getElementById('eq');
    
    if(audioActive) {
        eq.classList.add('eq-active');
        // Lancer l'ambiance actuelle immédiatement
        updateAudioContext(true); 
    } else {
        eq.classList.remove('eq-active');
        // Tout couper
        ambiences.forEach(id => {
            document.getElementById(id).pause();
        });
    }
}

function updateAudioContext(forceStart = false) {
    let newIndex = 0;
    
    // Déterminer la zone actuelle
    if(scrollPct < 25) newIndex = 0; // Préhistoire
    else if(scrollPct < 50) newIndex = 1; // Antiquité
    else if(scrollPct < 75) newIndex = 2; // Moyen-Âge
    else newIndex = 3; // Moderne

    // Mise à jour du texte (comme avant)
    const labels = ["Nuit & Feu", "Vent du Désert", "Marché Médiéval", "Ville Moderne"];
    const trackName = document.getElementById('track-name');
    trackName.innerText = labels[newIndex];

    // GESTION MUSIQUE
    // On ne change la musique que si on change de zone OU si on vient d'activer l'audio
    if ((newIndex !== currentZoneIndex || forceStart) && audioActive) {
        // 1. On coupe l'ancienne
        if(currentZoneIndex !== -1) {
            const oldSound = document.getElementById(ambiences[currentZoneIndex]);
            if(oldSound) {
                // Petit fondu de sortie manuel (optionnel) ou coupure nette
                oldSound.pause(); 
                oldSound.currentTime = 0;
            }
        }
        
        // 2. On lance la nouvelle
        const newSound = document.getElementById(ambiences[newIndex]);
        if(newSound) {
            // Volume différent selon l'époque
            newSound.volume = (newIndex === 0) ? 0.4 : 0.1; 
            newSound.play().catch(e => console.log("Click requis"));
        }
        
        currentZoneIndex = newIndex;
    }
}

function playSfx(id) {
    const s = document.getElementById(id);
    if(s) {
        s.currentTime = 0; // Rembobine pour rejouer vite
        s.play().catch(e => console.log("Audio bloqué"));
    }
}

// --- MOTEUR ---
function update() {
    scrollPct = Math.max(0, Math.min(100, scrollPct));
    knob.style.left = (scrollPct * 0.75) + '%';
    world.style.transform = `translateX(${-(scrollPct / 100) * 300}vw)`;
    
    // Mise à jour automatique de la musique au scroll
    updateAudioContext();
    
    // Audio Simulation : Change le titre selon la zone
    if(scrollPct < 25) trackName.innerText = "Nuit & Feu";
    else if(scrollPct < 50) trackName.innerText = "Vent du Désert";
    else if(scrollPct < 75) trackName.innerText = "Place du Village";
    else trackName.innerText = "Ville & Usines";
}

window.jump = (val) => { scrollPct = val; update(); }

// --- HOTSPOTS ---
window.toggleInfo = (btn) => {
    const bubble = btn.nextElementSibling;
    document.querySelectorAll('.info-bubble').forEach(b => { if(b!==bubble) b.classList.remove('active'); });
    bubble.classList.toggle('active');
}

// --- NAV DRAG ---
function navMove(e) {
    if(!isNav) return;
    e.preventDefault();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const rect = navContainer.getBoundingClientRect();
    let x = cx - rect.left - (rect.width * 0.125);
    let pct = (x / rect.width) * 100;
    scrollPct = pct / 0.75;
    update();
}

knob.addEventListener('mousedown', () => isNav=true);
knob.addEventListener('touchstart', () => isNav=true);
window.addEventListener('mouseup', () => isNav=false);
window.addEventListener('touchend', () => isNav=false);
window.addEventListener('mousemove', navMove);
window.addEventListener('touchmove', navMove, {passive:false});

// --- LIKO DRAG ---
function likoMove(e) {
    if(!isLikoDrag) return;
    e.preventDefault();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    ghost.style.left = (cx - 50) + 'px';
    ghost.style.top = (cy - 50) + 'px';
}

function likoStart(e) {
    isLikoDrag = true;
    ghost.style.opacity = 1;
    liko.style.opacity = 0;
    likoMove(e);
    arrowL.style.display = 'none';
    arrowR.style.display = 'none';
}

function likoEnd() {
    if(!isLikoDrag) return;
    isLikoDrag = false;
    ghost.style.opacity = 0;

    // VICTOIRE : Zone 1 (Préhistoire)
    if(scrollPct < 25) {
        document.querySelector('.top-hud').style.display = 'none';
        document.getElementById('liko-landed').style.display = 'block';
        document.getElementById('liko-landed').style.left = '15%'; 
        
        setTimeout(() => {
            victoryScreen.style.display = 'flex';
            setTimeout(() => {
                victoryScreen.style.opacity = '1';
                victoryScreen.querySelector('.polaroid').style.transform = 'rotate(-3deg) scale(1)';
            }, 50);
        }, 800);
    } else {
        liko.style.opacity = 1;
        if(scrollPct > 20) {
            arrowL.style.display = 'flex';
            setTimeout(() => arrowL.style.display = 'none', 3000);
        }
    }
}

liko.addEventListener('mousedown', likoStart);
liko.addEventListener('touchstart', likoStart);
window.addEventListener('mousemove', likoMove);
window.addEventListener('touchmove', likoMove, {passive:false});
window.addEventListener('mouseup', likoEnd);
window.addEventListener('touchend', likoEnd);

update();

