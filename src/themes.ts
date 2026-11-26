import light from "./themes/light.json";
import dark from "./themes/dark.json";
export type Theme = typeof light;
export const builtins: Theme[] = [light, dark];
export const THEME_KEY = "notepad.themes.v1",
  PREF_KEY = "notepad.preferences.v1";
export function validateTheme(raw: unknown): Theme {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("主题必须是 JSON 对象");
  const r = raw as Record<string, unknown>;
  for (const k of Object.keys(r))
    if (!["version", "id", "name", "base", "colors"].includes(k))
      throw new Error(`未知字段：${k}`);
  if (r.version !== 1) throw new Error("version 必须为 1");
  if (typeof r.id !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(r.id))
    throw new Error("id 仅允许 1–64 位字母、数字、下划线和短横线");
  if (typeof r.name !== "string" || !r.name.trim() || r.name.length > 80)
    throw new Error("name 必须为 1–80 字符");
  if (r.base !== "light" && r.base !== "dark")
    throw new Error("base 必须为 light 或 dark");
  if (!r.colors || typeof r.colors !== "object" || Array.isArray(r.colors))
    throw new Error("colors 必须为对象");
  const colors = { ...(r.base === "dark" ? dark : light).colors };
  for (const [k, v] of Object.entries(r.colors)) {
    if (!Object.hasOwn(colors, k)) throw new Error(`未知颜色：colors.${k}`);
    if (typeof v !== "string" || !/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(v))
      throw new Error(`colors.${k} 必须是十六进制颜色`);
    (colors as Record<string, string>)[k] = v;
  }
  return { version: 1, id: r.id, name: r.name.trim(), base: r.base, colors };
}
export function applyTheme(t: Theme) {
  for (const [k, v] of Object.entries(t.colors))
    document.documentElement.style.setProperty(
      "--" + k.replaceAll(".", "-"),
      v,
    );
  document.documentElement.style.colorScheme =
    t.base === "dark" ? "dark" : "light";
}
