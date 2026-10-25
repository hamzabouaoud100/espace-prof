const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const zlib = require("node:zlib");
const runtimeModules =
  process.env.DOCX_NODE_MODULES ||
  require("node:path").join(
    require("node:os").homedir(),
    ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules",
  );
const docx = require(require.resolve("docx", { paths: [runtimeModules] }));

function documentXml(buffer) {
  for (let offset = 0; offset < buffer.length - 46; offset++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) continue;
    const nameLength = buffer.readUInt16LE(offset + 28);
    const name = buffer
      .subarray(offset + 46, offset + 46 + nameLength)
      .toString();
    if (name !== "word/document.xml") continue;
    const method = buffer.readUInt16LE(offset + 10),
      size = buffer.readUInt32LE(offset + 20),
      local = buffer.readUInt32LE(offset + 42);
    const dataOffset =
      local +
      30 +
      buffer.readUInt16LE(local + 26) +
      buffer.readUInt16LE(local + 28);
    const data = buffer.subarray(dataOffset, dataOffset + size);
    return (method === 8 ? zlib.inflateRawSync(data) : data).toString();
  }
  throw Error("Document XML missing");
}

async function check() {
  let exported;
  const context = vm.createContext({
    window: { docx },
    currentClass: () => ({
      name: "1APIC-4",
      students: [
        { id: "S1", name: "تلميذ غائب" },
        { id: "S2", name: "تلميذ حاضر" },
      ],
    }),
    absent: (student) => student.id === "S1",
    canRecordAttendance: () => true,
    state: {
      lessons: [{ id: "lesson", time: "08:00", endTime: "09:00", room: "S18" }],
    },
    session: "lesson",
    day: "2026-10-26",
    lessonTime: () => "08:00–09:00",
    t: (ar, fr) => fr,
    $: () => ({}),
    toast: (message) => {
      throw Error(message);
    },
    download: (blob) => {
      exported = blob;
    },
  });
  vm.runInContext(
    fs.readFileSync("dist/attendance-report.js", "utf8"),
    context,
  );
  await context.exportWord();
  assert(exported, "No Word file produced");
  const xml = documentXml(Buffer.from(await exported.arrayBuffer()));
  assert(xml.includes("الأستاذ: محمد بوعود"));
  assert(xml.includes("لائحة الغياب"));
  assert(!xml.includes("توقيع الأستاذ"));
  assert(!xml.includes("Signature"));
  assert(xml.includes("<w:bidiVisual"));
  assert(xml.includes("<w:bidi"));
  assert(xml.includes("<w:rtl"));
  assert(xml.includes('<w:jc w:val="start"'));
  assert(xml.includes("تلميذ غائب"));
  assert(!xml.includes("تلميذ حاضر"));
  assert(!xml.includes("Absent"));
  assert(!xml.includes("رقم التلميذ"));
  assert(!xml.includes(">S1<"));
  assert(xml.replace(/<[^>]+>/g, "").includes("من 08:00 إلى 09:00"));
  const paragraphs = xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];
  assert(paragraphs.length > 5);
  assert(
    paragraphs.every((paragraph) => paragraph.includes('<w:jc w:val="start"')),
  );
  context.absent = () => false;
  await context.exportWord();
  const emptyXml = documentXml(Buffer.from(await exported.arrayBuffer()));
  assert(emptyXml.includes("لا يوجد أي تلميذ غائب في هذه الحصة."));
  assert(!emptyXml.includes("<w:tbl>"));

  console.log(
    "Passed: real Word export, Arabic name/text, no signature, RTL table/paragraphs/runs, and only absent students.",
  );
}
check().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
