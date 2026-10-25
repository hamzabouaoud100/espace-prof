// Canonical codes let a roster named “1/7” match the timetable group “1APIC-7”.
function classCode(name) {
  return String(name)
    .trim()
    .toUpperCase()
    .replace("/", "APIC")
    .replace(/[\s_-]/g, "");
}
function sortClasses() {
  state.classes.sort((left, right) =>
    classCode(left.name).localeCompare(classCode(right.name), "en", {
      numeric: true,
      sensitivity: "base",
    }),
  );
}
function ensureRequestedClasses() {
  if (!state.classes.some((item) => classCode(item.name) === "2APIC1")) {
    state.classes.push({
      id: crypto.randomUUID(),
      name: "2APIC-1",
      students: [],
      simple: true,
      supportOnly: false,
      templates: {},
      importedSemesters: {},
    });
    save();
  }
  sortClasses();
}
function lessonAttendanceClassIds(lesson) {
  return lesson.attendanceClassIds || lessonClassIds(lesson);
}
function lessonTime(lesson) {
  return lesson.endTime ? `${lesson.time}–${lesson.endTime}` : lesson.time;
}
function canRecordAttendance() {
  const lesson = state.lessons.find((item) => item.id === session);
  return (
    !lesson || lessonAttendanceClassIds(lesson).includes(currentClass()?.id)
  );
}
function supportOnlyMessage() {
  return t(
    "هذا فوج للدعم المدرسي مخصص لتتبع الحضور.",
    "Ce groupe de soutien est consacré au suivi des présences.",
  );
}
// Apply the teacher's reset once; attendance entered afterwards stays saved.
function applyRequestedAttendanceReset() {
  if (state.attendanceResetRevision >= 1) return;
  state.attendance = {};
  if (state.confirmations) delete state.confirmations.attendance;
  state.attendanceResetRevision = 1;
  save();
}
function configureMondaySupport() {
  const renamedSupport = state.classes.find(
    (item) => classCode(item.name) === classCode("1APIC-7"),
  );
  if (renamedSupport && renamedSupport.name !== "1APIC-7") {
    renamedSupport.name = "1APIC-7";
    save();
  }
  if (state.mondaySupportVersion >= 2) return;
  const findOrCreate = (name, supportOnly) => {
    let item = state.classes.find((c) => classCode(c.name) === classCode(name));
    if (!item) {
      item = {
        id: crypto.randomUUID(),
        name,
        students: [],
        simple: true,
        templates: {},
        importedSemesters: {},
      };
      state.classes.push(item);
    }
    item.supportOnly = supportOnly;
    return item;
  };
  const regular = findOrCreate("1APIC-5", false);
  const support = findOrCreate("1APIC-7", true);
  const ids = [regular.id, support.id];
  // Reuse a matching shared session if the teacher has already entered it.
  let lesson = state.lessons.find(
    (l) =>
      +l.day === 1 &&
      l.time === "08:00" &&
      ids.every((id) => lessonClassIds(l).includes(id)),
  );
  const settings = {
    classId: regular.id,
    classIds: ids,
    attendanceClassIds: ids,
    day: "1",
    time: "08:00",
    endTime: "10:00",
    type: "support",
    title: "دعم مدرسي / Soutien scolaire",
    room: "S10",
  };
  if (lesson) Object.assign(lesson, settings);
  else state.lessons.push({ id: crypto.randomUUID(), ...settings });
  state.mondaySupportConfigured = true;
  state.mondaySupportVersion = 2;
  save();
}
