function readSimple(doc, strings, path) {
  const rows = Array.from(doc.getElementsByTagNameNS(SPREADSHEET_NS, "row")),
    header = rows.find((r) =>
      Array.from(r.getElementsByTagNameNS(SPREADSHEET_NS, "c")).some((c) =>
        readCellValue(doc, c.getAttribute("r"), strings).trim(),
      ),
    );
  if (!header) throw Error(t("الملف فارغ", "Le fichier est vide"));
  const hr = +header.getAttribute("r"),
    nameHeader = readCellValue(doc, "A" + hr, strings)
      .trim()
      .toLowerCase();
  if (
    ![
      "name",
      "student name",
      "nom",
      "nom complet",
      "nom de l’élève",
      "nom de l'élève",
      "الاسم",
      "اسم التلميذ",
      "الاسم الكامل",
      "إسم التلميذ",
    ].includes(nameHeader)
  )
    throw Error(
      t(
        "يجب أن يكون عنوان العمود A: الاسم أو Nom. تليه أعمدة النقط.",
        "La colonne A doit porter le titre Nom ou الاسم, suivie des notes.",
      ),
    );
  const students = [];
  for (const row of rows) {
    const r = +row.getAttribute("r");
    if (r <= hr) continue;
    const name = readCellValue(doc, "A" + r, strings).trim();
    if (!name) continue;
    const grades = ["B", "C", "D", "E"].map((col) =>
      readCellValue(doc, col + r, strings)
        .trim()
        .replace(",", "."),
    );
    for (const g of grades)
      if (g !== "" && (!Number.isFinite(+g) || +g < 0 || +g > 20))
        throw Error(
          t("نقطة غير صالحة في السطر ", "Note invalide à la ligne ") + r,
        );
    students.push({
      id: crypto.randomUUID(),
      name,
      row: r,
      grades: [...grades, ""],
    });
  }
  if (!students.length) throw Error(t("لا يوجد تلاميذ", "Aucun élève trouvé"));
  const name = prompt(
    t("اسم القسم (مثال: 1APIC-4)", "Nom de la classe (ex. 1APIC-4)"),
  )?.trim();
  if (!name) throw Error(t("تم إلغاء الاستيراد", "Import annulé"));
  return {
    id: crypto.randomUUID(),
    name,
    term: t("الدورة الحالية", "Période actuelle"),
    students,
    path,
    simple: true,
  };
}
async function exportSimple(c) {
  const xml = (s) => esc(s),
    z = new JSZip(),
    headers = state.fr
      ? ["Nom", "Contrôle 1", "Contrôle 2", "Contrôle 3", "Activités intégrées"]
      : ["الاسم", "الفرض 1", "الفرض 2", "الفرض 3", "الأنشطة المندمجة"];
  const rows = [
    headers,
    ...c.students.map((s) => [s.name, ...semesterGrades(s).slice(0, 4)]),
  ];
  z.file(
    "[Content_Types].xml",
    '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
  );
  z.file(
    "_rels/.rels",
    '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
  );
  z.file(
    "xl/workbook.xml",
    `<?xml version="1.0"?><workbook xmlns="${SPREADSHEET_NS}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Notes" sheetId="1" r:id="rId1"/></sheets></workbook>`,
  );
  z.file(
    "xl/_rels/workbook.xml.rels",
    '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
  );
  z.file(
    "xl/worksheets/sheet1.xml",
    `<?xml version="1.0"?><worksheet xmlns="${SPREADSHEET_NS}"><sheetViews><sheetView workbookViewId="0" rightToLeft="${state.fr ? 0 : 1}"/></sheetViews><cols><col min="1" max="1" width="32" customWidth="1"/><col min="2" max="5" width="22" customWidth="1"/></cols><sheetData>${rows.map((row, r) => `<row r="${r + 1}">${row.map((v, i) => `<c r="${String.fromCharCode(65 + i)}${r + 1}" ${r > 0 && i > 0 && v !== "" ? "" : 't="inlineStr"'}>${r > 0 && i > 0 && v !== "" ? `<v>${Number(v)}</v>` : `<is><t>${xml(v)}</t></is>`}</c>`).join("")}</row>`).join("")}</sheetData></worksheet>`,
  );
  download(
    await z.generateAsync({
      type: "blob",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `notes_${c.name}_S${state.semester}.xlsx`,
  );
  toast(t("تم تصدير الأسماء والنقط", "Noms et notes exportés"));
}
