const API_BASE = "https://site.api.espn.com/apis/site/v2/sports/football/nfl";
const DEFAULT_ACCENT = "#d50a0a";

const state = {
  search: "",
  conf: "ALL",
  div: "ALL",
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

// ---------- Team grid ----------

function matchesFilter(team) {
  const q = state.search.trim().toLowerCase();
  if (q && !team.name.toLowerCase().includes(q) && !team.abbr.toLowerCase().includes(q)) {
    return false;
  }
  if (state.conf !== "ALL" && team.conf !== state.conf) return false;
  if (state.div !== "ALL" && team.div !== state.div) return false;
  return true;
}

function renderTeamGrid() {
  const grid = el("team-grid");
  const filtered = TEAMS.filter(matchesFilter);
  grid.innerHTML = "";

  if (!filtered.length) {
    grid.innerHTML = `<p class="no-results">No teams match your filters.</p>`;
    return;
  }

  for (const team of filtered) {
    const card = document.createElement("div");
    card.className = "team-card";
    card.style.setProperty("--card-accent", team.color);
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `View ${team.name} schedule`);
    card.innerHTML = `
      <div class="team-card-top">
        <img src="${teamLogoUrl(team.abbr)}" alt="" loading="lazy" />
        <div>
          <div class="team-card-name">${team.name}</div>
          <div class="team-card-meta">${team.conf} ${team.div}</div>
        </div>
      </div>
      <div class="team-card-actions">
        <button type="button" data-action="schedule">View Schedule</button>
        <a href="${team.site}" target="_blank" rel="noopener noreferrer" data-action="site">Official Site ↗</a>
      </div>
    `;
    card.addEventListener("click", (e) => {
      if (e.target.closest("[data-action='site']")) return; // let link navigate
      selectTeam(team.abbr);
    });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectTeam(team.abbr);
      }
    });
    grid.appendChild(card);
  }
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

  el("team-grid").classList.add("hidden");
  el("reset-btn").classList.remove("hidden");
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
  el("team-grid").classList.remove("hidden");
  el("schedule-section").classList.add("hidden");
  el("reset-btn").classList.add("hidden");
  loadHeroLeague();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---------- Wiring ----------

function initFilters() {
  el("search").addEventListener("input", (e) => {
    state.search = e.target.value;
    renderTeamGrid();
  });

  el("conf-filter").addEventListener("click", (e) => {
    const btn = e.target.closest(".seg-btn");
    if (!btn) return;
    state.conf = btn.dataset.conf;
    el("conf-filter").querySelectorAll(".seg-btn").forEach((b) => b.classList.toggle("active", b === btn));
    renderTeamGrid();
  });

  el("div-filter").addEventListener("change", (e) => {
    state.div = e.target.value;
    renderTeamGrid();
  });

  el("reset-btn").addEventListener("click", resetToAll);
}

function init() {
  initFilters();
  renderTeamGrid();
  loadHeroLeague();
  clockTimer = setInterval(tickClock, 1000);
}

document.addEventListener("DOMContentLoaded", init);
