function panelHeading(title, subtitle = "", trailing = "") {
  return `<div class="section-heading"><div><h2>${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ""}</div>${trailing}</div>`;
}

function dashboardView() {
  const studentCount = state.classes.reduce(
    (sum, item) => sum + item.students.length,
    0,
  );
  const todayLessons = state.lessons.filter(
    (item) => +item.day === new Date().getDay(),
  );
  const absenceCount = Object.values(state.attendance).reduce(
    (sum, items) => sum + Object.values(items).filter(Boolean).length,
    0,
  );
  const metrics = [
    [
      "classes",
      state.classes.length,
      t("الأقسام", "Classes"),
      t("أقسامك وأفواج الدعم", "Classes et groupes de soutien"),
      "blue",
    ],
    [
      "classes",
      studentCount,
      t("التلاميذ", "Élèves"),
      t("في اللوائح المستوردة", "Dans les listes importées"),
      "cyan",
    ],
    [
      "calendar",
      todayLessons.length,
      t("حصص اليوم", "Séances aujourd’hui"),
      t("حسب استعمال الزمن", "Selon votre emploi du temps"),
      "indigo",
    ],
    [
      "attendance",
      absenceCount,
      t("الغيابات المسجلة", "Absences enregistrées"),
      t("مجموع الحالات المسجلة", "Total des absences saisies"),
      "amber",
    ],
  ];
  return (
    head(
      t("مرحباً أستاذ", "Bonjour, professeur"),
      t(
        "كل ما تحتاجه لمتابعة أقسامك، في نظرة واحدة.",
        "L’essentiel pour suivre vos classes, en un coup d’œil.",
      ),
      `<span class="date-chip">${new Date().toLocaleDateString(state.fr ? "fr-MA" : "ar-MA", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>`,
    ) +
    `<section class="welcome-banner"><div><span class="banner-kicker">PHYSIQUE & CHIMIE</span><h2>${t("تنظيم أوضح. متابعة أسهل.", "Bien organisé. Bien accompagné.")}</h2><p>${t("حصصك، حضور تلاميذك، ونقط المراقبة المستمرة في مساحة واحدة.", "Vos séances, les présences et le contrôle continu, dans un même espace.")}</p><button onclick="go('attendance')">${t("تسجيل الحضور", "Faire l’appel")} <span aria-hidden="true">↗</span></button></div><div class="banner-science" aria-hidden="true"><span>⚛</span><small>F = ma</small></div></section>` +
    `<div class="dashboard-metrics">${metrics.map(([symbol, count, title, subtitle, color]) => `<article class="metric-card ${color}"><span class="metric-icon">${icon(symbol)}</span><div><span class="metric-label">${title}</span><strong>${count}</strong><small>${subtitle}</small></div></article>`).join("")}</div>` +
    `<div class="dashboard-columns"><section class="panel schedule-panel">${panelHeading(t("حصصي الأسبوعية", "Mes séances de la semaine"), t("اضغط على الحصة لفتح لائحة الحضور مباشرة.", "Cliquez sur une séance pour ouvrir directement sa feuille de présence."), `<button class="soft-button" onclick="addLesson()">＋ ${t("إضافة حصة", "Ajouter une séance")}</button>`)}${weeklySchedule()}</section><div class="dashboard-rail"><section class="panel">${panelHeading(t("إجراءات سريعة", "Accès rapide"))}<button class="action-tile" onclick="go('classes')"><span class="tile-icon">${icon("classes")}</span><span><b>${t("لائحة التلاميذ", "Liste des élèves")}</b><small>${t("البحث في لوائح أقسامك", "Retrouver les élèves par classe")}</small></span><i>↗</i></button><button class="action-tile" onclick="go('grades')"><span class="tile-icon">${icon("grades")}</span><span><b>${t("المراقبة المستمرة", "Contrôle continu")}</b><small>${t("إدخال النقط والملاحظات", "Saisir les notes et les remarques")}</small></span><i>↗</i></button><button class="action-tile" onclick="document.querySelector('#file').click()"><span class="tile-icon">＋</span><span><b>${t("استيراد لائحة", "Importer une liste")}</b><small>${t("الأسماء والنقط من ملف Excel", "Noms et notes depuis un fichier Excel")}</small></span><i>↗</i></button></section><section class="semester-card"><span class="semester-icon">${icon("grades")}</span><div class="banner-kicker">2026 / 2027</div><h3>${semesterLabel()}</h3><p>${t("نقط وملاحظات مستقلة لكل دورة، مع نفس لائحة التلاميذ.", "Des notes et remarques distinctes pour chaque semestre, avec une liste d’élèves commune.")}</p><button onclick="go('grades')">${t("فتح المراقبة المستمرة", "Ouvrir le contrôle continu")} ↗</button></section></div></div>`
  );
}

function weeklySchedule() {
  const dayNames = state.fr
    ? ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"]
    : ["", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
  return `<div class="horizontal-schedule">${[1, 2, 3, 4, 5]
    .map((dayNumber) => {
      const lessons = state.lessons
        .filter((item) => +item.day === dayNumber)
        .sort((a, b) => a.time.localeCompare(b.time));
      return `<section class="schedule-day-block"><div class="schedule-day-label"><b>${dayNames[dayNumber]}</b><span>${lessons.length} ${t("حصص", "séances")}</span></div>${lessons.length ? lessons.map((item) => `<div class="schedule-entry"><button type="button" class="session-open" onclick="openLesson('${item.id}')" aria-label="${esc(dayNames[dayNumber] + " " + lessonTime(item) + " " + lessonClassNames(item))}"><span class="schedule-time" dir="ltr"><b>${esc(item.time)}</b><small>${esc(item.endTime || "")}</small></span><span class="schedule-line ${item.type === "support" ? "support" : ""}"></span><span class="schedule-description"><span class="schedule-class">${esc(lessonClassNames(item))}${item.type === "support" ? ` <span class="status-badge support">${t("دعم مدرسي", "Soutien")}</span>` : ""}</span><span class="session-subtitle">${esc(item.title)}</span><small>${esc(item.room || t("القاعة غير محددة", "Salle non précisée"))}</small></span></button><button type="button" class="delete-session" aria-label="${t("حذف الحصة", "Supprimer la séance")}" onclick="removeLesson('${item.id}')">×</button></div>`).join("") : `<p class="no-sessions">${t("لا توجد حصص مبرمجة.", "Aucune séance prévue.")}</p>`}</section>`;
    })
    .join("")}</div>`;
}

function studentListView() {
  const title = head(
    t("لائحة التلاميذ", "Liste des élèves"),
    t(
      "اختر القسم وأكّد البحث لعرض لائحة تلاميذه.",
      "Choisissez une classe et confirmez la recherche pour afficher ses élèves.",
    ),
    importButton(),
  );
  if (!currentClass()) return title + noClass();
  const filters = `<section class="panel roster-filter">${panelHeading(t("معايير البحث", "Critères de recherche"), t("لن تظهر اللائحة قبل الضغط على عرض النتائج.", "La liste s’affichera après un clic sur Afficher les résultats."))}<div class="filter-grid"><label class="filter-label">${t("القسم", "Classe")}${selector()}</label><label class="filter-label">${t("المستوى", "Niveau")}<input value="${esc(classLevel(currentClass()))}" disabled></label><label class="filter-label">${t("البحث عن تلميذ", "Rechercher un élève")}<input value="${esc(query)}" placeholder="${t("اسم التلميذ…", "Nom de l’élève…")}" oninput="setFilterQuery(this.value)"></label></div><div class="filter-actions">${viewResultsButton()}</div></section>`;
  const results = resultsConfirmed.classes
    ? `<section class="panel roster-results">${panelHeading(t("نتيجة البحث", "Résultats de recherche"), esc(currentClass().name), `<span class="count-badge">${students().length} ${t("تلميذاً", "élèves")}</span>`)}<div class="table-wrap"><table><thead><tr><th>#</th><th>${t("الاسم الكامل", "Nom complet")}</th><th>${t("القسم", "Classe")}</th><th>${t("نوع المتابعة", "Suivi")}</th></tr></thead><tbody id="rows">${rosterRows()}</tbody></table></div><div class="table-bottom"><span>${t("لائحة التلاميذ المستوردة", "Liste des élèves importée")}</span><button class="soft-button" onclick="go('attendance')">${t("تسجيل الحضور", "Faire l’appel")} ↗</button></div></section>`
    : "";
  return title + filters + resultsContainer(results);
}
function classLevel(item) {
  if (classCode(item.name).startsWith("1"))
    return t("الأولى إعدادي", "1re année collège");
  if (classCode(item.name).startsWith("2"))
    return t("الثانية إعدادي", "2e année collège");
  if (classCode(item.name).startsWith("3"))
    return t("الثالثة إعدادي", "3e année collège");
  return t("غير محدد", "Non précisé");
}

function rosterRows() {
  return students().length
    ? students()
        .map(
          (student, index) =>
            `<tr><td class="row-number">${currentClass().students.indexOf(student) + 1}</td><td><span class="student-initial">${esc(student.name.trim().slice(0, 1))}</span><b>${esc(student.name)}</b></td><td><span class="class-tag">${esc(currentClass().name)}</span></td><td><span class="status-badge ${currentClass().supportOnly ? "support" : "regular"}">${currentClass().supportOnly ? t("الحضور فقط", "Présences uniquement") : t("حضور ومراقبة مستمرة", "Présences et contrôle continu")}</span></td></tr>`,
        )
        .join("")
    : `<tr><td colspan="4" class="no-results">${currentClass().students.length ? t("لا توجد نتائج مطابقة للبحث.", "Aucun élève ne correspond à votre recherche.") : t("استورد لائحة تلاميذ هذا القسم للبدء.", "Importez la liste des élèves de cette classe pour commencer.")}</td></tr>`;
}

function assessmentOverview() {
  const roster = currentClass()?.students || [];
  const total = roster.length * 4;
  const entered = roster.reduce(
    (sum, student) =>
      sum +
      semesterGrades(student)
        .slice(0, 4)
        .filter((value) => value !== "").length,
    0,
  );
  const percentage = total ? Math.round((entered / total) * 100) : 0;
  return `<div id="assessment-overview" class="assessment-overview"><div><span>${t("المادة", "Matière")}</span><b>${t("الفيزياء والكيمياء", "Physique & Chimie")}</b></div><div><span>${t("النقط المدخلة", "Notes saisies")}</span><b>${entered}<small> / ${total}</small></b></div><div><span>${t("النقط المتبقية", "Notes restantes")}</span><b>${total - entered}</b></div><div class="assessment-progress"><span>${t("تقدم الإدخال", "Progression de la saisie")} <b>${percentage}%</b></span><div class="progress-track"><i style="width:${percentage}%"></i></div></div></div>`;
}
