import { useState, useEffect, useCallback } from "react";

const API = "https://biometrics-api-production.up.railway.app/api/v1";

const apiFetch = async (endpoint, options = {}, token = null) => {
  const t = token || localStorage.getItem("bm_token");
  const res = await fetch(`${API}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Erreur");
  return data;
};

// ─── STYLES ────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #050810;
    --panel: #0c1120;
    --border: #1a2540;
    --accent: #00e5ff;
    --accent2: #7b61ff;
    --green: #00ff88;
    --red: #ff4466;
    --text: #e8edf5;
    --muted: #5a6a8a;
    --font: 'Syne', sans-serif;
    --mono: 'JetBrains Mono', monospace;
  }

  body { background: var(--bg); color: var(--text); font-family: var(--font); }

  .portal {
    min-height: 100vh;
    background: var(--bg);
    background-image:
      radial-gradient(ellipse 80% 50% at 20% -10%, rgba(0,229,255,0.07) 0%, transparent 60%),
      radial-gradient(ellipse 60% 40% at 80% 110%, rgba(123,97,255,0.06) 0%, transparent 60%);
  }

  /* NAV */
  nav {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 40px;
    border-bottom: 1px solid var(--border);
    backdrop-filter: blur(12px);
    position: sticky; top: 0; z-index: 100;
    background: rgba(5,8,16,0.85);
  }
  .logo { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
  .logo span { color: var(--accent); }
  .nav-pill {
    font-family: var(--mono); font-size: 11px; font-weight: 500;
    background: rgba(0,229,255,0.08); border: 1px solid rgba(0,229,255,0.2);
    color: var(--accent); padding: 6px 14px; border-radius: 100px;
    display: flex; align-items: center; gap: 6px;
  }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green);
    box-shadow: 0 0 8px var(--green); animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

  /* AUTH PAGE */
  .auth-wrap {
    display: flex; align-items: center; justify-content: center;
    min-height: calc(100vh - 70px); padding: 40px 20px;
  }
  .auth-card {
    width: 100%; max-width: 440px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 40px;
    animation: fadeUp 0.4s ease;
  }
  @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }

  .auth-title { font-size: 26px; font-weight: 800; margin-bottom: 6px; }
  .auth-sub { color: var(--muted); font-size: 14px; margin-bottom: 32px; }

  .tab-row {
    display: flex; gap: 4px; background: var(--bg);
    border-radius: 8px; padding: 4px; margin-bottom: 28px;
  }
  .tab {
    flex: 1; padding: 8px; border-radius: 6px; border: none; cursor: pointer;
    font-family: var(--font); font-size: 13px; font-weight: 600;
    background: transparent; color: var(--muted); transition: all 0.2s;
  }
  .tab.active { background: var(--panel); color: var(--text); }

  label { display: block; font-size: 12px; font-weight: 600;
    color: var(--muted); letter-spacing: 0.5px; margin-bottom: 6px; }
  input {
    width: 100%; padding: 11px 14px; margin-bottom: 16px;
    background: var(--bg); border: 1px solid var(--border);
    border-radius: 8px; color: var(--text); font-family: var(--font); font-size: 14px;
    outline: none; transition: border 0.2s;
  }
  input:focus { border-color: var(--accent); }

  .btn {
    width: 100%; padding: 12px; border-radius: 8px; border: none; cursor: pointer;
    font-family: var(--font); font-size: 15px; font-weight: 700;
    background: var(--accent); color: #000;
    transition: all 0.2s; position: relative; overflow: hidden;
  }
  .btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .btn.secondary {
    background: transparent; border: 1px solid var(--border);
    color: var(--text); font-size: 13px; padding: 9px;
  }
  .btn.danger { background: rgba(255,68,102,0.1); border: 1px solid var(--red); color: var(--red); }

  .err { color: var(--red); font-size: 13px; margin-top: 12px; text-align: center; }

  /* DASHBOARD */
  .dash { max-width: 900px; margin: 0 auto; padding: 40px 24px; }

  .welcome {
    margin-bottom: 40px;
    padding-bottom: 32px;
    border-bottom: 1px solid var(--border);
  }
  .welcome h1 { font-size: 32px; font-weight: 800; margin-bottom: 6px; }
  .welcome p { color: var(--muted); font-size: 15px; }

  .section-title {
    font-size: 13px; font-weight: 700; letter-spacing: 1px;
    color: var(--muted); text-transform: uppercase; margin-bottom: 16px;
  }

  /* INFO CARDS */
  .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px,1fr)); gap: 12px; margin-bottom: 40px; }
  .info-card {
    background: var(--panel); border: 1px solid var(--border);
    border-radius: 12px; padding: 20px;
  }
  .info-label { font-size: 11px; color: var(--muted); font-family: var(--mono); margin-bottom: 6px; }
  .info-val { font-family: var(--mono); font-size: 13px; color: var(--accent); word-break: break-all; }

  /* NEW KEY */
  .new-key-row {
    display: flex; gap: 10px; margin-bottom: 24px;
  }
  .new-key-row input { margin-bottom: 0; flex: 1; }
  .new-key-row .btn { width: auto; padding: 11px 20px; white-space: nowrap; }

  /* KEY CARDS */
  .key-card {
    background: var(--panel); border: 1px solid var(--border);
    border-radius: 12px; padding: 20px;
    margin-bottom: 10px;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    animation: fadeUp 0.3s ease;
  }
  .key-info { flex: 1; min-width: 0; }
  .key-name { font-weight: 700; font-size: 15px; margin-bottom: 4px; }
  .key-val {
    font-family: var(--mono); font-size: 12px; color: var(--accent);
    background: rgba(0,229,255,0.06); border: 1px solid rgba(0,229,255,0.15);
    padding: 6px 10px; border-radius: 6px; margin-bottom: 6px;
    word-break: break-all; cursor: pointer; transition: background 0.2s;
    display: flex; align-items: center; gap: 8px;
  }
  .key-val:hover { background: rgba(0,229,255,0.12); }
  .key-meta { font-size: 11px; color: var(--muted); font-family: var(--mono); }
  .badge {
    font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 100px;
    font-family: var(--mono);
  }
  .badge.active { background: rgba(0,255,136,0.1); color: var(--green); border: 1px solid rgba(0,255,136,0.2); }
  .badge.revoked { background: rgba(255,68,102,0.1); color: var(--red); border: 1px solid rgba(255,68,102,0.2); }

  /* NEW KEY REVEAL */
  .key-reveal {
    background: rgba(0,255,136,0.05); border: 1px solid rgba(0,255,136,0.2);
    border-radius: 12px; padding: 20px; margin-bottom: 20px; animation: fadeUp 0.3s ease;
  }
  .key-reveal h4 { color: var(--green); font-size: 13px; margin-bottom: 10px; }
  .key-reveal-val {
    font-family: var(--mono); font-size: 13px; color: var(--text);
    background: var(--bg); border: 1px solid var(--border);
    padding: 12px 14px; border-radius: 8px; word-break: break-all;
    cursor: pointer; transition: border 0.2s;
  }
  .key-reveal-val:hover { border-color: var(--green); }
  .key-reveal p { font-size: 12px; color: var(--muted); margin-top: 8px; }

  /* CODE BLOCK */
  .code-section { margin-top: 40px; }
  .code-tabs { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
  .code-tab {
    font-family: var(--mono); font-size: 12px; padding: 6px 14px;
    border-radius: 6px; border: 1px solid var(--border);
    background: transparent; color: var(--muted); cursor: pointer; transition: all 0.2s;
  }
  .code-tab.active { background: var(--accent); color: #000; border-color: var(--accent); }
  .code-block {
    background: #070d1a; border: 1px solid var(--border); border-radius: 12px;
    padding: 24px; font-family: var(--mono); font-size: 12.5px; line-height: 1.8;
    overflow-x: auto; white-space: pre; color: #c9d1e0;
    position: relative;
  }
  .copy-btn {
    position: absolute; top: 12px; right: 12px;
    background: var(--border); border: none; color: var(--muted);
    font-family: var(--mono); font-size: 11px; padding: 5px 10px;
    border-radius: 5px; cursor: pointer; transition: all 0.2s;
  }
  .copy-btn:hover { background: var(--accent); color: #000; }
  .kw { color: #7b61ff; }
  .str { color: #00e5ff; }
  .cmt { color: #3d4f6e; }
  .fn { color: #00ff88; }

  .logout-row { margin-top: 48px; padding-top: 24px; border-top: 1px solid var(--border); display:flex; justify-content:flex-end; }

  .empty { text-align:center; padding: 40px; color: var(--muted); font-size: 14px; }
  .empty span { display:block; font-size: 32px; margin-bottom: 10px; }

  .copied-toast {
    position: fixed; bottom: 24px; right: 24px;
    background: var(--green); color: #000; font-weight: 700;
    padding: 10px 20px; border-radius: 8px; font-size: 13px;
    animation: fadeUp 0.3s ease;
    z-index: 999;
  }
`;

const snippets = {
  javascript: (key) => `// BioMetrics API — JavaScript / React
<span class="kw">const</span> API = <span class="str">"https://biometrics-api-production.up.railway.app/api/v1"</span>;
<span class="kw">const</span> KEY = <span class="str">"${key}"</span>;

<span class="kw">const</span> <span class="fn">apiFetch</span> = <span class="kw">async</span> (path, options = {}) => {
  <span class="kw">const</span> res = <span class="kw">await</span> fetch(<span class="str">\`\${API}\${path}\`</span>, {
    headers: { <span class="str">"X-API-Key"</span>: KEY, <span class="str">"Content-Type"</span>: <span class="str">"application/json"</span> },
    ...options,
  });
  <span class="kw">return</span> res.json();
};

<span class="cmt">// Récupérer les mesures</span>
<span class="kw">const</span> data = <span class="kw">await</span> <span class="fn">apiFetch</span>(<span class="str">"/measurements/"</span>);

<span class="cmt">// Ajouter une mesure</span>
<span class="kw">await</span> <span class="fn">apiFetch</span>(<span class="str">"/measurements/"</span>, {
  method: <span class="str">"POST"</span>,
  body: JSON.<span class="fn">stringify</span>({ type: <span class="str">"temperature"</span>, value: <span class="str">37.2</span>, unit: <span class="str">"°C"</span> }),
});`,

  python: (key) => `<span class="cmt"># BioMetrics API — Python</span>
<span class="kw">import</span> requests

API = <span class="str">"https://biometrics-api-production.up.railway.app/api/v1"</span>
HEADERS = {<span class="str">"X-API-Key"</span>: <span class="str">"${key}"</span>}

<span class="cmt"># Récupérer les mesures</span>
r = requests.<span class="fn">get</span>(f<span class="str">"{API}/measurements/"</span>, headers=HEADERS)
print(r.json())

<span class="cmt"># Ajouter une mesure</span>
r = requests.<span class="fn">post</span>(f<span class="str">"{API}/measurements/"</span>, headers=HEADERS, json={
    <span class="str">"type"</span>: <span class="str">"temperature"</span>, <span class="str">"value"</span>: 37.2, <span class="str">"unit"</span>: <span class="str">"°C"</span>
})
print(r.json())

<span class="cmt"># Estimation température ML</span>
r = requests.<span class="fn">post</span>(f<span class="str">"{API}/estimate/temperature"</span>, headers=HEADERS, json={
    <span class="str">"battery_temp"</span>: 36.5, <span class="str">"contact_time"</span>: 120, <span class="str">"ambient_temp"</span>: 23.0
})
print(r.json())`,

  curl: (key) => `<span class="cmt"># BioMetrics API — cURL</span>

<span class="cmt"># Récupérer les mesures</span>
curl https://biometrics-api-production.up.railway.app/api/v1/measurements/ \\
  -H <span class="str">"X-API-Key: ${key}"</span>

<span class="cmt"># Ajouter une mesure</span>
curl -X POST https://biometrics-api-production.up.railway.app/api/v1/measurements/ \\
  -H <span class="str">"X-API-Key: ${key}"</span> \\
  -H <span class="str">"Content-Type: application/json"</span> \\
  -d <span class="str">'{"type":"temperature","value":37.2,"unit":"°C"}'</span>

<span class="cmt"># Estimation HRV</span>
curl -X POST https://biometrics-api-production.up.railway.app/api/v1/estimate/hrv \\
  -H <span class="str">"X-API-Key: ${key}"</span> \\
  -H <span class="str">"Content-Type: application/json"</span> \\
  -d <span class="str">'{"hr_samples":[72,74,70,73,75,71,72,68,74,73]}'</span>`,
};

// ─── COMPONENTS ─────────────────────────────────────────────────────────────

function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, [onDone]);
  return <div className="copied-toast">✓ {msg}</div>;
}

function AuthPage({ onLogin }) {
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setErr(""); setLoading(true);
    try {
      if (tab === "register") {
        await apiFetch("/auth/register", {
          method: "POST",
          body: JSON.stringify({ email: form.email, password: form.password, name: form.name, consent_given: true }),
        });
        setTab("login");
        setErr("");
        return;
      }
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
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

        {tab === "register" && (
          <><label>NOM COMPLET</label><input placeholder="Landry Tadagbe" value={form.name} onChange={set("name")} /></>
        )}
        <label>EMAIL</label>
        <input type="email" placeholder="dev@example.com" value={form.email} onChange={set("email")} onKeyDown={(e) => e.key === "Enter" && submit()} />
        <label>MOT DE PASSE</label>
        <input type="password" placeholder="••••••••" value={form.password} onChange={set("password")} onKeyDown={(e) => e.key === "Enter" && submit()} />

        <button className="btn" onClick={submit} disabled={loading}>
          {loading ? "..." : tab === "login" ? "Se connecter" : "Créer un compte"}
        </button>
        {err && <div className="err">{err}</div>}
      </div>
    </div>
  );
}

function Dashboard({ user, onLogout }) {
  const [keys, setKeys] = useState([]);
  const [newName, setNewName] = useState("");
  const [newKey, setNewKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState("javascript");
  const [toast, setToast] = useState("");

  const loadKeys = useCallback(async () => {
    try { setKeys(await apiFetch("/keys/")); } catch {}
  }, []);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  const generateKey = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const k = await apiFetch("/keys/", { method: "POST", body: JSON.stringify({ name: newName }) });
      setNewKey(k);
      setNewName("");
      loadKeys();
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  const revokeKey = async (id) => {
    if (!confirm("Révoquer cette clé ?")) return;
    try { await apiFetch(`/keys/${id}`, { method: "DELETE" }); loadKeys(); } catch (e) { alert(e.message); }
  };

  const copy = (text, msg = "Copié !") => {
    navigator.clipboard.writeText(text);
    setToast(msg);
  };

  const displayKey = newKey ? newKey.key : (keys.find(k => k.is_active)?.key || "bm_votre_cle_ici");

  return (
    <div className="dash">
      {toast && <Toast msg={toast} onDone={() => setToast("")} />}

      <div className="welcome">
        <h1>Bonjour, {user.name.split(" ")[0]} 👋</h1>
        <p>Gérez vos clés API et intégrez BioMetrics dans vos applications.</p>
      </div>

      {/* Info */}
      <div className="section-title">Informations API</div>
      <div className="info-grid" style={{ marginBottom: 40 }}>
        <div className="info-card">
          <div className="info-label">BASE URL</div>
          <div className="info-val" style={{ cursor: "pointer" }} onClick={() => copy("https://biometrics-api-production.up.railway.app/api/v1")}>
            biometrics-api-production.up.railway.app/api/v1
          </div>
        </div>
        <div className="info-card">
          <div className="info-label">DOCUMENTATION</div>
          <div className="info-val">
            <a href="https://biometrics-api-production.up.railway.app/api/docs" target="_blank" rel="noreferrer"
              style={{ color: "var(--accent)", textDecoration: "none" }}>
              /api/docs ↗
            </a>
          </div>
        </div>
        <div className="info-card">
          <div className="info-label">AUTHENTIFICATION</div>
          <div className="info-val">Header: X-API-Key</div>
        </div>
      </div>

      {/* Nouvelle clé */}
      <div className="section-title">Clés API</div>

      {newKey && (
        <div className="key-reveal">
          <h4>✓ Clé générée — Copiez-la maintenant !</h4>
          <div className="key-reveal-val" onClick={() => copy(newKey.key, "Clé copiée !")}>
            {newKey.key}
          </div>
          <p>⚠️ Cette clé ne sera plus affichée en clair après cette session.</p>
        </div>
      )}

      <div className="new-key-row">
        <input
          placeholder="Nom du projet (ex: Mon App Lovable)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && generateKey()}
        />
        <button className="btn" onClick={generateKey} disabled={loading || !newName.trim()}>
          {loading ? "..." : "+ Générer"}
        </button>
      </div>

      {keys.length === 0 ? (
        <div className="empty"><span>🔑</span>Aucune clé API. Générez-en une ci-dessus.</div>
      ) : (
        keys.map((k) => (
          <div className="key-card" key={k.id}>
            <div className="key-info">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div className="key-name">{k.name}</div>
                <span className={`badge ${k.is_active ? "active" : "revoked"}`}>
                  {k.is_active ? "Active" : "Révoquée"}
                </span>
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
            {k.is_active && (
              <button className="btn danger secondary" onClick={() => revokeKey(k.id)}>
                Révoquer
              </button>
            )}
          </div>
        ))
      )}

      {/* Code snippets */}
      <div className="code-section">
        <div className="section-title">Exemples d'intégration</div>
        <div className="code-tabs">
          {["javascript", "python", "curl"].map((l) => (
            <button key={l} className={`code-tab ${lang === l ? "active" : ""}`} onClick={() => setLang(l)}>
              {l}
            </button>
          ))}
        </div>
        <div className="code-block">
          <button className="copy-btn" onClick={() => {
            const raw = snippets[lang](displayKey).replace(/<[^>]+>/g, "");
            copy(raw, "Code copié !");
          }}>copier</button>
          <code dangerouslySetInnerHTML={{ __html: snippets[lang](displayKey) }} />
        </div>
      </div>

      <div className="logout-row">
        <button className="btn secondary" style={{ width: "auto", padding: "9px 20px" }} onClick={() => {
          localStorage.removeItem("bm_token");
          onLogout();
        }}>
          Déconnexion
        </button>
      </div>
    </div>
  );
}

// ─── APP ────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("bm_token");
    if (token) {
      apiFetch("/auth/me").then(setUser).catch(() => localStorage.removeItem("bm_token"));
    }
  }, []);

  return (
    <>
      <style>{css}</style>
      <div className="portal">
        <nav>
          <div className="logo">Bio<span>Metrics</span> <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 14 }}>/ dev</span></div>
          <div className="nav-pill"><span className="dot" /> API en ligne</div>
        </nav>
        {user
          ? <Dashboard user={user} onLogout={() => setUser(null)} />
          : <AuthPage onLogin={setUser} />
        }
      </div>
    </>
  );
}
