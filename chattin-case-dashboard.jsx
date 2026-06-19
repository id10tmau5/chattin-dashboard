const { useState, useEffect, useMemo, useRef } = React;

// ─── Theme Definitions ─────────────────────────────────────────────────────────
const DARK = {
  bg:          '#091623', surface: '#0F2236', card: '#142B42', cardHover: '#1A3452',
  border:      '#1C3650', borderStrong: '#2A4D6E',
  gold:        '#E8A020', goldFaint: 'rgba(232,160,32,0.13)',
  red:         '#E05858', redFaint: 'rgba(224,88,88,0.13)',
  orange:      '#E07830', orangeFaint: 'rgba(224,120,48,0.13)',
  green:       '#28C07A', greenFaint: 'rgba(40,192,122,0.13)',
  blue:        '#4AAEE4', blueFaint: 'rgba(74,174,228,0.13)',
  purple:      '#A888E8', purpleFaint: 'rgba(168,136,232,0.13)',
  text:        '#DCE8F4', textSub: '#8AAAC4', textDim: '#3E6080',
  mono:        "'Courier New', Courier, monospace",
  shadow:      '0 2px 8px rgba(0,0,0,0.4)',
  inputBg:     '#0F2236',
};
const LIGHT = {
  bg:          '#EEF2F7', surface: '#FFFFFF', card: '#FFFFFF', cardHover: '#F0F5FA',
  border:      '#C4D4E4', borderStrong: '#9AB4CC',
  gold:        '#8A6000', goldFaint: 'rgba(138,96,0,0.08)',
  red:         '#A82020', redFaint: 'rgba(168,32,32,0.08)',
  orange:      '#8A4010', orangeFaint: 'rgba(138,64,16,0.08)',
  green:       '#0F6E3C', greenFaint: 'rgba(15,110,60,0.08)',
  blue:        '#1060A0', blueFaint: 'rgba(16,96,160,0.08)',
  purple:      '#5030A0', purpleFaint: 'rgba(80,48,160,0.08)',
  text:        '#0C1E2E', textSub: '#2E4A66', textDim: '#6888A0',
  mono:        "'Courier New', Courier, monospace",
  shadow:      '0 2px 8px rgba(0,0,0,0.1)',
  inputBg:     '#FFFFFF',
};

// Mugshot loaded from mugshot-data.js via window.CHATTIN_MUGSHOT
const MUGSHOT = (typeof window !== 'undefined' && window.CHATTIN_MUGSHOT) || null;

const LINKS = {
  ujsSearch:    'https://ujsportal.pacourts.us/casesearch',
  docLocator:   'https://inmatelocator.cor.pa.gov/',
  paroleBoard:  'https://www.pbpp.pa.gov/',
  statePolice:  'https://epatch.pa.gov/',
  sciCambridge: 'https://www.cor.pa.gov/Facilities/StatePrisons/Pages/Cambridge-Springs.aspx',
  paDOC:        'https://www.cor.pa.gov/',
  vinelink:     'https://vinelink.vineapps.com/',
  ova:          'https://www.ova.pa.gov/',
};

const daysBetween = (a, b) => Math.floor((b - a) / 86400000);
const fmtDate  = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const fmtShort = (d) => d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
const yrsFromDays = (d) => (d / 365.25).toFixed(2);
const ageAt = (date) => {
  const dob = new Date(1991, 1, 21);
  let age = date.getFullYear() - dob.getFullYear();
  const m = date.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && date.getDate() < dob.getDate())) age--;
  return age;
};
const copyToClipboard = (text) => navigator.clipboard?.writeText(text).catch(() => {});

// ─── Grade Data ───────────────────────────────────────────────────────────────
const GRADE_DATA = [
  { grade: 'F1', label: 'First-Degree Felony',        maxPrison: '20 years',  maxFine: '$25,000', severity: 7, color: '#CC0000', inCase: [] },
  { grade: 'F2', label: 'Second-Degree Felony',       maxPrison: '10 years',  maxFine: '$25,000', severity: 6, color: '#E05050', inCase: ['Aggravated Assault (Seq 3)', 'Criminal Trespass (Seq 2)'] },
  { grade: 'F3', label: 'Third-Degree Felony',        maxPrison: '7 years',   maxFine: '$15,000', severity: 5, color: '#E07830', inCase: ['Access Device Fraud (Seq 4)'] },
  { grade: 'M1', label: 'First-Degree Misdemeanor',   maxPrison: '5 years',   maxFine: '$10,000', severity: 4, color: '#D0A010', inCase: ['Access Device Fraud (Seq 5)', 'Theft by Unlawful Taking (Seq 6)'] },
  { grade: 'M2', label: 'Second-Degree Misdemeanor',  maxPrison: '2 years',   maxFine: '$5,000',  severity: 3, color: '#888888', inCase: [] },
  { grade: 'M3', label: 'Third-Degree Misdemeanor',   maxPrison: '1 year',    maxFine: '$2,500',  severity: 2, color: '#668888', inCase: [] },
  { grade: 'S',  label: 'Summary Offense',            maxPrison: '90 days',   maxFine: '$300',    severity: 1, color: '#4488AA', inCase: [] },
];

// ─── Components ───────────────────────────────────────────────────────────────
const Badge = ({ label, color }) => (
  <span style={{
    fontFamily: "'Courier New',monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
    padding: '2px 7px', borderRadius: 3, border: `1px solid ${color}`,
    color, background: color + '25', whiteSpace: 'nowrap'
  }}>{label}</span>
);

const AgePill = ({ age, color }) => (
  <span style={{
    fontFamily: "'Courier New',monospace", fontSize: 10, fontWeight: 700,
    padding: '1px 6px', borderRadius: 99,
    background: (color) + '22', border: `1px solid ${color}55`,
    color, whiteSpace: 'nowrap'
  }}>age {age}</span>
);

const StatCard = ({ label, value, sub, accent, icon, C }) => (
  <div style={{
    background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
    padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 4,
    borderTop: `3px solid ${accent || C.gold}`, boxShadow: C.shadow
  }}>
    <div style={{ fontSize: 11, color: C.textSub, letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: C.mono }}>
      {icon && <span style={{ marginRight: 5 }}>{icon}</span>}{label}
    </div>
    <div style={{ fontSize: 26, fontWeight: 700, color: accent || C.gold, fontFamily: C.mono, lineHeight: 1.1 }}>
      {value}
    </div>
    {sub && <div style={{ fontSize: 12, color: C.textSub }}>{sub}</div>}
  </div>
);

const ProgressBar = ({ pct, color, height = 8, C }) => (
  <div style={{ background: C.border, borderRadius: 99, overflow: 'hidden', height }}>
    <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: color || C.gold, borderRadius: 99 }} />
  </div>
);

const Section = ({ title, icon, children, accent, C }) => (
  <div style={{ marginBottom: 24 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, borderBottom: `1px solid ${C.border}`, paddingBottom: 10 }}>
      {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
      <span style={{ fontFamily: C.mono, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: accent || C.gold }}>
        {title}
      </span>
    </div>
    {children}
  </div>
);

const Expand = ({ label, icon, children, accent, C, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', background: open ? C.cardHover : C.card,
        border: 'none', cursor: 'pointer', padding: '12px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: C.text
      }}>
        <span style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, color: C.text }}>
          {icon && <span>{icon}</span>}{label}
        </span>
        <span style={{ color: accent || C.gold, fontSize: 18, fontWeight: 300 }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div style={{ background: C.surface, padding: '14px 16px', borderTop: `1px solid ${C.border}` }}>
          {children}
        </div>
      )}
    </div>
  );
};

const ExLink = ({ href, label, icon, color }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" style={{
    display: 'inline-flex', alignItems: 'center', gap: 6, color, textDecoration: 'none',
    fontSize: 12, padding: '5px 10px', border: `1px solid ${color}55`,
    borderRadius: 6, background: color + '12', fontFamily: "'Courier New',monospace", letterSpacing: 0.5,
  }}>{icon && <span>{icon}</span>}{label} ↗</a>
);

const DocketLink = ({ docket, label, C }) => {
  const [copied, setCopied] = useState(false);
  const handle = async (e) => {
    e.preventDefault();
    const ok = await copyToClipboard(docket);
    setCopied(ok ? 'copied' : 'failed');
    setTimeout(() => setCopied(false), 2400);
    window.open(LINKS.ujsSearch, '_blank');
  };
  const col = copied === 'copied' ? C.green : copied === 'failed' ? C.orange : C.gold;
  return (
    <a href={LINKS.ujsSearch} onClick={handle} target="_blank" rel="noopener noreferrer"
      title={`Opens UJS Portal + copies "${docket}" to clipboard`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: C.mono,
        fontSize: 11, color: col, textDecoration: 'none',
        padding: '2px 8px', border: `1px solid ${col}55`,
        borderRadius: 4, background: col + '12', cursor: 'pointer' }}>
      📄 {copied === 'copied' ? '✓ Copied!' : copied === 'failed' ? '⚠ Try manual paste' : (label || docket)}
    </a>
  );
};

const InfoRow = ({ label, value, mono, color, C }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '5px 0', borderBottom: `1px solid ${C.border}` }}>
    <span style={{ fontSize: 11, color: C.textSub }}>{label}</span>
    <span style={{ fontFamily: mono ? C.mono : 'inherit', fontSize: 12, color: color || C.text, fontWeight: 600, textAlign: 'right' }}>{value}</span>
  </div>
);

// ─── Main Dashboard ────────────────────────────────────────────────────────────
function CaseDashboard() {
  const [themeMode, setThemeMode] = useState('dark');
  const [sysDark, setSysDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setSysDark(e.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  const C = useMemo(() => {
    const effective = themeMode === 'system' ? (sysDark ? 'dark' : 'light') : themeMode;
    return effective === 'dark' ? DARK : LIGHT;
  }, [themeMode, sysDark]);

  // ── GitHub / Status state & logic ───────────────────────────────────────
  const REPO_OWNER  = 'id10tmau5';
  const REPO_NAME   = 'chattin-dashboard';
  const WORKFLOW_ID = 'check-status.yml';
  const SECRET_NAME = 'ANTHROPIC_API_KEY';

  const [docStatus,     setDocStatus]     = useState(null);
  const [lastChecked,   setLastChecked]   = useState(null);
  const [loadStatus,    setLoadStatus]    = useState('idle');  // idle|loading|ok|err
  const [loadError,     setLoadError]     = useState(null);
  const [triggerStatus, setTriggerStatus] = useState('idle'); // idle|loading|ok|err
  const [triggerMsg,    setTriggerMsg]    = useState(null);
  const [configOpen,    setConfigOpen]    = useState(false);
  const [ghTokenInput,  setGhTokenInput]  = useState('');
  const [apiKeyInput,   setApiKeyInput]   = useState('');
  const [tokenSaved,    setTokenSaved]    = useState(false);
  const [apiKeyMsg,     setApiKeyMsg]     = useState(null);
  const [checkCooldown, setCheckCooldown] = useState(0);    // seconds remaining before Check for Updates re-enables
  const [buildStatus,   setBuildStatus]   = useState('idle'); // idle|loading|ok|err
  const [buildMsg2,     setBuildMsg2]     = useState(null);

  // ── Owner mode (hidden controls revealer) ──────────────────────────────────
  // Desktop: Ctrl+Shift+U toggles. Mobile: 5 rapid taps on the footer source line.
  // This is UI decluttering only — NOT a security boundary. The real protection
  // is that the access token lives only in the owner's browser localStorage.
  const [ownerMode, setOwnerMode] = useState(() => {
    try { return localStorage.getItem('chattin_owner_mode') === '1'; } catch { return false; }
  });
  const tapState = useRef({ count: 0, last: 0 });

  const toggleOwnerMode = () => {
    setOwnerMode(prev => {
      const next = !prev;
      try { localStorage.setItem('chattin_owner_mode', next ? '1' : '0'); } catch {}
      return next;
    });
  };

  useEffect(() => {
    const onKey = (e) => {
      // Ctrl+Shift+U  (or Cmd+Shift+U on Mac)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
        toggleOwnerMode();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Mobile reveal: 5 rapid taps (within 2s) on the footer source line
  const handleSecretTap = () => {
    const now = Date.now();
    const s = tapState.current;
    if (now - s.last < 600) { s.count += 1; } else { s.count = 1; }
    s.last = now;
    if (s.count >= 5) { s.count = 0; toggleOwnerMode(); }
  };   // feedback for the footer rebuild button

  const getGhToken = () => { try { return localStorage.getItem('chattin_gh_token') || ''; } catch { return ''; } };

  // Countdown tick — fires every second while checkCooldown > 0
  useEffect(() => {
    if (checkCooldown <= 0) return;
    const t = setTimeout(() => setCheckCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [checkCooldown]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('docStatus_PE1239');
      if (raw) {
        const p = JSON.parse(raw);
        setDocStatus(p.data);
        if (p.data?.lastChecked) setLastChecked(new Date(p.data.lastChecked));
      }
    } catch (e) { /* no cache */ }
    setGhTokenInput(getGhToken());
  }, []);

  const handleLoadStatus = async () => {
    setLoadStatus('loading'); setLoadError(null);
    try {
      const resp = await fetch('./status.json?t=' + Date.now());
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setDocStatus(data);
      if (data.lastChecked) setLastChecked(new Date(data.lastChecked));
      try { localStorage.setItem('docStatus_PE1239', JSON.stringify({ data, timestamp: new Date().toISOString() })); } catch (e) {}
      setLoadStatus('ok');
      setTimeout(() => setLoadStatus('idle'), 2500);
    } catch (err) { setLoadError(err.message); setLoadStatus('err'); }
  };

  const handleRunCheck = async () => {
    const token = getGhToken();
    if (!token) {
      setTriggerMsg('⚠ Open ⚙ Configure and save your GitHub Token first.'); setTriggerStatus('err');
      setTimeout(() => { setTriggerStatus('idle'); setTriggerMsg(null); }, 5000); return;
    }
    setTriggerStatus('loading'); setTriggerMsg(null);
    try {
      const resp = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/${WORKFLOW_ID}/dispatches`,
        { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' }, body: JSON.stringify({ ref: 'main' }) }
      );
      if (resp.status === 204) {
        setTriggerStatus('ok');
        setTriggerMsg('✓ Status check running — tap Check for Updates in about 45 seconds.');
        setCheckCooldown(45);
      } else {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${resp.status}`);
      }
    } catch (err) { setTriggerStatus('err'); setTriggerMsg(`⚠ ${err.message}`); }
    setTimeout(() => { setTriggerStatus('idle'); setTriggerMsg(null); }, 10000);
  };

  const handleSaveToken = () => {
    try { localStorage.setItem('chattin_gh_token', ghTokenInput.trim()); } catch (e) {}
    setTokenSaved(true); setTimeout(() => setTokenSaved(false), 2200);
  };

  const handleUpdateApiKey = () => {
    // Opens GitHub Secrets settings directly — simpler and more reliable
    // than browser-side encryption (which required libsodium, a CJS-only package
    // that can't load as a plain browser script tag).
    window.open(
      `https://github.com/${REPO_OWNER}/${REPO_NAME}/settings/secrets/actions`,
      '_blank'
    );
    setApiKeyMsg('↗ GitHub Secrets settings opened in a new tab. Update ANTHROPIC_API_KEY there.');
    setTimeout(() => setApiKeyMsg(null), 6000);
  };

  // ── Trigger build.yml (recompile JSX → JS) ────────────────────────────────
  const handleBuildTrigger = async () => {
    const token = getGhToken();
    if (!token) {
      setBuildMsg2('⚠ Set GitHub Token in ⚙ configure first.');
      setBuildStatus('err');
      setTimeout(() => { setBuildStatus('idle'); setBuildMsg2(null); }, 5000);
      return;
    }
    setBuildStatus('loading'); setBuildMsg2(null);
    try {
      const resp = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/build.yml/dispatches`,
        { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' }, body: JSON.stringify({ ref: 'main' }) }
      );
      if (resp.status === 204) {
        setBuildStatus('ok');
        setBuildMsg2('✓ Build queued — check Actions tab for progress.');
      } else {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.message || `HTTP ${resp.status}`);
      }
    } catch (err) {
      setBuildStatus('err');
      setBuildMsg2(`✕ ${err.message}`);
    }
    setTimeout(() => { setBuildStatus('idle'); setBuildMsg2(null); }, 9000);
  };

    const StatusCheckerWidget = () => {
    const scColors = { Inmate: C.red, Parolee: C.gold, Discharged: C.green };
    const scLabels = { Inmate: '🔒 INCARCERATED', Parolee: '📋 ON PAROLE', Discharged: '✅ DISCHARGED' };
    const sc = scColors[docStatus?.status] || C.blue;
    const fmtTS = (ts) => {
      if (!ts) return null;
      const d = ts instanceof Date ? ts : new Date(ts);
      return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) + ' at ' + d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
    };
    return (
      <div style={{ marginBottom: 24 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, borderBottom:`1px solid ${C.border}`, paddingBottom:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:16 }}>🔄</span>
            <span style={{ fontFamily:C.mono, fontSize:11, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:C.green }}>DOC Status Checker</span>
          </div>
          {ownerMode && (
          <button onClick={() => setConfigOpen(o => !o)} style={{ background:'none', border:'none', cursor:'pointer', fontFamily:C.mono, fontSize:9, color:C.textDim, letterSpacing:0.5, padding:'2px 6px', borderRadius:4, textDecoration:configOpen?'none':'underline' }}>
            ⚙ {configOpen ? 'close' : 'setup'}
          </button>
          )}
        </div>

        {configOpen && (
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:'14px 16px', marginBottom:14 }}>
            <div style={{ fontFamily:C.mono, fontSize:9, color:C.textDim, letterSpacing:1.5, marginBottom:12 }}>CONFIGURATION</div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, color:C.textSub, marginBottom:5 }}>
                Access Token <span style={{ color:C.textDim, fontSize:10 }}>(one-time setup · stored in browser only)</span>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <input type="password" placeholder="enter access token…" value={ghTokenInput} onChange={e => setGhTokenInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveToken()}
                  style={{ flex:1, padding:'7px 10px', borderRadius:6, border:`1px solid ${C.border}`, background:C.card, color:C.text, fontFamily:C.mono, fontSize:11 }} />
                <button onClick={handleSaveToken} style={{ padding:'7px 14px', borderRadius:6, border:`1px solid ${C.green}`, background:tokenSaved ? C.green : C.greenFaint, color:tokenSaved ? '#fff' : C.green, fontFamily:C.mono, fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
                  {tokenSaved ? '✓ Saved' : 'Save Token'}
                </button>
              </div>
            </div>
            <div>
              <div style={{ fontSize:11, color:C.textSub, marginBottom:5 }}>
                Update Service Key <span style={{ color:C.textDim, fontSize:10 }}>(optional · requires token above)</span>
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <input type="password" placeholder="enter new key…" value={apiKeyInput} onChange={e => setApiKeyInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleUpdateApiKey()}
                  style={{ flex:1, minWidth:160, padding:'7px 10px', borderRadius:6, border:`1px solid ${C.border}`, background:C.card, color:C.text, fontFamily:C.mono, fontSize:11 }} />
                <button onClick={handleUpdateApiKey} style={{ padding:'7px 14px', borderRadius:6, border:`1px solid ${C.gold}`, background:C.goldFaint, color:C.gold, fontFamily:C.mono, fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
                  ↗ Manage Key
                </button>
              </div>
              {apiKeyMsg && <div style={{ fontSize:11, marginTop:6, color:apiKeyMsg.startsWith('✓') ? C.green : C.red }}>{apiKeyMsg}</div>}
            </div>
          </div>
        )}

        <div style={{ background:C.card, border:`2px solid ${C.green}44`, borderRadius:10, padding:'18px 20px' }}>
          <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
            <button onClick={handleLoadStatus} disabled={loadStatus === 'loading' || checkCooldown > 0} style={{
              padding:'10px 18px', borderRadius:8,
              border:`2px solid ${checkCooldown > 0 ? C.textDim : C.blue}`,
              background: loadStatus==='loading' ? C.surface : loadStatus==='ok' ? C.green : checkCooldown > 0 ? C.surface : C.blueFaint,
              color: loadStatus==='ok' ? '#fff' : checkCooldown > 0 ? C.textDim : C.blue,
              fontFamily:C.mono, fontSize:12, fontWeight:700,
              cursor: loadStatus==='loading' || checkCooldown > 0 ? 'not-allowed' : 'pointer',
              flexShrink:0, opacity: checkCooldown > 0 ? 0.55 : 1, transition:'all 0.3s'
            }}>
              {loadStatus === 'loading'
                ? '⏳ Loading…'
                : loadStatus === 'ok'
                  ? '✓ Refreshed'
                  : checkCooldown > 0
                    ? `⏳ ${checkCooldown}s`
                    : '🔄 Check for Updates'}
            </button>
            {ownerMode && (
            <button onClick={handleRunCheck} disabled={triggerStatus === 'loading'} style={{
              padding:'10px 18px', borderRadius:8, border:`2px solid ${C.gold}`,
              background: triggerStatus==='loading' ? C.surface : triggerStatus==='ok' ? C.green : C.goldFaint,
              color: triggerStatus==='ok' ? '#fff' : C.gold, fontFamily:C.mono, fontSize:12, fontWeight:700,
              cursor:triggerStatus==='loading'?'wait':'pointer', flexShrink:0
            }}>
              {triggerStatus==='loading' ? '⏳ Triggering…' : triggerStatus==='ok' ? '✓ Triggered!' : '⚡ Run Status Check'}
            </button>
            )}
          </div>

          {triggerMsg && <div style={{ padding:'9px 14px', borderRadius:7, marginBottom:14, fontSize:12, background:triggerStatus==='ok'?C.greenFaint:C.redFaint, border:`1px solid ${triggerStatus==='ok'?C.green:C.red}44`, color:triggerStatus==='ok'?C.green:C.red }}>{triggerMsg}</div>}
          {loadError && <div style={{ padding:'9px 14px', borderRadius:7, marginBottom:14, fontSize:12, background:C.redFaint, border:`1px solid ${C.red}44`, color:C.red }}>⚠ {loadError} — make sure the repo is live on GitHub Pages</div>}

          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 14px', marginBottom:14, fontSize:12, color:C.textSub, lineHeight:1.6 }}>
            <strong style={{ color:C.text }}>Check for Updates</strong> loads the last known status instantly. <strong style={{ color:C.text }}>Run Status Check</strong> performs a fresh lookup — results typically appear within 30–60 seconds. Tap Check for Updates again after to see them.
          </div>

          {lastChecked && (
            <div style={{ fontFamily:C.mono, fontSize:10, color:C.textDim, marginBottom:14, display:'inline-block', padding:'4px 10px', background:C.surface, borderRadius:5 }}>
              Last workflow run: {fmtTS(lastChecked)} {docStatus?.checkedBy ? `· ${docStatus.checkedBy}` : ''}
            </div>
          )}

          {docStatus ? (
            <div>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:14, alignItems:'center' }}>
                <span style={{ padding:'6px 16px', borderRadius:99, fontFamily:C.mono, fontSize:13, fontWeight:700, background:sc+'18', color:sc, border:`2px solid ${sc}55` }}>
                  {scLabels[docStatus.status] || '❓ UNKNOWN'}
                </span>
                {docStatus.confidence && <span style={{ fontFamily:C.mono, fontSize:10, color:C.textDim, padding:'4px 8px', border:`1px solid ${C.border}`, borderRadius:4 }}>Confidence: {docStatus.confidence}</span>}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(185px,1fr))', gap:10, marginBottom:14 }}>
                {[['Current Location',docStatus.currentLocation],['Permanent Location',docStatus.permanentLocation],['Inmate #',docStatus.inmateNumber],['Parole #',docStatus.paroleNumber],['Age on Record',docStatus.age],['Last DOC Update',docStatus.lastDOCUpdate]].filter(([,v])=>v).map(([k,v])=>(
                  <div key={k} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px' }}>
                    <div style={{ fontSize:10, color:C.textSub, letterSpacing:1, fontFamily:C.mono, marginBottom:3 }}>{k.toUpperCase()}</div>
                    <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{v}</div>
                  </div>
                ))}
              </div>
              {docStatus.notes && <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:'12px', fontSize:12, color:C.textSub, lineHeight:1.7, marginBottom:10 }}><div style={{ fontFamily:C.mono, fontSize:10, color:C.textDim, marginBottom:5 }}>NOTES / DETAILS</div>{docStatus.notes}</div>}
              {docStatus.sourcesChecked?.length > 0 && <div style={{ fontFamily:C.mono, fontSize:10, color:C.textDim }}>Sources: {docStatus.sourcesChecked.join(' · ')}</div>}
            </div>
          ) : (
            <div style={{ textAlign:'center', padding:'24px 20px', color:C.textDim }}>
              <div style={{ fontSize:32, marginBottom:10 }}>🔍</div>
              <div style={{ fontSize:13 }}>Hit <strong style={{ color:C.blue }}>Check for Updates</strong> to load the last workflow result, or <strong style={{ color:C.gold }}>Run Status Check</strong> to trigger a fresh query.</div>
            </div>
          )}
        </div>
        <div style={{ marginTop:10, fontSize:11, color:C.textSub, lineHeight:1.7 }}>
          Official: <a href="https://inmatelocator.cor.pa.gov/" target="_blank" rel="noopener noreferrer" style={{ color:C.blue }}>DOC Locator (PE1239)</a> · <a href="https://vinelink.dhs.gov/" target="_blank" rel="noopener noreferrer" style={{ color:C.blue }}>VINELink</a> · <a href="https://vinelink.vineapps.com/state/PA" target="_blank" rel="noopener noreferrer" style={{ color:C.blue }}>PA VINE</a>
        </div>
      </div>
    );
  };

  const gradeC = (g) => g.startsWith('F2') ? C.red : g.startsWith('F3') ? C.orange : C.gold;

  // ── Responsive breakpoint ────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 640
  );
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  // ── Theme toggle options ────────────────────────────────────────────────────
  const themeOptions = [
    { id: 'dark',   label: '🌙 Dark'  },
    { id: 'light',  label: '☀️ Light' },
    { id: 'system', label: '💻 Auto'  },
  ];

  // ── Badge weight style helper ────────────────────────────────────────────────
  const wStyle = (c) => ({
    background: c + (C === DARK ? '28' : '16'), color: c, border: `1px solid ${c}`,
    fontFamily: C.mono, fontSize: 9, fontWeight: 700, letterSpacing: 1.5,
    padding: '2px 6px', borderRadius: 3, whiteSpace: 'nowrap'
  });

  // ── PA Grade Scale data ──────────────────────────────────────────────────────
  const paGrades = [
    { grade: 'F1', name: 'Felony 1st Degree',      maxPrison: '20 years', maxFine: '$25,000', ogsRange: '10–14', color: '#C00000' },
    { grade: 'F2', name: 'Felony 2nd Degree',      maxPrison: '10 years', maxFine: '$25,000', ogsRange: '5–9',   color: C.red     },
    { grade: 'F3', name: 'Felony 3rd Degree',      maxPrison: '7 years',  maxFine: '$15,000', ogsRange: '3–5',   color: C.orange  },
    { grade: 'M1', name: 'Misdemeanor 1st Degree', maxPrison: '5 years',  maxFine: '$10,000', ogsRange: '1–4',   color: C.gold    },
    { grade: 'M2', name: 'Misdemeanor 2nd Degree', maxPrison: '2 years',  maxFine: '$5,000',  ogsRange: '1–3',   color: C.textSub },
    { grade: 'M3', name: 'Misdemeanor 3rd Degree', maxPrison: '1 year',   maxFine: '$2,500',  ogsRange: '1–2',   color: C.textDim },
    { grade: 'S',  name: 'Summary Offense',        maxPrison: '90 days',  maxFine: '$300',    ogsRange: '1',     color: C.textDim },
  ];

  // ── Key Dates ──────────────────────────────────────────────────────────────
  const TODAY       = new Date(2026, 5, 16);
  const OFFENSE     = new Date(2021, 0, 10);
  const ARREST      = new Date(2021, 0, 18);
  const SENTENCED   = new Date(2021, 5, 8);
  const SCI         = new Date(2021, 6, 23);
  const MUGSHOT_DT  = new Date(2026, 5, 1);
  const MIN_DATE    = new Date(2026, 5, 8);
  const MAX_DATE    = new Date(2033, 5, 8);
  const OPT_DATE    = new Date(2027, 5, 8);
  const LIKELY_DATE = new Date(2028, 11, 1);
  const PESS_DATE   = new Date(2031, 2, 1);

  const daysOffense      = daysBetween(OFFENSE,   TODAY);
  const daysArrest       = daysBetween(ARREST,    TODAY);
  const daysSentenced    = daysBetween(SENTENCED, TODAY);
  const daysPastMin      = daysBetween(MIN_DATE,  TODAY);
  const daysToMax        = daysBetween(TODAY,     MAX_DATE);
  const totalMaxDays     = daysBetween(SENTENCED, MAX_DATE);
  const pctMax           = ((daysSentenced / totalMaxDays) * 100).toFixed(1);
  const estimatedCost    = Math.round((daysArrest / 365.25) * 47000);
  const daysToOpt        = daysBetween(TODAY, OPT_DATE);
  const daysToLikely     = daysBetween(TODAY, LIKELY_DATE);
  const daysToPess       = daysBetween(TODAY, PESS_DATE);
  const daysMugshotToMin = daysBetween(MUGSHOT_DT, MIN_DATE);
  const currentAge       = ageAt(TODAY);
  const daysToNextBD     = daysBetween(TODAY, new Date(2027, 1, 21));

  const charges = [
    { seq: 3, grade: 'F2', label: 'Aggravated Assault', sub: 'Attempts to cause BI w/ deadly weapon', statute: '18 §2702 §§A4', minMo: 30, maxMo: 72, role: 'ANCHOR', roleColor: C.gold },
    { seq: 4, grade: 'F3', label: 'Access Device Fraud', sub: 'Used unauthorized — Count 1 (CONSECUTIVE)', statute: '18 §4106 §§A1II', minMo: 30, maxMo: 72, role: 'CONSECUTIVE', roleColor: C.red },
    { seq: 2, grade: 'F2', label: 'Criminal Trespass', sub: 'Break Into Structure', statute: '18 §3503 §§A1II', minMo: 18, maxMo: 36, role: 'CONCURRENT', roleColor: C.textDim },
    { seq: 5, grade: 'M1', label: 'Access Device Fraud', sub: 'Used unauthorized — Count 2', statute: '18 §4106 §§A1II', minMo: 15, maxMo: 30, role: 'CONCURRENT', roleColor: C.textDim },
    { seq: 6, grade: 'M1', label: 'Theft by Unlawful Taking', sub: 'Movable property — purse & cell phone', statute: '18 §3921 §§A', minMo: 18, maxMo: 36, role: 'CONCURRENT', roleColor: C.textDim },
  ];

  const priorCases = [
    { year: '2009', arrestAge: 18, sentAge: 19, docket: 'CP-54-CR-0000327-2010', charge: 'Corruption of Minors', grade: 'M1', outcome: 'IPP — 12 months' },
    { year: '2016', arrestAge: 25, sentAge: 26, docket: 'CP-54-CR-0001864-2016', charge: 'Retail Theft', grade: 'M2', outcome: 'Probation — 18 months' },
    { year: '2019', arrestAge: 27, sentAge: 28, docket: 'CP-54-CR-0000461-2019', charge: 'Drug Paraphernalia', grade: 'M', outcome: 'Probation — 12 months' },
    { year: '2019', arrestAge: 28, sentAge: 28, docket: 'CP-54-CR-0000540-2019', charge: 'Crim. Trespass F3 + Drug Possession ×3', grade: 'F3/M', outcome: 'Confinement — 3–12 mo each' },
    { year: '2019', arrestAge: 28, sentAge: 28, docket: 'CP-54-CR-0000143-2020', charge: 'Drug Charges ×5 + Open Lewdness', grade: 'M', outcome: 'Lower Court Guilty Pleas' },
    { year: '2019 ★', arrestAge: 28, sentAge: 28, docket: 'CP-54-CR-0001924-2019', charge: 'Drug Possession ×2 — ACTIVE (Revocation Apr 2021)', grade: 'M', outcome: 'Violated while 2021 offenses occurred', highlight: true },
    { year: '2021', arrestAge: 29, sentAge: 30, docket: 'CP-54-CR-0000437-2021', charge: 'Criminal Trespass F2 — 2nd property (squatting)', grade: 'F2', outcome: 'Confinement — 1–2 years (concurrent)' },
  ];

  const tlEvents = [
    { date: OFFENSE,    label: 'Offense Date',            sub: "Breaks into grandmother's home — assault, theft", dot: C.red,    age: ageAt(OFFENSE) },
    { date: ARREST,     label: 'Arrested',                sub: 'Pottsville PD · Off. Hamilton · Incident #2100223', dot: C.orange, age: ageAt(ARREST) },
    { date: SENTENCED,  label: 'Sentenced',               sub: 'Guilty Plea · Judge Baldwin · 60–144 months', dot: C.gold,   age: ageAt(SENTENCED) },
    { date: SCI,        label: 'Transferred to SCI',      sub: 'SCI Cambridge Springs — women\'s state prison', dot: C.blue,   age: ageAt(SCI) },
    { date: MUGSHOT_DT, label: 'New Mugshot Taken',       sub: `DOC photo updated — ${daysMugshotToMin}d before minimum → parole processing signal`, dot: C.purple, age: ageAt(MUGSHOT_DT) },
    { date: MIN_DATE,   label: '✓ MINIMUM DATE REACHED',  sub: 'Parole eligibility unlocked · Parole #345JW active', dot: C.green, age: ageAt(MIN_DATE) },
    { date: OPT_DATE,   label: 'Optimistic Release (est.)', sub: 'Best-case parole scenario', dot: C.textDim, age: ageAt(OPT_DATE), future: true },
    { date: LIKELY_DATE,label: 'Likely Release (est.)',   sub: 'Most probable parole range', dot: C.textDim, age: ageAt(LIKELY_DATE), future: true },
    { date: PESS_DATE,  label: 'Pessimistic (est.)',      sub: 'Multiple denial scenario', dot: C.textDim, age: ageAt(PESS_DATE), future: true },
    { date: MAX_DATE,   label: 'Maximum Sentence Expiry', sub: 'Mandatory release — June 8, 2033', dot: C.textDim, age: ageAt(MAX_DATE), future: true },
  ];

  const ageTimeline = [
    { age: 18, year: '2009', label: 'First Arrest',    note: 'Corruption/Minors', color: C.gold },
    { age: 19, year: '2010', label: 'Sentenced IPP',   note: '12 months', color: C.gold },
    { age: 25, year: '2016', label: 'Theft Charged',   note: 'M2', color: C.gold },
    { age: 26, year: '2017', label: 'Probation',       note: '18 months', color: C.gold },
    { age: 28, year: '2019', label: 'Multi Cases',     note: 'Drugs+Trespass', color: C.orange },
    { age: 29, year: '2021', label: 'Offense/Arrest',  note: 'Assault+Burglary', color: C.red },
    { age: 30, year: '2021', label: 'Sentenced',       note: '5–12 yrs State', color: C.red },
    { age: 35, year: '2026', label: '★ Min. Reached',  note: 'Parole-eligible', color: C.green, current: true },
    { age: 36, year: '2027', label: 'Optimistic',      note: '~20–35%', color: C.textDim, future: true },
    { age: 37, year: '2028', label: 'Likely',          note: '~50–65%', color: C.textDim, future: true },
    { age: 40, year: '2031', label: 'Pessimistic',     note: '~85%', color: C.textDim, future: true },
    { age: 42, year: '2033', label: 'Max Release',     note: 'Mandatory', color: C.textDim, future: true },
  ];

  const against = [
    { w: 'CRITICAL', c: C.red,    label: 'Violent Offense — Anchor Charge (F2)', detail: 'Aggravated Assault with a deadly weapon (F2) carries up to 10 years per charge and is classified as violent under PA law. Board policy requires heightened scrutiny for violent offenders regardless of minimum date — typically 1–3 hearing cycles before a grant.' },
    { w: 'CRITICAL', c: C.red,    label: 'Pattern of Failed Supervision (12+ Years)', detail: 'Chattin cycled through IPP, multiple probation terms, and short county confinements across six prior cases from 2009–2021 without sustained change. Repeated failures across every supervision type are among the Board\'s most predictive factors for future violations.' },
    { w: 'HIGH',     c: C.orange, label: 'New Offense Committed While on Active Supervision', detail: 'The January 2021 offense occurred while she remained under the active 2019 case (CP-54-CR-0001924-2019), which itself resulted in a revocation hearing in April 2021. Committing new crimes during supervision is one of the highest-weighted negative factors in Board assessments.' },
    { w: 'HIGH',     c: C.orange, label: 'Prior Record Scope and Escalation', detail: 'Seven prior cases 2009–2021, escalating from misdemeanor IPP at age 18 through F3 felonies to violent F2 felonies at age 29. The trajectory shows progressive disregard for supervision conditions over a 12-year span, substantially elevating her Prior Record Score under the PA Sentencing Guidelines.' },
    { w: 'MODERATE', c: C.gold,   label: 'Initial Accountability Resistance (PCRA Filing)', detail: 'A PCRA petition was filed within months of sentencing and dismissed December 2021, indicating an initial posture of challenging the conviction rather than accepting responsibility — a factor Board interviewers probe directly.' },
    { w: 'MODERATE', c: C.gold,   label: 'Drug Treatment Resentencing Denied (Aug 2023)', detail: 'A petition for resentencing under the State Drug Treatment Program was denied by Judge Hale in August 2023. While it reflects addiction awareness, the denial signals the court did not find her suitable for alternative programming at that stage.' },
    { w: 'LOW',      c: C.blue,   label: 'Outstanding Financial Obligations', detail: '$376.92 remaining including $339.92 victim restitution, plus $5,990.22 overdue on the consolidated payment plan from older cases.' },
  ];

  const inFavor = [
    { w: 'NOTABLE',  c: C.green, label: 'Minimum Date Reached + Parole #345JW Active', detail: 'The 60-month minimum was reached June 8, 2026. Parole Number 345JW has been assigned and a new mugshot was captured just 7 days prior on June 1, 2026 — strong indicators that she is actively in parole processing and a Board review is imminent or has already occurred.' },
    { w: 'NOTABLE',  c: C.green, label: 'Consistent DOC Payment Compliance (4+ Years)', detail: 'Monthly ACT 84 inmate wage deductions from August 2021 through May 2026 — over 4 continuous years — suggest sustained institutional employment and consistent conduct, both favorable signals for a Board hearing.' },
    { w: 'MODERATE', c: C.gold,  label: 'Demonstrated Drug Treatment Self-Awareness', detail: 'Petitioning for the State Drug Treatment Program in 2023, even if denied, shows self-identification of addiction as the core driver — favorable framing for a parole interview if properly presented with evidence of in-prison programming.' },
    { w: 'MODERATE', c: C.gold,  label: 'Statistical Profile (Age/Gender)', detail: 'At 35, female offenders statistically carry lower recidivism rates than male counterparts. Risk declines measurably after the late 20s; she is now in a lower-risk demographic bracket and aging into an even lower-risk profile.' },
    { w: 'LOW',      c: C.blue,  label: 'SCI Cambridge Springs Program Access', detail: "Cambridge Springs is a women's state facility offering substance abuse, educational, and vocational programming. Documented participation in any of these would be the single most impactful factor she could present at a hearing — not confirmed in the public record." },
  ];

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", background: C.bg, minHeight: '100vh', color: C.text, paddingBottom: 40, transition: 'background 0.2s, color 0.2s' }}>

      {/* ══ HEADER ══════════════════════════════════════════════════════════════ */}
      <div style={{ background: C.surface, borderBottom: `2px solid ${C.borderStrong}`, padding: '20px 24px 18px', boxShadow: C.shadow }}>

        {/* Theme Toggle */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 4, background: C.bg, borderRadius: 8, padding: 4, border: `1px solid ${C.border}` }}>
            {themeOptions.map(opt => (
              <button key={opt.id} onClick={() => setThemeMode(opt.id)} style={{
                padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: themeMode === opt.id ? C.gold + '30' : 'transparent',
                color: themeMode === opt.id ? C.gold : C.textSub,
                fontFamily: C.mono, fontSize: 11, fontWeight: themeMode === opt.id ? 700 : 400,
                borderBottom: themeMode === opt.id ? `2px solid ${C.gold}` : '2px solid transparent',
                transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 4
              }}>{opt.icon} {opt.label}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: 3, color: C.textSub, marginBottom: 6, textTransform: 'uppercase' }}>
              Schuylkill County Court of Common Pleas · Criminal Division
            </div>
            <div style={{ fontSize: isMobile ? 17 : 22, fontWeight: 800, color: C.text, marginBottom: 4 }}>
              Commonwealth v. Chattin, Jacqueline Elizabeth
            </div>
            <div style={{ fontFamily: C.mono, fontSize: 12, color: C.gold, letterSpacing: 0.5, marginBottom: 10, fontWeight: 700 }}>
              CP-54-CR-0000435-2021 · OTN: R 102106-4 · Inmate #PE1239 · Parole #345JW
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <DocketLink docket="CP-54-CR-0000435-2021" label="Docket Sheet" C={C} />
              <DocketLink docket="CP-54-CR-0000435-2021" label="Court Summary" C={C} />
              <ExLink href={LINKS.docLocator} label="DOC Locator · PE1239" icon="🔒" color={C.blue} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <Badge label="CLOSED · SENTENCED" color={C.green} />
            <Badge label="STATE PRISON — CAMBRIDGE SPRINGS" color={C.blue} />
            <Badge label="INMATE #PE1239 · PAROLE #345JW" color={C.gold} />
            <Badge label={`DOB 02/21/1991 · AGE ${currentAge}`} color={C.purple} />
          </div>
        </div>

        {/* Confinement banner */}
        <div style={{ marginTop: 14, background: C.blueFaint, border: `1px solid ${C.blue}44`, borderRadius: 8, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 20 }}>🏛️</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>SCI Cambridge Springs · Current &amp; Permanent Location</div>
            <div style={{ fontSize: 11, color: C.textSub }}>Women's State Prison · Crawford County, PA · Transferred {fmtDate(SCI)} · Last updated by DOC: 6/16/2026 at 4:00 AM</div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap', alignItems: 'center' }}>
            <Badge label="CONFIRMED IN CUSTODY 6/16/2026" color={C.blue} />
            <ExLink href={LINKS.sciCambridge} label="SCI Cambridge Springs" color={C.blue} />
          </div>
        </div>

        {/* Parole alert */}
        <div style={{ marginTop: 10, background: C.purpleFaint, border: `1px solid ${C.purple}55`, borderRadius: 8, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 22, marginTop: 2, flexShrink: 0 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: C.purple, marginBottom: 4 }}>PAROLE PROCESSING SIGNAL DETECTED</div>
            <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.6 }}>
              PA DOC issued a <strong style={{ color: C.text }}>new mugshot on June 1, 2026</strong> — exactly <strong style={{ color: C.purple }}>{daysMugshotToMin} days before her minimum sentence date</strong>. Parole Number <strong style={{ color: C.text }}>345JW</strong> is assigned and active. New DOC photos are typically captured during active parole intake processing. A Board review is likely imminent or has already occurred; a decision may be pending.
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 24px 0' }}>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20, marginBottom: 24, alignItems: "start" }}>
          <div>
            
            <Section title="PA DOC Inmate Profile"
             icon="🪪" accent={C.blue} C={C}>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'auto 1fr', gap: 16, alignItems: 'start' }}>
                        <div style={{ textAlign: 'center', ...(isMobile && { display: 'flex', flexDirection: 'column', alignItems: 'center' }) }}>
                          <div style={{ border: `2px solid ${C.blue}55`, borderRadius: 8, overflow: 'hidden', width: 130, background: C.surface, boxShadow: C.shadow }}>
                            <img src={MUGSHOT} alt="PA DOC official photo" style={{ width: '100%', display: 'block' }} />
                          </div>
                          <div style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim, marginTop: 6, lineHeight: 1.4 }}>
                            PA DOC OFFICIAL PHOTO<br/>Taken: 6/1/2026 · 9:35:05 AM
                          </div>
                          <div style={{ marginTop: 6, fontFamily: C.mono, fontSize: 10, color: C.purple, fontWeight: 700 }}>← {daysMugshotToMin}d before min.</div>
                        </div>
                        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '16px', borderTop: `3px solid ${C.blue}`, boxShadow: C.shadow }}>
                          <div style={{ fontFamily: C.mono, fontSize: 10, color: C.blue, letterSpacing: 2, marginBottom: 12 }}>PA DEPARTMENT OF CORRECTIONS · INMATE RECORD</div>
                          <InfoRow label="Inmate Number"      value="PE1239"                      mono color={C.gold}   C={C} />
                          <InfoRow label="Parole Number"      value="345JW"                       mono color={C.purple} C={C} />
                          <InfoRow label="Commit Name"        value="Jacqueline Elizabeth Chattin"                      C={C} />
                          <InfoRow label="AKAs"               value="Jacqueline Chattin · Jacqueline E. Chattin"       C={C} />
                          <InfoRow label="Date of Birth"      value="02/21/1991"                  mono                  C={C} />
                          <InfoRow label="Age"                value="35"                          mono color={C.purple} C={C} />
                          <InfoRow label="Height"             value={`5' 7"`}                      mono                  C={C} />
                          <InfoRow label="Gender"             value="Female"                                            C={C} />
                          <InfoRow label="Citizenship"        value="United States of America"                          C={C} />
                          <InfoRow label="Current Location"   value="SCI Cambridge Springs"             color={C.blue}  C={C} />
                          <InfoRow label="Permanent Location" value="SCI Cambridge Springs"             color={C.blue}  C={C} />
                          <InfoRow label="Committing County"  value="Schuylkill"                                        C={C} />
                          <InfoRow label="Last Updated"       value="6/16/2026 · 4:00:31 AM"      mono color={C.green} C={C} />
                          <InfoRow label="Mugshot Date"       value="6/1/2026 · 9:35:05 AM"       mono color={C.purple} C={C} />
                          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <ExLink href={LINKS.docLocator} label="Live DOC Locator · PE1239" icon="🔍" color={C.blue} />
                            <ExLink href={LINKS.paDOC}      label="PA Dept. of Corrections"   icon="🏛️" color={C.blue} />
                          </div>
                        </div>
                      </div>
                    </Section>
          </div>
          <div>
            
            {/* ══ DOC STATUS CHECKER ══════════════════════════════════════════ */}
                    <StatusCheckerWidget />
          </div>
        </div>



        {/* ══ SENTENCE STATUS ═════════════════════════════════════════════════ */}
        <Section title="Sentence Status" icon="⏱️" C={C}>
          <div style={{ background: C.greenFaint, border: `1px solid ${C.green}55`, borderRadius: 8, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>✅</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: C.green }}>MINIMUM SENTENCE DATE REACHED</div>
              <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>60-month minimum reached <strong style={{ color: C.text }}>June 8, 2026</strong> at age <strong style={{ color: C.purple }}>35</strong>. Now <strong style={{ color: C.green }}>{daysPastMin} days</strong> past minimum. Parole #345JW active.</div>
            </div>
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '18px 20px', marginBottom: 16, boxShadow: C.shadow }}>
            {[
              { label: 'MINIMUM SERVED (60 months)', pct: 100, color: C.green, done: true, left: 'Jun 8, 2021 (age 30)', right: 'Jun 8, 2026 (age 35) ← REACHED' },
              { label: `MAXIMUM SERVED (144 months)`, pct: parseFloat(pctMax), color: C.gold, done: false, left: 'Jun 8, 2021 (age 30)', right: 'Jun 8, 2033 (age 42)', pctLabel: pctMax + '%' },
            ].map((bar, i) => (
              <div key={i} style={{ marginBottom: i === 0 ? 16 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontFamily: C.mono, fontSize: 11, color: C.textSub }}>{bar.label}</span>
                  <span style={{ fontFamily: C.mono, fontSize: 11, color: bar.color, fontWeight: 700 }}>{bar.done ? '100% ✓' : bar.pctLabel}</span>
                </div>
                <ProgressBar pct={bar.pct} color={bar.color} height={10} C={C} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: C.textDim }}>{bar.left}</span>
                  <span style={{ fontSize: 10, color: C.textDim }}>{bar.right}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 12 }}>
            <StatCard label="Days Since Offense" value={daysOffense.toLocaleString()} sub="Age 29 → 35" accent={C.red} icon="🔴" C={C} />
            <StatCard label="Days in Custody"    value={daysArrest.toLocaleString()}  sub="Since Jan 18, 2021" accent={C.orange} icon="🔒" C={C} />
            <StatCard label="Days Past Minimum"  value={daysPastMin} sub="Parole-eligible" accent={C.green} icon="✅" C={C} />
            <StatCard label="Days to Max"        value={daysToMax.toLocaleString()} sub="Jun 2033 · age 42" accent={C.blue} icon="📅" C={C} />
            <StatCard label="Min Sentence"       value="60 mo" sub="5 yrs · age 30→35" accent={C.gold} icon="⚖️" C={C} />
            <StatCard label="Max Sentence"       value="144 mo" sub="12 yrs · age 30→42" accent={C.gold} icon="⚖️" C={C} />
            <StatCard label="Max % Served"       value={`${pctMax}%`} sub="of 144-month max" accent={C.gold} icon="📊" C={C} />
            <StatCard label="Est. Cost (DOC)"    value={`$${(estimatedCost/1000).toFixed(0)}K`} sub="~$47K/yr PA avg" accent={C.textSub} icon="💰" C={C} />
          </div>
        </Section>



        {/* ══ PAROLE PROJECTIONS ══════════════════════════════════════════════ */}
        <Section title="Parole Release Projections" icon="📊" C={C}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '18px 20px', marginBottom: 14, boxShadow: C.shadow }}>
            {[
              { label: 'At Minimum (Jun 2026)',  pct: 20, color: C.red,    note: 'Low — violent offense + prior history at first hearing', days: daysPastMin, past: true, age: 35 },
              { label: 'Optimistic (Jun 2027)',  pct: 35, color: C.orange, note: 'Possible with strong program participation', days: daysToOpt, age: 36 },
              { label: 'Most Likely (Late 2028)',pct: 60, color: C.gold,   note: 'Probable range with clean institutional record', days: daysToLikely, age: 37 },
              { label: 'Pessimistic (Mar 2031)', pct: 85, color: C.green,  note: 'Board likely relents after multiple hearings', days: daysToPess, age: 40 },
              { label: 'Maximum (Jun 2033)',     pct: 100, color: C.blue,  note: 'Mandatory release — legally cannot be held further', days: daysToMax, age: 42 },
            ].map(sc => (
              <div key={sc.label} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {sc.label} <AgePill age={sc.age} color={sc.color} />
                  </span>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {sc.past ? <span style={{ fontFamily: C.mono, fontSize: 10, color: C.green }}>✓ PASSED ({daysPastMin}d ago)</span> : <span style={{ fontFamily: C.mono, fontSize: 10, color: C.textDim }}>{sc.days.toLocaleString()}d away</span>}
                    <span style={{ fontFamily: C.mono, fontSize: 12, fontWeight: 700, color: sc.color }}>{sc.pct}%</span>
                  </div>
                </div>
                <ProgressBar pct={sc.pct} color={sc.color} height={6} C={C} />
                <div style={{ fontSize: 11, color: C.textSub, marginTop: 3 }}>{sc.note}</div>
              </div>
            ))}
          </div>
          <div style={{ background: C.purpleFaint, border: `1px solid ${C.purple}44`, borderRadius: 8, padding: '12px 16px' }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: C.purple }}>⚠️ Updated: Active Parole Processing Underway</div>
            <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.6 }}>Parole #345JW assigned + June 1 mugshot update shifts the near-term picture. She is actively in parole processing — a hearing may have already occurred or be imminent. The most likely near-term outcome is either a conditional grant or a denial with a future hearing date. ACT 84 payments through May 2026 confirm she remained incarcerated through last month.</div>
          </div>
        </Section>



        {/* ══ PAROLE FACTORS ══════════════════════════════════════════════════ */}
        <Section title="Parole Board Factor Analysis" icon="⚖️" C={C}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontFamily: C.mono, fontSize: 10, color: C.red, letterSpacing: 1.5, marginBottom: 10 }}>▼ FACTORS WEIGHING AGAINST PAROLE</div>
            {against.map(f => (
              <Expand key={f.label} label={f.label} icon={<span style={{...wStyle(f.c)}}>{f.w}</span>} accent={f.c} C={C}>
                <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.7 }}>{f.detail}</div>
              </Expand>
            ))}
          </div>
          <div style={{ marginTop: 18 }}>
            <div style={{ fontFamily: C.mono, fontSize: 10, color: C.green, letterSpacing: 1.5, marginBottom: 10 }}>▲ FACTORS WEIGHING IN FAVOR OF PAROLE</div>
            {inFavor.map(f => (
              <Expand key={f.label} label={f.label} icon={<span style={{...wStyle(f.c)}}>{f.w}</span>} accent={f.c} C={C}>
                <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.7 }}>{f.detail}</div>
              </Expand>
            ))}
          </div>
        </Section>



        {/* ══ TIMELINE ════════════════════════════════════════════════════════ */}
        <Section title="Case Timeline" icon="📅" C={C}>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 22, top: 24, bottom: 24, width: 2, background: `linear-gradient(to bottom, ${C.red}, ${C.gold}, ${C.purple}, ${C.green}, ${C.textDim})` }} />
            {tlEvents.map((ev, i) => (
              <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 12, paddingLeft: 10 }}>
                <div style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: ev.future ? C.surface : ev.dot, border: `2px solid ${ev.dot}`, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: !ev.future ? `0 0 8px ${ev.dot}55` : 'none' }}>
                    {!ev.future ? <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} /> : <div style={{ width: 7, height: 7, borderRadius: '50%', background: ev.dot, opacity: 0.4 }} />}
                  </div>
                </div>
                <div style={{ background: ev.future ? C.surface : C.card, border: `1px solid ${ev.future ? C.border : ev.dot + '55'}`, borderRadius: 8, padding: '10px 14px', flex: 1, boxShadow: ev.future ? 'none' : C.shadow }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: ev.future ? C.textSub : C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {ev.label} <AgePill age={ev.age} color={ev.future ? C.textDim : C.purple} />
                    </div>
                    <div style={{ fontFamily: C.mono, fontSize: 11, color: ev.future ? C.textDim : ev.dot }}>{fmtDate(ev.date)}</div>
                  </div>
                  <div style={{ fontSize: 12, color: C.textSub, marginTop: 3 }}>{ev.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>



        {/* ══ CHARGES ═════════════════════════════════════════════════════════ */}
        <Section title="Charges & Sentencing" icon="📋" C={C}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflowX: 'auto', boxShadow: C.shadow }}>
            <div style={{ display: 'grid', gridTemplateColumns: '28px 42px 1fr 100px 105px 105px', gap: 10, padding: '10px 16px', background: C.surface, borderBottom: `1px solid ${C.border}`, minWidth: 560 }}>
              {['#','GRD','Charge / Statute','Structure','Minimum','Maximum'].map(h => (
                <div key={h} style={{ fontFamily: C.mono, fontSize: 10, color: C.textSub, letterSpacing: 1 }}>{h}</div>
              ))}
            </div>
            {charges.map((ch, i) => (
              <div key={ch.seq} style={{ display: 'grid', gridTemplateColumns: '28px 42px 1fr 100px 105px 105px', gap: 10, padding: '12px 16px', borderBottom: i < charges.length-1 ? `1px solid ${C.border}` : 'none', background: ch.role === 'ANCHOR' ? C.goldFaint : ch.role === 'CONSECUTIVE' ? C.redFaint : 'transparent', minWidth: 560 }}>
                <div style={{ fontFamily: C.mono, fontSize: 12, color: C.textDim, paddingTop: 2 }}>{ch.seq}</div>
                <div><span style={{ fontFamily: C.mono, fontSize: 10, fontWeight: 700, color: gradeC(ch.grade), padding: '2px 5px', border: `1px solid ${gradeC(ch.grade)}66`, borderRadius: 3 }}>{ch.grade}</span></div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{ch.label}</div>
                  <div style={{ fontSize: 11, color: C.textSub }}>{ch.sub}</div>
                  <div style={{ fontFamily: C.mono, fontSize: 10, color: C.textDim, marginTop: 2 }}>{ch.statute}</div>
                </div>
                <div style={{ paddingTop: 2 }}><span style={{...wStyle(ch.roleColor)}}>{ch.role}</span></div>
                <div style={{ fontFamily: C.mono, fontSize: 13, color: ch.role !== 'CONCURRENT' ? C.gold : C.textSub, fontWeight: ch.role !== 'CONCURRENT' ? 700 : 400 }}>{ch.minMo} months</div>
                <div style={{ fontFamily: C.mono, fontSize: 13, color: ch.role !== 'CONCURRENT' ? C.gold : C.textSub, fontWeight: ch.role !== 'CONCURRENT' ? 700 : 400 }}>{ch.maxMo} months</div>
              </div>
            ))}
            <div style={{ background: C.goldFaint, borderTop: `1px solid ${C.gold}44`, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontFamily: C.mono, fontSize: 11, color: C.gold, fontWeight: 700 }}>EFFECTIVE TOTAL (Seq 3 anchor + Seq 4 consecutive)</div>
              <div style={{ display: 'flex', gap: 24 }}>
                {[['60 mo','MIN · 5 yrs · age 30→35'],['144 mo','MAX · 12 yrs · age 30→42']].map(([v,s]) => (
                  <div key={v} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: C.mono, fontSize: 20, fontWeight: 700, color: C.gold }}>{v}</div>
                    <div style={{ fontSize: 10, color: C.textSub }}>{s}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>



        {/* ══ CASE BACKGROUND ════════════════════════════════════════════════ */}
        <Section title="Case Background" icon="📖" C={C}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '18px 20px', lineHeight: 1.7, fontSize: 13, color: C.textSub, boxShadow: C.shadow }}>
            <p style={{ marginTop: 0 }}>Chattin — who was under the influence of methamphetamine — broke into her grandmother's home in Pottsville and assaulted the victim with a deadly weapon, then stole her purse and cell phone, subsequently using the stolen access devices fraudulently. She also broke into a second residence and squatted there with an associate until located and arrested by Pottsville PD Officer Hamilton on January 18, 2021.</p>
            <p>The assault triggered a significant deterioration of the victim's cognitive health. The victim's dementia worsened in the aftermath and she subsequently required placement in assisted living — a direct consequence of Jackie's actions.</p>
            <p style={{ marginBottom: 0 }}>Court-ordered restitution of <strong style={{ color: C.gold }}>$1,100.00</strong> was assessed for stolen property. The crime was driven by meth addiction — her prior record includes multiple drug possession cases stretching back to 2009.</p>
          </div>
        </Section>

{/* ══ PA SAVIN ══════════════════════════════════════════════════════ */}
        <Section title="PA SAVIN — Automatic Custody Notifications" icon="🔔" accent={C.green} C={C}>
          <div style={{ background: C.greenFaint, border: `2px solid ${C.green}55`, borderRadius: 10, padding: '18px 20px', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.green, marginBottom: 8 }}>⭐ Most Important Action — Register for Automatic Alerts</div>
            <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.7, marginBottom: 14 }}>
              <strong style={{ color: C.text }}>PA SAVIN (Statewide Automated Victim Information &amp; Notification)</strong> sends automatic phone, text, email, or app alerts the moment custody status changes — release, transfer, or escape. The service is <strong style={{ color: C.green }}>free, anonymous, and confidential</strong>. The subject will not know you registered.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 14 }}>
              {[
                { label: 'VINE Toll-Free',  value: '1-866-972-7284', icon: '📞' },
                { label: 'Inmate # to use', value: 'PE1239',          icon: '🔢' },
                { label: 'PIN needed',      value: '4-digit (you choose)', icon: '🔑' },
                { label: 'Cost',            value: 'FREE',            icon: '✅' },
              ].map(item => (
                <div key={item.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, color: C.textSub, marginBottom: 4 }}>{item.icon} {item.label}</div>
                  <div style={{ fontFamily: C.mono, fontSize: 14, fontWeight: 700, color: C.green }}>{item.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a href={LINKS.vineLink}  target="_blank" rel="noopener noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:6, color:C.green, textDecoration:'none', fontSize:12, padding:'5px 10px', border:`1px solid ${C.green}55`, borderRadius:6, background:C.greenFaint, fontFamily:C.mono }}>🌐 VINELink.com ↗</a>
              <a href={LINKS.paSavin}   target="_blank" rel="noopener noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:6, color:C.green, textDecoration:'none', fontSize:12, padding:'5px 10px', border:`1px solid ${C.green}55`, borderRadius:6, background:C.greenFaint, fontFamily:C.mono }}>🏛️ PA.gov SAVIN ↗</a>
              <a href={LINKS.paVictims} target="_blank" rel="noopener noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:6, color:C.green, textDecoration:'none', fontSize:12, padding:'5px 10px', border:`1px solid ${C.green}55`, borderRadius:6, background:C.greenFaint, fontFamily:C.mono }}>⚖️ PA Victims Portal ↗</a>
            </div>
          </div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 16px', fontSize: 12, color: C.textSub, lineHeight: 1.8 }}>
            <strong style={{ color: C.text }}>How to register (3 options):</strong><br />
            📱 <strong>App:</strong> Download VINELink → Select Pennsylvania → Search PE1239 → Get Notified → add phone/email + 4-digit PIN<br />
            📞 <strong>Phone:</strong> Call 1-866-972-7284 and follow prompts<br />
            🌐 <strong>Web:</strong> vinelink.dhs.gov → Pennsylvania → PE1239 → Register
          </div>
        </Section>



        {/* ══ PRIOR RECORD ════════════════════════════════════════════════════ */}
        <Section title="Prior Criminal Record" icon="📁" C={C}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflowX: 'auto', boxShadow: C.shadow }}>
            <div style={{ display: 'grid', gridTemplateColumns: '60px 55px 1fr 140px', gap: 10, padding: '10px 16px', background: C.surface, borderBottom: `1px solid ${C.border}`, minWidth: 500 }}>
              {['Year','Age','Charge / Docket','Outcome'].map(h => <div key={h} style={{ fontFamily: C.mono, fontSize: 10, color: C.textSub, letterSpacing: 1 }}>{h}</div>)}
            </div>
            {priorCases.map((pc, i) => (
              <div key={pc.docket} style={{ display: 'grid', gridTemplateColumns: '60px 55px 1fr 140px', gap: 10, padding: '12px 16px', borderBottom: i < priorCases.length-1 ? `1px solid ${C.border}` : 'none', background: pc.highlight ? C.redFaint : 'transparent', minWidth: 500 }}>
                <div style={{ fontFamily: C.mono, fontSize: 12, color: pc.highlight ? C.red : C.gold, fontWeight: 700 }}>{pc.year}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <AgePill age={pc.arrestAge} color={pc.highlight ? C.red : C.purple} />
                  {pc.sentAge !== pc.arrestAge && <AgePill age={pc.sentAge} color={C.textDim} />}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: pc.highlight ? C.red : C.text }}>{pc.charge}</div>
                  <div style={{ marginTop: 4 }}><DocketLink docket={pc.docket} C={C} /></div>
                </div>
                <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.4 }}>{pc.outcome}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            <StatCard label="Total Prior Cases" value="7"  sub="Before 2021 offense" accent={C.red}    C={C} />
            <StatCard label="First Arrest Age"  value="18" sub="Corruption of Minors" accent={C.orange} C={C} />
            <StatCard label="Sentence Age"      value="30" sub="Current case"          accent={C.gold}   C={C} />
            <StatCard label="Years in System"   value="17" sub="Age 18 → age 35"      accent={C.red}    C={C} />
          </div>
        </Section>



        {/* ══ FINANCIALS ══════════════════════════════════════════════════════ */}
        <Section title="Financial Obligations" icon="💵" C={C}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12, marginBottom: 14 }}>
            <StatCard label="Total Assessed"    value="$1,672.25" sub="Fines, fees, restitution"     accent={C.gold}   C={C} />
            <StatCard label="Total Paid"        value="$1,251.13" sub="Via ACT 84 + direct payments" accent={C.green}  C={C} />
            <StatCard label="Remaining Balance" value="$376.92"   sub="$339.92 victim restitution"   accent={C.red}    C={C} />
            <StatCard label="Plan Overdue"      value="$5,990.22" sub="Consolidated older cases"     accent={C.orange} C={C} />
          </div>
          <Expand label="ACT 84 Payment History (DOC inmate wage deductions confirming incarceration)" icon="🏛️" C={C}>
            <div style={{ maxHeight: 200, overflowY: 'auto', fontFamily: C.mono, fontSize: 11 }}>
              {[['Aug 2021','$145.00'],['Sep 2021','$75.00'],['Oct 2021','$47.15'],['Nov 2021','$40.21'],['Dec 2021','$79.49'],['Jan 2022','$53.49'],['Feb 2022','$50.31'],['Mar 2022','$23.75'],['Apr 2022','$38.98'],['Jun 2022','$102.38'],['Aug 2022','$75.97'],['Sep 2022','$43.77'],['Oct 2022','$41.27'],['Nov 2022','$52.52'],['Dec 2022','$26.30'],['Jan 2023','$27.85'],['Feb 2023','$25.78'],['Mar 2023','$23.57'],['Apr 2023','$28.70'],['May 2023','$37.51'],['Jun 2023','$16.95'],['Jul 2023','$17.40'],['Aug 2023','$25.24'],['Sep 2023','$15.08'],['Oct 2023','$17.87'],['Nov 2023','$53.06'],['Dec 2023','$14.86'],['Feb 2024','$25.70'],['Mar 2024','$19.45'],['Apr 2024','$29.47'],['May 2024','$20.11'],['Jun 2024','$5.67'],['Jul 2024','$11.97'],['Aug 2024','$25.05'],['Sep 2024','$8.71'],['Oct 2024','$6.90'],['Nov 2024','$10.45'],['Feb 2025','$12.25'],['Mar 2025','$12.95'],['Apr 2025','$17.08'],['May 2025','$21.48'],['Jun 2025','$14.49'],['Jul 2025','$14.22'],['Aug 2025','$15.47'],['Sep 2025','$21.60'],['Oct 2025','$9.63'],['Nov 2025','$14.70'],['Dec 2025','$18.18'],['Jan 2026','$21.50'],['Feb 2026','$7.80'],['Mar 2026','$18.35'],['Apr 2026','$30.47'],['May 2026','$16.80 ← MOST RECENT']].map(([mo,amt]) => (
                <div key={mo} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: `1px solid ${C.border}`, color: amt.includes('←') ? C.green : C.textSub }}>
                  <span>{mo}</span><span>{amt}</span>
                </div>
              ))}
            </div>
          </Expand>
        </Section>

<Section title="PA Offense Grade Scale & Severity" icon="📏" accent={C.orange} C={C}>
          {/* Visual severity bar */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '18px 20px', marginBottom: 14, boxShadow: C.shadow }}>
            <div style={{ fontFamily: C.mono, fontSize: 10, color: C.textSub, letterSpacing: 1.5, marginBottom: 14 }}>SEVERITY SCALE — PENNSYLVANIA CRIMINAL CODE (18 Pa.C.S.)</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'stretch' }}>
              {GRADE_DATA.slice().reverse().map((g, i) => (
                <div key={g.grade} style={{ flex: g.severity, background: g.color + '22', border: `2px solid ${g.color}`, borderRadius: 6, padding: '8px 6px', textAlign: 'center', position: 'relative', minWidth: 36 }}>
                  <div style={{ fontFamily: C.mono, fontSize: 11, fontWeight: 800, color: g.color }}>{g.grade}</div>
                  {g.inCase.length > 0 && <div style={{ position: 'absolute', top: -8, right: -4, width: 14, height: 14, borderRadius: '50%', background: g.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 8, color: '#fff', fontWeight: 800 }}>★</span></div>}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.textDim, marginBottom: 4 }}>
              <span>← LEAST SEVERE</span><span>MOST SEVERE →</span>
            </div>
            <div style={{ fontSize: 11, color: C.textSub }}>★ = Present in Jackie's case</div>
          </div>

          {/* Grade table */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', overflowX: 'auto', boxShadow: C.shadow }}>
            <div style={{ display: 'grid', gridTemplateColumns: '55px 1fr 90px 90px 1fr', gap: 10, padding: '10px 16px', background: C.surface, borderBottom: `1px solid ${C.border}`, minWidth: 500 }}>
              {['Grade','Classification','Max Prison','Max Fine','Jackie\'s Charges'].map(h => (
                <div key={h} style={{ fontFamily: C.mono, fontSize: 10, color: C.textSub, letterSpacing: 1 }}>{h}</div>
              ))}
            </div>
            {GRADE_DATA.map((g, i) => (
              <div key={g.grade} style={{ display: 'grid', gridTemplateColumns: '55px 1fr 90px 90px 1fr', gap: 10, padding: '11px 16px', borderBottom: i < GRADE_DATA.length-1 ? `1px solid ${C.border}` : 'none', background: g.inCase.length > 0 ? g.color + '0F' : 'transparent', minWidth: 500 }}>
                <div><span style={{ fontFamily: C.mono, fontSize: 12, fontWeight: 800, color: g.color, padding: '2px 6px', border: `1.5px solid ${g.color}`, borderRadius: 4 }}>{g.grade}</span></div>
                <div style={{ fontSize: 12, color: C.text, fontWeight: g.inCase.length > 0 ? 600 : 400 }}>{g.label}</div>
                <div style={{ fontFamily: C.mono, fontSize: 12, color: g.inCase.length > 0 ? C.text : C.textSub, fontWeight: g.inCase.length > 0 ? 700 : 400 }}>{g.maxPrison}</div>
                <div style={{ fontFamily: C.mono, fontSize: 12, color: C.textSub }}>{g.maxFine}</div>
                <div style={{ fontSize: 11 }}>
                  {g.inCase.length > 0 ? g.inCase.map(ch => <div key={ch} style={{ color: g.color, fontWeight: 600 }}>★ {ch}</div>) : <span style={{ color: C.textDim }}>—</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Sentencing guidelines explainer */}
          <Expand label="How Grade Interacts with Sentencing — The PA Guidelines Matrix" icon="📊" C={C} accent={C.orange}>
            <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.8 }}>
              <p style={{ marginTop: 0 }}>In Pennsylvania, the offense grade defines the <strong style={{ color: C.text }}>statutory maximum</strong> (the ceiling the judge can never exceed), but the actual sentence within that ceiling is determined by the <strong style={{ color: C.text }}>PA Sentencing Guidelines Matrix</strong> — a grid where two scores intersect:</p>
              <p><strong style={{ color: C.orange }}>Offense Gravity Score (OGS)</strong> — a number from 1–14 assigned to each specific offense, representing how serious that crime is. Aggravated Assault with a deadly weapon (F2) carries an OGS of around 9–10. Criminal Trespass (F2) is around 6–7. These are fixed per statute.</p>
              <p><strong style={{ color: C.orange }}>Prior Record Score (PRS)</strong> — 0 through 5 (or RFEL for Repeat Felony Offenders). Calculated from prior convictions. With 7+ prior cases including prior felonies, Jackie's PRS is almost certainly at RFEL status — the maximum tier — which substantially shifts the recommended range upward on the matrix.</p>
              <p>Where OGS and PRS intersect on the matrix gives the judge a <strong style={{ color: C.text }}>standard guideline range</strong> (a min-max band), a <strong style={{ color: C.text }}>mitigated range</strong> (below standard), and an <strong style={{ color: C.text }}>aggravated range</strong> (above standard). Jackie's sentences (30–72 months on the F2s, 30–72 on the F3) reflect a high OGS + maximum PRS pushing into the aggravated range — consistent with the violent nature of the offense and her extensive history.</p>
              <p style={{ marginBottom: 0 }}>The <strong style={{ color: C.text }}>consecutive structure</strong> (Seq 4 running after Seq 3 rather than at the same time) is the mechanism that stacks the sentences — taking the total from 30–72 months to 60–144 months. This is a judge's discretionary tool to increase total imprisonment beyond what any single charge would allow.</p>
            </div>
          </Expand>
        </Section>



        {/* ══ AGE PROFILE ═════════════════════════════════════════════════════ */}
        <Section title="Subject Age Profile" icon="🎂" accent={C.purple} C={C}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: 14 }}>
            <div style={{ background: C.card, border: `2px solid ${C.purple}44`, borderRadius: 10, padding: '18px', borderTop: `3px solid ${C.purple}`, boxShadow: C.shadow }}>
              <div style={{ fontFamily: C.mono, fontSize: 10, color: C.purple, letterSpacing: 2, marginBottom: 10 }}>SUBJECT</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>Jacqueline E. Chattin</div>
              <div style={{ fontFamily: C.mono, fontSize: 11, color: C.textSub, marginTop: 4 }}>DOB: February 21, 1991</div>
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[['Current Age', `${currentAge} years old`],['Height',`5' 7"`],['Next Birthday',`Feb 21, 2027 (${daysToNextBD}d)`],['Age at Offense','29 years old'],['Age at Sentencing','30 years old'],['Age at Min. Date','35 years old']].map(([k,v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 11, color: C.textSub }}>{k}</span>
                    <span style={{ fontFamily: C.mono, fontSize: 11, color: C.purple, fontWeight: 700 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '18px', borderTop: `3px solid ${C.purple}`, boxShadow: C.shadow }}>
              <div style={{ fontFamily: C.mono, fontSize: 10, color: C.purple, letterSpacing: 2, marginBottom: 14 }}>AGE AT PROJECTED RELEASE SCENARIOS</div>
              {[
                { label: 'Optimistic Parole',   date: OPT_DATE,    age: ageAt(OPT_DATE),    pct: '~20–30%', color: C.orange },
                { label: 'Most Likely Parole',  date: LIKELY_DATE, age: ageAt(LIKELY_DATE), pct: '~50–65%', color: C.gold },
                { label: 'Pessimistic Parole',  date: PESS_DATE,   age: ageAt(PESS_DATE),   pct: '~85%',    color: C.textSub },
                { label: 'Maximum (Mandatory)', date: MAX_DATE,    age: ageAt(MAX_DATE),    pct: '100%',    color: C.blue },
              ].map(sc => (
                <div key={sc.label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, padding: '10px 14px', background: C.surface, borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <div style={{ fontFamily: C.mono, fontSize: 24, fontWeight: 700, color: sc.color, minWidth: 36 }}>{sc.age}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{sc.label}</div>
                    <div style={{ fontSize: 11, color: C.textSub }}>{fmtShort(sc.date)} · Probability: <span style={{ color: sc.color }}>{sc.pct}</span></div>
                  </div>
                  <AgePill age={`${sc.age} yrs`} color={sc.color} />
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '18px 20px', marginTop: 14, overflowX: 'auto', boxShadow: C.shadow }}>
            <div style={{ fontFamily: C.mono, fontSize: 10, color: C.purple, letterSpacing: 2, marginBottom: 16 }}>AGE ACROSS CRIMINAL HISTORY</div>
            <div style={{ display: 'flex', gap: 0, minWidth: 620 }}>
              {ageTimeline.map((ev, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
                  {i < ageTimeline.length - 1 && <div style={{ position: 'absolute', top: 13, left: '50%', right: '-50%', height: 2, background: ev.future ? C.border : `linear-gradient(90deg,${ev.color},${ageTimeline[i+1].color})`, zIndex: 0 }} />}
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: ev.current ? C.green : ev.future ? C.surface : ev.color, border: `2px solid ${ev.color}`, margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1, boxShadow: ev.current ? `0 0 12px ${C.green}` : 'none' }}>
                    <span style={{ fontFamily: C.mono, fontSize: 8, fontWeight: 700, color: ev.future ? ev.color : (C === LIGHT ? '#fff' : '#fff') }}>{ev.age}</span>
                  </div>
                  <div style={{ fontSize: 8, color: ev.current ? C.green : ev.future ? C.textDim : ev.color, fontWeight: ev.current ? 700 : 400, lineHeight: 1.3 }}>{ev.label}</div>
                  <div style={{ fontSize: 7, color: C.textDim, marginTop: 1 }}>{ev.year}</div>
                </div>
              ))}
            </div>
          </div>
        </Section>



        {/* ══ BY THE NUMBERS ══════════════════════════════════════════════════ */}
        <Section title="By the Numbers" icon="🔢" C={C}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
            <StatCard label="Inmate Number"   value="PE1239" sub="PA DOC permanent ID"           accent={C.blue}   C={C} />
            <StatCard label="Parole Number"   value="345JW"  sub="Active — Board processing"     accent={C.purple} C={C} />
            <StatCard label="Height"          value={`5' 7"`} sub="PA DOC record"                 accent={C.textSub} C={C} />
            <StatCard label="Total Cases"     value="9"      sub="Including 2021 cases"           accent={C.orange} C={C} />
            <StatCard label="Total Charges"   value="15+"    sub="Across all cases"              accent={C.red}    C={C} />
            <StatCard label="First Arrest"    value="Age 18" sub="Corruption of Minors, 2009"    accent={C.orange} C={C} />
            <StatCard label="Bail Set"        value="$50,000" sub="Monetary · Jan 18, 2021"      accent={C.red}    C={C} />
            <StatCard label="Mugshot Gap"     value="7 days" sub="Before min. date (parole signal)" accent={C.purple} C={C} />
            <StatCard label="Age at Max"      value="42"     sub="If serves full 12 yrs"         accent={C.blue}   C={C} />
            <StatCard label="Unique Judges"   value="4"      sub="Baldwin, Dolbin, Domalakes, Hale" accent={C.blue} C={C} />
          </div>
        </Section>



        {/* ══ RESOURCES ═══════════════════════════════════════════════════════ */}
        <Section title="Official Resources & Source Documents" icon="🔗" accent={C.blue} C={C}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '16px', boxShadow: C.shadow }}>
              <div style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: 1.5, marginBottom: 12 }}>PRIMARY DOCUMENTS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <DocketLink docket="CP-54-CR-0000435-2021" label="Docket Sheet — Main Case" C={C} />
                <DocketLink docket="CP-54-CR-0000435-2021" label="Court Summary" C={C} />
                <DocketLink docket="CP-54-CR-0000437-2021" label="Concurrent Case (2nd property)" C={C} />
              </div>
            </div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '16px', boxShadow: C.shadow }}>
              <div style={{ fontFamily: C.mono, fontSize: 10, color: C.green, letterSpacing: 1.5, marginBottom: 12 }}>DOC · INMATE · PAROLE</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <ExLink href={LINKS.vinelink}    label="VINELink — Register for Release Alerts" icon="🔔" color={C.green} />
                <ExLink href={LINKS.docLocator}  label="DOC Inmate Locator · PE1239"            icon="🔒" color={C.green} />
                <ExLink href={LINKS.paroleBoard} label="PA Parole Board · Case 345JW"           icon="📋" color={C.green} />
                <ExLink href={LINKS.ova}         label="PA Office of Victim Advocate"           icon="⚖️" color={C.green} />
                <ExLink href={LINKS.sciCambridge}label="SCI Cambridge Springs"                 icon="🏗️" color={C.blue} />
              </div>
            </div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '16px', boxShadow: C.shadow }}>
              <div style={{ fontFamily: C.mono, fontSize: 10, color: C.orange, letterSpacing: 1.5, marginBottom: 12 }}>ALL PRIOR CASE DOCKETS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {['CP-54-CR-0000327-2010','CP-54-CR-0001864-2016','CP-54-CR-0000461-2019','CP-54-CR-0000540-2019','CP-54-CR-0000143-2020','CP-54-CR-0001924-2019','CP-54-CR-0000437-2021'].map(d => <DocketLink key={d} docket={d} C={C} />)}
              </div>
            </div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '16px', boxShadow: C.shadow }}>
              <div style={{ fontFamily: C.mono, fontSize: 10, color: C.purple, letterSpacing: 1.5, marginBottom: 12 }}>ADDITIONAL RESOURCES</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <ExLink href={LINKS.statePolice}                    label="PA State Police ePATCH"          icon="🔎" color={C.purple} />
                <ExLink href="https://ujsportal.pacourts.us/PAePay" label="PAePay — Court Payments"         icon="💳" color={C.purple} />
                <ExLink href="https://www.pacodeandbulletin.gov/"   label="PA Sentencing Code & Guidelines" icon="📚" color={C.purple} />
                <ExLink href={LINKS.ujsSearch}                      label="UJS Case Search Portal"          icon="🔍" color={C.blue} />
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 16px', fontSize: 11, color: C.textSub, lineHeight: 1.7 }}>
            <strong style={{ color: C.text }}>📋 Pulling docket sheet/court summary:</strong> Click any docket link — opens UJS Portal and copies the docket # to clipboard simultaneously. Set Search By = <em>Docket Number</em>, paste, hit Search, then click 📄 or 🏛️ for the PDF.
          </div>
        </Section>

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '20px 0 0', borderTop: `1px solid ${C.border}`, fontFamily: C.mono, fontSize: 10, color: C.textDim, lineHeight: 1.8 }}>
          <div onClick={handleSecretTap} style={{ cursor: 'default', userSelect: 'none' }}>SOURCE: PA UJS Portal · PA DOC Inmate Locator · CP-54-CR-0000435-2021 · Inmate #PE1239 · Printed June 16, 2026</div>
          <div>All data is public record. Not a substitute for an official PA State Police criminal history background check.</div>
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
            <button
              onClick={handleBuildTrigger}
              disabled={buildStatus === 'loading'}
              title="Recompile dashboard assets"
              style={{
                background: 'none', border: 'none',
                fontFamily: C.mono, fontSize: 9, letterSpacing: 0.5,
                color: buildStatus === 'ok' ? C.green : buildStatus === 'err' ? C.red : C.textDim,
                cursor: buildStatus === 'loading' ? 'wait' : 'pointer',
                opacity: 0.45, padding: '2px 6px',
              }}>
              {buildStatus === 'loading' ? '⧗ compiling…' : buildStatus === 'ok' ? '✓ compiled' : buildStatus === 'err' ? '✕ compile failed' : '↻ compile'}
            </button>
            {buildMsg2 && (
              <span style={{ fontSize: 9, color: buildStatus === 'ok' ? C.green : C.red, opacity: 0.75 }}>
                {buildMsg2}
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
