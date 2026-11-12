import { normalizeProfile } from "./recommendations.ts";
import { noteWrite } from "./sync.ts";
export function readLocal(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(`uninavo:v1:${key}`) ?? "null");
  } catch {
    return null;
  }
}
export function writeLocal(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(`uninavo:v1:${key}`, JSON.stringify(value));
    noteWrite(key);
    return true;
  } catch {
    return false;
  }
}
export function loadProfile() {
  return normalizeProfile(readLocal("profile"));
}
export function loadChecked(): Set<string> {
  const stored = readLocal("checked");
  return new Set(
    Array.isArray(stored) ? stored.filter((v) => typeof v === "string") : [],
  );
}
export function loadSaved(): Set<string> {
  const stored = readLocal("saved");
  return new Set(
    Array.isArray(stored) ? stored.filter((v) => typeof v === "string") : [],
  );
}
