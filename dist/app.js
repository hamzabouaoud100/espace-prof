function head(title, sub, action = "") {
  return `<div class="heading"><div><div class="eyebrow">ESPACE PROF</div><h1>${title}</h1><p style="margin:0">${sub}</p></div><div class="tools" style="margin:0">${page === "classes" ? "" : semesterSelector()}${action}</div></div>`;
}
function importButton() {
  return `<button class="primary" onclick="document.querySelector('#file').click()">＋ ${t("استيراد قسم · Excel", "Importer une classe · Excel")}</button>`;
}
function selector(attendanceOnly = false) {
  const activeLesson = state.lessons.find((l) => l.id === session);
  const choices =
    attendanceOnly && activeLesson
      ? state.classes.filter((c) =>
          lessonAttendanceClassIds(activeLesson).includes(c.id),
        )
      : page === "grades"
        ? state.classes.filter((c) => !c.supportOnly)
        : state.classes;
  return `<select aria-label="Classe" onchange="selectClass(this.value)">${page === "grades" ? `<option value="">${t("اختر القسم…", "Choisir une classe…")}</option>` : ""}${choices.map((c) => `<option ${currentClass()?.id === c.id ? "selected" : ""} value="${esc(c.id)}">${esc(c.name)}</option>`).join("")}</select>`;
}
function render() {
  document.body.classList.toggle("fr", state.fr);
  document.documentElement.lang = state.fr ? "fr" : "ar";
  document.documentElement.dir = state.fr ? "ltr" : "rtl";
  updateShell();
  $("#nav").innerHTML = labels()
    .map(
      (l, i) =>
        `<button class="${page === pages[i] ? "active" : ""}" aria-current="${page === pages[i] ? "page" : "false"}" title="${esc(l)}" aria-label="${esc(l)}" onclick="go('${pages[i]}')"><span class="nav-icon">${icon(icons[i])}</span><span class="nav-label">${l}</span></button>`,
    )
    .join("");
  $("#crumb").textContent = labels()[pages.indexOf(page)];
  $("#content").innerHTML = { home, attendance, grades, classes }[page]();
}
function home() {
  return dashboardView();
}
function openLesson(id, classId) {
  const l = state.lessons.find((l) => l.id === id);
  if (!l) return;
  const ids = lessonAttendanceClassIds(l);
  selected = ids.includes(classId)
    ? classId
    : ids.includes(selected)
      ? selected
      : ids[0];
  session = l.id;
  const d = new Date(day + "T12:00:00");
  d.setDate(d.getDate() + ((+l.day - d.getDay() + 7) % 7));
  day = d.toLocaleDateString("en-CA");
  go("attendance");
  showResults();
  if (typeof window !== "undefined")
    window.scrollTo({ top: 0, behavior: "auto" });
}
function addLesson() {
  if (!currentClass())
    return toast(
      t(
        "أضف قسماً قبل برمجة حصصك.",
        "Ajoutez une classe avant de planifier vos cours.",
      ),
    );
  const days = state.fr
    ? ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"]
    : ["الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
  $("#modal").innerHTML = `<form id="lessonForm">
    <div class="eyebrow">ESPACE PROF</div><h2 id="lesson-form-title">${t("برمجة حصة جديدة", "Planifier une séance")}</h2>
    <label for="lesson-type">${t("نوع الحصة", "Type de séance")}</label><select id="lesson-type" name="type"><option value="regular">${t("درس عادي", "Cours régulier")}</option><option value="support">${t("دعم مدرسي", "Soutien scolaire")}</option></select>
    <label for="lesson-class">${t("القسم", "Classe")}</label>
    <select id="lesson-class" name="classId" onchange="syncLessonClasses()">${state.classes.map((c) => `<option value="${esc(c.id)}" ${c.id === currentClass().id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select>
    <label for="lesson-second-class">${t("قسم ثانٍ في نفس الساعة · اختياري", "Deuxième classe à la même heure · facultatif")}</label>
    <select id="lesson-second-class" name="secondClassId"><option value="">${t("قسم واحد فقط", "Une seule classe")}</option>${state.classes.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("")}</select>
    <p class="field-hint">${t("تظهر الحصة بالقسمين، مع لائحة حضور مستقلة لكل قسم.", "Les deux classes partagent la séance, avec un appel distinct pour chacune.")}</p>
    <label for="lesson-day">${t("اليوم", "Jour")}</label>
    <select id="lesson-day" name="day">${days.map((name, i) => `<option value="${i + 1}">${name}</option>`).join("")}</select>
    <label for="lesson-time">${t("بداية الحصة", "Heure de début")}</label><input id="lesson-time" name="time" type="time" value="08:00" required>
    <label for="lesson-end">${t("نهاية الحصة · اختياري", "Heure de fin · facultatif")}</label><input id="lesson-end" name="endTime" type="time">
    <label for="lesson-title">${t("موضوع الدرس", "Titre de la leçon")}</label><input id="lesson-title" name="title" placeholder="${t("مثال: الدارة الكهربائية", "Ex. : Le circuit électrique")}" required>
    <label for="lesson-room">${t("القاعة · اختياري", "Salle · facultatif")}</label><input id="lesson-room" name="room" placeholder="${t("مثال: مختبر الفيزياء", "Ex. : Laboratoire de physique")}">
    <p id="lesson-error" class="form-error" role="alert" hidden></p>
    <div class="dialog-actions"><button type="submit" class="primary">${t("حفظ الحصة", "Enregistrer la séance")}</button><button type="button" onclick="document.querySelector('#modal').close()">${t("إلغاء", "Annuler")}</button></div>
  </form>`;
  $("#lessonForm").onsubmit = (event) => {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.target));
    const errorBox = document.getElementById("lesson-error");
    errorBox.hidden = true;
    let lesson;
    try {
      lesson = createLesson(fields);
      state.lessons.push(lesson);
      save();
    } catch (error) {
      if (lesson)
        state.lessons = state.lessons.filter((item) => item.id !== lesson.id);
      errorBox.textContent =
        error.name === "QuotaExceededError"
          ? t(
              "تعذر الحفظ لأن مساحة التخزين ممتلئة. يرجى تصدير بياناتك قبل المتابعة.",
              "Enregistrement impossible : stockage plein. Exportez vos données avant de continuer.",
            )
          : error.message;
      errorBox.hidden = false;
      errorBox.scrollIntoView({ block: "nearest" });
      return;
    }
    $("#modal").close();
    render();
    toast(
      t(
        "تمت إضافة الحصة إلى استعمال الزمن.",
        "La séance a été ajoutée à votre emploi du temps.",
      ),
    );
  };
  $("#modal").setAttribute("aria-labelledby", "lesson-form-title");
  syncLessonClasses();
  $("#modal").showModal();
}
function removeLesson(id) {
  state.lessons = state.lessons.filter((l) => l.id !== id);
  save();
  render();
}
function noClass() {
  return `<section class="panel empty"><h2>${t("ابدأ بإضافة قسمك الأول", "Ajoutez votre première classe")}</h2><p>${t("استورد Excel بسيطاً: الاسم، الفرض 1، الفرض 2، الفرض 3، الأنشطة. يمكن ترك النقط فارغة.", "Importez un Excel simple : Nom, Contrôle 1, Contrôle 2, Contrôle 3, Activités. Les notes peuvent rester vides.")}</p>${importButton()}</section>`;
}
function classes() {
  return studentListView();
}
function attendance() {
  const title = head(
    t("تسجيل الغياب", "Présences et absences"),
    t(
      "حدّد القسم والتاريخ والحصة، ثم اضغط عرض النتائج.",
      "Sélectionnez la classe, la date et la séance, puis affichez les résultats.",
    ),
  );
  if (!currentClass()) return title + noClass();
  const filters = `<section class="panel attendance-panel">${panelHeading(t("معايير البحث", "Critères de recherche"))}<div class="tools"><label class="filter-label">${t("القسم", "Classe")}${selector(true)}</label><label class="filter-label">${t("التاريخ", "Date")}<input type="date" value="${day}" onchange="setAttendanceFilter('day',this.value)"></label><label class="filter-label">${t("الحصة", "Séance")}<select onchange="setAttendanceFilter('session',this.value)"><option value="">${t("حضور عام", "Présence générale")}</option>${state.lessons
    .filter((l) => lessonAttendanceClassIds(l).includes(currentClass().id))
    .map(
      (l) =>
        `<option value="${l.id}" ${session === l.id ? "selected" : ""}>${esc(lessonTime(l) + " · " + l.title)}</option>`,
    )
    .join(
      "",
    )}</select></label><label class="filter-label">${t("البحث عن تلميذ", "Rechercher un élève")}<input value="${esc(query)}" placeholder="${t("اسم التلميذ…", "Nom de l’élève…")}" oninput="setFilterQuery(this.value)"></label></div><div class="filter-actions">${viewResultsButton()}${currentClass().students.length ? "" : importButton()}</div></section>`;
  const results = resultsConfirmed.attendance
    ? `<section class="panel attendance-panel">${panelHeading(t("لائحة الحضور", "Feuille de présence"), t("حدّد الغائبين، ثم أكّد الحضور بعد المراجعة.", "Cochez les absents, puis confirmez l’appel après vérification."))}${attendanceClassTabs()}<div class="table-wrap"><table><thead><tr><th>#</th><th>${t("الاسم الكامل", "Nom complet")}</th><th>${t("غائب", "Absent")}</th></tr></thead><tbody id="rows">${attendanceRows()}</tbody></table></div><div class="results-actions"><button class="primary" onclick="confirmEntries('attendance')">✓ ${t("تأكيد الغياب", "Confirmer les présences")}</button><button onclick="exportWord()">${t("تحميل لائحة الغياب (Word)", "Télécharger la liste des absents (Word)")}</button><button type="button" class="danger-button" onclick="requestAttendanceReset()">${t("مسح الغياب", "Réinitialiser les absences")}</button></div>${confirmationStatus("attendance")}</section>`
    : "";
  return title + filters + resultsContainer(results);
}
function attendanceRows() {
  return students().length
    ? students()
        .map(
          (s, i) =>
            `<tr><td>${i + 1}</td><td>${esc(s.name)}</td><td><label><input type="checkbox" ${absent(s) ? "checked" : ""} onchange="mark('${s.id}',this.checked)"> ${t("غائب", "Absent")}</label></td></tr>`,
        )
        .join("")
    : `<tr><td colspan="3" class="no-results">${currentClass()?.students.length ? t("لا توجد نتائج مطابقة للبحث.", "Aucun élève ne correspond à votre recherche.") : t("استورد لائحة تلاميذ هذا القسم للبدء.", "Importez la liste des élèves de cette classe pour commencer.")}</td></tr>`;
}
function mark(id, v) {
  if (!canRecordAttendance())
    return toast(
      t(
        "لا يلزم تسجيل حضور هذا القسم في حصة الدعم.",
        "Cette classe ne fait pas l’objet d’un appel pour cette séance.",
      ),
    );
  state.attendance[attendanceKey()] ??= {};
  state.attendance[attendanceKey()][id] = v;
  invalidateConfirmation("attendance");
  save();
}
function grades() {
  const title = head(
    t("المراقبة المستمرة", "Contrôle continu"),
    t(
      "اختر القسم والدورة، ثم اضغط عرض النتائج.",
      "Choisissez la classe et le semestre, puis affichez les résultats.",
    ),
  );
  const filters = `<section class="panel assessment-picker">${panelHeading(t("معايير البحث", "Critères de recherche"), t("اختر القسم أولاً. لا تظهر النقط إلا بعد تأكيد الاختيار.", "Choisissez d’abord une classe. Les notes s’affichent après confirmation."))}<div class="filter-grid"><label class="filter-label">${t("القسم", "Classe")}${selector()}</label><label class="filter-label">${t("البحث عن تلميذ", "Rechercher un élève")}<input value="${esc(query)}" placeholder="${t("اسم التلميذ…", "Nom de l’élève…")}" oninput="setFilterQuery(this.value)"></label></div><div class="filter-actions">${viewResultsButton()}</div></section>`;
  let results = "";
  if (resultsConfirmed.grades && currentClass()) {
    if (currentClass().supportOnly)
      results = `<section class="panel empty"><h2>${t("فوج دعم مدرسي", "Groupe de soutien scolaire")}</h2><p>${supportOnlyMessage()}</p><button onclick="go('attendance')">${t("تسجيل الحضور", "Faire l’appel")}</button></section>`;
    else
      results = `<section class="panel assessment-panel">${panelHeading(t("نقط المراقبة المستمرة", "Notes du contrôle continu"), esc(currentClass().name) + " · " + semesterLabel())}${assessmentOverview()}<div class="table-wrap"><table><thead><tr><th>${t("التلميذ", "Élève")}</th>${[t("الفرض 1", "Contrôle 1"), t("الفرض 2", "Contrôle 2"), t("الفرض 3", "Contrôle 3"), t("الأنشطة المندمجة", "Activités intégrées"), t("ملاحظات الأستاذ", "Remarques")].map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody id="rows">${gradeRows()}</tbody></table></div><div class="results-actions"><button class="primary" onclick="confirmEntries('grades')">✓ ${t("تأكيد النقط", "Confirmer les notes")}</button><button onclick="exportExcel()">${t("تحميل لائحة النقط (Excel)", "Télécharger la liste des notes (Excel)")}</button></div>${confirmationStatus("grades")}</section>`;
  }
  return title + filters + resultsContainer(results);
}
function gradeRows() {
  if (!students().length)
    return `<tr><td colspan="6" class="no-results">${currentClass()?.students.length ? t("لا توجد نتائج مطابقة للبحث.", "Aucun élève ne correspond à votre recherche.") : t("استورد لائحة تلاميذ هذا القسم للبدء.", "Importez la liste des élèves de cette classe pour commencer.")}</td></tr>`;
  return students()
    .map(
      (student) =>
        `<tr><td><b>${esc(student.name)}</b></td>${[0, 1, 2, 3].map((i) => `<td><input aria-label="${esc(student.name)} ${i + 1}" type="number" min="0" max="20" step="0.25" value="${esc(semesterGrades(student)[i])}" onchange="grade('${student.id}',${i},this)"></td>`).join("")}<td class="remark-cell"><div class="remark-input-group"><input id="remark-input-${esc(student.id)}" aria-label="${t("ملاحظة الأستاذ", "Remarque")}" class="note" type="text" placeholder="${t("ملاحظة…", "Remarque…")}" value="${esc(semesterGrades(student)[4])}" onchange="grade('${student.id}',4,this)">${remarkPicker(student)}</div></td></tr>`,
    )
    .join("");
}
function grade(id, i, input) {
  if (!currentClass())
    return toast(t("اختر القسم أولاً.", "Choisissez d’abord une classe."));
  if (currentClass()?.supportOnly) return toast(supportOnlyMessage());
  if (
    i < 4 &&
    input.value !== "" &&
    (!Number.isFinite(+input.value) || +input.value < 0 || +input.value > 20)
  ) {
    input.value = semesterGrades(
      currentClass().students.find((s) => s.id === id),
    )[i];
    return toast(t("النقطة بين 0 و20", "La note doit être entre 0 et 20"));
  }
  semesterGrades(currentClass().students.find((s) => s.id === id))[i] =
    input.value;
  invalidateConfirmation("grades");
  save();
  const overview = $("#assessment-overview");
  if (overview) overview.outerHTML = assessmentOverview();
}
$("#lang").onclick = () => {
  state.fr = !state.fr;
  save();
  render();
};
render();
