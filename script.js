/**
 * Gauge calculation formula: targetPatternMeasurement = desiredMeasurement * (personalGauge / patternGauge)
 * Tighter gauge (more stitches/10cm) → need LARGER pattern size
 * Looser gauge (fewer stitches/10cm) → need SMALLER pattern size
 */
function calculateTargetPatternMeasurement(personalGauge, patternGauge, desiredMeasurement) {
    if (!personalGauge || !patternGauge || !desiredMeasurement) return null;
    return desiredMeasurement * (personalGauge / patternGauge);
}

/**
 * Actual measurement formula: actualMeasurement = patternMeasurement * (patternGauge / personalGauge)
 */
function calculateActualMeasurement(personalGauge, patternGauge, patternMeasurement) {
    if (!personalGauge || !patternGauge || !patternMeasurement) return null;
    return patternMeasurement * (patternGauge / personalGauge);
}

function findClosestSize(targetMeasurement, sizes) {
    if (!targetMeasurement || !sizes || sizes.length === 0) return null;
    
    let closest = null;
    let smallestDiff = Infinity;
    
    for (const size of sizes) {
        if (!size.measurement) continue;
        const diff = Math.abs(size.measurement - targetMeasurement);
        if (diff < smallestDiff) {
            smallestDiff = diff;
            closest = { ...size, difference: diff };
        }
    }
    
    return closest;
}

function analyzeAllSizes(personalGauge, patternGauge, desiredMeasurement, sizes) {
    const targetPatternMeasurement = calculateTargetPatternMeasurement(
        personalGauge, patternGauge, desiredMeasurement
    );
    
    if (!targetPatternMeasurement) return { error: 'Missing required values' };
    
    const validSizes = sizes.filter(s => s.name && s.measurement);
    if (validSizes.length === 0) return { error: 'No valid sizes entered' };
    
    const analyzedSizes = validSizes.map(size => {
        const actualMeasurement = calculateActualMeasurement(personalGauge, patternGauge, size.measurement);
        const differenceFromDesired = actualMeasurement - desiredMeasurement;
        
        return {
            name: size.name,
            patternMeasurement: size.measurement,
            actualMeasurement: Math.round(actualMeasurement * 10) / 10,
            differenceFromDesired: Math.round(differenceFromDesired * 10) / 10
        };
    });
    
    let bestMatch = null;
    let smallestAbsDiff = Infinity;
    
    for (const size of analyzedSizes) {
        const absDiff = Math.abs(size.differenceFromDesired);
        if (absDiff < smallestAbsDiff) {
            smallestAbsDiff = absDiff;
            bestMatch = size;
        }
    }
    
    return {
        targetPatternMeasurement: Math.round(targetPatternMeasurement * 10) / 10,
        bestMatch,
        allSizes: analyzedSizes,
        gaugeRatio: Math.round((personalGauge / patternGauge) * 100) / 100
    };
}

document.addEventListener('DOMContentLoaded', () => {
    const personalGaugeInput = document.getElementById('personal-gauge');
    const patternGaugeInput = document.getElementById('pattern-gauge');
    const desiredMeasurementInput = document.getElementById('desired-measurement');
    const sizeListContainer = document.getElementById('size-list');
    const addSizeBtn = document.getElementById('add-size');
    const calculateBtn = document.getElementById('calculate');
    const resultSection = document.getElementById('result');
    const resultContent = document.getElementById('result-content');
    
    addSizeRow('S', '');
    addSizeRow('M', '');
    addSizeRow('L', '');
    
    addSizeBtn.addEventListener('click', () => addSizeRow('', ''));
    calculateBtn.addEventListener('click', calculate);
    
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') calculate();
        });
    });
    
    function addSizeRow(name = '', measurement = '') {
        const row = document.createElement('div');
        row.className = 'size-row';
        row.innerHTML = `
            <input type="text" class="size-name" placeholder="Size name" value="${name}">
            <input type="number" class="size-measurement" placeholder="Measurement (cm)" step="0.5" min="1" value="${measurement}">
            <button type="button" class="btn-remove" title="Remove size">&times;</button>
        `;
        
        row.querySelector('.btn-remove').addEventListener('click', () => row.remove());
        sizeListContainer.appendChild(row);
    }
    
    function getSizes() {
        const sizes = [];
        sizeListContainer.querySelectorAll('.size-row').forEach(row => {
            const name = row.querySelector('.size-name').value.trim();
            const measurement = parseFloat(row.querySelector('.size-measurement').value);
            if (name || measurement) {
                sizes.push({ name, measurement: measurement || 0 });
            }
        });
        return sizes;
    }
    
    function calculate() {
        const personalGauge = parseFloat(personalGaugeInput.value);
        const patternGauge = parseFloat(patternGaugeInput.value);
        const desiredMeasurement = parseFloat(desiredMeasurementInput.value);
        const sizes = getSizes();
        
        if (!personalGauge || !patternGauge || !desiredMeasurement) {
            showError('Please fill in your gauge, pattern gauge, and desired measurement.');
            return;
        }
        
        if (sizes.length === 0 || !sizes.some(s => s.name && s.measurement)) {
            showError('Please add at least one pattern size with a name and measurement.');
            return;
        }
        
        const analysis = analyzeAllSizes(personalGauge, patternGauge, desiredMeasurement, sizes);
        
        if (analysis.error) {
            showError(analysis.error);
            return;
        }
        
        displayResult(analysis, personalGauge, patternGauge, desiredMeasurement);
    }
    
    function showError(message) {
        resultSection.classList.remove('hidden', 'warning');
        resultSection.classList.add('warning');
        resultContent.innerHTML = `<p class="explanation">${message}</p>`;
    }
    
    function displayResult(analysis, personalGauge, patternGauge, desiredMeasurement) {
        resultSection.classList.remove('hidden', 'warning');
        
        const { bestMatch, allSizes, gaugeRatio } = analysis;
        
        let gaugeDesc = '';
        if (gaugeRatio > 1.02) {
            gaugeDesc = `Your gauge is <strong>tighter</strong> than the pattern (${Math.round((gaugeRatio - 1) * 100)}% more stitches per 10cm).`;
        } else if (gaugeRatio < 0.98) {
            gaugeDesc = `Your gauge is <strong>looser</strong> than the pattern (${Math.round((1 - gaugeRatio) * 100)}% fewer stitches per 10cm).`;
        } else {
            gaugeDesc = `Your gauge <strong>matches</strong> the pattern gauge closely.`;
        }
        
        let matchDesc = '';
        if (Math.abs(bestMatch.differenceFromDesired) <= 1) {
            matchDesc = `This will give you approximately <strong>${bestMatch.actualMeasurement}cm</strong>, which is very close to your target!`;
        } else if (bestMatch.differenceFromDesired > 0) {
            matchDesc = `This will give you approximately <strong>${bestMatch.actualMeasurement}cm</strong>, which is ${Math.abs(bestMatch.differenceFromDesired)}cm larger than your target.`;
        } else {
            matchDesc = `This will give you approximately <strong>${bestMatch.actualMeasurement}cm</strong>, which is ${Math.abs(bestMatch.differenceFromDesired)}cm smaller than your target.`;
        }
        
        const sizeListHTML = allSizes.map(size => {
            const isRecommended = size.name === bestMatch.name;
            const diffText = size.differenceFromDesired > 0 
                ? `+${size.differenceFromDesired}cm` 
                : `${size.differenceFromDesired}cm`;
            return `
                <div class="size-item ${isRecommended ? 'recommended' : ''}">
                    <span class="name">${size.name}${isRecommended ? ' ✓' : ''}</span>
                    <span class="measurement">${size.patternMeasurement}cm → </span>
                    <span class="adjusted">${size.actualMeasurement}cm (${diffText})</span>
                </div>
            `;
        }).join('');
        
        resultContent.innerHTML = `
            <div class="best-size">Knit size ${bestMatch.name}</div>
            <p class="explanation">
                ${gaugeDesc}<br><br>
                To achieve your desired ${desiredMeasurement}cm measurement, you should follow <strong>size ${bestMatch.name}</strong> (${bestMatch.patternMeasurement}cm in the pattern).<br><br>
                ${matchDesc}
            </p>
            <div class="all-sizes">
                <h3>All sizes with your gauge:</h3>
                <div class="size-comparison">
                    ${sizeListHTML}
                </div>
            </div>
        `;
    }
});
