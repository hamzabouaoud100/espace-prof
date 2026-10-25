const SPREADSHEET_NS =
  "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
function readCellValue(doc, ref, strings) {
  const c = Array.from(doc.getElementsByTagNameNS(SPREADSHEET_NS, "c")).find(
    (c) => c.getAttribute("r") === ref,
  );
  if (!c) return "";
  const v =
    c.getElementsByTagNameNS(SPREADSHEET_NS, "v")[0]?.textContent ??
    c.getElementsByTagNameNS(SPREADSHEET_NS, "t")[0]?.textContent ??
    "";
  return c.getAttribute("t") === "s" ? strings[+v] : v;
}
async function readTemplate(data) {
  const z = await JSZip.loadAsync(data),
    parse = (x) => new DOMParser().parseFromString(x, "application/xml"),
    shared = z.file("xl/sharedStrings.xml"),
    strings = shared
      ? Array.from(
          parse(await shared.async("string")).getElementsByTagNameNS(
            SPREADSHEET_NS,
            "si",
          ),
        ).map((e) =>
          Array.from(e.getElementsByTagNameNS(SPREADSHEET_NS, "t"))
            .map((e) => e.textContent)
            .join(""),
        )
      : [],
    path = "xl/worksheets/sheet1.xml",
    doc = parse(await z.file(path).async("string"));
  if (readCellValue(doc, "G16", strings) !== "الفرض الأول")
    return readSimple(doc, strings, path);
  const students = [];
  for (let r = 18; r <= 200; r++) {
    const name = readCellValue(doc, "D" + r, strings),
      id = readCellValue(doc, "C" + r, strings);
    if (name && id)
      students.push({
        name,
        id,
        row: r,
        grades: ["G", "I", "K", "M", "O"].map((c) =>
          readCellValue(doc, c + r, strings),
        ),
      });
  }
  if (!students.length)
    throw Error(t("لم يتم العثور على تلاميذ في الملف", "Aucun élève trouvé"));
  return {
    id: crypto.randomUUID(),
    name: readCellValue(doc, "I9", strings) || "Classe",
    term: readCellValue(doc, "D11", strings),
    students,
    template: data,
    path,
  };
}
$("#file").onchange = async (e) => {
  try {
    if (!e.target.files[0]) return;
    const importingFrom = page;
    toast(t("جارٍ قراءة الملف…", "Lecture du fichier…"));
    const data = await e.target.files[0].arrayBuffer(),
      base64 = await new Promise((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result.split(",")[1]);
        r.readAsDataURL(new Blob([data]));
      }),
      c = await readTemplate(data);
    c.template = base64;
    acceptSemesterImport(c);
    selected = state.classes.find(
      (x) => classCode(x.name) === classCode(c.name),
    ).id;
    save();
    go(
      importingFrom === "classes"
        ? "classes"
        : currentClass().supportOnly
          ? "attendance"
          : "grades",
    );
    toast(t("تم استيراد القسم بنجاح", "Classe importée avec succès"));
  } catch (err) {
    toast(err.message);
  } finally {
    e.target.value = "";
  }
};
async function exportExcel() {
  try {
    if (!currentClass())
      return toast(t("استورد ملفاً أولاً", "Importez un fichier d’abord"));
    const c = currentClass();
    if (c.supportOnly) return toast(supportOnlyMessage());
    if (c.simple || !c.templates?.[state.semester]) return exportSimple(c);
    const template = c.templates[state.semester];
    const z = await JSZip.loadAsync(template, { base64: true }),
      doc = new DOMParser().parseFromString(
        await z.file(c.path).async("string"),
        "application/xml",
      ),
      cells = Array.from(doc.getElementsByTagNameNS(SPREADSHEET_NS, "c"));
    for (const s of c.students) {
      ["G", "I", "K", "M", "O"].forEach((col, i) => {
        const cell = cells.find(
          (x) =>
            x.getAttribute("r") ===
            col + (s.semesterRows?.[state.semester] || s.row),
        );
        if (!cell) throw Error("Missing template cell");
        const val = semesterGrades(s)[i];
        cell.replaceChildren();
        cell.removeAttribute("t");
        if (val !== "") {
          if (i === 4) {
            cell.setAttribute("t", "inlineStr");
            const is = doc.createElementNS(SPREADSHEET_NS, "x:is"),
              txt = doc.createElementNS(SPREADSHEET_NS, "x:t");
            txt.textContent = val;
            is.append(txt);
            cell.append(is);
          } else {
            const v = doc.createElementNS(SPREADSHEET_NS, "x:v");
            v.textContent = String(+val);
            cell.append(v);
          }
        }
      });
    }
    z.file(c.path, new XMLSerializer().serializeToString(doc));
    download(
      await z.generateAsync({ type: "blob" }),
      `notes_${c.name}_S${state.semester}.xlsx`,
    );
    toast(t("تم تصدير الملف", "Fichier exporté"));
  } catch (e) {
    toast(e.message);
  }
}
