const iconPaths = {
  dashboard:
    '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2"/>',
  attendance:
    '<path d="m8 12 3 3 6-7"/><rect x="4" y="3" width="16" height="18" rx="3"/>',
  grades:
    '<path d="M8 7h8M8 11h8M8 15h4"/><rect x="4" y="3" width="16" height="18" rx="2"/>',
  classes:
    '<path d="M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M17 14a4 4 0 0 1 4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M17 3a4 4 0 0 1 0 8"/>',
};
function icon(name) {
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.dashboard}</svg>`;
}
function updateShell() {
  updateSidebar();
  const translations = {
    "shell-nav-caption": t("التدبير التربوي", "ESPACE PÉDAGOGIQUE"),
    "shell-role": t(
      "أستاذ الفيزياء والكيمياء",
      "Professeur de physique-chimie",
    ),
    "shell-subject": t("الفيزياء والكيمياء", "Physique & Chimie"),
    "shell-year": t("السنة الدراسية", "Année scolaire"),
    "shell-personal": t("مساحتك التعليمية", "Votre espace pédagogique"),
    "shell-workspace": t("مساحة العمل", "Espace de travail"),
    "shell-logout": t("تسجيل الخروج", "Déconnexion"),
    "shell-footer": t(
      "فضاء الأستاذ — الفيزياء والكيمياء",
      "Espace Prof — Physique & Chimie",
    ),
    "shell-storage": t(
      "البيانات محفوظة على هذا المتصفح",
      "Données enregistrées dans ce navigateur",
    ),
  };
  for (const [id, text] of Object.entries(translations)) {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
  }
  document.querySelector("#lang").textContent = state.fr
    ? "العربية"
    : "Français";
}
function updateSidebar() {
  const closed = Boolean(state.sidebarClosed);
  document.body.classList.toggle("sidebar-closed", closed);
  const button = document.getElementById("sidebar-toggle");
  if (!button) return;
  const label = closed
    ? t("فتح القائمة الجانبية", "Ouvrir le menu latéral")
    : t("إغلاق القائمة الجانبية", "Fermer le menu latéral");
  button.setAttribute("aria-expanded", String(!closed));
  button.setAttribute("aria-label", label);
  button.title = label;
}
function toggleSidebar() {
  state.sidebarClosed = !state.sidebarClosed;
  save();
  updateSidebar();
}
async function logout() {
  try {
    const response = await fetch("/api/logout", { method: "POST" });
    if (!response.ok) throw new Error("Logout failed");
    location.replace("/login.html");
  } catch {
    toast(
      t(
        "تعذر تسجيل الخروج. تحقق من اتصالك وأعد المحاولة.",
        "Déconnexion impossible. Vérifiez la connexion et réessayez.",
      ),
    );
  }
}
