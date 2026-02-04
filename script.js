// --- RÉFÉRENCES DOM ---
const gameViewport = document.getElementById('game-viewport'); // L'écran de jeu
const world = document.getElementById('world-track');
const liko = document.getElementById('liko');
const ghost = document.getElementById('ghost');
const arrowL = document.getElementById('arrow-left');
const arrowR = document.getElementById('arrow-right');
const victoryScreen = document.getElementById('victory');
const eraIndicator = document.getElementById('era-name');

// Éléments de la frise statique
const scalePointer = document.getElementById('scale-pointer');
const scaleCursor = document.getElementById('scale-cursor');
const scaleYearLabel = document.getElementById('scale-year-label');

// --- CALCULS TEMPORELS ---
const timelineStart = -30000;
const timelineEnd = 2026;
const timelineRange = timelineEnd - timelineStart;

// Proportions flex des époques (basées sur leurs durées réelles)
const eraFlexValues = [337.5, 43.75, 12.5, 3.75, 1.875, 1];
const totalFlex = eraFlexValues.reduce((a, b) => a + b, 0);

// Le monde total fait 40037.5vw, le viewport fait 100vw
const worldTotalVW = 40037.5;
const viewportVW = 100;
const worldSpanVW = worldTotalVW - viewportVW; // portion translatable du track

// Calcul des positions de début de chaque époque en VW
const eraStartVW = [0];
let cumulVW = 0;
for (let i = 0; i < eraFlexValues.length - 1; i++) {
    cumulVW += (eraFlexValues[i] / totalFlex) * worldTotalVW;
    eraStartVW.push(cumulVW);
}

// Conversion en pourcentages de scroll (0-100%)
// Pour afficher une époque, on veut son début au bord gauche du viewport
// translateX = -(scrollPct / 100) * worldSpanVW
// Donc scrollPct = (translateX / worldSpanVW) * 100
const eraStartPositions = eraStartVW.map(vw => (vw / worldSpanVW) * 100);

// Calcul des positions finales de chaque époque
const eraEndPositions = eraStartPositions.map((pos, i) => 
    i < eraStartPositions.length - 1 ? eraStartPositions[i + 1] : 100
);

// Les seuils statiques doivent correspondre aux MÊMES proportions que les époques
// Ainsi le curseur se synchronise correctement
const staticThresholds = [0];
let staticCumul = 0;
for (let i = 0; i < eraFlexValues.length; i++) {
    staticCumul += (eraFlexValues[i] / totalFlex) * 100;
    staticThresholds.push(staticCumul);
}

function mapToStaticScale(scrollPct) {
    // Puisque les seuils statiques utilisent les mêmes proportions que les époques du monde,
    // on peut mapper directement scrollPct aux seuils statiques
    
    let eraIdx = 0;
    for (let i = 0; i < eraStartPositions.length; i++) {
        if (scrollPct >= eraStartPositions[i] && scrollPct < eraEndPositions[i]) {
            eraIdx = i;
            break;
        }
    }
    
    // Position relative dans l'époque actuelle (0 à 1)
    const eraStart = eraStartPositions[eraIdx];
    const eraEnd = eraEndPositions[eraIdx];
    const eraWidth = eraEnd - eraStart;
    const relativePos = eraWidth > 0 ? (scrollPct - eraStart) / eraWidth : 0;
    
    // Mapper à la position sur la frise statique (qui a les mêmes proportions)
    const staticStart = staticThresholds[eraIdx];
    const staticEnd = staticThresholds[eraIdx + 1] || 100;
    return staticStart + relativePos * (staticEnd - staticStart);
}

// --- ÉTATS ---
let scrollPct = 0;
let isDrag = false;     // Drag & Drop de Liko
let isWorldDrag = false; // Drag du Monde (Swipe)
let lastMouseX = 0;     // Pour calculer le delta du swipe

// Fonction pour obtenir la sensibilité en fonction de l'époque actuelle
function getScrollSensitivity(scrollPct) {
    // Déterminer l'époque actuelle
    let eraIdx = 0;
    for (let i = 0; i < eraStartPositions.length; i++) {
        if (scrollPct >= eraStartPositions[i] && scrollPct < eraEndPositions[i]) {
            eraIdx = i;
            break;
        }
    }
    
    // La sensibilité est proportionnelle à la largeur de l'époque
    // Plus l'époque est large (préhistoire), plus on scrolle vite
    const eraWidth = eraEndPositions[eraIdx] - eraStartPositions[eraIdx];
    
    // Facteur de base : une largeur d'écran = X% de scroll
    // On multiplie par eraWidth pour adapter : époque large = scroll rapide
    const baseSensitivity = 20; // valeur de référence
    return baseSensitivity * (eraWidth / 10); // Ajuster le diviseur pour contrôler l'intensité
}

// --- MOTEUR PRINCIPAL ---
function update() {
    scrollPct = Math.max(0, Math.min(100, scrollPct));

    // 1. Mise à jour du nom de l'époque
    const eraNames = ['PRÉHISTOIRE', 'ANTIQUITÉ', 'MOYEN-ÂGE', 'RENAISSANCE', 'RÉVOLUTION INDUSTRIELLE', 'MODERNE'];
    let eraIdx = 0;
    for (let i = 0; i < eraStartPositions.length - 1; i++) {
        if (scrollPct >= eraStartPositions[i] && scrollPct < eraStartPositions[i + 1]) {
            eraIdx = i;
            break;
        }
    }
    if (scrollPct >= eraStartPositions[eraStartPositions.length - 1]) {
        eraIdx = eraStartPositions.length - 1;
    }
    
    if(eraIndicator) eraIndicator.textContent = eraNames[eraIdx];

    // 2. Déplacement visuel du monde
    world.style.transform = `translateX(${-(scrollPct / 100) * worldSpanVW}vw)`;
    
    // 3. Mise à jour frise statique
    const staticPct = mapToStaticScale(scrollPct);
    if (scalePointer) scalePointer.style.left = staticPct + '%';
    if (scaleCursor) scaleCursor.style.left = staticPct + '%';
    if (scaleYearLabel) {
        const currentYear = Math.round(timelineStart + (scrollPct / 100) * timelineRange);
        scaleYearLabel.textContent = currentYear.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }
}

// Saut vers une époque spécifique (0-5)
window.jumpToEra = (eraIndex) => { 
    scrollPct = eraStartPositions[eraIndex]; 
    update(); 
}

// Saut direct (pour compatibilité)
window.jump = (val) => { scrollPct = val; update(); }

// Gestion des bulles d'info
window.toggleInfo = (btn) => {
    const bubble = btn.nextElementSibling;
    document.querySelectorAll('.info-bubble').forEach(b => { if(b!==bubble) b.classList.remove('active'); });
    bubble.classList.toggle('active');
}

// --- 1. NAVIGATION : SWIPE DU MONDE (NOUVEAU) ---
gameViewport.addEventListener('mousedown', (e) => {
    // On ne lance pas le swipe si on clique sur l'UI, le perso ou un bouton
    // IMPORTANT : Si isDrag est déjà true, ne pas lancer worldDrag
    if (e.target.closest('.era-button') || 
        e.target.closest('.char-dock') ||
        e.target.closest('.hotspot-btn') ||
        isDrag) return;

    isWorldDrag = true;
    lastMouseX = e.clientX;
    gameViewport.style.cursor = 'grabbing'; // Curseur "main fermée"
});

window.addEventListener('mousemove', (e) => {
    // Logique du Swipe Monde
    if (isWorldDrag) {
        e.preventDefault();
        const delta = e.clientX - lastMouseX;
        
        // Sensibilité adaptative : ajustée en fonction de la taille de l'époque actuelle
        // Préhistoire (large) = scroll rapide, Moderne (petite) = scroll lent
        const sensitivity = getScrollSensitivity(scrollPct);
        const pctChange = -(delta / window.innerWidth) * sensitivity;
        
        scrollPct += pctChange;
        lastMouseX = e.clientX;
        update();
    }

    // Logique Drag Liko
    if (isDrag) {
        e.preventDefault();
        ghost.style.left = (e.clientX - 50) + 'px';
        ghost.style.top = (e.clientY - 50) + 'px';
    }
});

window.addEventListener('mouseup', () => {
    if (isWorldDrag) {
        isWorldDrag = false;
        gameViewport.style.cursor = 'default';
    }
    if (isDrag) {
        dragEnd();
    }
});


// --- 2. GAMEPLAY : DRAG LIKO ---
function dragStart(e) {
    // Empêcher tout comportement par défaut et la propagation
    e.preventDefault();
    e.stopPropagation();
    
    // Marquer comme drag en cours
    isDrag = true;
    
    // Afficher le fantôme et cacher le vrai Liko
    ghost.style.opacity = 1;
    liko.style.opacity = 0;
    
    // Position initiale du fantôme (suivre immédiatement la souris)
    const cx = e.clientX || (e.touches ? e.touches[0].clientX : 0);
    const cy = e.clientY || (e.touches ? e.touches[0].clientY : 0);
    ghost.style.left = (cx - 50) + 'px';
    ghost.style.top = (cy - 50) + 'px';

    // Cacher les flèches d'aide
    arrowL.style.display = 'none';
    arrowR.style.display = 'none';
}

function dragEnd() {
    if(!isDrag) return;
    isDrag = false;
    ghost.style.opacity = 0;
    liko.style.opacity = 1; // Toujours réafficher Liko après le drag

    // VICTOIRE : Zone Préhistoire (avant l'époque 1 = Antiquité)
    if(scrollPct < eraStartPositions[1]) {
        document.querySelector('.top-hud').style.display = 'none';
        const landed = document.getElementById('liko-landed');
        landed.style.display = 'block';
        landed.style.left = '30%'; 
        
        // Ajouter une vignette sur la frise statique
        const staticPct = mapToStaticScale(scrollPct);
        const scaleBar = document.querySelector('.scale-bar');
        const marker = document.createElement('div');
        marker.className = 'character-marker';
        marker.innerHTML = '<img src="images/Liko.png" alt="Liko">';
        marker.style.left = staticPct + '%';
        scaleBar.appendChild(marker);
        
        setTimeout(() => {
            victoryScreen.style.display = 'flex';
            setTimeout(() => {
                victoryScreen.style.opacity = '1';
                victoryScreen.querySelector('.polaroid').style.transform = 'rotate(-3deg) scale(1)';
            }, 50);
        }, 800);
    } else {
        // ÉCHEC - Afficher une flèche d'aide mais garder Liko prêt pour un autre drag
        if (scrollPct >= eraStartPositions[1]) {
            arrowL.style.display = 'flex';
            setTimeout(() => arrowL.style.display = 'none', 15000);
        }
    }
}

// Listeners Liko
liko.addEventListener('mousedown', dragStart);
liko.addEventListener('touchstart', dragStart);

// Support tactile Liko
window.addEventListener('touchmove', (e) => {
    if(!isDrag) return;
    e.preventDefault();
    const touch = e.touches[0];
    ghost.style.left = (touch.clientX - 50) + 'px';
    ghost.style.top = (touch.clientY - 50) + 'px';
}, {passive: false});

window.addEventListener('touchend', dragEnd);
// Le mouseup global gère la fin du drag souris pour Liko si on ajoute ceci :
window.addEventListener('mouseup', dragEnd);

// Fonction pour redémarrer le jeu sans recharger la page (garde les vignettes)
function restartGame() {
    // Réinitialiser l'état du jeu
    scrollPct = 0;
    isDrag = false;
    isWorldDrag = false;
    
    // Cacher l'écran de victoire
    victoryScreen.style.opacity = '0';
    setTimeout(() => {
        victoryScreen.style.display = 'none';
    }, 500);
    
    // Réafficher l'UI de mission
    document.querySelector('.top-hud').style.display = 'block';
    
    // Remettre Liko dans son dock
    liko.style.opacity = 1;
    const likoLanded = document.getElementById('liko-landed');
    likoLanded.style.display = 'none';
    
    // Remettre la vue au début
    update();
}

// Lancement
update();