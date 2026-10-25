async function exportWord() {
  try {
    if (!currentClass())
      return toast(t("اختر قسماً أولاً", "Choisissez une classe"));
    if (!canRecordAttendance())
      return toast(
        t(
          "هذا القسم غير مشمول بتسجيل الحضور لهذه الحصة.",
          "Cette classe ne fait pas l’objet d’un appel pour cette séance.",
        ),
      );
    const d = window.docx;
    if (!d)
      throw Error(
        t(
          "مكتبة Word غير متاحة. تحقق من الاتصال.",
          "Bibliothèque Word indisponible. Vérifiez la connexion.",
        ),
      );
    const list = currentClass().students.filter(absent);
    const lesson = state.lessons.find((item) => item.id === session);
    const ltr = (value) => "\u200e" + String(value) + "\u200e";
    const para = (text, options = {}) => {
      const { runProperties = {}, ...paragraphOptions } = options;
      const parts = String(text)
        .split(/(\u200e[^\u200e]*\u200e)/g)
        .filter(Boolean);
      return new d.Paragraph({
        children: parts.map(
          (part) =>
            new d.TextRun({
              text: part.replace(/\u200e/g, ""),
              font: "Arial",
              size: 26,
              bold: true,
              color: "000000",
              rightToLeft: !part.startsWith("\u200e"),
              language: { value: "ar-MA", bidirectional: "ar-MA" },
              ...runProperties,
            }),
        ),
        bidirectional: true,
        alignment: d.AlignmentType.START,
        indent: { left: 0, right: 0 },
        spacing: { after: 180 },
        ...paragraphOptions,
      });
    };
    const rows = [
      ["الاسم الكامل", "الحالة"],
      ...list.map((student) => [student.name, "غائب"]),
    ];
    const timeText = lesson
      ? lesson.endTime
        ? "من " + ltr(lesson.time) + " إلى " + ltr(lesson.endTime)
        : "ابتداءً من " + ltr(lesson.time)
      : "حضور عام";
    const dateParts = day.split("-");
    const formattedDate =
      dateParts.length === 3
        ? [dateParts[2], dateParts[1], dateParts[0]].join("/")
        : day;
    const doc = new d.Document({
      creator: "Mohamed Bouaoud",
      title: "لائحة الغياب",
      compatibility: { version: 15 },
      styles: {
        default: {
          document: {
            run: { font: "Arial", size: 26, bold: true, rightToLeft: true },
            paragraph: {
              bidirectional: true,
              alignment: d.AlignmentType.START,
            },
          },
        },
      },
      sections: [
        {
          properties: {
            page: {
              size: { width: 11906, height: 16838 },
              margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 },
            },
          },
          children: [
            para("لائحة الغياب", {
              runProperties: { bold: true, size: 36 },
              spacing: { after: 300 },
            }),
            para("الأستاذ: محمد بوعود"),
            para("المادة: الفيزياء والكيمياء"),
            para("القسم: " + ltr(currentClass().name)),
            para("التاريخ: " + ltr(formattedDate)),
            para("الحصة: " + timeText),
            ...(lesson?.room ? [para("القاعة: " + ltr(lesson.room))] : []),
            para("عدد الغائبين: " + list.length),
            ...(list.length
              ? [
                  new d.Table({
                    visuallyRightToLeft: true,
                    alignment: d.AlignmentType.RIGHT,
                    width: { size: 100, type: d.WidthType.PERCENTAGE },
                    rows: rows.map(
                      (row, index) =>
                        new d.TableRow({
                          tableHeader: index === 0,
                          children: row.map(
                            (text, cellIndex) =>
                              new d.TableCell({
                                width: {
                                  size: cellIndex === 0 ? 75 : 25,
                                  type: d.WidthType.PERCENTAGE,
                                },
                                children: [
                                  para(String(text), {
                                    runProperties: { bold: true },
                                  }),
                                ],
                              }),
                          ),
                        }),
                    ),
                  }),
                ]
              : [para("لا يوجد أي تلميذ غائب في هذه الحصة.")]),
          ],
        },
      ],
    });
    download(
      await d.Packer.toBlob(doc),
      `absences_${currentClass().name}_${day}_RTL.docx`,
    );
  } catch (e) {
    toast(e.message);
  }
}
