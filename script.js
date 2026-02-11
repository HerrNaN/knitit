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

function gcd(a, b) {
    a = Math.round(a);
    b = Math.round(b);
    while (b !== 0) {
        const temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}

function simplifyRatio(a, b) {
    const divisor = gcd(a, b);
    return { a: Math.round(a / divisor), b: Math.round(b / divisor) };
}

function calculateAdjustedPickupRatio(patternStitches, patternRows, personalGaugeH, personalGaugeV, patternGaugeH, patternGaugeV) {
    if (!patternStitches || !patternRows || !personalGaugeH || !personalGaugeV || !patternGaugeH || !patternGaugeV) {
        return null;
    }
    
    const adjustedStitches = patternStitches * (personalGaugeH / patternGaugeH);
    const adjustedRows = patternRows * (personalGaugeV / patternGaugeV);
    
    return {
        rawStitches: adjustedStitches,
        rawRows: adjustedRows,
        ratio: adjustedStitches / adjustedRows
    };
}

function calculateDistribution(totalStitches, totalRows) {
    if (totalStitches >= totalRows) {
        return { error: 'Cannot pick up more stitches than rows' };
    }
    
    const skips = totalRows - totalStitches;
    const g = gcd(totalStitches, skips);
    const pickupPerCycle = totalStitches / g;
    const skipPerCycle = skips / g;
    const cycleLength = pickupPerCycle + skipPerCycle;
    
    const pattern = [];
    let remainingPickups = pickupPerCycle;
    let remainingSkips = skipPerCycle;
    
    while (remainingPickups > 0 || remainingSkips > 0) {
        const pickupInThisGroup = Math.ceil(remainingPickups / (remainingPickups + remainingSkips) * (remainingPickups + remainingSkips > 1 ? 1 : 1));
        
        if (remainingPickups > 0 && remainingSkips > 0) {
            const ratio = remainingPickups / remainingSkips;
            if (ratio >= 1) {
                pattern.push({ type: 'pickup', count: 1 });
                remainingPickups--;
            } else {
                pattern.push({ type: 'skip', count: 1 });
                remainingSkips--;
            }
        } else if (remainingPickups > 0) {
            pattern.push({ type: 'pickup', count: remainingPickups });
            remainingPickups = 0;
        } else {
            pattern.push({ type: 'skip', count: remainingSkips });
            remainingSkips = 0;
        }
    }
    
    const mergedPattern = [];
    for (const item of pattern) {
        const last = mergedPattern[mergedPattern.length - 1];
        if (last && last.type === item.type) {
            last.count += item.count;
        } else {
            mergedPattern.push({ ...item });
        }
    }
    
    return {
        totalStitches,
        totalRows,
        cycleLength,
        pickupsPerCycle: pickupPerCycle,
        skipsPerCycle: skipPerCycle,
        pattern: mergedPattern,
        cycles: g
    };
}

function generateEvenDistribution(totalStitches, totalRows) {
    const result = [];
    let stitchesPlaced = 0;
    
    for (let row = 0; row < totalRows; row++) {
        const expectedStitches = Math.round((row + 1) * totalStitches / totalRows);
        if (expectedStitches > stitchesPlaced) {
            result.push(true);
            stitchesPlaced++;
        } else {
            result.push(false);
        }
    }
    
    return result;
}

function describeDistribution(totalStitches, totalRows) {
    const distribution = generateEvenDistribution(totalStitches, totalRows);
    
    const runs = [];
    let currentType = distribution[0];
    let currentCount = 1;
    
    for (let i = 1; i < distribution.length; i++) {
        if (distribution[i] === currentType) {
            currentCount++;
        } else {
            runs.push({ pickup: currentType, count: currentCount });
            currentType = distribution[i];
            currentCount = 1;
        }
    }
    runs.push({ pickup: currentType, count: currentCount });
    
    const runCounts = {};
    for (const run of runs) {
        const key = `${run.pickup ? 'pickup' : 'skip'}-${run.count}`;
        runCounts[key] = (runCounts[key] || 0) + 1;
    }
    
    return {
        distribution,
        runs,
        runCounts,
        totalStitches,
        totalRows
    };
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
    const personalGaugeHInput = document.getElementById('personal-gauge-h');
    const personalGaugeVInput = document.getElementById('personal-gauge-v');
    const patternGaugeHInput = document.getElementById('pattern-gauge-h');
    const patternGaugeVInput = document.getElementById('pattern-gauge-v');
    const desiredMeasurementInput = document.getElementById('desired-measurement');
    const sizeListContainer = document.getElementById('size-list');
    const addSizeBtn = document.getElementById('add-size');
    const calculateBtn = document.getElementById('calculate');
    const resultSection = document.getElementById('result');
    const resultContent = document.getElementById('result-content');
    
    const pickupSection = document.getElementById('pickup-section');
    const pickupDisabledMessage = document.getElementById('pickup-disabled-message');
    const pickupInputs = document.getElementById('pickup-inputs');
    const pickupStitchesInput = document.getElementById('pickup-stitches');
    const pickupRowsInput = document.getElementById('pickup-rows');
    const totalRowsInput = document.getElementById('total-rows');
    const calculatePickupBtn = document.getElementById('calculate-pickup');
    const pickupResultSection = document.getElementById('pickup-result');
    const pickupResultContent = document.getElementById('pickup-result-content');
    
    addSizeRow('S', '');
    addSizeRow('M', '');
    addSizeRow('L', '');
    
    addSizeBtn.addEventListener('click', () => addSizeRow('', ''));
    calculateBtn.addEventListener('click', calculate);
    calculatePickupBtn.addEventListener('click', calculatePickup);
    
    const gaugeInputs = [personalGaugeHInput, personalGaugeVInput, patternGaugeHInput, patternGaugeVInput];
    gaugeInputs.forEach(input => {
        input.addEventListener('input', updatePickupSectionState);
    });
    
    updatePickupSectionState();
    
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (pickupInputs.contains(input)) {
                    calculatePickup();
                } else {
                    calculate();
                }
            }
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
        const personalGauge = parseFloat(personalGaugeHInput.value);
        const patternGauge = parseFloat(patternGaugeHInput.value);
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
    
    function updatePickupSectionState() {
        const hasAllGauges = personalGaugeHInput.value && personalGaugeVInput.value && 
                            patternGaugeHInput.value && patternGaugeVInput.value;
        
        if (hasAllGauges) {
            pickupDisabledMessage.style.display = 'none';
            pickupInputs.style.display = 'block';
        } else {
            pickupDisabledMessage.style.display = 'block';
            pickupInputs.style.display = 'none';
        }
    }
    
    function calculatePickup() {
        const personalGaugeH = parseFloat(personalGaugeHInput.value);
        const personalGaugeV = parseFloat(personalGaugeVInput.value);
        const patternGaugeH = parseFloat(patternGaugeHInput.value);
        const patternGaugeV = parseFloat(patternGaugeVInput.value);
        const patternStitches = parseInt(pickupStitchesInput.value);
        const patternRows = parseInt(pickupRowsInput.value);
        const totalRows = parseInt(totalRowsInput.value);
        
        if (!patternStitches || !patternRows) {
            showPickupError('Please enter the pattern\'s pick-up instruction (stitches per rows).');
            return;
        }
        
        if (!totalRows) {
            showPickupError('Please enter the total rows along your edge.');
            return;
        }
        
        const adjusted = calculateAdjustedPickupRatio(
            patternStitches, patternRows,
            personalGaugeH, personalGaugeV,
            patternGaugeH, patternGaugeV
        );
        
        if (!adjusted) {
            showPickupError('Could not calculate adjusted ratio. Please check your inputs.');
            return;
        }
        
        const totalStitchesToPickup = Math.round(totalRows * adjusted.ratio);
        
        if (totalStitchesToPickup >= totalRows) {
            showPickupError('The calculated pick-up count exceeds your row count. This would mean picking up more than one stitch per row, which isn\'t possible for vertical edges.');
            return;
        }
        
        if (totalStitchesToPickup < 1) {
            showPickupError('The calculated pick-up count is too low. Please check your gauge values.');
            return;
        }
        
        const distributionInfo = describeDistribution(totalStitchesToPickup, totalRows);
        
        displayPickupResult(adjusted, patternStitches, patternRows, totalRows, totalStitchesToPickup, distributionInfo);
    }
    
    function showPickupError(message) {
        pickupResultSection.classList.remove('hidden', 'warning');
        pickupResultSection.classList.add('warning');
        pickupResultContent.innerHTML = `<p class="explanation">${message}</p>`;
    }
    
    function displayPickupResult(adjusted, patternStitches, patternRows, totalRows, totalStitchesToPickup, distributionInfo) {
        pickupResultSection.classList.remove('hidden', 'warning');
        
        const repeatPattern = findMinimalRepeat(totalStitchesToPickup, totalRows);
        
        const dotVisualization = generateDotVisualization(repeatPattern.pattern);
        
        pickupResultContent.innerHTML = `
            <div class="pickup-summary">Pick up ${totalStitchesToPickup} stitches over ${totalRows} rows</div>
            
            <div class="distribution-pattern">
                <h4>Pattern to repeat:</h4>
                <p class="pattern-text">${repeatPattern.description}</p>
                <p class="repeat-info">Repeat this ${repeatPattern.repeats} time${repeatPattern.repeats !== 1 ? 's' : ''}</p>
            </div>
            
            <div class="dot-visualization">
                <h4>One repeat (${repeatPattern.cycleRows} rows):</h4>
                <div class="dot-pattern">
                    ${dotVisualization}
                </div>
                <div class="dot-legend">
                    <span><span class="dot pickup"></span> Pick up</span>
                    <span><span class="dot"></span> Skip</span>
                </div>
            </div>
            
            <p class="pattern-note">
                <small>(Pattern says ${patternStitches} per ${patternRows} rows → adjusted for your gauge)</small>
            </p>
        `;
    }
    
    function findMinimalRepeat(totalStitches, totalRows) {
        const g = gcd(totalStitches, totalRows);
        const cycleStitches = totalStitches / g;
        const cycleRows = totalRows / g;
        
        const pattern = generateEvenDistribution(cycleStitches, cycleRows);
        
        const sequences = [];
        let i = 0;
        while (i < pattern.length) {
            const isPickup = pattern[i];
            let count = 0;
            while (i < pattern.length && pattern[i] === isPickup) {
                count++;
                i++;
            }
            sequences.push({ pickup: isPickup, count });
        }
        
        let description;
        if (sequences.length === 1) {
            description = sequences[0].pickup 
                ? `Pick up ${sequences[0].count} in a row` 
                : `Skip ${sequences[0].count} in a row`;
        } else if (sequences.length === 2) {
            const parts = sequences.map(s => 
                s.pickup ? `pick up ${s.count}` : `skip ${s.count}`
            );
            description = parts.join(', then ');
        } else {
            const parts = sequences.map(s => 
                s.pickup ? `pick up ${s.count}` : `skip ${s.count}`
            );
            description = parts.join(' → ');
        }
        
        return {
            cycleStitches,
            cycleRows,
            repeats: g,
            pattern,
            sequences,
            description
        };
    }
    
    function generateDotVisualization(distribution) {
        return distribution.map(isPickup => 
            `<span class="dot${isPickup ? ' pickup' : ''}"></span>`
        ).join('');
    }
});
