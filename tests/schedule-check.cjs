const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const state = {
  classes: [
    {
      id: "existing-class",
      name: "2APIC-5",
      students: [{ id: "student", grades: ["15", "", "", "", "Keep"] }],
      supportOnly: false,
    },
  ],
  lessons: [
    {
      id: "existing-lesson",
      classId: "existing-class",
      day: "1",
      time: "11:00",
      title: "Old title",
    },
  ],
  attendance: {
    "existing-class|2026-10-26|existing-lesson": { student: true },
  },
};
let saved = 0;
const context = vm.createContext({
  state,
  crypto: require("node:crypto"),
  save: () => saved++,
  lessonClassIds: (lesson) => lesson.classIds || [lesson.classId],
});
for (const file of ["support", "schedule"])
  vm.runInContext(fs.readFileSync(`dist/${file}.js`, "utf8"), context);
context.configureWeeklyTimetable();
assert.equal(state.lessons.length, 18);
assert.equal(state.classes.length, 10);
assert.deepEqual(
  [1, 2, 3, 4, 5, 6].map(
    (day) => state.lessons.filter((l) => +l.day === day).length,
  ),
  [3, 4, 4, 3, 4, 0],
);
assert.equal(state.lessons.find((l) => l.id === "existing-lesson").room, "S10");
assert.equal(
  state.lessons.find((l) => l.id === "existing-lesson").type,
  "support",
);
assert(state.attendance["existing-class|2026-10-26|existing-lesson"].student);
assert.equal(
  state.classes.find((c) => c.id === "existing-class").students[0].grades[0],
  "15",
);
const shared = state.lessons.find((l) => +l.day === 1 && l.time === "10:00");
assert.equal(shared.classIds.length, 2);
assert(
  shared.classIds.some(
    (id) => state.classes.find((c) => c.id === id).name === "2APIC-1",
  ),
);
const wednesday = state.lessons.filter((l) => +l.day === 3);
assert.equal(wednesday[0].time, "14:00");
assert.equal(wednesday[3].endTime, "18:00");
context.configureWeeklyTimetable();
assert.equal(state.lessons.length, 18);
assert.equal(saved, 1);
console.log(
  "Passed: 18 sessions, daily counts, Monday support pairs, rooms/times, saved IDs/data and no repeated import.",
);
