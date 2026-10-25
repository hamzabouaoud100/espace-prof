// The teacher chooses freely; suggestions never depend on marks.
function remarkSuggestions() {
  return {
    options: [
      ["عمل ممتاز، واصل التألق.", "Excellent travail, continuez ainsi."],
      [
        "عمل جيد جداً، واصل مجهوداتك.",
        "Très bon travail, poursuivez vos efforts.",
      ],
      [
        "عمل جيد، واصل على هذا المنوال.",
        "Bon travail, continuez sur cette voie.",
      ],
      [
        "نتائج مستحسنة، مع إمكانية تحقيق الأفضل.",
        "Résultats assez satisfaisants, vous pouvez encore progresser.",
      ],
      [
        "نتائج مقبولة، تحتاج إلى مزيد من العمل.",
        "Résultats acceptables, davantage de travail est nécessaire.",
      ],
      ["تحسن ملحوظ، واصل المثابرة.", "Des progrès visibles, persévérez."],
      ["يحتاج إلى مراجعة الدروس بانتظام.", "Revoir les leçons régulièrement."],
      [
        "يحتاج إلى التدرب أكثر على حل التمارين.",
        "S’entraîner davantage à résoudre les exercices.",
      ],
      ["يحتاج إلى تعزيز المفاهيم الأساسية.", "Consolider les notions de base."],
      [
        "يُنصح بمزيد من التركيز أثناء الحصة.",
        "Davantage de concentration en classe est recommandé.",
      ],
      [
        "يُشجّع على المشاركة وطرح الأسئلة.",
        "La participation et les questions sont encouragées.",
      ],
      [
        "يحتاج إلى إنجاز واجباته بانتظام.",
        "Effectuer les devoirs régulièrement.",
      ],
      [
        "يمكنه التقدم بالعمل المنتظم والاستفادة من الدعم.",
        "Un travail régulier et le soutien scolaire peuvent favoriser les progrès.",
      ],
    ].map(([ar, fr]) => t(ar, fr)),
  };
}

function remarkPicker(student) {
  return `<button type="button" class="remark-button" onclick="openRemarkSuggestions('${student.id}')">${t("اقتراحات", "Suggestions")}</button>`;
}

function openRemarkSuggestions(id) {
  const dialog = document.getElementById("modal");
  dialog.innerHTML = `<div class="suggestion-dialog-heading"><h2 id="remark-dialog-title">${t("اقتراحات", "Suggestions")}</h2><button type="button" class="quiet" aria-label="${t("إغلاق", "Fermer")}" onclick="document.querySelector('#modal').close()">×</button></div><div class="remark-options">${remarkSuggestions()
    .options.map(
      (text, index) =>
        `<button type="button" onclick="applySuggestedRemark('${id}',${index});document.querySelector('#modal').close()">${esc(text)}</button>`,
    )
    .join("")}</div>`;
  dialog.setAttribute("aria-labelledby", "remark-dialog-title");
  dialog.showModal();
}

function applySuggestedRemark(id, index) {
  if (index === "") return;
  const student = currentClass()?.students.find((item) => item.id === id);
  if (!student) return;
  const text = remarkSuggestions().options[Number(index)];
  if (!text) return;
  const input = document.getElementById(`remark-input-${id}`);
  if (input) input.value = text;
  grade(id, 4, { value: text });
}
