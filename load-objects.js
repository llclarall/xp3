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
        
        // Parcourir chaque ligne (ignorer l'en-tête)
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Parser la ligne CSV en tenant compte des virgules dans les guillemets
            const values = parseCSVLine(line);
            
            const date = parseInt(values[0]);
            const era = values[1];
            const positionLeft = values[2];
            const objectEmoji = values[3];
            const objectImage = values[4];
            const objectName = values[5];
            const hasInfo = values[6] === 'true';
            const infoText = values[7] || '';
            
            // Déterminer l'époque (slide)
            let slideClass;
            if (era === 'Prehistory') slideClass = 'slide-1';
            else if (era === 'Antiquity') slideClass = 'slide-2';
            else if (era === 'Middle Ages') slideClass = 'slide-3';
            else if (era === 'Renaissance') slideClass = 'slide-4';
            else if (era === 'Industrial Revolution') slideClass = 'slide-5';
            else if (era === 'Modern') slideClass = 'slide-6';
            
            if (!slideClass) continue;
            
            // Trouver le conteneur de l'époque
            const eraSlide = document.querySelector(`.${slideClass}`);
            if (!eraSlide) continue;
            
            // Créer l'élément objet
            const objectDiv = document.createElement('div');
            objectDiv.className = 'repeat-decor dynamic-object';
            objectDiv.style.left = positionLeft;
            objectDiv.setAttribute('data-date', date);
            
            // Si c'est un objet avec info, créer un prop-group au lieu d'un repeat-decor
            if (hasInfo) {
                objectDiv.className = 'prop-group dynamic-object';
                objectDiv.style.left = positionLeft;
                
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
        
        console.log('Objets chargés depuis objects.csv');
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
