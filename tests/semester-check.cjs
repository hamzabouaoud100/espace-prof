const vm = require("node:vm"),
  fs = require("node:fs"),
  assert = require("node:assert/strict");
const ctx = vm.createContext({
  state: { semester: "1", classes: [] },
  t: (a, f) => f,
});
vm.runInContext(fs.readFileSync("dist/support.js", "utf8"), ctx);
vm.runInContext(fs.readFileSync("dist/semesters.js", "utf8"), ctx);
vm.runInContext(
  `
 const old={name:'A',term:'الدورة الأولى',template:'first',students:[{id:'1',name:'Ali',row:18,grades:['12','','','','Good']}]};
 normalizeSemesters(old);state.classes.push(old);
 semesterGrades(old.students[0])[0]='15';state.semester='2';
 if(semesterGrades(old.students[0])[0]!=='')throw Error('Semester 2 was not empty');
 acceptSemesterImport({name:'A',term:'الدورة الثانية',template:'second',students:[{id:'1',name:'Ali',row:20,grades:['18','','','','Excellent']}]});
 if(state.classes.length!==1)throw Error('Duplicated roster');
 if(semesterGrades(old.students[0])[0]!=='18')throw Error('Semester 2 import failed');
 if(old.students[0].semesterRows['2']!==20)throw Error('Template row mapping lost');
 state.semester='1';if(semesterGrades(old.students[0])[0]!=='15')throw Error('Semester 1 overwritten');
 normalizeSemesters(old);if(old.templates['2']!=='second'||old.students[0].semesterRows['2']!==20)throw Error('Reopening lost semester 2 export template');if(old.students[0].semesterGrades['2'][4]!=='Excellent')throw Error('Migration overwrote comments');
 let rejected=false;try{acceptSemesterImport({name:'A',term:'الدورة الثانية',students:[]})}catch(e){rejected=true}if(!rejected)throw Error('Duplicate import allowed');
 `,
  ctx,
);
console.log(
  "Passed: migration, independent marks/comments, shared roster, semester import, template row mapping, duplicate protection.",
);
