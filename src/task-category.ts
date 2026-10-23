// Roadmap tasks carry source ids; their prefix tells which part of the
// application a task belongs to. Personal tasks have no sources.
export type TaskCategory =
  | "ap"
  | "sat"
  | "school"
  | "activity"
  | "application"
  | "cost"
  | "visa"
  | "mine"
  | "other";
const rules: [RegExp, TaskCategory][] = [
  [/^ap-/, "ap"],
  [/^sat-/, "sat"],
  [/^(ontario-|common-gpa)/, "school"],
  [/^common-guide/, "activity"],
  [/^(essay-|early-)/, "application"],
  [/^federal-aid/, "cost"],
  [/^(student-visa|sevis-)/, "visa"],
];
export function taskCategory(task: {
  sourceIds: string[];
  personal?: boolean;
}): TaskCategory {
  if (task.personal) return "mine";
  for (const [pattern, category] of rules)
    if (task.sourceIds.some((id) => pattern.test(id))) return category;
  return "other";
}
export const categoryLabels: Record<TaskCategory, [string, string]> = {
  ap: ["AP", "AP"],
  sat: ["SAT", "SAT"],
  school: ["School", "학교"],
  activity: ["Activities", "활동"],
  application: ["Application", "지원서"],
  cost: ["Cost", "비용"],
  visa: ["Visa", "비자"],
  mine: ["My task", "내 할 일"],
  other: ["Other", "기타"],
};
