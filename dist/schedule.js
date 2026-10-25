// Weekly sessions transcribed from the teacher's timetable.
const teacherTimetable = [
  {
    day: 1,
    time: "08:00",
    endTime: "10:00",
    classes: ["1APIC-5", "1APIC-7"],
    room: "S10",
    type: "support",
  },
  {
    day: 1,
    time: "10:00",
    endTime: "11:00",
    classes: ["2APIC-4", "2APIC-1"],
    room: "S18",
    type: "support",
  },
  {
    day: 1,
    time: "11:00",
    endTime: "12:00",
    classes: ["2APIC-5"],
    room: "S10",
    type: "support",
  },
  {
    day: 2,
    time: "08:00",
    endTime: "09:00",
    classes: ["2APIC-7"],
    room: "S18",
  },
  {
    day: 2,
    time: "09:00",
    endTime: "10:00",
    classes: ["1APIC-5"],
    room: "S18",
  },
  {
    day: 2,
    time: "10:00",
    endTime: "11:00",
    classes: ["2APIC-5"],
    room: "S18",
  },
  {
    day: 2,
    time: "11:00",
    endTime: "12:00",
    classes: ["2APIC-8"],
    room: "S18",
  },
  {
    day: 3,
    time: "14:00",
    endTime: "15:00",
    classes: ["2APIC-6"],
    room: "S18",
  },
  {
    day: 3,
    time: "15:00",
    endTime: "16:00",
    classes: ["2APIC-4"],
    room: "S18",
  },
  {
    day: 3,
    time: "16:00",
    endTime: "17:00",
    classes: ["2APIC-5"],
    room: "S18",
  },
  {
    day: 3,
    time: "17:00",
    endTime: "18:00",
    classes: ["2APIC-8"],
    room: "S18",
  },
  {
    day: 4,
    time: "09:00",
    endTime: "10:00",
    classes: ["1APIC-6"],
    room: "S18",
  },
  {
    day: 4,
    time: "10:00",
    endTime: "11:00",
    classes: ["1APIC-4"],
    room: "S18",
  },
  {
    day: 4,
    time: "11:00",
    endTime: "12:00",
    classes: ["2APIC-4"],
    room: "S18",
  },
  {
    day: 5,
    time: "08:00",
    endTime: "09:00",
    classes: ["2APIC-7"],
    room: "S18",
  },
  {
    day: 5,
    time: "09:00",
    endTime: "10:00",
    classes: ["1APIC-5"],
    room: "S18",
  },
  {
    day: 5,
    time: "10:00",
    endTime: "11:00",
    classes: ["1APIC-4"],
    room: "S18",
  },
  {
    day: 5,
    time: "11:00",
    endTime: "12:00",
    classes: ["1APIC-6"],
    room: "S18",
  },
];

function configureWeeklyTimetable() {
  if (state.weeklyTimetableVersion >= 1) return;
  const findOrCreate = (name) => {
    let item = state.classes.find((c) => classCode(c.name) === classCode(name));
    if (!item) {
      item = {
        id: crypto.randomUUID(),
        name,
        students: [],
        simple: true,
        supportOnly: name === "1APIC-7",
        templates: {},
        importedSemesters: {},
      };
      state.classes.push(item);
    }
    return item;
  };
  for (const spec of teacherTimetable) {
    const ids = spec.classes.map((name) => findOrCreate(name).id);
    const matchesSlot = (lesson) =>
      +lesson.day === spec.day && lesson.time === spec.time;
    let existing = state.lessons.find(
      (lesson) =>
        matchesSlot(lesson) &&
        lessonClassIds(lesson).length === ids.length &&
        ids.every((id) => lessonClassIds(lesson).includes(id)),
    );
    // A session already entered for one of the two shared classes keeps its ID.
    if (!existing)
      existing = state.lessons.find(
        (lesson) =>
          matchesSlot(lesson) &&
          lessonClassIds(lesson).every((id) => ids.includes(id)),
      );
    const type = spec.type || "regular";
    const data = {
      day: String(spec.day),
      time: spec.time,
      endTime: spec.endTime,
      classId: ids[0],
      classIds: ids,
      attendanceClassIds: ids,
      room: spec.room,
      type,
      title:
        type === "support"
          ? "دعم مدرسي / Soutien scolaire"
          : existing?.title || "الفيزياء والكيمياء / Physique & Chimie",
    };
    if (existing) Object.assign(existing, data);
    else state.lessons.push({ id: crypto.randomUUID(), ...data });
  }
  state.weeklyTimetableVersion = 1;
  save();
}
