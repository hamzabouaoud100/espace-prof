const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
let state = JSON.parse(localStorage.getItem("carnet-v1") || "null") || {
    classes: [],
    lessons: [],
    attendance: {},
    fr: false,
  },
  page = "home",
  selected = "",
  query = "",
  day = new Date().toLocaleDateString("en-CA"),
  session = "",
  assessmentClassId = "";
const t = (a, f) => (state.fr ? f : a),
  labels = () => [
    t("لوحة القيادة", "Tableau de bord"),
    t("لائحة التلاميذ", "Liste des élèves"),
    t("الغياب والحضور", "Absences et présences"),
    t("المراقبة المستمرة", "Contrôle continu"),
  ],
  pages = ["home", "classes", "attendance", "grades"],
  icons = ["dashboard", "classes", "attendance", "grades"];
state.semester = String(state.semester || "1");
state.classes.forEach(normalizeSemesters);
configureMondaySupport();
applyRequestedAttendanceReset();
ensureRequestedClasses();
configureWeeklyTimetable();
function save() {
  sortClasses();
  localStorage.setItem("carnet-v1", JSON.stringify(state));
}
function toast(s) {
  $("#toast").textContent = s;
  $("#toast").style.display = "block";
  setTimeout(() => ($("#toast").style.display = "none"), 3000);
}
function go(p) {
  resetResults(p);
  if (p === "grades") assessmentClassId = "";
  page = p;
  query = "";
  render();
}
function currentClass() {
  if (page === "grades")
    return state.classes.find((c) => c.id === assessmentClassId);
  return state.classes.find((c) => c.id === selected) || state.classes[0];
}
function students() {
  return (currentClass()?.students || []).filter((s) =>
    (s.name + " " + s.id).toLowerCase().includes(query.toLowerCase()),
  );
}
function attendanceKey() {
  return [currentClass()?.id, day, session || "general"].join("|");
}
function absent(s) {
  return !!state.attendance[attendanceKey()]?.[s.id];
}
// Older timetable entries contain one classId; new entries can link two classes.
function lessonClassIds(lesson) {
  return lesson.classIds?.length ? lesson.classIds : [lesson.classId];
}
function lessonClassNames(lesson) {
  return lessonClassIds(lesson)
    .map((id) => state.classes.find((item) => item.id === id)?.name)
    .filter(Boolean)
    .join(" + ");
}
function selectClass(id) {
  resetResults();
  if (page === "grades") assessmentClassId = id;
  selected = id;
  const lesson = state.lessons.find((item) => item.id === session);
  if (!lesson || !lessonAttendanceClassIds(lesson).includes(id)) session = "";
  render();
}
function createLesson(fields) {
  const ids = [fields.classId, fields.secondClassId].filter(Boolean);
  if (new Set(ids).size !== ids.length) {
    throw new Error(
      t(
        "اختر قسمين مختلفين لهذه الحصة.",
        "Choisissez deux classes différentes pour cette séance.",
      ),
    );
  }
  if (
    !ids.length ||
    ids.some((id) => !state.classes.some((item) => item.id === id))
  ) {
    throw new Error(
      t("يرجى اختيار قسم موجود.", "Veuillez choisir une classe existante."),
    );
  }
  const support = fields.type === "support";
  const attendanceIds = ids;
  if (fields.endTime && fields.endTime <= fields.time)
    throw new Error(
      t(
        "يجب أن تكون نهاية الحصة بعد بدايتها.",
        "La fin de séance doit être après le début.",
      ),
    );
  return {
    id: crypto.randomUUID(),
    type: support ? "support" : "regular",
    attendanceClassIds: attendanceIds,
    endTime: fields.endTime || "",
    classId: ids[0],
    classIds: ids,
    day: fields.day,
    time: fields.time,
    title: fields.title.trim(),
    room: fields.room.trim(),
  };
}
function attendanceClassTabs() {
  const lesson = state.lessons.find((item) => item.id === session);
  if (!lesson || lessonClassIds(lesson).length < 2) return "";
  const support = lesson.type === "support";
  return `<div class="shared-session"><div><b>${support ? t("حصة دعم مدرسي", "Soutien scolaire") : t("حصة مشتركة", "Séance partagée")}</b><p>${support ? t("سجّل حضور كل قسم بشكل مستقل. لا تُسجّل نقط لهذه الحصة.", "Faites l’appel séparément pour chaque classe indiquée. Aucun contrôle pour cette séance.") : t("اختر القسم لتسجيل حضوره وتأكيده بشكل مستقل.", "Sélectionnez une classe pour vérifier et confirmer son appel séparément.")}</p></div><div class="class-tabs" role="group" aria-label="${t("أقسام الحصة", "Classes de la séance")}">${lessonAttendanceClassIds(
    lesson,
  )
    .map(
      (id) =>
        `<button type="button" aria-pressed="${currentClass()?.id === id}" class="${currentClass()?.id === id ? "primary" : ""}" onclick="openLesson('${lesson.id}','${id}')">${esc(state.classes.find((item) => item.id === id)?.name || "")}</button>`,
    )
    .join("")}</div></div>`;
}
function download(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function syncLessonClasses() {
  const first = document.getElementById("lesson-class");
  const second = document.getElementById("lesson-second-class");
  for (const option of second.options)
    option.disabled = Boolean(option.value) && option.value === first.value;
  if (second.value === first.value) second.value = "";
}
