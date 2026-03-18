let currentMethod = 'cesar';
let shiftN = 3;
let charset = '';

const CHARSETS = {
  alpha: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  alphanum: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  printable: (()=>{
    let s='';
    for(let i=32;i<127;i++) s+=String.fromCharCode(i);
    return s;
  })()
};

// Frecuencia esperada de letras en español (a-z, normalizada)
const FREQ_ES = {
  a:0.1253, b:0.0142, c:0.0468, d:0.0586, e:0.1368, f:0.0069, g:0.0101,
  h:0.0070, i:0.0625, j:0.0044, k:0.0002, l:0.0497, m:0.0315, n:0.0671,
  o:0.0868, p:0.0251, q:0.0088, r:0.0687, s:0.0798, t:0.0463, u:0.0393,
  v:0.0090, w:0.0001, x:0.0022, y:0.0090, z:0.0052
};

document.addEventListener('DOMContentLoaded', () => {
  setCharset('alpha');
});

function setMethod(m) {
  currentMethod = m;
  document.getElementById('btn-cesar').classList.toggle('active', m==='cesar');
  document.getElementById('btn-atbash').classList.toggle('active', m==='atbash');
  document.getElementById('cesar-config').classList.toggle('visible', m==='cesar');
  document.getElementById('cesar-config').style.display = m==='cesar' ? 'block' : 'none';
  document.getElementById('atbash-info').style.display = m==='atbash' ? 'block' : 'none';
}

function updateShift(v) {
  shiftN = parseInt(v);
  document.getElementById('shift-display').textContent = v;
}

function setCharset(type) {
  ['alpha','alphanum','printable','custom'].forEach(t => {
    document.getElementById('cs-'+t).classList.toggle('active', t===type);
  });
  document.getElementById('custom-charset-row').style.display = type==='custom' ? 'block' : 'none';
  if(type !== 'custom') {
    charset = CHARSETS[type];
  } else {
    charset = document.getElementById('custom-charset-input').value || CHARSETS.alpha;
  }
  renderCharsetPreview();
}

function updateCustomCharset() {
  charset = document.getElementById('custom-charset-input').value || CHARSETS.alpha;
  charset = [...new Set(charset.split(''))].join('');
  renderCharsetPreview();
}

function renderCharsetPreview() {
  const el = document.getElementById('charset-preview');
  const unique = [...new Set(charset.split(''))].join('');
  charset = unique;
  el.innerHTML = 'Conjunto (' + unique.length + ' chars): ' +
    unique.split('').map(c => `<span>${c==' '?'&middot;':c}</span>`).join('');
}

function cesarEncrypt(text, shift, cs) {
  const n = cs.length;
  if(n === 0) return text;
  shift = ((shift % n) + n) % n;
  return text.split('').map(ch => {
    const idx = cs.indexOf(ch);
    if(idx === -1) return ch;
    return cs[(idx + shift) % n];
  }).join('');
}

function cesarDecrypt(text, shift, cs) {
  return cesarEncrypt(text, -shift, cs);
}

function atbashCipher(text, cs) {
  const n = cs.length;
  if(n === 0) return text;
  return text.split('').map(ch => {
    const idx = cs.indexOf(ch);
    if(idx === -1) return ch;
    return cs[n - 1 - idx];
  }).join('');
}

// Chi-cuadrado: mide qué tan parecida es la frecuencia de letras al español.
// Menor valor = más probable que sea texto real en español.
function chiSquaredScore(text) {
  const lower = text.toLowerCase();
  const letters = lower.split('').filter(c => c >= 'a' && c <= 'z');
  const total = letters.length;
  if (total === 0) return Infinity;

  const count = {};
  for (const c of letters) count[c] = (count[c] || 0) + 1;

  let chi = 0;
  for (const [letter, expectedFreq] of Object.entries(FREQ_ES)) {
    const observed = (count[letter] || 0) / total;
    const diff = observed - expectedFreq;
    chi += (diff * diff) / expectedFreq;
  }
  return chi;
}

// Prueba todos los shifts y ordena por chi-cuadrado (el menor gana).
function cesarBruteForce(text, cs) {
  const n = cs.length;
  if (n === 0) return [];

  const results = [];
  for (let s = 1; s <= n; s++) {
    const decrypted = cesarDecrypt(text, s, cs);
    const score = chiSquaredScore(decrypted);
    results.push({ shift: s, text: decrypted, score });
  }

  results.sort((a, b) => a.score - b.score);
  return results;
}

function process(mode) {
  const input = document.getElementById('input-text').value;
  if(!input.trim()) { showOutput('', null); return; }

  if (mode === 'encrypt') {
    let result;
    if (currentMethod === 'cesar') {
      result = cesarEncrypt(input, shiftN, charset);
    } else {
      result = atbashCipher(input, charset);
    }
    showOutput(result, null);
  } else {
    if (currentMethod === 'atbash') {
      showOutput(atbashCipher(input, charset), null);
    } else {
      const candidates = cesarBruteForce(input, charset);
      if (candidates.length === 0) { showOutput('', null); return; }
      const best = candidates[0];
      showOutput(best.text, best.shift, candidates);
    }
  }
}

function showOutput(text, detectedShift, candidates) {
  const box = document.getElementById('output-box');
  const ph  = document.getElementById('output-placeholder');
  const cp  = document.getElementById('copy-btn');

  box.querySelectorAll('#result-text, #shift-info, #candidates-list').forEach(el => el.remove());

  if (!text) {
    ph.style.display = 'inline';
    cp.style.display = 'none';
    return;
  }

  ph.style.display = 'none';
  cp.style.display = 'block';

  const tn = document.createElement('span');
  tn.id = 'result-text';
  tn.textContent = text;
  box.insertBefore(tn, box.firstChild);

  if (detectedShift !== null && detectedShift !== undefined) {
    const info = document.createElement('div');
    info.id = 'shift-info';
    info.style.cssText = `
      margin-top: 10px;
      font-size: 0.68rem;
      color: var(--accent2);
      letter-spacing: 1px;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    `;
    info.innerHTML = `<span style="background:rgba(168,85,160,0.1);border:1px solid rgba(168,85,160,0.3);
      border-radius:20px;padding:4px 12px;">
      🔍 desplazamiento detectado: <strong>${detectedShift}</strong>
    </span>`;

    if (candidates && candidates.length > 1) {
      const alts = candidates.slice(1, 4);
      const altContainer = document.createElement('div');
      altContainer.id = 'candidates-list';
      altContainer.style.cssText = `
        margin-top: 8px;
        font-size: 0.65rem;
        color: var(--dim);
        letter-spacing: 0.5px;
      `;
      altContainer.innerHTML = '<span style="opacity:0.7;">Otras posibilidades (click para usar):</span><br>';

      alts.forEach(c => {
        const btn = document.createElement('button');
        btn.style.cssText = `
          background: rgba(168,85,160,0.06);
          border: 1px solid rgba(168,85,160,0.2);
          border-radius: 8px;
          padding: 4px 10px;
          margin: 3px 3px 0 0;
          cursor: pointer;
          font-family: 'DM Mono', monospace;
          font-size: 0.63rem;
          color: var(--dim);
          text-align: left;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          transition: border-color 0.2s;
        `;
        const preview = c.text.length > 28 ? c.text.slice(0, 28) + '...' : c.text;
        btn.textContent = `N=${c.shift}: ${preview}`;
        btn.title = c.text;
        btn.onmouseenter = () => btn.style.borderColor = 'var(--accent2)';
        btn.onmouseleave = () => btn.style.borderColor = 'rgba(168,85,160,0.2)';
        btn.onclick = () => {
          document.getElementById('result-text').textContent = c.text;
          info.querySelector('strong').textContent = c.shift;
          altContainer.remove();
        };
        altContainer.appendChild(btn);
      });

      box.appendChild(info);
      box.appendChild(altContainer);
      return;
    }

    box.appendChild(info);
  }
}

function copyOutput() {
  const tn = document.getElementById('result-text');
  if(!tn) return;
  navigator.clipboard.writeText(tn.textContent).then(()=>{
    const btn = document.getElementById('copy-btn');
    btn.textContent = '✓ COPIADO';
    setTimeout(()=>btn.textContent='COPIAR', 1500);
  });
}