function confirmationKey(kind) {
  return kind === "attendance"
    ? attendanceKey()
    : [currentClass()?.id, state.semester].join("|");
}
function confirmationStatus(kind) {
  const stamp = state.confirmations?.[kind]?.[confirmationKey(kind)];
  return `<div class="confirmation-status" id="confirmation-status" role="status">${stamp ? "✓ " + t("تم التأكيد والحفظ", "Confirmé et enregistré") + " · " + new Date(stamp).toLocaleString(state.fr ? "fr-MA" : "ar-MA") : t("بانتظار المراجعة والتأكيد", "En attente de vérification et de confirmation")}</div>`;
}
function invalidateConfirmation(kind) {
  if (state.confirmations?.[kind])
    delete state.confirmations[kind][confirmationKey(kind)];
  const el = $("#confirmation-status");
  if (el) el.outerHTML = confirmationStatus(kind);
}
function confirmEntries(kind) {
  if (kind === "grades" && currentClass()?.supportOnly)
    return toast(supportOnlyMessage());
  if (kind === "attendance" && !canRecordAttendance())
    return toast(
      t(
        "هذا القسم غير مشمول بتسجيل الحضور لهذه الحصة.",
        "Cette classe ne fait pas l’objet d’un appel pour cette séance.",
      ),
    );
  if (!currentClass())
    return toast(t("اختر قسماً أولاً", "Choisissez une classe"));
  if (
    kind === "grades" &&
    currentClass().students.some((s) =>
      semesterGrades(s)
        .slice(0, 4)
        .some((v) => v !== "" && (!Number.isFinite(+v) || +v < 0 || +v > 20)),
    )
  )
    return toast(
      t("يرجى تصحيح النقط: من 0 إلى 20", "Corrigez les notes : entre 0 et 20"),
    );
  const key = confirmationKey(kind),
    previous = state.confirmations?.[kind]?.[key];
  state.confirmations ??= {};
  state.confirmations[kind] ??= {};
  state.confirmations[kind][key] = new Date().toISOString();
  try {
    save();
  } catch (e) {
    if (previous) state.confirmations[kind][key] = previous;
    else delete state.confirmations[kind][key];
    return toast(
      t(
        "تعذر الحفظ. مساحة تخزين المتصفح قد تكون ممتلئة.",
        "Enregistrement impossible. Le stockage du navigateur est peut-être plein.",
      ),
    );
  }
  const el = $("#confirmation-status");
  if (el) el.outerHTML = confirmationStatus(kind);
  toast(
    kind === "attendance"
      ? t("تم تأكيد الغياب وحفظه بنجاح", "Présences confirmées et enregistrées")
      : t("تم تأكيد النقط وحفظها بنجاح", "Notes confirmées et enregistrées"),
  );
}

function requestAttendanceReset() {
  if (!currentClass() || !resultsConfirmed.attendance) return;
  const dialog = document.getElementById("modal");
  dialog.innerHTML = `<h2 id="attendance-reset-title">${t("مسح الغياب", "Réinitialiser les absences")}</h2><p>${t("سيُمسح الغياب المسجّل لهذا القسم في التاريخ والحصة المحددين فقط.", "Seules les absences de cette classe, à la date et pour la séance sélectionnées, seront effacées.")}</p><p><b>${esc(currentClass().name)} · ${esc(day)}</b></p><p id="attendance-reset-error" class="form-error" role="alert" hidden></p><div class="dialog-actions"><button type="button" class="danger-button" onclick="if(resetAttendance())document.querySelector('#modal').close()">${t("مسح الغياب", "Effacer les absences")}</button><button type="button" onclick="document.querySelector('#modal').close()">${t("إلغاء", "Annuler")}</button></div>`;
  dialog.setAttribute("aria-labelledby", "attendance-reset-title");
  dialog.showModal();
}

function resetAttendance() {
  if (!currentClass() || !canRecordAttendance()) return false;
  const key = attendanceKey();
  const previous = state.attendance[key];
  const confirmation = state.confirmations?.attendance?.[key];
  delete state.attendance[key];
  if (state.confirmations?.attendance)
    delete state.confirmations.attendance[key];
  try {
    save();
  } catch {
    if (previous !== undefined) state.attendance[key] = previous;
    if (confirmation !== undefined)
      state.confirmations.attendance[key] = confirmation;
    const error = document.getElementById("attendance-reset-error");
    if (error) {
      error.hidden = false;
      error.textContent = t(
        "تعذر حفظ التغييرات. لم يُمسح الغياب.",
        "Enregistrement impossible. Les absences ont été conservées.",
      );
    }
    return false;
  }
  render();
  toast(
    t(
      "تم مسح غياب هذه الحصة.",
      "Les absences de cette séance ont été effacées.",
    ),
  );
  return true;
}
