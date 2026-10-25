const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const student = {
  id: "s1",
  name: "Student",
  marks: {
    1: ["", "", "", "", "Original comment"],
    2: ["", "", "", "", "Semester 2 comment"],
  },
};
let semester = "1",
  french = false;
const input = { value: "" };
const context = vm.createContext({
  semesterGrades: (item) => item.marks[semester],
  t: (ar, fr) => (french ? fr : ar),
  esc: (text) => String(text),
  currentClass: () => ({ students: [student] }),
  document: { getElementById: () => input },
  grade: (id, index, element) => {
    student.marks[semester][index] = element.value;
  },
});
vm.runInContext(fs.readFileSync("dist/remarks.js", "utf8"), context);
const suggest = () => context.remarkSuggestions(student);
const initialSuggestions = Array.from(suggest().options);
assert(initialSuggestions.length > 5);
assert.equal(student.marks["1"][4], "Original comment");
for (const mark of ["0", "5", "10", "15", "20", ""]) {
  student.marks["1"][0] = mark;
  assert.deepEqual(Array.from(suggest().options), initialSuggestions);
}
french = true;
assert(suggest().options[0].startsWith("Excellent travail"));
context.applySuggestedRemark("s1", "0");
assert.equal(input.value, student.marks["1"][4]);
assert.equal(student.marks["2"][4], "Semester 2 comment");
semester = "2";
assert.equal(suggest().options.length, initialSuggestions.length);
console.log(
  "Passed: suggestions available without marks, unchanged across scores, manual selection, French labels and semester isolation.",
);
