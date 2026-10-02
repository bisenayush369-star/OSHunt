export function getDisplayInitials(name?: string | null, email?: string | null, maxLetters = 2) {
  const source = (name ?? email ?? "").trim();
  if (!source) return "U";

  const raw = source
    .replace(/@.*$/, "")
    .replace(/[._+-]+/g, " ")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim();

  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const letters = parts.slice(0, maxLetters).map((part) => part[0]?.toUpperCase() ?? "").join("");
    return letters || "U";
  }

  const lettersFromText = raw.replace(/\s+/g, "").toUpperCase();
  const initials = lettersFromText.split("").filter((char) => /[A-Z0-9]/.test(char)).slice(0, maxLetters).join("");

  return initials || "U";
}
