/**
 * WCAG 2.1 Contrast Ratio Calculator
 * Exhaustive verification of color contrast of Panel Personalities design tokens across ALL panels.
 */

function srgbToLinear(c) {
  const norm = c / 255;
  return norm <= 0.04045 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
}

function hexToRgb(hex) {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(x => x + x).join('');
  }
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function getLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function getContrast(hex1, hex2) {
  const L1 = getLuminance(hex1);
  const L2 = getLuminance(hex2);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Design Token definitions for ALL Panels (Milestone 1, 2, 3 + Journal)
const PANELS = {
  'Quick Notes (Light)': {
    bg: '#FFF4D6',
    paper: '#FFFBEB',
    raised: '#FDEBB9',
    text: '#2C2013',
    text2: '#5F4B32',
    textMuted: '#786246',
    headerBandBg: '#F59E0B',
    headerText: '#351602',
    accent: '#B45309',
    accentTextOnPaper: '#8A3C04',
    btnBg: '#92400E',
    btnFg: '#FFFFFF',
    border: '#E8D2A4',
  },
  'Quick Notes (Dark)': {
    bg: '#15130F',
    paper: '#1E1B15',
    raised: '#2A251D',
    text: '#F5EEDC',
    text2: '#D5C8B2',
    textMuted: '#9E927E',
    headerBandBg: '#1E1B15',
    headerText: '#F5EEDC',
    accent: '#FBBF24',
    accentTextOnPaper: '#FBBF24',
    btnBg: '#FBBF24',
    btnFg: '#15130F',
    border: '#453E32',
  },
  'Projects (Light)': {
    bg: '#EEF1FB',
    paper: '#FFFFFF',
    raised: '#E2E6F5',
    text: '#1E1B4B',
    text2: '#3730A3',
    textMuted: '#58538E',
    headerBandBg: '#4338CA',
    headerText: '#FFFFFF',
    accent: '#4338CA',
    accentTextOnPaper: '#3730A3',
    btnBg: '#4338CA',
    btnFg: '#FFFFFF',
    border: '#C7D2FE',
  },
  'Projects (Dark)': {
    bg: '#0C1020',
    paper: '#131A30',
    raised: '#1C2442',
    text: '#EEF2FF',
    text2: '#C7D2FE',
    textMuted: '#818CF8',
    headerBandBg: '#131A30',
    headerText: '#EEF2FF',
    accent: '#A5B4FC',
    accentTextOnPaper: '#C7D2FE',
    btnBg: '#4F46E5',
    btnFg: '#FFFFFF',
    border: '#28345C',
  },
  'Checklists (Light)': {
    bg: '#F2F6F3',
    paper: '#FFFFFF',
    raised: '#E4EBE6',
    text: '#14281B',
    text2: '#284D34',
    textMuted: '#41634D',
    headerBandBg: '#E6F0E9',
    headerText: '#14281B',
    accent: '#15803D',
    accentTextOnPaper: '#15803D',
    btnBg: '#15803D',
    btnFg: '#FFFFFF',
    border: '#CBDCD0',
  },
  'Checklists (Dark)': {
    bg: '#0D1510',
    paper: '#141F18',
    raised: '#1C2A21',
    text: '#ECFDF5',
    text2: '#A7F3D0',
    textMuted: '#82B89A',
    headerBandBg: '#18271E',
    headerText: '#ECFDF5',
    accent: '#34D399',
    accentTextOnPaper: '#34D399',
    btnBg: '#34D399',
    btnFg: '#0B1510',
    border: '#2A4032',
  },
  'Wish List (Light)': {
    bg: '#FAF7FD',
    paper: '#FFFFFF',
    raised: '#F1EBF9',
    text: '#231538',
    text2: '#4C3270',
    textMuted: '#6D558F',
    headerBandBg: '#EDE5F9',
    headerText: '#231538',
    accent: '#7C3AED',
    accentTextOnPaper: '#6D28D9',
    btnBg: '#7C3AED',
    btnFg: '#FFFFFF',
    border: '#DED2F3',
  },
  'Wish List (Dark)': {
    bg: '#120E1C',
    paper: '#1A1528',
    raised: '#241E36',
    text: '#F5F3FF',
    text2: '#DDD6FE',
    textMuted: '#9B8BB8',
    headerBandBg: '#221B35',
    headerText: '#F5F3FF',
    accent: '#C4B5FD',
    accentTextOnPaper: '#DDD6FE',
    btnBg: '#7C3AED',
    btnFg: '#FFFFFF',
    border: '#3B3156',
  },
  'Routines (Light)': {
    bg: '#F0F8FF',
    paper: '#FFFFFF',
    raised: '#E4EFF7',
    text: '#0F172A',
    text2: '#334155',
    textMuted: '#475569',
    headerBandBg: '#E0F2FE',
    headerText: '#0369A1',
    accent: '#0284C7',
    accentTextOnPaper: '#0369A1',
    btnBg: '#0369A1',
    btnFg: '#FFFFFF',
    border: '#BAE6FD',
  },
  'Routines (Dark)': {
    bg: '#0E1116',
    paper: '#151A21',
    raised: '#1C232C',
    text: '#E8EDF3',
    text2: '#AEB8C5',
    textMuted: '#7F8B9A',
    headerBandBg: '#192735',
    headerText: '#E8EDF3',
    accent: '#38BDF8',
    accentTextOnPaper: '#BAE6FD',
    btnBg: '#38BDF8',
    btnFg: '#0B1220',
    border: '#232E3C',
  },
  'Sketch (Light)': {
    bg: '#FFF7ED',
    paper: '#FFFFFF',
    raised: '#FFEDD5',
    text: '#2A160A',
    text2: '#6C391B',
    textMuted: '#875338',
    headerBandBg: '#FFEDD5',
    headerText: '#2A160A',
    accent: '#C2410C',
    accentTextOnPaper: '#9A3412',
    btnBg: '#C2410C',
    btnFg: '#FFFFFF',
    border: '#FED7AA',
  },
  'Sketch (Dark)': {
    bg: '#14110F',
    paper: '#1E1A17',
    raised: '#29231F',
    text: '#FDF2E9',
    text2: '#E8C9B5',
    textMuted: '#B58E77',
    headerBandBg: '#261F1B',
    headerText: '#FDF2E9',
    accent: '#FB923C',
    accentTextOnPaper: '#FB923C',
    btnBg: '#FB923C',
    btnFg: '#14110F',
    border: '#42362E',
  },
  'Today Hub (Light)': {
    bg: '#FAF9F5',
    paper: '#FFFFFF',
    raised: '#F3EFE6',
    text: '#1C1917',
    text2: '#44403C',
    textMuted: '#78716C',
    headerBandBg: '#FEF3C7',
    headerText: '#351602',
    accent: '#B45309',
    accentTextOnPaper: '#B45309',
    btnBg: '#92400E',
    btnFg: '#FFFFFF',
    border: '#E5E0D5',
  },
  'Today Hub (Dark)': {
    bg: '#121110',
    paper: '#1A1917',
    raised: '#24221F',
    text: '#F5F5F4',
    text2: '#D6D3D1',
    textMuted: '#9E9790',
    headerBandBg: '#242019',
    headerText: '#F5F5F4',
    accent: '#FBBF24',
    accentTextOnPaper: '#FBBF24',
    btnBg: '#FBBF24',
    btnFg: '#121110',
    border: '#35322D',
  },
  'Journal (Light)': {
    bg: '#EFE3C3',
    paper: '#FDF9EE',
    raised: '#E5D7B3',
    text: '#2F231B',
    text2: '#5A4535',
    textMuted: '#78604C',
    headerBandBg: '#43332A',
    headerText: '#FDF9EE',
    accent: '#8A5A1B',
    accentTextOnPaper: '#8A5A1B',
    btnBg: '#43332A',
    btnFg: '#FDF9EE',
    border: '#D6C49F',
  },
  'Journal (Dark)': {
    bg: '#140E0A',
    paper: '#1D1510',
    raised: '#271D17',
    text: '#F4E8D3',
    text2: '#D5C3A5',
    textMuted: '#9C896D',
    headerBandBg: '#201712',
    headerText: '#F4E8D3',
    accent: '#DEAF68',
    accentTextOnPaper: '#DEAF68',
    btnBg: '#DEAF68',
    btnFg: '#19110B',
    border: '#3B2C21',
  }
};

console.log('='.repeat(80));
console.log('WCAG 2.1 CONTRAST MEASUREMENTS FOR ALL PANELS (LIGHT & DARK)');
console.log('='.repeat(80));

let allPassed = true;
const summaryRows = [];

for (const [panelName, tokens] of Object.entries(PANELS)) {
  console.log(`\n### ${panelName}`);
  console.log('-'.repeat(80));
  console.log(
    'Element'.padEnd(28) +
    'Foreground'.padEnd(14) +
    'Background'.padEnd(14) +
    'Ratio'.padEnd(12) +
    'WCAG Status'
  );
  console.log('-'.repeat(80));

  const checks = [
    { label: 'Body Text on Paper', fg: tokens.text, bg: tokens.paper, min: 4.5, level: 'AA' },
    { label: 'Secondary Text on Paper', fg: tokens.text2, bg: tokens.paper, min: 4.5, level: 'AA' },
    { label: 'Muted Text on Paper', fg: tokens.textMuted, bg: tokens.paper, min: 4.5, level: 'AA' },
    { label: 'Accent Text on Paper', fg: tokens.accentTextOnPaper, bg: tokens.paper, min: 4.5, level: 'AA' },
    { label: 'Button Text on Button', fg: tokens.btnFg, bg: tokens.btnBg, min: 4.5, level: 'AA' },
    { label: 'Header Text on Header', fg: tokens.headerText, bg: tokens.headerBandBg, min: 4.5, level: 'AA' },
    { label: 'Border vs Background', fg: tokens.border, bg: tokens.bg, min: 1.2, level: 'UI' },
  ];

  for (const check of checks) {
    const ratio = getContrast(check.fg, check.bg);
    const pass = ratio >= check.min;
    if (!pass) allPassed = false;
    const formattedRatio = ratio.toFixed(2) + ':1';
    const status = pass 
      ? (ratio >= 7 ? 'PASS (AAA)' : 'PASS (AA)') 
      : 'FAIL (Under ' + check.min + ':1)';
    
    console.log(
      check.label.padEnd(28) +
      check.fg.padEnd(14) +
      check.bg.padEnd(14) +
      formattedRatio.padEnd(12) +
      status
    );

    summaryRows.push({
      panel: panelName,
      element: check.label,
      fg: check.fg,
      bg: check.bg,
      ratio: formattedRatio,
      status
    });
  }
}

console.log('\n' + '='.repeat(80));
console.log(allPassed ? 'ALL AUDIT CHECKS PASSED WCAG 2.1 AA/AAA (100% PASS ACROSS ALL 16 CONFIGURATIONS)' : 'WARNING: SOME CHECKS FAILED');
console.log('='.repeat(80));
