// Fonction pour charger et afficher les jalons depuis le CSV
async function loadMilestonesFromCSV() {
    try {
        const response = await fetch('milestones.csv');
        const csvText = await response.text();
        
        // Parser le CSV
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',');
        
        // Supprimer les marqueurs existants générés dynamiquement
        document.querySelectorAll('.dynamic-milestone').forEach(el => el.remove());
        
        // Grouper les jalons par époque
        const milestonesByEra = {
            'Prehistory': [],
            'Antiquity': [],
            'Middle Ages': [],
            'Renaissance': [],
            'Industrial Revolution': [],
            'Modern': []
        };
        
        // Parcourir chaque ligne (ignorer l'en-tête)
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = parseCSVLine(line);
            const date = parseInt(values[0]);
            const era = values[1];
            const title = values[2];
            const importance = values[3] || 'sub'; // main ou sub
            
            if (milestonesByEra[era]) {
                milestonesByEra[era].push({ date, title, importance });
            }
        }
        
        // Calculer les positions pour chaque époque
        calculateAndDisplayMilestones('Prehistory', milestonesByEra['Prehistory'], 'slide-1', -30000, -3000);
        calculateAndDisplayMilestones('Antiquity', milestonesByEra['Antiquity'], 'slide-2', -3000, 476);
        calculateAndDisplayMilestones('Middle Ages', milestonesByEra['Middle Ages'], 'slide-3', 476, 1492);
        calculateAndDisplayMilestones('Renaissance', milestonesByEra['Renaissance'], 'slide-4', 1480, 1789);
        calculateAndDisplayMilestones('Industrial Revolution', milestonesByEra['Industrial Revolution'], 'slide-5', 1789, 1945);
        calculateAndDisplayMilestones('Modern', milestonesByEra['Modern'], 'slide-6', 1945, 2026);
        
        console.log('Jalons chargés depuis milestones.csv');
    } catch (error) {
        console.error('Erreur lors du chargement du CSV des jalons:', error);
    }
}

function calculateAndDisplayMilestones(eraName, milestones, slideClass, startDate, endDate) {
    const eraSlide = document.querySelector(`.${slideClass}`);
    if (!eraSlide) return;
    
    const timelineMarkers = eraSlide.querySelector('.timeline-markers');
    if (!timelineMarkers) return;
    
    const range = endDate - startDate;
    
    // Ajouter les marqueurs principaux et secondaires
    milestones.forEach(milestone => {
        // Calculer la position en pourcentage
        const position = ((milestone.date - startDate) / range) * 100;
        
        // Éviter les positions hors limites
        if (position < 0 || position > 100) return;
        
        if (milestone.importance === 'main') {
            // Marqueur principal
            const mainMarker = document.createElement('div');
            mainMarker.className = 'marker-main dynamic-milestone';
            mainMarker.style.left = position === 0 ? '20px' : position + '%';
            mainMarker.textContent = formatDate(milestone.date);
            mainMarker.title = milestone.title;
            timelineMarkers.appendChild(mainMarker);
        } else {
            // Marqueur secondaire
            const markerSub = document.createElement('div');
            markerSub.className = 'marker-sub dynamic-milestone';
            markerSub.style.left = position + '%';
            markerSub.title = milestone.title;
            
            const span = document.createElement('span');
            span.textContent = formatDate(milestone.date);
            markerSub.appendChild(span);
            
            timelineMarkers.appendChild(markerSub);
        }
    });
}

function formatDate(date) {
    if (date < 0) {
        return date.toString().replace('-', '-').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }
    return date.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// Fonction helper pour parser une ligne CSV
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

// Charger les jalons au démarrage
window.addEventListener('DOMContentLoaded', loadMilestonesFromCSV);
