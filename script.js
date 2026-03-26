// --- RÉFÉRENCES DOM ---
const gameViewport = document.getElementById('game-viewport'); // L'écran de jeu
const world = document.getElementById('world-track');
const liko = document.getElementById('liko');
const ghost = document.getElementById('ghost');
const arrowL = document.getElementById('arrow-left');
const arrowR = document.getElementById('arrow-right');
const victoryScreen = document.getElementById('victory');
const eraIndicator = document.getElementById('era-name');
const eraButtons = document.querySelectorAll('.era-button');
const startOverlay = document.getElementById('start-overlay');
const startMissionContent = document.getElementById('start-mission-content');
const startGameBtn = document.getElementById('start-game-btn');

// --- AUDIO SFX ---
const sfx = {
    mission: new Audio('sons/mission.wav'),
    scroll: new Audio('sons/scroll.wav'),
    good: new Audio('sons/bien joue.wav'),
    hintLeft: new Audio('sons/indice-gauche.wav'),
    hintRight: new Audio('sons/indice-droite.wav')
};

Object.values(sfx).forEach((value) => {
    if (value instanceof Audio) {
        value.preload = 'auto';
    }
});
function playSfx(audio, volume = 1) {
    if (!audio) return;
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.currentTime = 0;
    audio.play().catch(() => {
        // Ignore autoplay/user-gesture blocks silently
    });
}

// Éléments de la frise statique
const scalePointer = document.getElementById('scale-pointer');
const scaleCursor = document.getElementById('scale-cursor');
const scaleYearLabel = document.getElementById('scale-year-label');

// --- CALCULS TEMPORELS ---
const timelineStart = -30000;
const timelineEnd = 2026;
const timelineRange = timelineEnd - timelineStart;

// --- PERSONNAGES À PLACER ---
const characters = [
    {
        id: 'liko',
        name: 'Liko',
        displayName: "l'Homme de Cro-Magnon",
        img: 'images/Liko.png',
        targetYear: -29000,
        targetTolerance: 80
    },
    {
        id: 'marco',
        name: 'Marco',
        displayName: "Marco Polo",
        img: 'images/Marco.png',
        targetYear: 1600,
        targetTolerance: 30
    }
];

let currentCharacterIndex = 0;
let hasGameStarted = false;

function getCurrentCharacter() {
    return characters[currentCharacterIndex];
}

function updateMissionText() {
    const current = getCurrentCharacter();
    const missionContent = document.querySelector('.mission-bubble .m-content');
    const missionText = `Place ${current.displayName} <br>dans son époque`;
    if (missionContent && current) {
        missionContent.innerHTML = missionText;
    }
    if (startMissionContent && current) {
        startMissionContent.innerHTML = missionText;
    }
}

function startGame() {
    hasGameStarted = true;
    document.body.classList.add('game-started');
    if (startOverlay) {
        startOverlay.classList.add('hidden');
    }
    playSfx(sfx.mission, 0.8);
}

// Fonction pour convertir une année en pourcentage de scroll
function yearToScrollPct(year) {
    return ((year - timelineStart) / timelineRange) * 100;
}

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
let lastDeltaTime = 0;  // Pour calculer la vélocité
let momentumVelocity = 0; // Vélocité pour l'inertie
let momentumAnimationId = null; // ID de l'animation inertie

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

// Créer les silhouettes pour tous les personnages
function createSilhouettes() {
    characters.forEach((char, index) => {
        const targetScrollPct = yearToScrollPct(char.targetYear);
        const targetWorldPosVW = (targetScrollPct / 100) * worldSpanVW;
        const targetStaticPct = mapToStaticScale(targetScrollPct);
        
        // Silhouette dans le monde
        const worldSilhouette = document.createElement('div');
        worldSilhouette.className = 'char-silhouette-world';
        worldSilhouette.id = `${char.id}-silhouette-world`;
        worldSilhouette.dataset.charIndex = index;
        worldSilhouette.style.left = targetWorldPosVW + 'vw';
        worldSilhouette.innerHTML = `<img src="images/${char.id}-vide.png" alt="${char.name} silhouette">`;
        world.appendChild(worldSilhouette);
        
        // Silhouette sur la frise statique
        const scaleBar = document.querySelector('.scale-bar');
        if (scaleBar) {
            const scaleSilhouette = document.createElement('div');
            scaleSilhouette.className = 'char-silhouette-scale';
            scaleSilhouette.id = `${char.id}-silhouette-scale`;
            scaleSilhouette.dataset.charIndex = index;
            scaleSilhouette.style.left = targetStaticPct + '%';
            scaleSilhouette.innerHTML = `<img src="images/${char.id}-vide.png" alt="${char.name} silhouette">`;
            scaleBar.appendChild(scaleSilhouette);
        }
        
        char.worldEl = worldSilhouette;
        char.scaleEl = scaleBar ? scaleBar.querySelector(`#${char.id}-silhouette-scale`) : null;
    });
}

function updateGhostImage() {
    const current = getCurrentCharacter();
    const ghostImg = ghost.querySelector('img') || document.createElement('img');
    ghostImg.src = current.img;
    ghostImg.alt = current.name;
    if (!ghost.querySelector('img')) {
        ghost.appendChild(ghostImg);
    }
}

function changeToNextCharacter() {
    const previousChar = characters[currentCharacterIndex]; // Sauvegarder le personnage précédent
    currentCharacterIndex++;
    
    // Créer un polaroid souvenir mini et le placer en bas à gauche
    const polaroidImg = victoryScreen.querySelector('#polaroid-character-img');
    const polaroidCaption = victoryScreen.querySelector('.polaroid-caption');
    
    if (polaroidImg && polaroidImg.style.display !== 'none') {
        // Créer une mini version du polaroid souvenir
        const memoryPolaroid = document.createElement('div');
        memoryPolaroid.className = 'memory-polaroid';
        memoryPolaroid.innerHTML = `
            <div class="memory-polaroid-inner">
                <img src="${polaroidImg.src}" alt="${previousChar.name}">
                <div class="memory-caption">${previousChar.name}</div>
            </div>
        `;
        document.body.appendChild(memoryPolaroid);
    }
    
    // Fermer le polaroid principal
    victoryScreen.style.opacity = '0';
    victoryScreen.querySelector('.polaroid').style.transform = 'rotate(-3deg) scale(0.8)';
    
    setTimeout(() => {
        if (currentCharacterIndex < characters.length) {
            // Afficher le personnage suivant
            victoryScreen.style.display = 'none';
            const nextChar = getCurrentCharacter();
            const likoImg = liko.querySelector('img');
            if (likoImg) {
                likoImg.src = nextChar.img;
                likoImg.alt = nextChar.name;
            }
            updateGhostImage();
            liko.style.opacity = 1;
            updateMissionText();
        }
    }, 400);
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

    if (eraIndicator) {
        const isIndustrialEra = eraIdx === 4;
        eraIndicator.textContent = isIndustrialEra ? 'RÉVOLUTION\nINDUSTRIELLE' : eraNames[eraIdx];
        eraIndicator.classList.toggle('era-indicator-small', isIndustrialEra);
    }

    // 1b. Mise à jour du bouton d'époque actif
    if (eraButtons.length) {
        eraButtons.forEach((button, index) => {
            button.classList.toggle('active-era', index === eraIdx);
        });
    }

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
    if (!hasGameStarted) return;
    playSfx(sfx.scroll, 0.35);
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
    if (!hasGameStarted) return;

    // On ne lance pas le swipe si on clique sur l'UI, le perso ou un bouton
    // IMPORTANT : Si isDrag est déjà true, ne pas lancer worldDrag
    if (e.target.closest('.era-button') || 
        e.target.closest('.char-dock') ||
        e.target.closest('.hotspot-btn') ||
        isDrag) return;

    isWorldDrag = true;
    playSfx(sfx.scroll, 0.2);
    lastMouseX = e.clientX;
    lastDeltaTime = performance.now();
    gameViewport.style.cursor = 'grabbing'; // Curseur "main fermée"
});

window.addEventListener('mousemove', (e) => {
    // Logique du Swipe Monde
    if (isWorldDrag) {
        e.preventDefault();
        const delta = e.clientX - lastMouseX;
        const currentTime = performance.now();
        const deltaTime = currentTime - lastDeltaTime;
        
        // Calculer la vélocité (pixels par milliseconde)
        const velocity = deltaTime > 0 ? Math.abs(delta) / deltaTime : 0;
        
        // Coefficient de vélocité : scroll lent = 0.5x, scroll rapide = 1x
        // Clampé entre 0.5 et 1.0
        const velocityFactor = Math.max(0.1, Math.min(1.0, velocity * 2));
        
        // Sensibilité adaptative : ajustée en fonction de la taille de l'époque actuelle
        // Préhistoire (large) = scroll rapide, Moderne (petite) = scroll lent
        const sensitivity = getScrollSensitivity(scrollPct);
        const pctChange = -(delta / window.innerWidth) * sensitivity * velocityFactor;
        
        // Sauvegarder la vélocité pour l'inertie au mouseup
        momentumVelocity = pctChange;
        
        scrollPct += pctChange;
        lastMouseX = e.clientX;
        lastDeltaTime = currentTime;
        update();
    }

    // Logique Drag Liko
    if (isDrag) {
        e.preventDefault();
        ghost.style.left = (e.clientX - 50) + 'px';
        ghost.style.top = (e.clientY - 50) + 'px';
    }
});

// Fonction pour appliquer l'inertie au scroll
function applyMomentum() {
    if (Math.abs(momentumVelocity) < 0.01) {
        // Arrêter l'inertie quand elle est négligeable
        momentumVelocity = 0;
        momentumAnimationId = null;
        return;
    }
    
    // Appliquer la vélocité avec friction (décélération progressive)
    // Si on est en Préhistoire, friction plus forte pour ralentir l'inertie
    const isInPrehistory = scrollPct < eraStartPositions[1]; // Avant l'Antiquité
    const friction = isInPrehistory ? 0.88 : 0.95; // Préhistoire = freinage plus fort
    
    scrollPct += momentumVelocity;
    momentumVelocity *= friction;
    
    // Bloquer aux limites
    scrollPct = Math.max(0, Math.min(100, scrollPct));
    
    update();
    
    // Continuer l'animation
    momentumAnimationId = requestAnimationFrame(applyMomentum);
}

window.addEventListener('mouseup', () => {
    if (isWorldDrag) {
        isWorldDrag = false;
        gameViewport.style.cursor = 'default';
        
        // Arrêter l'inertie précédente si elle existe
        if (momentumAnimationId) {
            cancelAnimationFrame(momentumAnimationId);
        }
        
        // Lancer l'inertie avec la vélocité courante
        if (Math.abs(momentumVelocity) > 0.01) {
            momentumAnimationId = requestAnimationFrame(applyMomentum);
        } else {
            momentumVelocity = 0;
            momentumAnimationId = null;
        }
    }
    if (isDrag) {
        dragEnd();
    }
});


// --- 2. GAMEPLAY : DRAG LIKO ---
function dragStart(e) {
    if (!hasGameStarted) return;

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
    const current = getCurrentCharacter();
    liko.style.opacity = 1; // Toujours réafficher Liko après le drag

    // VÉRIFIER LE PLACEMENT
    const currentYear = Math.round(timelineStart + (scrollPct / 100) * timelineRange);
    if (Math.abs(currentYear - current.targetYear) <= current.targetTolerance) {
        playSfx(sfx.good, 0.9);

        // BON PLACEMENT - Remplir les silhouettes
        liko.style.opacity = 0; // Cacher le dock de Liko
        
        const worldSilhouette = document.getElementById(`${current.id}-silhouette-world`);
        const scaleSilhouette = document.getElementById(`${current.id}-silhouette-scale`);
        if (worldSilhouette) {
            worldSilhouette.querySelector('img').src = current.img;
            worldSilhouette.classList.add('filled');
        }
        if (scaleSilhouette) {
            scaleSilhouette.querySelector('img').src = current.img;
            scaleSilhouette.classList.add('filled');
        }
        
        // Afficher le polaroid avec le bouton pour passer au personnage suivant
        setTimeout(() => {
            const polaroidImg = victoryScreen.querySelector('#polaroid-character-img');
            const polaroidCaption = victoryScreen.querySelector('.polaroid-caption');
            let nextBtn = victoryScreen.querySelector('#polaroid-next-btn');
            
            // Mettre à jour l'image et le texte du polaroid
            if (polaroidImg) {
                polaroidImg.src = `images/polaroid-${current.id}.png`;
                polaroidImg.alt = current.name;
                polaroidImg.style.display = 'block';
            }
            if (polaroidCaption) {
                polaroidCaption.textContent = `${current.name} bien placé ! 🎉`;
            }
            
            // Créer ou réinitialiser le bouton
            if (!nextBtn) {
                nextBtn = document.createElement('button');
                nextBtn.id = 'polaroid-next-btn';
                nextBtn.className = 'polaroid-btn';
                victoryScreen.querySelector('.polaroid').appendChild(nextBtn);
            }
            
            if (currentCharacterIndex < characters.length - 1) {
                // Pour les personnages intermédiaires : bouton "Personnage suivant"
                nextBtn.textContent = 'Personnage suivant';
                nextBtn.onclick = changeToNextCharacter;
                nextBtn.style.display = 'block';
            } else {
                // Pour le dernier personnage : bouton "REJOUER"
                nextBtn.textContent = 'REJOUER';
                nextBtn.onclick = restartGame;
                nextBtn.style.display = 'block';
                if (polaroidCaption) {
                    polaroidCaption.textContent = 'Bravo ! \nTous les persos sont de retour à leur époque !';
                }
            }
            
            // Afficher le polaroid
            victoryScreen.style.display = 'flex';
            setTimeout(() => {
                victoryScreen.style.opacity = '1';
                victoryScreen.querySelector('.polaroid').style.transform = 'rotate(-3deg) scale(1)';
            }, 50);
        }, 800);
    } else {
        // MAUVAIS PLACEMENT - Flèches directionnelles
        arrowL.style.display = 'none';
        arrowR.style.display = 'none';
        if (currentYear < current.targetYear) {
            playSfx(sfx.hintRight, 0.85);
            arrowR.style.display = 'flex';
            setTimeout(() => arrowR.style.display = 'none', 15000);
        } else {
            playSfx(sfx.hintLeft, 0.85);
            arrowL.style.display = 'flex';
            setTimeout(() => arrowL.style.display = 'none', 15000);
        }
    }
}

// Listeners Liko
liko.addEventListener('mousedown', dragStart);
liko.addEventListener('touchstart', dragStart);
if (startGameBtn) {
    startGameBtn.addEventListener('click', startGame);
}

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
    currentCharacterIndex = 0;
    // Cacher l'écran de victoire
    victoryScreen.style.opacity = '0';
    victoryScreen.querySelector('.polaroid').style.transform = 'rotate(-3deg) scale(0.8)';
    setTimeout(() => {
        victoryScreen.style.display = 'none';
    }, 500);
    
    // Réafficher l'UI de mission
    document.querySelector('.top-hud').style.display = 'flex';
    
    // Supprimer tous les mini polaroïds souvenirs
    const memoryPolaroids = document.querySelectorAll('.memory-polaroid');
    memoryPolaroids.forEach(polaroid => polaroid.remove());
    
    // Remettre le premier personnage dans son dock
    const firstChar = characters[0];
    liko.style.opacity = 1;
    const likoImg = liko.querySelector('img');
    if (likoImg) {
        likoImg.src = firstChar.img;
        likoImg.alt = firstChar.name;
    }
    updateGhostImage();
    
    const likoLanded = document.getElementById('liko-landed');
    likoLanded.style.display = 'none';
    
    // remettre les images vides
    characters.forEach(char => {
        if (char.worldEl) {
            char.worldEl.classList.remove('filled');
            const worldImg = char.worldEl.querySelector('img');
            if (worldImg) worldImg.src = `images/${char.id}-vide.png`;
        }
        if (char.scaleEl) {
            char.scaleEl.classList.remove('filled');
            const scaleImg = char.scaleEl.querySelector('img');
            if (scaleImg) scaleImg.src = `images/${char.id}-vide.png`;
        }
    });
    
    updateMissionText();
    // Remettre la vue au début
    update();
    playSfx(sfx.mission, 0.8);
}

// Lancement
update();
createSilhouettes();
updateMissionText();