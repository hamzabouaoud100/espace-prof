function semesterLabel(n = state.semester) {
  return n === "2"
    ? t("الدورة الثانية", "Semestre 2")
    : t("الدورة الأولى", "Semestre 1");
}
function semesterSelector() {
  return `<select aria-label="${t("الدورة الدراسية", "Semestre")}" onchange="chooseSemester(this.value)">${["1", "2"].map((n) => `<option value="${n}" ${state.semester === n ? "selected" : ""}>${semesterLabel(n)}</option>`).join("")}</select>`;
}
function normalizeSemesters(c) {
  const n = /الثانية|2|deux/i.test(c.term || "") ? "2" : "1";
  c.students.forEach((s) => {
    if (!s.semesterGrades)
      s.semesterGrades = {
        1: ["", "", "", "", ""],
        2: ["", "", "", "", ""],
        [n]: [...(s.grades || ["", "", "", "", ""])],
      };
  });
  c.students.forEach((s) => {
    s.semesterRows ??= { [n]: s.row };
  });
  if (!c.templates) {
    c.templates = c.simple ? {} : { [n]: c.template };
  }
  if (!c.importedSemesters) c.importedSemesters = { [n]: true };
  return c;
}
function semesterGrades(s) {
  s.semesterGrades ??= { 1: ["", "", "", "", ""], 2: ["", "", "", "", ""] };
  return s.semesterGrades[state.semester];
}
function acceptSemesterImport(c) {
  const n = c.simple
      ? state.semester
      : /الثانية|2|deux/i.test(c.term || "")
        ? "2"
        : "1",
    existing = state.classes.find(
      (x) => classCode(x.name) === classCode(c.name),
    );
  if (existing && !existing.students.length) {
    const stableId = existing.id,
      supportOnly = existing.supportOnly;
    Object.assign(existing, c, { id: stableId, supportOnly });
    existing.students.forEach((s) => {
      s.semesterGrades = {
        1: ["", "", "", "", ""],
        2: ["", "", "", "", ""],
        [n]: supportOnly ? ["", "", "", "", ""] : [...s.grades],
      };
      s.semesterRows = { [n]: s.row };
    });
    existing.templates = c.simple ? {} : { [n]: c.template };
    existing.importedSemesters = { [n]: true };
    state.semester = n;
    return;
  }
  if (existing) {
    if (existing.importedSemesters?.[n])
      throw Error(
        t(
          "تم استيراد هذا القسم لهذه الدورة بالفعل. اختر الدورة الأخرى لإضافة نقطها.",
          "Cette classe est déjà importée pour ce semestre. Choisissez l’autre semestre.",
        ),
      );
    const key = (s) => (c.simple ? s.name.trim().normalize("NFC") : s.id);
    const incoming = new Map(c.students.map((s) => [key(s), s]));
    if (
      incoming.size !== c.students.length ||
      existing.students.length !== c.students.length ||
      existing.students.some((s) => !incoming.has(key(s)))
    )
      throw Error(
        t(
          "لائحة التلاميذ لا تطابق القسم. تحقق من الأسماء أو أرقام التلاميذ.",
          "La liste ne correspond pas à la classe. Vérifiez les noms ou les identifiants.",
        ),
      );
    existing.students.forEach((s) => {
      s.semesterGrades[n] = [...incoming.get(key(s)).grades];
      s.semesterRows ??= {};
      s.semesterRows[n] = incoming.get(key(s)).row;
    });
    if (!c.simple) existing.templates[n] = c.template;
    existing.importedSemesters[n] = true;
  } else {
    c.students.forEach((s) => {
      s.semesterGrades = {
        1: ["", "", "", "", ""],
        2: ["", "", "", "", ""],
        [n]: [...s.grades],
      };
    });
    c.students.forEach((s) => (s.semesterRows = { [n]: s.row }));
    c.templates = c.simple ? {} : { [n]: c.template };
    c.importedSemesters = { [n]: true };
    state.classes.push(c);
  }
  state.semester = n;
}
