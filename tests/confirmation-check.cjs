const fs = require("node:fs"),
  vm = require("node:vm"),
  assert = require("node:assert/strict");
const c = {
  state: { semester: "1", confirmations: {} },
  currentClass: () => ({ id: "c", students: [] }),
  attendanceKey: () => "c|date|lesson",
  t: (a, b) => b,
  save: () => {},
  canRecordAttendance: () => true,
  toast: () => {},
  $: () => null,
};
vm.createContext(c);
vm.runInContext(fs.readFileSync("dist/confirmations.js", "utf8"), c);
vm.runInContext("confirmEntries('attendance');confirmEntries('grades')", c);
assert(c.state.confirmations.attendance["c|date|lesson"]);
assert(c.state.confirmations.grades["c|1"]);
vm.runInContext("invalidateConfirmation('grades')", c);
assert(!c.state.confirmations.grades["c|1"]);
assert(c.state.confirmations.attendance["c|date|lesson"]);
c.save = () => {
  throw Error("Storage full");
};
vm.runInContext("confirmEntries('grades')", c);
assert(!c.state.confirmations.grades["c|1"]);
console.log(
  "Passed: confirmation saving, invalidation, separate records, and storage failure handling.",
);
