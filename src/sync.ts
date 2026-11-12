// Shares Taeyul's records between devices through UniNavo's own Supabase
// project (never the YOLO Education app's). The browser keeps working from
// localStorage; this module copies the shared keys up and down.
//
// Access is the family link: `?k=<secret>` once, then remembered on the
// device. The anon key below is public by design; with it alone the database
// returns nothing, because every call must carry the secret.

export const SUPABASE_URL = "https://wuyykhfmukszyknyjqjw.supabase.co";
export const SUPABASE_ANON_KEY =
  "sb_publishable_1ZnPPfMjfRkF_KJXjz1qWw_phGGaO4E";

// Per-device preferences such as the language are left out.
export const SYNCED_KEYS = [
  "grades",
  "journal",
  "planner",
  "checked",
  "saved",
  "scenario",
  "profile",
] as const;
const SECRET_KEY = "uninavo:sync-secret";
const PENDING_KEY = "uninavo:sync-pending";
const local = (key: string) => `uninavo:v1:${key}`;

export type SyncStatus = "local" | "synced" | "saving" | "offline" | "denied";
export interface RemoteRow {
  key: string;
  value: unknown;
}

// What to do at start-up: unsent local edits go up first, then anything the
// server has that differs comes down. An empty server receives this device's
// data, so the first device to connect seeds it.
export function planStart(
  localValues: Record<string, string | null>,
  remote: RemoteRow[],
  pending: string[],
) {
  const synced = new Set<string>(SYNCED_KEYS);
  const push = new Set(pending.filter((k) => synced.has(k)));
  if (!remote.length)
    for (const k of SYNCED_KEYS) if (localValues[k] != null) push.add(k);
  const writes: Record<string, string> = {};
  for (const row of remote) {
    if (!synced.has(row.key) || push.has(row.key)) continue;
    const text = JSON.stringify(row.value);
    if (localValues[row.key] !== text) writes[row.key] = text;
  }
  return { push: [...push], writes };
}

let secret: string | null = null;
let status: SyncStatus = "local";
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function store(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
function pending(): string[] {
  try {
    const v = JSON.parse(store()?.getItem(PENDING_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((k) => typeof k === "string") : [];
  } catch {
    return [];
  }
}
function setPending(keys: string[]) {
  try {
    store()?.setItem(PENDING_KEY, JSON.stringify([...new Set(keys)]));
  } catch {
    /* storage full or blocked: the edit stays local */
  }
}
function setStatus(next: SyncStatus) {
  status = next;
  const el = document.getElementById("sync-status");
  if (el) {
    el.textContent = syncLabel();
    el.dataset.state = next;
  }
}
export const syncStatus = () => status;
export function syncLabel(): string {
  return {
    local: "이 기기에만 저장",
    synced: "모든 기기와 공유됨",
    saving: "저장 중…",
    offline: "연결 안 됨 · 이 기기에 보관 중",
    denied: "링크가 맞지 않아요",
  }[status];
}

async function rpc(name: string, body: object): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const err = new Error(`${name} ${res.status}`);
      (err as Error & { denied?: boolean }).denied =
        res.status === 401 || res.status === 403;
      throw err;
    }
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}
const failed = (e: unknown) =>
  setStatus((e as { denied?: boolean }).denied ? "denied" : "offline");

async function push(key: string): Promise<boolean> {
  if (!secret) return false;
  const raw = store()?.getItem(local(key));
  if (raw == null) return true;
  try {
    await rpc("uninavo_push", {
      p_secret: secret,
      p_key: key,
      p_value: JSON.parse(raw),
    });
    setPending(pending().filter((k) => k !== key));
    return true;
  } catch (e) {
    failed(e);
    return false;
  }
}
async function pull(): Promise<RemoteRow[]> {
  const rows = await rpc("uninavo_pull", { p_secret: secret });
  return Array.isArray(rows) ? (rows as RemoteRow[]) : [];
}
function localValues() {
  const s = store();
  return Object.fromEntries(
    SYNCED_KEYS.map((k) => [k, s?.getItem(local(k)) ?? null]),
  );
}

// Called by writeLocal after every save.
export function noteWrite(key: string) {
  if (!secret || !(SYNCED_KEYS as readonly string[]).includes(key)) return;
  setPending([...pending(), key]);
  setStatus("saving");
  clearTimeout(timers.get(key));
  timers.set(
    key,
    setTimeout(async () => {
      timers.delete(key);
      if ((await push(key)) && !timers.size) setStatus("synced");
    }, 700),
  );
}

function readSecret(): string | null {
  const url = new URL(location.href);
  const fromLink = url.searchParams.get("k");
  if (fromLink && /^[A-Za-z0-9_-]{24,128}$/.test(fromLink)) {
    try {
      store()?.setItem(SECRET_KEY, fromLink);
    } catch {
      /* fall through: use it for this visit only */
    }
    url.searchParams.delete("k");
    history.replaceState(null, "", url.toString());
    return fromLink;
  }
  return store()?.getItem(SECRET_KEY) ?? null;
}

async function syncNow(): Promise<boolean> {
  const plan = planStart(localValues(), await pull(), pending());
  for (const k of plan.push) if (!(await push(k))) return false;
  for (const [k, text] of Object.entries(plan.writes))
    store()?.setItem(local(k), text);
  setStatus("synced");
  return Object.keys(plan.writes).length > 0;
}

// Runs before the app renders, so the first screen already shows shared data.
export async function startSync(): Promise<void> {
  if (!SUPABASE_ANON_KEY) return;
  secret = readSecret();
  if (!secret) return;
  try {
    await syncNow();
  } catch (e) {
    failed(e);
  }
  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState !== "visible" || timers.size) return;
    try {
      const changed = await syncNow();
      const busy =
        document.querySelector("dialog[open]") ||
        document.activeElement?.matches("input, textarea, select");
      if (changed && !busy) location.reload();
    } catch (e) {
      failed(e);
    }
  });
}
