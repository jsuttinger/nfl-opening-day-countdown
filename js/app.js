const API_BASE = "https://site.api.espn.com/apis/site/v2/sports/football/nfl";
const DEFAULT_ACCENT = "#0ea5e9";

const DIVISION_ORDER = [
  ["AFC", "East"], ["AFC", "North"], ["AFC", "South"], ["AFC", "West"],
  ["NFC", "East"], ["NFC", "North"], ["NFC", "South"], ["NFC", "West"],
];

const state = {
  search: "",
  selectedAbbr: null,
  countdownTarget: null,
  scheduleCache: new Map(), // abbr -> { events, byeWeek }
};

let clockTimer = null;

const el = (id) => document.getElementById(id);

function setAccent(color) {
  document.documentElement.style.setProperty("--accent", color);
  document.documentElement.style.setProperty("--card-accent", color);
  document.documentElement.style.setProperty(
    "--accent-soft",
    hexToRgba(color, 0.18)
  );
}

function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const bigint = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

// ---------- League-wide opening kickoff ----------

async function findLeagueOpener() {
  const now = new Date();
  let year = now.getFullYear();
  for (let attempt = 0; attempt < 3; attempt++) {
    let data;
    try {
      data = await fetchJson(`${API_BASE}/scoreboard?seasontype=2&week=1&dates=${year}`);
    } catch {
      year += 1;
      continue;
    }
    const events = data.events || [];
    if (events.length) {
      const sorted = [...events].sort((a, b) => new Date(a.date) - new Date(b.date));
      const earliest = sorted[0];
      if (new Date(earliest.date) > now) {
        return { date: new Date(earliest.date), event: earliest, year };
      }
    }
    year += 1;
  }
  return null;
}

function describeMatchup(event) {
  const comp = event.competitions[0];
  const home = comp.competitors.find((c) => c.homeAway === "home");
  const away = comp.competitors.find((c) => c.homeAway === "away");
  return `${away.team.displayName} at ${home.team.displayName}`;
}

async function loadHeroLeague() {
  el("hero-logo").classList.add("hidden");
  el("hero-site-link").classList.add("hidden");
  el("hero-label").textContent = "Countdown to NFL Kickoff";
  el("hero-sub").textContent = "Loading schedule…";
  setAccent(DEFAULT_ACCENT);

  try {
    const opener = await findLeagueOpener();
    if (!opener) {
      el("hero-sub").textContent = "Next season's schedule hasn't been released yet — check back soon.";
      setCountdownTarget(null);
      return;
    }
    el("hero-label").textContent = `Countdown to NFL Kickoff ${opener.year}`;
    const network = opener.event.competitions[0].broadcasts?.[0]?.media?.shortName;
    el("hero-sub").innerHTML = `Opening Night: <strong>${describeMatchup(opener.event)}</strong><br>${formatDateTime(opener.date)}${network ? ` · ${network}` : ""}`;
    setCountdownTarget(opener.date);
  } catch (err) {
    el("hero-sub").textContent = "Couldn't load live schedule data. Check your connection and try again.";
    setCountdownTarget(null);
  }
}

// ---------- Countdown clock ----------

function setCountdownTarget(date) {
  state.countdownTarget = date;
  tickClock();
}

function tickClock() {
  const nums = { d: el("hc-days"), h: el("hc-hours"), m: el("hc-mins"), s: el("hc-secs") };
  if (!state.countdownTarget) {
    nums.d.textContent = nums.h.textContent = nums.m.textContent = nums.s.textContent = "--";
    return;
  }
  const diff = state.countdownTarget.getTime() - Date.now();
  if (diff <= 0) {
    nums.d.textContent = "00";
    nums.h.textContent = "00";
    nums.m.textContent = "00";
    nums.s.textContent = "00";
    return;
  }
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  nums.d.textContent = String(days).padStart(2, "0");
  nums.h.textContent = String(hours).padStart(2, "0");
  nums.m.textContent = String(mins).padStart(2, "0");
  nums.s.textContent = String(secs).padStart(2, "0");
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

// ---------- Team drawer (grouped by division) ----------

function matchesSearch(team) {
  const q = state.search.trim().toLowerCase();
  if (!q) return true;
  return team.name.toLowerCase().includes(q) || team.abbr.toLowerCase().includes(q);
}

function renderDrawerList() {
  const container = el("drawer-list");
  container.innerHTML = "";
  let anyVisible = false;

  for (const [conf, div] of DIVISION_ORDER) {
    const teams = TEAMS.filter((t) => t.conf === conf && t.div === div && matchesSearch(t))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (!teams.length) continue;
    anyVisible = true;

    const label = document.createElement("div");
    label.className = "drawer-group-label";
    label.textContent = `${conf} ${div}`;
    container.appendChild(label);

    for (const team of teams) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = `drawer-team${team.abbr === state.selectedAbbr ? " active" : ""}`;
      row.style.setProperty("--row-accent", team.color);
      row.innerHTML = `<img src="${teamLogoUrl(team.abbr)}" alt="" loading="lazy" />${team.name}`;
      row.addEventListener("click", () => selectTeam(team.abbr));
      container.appendChild(row);
    }
  }

  if (!anyVisible) {
    container.innerHTML = `<p class="drawer-no-results">No teams match your search.</p>`;
  }
}

function openDrawer() {
  el("drawer").classList.add("open");
  el("drawer").setAttribute("aria-hidden", "false");
  el("drawer-overlay").classList.add("open");
  el("menu-toggle").setAttribute("aria-expanded", "true");
  document.body.style.overflow = "hidden";
}

function closeDrawer() {
  el("drawer").classList.remove("open");
  el("drawer").setAttribute("aria-hidden", "true");
  el("drawer-overlay").classList.remove("open");
  el("menu-toggle").setAttribute("aria-expanded", "false");
  document.body.style.overflow = "";
}

// ---------- Team schedule ----------

async function getTeamSchedule(abbr) {
  if (state.scheduleCache.has(abbr)) return state.scheduleCache.get(abbr);
  const team = TEAMS_BY_ABBR[abbr];
  let data = await fetchJson(`${API_BASE}/teams/${team.id}/schedule`);
  const now = new Date();
  const allPast = (data.events || []).every((e) => new Date(e.date) < now);
  if (allPast) {
    try {
      const retryYear = now.getFullYear() + 1;
      data = await fetchJson(`${API_BASE}/teams/${team.id}/schedule?season=${retryYear}`);
    } catch {
      // keep original data
    }
  }
  const result = { events: data.events || [], byeWeek: data.byeWeek ?? null };
  state.scheduleCache.set(abbr, result);
  return result;
}

async function selectTeam(abbr) {
  const team = TEAMS_BY_ABBR[abbr];
  if (!team) return;
  state.selectedAbbr = abbr;
  setAccent(team.color);
  renderDrawerList();
  closeDrawer();

  const section = el("schedule-section");
  section.classList.remove("hidden");

  el("hero-logo").src = teamLogoUrl(team.abbr);
  el("hero-logo").alt = `${team.name} logo`;
  el("hero-logo").classList.remove("hidden");
  el("hero-label").textContent = `Countdown to ${team.name} Kickoff`;
  el("hero-sub").textContent = "Loading schedule…";
  const siteLink = el("hero-site-link");
  siteLink.href = team.site;
  siteLink.textContent = `Visit ${team.name.split(" ").pop()} official site ↗`;
  siteLink.classList.remove("hidden");
  setCountdownTarget(null);

  el("schedule-header").innerHTML = `
    <img src="${teamLogoUrl(team.abbr)}" alt="" />
    <div class="schedule-header-info">
      <h2>${team.name}</h2>
      <div class="meta">${team.conf} ${team.div} Division</div>
    </div>
    <a class="site-btn" href="${team.site}" target="_blank" rel="noopener noreferrer">Official Site ↗</a>
  `;
  el("schedule-status").textContent = "Loading schedule…";
  el("schedule-list").innerHTML = "";

  section.scrollIntoView({ behavior: "smooth", block: "start" });

  try {
    const { events, byeWeek } = await getTeamSchedule(abbr);
    renderSchedule(team, events, byeWeek);

    const now = new Date();
    const upcoming = events
      .filter((e) => new Date(e.date) > now)
      .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

    if (upcoming) {
      const network = upcoming.competitions[0].broadcasts?.[0]?.media?.shortName;
      el("hero-sub").innerHTML = `Next up: <strong>${describeMatchup(upcoming)}</strong><br>${formatDateTime(new Date(upcoming.date))}${network ? ` · ${network}` : ""}`;
      setCountdownTarget(new Date(upcoming.date));
    } else {
      el("hero-sub").textContent = "No upcoming games on the schedule right now.";
      setCountdownTarget(null);
    }
  } catch (err) {
    el("schedule-status").textContent = "Couldn't load this team's schedule. Check your connection and try again.";
    el("hero-sub").textContent = "Couldn't load live schedule data.";
  }
}

function renderSchedule(team, events, byeWeek) {
  const now = new Date();
  const sorted = [...events].sort((a, b) => a.week.number - b.week.number);
  const nextEvent = sorted.find((e) => new Date(e.date) > now);

  el("schedule-status").textContent = `${sorted.length} games${byeWeek ? ` · Bye: Week ${byeWeek}` : ""}`;

  const list = el("schedule-list");
  list.innerHTML = "";

  let byeInserted = !byeWeek;
  for (const event of sorted) {
    if (!byeInserted && event.week.number > byeWeek) {
      list.appendChild(renderByeRow(byeWeek));
      byeInserted = true;
    }
    list.appendChild(renderGameRow(team, event, event === nextEvent));
  }
  if (!byeInserted) list.appendChild(renderByeRow(byeWeek));
}

function renderByeRow(byeWeek) {
  const li = document.createElement("li");
  li.className = "game-row is-bye";
  li.innerHTML = `
    <div class="game-week"><strong>${byeWeek}</strong>Week</div>
    <div class="game-main"><div class="game-opponent">Bye Week</div></div>
    <div class="game-right"></div>
  `;
  return li;
}

function renderGameRow(team, event, isNext) {
  const comp = event.competitions[0];
  const mine = comp.competitors.find((c) => c.team.abbreviation === team.abbr);
  const opp = comp.competitors.find((c) => c.team.abbreviation !== team.abbr);
  const isHome = mine.homeAway === "home";
  const date = new Date(event.date);
  const network = comp.broadcasts?.[0]?.media?.shortName;
  const hasScore = mine.score?.displayValue != null && opp.score?.displayValue != null;

  let rightHtml;
  if (hasScore) {
    const won = mine.winner === true;
    const tied = mine.winner == null && mine.score.displayValue === opp.score.displayValue;
    const label = tied ? "T" : won ? "W" : "L";
    const cls = tied ? "" : won ? "win" : "loss";
    rightHtml = `<span class="game-result ${cls}">${label} ${mine.score.displayValue}-${opp.score.displayValue}</span>`;
  } else {
    rightHtml = `${network ? `<div>${network}</div>` : ""}<div>${new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(date)}</div>`;
  }

  const li = document.createElement("li");
  li.className = `game-row${isNext ? " is-next" : ""}`;
  li.innerHTML = `
    <div class="game-week"><strong>${event.week.number}</strong>Week</div>
    <div class="game-main">
      <div class="game-opponent">
        ${isNext ? `<span class="next-tag">Next</span>` : ""}
        <span class="ha-tag">${isHome ? "VS" : "@"}</span>
        <img src="${teamLogoUrl(opp.team.abbreviation)}" alt="" />
        ${opp.team.displayName}
      </div>
      <div class="game-meta">${comp.venue?.fullName ?? ""}</div>
    </div>
    <div class="game-right">
      <div>${new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(date)}</div>
      ${rightHtml}
    </div>
  `;
  return li;
}

function resetToAll() {
  state.selectedAbbr = null;
  el("schedule-section").classList.add("hidden");
  renderDrawerList();
  closeDrawer();
  loadHeroLeague();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---------- Wiring ----------

function initDrawer() {
  el("menu-toggle").addEventListener("click", () => {
    if (el("drawer").classList.contains("open")) closeDrawer();
    else openDrawer();
  });
  el("drawer-close").addEventListener("click", closeDrawer);
  el("drawer-overlay").addEventListener("click", closeDrawer);
  el("drawer-league").addEventListener("click", resetToAll);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });

  el("drawer-search").addEventListener("input", (e) => {
    state.search = e.target.value;
    renderDrawerList();
  });
}

function init() {
  initDrawer();
  renderDrawerList();
  loadHeroLeague();
  clockTimer = setInterval(tickClock, 1000);
}

document.addEventListener("DOMContentLoaded", init);
