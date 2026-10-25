// Results are shown only for filters the teacher has explicitly confirmed.
const resultsConfirmed = { classes: false, attendance: false, grades: false };
function viewResultsButton() {
  return `<button type="button" class="primary" onclick="showResults()">${t("عرض النتائج", "Afficher les résultats")} ↗</button>`;
}
function resultsContainer(content) {
  return `<div id="results-pending" class="panel results-pending" ${content ? "hidden" : ""}>${icon("grades")}<p>${t("حدّد معايير البحث، ثم اضغط عرض النتائج.", "Définissez vos critères, puis cliquez sur Afficher les résultats.")}</p></div>${content ? `<div id="results-output">${content}</div>` : ""}`;
}
function showResults() {
  if (!currentClass())
    return toast(t("اختر القسم أولاً.", "Choisissez d’abord une classe."));
  if (page === "attendance" && !day)
    return toast(t("اختر التاريخ أولاً.", "Choisissez d’abord une date."));
  resultsConfirmed[page] = true;
  render();
}
function resetResults(section = page) {
  if (Object.hasOwn(resultsConfirmed, section))
    resultsConfirmed[section] = false;
}
function setFilterQuery(value) {
  query = value;
  resetResults();
  const output = $("#results-output"),
    pending = $("#results-pending");
  if (output) output.hidden = true;
  if (pending) pending.hidden = false;
}
function setAttendanceFilter(field, value) {
  if (field === "day") day = value;
  else if (field === "session") session = value;
  resetResults();
  render();
}
function chooseSemester(value) {
  state.semester = value;
  resetResults();
  save();
  render();
}
