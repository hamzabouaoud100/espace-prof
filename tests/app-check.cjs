const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const elements = new Map();
const element = (id) => {
  if (!elements.has(id))
    elements.set(id, {
      innerHTML: "",
      textContent: "",
      style: {},
      setAttribute(name, value) {
        this[name] = value;
      },
      showModal() {
        this.open = true;
      },
      close() {
        this.open = false;
      },
      scrollIntoView() {},
    });
  return elements.get(id);
};
const initial = {
  classes: [
    {
      id: "class-1",
      name: "1APIC-4",
      simple: true,
      term: "الدورة الأولى",
      students: [
        {
          id: "student-1",
          name: "Élève <test>",
          grades: ["12", "", "", "", ""],
          row: 2,
        },
      ],
    },
  ],
  lessons: [],
  attendance: { previousSession: { "student-1": true } },
  confirmations: {
    attendance: { previousSession: "2026-10-25" },
    grades: { existing: "2026-10-25" },
  },
  fr: false,
  semester: "1",
};
let stored = JSON.stringify(initial);
const context = vm.createContext({
  document: {
    querySelector: element,
    getElementById: element,
    documentElement: {},
    body: { classList: { toggle() {} } },
  },
  localStorage: {
    getItem: () => stored,
    setItem: (_, value) => {
      stored = value;
    },
  },
  setTimeout() {},
  console,
  crypto: require("node:crypto"),
});
for (const file of [
  "support",
  "schedule",
  "semesters",
  "simple",
  "state",
  "ui",
  "confirmations",
  "files",
  "attendance-report",
  "filters",
  "workspace",
  "remarks",
  "app",
]) {
  vm.runInContext(fs.readFileSync(`dist/${file}.js`, "utf8"), context, {
    filename: file,
  });
}
assert(element("#content").innerHTML.includes("مرحباً أستاذ"));
vm.runInContext("toggleSidebar()", context);
assert.equal(JSON.parse(stored).sidebarClosed, true);
assert.equal(element("sidebar-toggle")["aria-expanded"], "false");
vm.runInContext("toggleSidebar()", context);
assert.equal(JSON.parse(stored).sidebarClosed, false);
assert.equal(element("sidebar-toggle")["aria-expanded"], "true");

assert.deepEqual(JSON.parse(stored).attendance, {});
vm.runInContext(
  `
  const requested=state.classes.find(c=>c.name==='2APIC-1');
  if(!requested||requested.students.length)throw Error('Requested empty class missing');
  const originalId=requested.id;
  ensureRequestedClasses();
  if(state.classes.filter(c=>c.name==='2APIC-1').length!==1||requested.id!==originalId)throw Error('Class duplicated');
  const two= {id:'sort-2',name:'2APIC-2',students:[]},ten={id:'sort-10',name:'2APIC-10',students:[]};
  state.classes.push(ten,two);sortClasses();
  if(state.classes.indexOf(two)>state.classes.indexOf(ten))throw Error('Class numbers sorted alphabetically instead of numerically');
  state.classes=state.classes.filter(c=>c.id!=='sort-2'&&c.id!=='sort-10');
`,
  context,
);

assert(!JSON.parse(stored).confirmations.attendance);
assert(JSON.parse(stored).confirmations.grades.existing);

assert.equal((element("#nav").innerHTML.match(/onclick="go/g) || []).length, 4);
assert(!element("#nav").innerHTML.includes("go('calendar')"));
vm.runInContext("go('classes')", context);
assert(!element("#content").innerHTML.includes("Élève &lt;test&gt;"));
vm.runInContext("showResults()", context);
assert(element("#content").innerHTML.includes("نتيجة البحث"));
assert(element("#content").innerHTML.includes("Élève &lt;test&gt;"));
vm.runInContext("query='missing';showResults()", context);
assert(element("#content").innerHTML.includes("لا توجد نتائج"));
vm.runInContext("go('home')", context);
assert(element("#content").innerHTML.includes("حصصي الأسبوعية"));
assert.equal(
  (element("#content").innerHTML.match(/class="schedule-day-block"/g) || [])
    .length,
  5,
);
assert(!element("#content").innerHTML.includes('class="weekday-tabs"'));

vm.runInContext("go('grades')", context);
assert(element("#content").innerHTML.includes("اختر القسم"));
assert(!element("#content").innerHTML.includes("Élève &lt;test&gt;"));
assert(!element("#content").innerHTML.includes("تأكيد النقط"));
vm.runInContext("selectClass('class-1')", context);
assert(!element("#content").innerHTML.includes("Élève &lt;test&gt;"));
vm.runInContext("showResults()", context);
assert(element("#content").innerHTML.includes("تأكيد النقط"));
assert(element("#content").innerHTML.includes("Élève &lt;test&gt;"));
vm.runInContext("go('home');go('grades')", context);
assert(!element("#content").innerHTML.includes("Élève &lt;test&gt;"));
vm.runInContext("selectClass('class-1')", context);

vm.runInContext(
  "state.semester='2';grade('student-1',0,{value:'19'});state.semester='1';render()",
  context,
);
assert.equal(
  JSON.parse(stored).classes[0].students[0].semesterGrades["1"][0],
  "12",
);
assert.equal(
  JSON.parse(stored).classes[0].students[0].semesterGrades["2"][0],
  "19",
);
vm.runInContext("query='no match';showResults()", context);
assert(element("#content").innerHTML.includes("لا توجد نتائج"));
vm.runInContext(
  "go('attendance');showResults();mark('student-1',true);confirmEntries('attendance')",
  context,
);
assert(element("#content").innerHTML.includes("تأكيد الغياب"));
assert(Object.values(JSON.parse(stored).attendance)[0]["student-1"]);
vm.runInContext("applyRequestedAttendanceReset()", context);
assert(Object.values(JSON.parse(stored).attendance)[0]["student-1"]);

for (const page of ["home", "attendance", "grades", "classes"]) {
  vm.runInContext(`state.fr=true;go('${page}')`, context);
  assert.equal(context.document.documentElement.dir, "ltr");
  assert(element("#content").innerHTML.length > 100);
}

for (const section of ["classes", "attendance", "grades"]) {
  vm.runInContext(`go('${section}');selectClass('class-1')`, context);
  assert(!element("#content").innerHTML.includes("Élève &lt;test&gt;"));
  vm.runInContext("showResults()", context);
  assert(element("#content").innerHTML.includes("Élève &lt;test&gt;"));
  vm.runInContext("setFilterQuery('not found')", context);
  assert.equal(element("#results-output").hidden, true);
  vm.runInContext("showResults()", context);
  assert(!element("#content").innerHTML.includes("Élève &lt;test&gt;"));
  vm.runInContext(
    "setFilterQuery('');showResults();chooseSemester('2')",
    context,
  );
  assert(!element("#content").innerHTML.includes("Élève &lt;test&gt;"));
}
vm.runInContext(
  "go('attendance');selectClass('class-1');showResults();setAttendanceFilter('day','2026-10-26')",
  context,
);
assert(!element("#content").innerHTML.includes("Élève &lt;test&gt;"));
console.log(
  "Passed: results require explicit confirmation in all three sections and reset after class, semester, date, search or navigation changes.",
);

context.FormData = class {
  constructor(form) {
    return Object.entries(form.fields);
  }
};
element("lesson-class").value = "class-1";
element("lesson-second-class").value = "";
element("lesson-second-class").options = [
  { value: "" },
  { value: "class-1" },
  { value: "other" },
];
element("#modal").showModal = function () {
  this.open = true;
};
element("#modal").close = function () {
  this.open = false;
};
element("lesson-error").scrollIntoView = () => {};
vm.runInContext(
  `
  go('home');selected='class-1';
  const originalLessonIds=state.lessons.map(item=>item.id);
  for(const time of ['10:00','11:00']) {
    addLesson();
    document.querySelector('#lessonForm').onsubmit({preventDefault(){},target:{fields:{classId:'class-1',secondClassId:'',day:'1',time,title:'Test lesson',room:'S18',endTime:''}}});
  }
  if(state.lessons.filter(item=>+item.day===1).length<3)throw Error('Third Monday session did not save');
  state.lessons=state.lessons.filter(item=>originalLessonIds.includes(item.id));save();
`,
  context,
);
console.log("Passed: submitting the lesson form adds a third Monday session.");
// A shared hour must keep attendance and confirmations separate per class.
vm.runInContext(
  `
  state.classes.push({id:'class-2',name:'1APIC-5',simple:true,students:[{id:'student-1',name:'Second student',semesterGrades:{'1':['','','','',''],'2':['','','','','']}}]});
  const shared = createLesson({classId:'class-1',secondClassId:'class-2',day:'1',time:'10:00',title:'Electricity',room:'Lab'});
  state.lessons.push(shared);
  openLesson(shared.id,'class-1');
  if(!resultsConfirmed.attendance||!attendance().includes('Second student')&&selected!=='class-1')throw Error('Session did not open attendance directly');
  if(!document.querySelector('#content').innerHTML.includes('Élève &lt;test&gt;'))throw Error('Attendance roster needs an extra click');
  mark('student-1',true);confirmEntries('attendance');
  const firstKey=attendanceKey();
  selectClass('class-2');
  if(session!==shared.id)throw Error('Switching classes lost the shared session');
  if(absent(currentClass().students[0]))throw Error('Attendance leaked to the second class');
  confirmEntries('attendance');
  if(!state.confirmations.attendance[firstKey]||!state.confirmations.attendance[attendanceKey()])throw Error('Class confirmation missing');
  if(!weeklySchedule().includes('1APIC-4 + 1APIC-5'))throw Error('Calendar does not display both classes');
  showResults();if(!attendance().includes('Séance partagée'))throw Error('Shared-class attendance controls missing');
  if(lessonClassIds({classId:'class-1'})[0]!=='class-1')throw Error('Legacy lesson compatibility broken');
`,
  context,
);
assert.throws(
  () =>
    vm.runInContext(
      "createLesson({classId:'class-1',secondClassId:'class-1'})",
      context,
    ),
  /différentes/,
);
vm.runInContext(
  `
  const monday=state.lessons.find(l=>l.type==='support'&&l.time==='08:00');
  if(!monday||monday.endTime!=='10:00'||monday.room!=='S10')throw Error('Monday support schedule missing');
  const supportGroup=state.classes.find(c=>c.supportOnly);
  const regularGroup=state.classes.find(c=>c.id===monday.classId);
  if(regularGroup.supportOnly)throw Error('Regular class assessments disabled');
  const stableSupportId=supportGroup.id;
  acceptSemesterImport({id:'imported',name:'1APIC-7',simple:true,term:'Current',students:[{id:'support-student',name:'Support student',row:2,grades:['17','','','','']}]});
  if(supportGroup.id!==stableSupportId||!supportGroup.supportOnly||supportGroup.students.length!==1)throw Error('Roster import lost support settings');
  openLesson(monday.id,supportGroup.id);
  if(selected!==supportGroup.id)throw Error('Support attendance selected wrong group');
  if(!lessonAttendanceClassIds(monday).includes(selected)||!lessonAttendanceClassIds(monday).includes(regularGroup.id))throw Error('Support attendance permission incorrect');
  const supportGradeBefore=semesterGrades(supportGroup.students[0])[0];
  grade('support-student',0,{value:'20'});
  if(semesterGrades(supportGroup.students[0])[0]!==supportGradeBefore)throw Error('Support-only group accepted exam marks');
  if(grades().includes('Confirmer les notes'))throw Error('Support group displays exam controls');
  mark('support-student',true);confirmEntries('attendance');
  if(!absent(supportGroup.students[0]))throw Error('Support attendance not saved');
  const count=state.lessons.length;
  state.mondaySupportVersion=1;monday.attendanceClassIds=[supportGroup.id];
  configureMondaySupport();
  if(state.lessons.length!==count)throw Error('Monday session duplicated');
  if(!lessonAttendanceClassIds(monday).includes(regularGroup.id))throw Error('Existing schedule was not migrated');
  selectClass(regularGroup.id);
  if(session!==monday.id||!canRecordAttendance())throw Error('Cannot take 1/5 attendance in support session');
  if(absent(currentClass().students[0]||{id:'support-student'}))throw Error('1/7 attendance leaked into 1/5');
  configureMondaySupport();if(state.lessons.length!==count)throw Error('Schedule duplicated after reload');
  supportGroup.name='1/7';const previousAttendance=JSON.stringify(state.attendance);
  configureMondaySupport();
  if(supportGroup.name!=='1APIC-7'||supportGroup.id!==stableSupportId||!supportGroup.supportOnly)throw Error('Support rename lost identity or settings');
  if(JSON.stringify(state.attendance)!==previousAttendance||state.lessons.length!==count)throw Error('Rename modified attendance or schedule');
`,
  context,
);
console.log(
  "Passed: Monday 08:00–10:00 S10 preset, attendance for 1/5 and 1/7, roster import, no exams, regular class preserved and repeat-load safety.",
);
console.log(
  "Passed: shared class session, timetable labels, separate attendance/confirmations, duplicate prevention and legacy lessons.",
);
console.log(
  "Passed: all dashboard views, Arabic/French direction, escaped student names, search, semester edits and attendance confirmation.",
);

vm.runInContext(
  `
  go('attendance');selectClass('class-1');showResults();
  const resetKey=attendanceKey();mark('student-1',true);confirmEntries('attendance');
  state.attendance['other-session']={'other-student':true};
  const marksBeforeReset=JSON.stringify(state.classes.map(c=>c.students.map(s=>s.semesterGrades)));
  if(!resetAttendance())throw Error('Attendance reset failed');
  if(state.attendance[resetKey]||state.confirmations.attendance[resetKey])throw Error('Current attendance or confirmation not cleared');
  if(!state.attendance['other-session']['other-student'])throw Error('Reset cleared another session');
  if(JSON.stringify(state.classes.map(c=>c.students.map(s=>s.semesterGrades)))!==marksBeforeReset)throw Error('Reset modified marks');
  state.attendance[resetKey]={'student-1':true};
  state.confirmations.attendance[resetKey]='original-confirmation';
  const originalSetItem=localStorage.setItem;
  localStorage.setItem=()=>{throw Error('Storage failure')};
  if(resetAttendance())throw Error('Failed save incorrectly reported success');
  if(!state.attendance[resetKey]['student-1']||state.confirmations.attendance[resetKey]!=='original-confirmation')throw Error('Failed reset lost records');
  localStorage.setItem=originalSetItem;
`,
  context,
);
console.log(
  "Passed: reset affects only the selected class/session/date, preserves marks, and restores data if saving fails.",
);
