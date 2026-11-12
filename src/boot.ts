import { startSync } from "./sync.ts";

// Pull shared records before the app reads localStorage.
startSync().finally(() => import("./main.ts"));
