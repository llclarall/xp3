// Fonction pour charger et afficher les objets depuis le CSV
async function loadObjectsFromCSV() {
    try {
        const response = await fetch('objects.csv');
        const csvText = await response.text();
        
        // Parser le CSV
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',');
        
        // Supprimer les objets existants générés dynamiquement
        document.querySelectorAll('.dynamic-object').forEach(el => el.remove());
        
        // Définir les plages temporelles de chaque époque
        const eras = {
            'Prehistory': { start: -30000, end: -3000, slideClass: 'slide-1' },
            'Antiquity': { start: -3000, end: 476, slideClass: 'slide-2' },
            'Middle Ages': { start: 476, end: 1492, slideClass: 'slide-3' },
            'Renaissance': { start: 1492, end: 1789, slideClass: 'slide-4' },
            'Industrial Revolution': { start: 1789, end: 1945, slideClass: 'slide-5' },
            'Modern': { start: 1945, end: 2026, slideClass: 'slide-6' }
        };
        
        // Parcourir chaque ligne (ignorer l'en-tête)
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Parser la ligne CSV
            const values = parseCSVLine(line);
            
            const date = parseInt(values[0]);
            const era = values[1];
            const objectEmoji = values[2];
            const objectImage = values[3];
            const objectName = values[4];
            const hasInfo = values[5] === 'true';
            const infoText = values[6] || '';
            
            // Récupérer les infos de l'époque
            const eraInfo = eras[era];
            if (!eraInfo) continue;
            
            // Calculer la position en pourcentage basée sur la date
            const range = eraInfo.end - eraInfo.start;
            const calculatedPosition = ((date - eraInfo.start) / range) * 100;
            
            // Clamp la position entre 5% et 95% pour éviter les débordements
            const finalPosition = Math.max(5, Math.min(95, calculatedPosition));
            
            // Trouver le conteneur de l'époque
            const eraSlide = document.querySelector(`.${eraInfo.slideClass}`);
            if (!eraSlide) continue;
            
            // Créer l'élément objet
            const objectDiv = document.createElement('div');
            objectDiv.className = 'repeat-decor dynamic-object';
            objectDiv.style.left = finalPosition + '%';
            objectDiv.setAttribute('data-date', date);
            
            // Si c'est un objet avec info, créer un prop-group au lieu d'un repeat-decor
            if (hasInfo) {
                objectDiv.className = 'prop-group dynamic-object';
                objectDiv.style.left = finalPosition + '%';
                
                // Emoji principal
                const emojiDiv = document.createElement('div');
                emojiDiv.className = 'prop-emoji';
                emojiDiv.textContent = objectEmoji;
                objectDiv.appendChild(emojiDiv);
                
                // Bouton info
                const infoBtn = document.createElement('div');
                infoBtn.className = 'hotspot-btn';
                infoBtn.textContent = '?';
                infoBtn.onclick = function() { toggleInfo(this); };
                objectDiv.appendChild(infoBtn);
                
                // Bulle d'info
                const infoBubble = document.createElement('div');
                infoBubble.className = 'info-bubble';
                infoBubble.textContent = infoText;
                objectDiv.appendChild(infoBubble);
            } else {
                // Simple décor répétitif
                objectDiv.textContent = objectEmoji;
            }
            
            // Ajouter à l'époque correspondante (avant le ground)
            const ground = eraSlide.querySelector('.ground');
            if (ground) {
                eraSlide.insertBefore(objectDiv, ground);
            } else {
                eraSlide.appendChild(objectDiv);
            }
        }
        
        console.log('Objets chargés depuis objects.csv avec positions calculées par date');
    } catch (error) {
        console.error('Erreur lors du chargement du CSV:', error);
    }
}

// Fonction helper pour parser une ligne CSV avec des guillemets
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    
    return result;
}

// Charger les objets au démarrage
window.addEventListener('DOMContentLoaded', loadObjectsFromCSV);
