#!/usr/bin/env node
// Builds catalog.json — the store list every HAMMS launcher reads.
// Runs automatically on GitHub (see .github/workflows/update-store.yml) whenever:
//   • a game folder is added or changed under games/ or partners/
//   • a Release is published, edited or deleted
//
// Release naming (this is how the launcher knows what a download is):
//   sweetfang-v1.0.4        → Sweetfang, normal build, version 1.0.4
//   sweetfang-lite-v1.0.4   → Sweetfang, Low Spec build, version 1.0.4
// Attach the game's .zip to the release. The release description becomes the patch notes.

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'catalog.json');
const repo = process.env.GITHUB_REPOSITORY || '';
const token = process.env.GITHUB_TOKEN || '';

function api(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'hamms-store', Accept: 'application/vnd.github+json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } }, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && redirects < 5) { res.resume(); return resolve(api(res.headers.location, redirects + 1)); }
      let body = ''; res.setEncoding('utf8'); res.on('data', (d) => (body += d));
      res.on('end', () => (res.statusCode >= 400 ? reject(new Error(`${res.statusCode} ${url}`)) : resolve(JSON.parse(body))));
    }).on('error', reject);
  });
}

function hashUrl(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'hamms-store', Accept: 'application/octet-stream' } }, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && redirects < 8) { res.resume(); return resolve(hashUrl(res.headers.location, redirects + 1)); }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`${res.statusCode} downloading ${url}`)); }
      const h = crypto.createHash('sha256'); res.on('data', (d) => h.update(d)); res.on('end', () => resolve(h.digest('hex')));
    }).on('error', reject);
  });
}

const cmp = (a, b) => {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return d; }
  return 0;
};

function notesFrom(body) {
  const lines = String(body || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const bullets = lines.filter((l) => /^[-*•]/.test(l)).map((l) => l.replace(/^[-*•]\s*/, ''));
  return (bullets.length ? bullets : lines.filter((l) => !l.startsWith('#'))).slice(0, 20);
}

function readGames(dir, partner) {
  const base = path.join(ROOT, dir);
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base).filter((d) => fs.existsSync(path.join(base, d, 'game.json'))).map((d) => {
    const g = JSON.parse(fs.readFileSync(path.join(base, d, 'game.json'), 'utf8'));
    g.id = g.id || d;
    g.partner = partner || !!g.partner;
    // media paths in game.json are relative to the game's folder → make them relative to the repo root
    const rel = (p) => (!p || /^https?:/.test(p) ? p : `${dir}/${d}/${p}`);
    g.media = g.media || {};
    for (const k of ['cover', 'banner', 'hero', 'logo', 'trailer', 'trailerPoster']) g.media[k] = rel(g.media[k]);
    g.media.screenshots = (g.media.screenshots || []).map(rel);
    return g;
  });
}

(async () => {
  const games = [...readGames('games', false), ...readGames('partners', true)];
  const previous = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { games: [] };
  const prevHash = {};
  for (const g of previous.games || []) for (const b of Object.values(g.builds || {})) if (b.downloadUrl && b.sha256) prevHash[b.downloadUrl] = b.sha256;

  // Latest release per game + build
  const latest = {};
  if (repo) {
    for (let page = 1; page < 20; page++) {
      // RELEASES_FILE lets the store be tested offline with a saved list of releases.
      const rels = process.env.RELEASES_FILE
        ? (page === 1 ? JSON.parse(fs.readFileSync(process.env.RELEASES_FILE, 'utf8')) : [])
        : await api(`https://api.github.com/repos/${repo}/releases?per_page=100&page=${page}`);
      if (!rels.length) break;
      for (const r of rels) {
        if (r.draft || r.prerelease) continue;
        const m = /^(.+?)-(lite-)?v(\d+(?:\.\d+)*)$/i.exec(r.tag_name);
        if (!m) continue;
        const [, id, lite, version] = m;
        // A build is either a .zip of the export folder or a single .exe (Godot with embedded .pck).
        const zip = (r.assets || []).find((a) => /\.(zip|exe)$/i.test(a.name));
        if (!zip) { console.warn(`! ${r.tag_name} has no .zip or .exe attached, skipping`); continue; }
        const key = `${id.toLowerCase()}|${lite ? 'lite' : 'standard'}`;
        if (!latest[key] || cmp(version, latest[key].version) > 0) {
          latest[key] = {
            version, downloadUrl: zip.browser_download_url, size: zip.size,
            exeName: /\.exe$/i.test(zip.name) ? zip.name : null,
            digest: zip.digest && zip.digest.startsWith('sha256:') ? zip.digest.slice(7) : null,
            date: (r.published_at || '').slice(0, 10), notes: notesFrom(r.body),
          };
        }
      }
    }
  } else {
    console.log('(no GITHUB_REPOSITORY set — building catalog without releases)');
  }

  for (const g of games) {
    g.builds = {};
    for (const [buildId, label] of [['standard', 'High'], ['lite', 'Low Spec']]) {
      const rel = latest[`${g.id.toLowerCase()}|${buildId}`];
      if (!rel) continue;
      let sha = rel.digest || prevHash[rel.downloadUrl];
      if (!sha) {
        console.log(`hashing ${rel.downloadUrl} …`);
        sha = await hashUrl(rel.downloadUrl);
      }
      g.builds[buildId] = {
        label, version: rel.version, downloadUrl: rel.downloadUrl, sha256: sha, size: rel.size,
        executable: rel.exeName || (buildId === 'lite' && g.liteExecutable) || g.executable,
        launchArgs: (buildId === 'lite' && g.liteLaunchArgs) || g.launchArgs || [],
        released: rel.date,
        patchNotes: [{ version: rel.version, date: rel.date, changes: rel.notes.length ? rel.notes : ['Bug fixes and improvements'] }],
      };
    }
    // carry older patch notes forward so players see history
    const old = (previous.games || []).find((p) => p.id === g.id);
    for (const [bid, b] of Object.entries(g.builds)) {
      const oldNotes = old?.builds?.[bid]?.patchNotes || [];
      b.patchNotes = [...b.patchNotes, ...oldNotes.filter((n) => n.version !== b.version)].slice(0, 10);
    }
    if (g.type === 'web') g.status = g.playUrl ? (g.status === 'coming-soon' ? 'released' : g.status || 'released') : 'coming-soon';
    else if (g.builds.standard || g.builds.lite) g.status = g.status === 'coming-soon' || !g.status ? 'released' : g.status;
    else g.status = 'coming-soon';
  }

  games.sort((a, b) => (a.partner - b.partner) || ((a.order ?? 999) - (b.order ?? 999)) || a.title.localeCompare(b.title));
  const catalog = { studio: 'HAMMS Studios', schema: 2, generatedAt: new Date().toISOString(), games };
  fs.writeFileSync(OUT, JSON.stringify(catalog, null, 2) + '\n');
  console.log(`catalog.json: ${games.length} games (${games.filter((g) => g.status !== 'coming-soon').length} playable)`);
})().catch((e) => { console.error(e); process.exit(1); });
