import { eliteSatProfiles, eliteSatSections } from "./data/elite-sat-review.ts";
import { qsRanks, qsOrder } from "./qs.ts";
import universityMedia from "./data/university-media.json" with { type: "json" };
import {
  REVIEW_DATE,
  ambitiousSchoolIds,
  universityReviews,
  ucProfiles,
  confirmed2028Policies,
} from "./university-review.ts";
import { getLanguage, translate } from "./i18n.ts";
import {
  listDiff,
  satOutlook,
  satPosition,
  selectivity,
  type SatPosition,
} from "./matching.ts";
import { dayLabel, positionLabels } from "./home-page.ts";
import {
  browseSchools,
  emptyBrowse,
  type BrowseFilters,
} from "./school-browse.ts";
import type { Note } from "./journal.ts";
import { VISIBLE_GRADE_BANDS } from "./candidate-plans.ts";
import { SAT_SCENARIOS } from "./comparison.ts";
import { bandPosition } from "./sat-bands.ts";
import { scenarioSchools, scenarioSourceMap } from "./data/scenario-catalog.ts";
import {
  candidatePlan,
  candidateMatrix,
  normalizeCandidateInput,
  candidateRoute,
  candidateSatAdvice,
  gradeResearchNote,
} from "./candidate-plans.ts";
import type { ScenarioSchool, ScenarioInput } from "./scenario-types.ts";
export type ExplorerMode =
  | "scenario"
  | "browse"
  | "all-scenarios"
  | "compare"
  | "catalog"
  | "sat-map"
  | "saved"
  | "uc";
const w = (en: string, ko: string) => (getLanguage() === "ko" ? ko : en);
const esc = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const name = (s: ScenarioSchool) => w(s.name, s.nameKo);
const refs = (ids: string[]) =>
  `<div class="scenario-refs" data-original-language lang="en">${[
    ...new Set(ids),
  ]
    .map((id) => {
      const s = scenarioSourceMap.get(id);
      return s
        ? `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a>`
        : "";
    })
    .join("")}</div>`;
const rank = (s: ScenarioSchool) => {
  const q = qsRanks[s.id];
  return q
    ? `QS ${q.edition} · ${w("World", "세계")} ${q.tied ? "=" : ""}${q.rank}${q.scope ? ` · ${q.scope}` : ""}`
    : w("QS rank not verified", "QS 순위 미확인");
};
type SchoolImage = {
  src: string;
  sourceUrl: string;
  credit: string;
  license: string;
  licenseUrl?: string;
  title?: string;
};
const media = universityMedia as Record<
  string,
  { logo?: SchoolImage; campus?: SchoolImage }
>;
// Photo and logo credits stay visible wherever the images are shown.
function imageCredits(s: ScenarioSchool) {
  const images = media[s.id];
  if (!images?.campus) return "";
  return `<details class="image-credits"><summary>${w("Image credits", "이미지 출처")}</summary><div>${[
    images.campus,
    images.logo,
  ]
    .filter((item): item is SchoolImage => !!item)
    .map(
      (item, index) =>
        `<a href="${esc(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">${index === 0 ? w("Campus photo", "캠퍼스 사진") : w("University logo", "학교 로고")} ↗</a><span>${esc(item.credit)} · ${item.licenseUrl ? `<a href="${esc(item.licenseUrl)}" target="_blank" rel="noopener noreferrer">${esc(item.license)}</a>` : esc(item.license)}</span>`,
    )
    .join("")}</div></details>`;
}
function selectors(input: ScenarioInput) {
  return `<section class="scenario-selectors sat-only" aria-label="${w("SAT input", "SAT 점수 입력")}"><label>${w("SAT score (optional)", "SAT 점수 (선택)")}<input id="scenario-sat" type="number" inputmode="numeric" min="400" max="1600" step="10" value="${input.sat ?? ""}" placeholder="400–1600"></label><p>${w("Korean citizen · International first-year applicant in the U.S.", "한국 시민권자 · 미국 대학 국제 신입생 지원")}<br><span>${w("Humanities, sociology and history · Choose a grade scenario in the table.", "인문학·사회학·역사학 중심 · 내신 구간은 표에서 선택하세요.")}</span></p></section>`;
}
const disclosure = () =>
  `<div class="scenario-accuracy"><strong>${w("Ten research candidates per combination — eligibility is not confirmed.", "조합당 10곳은 지원 검토 후보입니다. 합격 가능·자격 충족이 확정된 10곳이 아닙니다.")}</strong><p>${w("School requirements and score distributions are sourced facts. Grade-band placement is editorial judgment; lists prioritize verified QS world ranks; this is not an admission likelihood rank. Ontario percentages are not converted to U.S. GPA; university transcript review, English and entry-year policies remain necessary.", "대학 요건·SAT 분포는 출처가 있는 사실이고, 구간별 후보 선정은 편집 판단입니다. 목록은 확인된 QS 세계순위 순이며 합격 가능성 순위가 아닙니다. 온타리오 내신을 미국 GPA로 임의 환산하지 않습니다. 대학별 성적표·영어·지원 연도 규정 확인이 필요합니다.")}</p></div>`;
const positionClass: Record<SatPosition, string> = {
  within: "pos-within",
  below: "pos-below",
  above: "pos-other",
  "no-data": "pos-other",
  "not-considered": "pos-other",
};
function positionChip(s: ScenarioSchool, sat: number | null) {
  const p = satPosition(s, sat);
  const gap =
    p === "below" && sat !== null
      ? w(`${s.satRange!.low - sat} below`, `${s.satRange!.low - sat}점 아래`)
      : p === "above" && sat !== null
        ? w(`${sat - s.satRange!.high} above`, `${sat - s.satRange!.high}점 위`)
        : w(...positionLabels[p]);
  return `<span class="pos-chip ${positionClass[p]}">${gap}</span>${p === "below" ? `<span class="small muted pos-note">${w(`In range from ${s.satRange!.low}`, `${s.satRange!.low}부터 범위 안`)}</span>` : ""}`;
}
function positionChipOnly(s: ScenarioSchool, sat: number | null) {
  const p = satPosition(s, sat);
  const label =
    p === "below" && sat !== null
      ? w(`${s.satRange!.low - sat} below`, `${s.satRange!.low - sat}점 아래`)
      : p === "above" && sat !== null
        ? w(`${sat - s.satRange!.high} above`, `${sat - s.satRange!.high}점 위`)
        : p === "within"
          ? w("Within range", "범위 안")
          : w(...positionLabels[p]);
  return `<span class="pos-chip ${positionClass[p]}">${label}</span>`;
}
// A 1000–1600 scale bar: the school's middle 50% and Taeyul's score.
export function satBar(s: ScenarioSchool, sat: number | null) {
  if (!s.satRange) return "";
  const pct = (n: number) =>
    Math.min(Math.max(((n - 1000) / 600) * 100, 0), 100);
  return `<span class="sat-bar" aria-hidden="true"><i style="left:${pct(s.satRange.low)}%;width:${pct(s.satRange.high) - pct(s.satRange.low)}%"></i>${sat !== null ? `<b style="left:${pct(sat)}%"></b>` : ""}</span>`;
}
function schoolPhoto(s: ScenarioSchool) {
  const campus = media[s.id]?.campus;
  return campus
    ? `<img src="${esc(`${import.meta.env?.BASE_URL ?? "/"}${campus.src}`)}" alt="" loading="lazy" decoding="async">`
    : "";
}
const typeLabel = (s: ScenarioSchool) =>
  /private/i.test(s.type) ? w("Private", "사립") : w("Public", "주립");
function browse(
  ctx: ExplorerContext,
  saved: Set<string>,
  mineIds: Set<string>,
) {
  const f = ctx.browse;
  const sat = ctx.mine?.sat ?? null;
  const list = browseSchools(scenarioSchools, f);
  const chip = (attr: string, active: boolean, label: string) =>
    `<button class="filter-chip ${active ? "is-on" : ""}" ${attr} aria-pressed="${active}">${label}</button>`;
  const bands: [BrowseFilters["band"], string][] = [
    ["under-1200", "~1199"],
    ["1200", "1200–1299"],
    ["1300", "1300–1399"],
    ["1400", "1400+"],
  ];
  const mineBandId =
    sat === null
      ? ""
      : sat < 1200
        ? "under-1200"
        : sat < 1300
          ? "1200"
          : sat < 1400
            ? "1300"
            : "1400";
  const filters = `<section class="panel browse-filters" aria-label="${w("Find", "찾기")}"><div class="browse-row"><label class="browse-search"><span class="sr-only">${w("Search universities or programs", "대학·전공 검색")}</span><input id="browse-search" type="search" placeholder="${w("Search a university or program", "대학 이름이나 전공으로 찾기")}" value="${esc(f.search)}"></label><label class="browse-sort">${w("Sort", "정렬")}<select id="browse-sort"><option value="qs" ${f.sort === "qs" ? "selected" : ""}>${w("QS rank", "QS 순위")}</option><option value="sat" ${f.sort === "sat" ? "selected" : ""}>${w("Lowest SAT first", "SAT 낮은 순")}</option><option value="name" ${f.sort === "name" ? "selected" : ""}>${w("Name", "이름")}</option></select></label></div><div class="browse-row chips"><span class="small muted">${w("SAT band", "SAT 구간")}</span>${bands
    .map(([id, label]) =>
      chip(
        `data-browse-band="${id}"`,
        f.band === id,
        `${label}${id === mineBandId ? ` · ${w("my score", "내 점수")}` : ""}`,
      ),
    )
    .join(
      "",
    )}<span class="chip-sep"></span>${chip('data-browse-flag="optionalOnly"', f.optionalOnly, w("Test optional", "시험 선택 제출"))}${chip('data-browse-flag="ucOnly"', f.ucOnly, w("UC · 9 campuses", "UC 9개 캠퍼스"))}${chip('data-browse-flag="privateOnly"', f.privateOnly, w("Private", "사립"))}</div></section>`;
  const cards = list
    .map((s) => {
      const q = qsRanks[s.id];
      const p = satPosition(s, sat);
      return `<article class="browse-card ${mineIds.has(s.id) ? "is-mine" : ""}"><div class="browse-photo">${schoolPhoto(s)}${q ? `<span class="photo-tag">QS ${q.tied ? "=" : ""}${q.rank}</span>` : ""}${mineIds.has(s.id) ? `<span class="photo-tag mine">${w("My list", "내 후보")}</span>` : ""}<button class="photo-save ${saved.has(s.id) ? "saved" : ""}" data-save="${s.id}" aria-pressed="${saved.has(s.id)}" aria-label="${esc(w("Save school", "대학 저장"))} ${esc(name(s))}">${saved.has(s.id) ? "✓" : "+"}</button></div><div class="browse-body"><div><button class="link-button browse-name" data-detail="${s.id}">${esc(name(s))}</button><span class="small muted">${esc(s.city)}, ${esc(s.state)} · ${typeLabel(s)}</span></div>${
        s.satRange
          ? `<div>${satBar(s, sat)}<div class="bar-caption"><span>SAT ${s.satRange.low}–${s.satRange.high}</span>${sat !== null ? positionChipOnly(s, sat) : ""}</div></div>`
          : `<div class="bar-caption"><span class="muted">${p === "not-considered" ? w("SAT not considered", "SAT 미반영") : w("No published SAT range", "공개 SAT 분포 없음")}</span></div>`
      }<span class="small">${esc(translate(w(s.entry.program, s.entry.programKo)))} · ${esc(w(s.entry.unit, s.entry.unitKo))}</span></div></article>`;
    })
    .join("");
  return `${filters}<div class="browse-count"><strong>${w(`${list.length} of ${scenarioSchools.length}`, `${scenarioSchools.length}곳 중 ${list.length}곳`)}</strong>${f.search || f.band || f.optionalOnly || f.ucOnly || f.privateOnly ? `<button class="text-button" id="browse-clear">${w("Clear filters", "필터 지우기")}</button>` : ""}</div>${list.length ? `<div class="browse-grid">${cards}</div>` : `<p class="empty-state">${w("No schools match.", "맞는 대학이 없어요.")}</p>`}${sat !== null ? `<div class="bar-legend small muted"><span><i class="lg-range"></i>${w("School SAT middle 50%", "대학 SAT 중간 50%")}</span><span><i class="lg-me"></i>${w(`Taeyul ${sat}`, `태율이 ${sat}`)}</span><span>${w("Bar scale 1000–1600", "막대 범위 1000–1600")}</span></div>` : ""}<p class="small muted shortlist-note">${w("Research records, not admission predictions. Ontario marks are not converted to a U.S. GPA.", "합격 예측이 아닌 조사 기록이에요. 온타리오 내신을 미국 GPA로 바꾸지 않았어요.")}</p>`;
}
function compare(ctx: ExplorerContext, saved: Set<string>) {
  const schools = scenarioSchools.filter((s) => saved.has(s.id)).sort(qsOrder);
  if (!schools.length)
    return `<div class="compare-empty panel"><div class="compare-empty-art" aria-hidden="true"><span></span><span></span><span></span></div><h2>${w("Nothing saved yet", "아직 저장한 대학이 없어요")}</h2><p class="muted">${w("Press + on any school and it lines up here, side by side.", "대학 카드나 목록의 + 버튼을 누르면 여기에 나란히 모여요.")}</p><div class="compare-empty-actions"><button class="button" data-explorer-mode="scenario">${w("From my shortlist", "내 후보 10곳에서 고르기")}</button><button class="button button-light" data-explorer-mode="browse">${w("Browse universities", "대학 둘러보기")}</button></div></div>`;
  const sat = ctx.mine?.sat ?? null;
  const policy = (s: ScenarioSchool) =>
    ({
      optional: w("Test optional", "선택 제출"),
      required: w("Required", "필수"),
      expected: w("Expected", "제출 기대"),
      "not-considered": w("Not considered", "미반영"),
      unknown: w("Unconfirmed", "미확인"),
    })[s.testing.policy];
  const row = (label: string, cell: (s: ScenarioSchool) => string, cls = "") =>
    `<tr class="${cls}"><th scope="row">${label}</th>${schools.map((s) => `<td>${cell(s)}</td>`).join("")}</tr>`;
  return `<div class="table-wrap compare-wrap"><table class="compare-table"><thead><tr><th>${w(`Saved · ${schools.length}`, `저장 ${schools.length}곳`)}</th>${schools.map((s) => `<th><div class="compare-photo">${schoolPhoto(s)}</div><button class="link-button" data-detail="${s.id}">${esc(name(s))}</button></th>`).join("")}</tr></thead><tbody>${row(w("Location", "지역"), (s) => `${esc(s.city)}, ${esc(s.state)}`)}${row("QS 2027", (s) => (qsRanks[s.id] ? `${qsRanks[s.id].tied ? "=" : ""}${qsRanks[s.id].rank}` : "—"))}${row(w("SAT middle 50%", "SAT 중간 50%"), (s) => (s.satRange ? `${s.satRange.low}–${s.satRange.high}` : "—"))}${sat !== null ? row(w(`Now ${sat}`, `지금 ${sat}`), (s) => positionChipOnly(s, sat), "is-key") : ""}${ctx.target !== null ? row(w(`Target ${ctx.target}`, `목표 ${ctx.target}`), (s) => positionChipOnly(s, ctx.target), "is-key") : ""}${row(w("Test policy", "시험 정책"), (s) => policy(s))}${row(w("Program", "검토 전공"), (s) => esc(translate(w(s.entry.program, s.entry.programKo))))}${row(w("Entry unit", "입학 단위"), (s) => esc(w(s.entry.unit, s.entry.unitKo)))}${row(w("Notes", "메모"), (s) => (ctx.noteCount(s.id) ? w(`${ctx.noteCount(s.id)} notes`, `${ctx.noteCount(s.id)}개`) : "—"))}${row(`<span class="sr-only">${w("Manage", "관리")}</span>`, (s) => `<button class="text-button" data-save="${s.id}">${w("Remove", "빼기")}</button>`)}</tbody></table></div><p class="small muted shortlist-note">${w("A comparison of research candidates, not admission likelihood.", "합격 가능성 판정이 아닌 검토 후보 비교예요. 지원 전 각 대학 공식 요건을 확인하세요.")}</p>`;
}
function matching(input: ScenarioInput, saved: Set<string>) {
  const plan = candidatePlan(input);
  if (!plan.selected.length)
    return `<div class="comparison-empty"><h2>${w("Choose a combination in the table.", "표에서 내신·SAT 조합을 선택하세요.")}</h2><p>${w("The researched lists cover SAT 1100–1600. Scores below 1100 are not mapped to a higher-score list.", "조사한 목록은 SAT 1100–1600 범위입니다. 1100 미만을 높은 점수 목록에 맞춰 표시하지 않습니다.")}</p><button class="text-button" data-explorer-mode="all-scenarios">${w("View all combinations →", "전체 조합 보기 →")}</button></div>`;
  const sat = input.sat!;
  const steps = satOutlook(plan.selected, sat);
  const nextList = SAT_SCENARIOS.find((n) => n > plan.referenceSat!);
  const outlook = `<section class="panel sat-outlook" aria-labelledby="outlook-title"><h2 id="outlook-title">${w("If the SAT goes up", "SAT가 오르면")}</h2><div class="outlook-steps">${steps
    .map(
      (step, i) =>
        `<div class="${i === 1 ? "is-next" : ""}"><span class="small muted">${i === 0 ? w(`Now ${step.sat}`, `지금 ${step.sat}`) : step.sat}</span><strong>${w(`${step.within} within range`, `범위 안 ${step.within}곳`)}</strong>${step.added.length ? `<span class="small">+ ${step.added.map((s) => esc(name(s))).join(", ")}</span>` : ""}${i === 1 ? `<button class="text-button" data-try-sat="${step.sat}">${w("View at this score →", "이 점수로 보기 →")}</button>` : ""}</div>`,
    )
    .join(
      "",
    )}${nextList ? `<div><span class="small muted">${nextList}</span><strong>${w(`Switches to the ${nextList} list`, `${nextList} 목록으로 바뀜`)}</strong><button class="text-button" data-try-sat="${nextList}">${w("See new candidates →", "새 후보 보기 →")}</button></div>` : ""}</div></section>`;
  return `${outlook}<section class="scenario-result-head"><div><span class="eyebrow">${esc(input.band)} · ${w(`SAT ${plan.referenceSat} list`, `SAT ${plan.referenceSat} 기준 목록`)}</span><h2>${w("10 schools to investigate", "지원 검토 대학 10곳")}</h2></div><button class="text-button" data-explorer-mode="all-scenarios">${w("Other combinations →", "다른 성적 조합 보기 →")}</button></section><div class="table-wrap"><table class="shortlist-table"><thead><tr><th>${w("University", "대학")}</th><th>${w("Program to examine", "검토 전공")}</th><th>${w("SAT middle 50%", "SAT 중간 50%")}</th><th>${w(`Score ${sat}`, `내 점수 ${sat}`)}</th><th><span class="sr-only">${w("Save", "저장")}</span></th></tr></thead><tbody>${plan.selected
    .map(
      (s) =>
        `<tr><th scope="row"><button class="link-button" data-detail="${s.id}">${esc(name(s))}</button><span class="small muted">${esc(s.state)}</span></th><td>${esc(translate(w(s.entry.program, s.entry.programKo)))}</td><td>${s.satRange ? `${s.satRange.low}–${s.satRange.high}` : "—"}</td><td>${positionChip(s, sat)}</td><td class="save-cell"><button class="save-button ${saved.has(s.id) ? "saved" : ""}" data-save="${s.id}" aria-label="${esc(w("Save school", "대학 저장"))} ${esc(name(s))}" aria-pressed="${saved.has(s.id)}">${saved.has(s.id) ? "✓" : "+"}</button></td></tr>`,
    )
    .join(
      "",
    )}</tbody></table></div><p class="small muted shortlist-note">${w("Research candidates, not an admission prediction. Confirm each university's official requirements before applying.", "합격 가능성 판정이 아닌 검토 후보입니다. 지원 전 각 대학 공식 요건을 확인하세요.")}</p><details class="methodology"><summary>${w("About this list", "이 목록에 대해")}</summary>${disclosure()}<p class="candidate-selection-note">${esc(gradeResearchNote(input.band, getLanguage() === "ko"))}</p></details>`;
}
// Compact labels for dense grids: "캘리포니아 대학교 데이비스" → "UC 데이비스".
function shortName(s: ScenarioSchool) {
  if (shortNames[s.id]) return w(...shortNames[s.id]);
  if (getLanguage() !== "ko")
    return s.name
      .replace(/^University of California,\s*/, "UC ")
      .replace(/^The\s+/, "")
      .replace(/^University of\s+/, "")
      .replace(/\s+University$/, "")
      .replace(/^(.*) State University$/, "$1 State");
  return s.nameKo
    .replace(/^캘리포니아 대학교\s*/, "UC ")
    .replace(/주립대학교/, "주립")
    .replace(/\s*대학교/, "")
    .replace(/\s*\(.*\)$/, "")
    .trim();
}
const shortNames: Record<string, [string, string]> = {
  harvard: ["Harvard", "하버드"],
  "michigan-ann-arbor": ["Michigan–Ann Arbor", "미시간 앤아버"],
  "wisconsin-madison": ["Wisconsin–Madison", "위스콘신 매디슨"],
  "purdue-west-lafayette": ["Purdue · Liberal Arts", "퍼듀 · 문과대학"],
  "rutgers-new-brunswick": ["Rutgers–New Brunswick", "럿거스 뉴브런즈윅"],
  "minnesota-twin-cities": ["Minnesota · Liberal Arts", "미네소타 · 문과대학"],
  "penn-state": ["Penn State · University Park", "펜실베이니아 주립"],
  "iowa-state": ["Iowa State", "아이오와 주립"],
  iowa: ["University of Iowa", "아이오와 대학교"],
  "southern-california": ["USC", "서던캘리포니아 (USC)"],
  "maryland-college-park": ["Maryland–College Park", "메릴랜드 칼리지파크"],
};
// Five shades from the least to the most selective combination.
const heatLevel = (v: number | null) =>
  v === null
    ? 0
    : v < 1250
      ? 1
      : v < 1300
        ? 2
        : v < 1350
          ? 3
          : v < 1450
            ? 4
            : 5;
function matrix(input: ScenarioInput, ctx: ExplorerContext) {
  const rows = candidateMatrix();
  const mineBand = ctx.mine?.band ?? "";
  const mineSat = ctx.mine?.sat ?? null;
  const refFor = (score: number | null | undefined) =>
    score === null || score === undefined
      ? undefined
      : SAT_SCENARIOS.filter((n) => n <= score).at(-1);
  const mineRef = refFor(mineSat);
  const targetRef = refFor(ctx.target);
  const fallback = `${VISIBLE_GRADE_BANDS.includes(input.band as (typeof VISIBLE_GRADE_BANDS)[number]) ? input.band : VISIBLE_GRADE_BANDS[0]}|${candidatePlan(input).referenceSat ?? SAT_SCENARIOS[0]}`;
  const [selBand, selSatText] = (ctx.matrixCell ?? fallback).split("|");
  const selSat = Number(selSatText);
  const find = (band: string, sat: number) =>
    rows.find((r) => r.band === band && r.sat === sat);
  const selected = find(selBand, selSat) ?? rows[0];
  const chip = (attr: string, on: boolean, label: string, extra = "") =>
    `<button class="combo-chip ${on ? "is-on" : ""} ${extra}" ${attr} aria-pressed="${on}">${label}</button>`;
  const bandChips = VISIBLE_GRADE_BANDS.map((b) =>
    chip(
      `data-scenario-pick="${b}|${selected.sat}"`,
      b === selected.band,
      `${b}${b === mineBand ? ` <small>· ${w("me", "나")}</small>` : ""}`,
    ),
  ).join("");
  const satChips = SAT_SCENARIOS.map((n) =>
    chip(
      `data-scenario-pick="${selected.band}|${n}"`,
      n === selected.sat,
      `${n}${n === mineRef ? ` <small>· ${w("me", "나")}</small>` : n === targetRef ? ` <small>· ${w("target", "목표")}</small>` : ""}`,
      n === targetRef && n !== selected.sat ? "is-target" : "",
    ),
  ).join("");
  const map = `<div class="combo-map" aria-label="${w("All 25 combinations", "25개 조합 한눈에")}"><span></span>${SAT_SCENARIOS.map((n) => `<span class="map-col">${String(n).slice(0, 2)}</span>`).join("")}${VISIBLE_GRADE_BANDS.map(
    (b) =>
      `<span class="map-row ${b === mineBand ? "is-mine" : ""}">${b.slice(0, 2)}</span>${SAT_SCENARIOS.map(
        (n) => {
          const cell = find(b, n)!;
          const level = heatLevel(selectivity(cell.selected));
          const isSel = b === selected.band && n === selected.sat;
          return `<button class="map-cell heat-${level} ${isSel ? "is-selected" : ""} ${b === mineBand && n === targetRef && !isSel ? "is-target" : ""}" data-scenario-choice="${b}|${n}" aria-pressed="${isSel}" aria-label="${esc(b)} SAT ${n} ${w("view 10 candidates", "후보 10곳 보기")}"></button>`;
        },
      ).join("")}`,
  ).join(
    "",
  )}</div><div class="map-legend"><span>${w("Less selective", "덜 선발적")}</span><i></i><span>${w("More selective", "더 선발적")}</span></div>`;
  const nextSat = SAT_SCENARIOS.find((n) => n > selected.sat);
  const bandIndex = VISIBLE_GRADE_BANDS.indexOf(
    selected.band as (typeof VISIBLE_GRADE_BANDS)[number],
  );
  const nextBand = VISIBLE_GRADE_BANDS[bandIndex + 1];
  const names = (list: ScenarioSchool[]) =>
    list.length
      ? `${list
          .slice(0, 3)
          .map((s) => esc(shortName(s)))
          .join(
            ", ",
          )}${list.length > 3 ? w(` +${list.length - 3}`, ` 외 ${list.length - 3}곳`) : ""}`
      : "";
  const diffCard = (
    title: string,
    target: { selected: ScenarioSchool[] } | undefined,
    cls: string,
  ) => {
    if (!target) return "";
    const d = listDiff(selected.selected, target.selected);
    return `<div class="diff-card ${cls}"><span class="small strong-green">${title}</span>${
      d.added.length || d.removed.length
        ? `${d.added.length ? `<span class="diff-add">+ ${names(d.added)}</span>` : ""}${d.removed.length ? `<span class="diff-remove">− ${names(d.removed)}</span>` : ""}`
        : `<span class="muted">${w("Same ten schools", "같은 10곳이에요")}</span>`
    }</div>`;
  };
  const diffs = `<section class="combo-diffs" aria-label="${w("What changes", "바꾸면 달라지는 대학")}">${nextSat ? diffCard(w(`If the SAT reaches ${nextSat}`, `SAT ${nextSat}으로 올리면`), find(selected.band, nextSat), "is-sat") : ""}${nextBand ? diffCard(w(`If marks reach ${nextBand}`, `내신 ${nextBand}가 되면`), find(nextBand, selected.sat), "") : ""}</section>`;
  const list = selected.selected
    .map((s) => {
      const q = qsRanks[s.id];
      return `<div class="combo-row"><span><button class="link-button" data-detail="${s.id}">${esc(name(s))}</button> <small class="muted">${esc(s.state)}${q ? ` · QS ${q.tied ? "=" : ""}${q.rank}` : ""}</small></span>${
        s.satRange ? satBar(s, mineSat) : `<span class="small muted">—</span>`
      }${mineSat !== null ? positionChipOnly(s, mineSat) : `<span class="small muted">${s.satRange ? `${s.satRange.low}–${s.satRange.high}` : "—"}</span>`}</div>`;
    })
    .join("");
  const backToMine =
    ctx.mine?.band &&
    mineRef !== undefined &&
    (selected.band !== mineBand || selected.sat !== mineRef)
      ? `<button class="button button-light" data-scenario-pick="${esc(mineBand)}|${mineRef}">${w("Back to my grades", "내 성적으로 돌아가기")}</button>`
      : "";
  return `<section class="panel combo-pick" aria-label="${w("Choose a combination", "조합 고르기")}"><div class="combo-controls"><div><span class="small muted strong">${w("School average", "내신")}</span><div class="combo-chips" role="group" aria-label="${w("Grade band", "내신 구간")}">${bandChips}</div></div><div><span class="small muted strong">SAT</span><div class="combo-chips" role="group" aria-label="SAT">${satChips}</div></div></div><div class="combo-map-wrap">${map}</div></section>${diffs}<section class="panel combo-list" aria-labelledby="combo-title"><div class="panel-head"><h2 id="combo-title">${esc(selected.band)} · SAT ${selected.sat} · ${w("10 schools to investigate", "검토 후보 10곳")}</h2><span class="small muted">${mineSat !== null ? w(`QS order · bar 1000–1600, line = ${mineSat}`, `QS 순 · 막대는 SAT 1000–1600, 선은 태율이 ${mineSat}`) : w("QS order", "QS 순")}</span></div><div class="combo-rows">${list}</div><div class="combo-actions"><button class="button" data-open-cell="${esc(selected.band)}|${selected.sat}">${w("Use this combination", "이 조합을 내 후보로 보기")}</button>${backToMine}</div></section><details class="methodology matrix-method"><summary>${w("How this was made", "이 조합은 어떻게 만들었나요")}</summary>${disclosure()}<p>${w("Each row is lower-inclusive and upper-exclusive, except100% is included in the last row. Shading is the average middle of the published SAT ranges in each list; it is not an admission probability.", "내신 구간의 시작점은 포함, 끝점은 다음 구간에 포함하며 100%는 마지막 구간입니다. 색은 각 목록 대학들의 공개 SAT 중간값 평균이며 합격 가능성이 아닙니다.")}</p><button class="text-button" id="export-scenarios">${w("Download all 250 candidate entries ↓", "전체 250개 후보 항목 내려받기 ↓")}</button></details>`;
}
function eliteScoreTable(input: ScenarioInput) {
  const score = input.sat ?? 1500;
  const ids = new Set([
    ...ambitiousSchoolIds,
    ...eliteSatProfiles.map((p) => p.id),
  ]);
  const schools = scenarioSchools.filter((s) => ids.has(s.id)).sort(qsOrder);
  return `<section class="elite-sat-section"><h2>${w(`Top universities · SAT ${score}`, `상위권 대학 · SAT ${score}점 비교`)}</h2><p>${w("Every reviewed top-university profile is shown here, including schools below whose 25th percentile your score falls. These are historical score comparisons, not admission cutoffs or probabilities.", "이번에 확인한 상위권 대학을 빠짐없이 표시합니다. 입력 점수가 25백분위보다 낮은 대학도 포함합니다. 과거 점수 분포 비교이며 합격선이나 합격 확률이 아닙니다.")}</p><div class="table-wrap"><table class="elite-sat-table"><thead><tr><th>${w("University", "대학")}</th><th>${w("Official SAT evidence", "공식 SAT 자료 · 집계 대상")}</th><th>${w(`SAT ${score} comparison`, `${score}점 비교`)}</th></tr></thead><tbody>${schools.map((s) => `<tr><th scope="row"><button class="text-button" data-detail="${s.id}">${esc(name(s))}</button><div class="small">${esc(rank(s))}</div></th><td>${eliteSatSections[s.id] ? `${esc(w(eliteSatSections[s.id].text, eliteSatSections[s.id].textKo))}${refs([eliteSatSections[s.id].sourceId])}` : s.satRange ? `<strong>${s.satRange!.low}–${s.satRange!.high}</strong><p class="small">${esc(w(s.satRange!.cohort, s.satRange!.cohortKo))}</p>${refs(s.satRange!.sourceIds)}` : `${w("Official composite profile not verified; not assigned an invented range.", "공식 SAT 총점 분포 미확인 · 임의 범위를 부여하지 않습니다.")}${refs(s.testing.sourceIds.slice(0, 1))}`}</td><td>${eliteSatSections[s.id] ? w("No composite comparison available. Review section scores and the full application; no composite cutoff is inferred.", "총점 분포 비교 불가. 영역별 점수와 지원서 전체 심사가 필요하며 총점 합격선을 추정하지 않습니다.") : esc(candidateSatAdvice(s, score, getLanguage() === "ko"))}</td></tr>`).join("")}</tbody></table></div></section>`;
}
function scoreMap(input: ScenarioInput) {
  const known = scenarioSchools
    .filter(
      (s) =>
        qsRanks[s.id] && s.satRange && s.testing.policy !== "not-considered",
    )
    .sort(qsOrder);
  const cell = (schools: ScenarioSchool[]) =>
    schools
      .slice(0, 10)
      .map(
        (s) =>
          `<button class="sat-band-school" data-detail="${s.id}">${esc(name(s))}<span class="sat-band-range">${esc(rank(s))} · SAT ${s.satRange!.low}–${s.satRange!.high}</span></button>`,
      )
      .join("") || w("No verified profiles", "확인된 분포 없음");
  const other = scenarioSchools
    .filter(
      (s) =>
        qsRanks[s.id] && !s.satRange && s.testing.policy !== "not-considered",
    )
    .sort(qsOrder);
  return `${eliteScoreTable(input)}<h2>${w("Explore universities by SAT score", "SAT 점수별 대학 비교")}</h2><p>${w("QS-ranked schools with verified SAT profiles, up to ten per cell in QS order. Click a school for the cohort year, testing policy, humanities program and academic requirements. Scores alone cannot establish admission eligibility.", "QS 순위와 공식 SAT 분포가 확인된 대학을 각 칸에 최대 10곳씩, QS 순으로 표시합니다. 대학명을 누르면 통계 연도·시험 정책·인문사회 전공·내신 요건을 확인할 수 있습니다. SAT만으로 지원 자격이나 합격을 확정하지 않습니다.")}</p><div class="table-wrap"><table class="sat-band-table"><thead><tr><th>SAT</th><th>${w("Within published middle 50%", "공식 중간 50% 범위 안")}</th></tr></thead><tbody>${SAT_SCENARIOS.map((score) => `<tr><th scope="row">${score}${input.sat === score ? " ●" : ""}</th><td><div class="pool-score-list">${cell(known.filter((s) => bandPosition({ low: score, high: score }, s.satRange!) === "overlap"))}</div></td></tr>`).join("")}</tbody></table></div><p>${w("Each row uses the exact score, not a score interval. A score within the historical middle 50% does not establish admission eligibility. Different cohorts and test-optional submitter bias apply.", "각 행은 점수 구간이 아닌 해당 점수로 비교합니다. 공식 중간 50% 범위 안이어도 합격 가능이나 지원 자격이 확정되는 것은 아닙니다. 학교별 통계 집단·연도가 다르고 선택 제출자의 분포에는 편향이 있습니다.")}</p><h3>${w("UC: separate from the SAT table", "UC: SAT 표와 별도 비교")}</h3><p>${w("Current UC policy does not consider SAT; Fall 2028 policy remains undecided. Review all nine campuses separately.", "UC는 현행 정책상 SAT를 반영하지 않으며 2028년 가을 정책은 미정입니다. 점수별로 유불리를 배정하지 않고 9개 캠퍼스를 따로 비교하세요.")}</p><button class="text-button" data-explorer-mode="uc">${w("Compare UC campuses →", "UC 9개 캠퍼스 비교 →")}</button><h3>${w("Other highly ranked schools: verified composite profile unavailable", "추가 상위권 대학: 확인된 SAT 총점 분포 없음")}</h3><p>${w("These schools are not assigned to score cells without verified distributions.", "공식 총점 분포가 확인되지 않은 학교는 임의 점수 구간에 넣지 않았습니다.")}</p><div class="pool-score-list">${other.map((s) => `<button class="sat-band-school" data-detail="${s.id}">${esc(name(s))}<span>${esc(rank(s))}</span></button>`).join("")}</div>`;
}
function renderUcCampuses() {
  return `<section class="uc-comparison"><div class="page-intro"><h2>${w("UC · all nine undergraduate campuses", "UC 학부 9개 캠퍼스 비교")}</h2><p>${w("Current SAT policy is the same at every score. Fall2028 policy is still undecided.", "현행 규정에서는 SAT 점수가 달라도 평가 방식이 같습니다. 2028년 가을 시험 정책은 아직 미정입니다.")}</p></div><div class="scenario-accuracy"><strong>${w("SAT not considered now · Fall2028 undecided", "현재 SAT 미반영 · 2028년 가을 미정")}</strong><p>${w("UC plans a policy recommendation by June2027. A proposal or faculty petition is not an approved change. International baseline requirements include15 year-long courses and UC GPA3.4; an Ontario average is not automatically converted to that GPA.", "UC는 2027년 6월까지 정책 권고안을 받을 예정입니다. 교수 청원·검토는 변경 확정이 아닙니다. 국제학생 기본 요건은 연간 학업 과목 15개와 UC GPA 3.4이며 온타리오 평균을 이 GPA로 자동 환산하지 않습니다.")}</p>${refs(["uc-audit-policy-review", "uc-audit-international"])}</div><p>${w("Rates below are Fall2026 campus-wide first-year admit rates for all applicant groups. They are not international, humanities-specific or personal probabilities. No campus is labeled safe from these rates.", "아래 수치는 2026년 가을 전체 지원자를 집계한 캠퍼스별 신입학 합격률입니다. 국제학생·인문학 전공별 수치나 개인 합격 확률이 아니며, 이 수치로 안정 지원을 판정하지 않습니다.")}</p><div class="table-wrap"><table class="uc-campus-table"><thead><tr><th>${w("Campus", "캠퍼스")}</th><th>${w("2026 overall admit rate", "2026년 전체 합격률")}</th><th>${w("Program and entry structure", "전공 · 선발 방식")}</th></tr></thead><tbody>${ucProfiles
    .map((p) => {
      const school = scenarioSchools.find((s) => s.id === p.id)!;
      return `<tr><th scope="row"><button class="text-button" data-detail="${school.id}">${esc(name(school))} →</button></th><td><strong>${p.rate.toFixed(1)}%</strong>${refs([p.sourceId])}</td><td><strong>${esc(w(school.entry.program, school.entry.programKo))}</strong><p>${esc(w(school.entry.text, school.entry.textKo))}</p>${refs(school.entry.sourceIds)}</td></tr>`;
    })
    .join(
      "",
    )}</tbody></table></div><p class="small">${w("All nine remain accessible here regardless of the selected grade/SAT combination; a shortlist omission is not an official grade cutoff. Entry-year rules and English requirements are in each campus detail.", "선택한 내신·SAT 조합과 관계없이 이 표에서 9곳 모두 확인할 수 있습니다. 조합 목록의 누락은 공식 내신 제한을 뜻하지 않습니다. 입학 연도·영어 요건은 캠퍼스별 상세 안내에서 확인하세요.")}</p></section>`;
}
function renderReviewNotes() {
  return `<details class="methodology"><summary>${w("QS ranking and shortlist review", "QS 순위 · 후보 목록 재검토")}</summary><p>${w("2027 QS world ranks are verified for 49 schools. Naver and Reddit inform qualitative discovery, not admission cutoffs or a measured Korean awareness ranking. QS rank is a university-wide research ranking, not a humanities admission threshold. Missing exact ranks mean unverified, not unranked. Minnesota's published rank is system-wide.", "49곳의 QS 2027 세계순위를 확인했습니다. 네이버·레딧은 대학 탐색의 참고 자료이며 합격선이나 한국 인지도 조사 순위가 아닙니다. QS는 대학 종합순위이며 인문사회계열 입학 난도 순위가 아닙니다. 정확한 순위 미확인은 순위권 밖이라는 뜻이 아닙니다. 미네소타는 시스템 전체 순위입니다.")}</p><div class="scenario-refs"><a href="https://www.topuniversities.com/where-to-study/north-america/united-states/ranked-top-100-us-universities" target="_blank" rel="noopener noreferrer">QS 2027 ↗</a><a href="https://blog.naver.com/hy_april/224255707648" target="_blank" rel="noopener noreferrer">${w("Naver ASU admissions discussion", "네이버 ASU 입시 소개")} ↗</a><a href="https://blog.naver.com/jamesprep/224083806497" target="_blank" rel="noopener noreferrer">${w("Naver ASU introduction", "네이버 ASU 대학 소개")} ↗</a><a href="https://www.reddit.com/r/ApplyingToCollege/comments/1u8ryu2/qs_world_college_ranking_for_the_us/" target="_blank" rel="noopener noreferrer">Reddit QS discussion ↗</a></div></details><details class="methodology"><summary>${w(`Source recheck · ${universityReviews.length} schools · ${REVIEW_DATE}`, `공식 자료 재검토 · ${universityReviews.length}곳 · ${REVIEW_DATE}`)}</summary><p>${w("The existing72-school catalog was rechecked for testing policies and entry-year scope;14 received additional academic/English-route checks. New UC and selective records include program and applicant requirements. Access failures and conflicting pages remain explicitly unresolved. Historical score distributions retain their cohort year; this does not claim every historical number is the newest dataset.", "기존 72곳의 시험 정책·적용 연도를 다시 점검하고, 그중 14곳의 주요 학업·영어 요건을 추가 확인했습니다. 새로 추가한 UC·상위권 대학은 전공·지원자 요건도 확인했습니다. 열리지 않거나 서로 다른 공식 안내는 미확인으로 남겼습니다. 과거 점수 분포에는 집단·연도를 유지하며 모든 수치가 최신 입학 집단이라는 뜻은 아닙니다.")}</p><p>${w("Naver Korean articles and Reddit discussions were used to discover omissions and policy changes. Admissions facts link to university sources; individual success stories and speculation do not become cutoffs. Historical2026 national ranks are dated references, not current-edition rankings.", "네이버 한글 자료와 레딧에서 누락·정책 변경 쟁점을 찾고 대학 공식 자료로 대조했습니다. 개인 합격 사례·예측을 합격선으로 사용하지 않습니다. 2026년 종합순위는 연도를 표시한 과거 참고 자료입니다.")}</p><div class="scenario-refs"><a href="https://blog.naver.com/korfirst/224441197445" target="_blank" rel="noopener noreferrer">${w("Naver Korean policy discussion · Oct14", "네이버 한글 UC 정책 해설 · 10월 14일")} ↗</a><a href="https://www.reddit.com/r/ucadmissions/comments/1wvll8f/any_idea_of_the_chance_class_of_2028_will_face/" target="_blank" rel="noopener noreferrer">${w("Reddit2028 discussion · opinions", "레딧 2028년 논의 · 개인 의견")} ↗</a></div>${refs(["uc-audit-policy-review"])}</details>`;
}
export interface ExplorerContext {
  mine: { average: number; band: string; sat: number | null } | null;
  fromGrades: boolean;
  browse: BrowseFilters;
  matrixCell: string | null;
  target: number | null;
  noteCount: (schoolId: string) => number;
}
const defaultContext = (): ExplorerContext => ({
  mine: null,
  fromGrades: false,
  browse: emptyBrowse(),
  matrixCell: null,
  target: null,
  noteCount: () => 0,
});
const tabFor = (mode: ExplorerMode) =>
  mode === "catalog" || mode === "uc" || mode === "sat-map"
    ? "browse"
    : mode === "saved"
      ? "compare"
      : mode;
export function renderExplorer(
  input: ScenarioInput,
  mode: ExplorerMode,
  _search: string,
  saved: Set<string>,
  ctx: ExplorerContext = defaultContext(),
) {
  const mine = ctx.mine;
  const mineIds = new Set(
    mine?.band && mine.sat !== null
      ? candidatePlan(
          normalizeCandidateInput({ band: mine.band, sat: mine.sat }),
        ).selected.map((s) => s.id)
      : [],
  );
  const basis = mine
    ? `${w("Based on", "기준")} · ${w("school average", "내신")} ${mine.average}%${mine.band ? ` (${esc(mine.band)})` : ""}${mine.sat !== null ? ` · SAT ${mine.sat}` : ""}`
    : `<a class="text-link" href="#grades">${w("Enter grades to match automatically →", "성적을 입력하면 자동으로 맞춰져요 →")}</a>`;
  const active = tabFor(mode);
  const tabs = (
    [
      ["scenario", w("My shortlist", "내 후보 10곳")],
      ["browse", w("Browse", "둘러보기")],
      ["all-scenarios", w("Grade × SAT", "성적 조합")],
      [
        "compare",
        w(`Saved · compare ${saved.size}`, `저장·비교 ${saved.size}`),
      ],
    ] as const
  )
    .map(
      ([id, label]) =>
        `<button data-explorer-mode="${id}" aria-pressed="${active === id}">${label}</button>`,
    )
    .join("");
  const manual =
    mode === "scenario" && mine && !ctx.fromGrades
      ? `<div class="manual-note"><span>${w(`Viewing ${input.band} · SAT ${input.sat}`, `${input.band} · SAT ${input.sat} 조합을 보는 중`)}</span><button class="text-button" id="use-my-grades">${w("Back to my grades →", "내 성적으로 돌아가기 →")}</button></div>`
      : "";
  const body =
    mode === "browse" || mode === "catalog"
      ? browse(ctx, saved, mineIds)
      : mode === "compare" || mode === "saved"
        ? compare(ctx, saved)
        : mode === "all-scenarios"
          ? matrix(input, ctx)
          : mode === "uc"
            ? renderUcCampuses()
            : mode === "sat-map"
              ? selectors(input) + scoreMap(input)
              : manual + matching(input, saved);
  return `<div class="uni-head"><div><h1 class="home-title">${w("Universities", "대학")}</h1><p class="basis-line">${basis}</p></div><div class="segmented uni-tabs" role="group" aria-label="${w("University view", "대학 보기")}">${tabs}</div></div>${body}<section class="method-notes" aria-label="${w("Sources and method", "자료와 선정 방법")}"><h2>${w("Sources and method", "자료와 선정 방법")}</h2>${renderReviewNotes()}<details class="methodology"><summary>${w("How the ten candidates were selected", "10곳 선정 방법 · 사실과 판단의 구분")}</summary><p>${w("These are manually curated research shortlists from the displayed pool. Lower-grade cases prioritize published lower GPA requirements, alternative routes and individual review; stronger-grade cases broaden to selective universities, college-specific SAT profiles and testing policies. A place in a grade band is editorial judgment, not a verified Ontario equivalency or a probability model. We do not claim these are the ten best attainable universities in the entire United States.", "표시된 조사 목록에서 검토 후보를 직접 선정했습니다. 낮은 내신 구간은 낮은 공개 GPA 요건·대체 경로·개별 심사부터 조사하고, 높은 구간은 선발적인 대학·단과대학별 SAT 분포·시험 정책까지 넓힙니다. 구간 배치는 편집 판단이며 확인된 온타리오 환산값이나 합격 예측 모델이 아닙니다. 미국 전체에서 입학 가능한 최상위 10곳이라고 단정하지 않습니다.")}</p><p>${w("Official program availability is verified. Toledo publishes different entry GPA requirements by college; Purdue publishes college-level profiles. These comparisons do not identify the absolute easiest major. At schools such as Maryland and Florida, choosing a humanities major does not lower university admission requirements.", "전공 운영 여부는 공식 안내로 확인했습니다. 톨레도는 단과대학별 GPA 요건, 퍼듀는 단과대학별 입학 집단 자료를 공개합니다. 이것만으로 가장 쉬운 학과를 확정하지 않습니다. 메릴랜드·플로리다처럼 인문계 선택이 대학 입학 조건을 낮추지 않는 곳도 표시했습니다.")}</p><p>${w("SAT ranges retain their cohort, campus and year. Current policies are not necessarily Fall 2028 policies. Ranks use historical 2026 U.S.News National Universities evidence; no measured Korean-recognition ranking was established.", "SAT 수치는 집단·캠퍼스·연도를 함께 표시합니다. 현행 정책이 2028년 가을에도 같다고 가정하지 않습니다. 순위는 비교용 U.S. News 2026 종합대학 자료이며 한국 인지도 조사 순위는 확인되지 않았습니다.")}</p></details></section>`;
}
export type DetailTab =
  | "summary"
  | "requirements"
  | "program"
  | "testing"
  | "sources";
export function renderScenarioDetail(
  s: ScenarioSchool,
  input: ScenarioInput,
  opts: {
    tab?: DetailTab;
    saved?: boolean;
    sat?: number | null;
    notes?: Note[];
    extraRequirements?: string;
    extraProgram?: string;
  } = {},
) {
  const tab = opts.tab ?? "summary";
  const sat = opts.sat === undefined ? input.sat : opts.sat;
  const section = (title: string, text: string, ids: string[]) =>
    `<section class="scenario-detail-section"><h3>${title}</h3><p>${esc(text)}</p>${refs(ids)}</section>`;
  const firstSentence = (t: string) => {
    const m = t.match(/^.*?[.。!?](\s|$)/);
    return (m ? m[0] : t).trim();
  };
  const q = qsRanks[s.id];
  const cycle = confirmed2028Policies[s.id];
  const policy = {
    optional: w("Test optional", "선택 제출"),
    required: w("SAT/ACT required", "SAT/ACT 필수"),
    expected: w("Scores expected", "제출 기대"),
    "not-considered": w("SAT not considered", "SAT 미반영"),
    unknown: w("Unconfirmed", "미확인"),
  }[s.testing.policy];
  const official =
    s.sources.find((x) => s.entry.sourceIds.includes(x.id)) ?? s.sources[0];
  const tabs = (
    [
      ["summary", w("Summary", "요약")],
      ["requirements", w("Requirements", "입학 요건")],
      ["program", w("Program", "전공")],
      ["testing", w("Testing", "시험")],
      ["sources", w(`Sources ${s.sources.length}`, `출처 ${s.sources.length}`)],
    ] as const
  )
    .map(
      ([id, label]) =>
        `<button role="tab" aria-selected="${tab === id}" data-detail-tab="${id}">${label}</button>`,
    )
    .join("");
  const p = satPosition(s, sat);
  const mineBox =
    sat !== null && s.satRange
      ? `<section class="mine-box"><span class="small strong-orange">${w(`Taeyul · SAT ${sat}`, `태율이 기준 · SAT ${sat}`)}</span>${satBar(s, sat)}<div class="bar-caption"><span>1000</span><span>${w("Middle 50%", "중간 50%")} ${s.satRange.low}–${s.satRange.high}</span><span>1600</span></div><p>${p === "below" ? w(`<strong>${s.satRange.low - sat} below</strong> the range. In range from ${s.satRange.low}.`, `<strong>${s.satRange.low - sat}점 아래</strong>예요. ${s.satRange.low}부터 범위 안에 들어가요.`) : p === "above" ? w(`<strong>${sat - s.satRange.high} above</strong> the range.`, `범위보다 <strong>${sat - s.satRange.high}점 위</strong>예요.`) : w("<strong>Within</strong> the published middle 50%.", "공개된 중간 50% <strong>범위 안</strong>이에요.")}</p></section>`
      : "";
  const notes = opts.notes ?? [];
  const summary = `<p class="verified-rule-tag">${esc(candidateRoute(s, getLanguage() === "ko"))}</p>${mineBox}<div class="detail-tiles"><div><span>${w("Test policy", "시험 정책")}</span><strong>${policy}</strong><small class="${cycle ? "" : "strong-orange"}">${cycle ? w(`Fall 2028 ${cycle} confirmed`, `2028년 가을 ${cycle === "required" ? "필수" : "선택"} 확인`) : w("Recheck for Fall 2028", "2028년 유지 여부 재확인")}</small></div><div><span>${w("Program", "검토 전공")}</span><strong>${esc(translate(w(s.entry.program, s.entry.programKo)))}</strong><small>${esc(w(s.entry.unit, s.entry.unitKo))}</small></div><div><span>${w("Academic review", "학업 심사")}</span><small>${esc(firstSentence(w(s.academic.text, s.academic.textKo)))}</small></div><div><span>${w("Ontario records", "온타리오 서류")}</span><small>${esc(firstSentence(w(s.ontario.basis, s.ontario.basisKo)))}</small></div></div><section class="detail-notes"><h3>${w("Notes", "메모")}</h3>${notes.map((n) => `<div class="journal-item"><div class="small strong-green">${dayLabel(n.date)}</div><p data-original-language>${esc(n.text)}</p></div>`).join("") || `<p class="small muted">${w("No notes yet.", "아직 메모가 없어요.")}</p>`}<form id="school-note-form" class="journal-form"><label><span class="sr-only">${w("Leave a note", "메모 남기기")}</span><textarea name="text" rows="2" maxlength="2000" required placeholder="${w("Leave a note for this school", "이 대학에 대한 메모")}"></textarea></label><button class="button button-light" type="submit">${w("Save note", "메모 남기기")}</button></form></section>${official ? `<a class="text-link" href="${esc(official.url)}" target="_blank" rel="noopener noreferrer">${w("Open the official page ↗", "공식 안내 열기 ↗")}</a>` : ""}`;
  const requirements = `<div class="scenario-accuracy"><p>${w("A research candidate, not confirmed admission eligibility. The university must assess the full record and entry-year policy.", "지원 검토 후보이며 입학 자격이 확정된 것은 아닙니다. 대학의 전체 기록 심사와 지원 연도 규정 확인이 필요합니다.")}</p></div>${section(w("Academic requirements", "학업 요건"), w(s.academic.text, s.academic.textKo), s.academic.sourceIds)}${section(w("Ontario percentage & calculation basis", "온타리오 내신 · 계산 방식"), w(s.ontario.basis, s.ontario.basisKo), s.ontario.sourceIds)}${s.percentageRule ? section(w("Additional published percentage scale", "추가 공개 백분율 기준"), w(s.percentageRule.basis, s.percentageRule.basisKo), s.percentageRule.sourceIds) : ""}${s.satAlternative ? section(w("Published SAT GPA-component alternative", "공식 SAT GPA 항목 대체 규정"), `${s.satAlternative.minimum}+${s.satAlternative.sectionMinimums ? ` · Reading & Writing ${s.satAlternative.sectionMinimums.readingWriting}+ · Math ${s.satAlternative.sectionMinimums.math}+` : ""}. ${w(s.satAlternative.remainingRequirements, s.satAlternative.remainingRequirementsKo)}`, s.satAlternative.sourceIds) : ""}${section(w("Remaining applicant-specific requirements", "추가 지원자별 요건"), w(s.applicantScope.text, s.applicantScope.textKo), s.applicantScope.sourceIds)}${opts.extraRequirements ?? ""}`;
  const program = `${section(`${w("Program examined", "검토 전공")}: ${translate(w(s.entry.program, s.entry.programKo))}`, w(s.entry.text, s.entry.textKo), s.entry.sourceIds)}<p class="small">${w("Lowest-admission major established:", "최저 합격 전공 입증 여부:")} ${s.entry.easierMajorVerified ? w("Verified comparative criteria; scope applies", "비교 요건 확인 · 적용 범위 확인 필요") : w("Not verified", "미확인")}</p>${opts.extraProgram ?? ""}`;
  const testing = `${eliteSatSections[s.id] ? section(w("Official SAT section distributions", "공식 SAT 영역별 분포"), w(eliteSatSections[s.id].text, eliteSatSections[s.id].textKo), [eliteSatSections[s.id].sourceId]) : ""}${section(w("Your SAT comparison", "입력한 SAT 비교"), candidateSatAdvice(s, sat, getLanguage() === "ko"), s.satRange?.sourceIds ?? s.testing.sourceIds)}${section(w("Test policy & applicable year", "시험 규정 · 적용 연도"), w(s.testing.text, s.testing.textKo), s.testing.sourceIds)}${s.satRange ? section(w(`Official composite range: ${s.satRange.low}–${s.satRange.high}`, `공식 SAT 총점 분포: ${s.satRange.low}–${s.satRange.high}`), getLanguage() === "ko" ? s.satRange.cohortKo || translate(s.satRange.cohort) : s.satRange.cohort, s.satRange.sourceIds) : ""}`;
  const sources = `${s.rank.value !== null ? section(w("Ranking evidence", "순위 근거"), `U.S. News · ${s.rank.edition} · National Universities · #${s.rank.value}${s.rank.verification === "reported-by-secondary" ? w(" · dated secondary report", " · 해당 연도 보도") : ""}`, s.rank.sourceIds) : ""}<div class="detail-sources">${s.sources.map((source) => `<article data-original-language lang="en"><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.title)} ↗</a><p class="small">${esc(source.publisher)} · ${esc(source.cycle)} · ${source.verified}</p></article>`).join("")}</div>${imageCredits(s)}`;
  const photo = schoolPhoto(s);
  return `<div class="drawer-hero ${photo ? "" : "no-photo"}">${photo}<button class="close-dialog" aria-label="${w("Close university details", "대학 상세 닫기")}">×</button><div class="drawer-title"><span>${esc(s.city)}, ${esc(s.state)} · ${typeLabel(s)}${q ? ` · QS ${q.tied ? "=" : ""}${q.rank}` : ""}</span><h2 id="dialog-title">${esc(name(s))}</h2></div></div><div class="drawer-actions"><button class="button ${opts.saved ? "" : "button-light"}" data-save="${s.id}" aria-pressed="${!!opts.saved}">${opts.saved ? w("✓ Saved", "✓ 저장됨") : w("+ Save to compare", "+ 저장·비교에 추가")}</button><button class="button button-light" data-detail-tab="summary" data-focus-note>${w("Leave a note", "메모 남기기")}</button></div><div class="drawer-tabs" role="tablist" aria-label="${w("Details", "상세 내용")}">${tabs}</div><div class="dialog-body drawer-body">${tab === "summary" ? summary : tab === "requirements" ? requirements : tab === "program" ? program : tab === "testing" ? testing : sources}</div>`;
}
