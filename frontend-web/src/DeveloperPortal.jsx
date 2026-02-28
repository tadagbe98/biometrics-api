/**
 * BioMetrics — Portail Développeur
 * 4 onglets : Accueil | Démo interactive | Documentation | API Keys
 */
import { useState, useEffect, useCallback, useRef } from "react";

const API_BASE = "https://biometrics-api-production.up.railway.app/api/v1";

const apiFetch = async (endpoint, options = {}, token = null) => {
  const t = token || localStorage.getItem("bm_token");
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Erreur API");
  return data;
};

// ─── CSS ────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #050810; --panel: #0c1120; --panel2: #101828;
    --border: #1a2540; --border2: #243050;
    --accent: #00e5ff; --accent2: #7b61ff;
    --green: #00ff88; --red: #ff4466; --orange: #ff9f43;
    --text: #e8edf5; --muted: #5a6a8a; --muted2: #8899b0;
    --font: 'Syne', sans-serif; --mono: 'JetBrains Mono', monospace;
  }
  body { background: var(--bg); color: var(--text); font-family: var(--font); }

  /* Layout */
  .portal { min-height: 100vh; background: var(--bg);
    background-image:
      radial-gradient(ellipse 80% 50% at 20% -10%, rgba(0,229,255,0.06) 0%, transparent 60%),
      radial-gradient(ellipse 60% 40% at 80% 110%, rgba(123,97,255,0.05) 0%, transparent 60%);
  }

  /* Nav */
  nav {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 40px; height: 60px;
    border-bottom: 1px solid var(--border);
    backdrop-filter: blur(12px);
    position: sticky; top: 0; z-index: 100;
    background: rgba(5,8,16,0.9);
  }
  .nav-logo { font-size: 18px; font-weight: 800; letter-spacing: -0.5px; }
  .nav-logo span { color: var(--accent); }
  .nav-tabs { display: flex; gap: 2px; }
  .nav-tab {
    padding: 8px 18px; border-radius: 8px; border: none; cursor: pointer;
    font-family: var(--font); font-size: 13px; font-weight: 600;
    background: transparent; color: var(--muted); transition: all 0.2s;
  }
  .nav-tab:hover { color: var(--text); background: rgba(255,255,255,0.04); }
  .nav-tab.active { color: var(--accent); background: rgba(0,229,255,0.08); }
  .nav-right { display: flex; align-items: center; gap: 12px; }
  .nav-pill {
    font-family: var(--mono); font-size: 11px;
    background: rgba(0,229,255,0.06); border: 1px solid rgba(0,229,255,0.18);
    color: var(--accent); padding: 5px 12px; border-radius: 100px;
    display: flex; align-items: center; gap: 6px;
  }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green);
    box-shadow: 0 0 8px var(--green); animation: blink 2s infinite; }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
  .nav-user { font-size: 13px; color: var(--muted2); }
  .nav-logout { font-family: var(--mono); font-size: 11px; padding: 5px 12px;
    border-radius: 6px; border: 1px solid var(--border2); background: transparent;
    color: var(--muted); cursor: pointer; transition: all 0.2s; }
  .nav-logout:hover { border-color: var(--red); color: var(--red); }

  /* Content wrapper */
  .page { max-width: 960px; margin: 0 auto; padding: 48px 24px; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
  .anim { animation: fadeUp 0.35s ease; }

  /* Auth */
  .auth-wrap { display:flex; align-items:center; justify-content:center; min-height:calc(100vh - 60px); padding:40px 20px; }
  .auth-card { width:100%; max-width:420px; background:var(--panel); border:1px solid var(--border); border-radius:16px; padding:40px; animation:fadeUp 0.4s ease; }
  .auth-title { font-size:26px; font-weight:800; margin-bottom:6px; }
  .auth-sub { color:var(--muted); font-size:14px; margin-bottom:28px; }
  .tab-row { display:flex; gap:4px; background:var(--bg); border-radius:8px; padding:4px; margin-bottom:24px; }
  .tab { flex:1; padding:8px; border-radius:6px; border:none; cursor:pointer; font-family:var(--font); font-size:13px; font-weight:600; background:transparent; color:var(--muted); transition:all 0.2s; }
  .tab.active { background:var(--panel); color:var(--text); }
  label { display:block; font-size:11px; font-weight:700; color:var(--muted); letter-spacing:0.8px; margin-bottom:6px; text-transform:uppercase; }
  input[type=text], input[type=email], input[type=password] {
    width:100%; padding:11px 14px; margin-bottom:16px;
    background:var(--bg); border:1px solid var(--border);
    border-radius:8px; color:var(--text); font-family:var(--font); font-size:14px;
    outline:none; transition:border 0.2s;
  }
  input:focus { border-color:var(--accent); }
  .btn { width:100%; padding:12px; border-radius:8px; border:none; cursor:pointer;
    font-family:var(--font); font-size:15px; font-weight:700;
    background:var(--accent); color:#000; transition:all 0.2s; }
  .btn:hover { filter:brightness(1.1); transform:translateY(-1px); }
  .btn:disabled { opacity:0.5; cursor:not-allowed; transform:none; }
  .btn.sm { font-size:13px; padding:9px 18px; width:auto; white-space:nowrap; }
  .btn.outline { background:transparent; border:1px solid var(--border2); color:var(--text); }
  .btn.outline:hover { border-color:var(--accent); color:var(--accent); }
  .btn.danger { background:rgba(255,68,102,0.1); border:1px solid var(--red); color:var(--red); }
  .err { color:var(--red); font-size:13px; margin-top:10px; text-align:center; }

  /* Section titles */
  .sec-label { font-size:11px; font-weight:700; letter-spacing:1.5px; color:var(--muted); text-transform:uppercase; margin-bottom:16px; }
  .sec-title { font-size:28px; font-weight:800; margin-bottom:8px; }
  .sec-sub { color:var(--muted2); font-size:15px; line-height:1.6; margin-bottom:32px; }

  /* Cards */
  .card { background:var(--panel); border:1px solid var(--border); border-radius:14px; padding:24px; }
  .card + .card { margin-top:12px; }
  .info-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px; margin-bottom:32px; }
  .info-card { background:var(--panel); border:1px solid var(--border); border-radius:12px; padding:18px; }
  .info-label { font-size:10px; font-family:var(--mono); color:var(--muted); letter-spacing:1px; margin-bottom:6px; text-transform:uppercase; }
  .info-val { font-family:var(--mono); font-size:12px; color:var(--accent); word-break:break-all; }

  /* API Keys */
  .new-key-row { display:flex; gap:10px; margin-bottom:20px; }
  .new-key-row input { margin-bottom:0; flex:1; }
  .key-reveal { background:rgba(0,255,136,0.04); border:1px solid rgba(0,255,136,0.2); border-radius:12px; padding:18px; margin-bottom:16px; animation:fadeUp 0.3s ease; }
  .key-reveal h4 { color:var(--green); font-size:13px; margin-bottom:10px; }
  .key-reveal-val { font-family:var(--mono); font-size:12px; color:var(--text); background:var(--bg); border:1px solid var(--border); padding:10px 14px; border-radius:8px; word-break:break-all; cursor:pointer; transition:border 0.2s; }
  .key-reveal-val:hover { border-color:var(--green); }
  .key-reveal p { font-size:12px; color:var(--muted); margin-top:8px; }
  .key-card { background:var(--panel); border:1px solid var(--border); border-radius:12px; padding:18px; margin-bottom:10px; display:flex; align-items:center; justify-content:space-between; gap:12px; animation:fadeUp 0.3s ease; }
  .key-info { flex:1; min-width:0; }
  .key-name { font-weight:700; font-size:14px; margin-bottom:6px; }
  .key-val { font-family:var(--mono); font-size:11px; color:var(--accent); background:rgba(0,229,255,0.05); border:1px solid rgba(0,229,255,0.12); padding:6px 10px; border-radius:6px; margin-bottom:6px; word-break:break-all; cursor:pointer; transition:background 0.2s; display:flex; align-items:center; gap:8px; }
  .key-val:hover { background:rgba(0,229,255,0.1); }
  .key-meta { font-size:11px; color:var(--muted); font-family:var(--mono); }
  .badge { font-size:10px; font-weight:700; padding:3px 8px; border-radius:100px; font-family:var(--mono); }
  .badge.active { background:rgba(0,255,136,0.1); color:var(--green); border:1px solid rgba(0,255,136,0.2); }
  .badge.revoked { background:rgba(255,68,102,0.1); color:var(--red); border:1px solid rgba(255,68,102,0.2); }
  .empty { text-align:center; padding:40px; color:var(--muted); font-size:14px; }
  .empty span { display:block; font-size:32px; margin-bottom:10px; }

  /* Code blocks */
  .code-tabs { display:flex; gap:6px; margin-bottom:12px; flex-wrap:wrap; }
  .code-tab { font-family:var(--mono); font-size:11px; padding:5px 12px; border-radius:6px; border:1px solid var(--border); background:transparent; color:var(--muted); cursor:pointer; transition:all 0.2s; }
  .code-tab:hover { color:var(--text); }
  .code-tab.active { background:var(--accent); color:#000; border-color:var(--accent); }
  .code-block { background:#060c18; border:1px solid var(--border); border-radius:12px; padding:22px; font-family:var(--mono); font-size:12px; line-height:1.9; overflow-x:auto; white-space:pre; color:#c9d1e0; position:relative; }
  .copy-btn { position:absolute; top:12px; right:12px; background:var(--border); border:none; color:var(--muted); font-family:var(--mono); font-size:10px; padding:4px 10px; border-radius:5px; cursor:pointer; transition:all 0.2s; }
  .copy-btn:hover { background:var(--accent); color:#000; }
  .kw { color:#7b61ff; } .str { color:#00e5ff; } .cmt { color:#3a4f70; } .fn { color:#00ff88; } .num { color:#ff9f43; } .key { color:#c9d1e0; }

  /* Toast */
  .toast { position:fixed; bottom:24px; right:24px; background:var(--green); color:#000; font-weight:700; padding:10px 20px; border-radius:8px; font-size:13px; animation:fadeUp 0.3s ease; z-index:999; }

  /* ── HOME ── */
  .home-hero { text-align:center; padding:64px 0 48px; }
  .home-hero h1 { font-size:48px; font-weight:800; line-height:1.1; margin-bottom:16px; }
  .home-hero h1 span { color:var(--accent); }
  .home-hero p { font-size:17px; color:var(--muted2); max-width:540px; margin:0 auto 32px; line-height:1.7; }
  .hero-btns { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
  .feature-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:16px; margin-top:48px; }
  .feature-card { background:var(--panel); border:1px solid var(--border); border-radius:14px; padding:24px; transition:border-color 0.2s; }
  .feature-card:hover { border-color:var(--border2); }
  .feature-icon { font-size:28px; margin-bottom:14px; }
  .feature-title { font-size:15px; font-weight:700; margin-bottom:8px; }
  .feature-desc { font-size:13px; color:var(--muted2); line-height:1.6; }
  .endpoint-list { margin-top:12px; display:flex; flex-direction:column; gap:6px; }
  .endpoint { display:flex; align-items:center; gap:8px; font-family:var(--mono); font-size:11px; }
  .method { padding:2px 7px; border-radius:4px; font-weight:700; font-size:10px; }
  .method.get { background:rgba(0,255,136,0.1); color:var(--green); }
  .method.post { background:rgba(0,229,255,0.1); color:var(--accent); }
  .ep-path { color:var(--muted2); }

  /* ── DEMO ── */
  .demo-layout { display:grid; grid-template-columns:1fr 1fr; gap:20px; align-items:start; }
  @media(max-width:720px) { .demo-layout { grid-template-columns:1fr; } }
  .demo-panel { background:var(--panel); border:1px solid var(--border); border-radius:14px; padding:24px; }
  .demo-panel h3 { font-size:14px; font-weight:700; margin-bottom:4px; }
  .demo-panel p { font-size:12px; color:var(--muted2); margin-bottom:20px; }

  /* Signal PPG */
  .ppg-canvas-wrap { background:#060c18; border-radius:10px; padding:12px; margin-bottom:16px; position:relative; overflow:hidden; }
  canvas.ppg { width:100%; height:100px; display:block; }
  .ppg-label { font-family:var(--mono); font-size:10px; color:var(--muted); position:absolute; top:8px; left:12px; }
  .ppg-live { font-family:var(--mono); font-size:10px; position:absolute; top:8px; right:12px; }

  /* Signal Respiration */
  canvas.resp { width:100%; height:80px; display:block; }

  /* Thermo */
  .thermo-wrap { display:flex; align-items:center; gap:20px; margin-bottom:16px; }
  .thermo-bar { width:18px; height:100px; background:var(--bg); border:1px solid var(--border2); border-radius:9px; overflow:hidden; position:relative; display:flex; align-items:flex-end; }
  .thermo-fill { width:100%; border-radius:9px; transition:height 0.5s ease; }
  .thermo-val { font-size:36px; font-weight:800; }
  .thermo-unit { font-size:14px; color:var(--muted2); }

  /* Demo controls */
  .demo-btn { padding:10px 18px; border-radius:8px; border:none; cursor:pointer; font-family:var(--font); font-size:13px; font-weight:700; transition:all 0.2s; }
  .demo-btn.start { background:var(--accent); color:#000; }
  .demo-btn.stop { background:rgba(255,68,102,0.12); border:1px solid var(--red); color:var(--red); }
  .demo-btn:disabled { opacity:0.4; cursor:not-allowed; }

  .demo-result { background:var(--bg); border:1px solid var(--border2); border-radius:10px; padding:16px; margin-top:16px; }
  .demo-result-title { font-size:11px; font-family:var(--mono); color:var(--muted); margin-bottom:10px; letter-spacing:1px; }
  .demo-val-big { font-size:40px; font-weight:800; }
  .demo-val-unit { font-size:14px; color:var(--muted2); margin-left:4px; }
  .demo-interp { font-size:12px; color:var(--muted2); margin-top:6px; }
  .demo-confidence { font-family:var(--mono); font-size:11px; color:var(--green); margin-top:4px; }

  .json-out { background:#060c18; border:1px solid var(--border); border-radius:10px; padding:14px; font-family:var(--mono); font-size:11px; line-height:1.8; overflow-x:auto; white-space:pre; color:#c9d1e0; margin-top:12px; position:relative; }

  .api-call-row { display:flex; align-items:center; gap:8px; font-family:var(--mono); font-size:11px; padding:8px 12px; background:rgba(0,229,255,0.04); border:1px solid rgba(0,229,255,0.1); border-radius:8px; margin-bottom:10px; }
  .api-call-method { color:var(--accent); font-weight:700; }
  .api-call-url { color:var(--muted2); flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .api-call-status { color:var(--green); }
  .api-spinner { display:inline-block; width:10px; height:10px; border:2px solid var(--muted); border-top-color:var(--accent); border-radius:50%; animation:spin 0.8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }

  /* ── DOCS ── */
  .docs-layout { display:grid; grid-template-columns:200px 1fr; gap:28px; }
  @media(max-width:700px) { .docs-layout { grid-template-columns:1fr; } }
  .docs-nav { position:sticky; top:80px; align-self:start; }
  .docs-nav-item { display:block; padding:7px 12px; border-radius:7px; font-size:13px; color:var(--muted2); cursor:pointer; transition:all 0.2s; border:none; background:transparent; text-align:left; width:100%; }
  .docs-nav-item:hover { color:var(--text); background:rgba(255,255,255,0.04); }
  .docs-nav-item.active { color:var(--accent); background:rgba(0,229,255,0.06); font-weight:600; }
  .docs-section { margin-bottom:48px; }
  .docs-section h2 { font-size:22px; font-weight:800; margin-bottom:8px; padding-top:8px; }
  .docs-section p { font-size:14px; color:var(--muted2); line-height:1.7; margin-bottom:16px; }
  .docs-section h3 { font-size:15px; font-weight:700; margin:20px 0 8px; }
  .endpoint-doc { background:var(--panel); border:1px solid var(--border); border-radius:12px; margin-bottom:12px; overflow:hidden; }
  .endpoint-doc-header { display:flex; align-items:center; gap:12px; padding:14px 18px; cursor:pointer; transition:background 0.2s; }
  .endpoint-doc-header:hover { background:rgba(255,255,255,0.02); }
  .endpoint-doc-body { padding:0 18px 18px; border-top:1px solid var(--border); }
  .param-table { width:100%; border-collapse:collapse; font-size:12px; font-family:var(--mono); margin-top:12px; }
  .param-table th { text-align:left; padding:6px 10px; color:var(--muted); font-size:10px; letter-spacing:1px; text-transform:uppercase; border-bottom:1px solid var(--border); }
  .param-table td { padding:8px 10px; border-bottom:1px solid rgba(26,37,64,0.5); vertical-align:top; }
  .param-name { color:var(--accent); }
  .param-type { color:var(--orange); }
  .param-desc { color:var(--muted2); font-family:var(--font); font-size:12px; }
  .required { color:var(--red); font-size:10px; }
`;

// ─── CODE SNIPPETS ────────────────────────────────────────────────────────────
const snippets = {
  javascript: (key) => `<span class="cmt">// BioMetrics API — JavaScript / React Native</span>
<span class="kw">const</span> API = <span class="str">"https://biometrics-api-production.up.railway.app/api/v1"</span>;
<span class="kw">const</span> KEY = <span class="str">"${key}"</span>;

<span class="kw">const</span> <span class="fn">bm</span> = <span class="kw">async</span> (path, body) => {
  <span class="kw">const</span> res = <span class="kw">await</span> fetch(API + path, {
    method: body ? <span class="str">"POST"</span> : <span class="str">"GET"</span>,
    headers: { <span class="str">"X-API-Key"</span>: KEY, <span class="str">"Content-Type"</span>: <span class="str">"application/json"</span> },
    body: body ? JSON.<span class="fn">stringify</span>(body) : undefined,
  });
  <span class="kw">return</span> res.json();
};

<span class="cmt">// ── Fréquence cardiaque (PPG caméra) ──</span>
<span class="kw">const</span> hrv = <span class="kw">await</span> <span class="fn">bm</span>(<span class="str">"/estimate/hrv"</span>, {
  hr_samples: [<span class="num">72, 74, 70, 73, 75, 71, 68, 74</span>],
});
<span class="cmt">// → { mean_hr: 72.1, hrv_rmssd: 28.4, interpretation: "..." }</span>

<span class="cmt">// ── Température (thermistor batterie) ──</span>
<span class="kw">const</span> temp = <span class="kw">await</span> <span class="fn">bm</span>(<span class="str">"/estimate/temperature"</span>, {
  battery_temp: <span class="num">36.8</span>, contact_time: <span class="num">90</span>, ambient_temp: <span class="num">23.0</span>,
});
<span class="cmt">// → { estimated_temp: 37.1, confidence: 0.72, interpretation: "..." }</span>

<span class="cmt">// ── Respiration (microphone) ──</span>
<span class="kw">const</span> resp = <span class="kw">await</span> <span class="fn">bm</span>(<span class="str">"/estimate/respiration"</span>, {
  respiration_rate: <span class="num">15</span>, peaks_count: <span class="num">11</span>, duration: <span class="num">45</span>, confidence: <span class="num">0.8</span>,
});

<span class="cmt">// ── Sauvegarder une mesure ──</span>
<span class="kw">await</span> <span class="fn">bm</span>(<span class="str">"/measurements/submit"</span>, {
  type: <span class="str">"hr"</span>, value: <span class="num">72</span>, timestamp: <span class="kw">new</span> Date().<span class="fn">toISOString</span>(),
});`,

  python: (key) => `<span class="cmt"># BioMetrics API — Python</span>
<span class="kw">import</span> requests

API = <span class="str">"https://biometrics-api-production.up.railway.app/api/v1"</span>
H = {<span class="str">"X-API-Key"</span>: <span class="str">"${key}"</span>, <span class="str">"Content-Type"</span>: <span class="str">"application/json"</span>}

<span class="cmt"># ── Fréquence cardiaque (PPG) ──</span>
r = requests.<span class="fn">post</span>(f<span class="str">"{API}/estimate/hrv"</span>, headers=H, json={
    <span class="str">"hr_samples"</span>: [<span class="num">72, 74, 70, 73, 75, 71, 68, 74</span>]
})
print(r.json())
<span class="cmt"># {'mean_hr': 72.1, 'hrv_rmssd': 28.4, 'interpretation': '...'}</span>

<span class="cmt"># ── Température (thermistor batterie) ──</span>
r = requests.<span class="fn">post</span>(f<span class="str">"{API}/estimate/temperature"</span>, headers=H, json={
    <span class="str">"battery_temp"</span>: <span class="num">36.8</span>, <span class="str">"contact_time"</span>: <span class="num">90</span>, <span class="str">"ambient_temp"</span>: <span class="num">23.0</span>
})
print(r.json())
<span class="cmt"># {'estimated_temp': 37.1, 'confidence': 0.72, 'interpretation': '...'}</span>

<span class="cmt"># ── Respiration (microphone) ──</span>
r = requests.<span class="fn">post</span>(f<span class="str">"{API}/estimate/respiration"</span>, headers=H, json={
    <span class="str">"respiration_rate"</span>: <span class="num">15</span>, <span class="str">"peaks_count"</span>: <span class="num">11</span>,
    <span class="str">"duration"</span>: <span class="num">45</span>, <span class="str">"confidence"</span>: <span class="num">0.8</span>
})

<span class="cmt"># ── Historique mesures ──</span>
r = requests.<span class="fn">get</span>(f<span class="str">"{API}/measurements/history/hr"</span>, headers=H,
    params={<span class="str">"from"</span>: <span class="str">"2026-02-01"</span>, <span class="str">"to"</span>: <span class="str">"2026-02-28"</span>})
print(r.json())`,

  curl: (key) => `<span class="cmt"># BioMetrics API — cURL</span>

<span class="cmt"># ── Fréquence cardiaque / HRV ──</span>
curl -X POST https://biometrics-api-production.up.railway.app/api/v1/estimate/hrv \\
  -H <span class="str">"X-API-Key: ${key}"</span> \\
  -H <span class="str">"Content-Type: application/json"</span> \\
  -d <span class="str">'{"hr_samples":[72,74,70,73,75,71,68,74]}'</span>

<span class="cmt"># ── Température corporelle ──</span>
curl -X POST https://biometrics-api-production.up.railway.app/api/v1/estimate/temperature \\
  -H <span class="str">"X-API-Key: ${key}"</span> \\
  -H <span class="str">"Content-Type: application/json"</span> \\
  -d <span class="str">'{"battery_temp":36.8,"contact_time":90,"ambient_temp":23.0}'</span>

<span class="cmt"># ── Respiration ──</span>
curl -X POST https://biometrics-api-production.up.railway.app/api/v1/estimate/respiration \\
  -H <span class="str">"X-API-Key: ${key}"</span> \\
  -H <span class="str">"Content-Type: application/json"</span> \\
  -d <span class="str">'{"respiration_rate":15,"peaks_count":11,"duration":45,"confidence":0.8}'</span>

<span class="cmt"># ── Sauvegarder une mesure ──</span>
curl -X POST https://biometrics-api-production.up.railway.app/api/v1/measurements/submit \\
  -H <span class="str">"X-API-Key: ${key}"</span> \\
  -H <span class="str">"Content-Type: application/json"</span> \\
  -d <span class="str">'{"type":"hr","value":72}'</span>`,
};

// ─── UTILS ───────────────────────────────────────────────────────────────────
function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, [onDone]);
  return <div className="toast">✓ {msg}</div>;
}

function useCopy() {
  const [toast, setToast] = useState("");
  const copy = (text, msg = "Copié !") => { navigator.clipboard.writeText(text); setToast(msg); };
  const ToastEl = toast ? <Toast msg={toast} onDone={() => setToast("")} /> : null;
  return { copy, ToastEl };
}

// ─── PAGE ACCUEIL ────────────────────────────────────────────────────────────
function HomePage({ onNav }) {
  return (
    <div className="page anim">
      <div className="home-hero">
        <h1>L'API santé pour<br /><span>vos applications</span></h1>
        <p>Intégrez des mesures biométriques — fréquence cardiaque, température, respiration — en quelques lignes de code. Capteurs réels, algorithmes validés.</p>
        <div className="hero-btns">
          <button className="btn sm" onClick={() => onNav("demo")}>▶ Voir la démo</button>
          <button className="btn sm outline" onClick={() => onNav("docs")}>Documentation →</button>
        </div>
      </div>

      <div className="feature-grid">
        <div className="feature-card">
          <div className="feature-icon">❤️</div>
          <div className="feature-title">Fréquence cardiaque & HRV</div>
          <div className="feature-desc">Via PPG (caméra + flash). Détection de pics, filtre passe-bande, RMSSD calculé côté serveur.</div>
          <div className="endpoint-list">
            <div className="endpoint"><span className="method post">POST</span><span className="ep-path">/estimate/hrv</span></div>
            <div className="endpoint"><span className="method get">GET</span><span className="ep-path">/measurements/latest/hr</span></div>
          </div>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🌡️</div>
          <div className="feature-title">Température corporelle</div>
          <div className="feature-desc">Via thermistor NTC de la batterie. Modèle FeverPhone (IMWUT 2022). Contact cutané 30–120s.</div>
          <div className="endpoint-list">
            <div className="endpoint"><span className="method post">POST</span><span className="ep-path">/estimate/temperature</span></div>
          </div>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🫁</div>
          <div className="feature-title">Fréquence respiratoire</div>
          <div className="feature-desc">Via microphone. Analyse RMS + filtre passe-bas + détection de cycles. 45 secondes.</div>
          <div className="endpoint-list">
            <div className="endpoint"><span className="method post">POST</span><span className="ep-path">/estimate/respiration</span></div>
          </div>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📊</div>
          <div className="feature-title">Historique & résumé</div>
          <div className="feature-desc">Stockage horodaté de toutes les mesures, historique filtrable par date et type.</div>
          <div className="endpoint-list">
            <div className="endpoint"><span className="method get">GET</span><span className="ep-path">/measurements/summary</span></div>
            <div className="endpoint"><span className="method get">GET</span><span className="ep-path">/measurements/history/:type</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PAGE DÉMO ───────────────────────────────────────────────────────────────
function DemoPage({ token }) {
  const { copy, ToastEl } = useCopy();

  // ── PPG (FC) ──
  const ppgCanvasRef = useRef(null);
  const [ppgRunning, setPpgRunning] = useState(false);
  const [ppgResult, setPpgResult] = useState(null);
  const [ppgApiCall, setPpgApiCall] = useState(null);
  const [ppgLoading, setPpgLoading] = useState(false);
  const ppgRef = useRef({ anim: null, phase: 0, samples: [], t: 0 });

  // ── Respiration ──
  const respCanvasRef = useRef(null);
  const [respRunning, setRespRunning] = useState(false);
  const [respResult, setRespResult] = useState(null);
  const [respApiCall, setRespApiCall] = useState(null);
  const [respLoading, setRespLoading] = useState(false);
  const respRef = useRef({ anim: null, phase: 0, t: 0 });

  // ── Température ──
  const [tempRunning, setTempRunning] = useState(false);
  const [tempResult, setTempResult] = useState(null);
  const [tempApiCall, setTempApiCall] = useState(null);
  const [tempLoading, setTempLoading] = useState(false);
  const [tempProgress, setTempProgress] = useState(0);
  const [tempVal, setTempVal] = useState(35.0);
  const tempRef = useRef({ interval: null, count: 0 });

  // ─ PPG animation ─
  const startPPG = useCallback(() => {
    setPpgRunning(true);
    setPpgResult(null);
    const state = ppgRef.current;
    state.samples = [];
    state.t = 0;

    const canvas = ppgCanvasRef.current;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const history = [];

    const tick = () => {
      // Signal PPG simulé : sinusoïde + harmonique + bruit
      const hr = 72; // bpm fixe pour démo
      const freq = hr / 60;
      const val = (
        0.6 * Math.sin(2 * Math.PI * freq * state.t) +
        0.25 * Math.sin(2 * Math.PI * freq * 2 * state.t - 0.5) +
        0.08 * (Math.random() - 0.5)
      );
      history.push(val);
      if (history.length > W) history.shift();

      // Collecter sample toutes les ~0.5s
      if (Math.round(state.t * 30) % 15 === 0) {
        const noise = (Math.random() - 0.5) * 4;
        state.samples.push(Math.round(hr + noise));
      }

      state.t += 1 / 30;

      // Draw
      ctx.fillStyle = "#060c18";
      ctx.fillRect(0, 0, W, H);
      ctx.beginPath();
      ctx.strokeStyle = "#00ff88";
      ctx.lineWidth = 1.5;
      history.forEach((v, i) => {
        const x = i;
        const y = H / 2 - v * (H / 3);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Glow
      ctx.beginPath();
      ctx.strokeStyle = "rgba(0,255,136,0.15)";
      ctx.lineWidth = 6;
      history.forEach((v, i) => {
        const x = i; const y = H / 2 - v * (H / 3);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();

      if (state.t < 8) {
        state.anim = requestAnimationFrame(tick);
      } else {
        stopPPG();
      }
    };
    state.anim = requestAnimationFrame(tick);
  }, []);

  const stopPPG = useCallback(async () => {
    const state = ppgRef.current;
    if (state.anim) { cancelAnimationFrame(state.anim); state.anim = null; }
    setPpgRunning(false);
    setPpgLoading(true);

    const samples = state.samples.length >= 2 ? state.samples : [72, 74, 70, 73, 75, 71, 68, 74];
    const body = { hr_samples: samples };
    setPpgApiCall({ url: "/estimate/hrv", body, status: "pending" });

    try {
      const res = await apiFetch("/estimate/hrv", { method: "POST", body: JSON.stringify(body) }, token);
      setPpgResult(res);
      setPpgApiCall({ url: "/estimate/hrv", body, response: res, status: "ok" });
    } catch (e) {
      setPpgApiCall({ url: "/estimate/hrv", body, response: { error: e.message }, status: "err" });
    }
    setPpgLoading(false);
  }, [token]);

  // ─ Respiration animation ─
  const startResp = useCallback(() => {
    setRespRunning(true);
    setRespResult(null);
    const state = respRef.current;
    state.t = 0;
    const canvas = respCanvasRef.current;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const history = [];

    const tick = () => {
      const rr = 15;
      const freq = rr / 60;
      const val = (
        0.7 * Math.sin(2 * Math.PI * freq * state.t) +
        0.15 * Math.sin(2 * Math.PI * freq * 2 * state.t) +
        0.06 * (Math.random() - 0.5)
      );
      history.push(val);
      if (history.length > W) history.shift();
      state.t += 1 / 30;

      ctx.fillStyle = "#060c18";
      ctx.fillRect(0, 0, W, H);
      ctx.beginPath();
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 1.5;
      history.forEach((v, i) => {
        const x = i; const y = H / 2 - v * (H / 2.5);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();

      if (state.t < 8) {
        state.anim = requestAnimationFrame(tick);
      } else {
        stopResp();
      }
    };
    state.anim = requestAnimationFrame(tick);
  }, []);

  const stopResp = useCallback(async () => {
    const state = respRef.current;
    if (state.anim) { cancelAnimationFrame(state.anim); state.anim = null; }
    setRespRunning(false);
    setRespLoading(true);

    const body = { respiration_rate: 15, peaks_count: 11, duration: 45, confidence: 0.82, noise_level: 12 };
    setRespApiCall({ url: "/estimate/respiration", body, status: "pending" });

    try {
      const res = await apiFetch("/estimate/respiration", { method: "POST", body: JSON.stringify(body) }, token);
      setRespResult(res);
      setRespApiCall({ url: "/estimate/respiration", body, response: res, status: "ok" });
    } catch (e) {
      setRespApiCall({ url: "/estimate/respiration", body, response: { error: e.message }, status: "err" });
    }
    setRespLoading(false);
  }, [token]);

  // ─ Température ─
  const startTemp = useCallback(() => {
    setTempRunning(true);
    setTempResult(null);
    setTempProgress(0);
    setTempVal(35.0);
    const state = tempRef.current;
    state.count = 0;

    state.interval = setInterval(() => {
      state.count++;
      const progress = Math.min(100, Math.round((state.count / 12) * 100));
      setTempProgress(progress);
      // Simuler la montée de température
      const battery = 35.0 + (state.count * 0.12) + (Math.random() * 0.1 - 0.05);
      setTempVal(parseFloat(battery.toFixed(1)));

      if (state.count >= 12) {
        clearInterval(state.interval);
        finishTemp(battery);
      }
    }, 500);
  }, []);

  const finishTemp = useCallback(async (batteryFinal) => {
    setTempRunning(false);
    setTempLoading(true);
    const body = { battery_temp: parseFloat(batteryFinal.toFixed(1)), contact_time: 90, ambient_temp: 23.0 };
    setTempApiCall({ url: "/estimate/temperature", body, status: "pending" });

    try {
      const res = await apiFetch("/estimate/temperature", { method: "POST", body: JSON.stringify(body) }, token);
      setTempResult(res);
      setTempApiCall({ url: "/estimate/temperature", body, response: res, status: "ok" });
    } catch (e) {
      setTempApiCall({ url: "/estimate/temperature", body, response: { error: e.message }, status: "err" });
    }
    setTempLoading(false);
  }, [token]);

  const formatJson = (obj) => JSON.stringify(obj, null, 2)
    .replace(/"([^"]+)":/g, '<span class="key">"$1"</span>:')
    .replace(/: "([^"]+)"/g, ': <span class="str">"$1"</span>')
    .replace(/: (\d+\.?\d*)/g, ': <span class="num">$1</span>');

  const ApiCallBox = ({ call }) => {
    if (!call) return null;
    return (
      <div>
        <div className="api-call-row">
          <span className="api-call-method">POST</span>
          <span className="api-call-url">{API_BASE}{call.url}</span>
          {call.status === "pending" ? <span className="api-spinner" /> :
            call.status === "ok" ? <span className="api-call-status">200 OK</span> :
              <span style={{ color: "var(--red)" }}>Erreur</span>}
        </div>
        {call.response && (
          <div style={{ position: "relative" }}>
            <div className="json-out" dangerouslySetInnerHTML={{ __html: formatJson(call.response) }} />
            <button className="copy-btn" onClick={() => copy(JSON.stringify(call.response, null, 2), "JSON copié !")}>copier</button>
          </div>
        )}
      </div>
    );
  };

  const tempColor = tempResult
    ? tempResult.estimated_temp >= 38 ? "#ff4466"
      : tempResult.estimated_temp >= 37.5 ? "#ff9f43"
        : "#00ff88"
    : "var(--accent)";

  return (
    <div className="page anim">
      {ToastEl}
      <div className="sec-label">Démo interactive</div>
      <h1 className="sec-title">Testez l'API en direct</h1>
      <p className="sec-sub">
        Simulation des signaux capteurs (PPG, respiration, thermistor) — les appels API sont réels et utilisent votre compte.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── FC & HRV ── */}
        <div className="demo-panel">
          <h3>❤️ Fréquence cardiaque & HRV <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 12 }}>— via caméra PPG</span></h3>
          <p>Signal PPG simulé (sinusoïde + harmonique + bruit). Appel réel vers <code style={{ color: "var(--accent)", fontSize: 11 }}>/estimate/hrv</code></p>
          <div className="ppg-canvas-wrap">
            <span className="ppg-label">SIGNAL PPG — CANAL ROUGE</span>
            {ppgRunning && <span className="ppg-live" style={{ color: "var(--green)" }}>● REC</span>}
            <canvas ref={ppgCanvasRef} className="ppg" width={560} height={100} />
          </div>
          <button
            className={`demo-btn ${ppgRunning ? "stop" : "start"}`}
            onClick={ppgRunning ? stopPPG : startPPG}
            disabled={ppgLoading}
          >
            {ppgLoading ? "Appel API..." : ppgRunning ? "⬛ Analyser maintenant" : "▶ Simuler le signal PPG"}
          </button>

          {ppgResult && (
            <div className="demo-result">
              <div className="demo-result-title">RÉSULTAT</div>
              <div>
                <span className="demo-val-big" style={{ color: "var(--red)" }}>{ppgResult.mean_hr}</span>
                <span className="demo-val-unit">bpm</span>
                <span style={{ marginLeft: 20 }}>
                  <span className="demo-val-big" style={{ color: "#a855f7", fontSize: 28 }}>{ppgResult.hrv_rmssd}</span>
                  <span className="demo-val-unit">ms HRV</span>
                </span>
              </div>
              <div className="demo-interp">{ppgResult.interpretation}</div>
            </div>
          )}
          <div style={{ marginTop: 12 }}><ApiCallBox call={ppgApiCall} /></div>
        </div>

        {/* ── Respiration ── */}
        <div className="demo-panel">
          <h3>🫁 Fréquence respiratoire <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 12 }}>— via microphone</span></h3>
          <p>Signal RMS respiratoire simulé (cycles lents ~15 resp/min). Appel réel vers <code style={{ color: "var(--accent)", fontSize: 11 }}>/estimate/respiration</code></p>
          <div className="ppg-canvas-wrap">
            <span className="ppg-label">AMPLITUDE MICROPHONE (RMS)</span>
            {respRunning && <span className="ppg-live" style={{ color: "#3b82f6" }}>● REC</span>}
            <canvas ref={respCanvasRef} className="resp" width={560} height={80} />
          </div>
          <button
            className={`demo-btn ${respRunning ? "stop" : "start"}`}
            style={respRunning ? {} : { background: "#3b82f6" }}
            onClick={respRunning ? stopResp : startResp}
            disabled={respLoading}
          >
            {respLoading ? "Appel API..." : respRunning ? "⬛ Analyser" : "▶ Simuler le souffle"}
          </button>

          {respResult && (
            <div className="demo-result">
              <div className="demo-result-title">RÉSULTAT</div>
              <span className="demo-val-big" style={{ color: "#3b82f6" }}>{respResult.respiration_rate}</span>
              <span className="demo-val-unit">resp/min</span>
              <div className="demo-interp">{respResult.interpretation}</div>
              <div className="demo-confidence">Fiabilité : {Math.round(respResult.confidence * 100)}%</div>
            </div>
          )}
          <div style={{ marginTop: 12 }}><ApiCallBox call={respApiCall} /></div>
        </div>

        {/* ── Température ── */}
        <div className="demo-panel">
          <h3>🌡️ Température corporelle <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 12 }}>— via thermistor batterie</span></h3>
          <p>Simulation de la montée progressive du thermistor NTC. Appel réel vers <code style={{ color: "var(--accent)", fontSize: 11 }}>/estimate/temperature</code></p>
          <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 16 }}>
            <div className="thermo-wrap">
              <div className="thermo-bar">
                <div className="thermo-fill" style={{
                  height: `${Math.min(100, ((tempVal - 34) / 6) * 100)}%`,
                  background: tempVal > 37 ? "linear-gradient(#ff4466,#ff9f43)" : "linear-gradient(#00e5ff,#00ff88)"
                }} />
              </div>
              <div>
                <div className="thermo-val" style={{ color: tempColor }}>{tempVal.toFixed(1)}</div>
                <div className="thermo-unit">°C capteur</div>
              </div>
            </div>
            {tempRunning && (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>Contact simulé : {tempProgress}%</div>
                <div style={{ height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${tempProgress}%`, background: "var(--accent)", borderRadius: 3, transition: "width 0.5s" }} />
                </div>
              </div>
            )}
          </div>

          <button
            className="demo-btn start"
            style={{ background: "#7c3aed" }}
            onClick={startTemp}
            disabled={tempRunning || tempLoading}
          >
            {tempLoading ? "Appel API..." : tempRunning ? "⏳ Mesure en cours..." : "▶ Simuler le contact cutané"}
          </button>

          {tempResult && (
            <div className="demo-result">
              <div className="demo-result-title">RÉSULTAT</div>
              <span className="demo-val-big" style={{ color: tempColor }}>{tempResult.estimated_temp}</span>
              <span className="demo-val-unit">°C corporelle estimée</span>
              <div className="demo-interp">{tempResult.interpretation}</div>
              <div className="demo-confidence">Fiabilité : {Math.round(tempResult.confidence * 100)}%</div>
            </div>
          )}
          <div style={{ marginTop: 12 }}><ApiCallBox call={tempApiCall} /></div>
        </div>

      </div>
    </div>
  );
}

// ─── PAGE DOCUMENTATION ───────────────────────────────────────────────────────
function DocsPage() {
  const [active, setActive] = useState("intro");
  const sections = [
    { id: "intro", label: "Introduction" },
    { id: "auth", label: "Authentification" },
    { id: "endpoints-hr", label: "FC & HRV" },
    { id: "endpoints-temp", label: "Température" },
    { id: "endpoints-resp", label: "Respiration" },
    { id: "endpoints-data", label: "Mesures" },
    { id: "errors", label: "Erreurs" },
  ];

  const [openEp, setOpenEp] = useState({});
  const toggleEp = (id) => setOpenEp(p => ({ ...p, [id]: !p[id] }));

  return (
    <div className="page anim">
      <div className="docs-layout">
        <nav className="docs-nav">
          {sections.map(s => (
            <button key={s.id} className={`docs-nav-item ${active === s.id ? "active" : ""}`} onClick={() => setActive(s.id)}>
              {s.label}
            </button>
          ))}
        </nav>

        <div>
          {active === "intro" && (
            <div className="docs-section">
              <h2>Introduction</h2>
              <p>L'API BioMetrics permet d'intégrer des mesures biométriques dans vos applications. Elle expose des endpoints REST JSON pour les estimations (FC, température, respiration) et la gestion des données.</p>
              <div className="info-grid">
                <div className="info-card"><div className="info-label">Base URL</div><div className="info-val">biometrics-api-production.up.railway.app/api/v1</div></div>
                <div className="info-card"><div className="info-label">Format</div><div className="info-val">JSON — UTF-8</div></div>
                <div className="info-card"><div className="info-label">Auth</div><div className="info-val">Bearer Token ou X-API-Key</div></div>
                <div className="info-card"><div className="info-label">Swagger</div><div className="info-val"><a href="https://biometrics-api-production.up.railway.app/api/docs" target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>/api/docs ↗</a></div></div>
              </div>
            </div>
          )}

          {active === "auth" && (
            <div className="docs-section">
              <h2>Authentification</h2>
              <p>Deux méthodes disponibles selon le contexte.</p>
              <h3>Bearer Token (utilisateur)</h3>
              <p>Obtenu via <code style={{ color: "var(--accent)" }}>POST /auth/login</code>. À passer dans le header <code style={{ color: "var(--accent)" }}>Authorization</code>.</p>
              <div className="code-block">{`Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6...`}</div>
              <h3 style={{ marginTop: 24 }}>X-API-Key (application)</h3>
              <p>Générée depuis le portail développeur (onglet API Keys). Préfixe <code style={{ color: "var(--accent)" }}>bm_</code>.</p>
              <div className="code-block">{`X-API-Key: bm_xxxxxxxxxxxxxxxxxxxx`}</div>
            </div>
          )}

          {active === "endpoints-hr" && (
            <div className="docs-section">
              <h2>Fréquence Cardiaque & HRV</h2>
              <p>Calcul depuis les données PPG (photopléthysmographie) capturées par la caméra du smartphone avec flash activé.</p>
              {[
                {
                  id: "hrv", method: "POST", path: "/estimate/hrv",
                  desc: "Calcule la FC moyenne et la HRV (RMSSD, SDNN) depuis des échantillons PPG.",
                  params: [
                    { name: "hr_samples", type: "float[]", req: true, desc: "Liste de fréquences cardiaques (bpm) issues du signal PPG. Min 2 valeurs." },
                    { name: "is_rr", type: "bool", req: false, desc: "Si true, les valeurs sont des intervalles RR en ms plutôt que des bpm." },
                  ],
                  response: `{ "mean_hr": 72.1, "hrv_sdnn": 18.2, "hrv_rmssd": 28.4, "interpretation": "HRV modérée..." }`
                },
                {
                  id: "hr-submit", method: "POST", path: "/measurements/submit",
                  desc: "Sauvegarde une mesure de fréquence cardiaque.",
                  params: [
                    { name: "type", type: "string", req: true, desc: `"hr" pour la FC, "hrv" pour la variabilité` },
                    { name: "value", type: "float", req: true, desc: "Valeur en bpm ou ms" },
                    { name: "timestamp", type: "datetime", req: false, desc: "ISO 8601. Défaut : maintenant." },
                    { name: "raw_data", type: "object", req: false, desc: "Données brutes du signal (peaks_count, sample_rate, etc.)" },
                  ],
                  response: `{ "id": 42, "type": "hr", "value": 72.1, "unit": "bpm", "timestamp": "..." }`
                },
              ].map(ep => (
                <div className="endpoint-doc" key={ep.id}>
                  <div className="endpoint-doc-header" onClick={() => toggleEp(ep.id)}>
                    <span className={`method ${ep.method.toLowerCase()}`}>{ep.method}</span>
                    <code style={{ color: "var(--muted2)", fontSize: 13 }}>{ep.path}</code>
                    <span style={{ marginLeft: "auto", color: "var(--muted)", fontSize: 12 }}>{openEp[ep.id] ? "▲" : "▼"}</span>
                  </div>
                  {openEp[ep.id] && (
                    <div className="endpoint-doc-body">
                      <p style={{ fontSize: 13, color: "var(--muted2)", margin: "12px 0" }}>{ep.desc}</p>
                      <table className="param-table">
                        <thead><tr><th>Paramètre</th><th>Type</th><th>Requis</th><th>Description</th></tr></thead>
                        <tbody>
                          {ep.params.map(p => (
                            <tr key={p.name}>
                              <td><span className="param-name">{p.name}</span></td>
                              <td><span className="param-type">{p.type}</span></td>
                              <td><span className="required">{p.req ? "●" : ""}</span></td>
                              <td><span className="param-desc">{p.desc}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <h3 style={{ marginTop: 16, fontSize: 12, color: "var(--muted)", letterSpacing: 1 }}>RÉPONSE</h3>
                      <div className="code-block" style={{ fontSize: 11 }}>{ep.response}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {active === "endpoints-temp" && (
            <div className="docs-section">
              <h2>Température Corporelle</h2>
              <p>Estimation via le thermistor NTC de la batterie. Modèle inspiré de FeverPhone (IMWUT 2022). Disponible sur Android uniquement (iOS ne fournit pas l'accès au thermistor).</p>
              <div className="endpoint-doc">
                <div className="endpoint-doc-header" onClick={() => toggleEp("temp")}>
                  <span className="method post">POST</span>
                  <code style={{ color: "var(--muted2)", fontSize: 13 }}>/estimate/temperature</code>
                  <span style={{ marginLeft: "auto", color: "var(--muted)", fontSize: 12 }}>{openEp["temp"] ? "▲" : "▼"}</span>
                </div>
                {openEp["temp"] && (
                  <div className="endpoint-doc-body">
                    <table className="param-table">
                      <thead><tr><th>Paramètre</th><th>Type</th><th>Requis</th><th>Description</th></tr></thead>
                      <tbody>
                        {[
                          { name: "battery_temp", type: "float", req: true, desc: "Température batterie après contact cutané (°C). Lu via expo-device sur Android." },
                          { name: "contact_time", type: "int", req: true, desc: "Durée de contact peau-téléphone en secondes. Min 10s, idéal 120s." },
                          { name: "ambient_temp", type: "float", req: false, desc: "Température avant contact (ambiante). Défaut : 25°C." },
                        ].map(p => (
                          <tr key={p.name}>
                            <td><span className="param-name">{p.name}</span></td>
                            <td><span className="param-type">{p.type}</span></td>
                            <td><span className="required">{p.req ? "●" : ""}</span></td>
                            <td><span className="param-desc">{p.desc}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <h3 style={{ marginTop: 16, fontSize: 12, color: "var(--muted)", letterSpacing: 1 }}>RÉPONSE</h3>
                    <div className="code-block" style={{ fontSize: 11 }}>{`{ "estimated_temp": 37.1, "confidence": 0.72, "interpretation": "Température normale (36.0–37.4°C)", "disclaimer": "..." }`}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {active === "endpoints-resp" && (
            <div className="docs-section">
              <h2>Fréquence Respiratoire</h2>
              <p>Analyse RMS du signal microphone. Le traitement du signal (filtre passe-bas, détection de pics) est effectué côté mobile. Le backend valide, ajuste et interprète.</p>
              <div className="endpoint-doc">
                <div className="endpoint-doc-header" onClick={() => toggleEp("resp")}>
                  <span className="method post">POST</span>
                  <code style={{ color: "var(--muted2)", fontSize: 13 }}>/estimate/respiration</code>
                  <span style={{ marginLeft: "auto", color: "var(--muted)", fontSize: 12 }}>{openEp["resp"] ? "▲" : "▼"}</span>
                </div>
                {openEp["resp"] && (
                  <div className="endpoint-doc-body">
                    <table className="param-table">
                      <thead><tr><th>Paramètre</th><th>Type</th><th>Requis</th><th>Description</th></tr></thead>
                      <tbody>
                        {[
                          { name: "respiration_rate", type: "float", req: true, desc: "Fréquence en resp/min calculée côté mobile (1–80)." },
                          { name: "peaks_count", type: "int", req: false, desc: "Nombre de cycles respiratoires détectés." },
                          { name: "duration", type: "int", req: false, desc: "Durée de la mesure en secondes." },
                          { name: "noise_level", type: "float", req: false, desc: "Niveau de bruit ambiant 0–100. Réduit la confiance si élevé." },
                          { name: "confidence", type: "float", req: false, desc: "Confiance calculée côté mobile (0–1)." },
                        ].map(p => (
                          <tr key={p.name}>
                            <td><span className="param-name">{p.name}</span></td>
                            <td><span className="param-type">{p.type}</span></td>
                            <td><span className="required">{p.req ? "●" : ""}</span></td>
                            <td><span className="param-desc">{p.desc}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <h3 style={{ marginTop: 16, fontSize: 12, color: "var(--muted)", letterSpacing: 1 }}>RÉPONSE</h3>
                    <div className="code-block" style={{ fontSize: 11 }}>{`{ "respiration_rate": 15, "confidence": 0.78, "interpretation": "Fréquence normale (12–20 resp/min)", "disclaimer": "..." }`}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {active === "endpoints-data" && (
            <div className="docs-section">
              <h2>Gestion des mesures</h2>
              <p>Endpoints pour stocker et consulter l'historique des mesures biométriques.</p>
              {[
                { id: "d1", method: "GET", path: "/measurements/summary", desc: "Résumé de la dernière mesure pour chaque type (temperature, hr, hrv, respiration, steps)." },
                { id: "d2", method: "GET", path: "/measurements/latest/{type}", desc: "Dernière mesure d'un type donné." },
                { id: "d3", method: "GET", path: "/measurements/history/{type}?from=&to=&limit=", desc: "Historique filtrable par date. Paramètres : from, to (YYYY-MM-DD), limit (max 500)." },
                { id: "d4", method: "POST", path: "/measurements/submit", desc: "Soumettre une nouvelle mesure. Body : { type, value, timestamp?, raw_data?, notes? }" },
                { id: "d5", method: "DELETE", path: "/measurements/{id}", desc: "Supprimer une mesure par son ID." },
              ].map(ep => (
                <div className="endpoint-doc" key={ep.id} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px" }}>
                    <span className={`method ${ep.method.toLowerCase()}`}>{ep.method}</span>
                    <code style={{ color: "var(--muted2)", fontSize: 12 }}>{ep.path}</code>
                  </div>
                  <div style={{ padding: "0 18px 14px", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                    <p style={{ fontSize: 13, color: "var(--muted2)" }}>{ep.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {active === "errors" && (
            <div className="docs-section">
              <h2>Codes d'erreur</h2>
              <p>L'API retourne des erreurs JSON structurées.</p>
              <div className="code-block">{`{ "detail": "Message d'erreur explicite" }`}</div>
              <table className="param-table" style={{ marginTop: 20 }}>
                <thead><tr><th>Code</th><th>Signification</th></tr></thead>
                <tbody>
                  {[
                    ["400", "Requête malformée"],
                    ["401", "Token manquant ou expiré"],
                    ["403", "Clé API invalide ou révoquée"],
                    ["404", "Ressource introuvable"],
                    ["422", "Validation échouée (valeur hors plage, champ manquant)"],
                    ["500", "Erreur serveur interne"],
                  ].map(([code, msg]) => (
                    <tr key={code}>
                      <td><span style={{ fontFamily: "var(--mono)", color: code.startsWith("4") ? "var(--orange)" : "var(--red)" }}>{code}</span></td>
                      <td><span className="param-desc">{msg}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PAGE API KEYS ────────────────────────────────────────────────────────────
function ApiKeysPage({ user }) {
  const [keys, setKeys] = useState([]);
  const [newName, setNewName] = useState("");
  const [newKey, setNewKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState("javascript");
  const { copy, ToastEl } = useCopy();

  const loadKeys = useCallback(async () => {
    try { setKeys(await apiFetch("/keys/")); } catch {}
  }, []);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  const generateKey = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const k = await apiFetch("/keys/", { method: "POST", body: JSON.stringify({ name: newName }) });
      setNewKey(k); setNewName(""); loadKeys();
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  const revokeKey = async (id) => {
    if (!confirm("Révoquer cette clé ?")) return;
    try { await apiFetch(`/keys/${id}`, { method: "DELETE" }); loadKeys(); } catch (e) { alert(e.message); }
  };

  const displayKey = newKey ? newKey.key : (keys.find(k => k.is_active)?.key || "bm_votre_cle_ici");

  return (
    <div className="page anim">
      {ToastEl}
      <div className="sec-label">API Keys</div>
      <h1 className="sec-title">Clés d'accès</h1>
      <p className="sec-sub">Générez des clés API pour intégrer BioMetrics dans vos applications. Chaque clé est liée à votre compte.</p>

      <div className="info-grid" style={{ marginBottom: 32 }}>
        <div className="info-card"><div className="info-label">Base URL</div><div className="info-val" style={{ cursor: "pointer" }} onClick={() => copy(API_BASE)}>biometrics-api-production.up.railway.app/api/v1</div></div>
        <div className="info-card"><div className="info-label">Header</div><div className="info-val">X-API-Key: bm_...</div></div>
        <div className="info-card"><div className="info-label">Swagger</div><div className="info-val"><a href="https://biometrics-api-production.up.railway.app/api/docs" target="_blank" rel="noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>/api/docs ↗</a></div></div>
      </div>

      <div className="sec-label">Générer une clé</div>
      {newKey && (
        <div className="key-reveal">
          <h4>✓ Clé générée — Copiez-la maintenant !</h4>
          <div className="key-reveal-val" onClick={() => copy(newKey.key, "Clé copiée !")}>{newKey.key}</div>
          <p>⚠️ Cette clé ne sera plus affichée en clair après cette session.</p>
        </div>
      )}
      <div className="new-key-row">
        <input type="text" placeholder="Nom du projet (ex: Mon App Mobile)" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && generateKey()} />
        <button className="btn sm" onClick={generateKey} disabled={loading || !newName.trim()}>{loading ? "..." : "+ Générer"}</button>
      </div>

      <div className="sec-label" style={{ marginTop: 32 }}>Mes clés</div>
      {keys.length === 0
        ? <div className="empty"><span>🔑</span>Aucune clé API. Générez-en une ci-dessus.</div>
        : keys.map(k => (
          <div className="key-card" key={k.id}>
            <div className="key-info">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div className="key-name">{k.name}</div>
                <span className={`badge ${k.is_active ? "active" : "revoked"}`}>{k.is_active ? "Active" : "Révoquée"}</span>
              </div>
              <div className="key-val" onClick={() => copy(k.key, "Clé copiée !")}>
                <span style={{ flex: 1 }}>{k.key}</span>
                <span style={{ fontSize: 10, color: "var(--muted)" }}>copier</span>
              </div>
              <div className="key-meta">
                Créée le {new Date(k.created_at).toLocaleDateString("fr-FR")}
                {k.last_used_at && ` · Utilisée le ${new Date(k.last_used_at).toLocaleDateString("fr-FR")}`}
              </div>
            </div>
            {k.is_active && <button className="btn danger sm" onClick={() => revokeKey(k.id)}>Révoquer</button>}
          </div>
        ))
      }

      <div className="sec-label" style={{ marginTop: 40 }}>Exemples d'intégration</div>
      <div className="code-tabs">
        {["javascript", "python", "curl"].map(l => (
          <button key={l} className={`code-tab ${lang === l ? "active" : ""}`} onClick={() => setLang(l)}>{l}</button>
        ))}
      </div>
      <div className="code-block">
        <button className="copy-btn" onClick={() => copy(snippets[lang](displayKey).replace(/<[^>]+>/g, ""), "Code copié !")}>copier</button>
        <code dangerouslySetInnerHTML={{ __html: snippets[lang](displayKey) }} />
      </div>
    </div>
  );
}

// ─── AUTH ────────────────────────────────────────────────────────────────────
function AuthPage({ onLogin }) {
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setErr(""); setLoading(true);
    try {
      if (tab === "register") {
        await apiFetch("/auth/register", { method: "POST", body: JSON.stringify({ ...form, consent_given: true }) });
        setTab("login"); return;
      }
      const data = await apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email: form.email, password: form.password }) });
      localStorage.setItem("bm_token", data.access_token);
      onLogin(data.user);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-title">BioMetrics <span style={{ color: "var(--accent)" }}>Dev</span></div>
        <div className="auth-sub">Portail développeur — accédez à vos clés API</div>
        <div className="tab-row">
          <button className={`tab ${tab === "login" ? "active" : ""}`} onClick={() => setTab("login")}>Connexion</button>
          <button className={`tab ${tab === "register" ? "active" : ""}`} onClick={() => setTab("register")}>Inscription</button>
        </div>
        {tab === "register" && (<><label>NOM COMPLET</label><input type="text" placeholder="Landry Tadagbe" value={form.name} onChange={set("name")} /></>)}
        <label>EMAIL</label>
        <input type="email" placeholder="dev@example.com" value={form.email} onChange={set("email")} onKeyDown={e => e.key === "Enter" && submit()} />
        <label>MOT DE PASSE</label>
        <input type="password" placeholder="••••••••" value={form.password} onChange={set("password")} onKeyDown={e => e.key === "Enter" && submit()} />
        <button className="btn" onClick={submit} disabled={loading}>{loading ? "..." : tab === "login" ? "Se connecter" : "Créer un compte"}</button>
        {err && <div className="err">{err}</div>}
      </div>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function DeveloperPortal() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("home");

  useEffect(() => {
    const token = localStorage.getItem("bm_token");
    if (token) apiFetch("/auth/me").then(setUser).catch(() => localStorage.removeItem("bm_token"));
  }, []);

  const logout = () => { localStorage.removeItem("bm_token"); setUser(null); setTab("home"); };

  const TABS = [
    { id: "home", label: "Accueil" },
    { id: "demo", label: "Démo interactive" },
    { id: "docs", label: "Documentation" },
    { id: "keys", label: "API Keys", auth: true },
  ];

  return (
    <>
      <style>{css}</style>
      <div className="portal">
        <nav>
          <div className="nav-logo">Bio<span>Metrics</span> <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 13 }}>/ dev</span></div>
          <div className="nav-tabs">
            {TABS.filter(t => !t.auth || user).map(t => (
              <button key={t.id} className={`nav-tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>{t.label}</button>
            ))}
          </div>
          <div className="nav-right">
            <div className="nav-pill"><span className="dot" /> API en ligne</div>
            {user ? (
              <>
                <span className="nav-user">{user.name.split(" ")[0]}</span>
                <button className="nav-logout" onClick={logout}>Déconnexion</button>
              </>
            ) : (
              <button className="nav-tab" onClick={() => setTab("login")}>Se connecter →</button>
            )}
          </div>
        </nav>

        {tab === "login" && !user && <AuthPage onLogin={u => { setUser(u); setTab("keys"); }} />}
        {tab === "home" && <HomePage onNav={setTab} />}
        {tab === "demo" && <DemoPage token={localStorage.getItem("bm_token")} />}
        {tab === "docs" && <DocsPage />}
        {tab === "keys" && user && <ApiKeysPage user={user} />}
        {tab === "keys" && !user && <AuthPage onLogin={u => { setUser(u); setTab("keys"); }} />}
      </div>
    </>
  );
}
