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

// --- PERSONNAGES À PLACER ---
const characters = [
    {
        id: 'liko',
        name: 'Liko',
        displayName: "l'Homme de Cro-Magnon 🧔",
        img: 'images/Liko.png',
        targetYear: -29000,
        targetTolerance: 100
    },
    {
        id: 'marco',
        name: 'Marco',
        displayName: "Marco Polo 🧭",
        img: 'images/Marco.png',
        targetYear: 1600,
        targetTolerance: 50
    }
];

let currentCharacterIndex = 0;

function getCurrentCharacter() {
    return characters[currentCharacterIndex];
}

function updateMissionText() {
    const current = getCurrentCharacter();
    const missionContent = document.querySelector('.mission-bubble .m-content');
    if (missionContent && current) {
        missionContent.innerHTML = `Place ${current.displayName} <br>dans son époque`;
    }
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
    currentCharacterIndex++;
    
    // Fermer le polaroid
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
    const current = getCurrentCharacter();
    liko.style.opacity = 1; // Toujours réafficher Liko après le drag

    // VÉRIFIER LE PLACEMENT
    const currentYear = Math.round(timelineStart + (scrollPct / 100) * timelineRange);
    if (Math.abs(currentYear - current.targetYear) <= current.targetTolerance) {
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
            arrowR.style.display = 'flex';
            setTimeout(() => arrowR.style.display = 'none', 15000);
        } else {
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
    currentCharacterIndex = 0;
    
    // Cacher l'écran de victoire
    victoryScreen.style.opacity = '0';
    victoryScreen.querySelector('.polaroid').style.transform = 'rotate(-3deg) scale(0.8)';
    setTimeout(() => {
        victoryScreen.style.display = 'none';
    }, 500);
    
    // Réafficher l'UI de mission
    document.querySelector('.top-hud').style.display = 'block';
    
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
}

// Lancement
update();
createSilhouettes();
updateMissionText();