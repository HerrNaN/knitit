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

function renderSwatchSVG(gaugeH, gaugeV, sizeCm, color = '#8B5A6B', opacity = 1) {
    const pixelsPerCm = 30;
    const width = sizeCm * pixelsPerCm;
    const height = sizeCm * pixelsPerCm;
    
    const stitchWidth = (sizeCm / gaugeH) * pixelsPerCm;
    const rowHeight = (sizeCm / gaugeV) * pixelsPerCm;
    
    let stitches = '';
    const cols = Math.ceil(gaugeH);
    const rows = Math.ceil(gaugeV);
    
    for (let row = 0; row < rows; row++) {
        const isOddRow = row % 2 === 1;
        const offsetX = isOddRow ? stitchWidth * 0.5 : 0;
        
        for (let col = 0; col < cols; col++) {
            const x = col * stitchWidth + offsetX;
            const y = row * rowHeight;
            
            if (x + stitchWidth > width + stitchWidth * 0.5) continue;
            
            const vPath = `
                M ${x + stitchWidth * 0.15} ${y + rowHeight * 0.2}
                Q ${x + stitchWidth * 0.5} ${y + rowHeight * 0.9} ${x + stitchWidth * 0.5} ${y + rowHeight * 0.85}
                Q ${x + stitchWidth * 0.5} ${y + rowHeight * 0.9} ${x + stitchWidth * 0.85} ${y + rowHeight * 0.2}
            `;
            
            stitches += `<path d="${vPath}" stroke="${color}" stroke-width="1.5" fill="none" opacity="${opacity}"/>`;
        }
    }
    
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${width}" height="${height}" fill="white" opacity="0"/>
        ${stitches}
    </svg>`;
}

function renderSwatchComparison(gauge1H, gauge1V, gauge2H, gauge2V, mode = 'side-by-side') {
    const sizeCm = 5;
    
    if (mode === 'overlay') {
        const svg1 = renderSwatchSVG(gauge1H, gauge1V, sizeCm, '#8B5A6B', 0.8);
        const svg2 = renderSwatchSVG(gauge2H, gauge2V, sizeCm, '#4A7C59', 0.8);
        
        return `
            <div class="swatch-overlay">
                <div class="swatch-layer">${svg1}</div>
                <div class="swatch-layer">${svg2}</div>
            </div>
            <div class="swatch-legend">
                <span><span class="legend-color" style="background: #8B5A6B"></span> Main fabric</span>
                <span><span class="legend-color" style="background: #4A7C59"></span> Border</span>
            </div>
        `;
    } else {
        const svg1 = renderSwatchSVG(gauge1H, gauge1V, sizeCm, '#8B5A6B', 1);
        const svg2 = renderSwatchSVG(gauge2H, gauge2V, sizeCm, '#4A7C59', 1);
        
        return `
            <div class="swatch-side-by-side">
                <div class="swatch-item">
                    <div class="swatch-label">Main fabric</div>
                    <div class="swatch-container">${svg1}</div>
                    <div class="swatch-info">${gauge1H} st × ${gauge1V} rows / 10cm</div>
                </div>
                <div class="swatch-item">
                    <div class="swatch-label">Border</div>
                    <div class="swatch-container">${svg2}</div>
                    <div class="swatch-info">${gauge2H} st × ${gauge2V} rows / 10cm</div>
                </div>
            </div>
        `;
    }
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
        const stitchesThisRow = expectedStitches - stitchesPlaced;
        result.push(stitchesThisRow);
        stitchesPlaced = expectedStitches;
    }
    
    return result;
}

function describeDistribution(totalStitches, totalRows) {
    const distribution = generateEvenDistribution(totalStitches, totalRows);
    
    const runs = [];
    let currentCount = distribution[0];
    let runLength = 1;
    
    for (let i = 1; i < distribution.length; i++) {
        if (distribution[i] === currentCount) {
            runLength++;
        } else {
            runs.push({ stitchesPerRow: currentCount, rows: runLength });
            currentCount = distribution[i];
            runLength = 1;
        }
    }
    runs.push({ stitchesPerRow: currentCount, rows: runLength });
    
    const runCounts = {};
    for (const run of runs) {
        const key = `${run.stitchesPerRow}-${run.rows}`;
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

/**
 * Calculate border stitches when picking up along an edge with different gauge.
 * Along stitches: main stitches → border stitches (same width)
 * Along rows: main rows → border stitches (same height)
 */
function calculateGaugeCombination(mainGaugeH, mainGaugeV, borderGaugeH, borderGaugeV, mainCount, pickupAlong) {
    if (!mainCount) return null;
    
    if (pickupAlong === 'along-stitches') {
        if (!mainGaugeH || !borderGaugeH) return null;
        const width = (mainCount / mainGaugeH) * 10;
        const borderStitches = Math.round((width * borderGaugeH) / 10);
        const ratio = borderStitches / mainCount;
        const simplified = simplifyRatio(borderStitches, mainCount);
        
        return {
            type: 'along-stitches',
            mainCount,
            borderStitches,
            measurement: Math.round(width * 10) / 10,
            ratio: Math.round(ratio * 100) / 100,
            simplified,
            mainUnit: 'stitches',
            increase: borderStitches > mainCount
        };
    } else if (pickupAlong === 'along-rows') {
        if (!mainGaugeV || !borderGaugeH) return null;
        const height = (mainCount / mainGaugeV) * 10;
        const borderStitches = Math.round((height * borderGaugeH) / 10);
        const ratio = borderStitches / mainCount;
        const simplified = simplifyRatio(borderStitches, mainCount);
        
        return {
            type: 'along-rows',
            mainCount,
            borderStitches,
            measurement: Math.round(height * 10) / 10,
            ratio: Math.round(ratio * 100) / 100,
            simplified,
            mainUnit: 'rows',
            increase: borderStitches > mainCount
        };
    }
    
    return null;
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
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
        });
    });
    
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
    const sizePersonalSwatch = document.getElementById('size-personal-swatch');
    const sizePatternSwatch = document.getElementById('size-pattern-swatch');
    
    const pickupPersonalGaugeHInput = document.getElementById('pickup-personal-gauge-h');
    const pickupPersonalGaugeVInput = document.getElementById('pickup-personal-gauge-v');
    const pickupPatternGaugeHInput = document.getElementById('pickup-pattern-gauge-h');
    const pickupPatternGaugeVInput = document.getElementById('pickup-pattern-gauge-v');
    const pickupStitchesInput = document.getElementById('pickup-stitches');
    const pickupRowsInput = document.getElementById('pickup-rows');
    const totalRowsInput = document.getElementById('total-rows');
    const calculatePickupBtn = document.getElementById('calculate-pickup');
    const pickupResultSection = document.getElementById('pickup-result');
    const pickupResultContent = document.getElementById('pickup-result-content');
    const pickupPersonalSwatch = document.getElementById('pickup-personal-swatch');
    const pickupPatternSwatch = document.getElementById('pickup-pattern-swatch');
    
    const mainGaugeHInput = document.getElementById('main-gauge-h');
    const mainGaugeVInput = document.getElementById('main-gauge-v');
    const borderGaugeHInput = document.getElementById('border-gauge-h');
    const borderGaugeVInput = document.getElementById('border-gauge-v');
    const mainStitchesInput = document.getElementById('main-stitches');
    const calculateCombineBtn = document.getElementById('calculate-combine');
    const combineResultSection = document.getElementById('combine-result');
    const combineResultContent = document.getElementById('combine-result-content');
    const mainSwatchPreview = document.getElementById('main-swatch-preview');
    const borderSwatchPreview = document.getElementById('border-swatch-preview');
    const swatchOverlayContainer = document.getElementById('swatch-overlay-container');
    const swatchViewToggle = document.getElementById('swatch-view-toggle');
    const viewToggleButtons = swatchViewToggle.querySelectorAll('button');
    
    const tabSize = document.getElementById('tab-size');
    const tabPickup = document.getElementById('tab-pickup');
    const tabCombine = document.getElementById('tab-combine');
    
    addSizeRow('S', '');
    addSizeRow('M', '');
    addSizeRow('L', '');
    
    addSizeBtn.addEventListener('click', () => addSizeRow('', ''));
    calculateBtn.addEventListener('click', calculate);
    calculatePickupBtn.addEventListener('click', calculatePickup);
    calculateCombineBtn.addEventListener('click', calculateCombine);
    
    let currentViewMode = 'side-by-side';
    
    function updateSingleSwatchPreview(hInput, vInput, previewEl, color) {
        const h = parseFloat(hInput.value);
        const v = parseFloat(vInput.value);
        
        if (h > 0 && v > 0) {
            previewEl.innerHTML = `
                <div class="swatch-container">${renderSwatchSVG(h, v, 5, color, 1)}</div>
                <div class="swatch-info">${h} st × ${v} rows</div>
            `;
        } else {
            previewEl.innerHTML = '<div class="swatch-placeholder">Enter gauge to preview</div>';
        }
    }
    
    function updateSizeSwatches() {
        updateSingleSwatchPreview(personalGaugeHInput, personalGaugeVInput, sizePersonalSwatch, '#8B5A6B');
        updateSingleSwatchPreview(patternGaugeHInput, patternGaugeVInput, sizePatternSwatch, '#4A7C59');
    }
    
    function updatePickupSwatches() {
        updateSingleSwatchPreview(pickupPersonalGaugeHInput, pickupPersonalGaugeVInput, pickupPersonalSwatch, '#8B5A6B');
        updateSingleSwatchPreview(pickupPatternGaugeHInput, pickupPatternGaugeVInput, pickupPatternSwatch, '#4A7C59');
    }
    
    function updateCombineSwatchPreviews() {
        const mainH = parseFloat(mainGaugeHInput.value);
        const mainV = parseFloat(mainGaugeVInput.value);
        const borderH = parseFloat(borderGaugeHInput.value);
        const borderV = parseFloat(borderGaugeVInput.value);
        
        const hasMainGauge = mainH > 0 && mainV > 0;
        const hasBorderGauge = borderH > 0 && borderV > 0;
        
        if (currentViewMode === 'side-by-side') {
            swatchOverlayContainer.innerHTML = '';
            swatchOverlayContainer.style.display = 'none';
            
            if (hasMainGauge) {
                mainSwatchPreview.innerHTML = `
                    <div class="swatch-container">${renderSwatchSVG(mainH, mainV, 5, '#8B5A6B', 1)}</div>
                    <div class="swatch-info">${mainH} st × ${mainV} rows</div>
                `;
            } else {
                mainSwatchPreview.innerHTML = '<div class="swatch-placeholder">Enter gauge to preview</div>';
            }
            
            if (hasBorderGauge) {
                borderSwatchPreview.innerHTML = `
                    <div class="swatch-container">${renderSwatchSVG(borderH, borderV, 5, '#4A7C59', 1)}</div>
                    <div class="swatch-info">${borderH} st × ${borderV} rows</div>
                `;
            } else {
                borderSwatchPreview.innerHTML = '<div class="swatch-placeholder">Enter gauge to preview</div>';
            }
        } else {
            mainSwatchPreview.innerHTML = '';
            borderSwatchPreview.innerHTML = '';
            
            if (hasMainGauge && hasBorderGauge) {
                swatchOverlayContainer.style.display = 'flex';
                swatchOverlayContainer.innerHTML = renderSwatchComparison(mainH, mainV, borderH, borderV, 'overlay');
            } else if (hasMainGauge || hasBorderGauge) {
                swatchOverlayContainer.style.display = 'flex';
                swatchOverlayContainer.innerHTML = '<div class="swatch-placeholder">Enter both gauges for overlay</div>';
            } else {
                swatchOverlayContainer.style.display = 'none';
                swatchOverlayContainer.innerHTML = '';
            }
        }
    }
    
    viewToggleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            viewToggleButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentViewMode = btn.dataset.view;
            updateCombineSwatchPreviews();
        });
    });
    
    [personalGaugeHInput, personalGaugeVInput, patternGaugeHInput, patternGaugeVInput].forEach(input => {
        input.addEventListener('input', updateSizeSwatches);
    });
    
    [pickupPersonalGaugeHInput, pickupPersonalGaugeVInput, pickupPatternGaugeHInput, pickupPatternGaugeVInput].forEach(input => {
        input.addEventListener('input', updatePickupSwatches);
    });
    
    [mainGaugeHInput, mainGaugeVInput, borderGaugeHInput, borderGaugeVInput].forEach(input => {
        input.addEventListener('input', updateCombineSwatchPreviews);
    });
    
    updateSizeSwatches();
    updatePickupSwatches();
    updateCombineSwatchPreviews();
    
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (tabPickup.contains(input)) {
                    calculatePickup();
                } else if (tabCombine.contains(input)) {
                    calculateCombine();
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
    
    function calculatePickup() {
        const personalGaugeH = parseFloat(pickupPersonalGaugeHInput.value);
        const personalGaugeV = parseFloat(pickupPersonalGaugeVInput.value);
        const patternGaugeH = parseFloat(pickupPatternGaugeHInput.value);
        const patternGaugeV = parseFloat(pickupPatternGaugeVInput.value);
        const patternStitches = parseInt(pickupStitchesInput.value);
        const patternRows = parseInt(pickupRowsInput.value);
        const totalRows = parseInt(totalRowsInput.value);
        
        if (!personalGaugeH || !personalGaugeV || !patternGaugeH || !patternGaugeV) {
            showPickupError('Please enter all gauge values.');
            return;
        }
        
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
            const stitchCount = pattern[i];
            let rows = 0;
            while (i < pattern.length && pattern[i] === stitchCount) {
                rows++;
                i++;
            }
            sequences.push({ stitches: stitchCount, rows });
        }
        
        let description;
        if (sequences.length === 1) {
            const s = sequences[0];
            if (s.stitches === 0) {
                description = `Skip ${s.rows} row${s.rows !== 1 ? 's' : ''}`;
            } else if (s.stitches === 1) {
                description = `Pick up 1 from each of ${s.rows} row${s.rows !== 1 ? 's' : ''}`;
            } else {
                description = `Pick up ${s.stitches} from each of ${s.rows} row${s.rows !== 1 ? 's' : ''}`;
            }
        } else {
            const parts = sequences.map(s => {
                if (s.stitches === 0) {
                    return `skip ${s.rows}`;
                } else if (s.rows === 1) {
                    return `pick up ${s.stitches}`;
                } else {
                    return `pick up ${s.stitches} × ${s.rows} rows`;
                }
            });
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
        return distribution.map(count => {
            if (count === 0) {
                return '<span class="dot"></span>';
            } else if (count === 1) {
                return '<span class="dot pickup"></span>';
            } else {
                return `<span class="dot pickup multi">${count}</span>`;
            }
        }).join('');
    }
    
    function calculateCombine() {
        const mainGaugeH = parseFloat(mainGaugeHInput.value);
        const mainGaugeV = parseFloat(mainGaugeVInput.value);
        const borderGaugeH = parseFloat(borderGaugeHInput.value);
        const borderGaugeV = parseFloat(borderGaugeVInput.value);
        const mainCount = parseInt(mainStitchesInput.value);
        const pickupAlong = document.querySelector('input[name="join-direction"]:checked').value;
        
        if (!mainCount) {
            showCombineError('Please enter the count on your main fabric edge.');
            return;
        }
        
        if (pickupAlong === 'along-stitches' && (!mainGaugeH || !borderGaugeH)) {
            showCombineError('Please enter stitches per 10cm for both fabrics.');
            return;
        }
        
        if (pickupAlong === 'along-rows' && (!mainGaugeV || !borderGaugeH)) {
            showCombineError('Please enter main fabric rows/10cm and border stitches/10cm.');
            return;
        }
        
        const result = calculateGaugeCombination(mainGaugeH, mainGaugeV, borderGaugeH, borderGaugeV, mainCount, pickupAlong);
        
        if (!result) {
            showCombineError('Could not calculate. Please check your inputs.');
            return;
        }
        
        displayCombineResult(result);
    }
    
    function showCombineError(message) {
        combineResultSection.classList.remove('hidden', 'warning');
        combineResultSection.classList.add('warning');
        combineResultContent.innerHTML = `<p class="explanation">${message}</p>`;
    }
    
    function displayCombineResult(result) {
        combineResultSection.classList.remove('hidden', 'warning');
        
        const edgeType = result.type === 'along-stitches' ? 'cast-on/bind-off' : 'selvedge';
        const summaryText = `Pick up ${result.borderStitches} stitches`;
        
        let detailText;
        if (result.type === 'along-stitches') {
            detailText = `Your main fabric has ${result.mainCount} stitches (${result.measurement}cm wide).`;
        } else {
            detailText = `Your main fabric has ${result.mainCount} rows (${result.measurement}cm tall).`;
        }
        
        if (result.borderStitches !== result.mainCount) {
            const diff = Math.abs(result.borderStitches - result.mainCount);
            const moreOrFewer = result.borderStitches > result.mainCount ? 'more' : 'fewer';
            detailText += ` With the border gauge, you need <strong>${diff} ${moreOrFewer}</strong> stitches to match the same measurement.`;
        }
        
        const ratioText = `<br><br>Ratio: <strong>${result.simplified.a} border stitches per ${result.simplified.b} main ${result.mainUnit}</strong>`;
        
        combineResultContent.innerHTML = `
            <div class="combine-summary">${summaryText}</div>
            <p class="explanation">${detailText}${ratioText}</p>
            <div class="distribution-pattern">
                <h4>Along ${edgeType} edge:</h4>
                <p class="pattern-text">Pick up <strong>${result.borderStitches}</strong> stitches over ${result.mainCount} ${result.mainUnit}</p>
            </div>
        `;
    }
});
