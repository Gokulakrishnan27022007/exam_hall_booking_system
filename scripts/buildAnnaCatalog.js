const fs = require("fs");
const path = require("path");
const https = require("https");
const { PDFParse } = require("pdf-parse");
const sources = require("../server/data/annaUniversityCatalogSources");

const insecureAgent = new https.Agent({ rejectUnauthorized: false });
const outputPath = path.join(__dirname, "..", "server", "data", "annaUniversityCatalog.json");
const categoryPattern = "(HSMC|HSM C|ESC|PCC|PEC|SDC|UC|FC|BSC|EEC|RMC|OEC|ETC|EDS|IOC|SLC|CMC)";

const romanMap = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7,
  VIII: 8,
  IX: 9,
  X: 10
};

function normalizeLine(line) {
  return line
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/\t/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toSemesterNumber(token) {
  if (!token) return null;
  if (/^\d+$/.test(token)) return Number(token);
  return romanMap[token.toUpperCase()] || null;
}

function isHeaderNoise(line) {
  return /^(S\.? ?NO\.?|COURSE CODE|COURSE TITLE|COURSE NAME|CATEGORY|PERIODS|L T P|TCP|THEORY|PRACTICAL|PRACTICALS|TOTAL|SEMESTER|CURRICULUM|CURRICULA|ANNA UNIVERSITY|UNDERGRADUATE CURRICULUM|UNIVERSITY DEPARTMENTS|CHOICE-BASED CREDIT SYSTEM|CHOICE BASED CREDIT SYSTEM|-- \d+ OF \d+ --)$/i.test(line);
}

function isSectionStop(line) {
  return /^(PROFESSIONAL ELECTIVE COURSES|VERTICAL|REGISTRATION OF PROFESSIONAL ELECTIVE|PROGRAMME ELECTIVE|ELECTIVE COURSES|TEXT BOOKS|REFERENCES|COURSE OUTCOMES|CO-PO|CO PO|UNIT I|UNIT II|UNIT III|UNIT IV|UNIT V)/i.test(line);
}

function isRecordStart(line) {
  return /^\d+\.?\s*$/.test(line) || /^\d+\.?\s+/.test(line);
}

function parseRecord(record) {
  const clean = normalizeLine(record);
  const match = clean.match(/^(\d+)\.?\s+([A-Z0-9./-]+)\s+(.+)$/);
  if (!match) return null;

  const courseCode = match[2];
  if (!/^[A-Z]{1,4}\d{2,5}[A-Z0-9]{0,5}$/.test(courseCode)) return null;

  const rest = match[3];
  let parsed = rest.match(new RegExp(`^(.*?)\\s+(LIT|T|L|IPW|PW|CDP|PW\\/IPW)\\s+[\\d.\\s-]*\\s+${categoryPattern}$`, "i"));
  if (parsed) {
    return {
      courseCode,
      courseName: parsed[1].trim(),
      category: parsed[3].replace(/\s+/g, "").trim()
    };
  }

  parsed = rest.match(new RegExp(`^(.*?)\\s+${categoryPattern}\\s+[\\d.\\s-]*$`, "i"));
  if (parsed) {
    return {
      courseCode,
      courseName: parsed[1].trim(),
      category: parsed[2].replace(/\s+/g, "").trim()
    };
  }

  return {
    courseCode,
    courseName: rest.trim(),
    category: ""
  };
}

function extractSemesterRecords(text) {
  const lines = text
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean);

  const startIndex = lines.findIndex((line) => /CURRICULA AND SYLLABI|CURRICULUM AND SYLLABI|CURRICULUM AND SYLLABI/i.test(line));
  const relevantLines = startIndex >= 0 ? lines.slice(startIndex) : lines;

  const sections = {};
  let semester = null;
  let currentRecord = "";

  function pushRecord() {
    if (!semester || !currentRecord) return;
    const item = parseRecord(currentRecord);
    if (item) {
      sections[semester] = sections[semester] || [];
      const exists = sections[semester].some((subject) => subject.courseCode === item.courseCode);
      if (!exists) sections[semester].push(item);
    }
    currentRecord = "";
  }

  for (const line of relevantLines) {
    if (isSectionStop(line)) {
      pushRecord();
      semester = null;
      continue;
    }

    const semMatch = line.match(/^SEMESTER(?:\s*-\s*|\s+)([IVX]+|\d+)\b/i);
    if (semMatch) {
      pushRecord();
      semester = toSemesterNumber(semMatch[1]);
      sections[semester] = sections[semester] || [];
      continue;
    }

    if (!semester) continue;

    if (isHeaderNoise(line)) {
      pushRecord();
      continue;
    }

    if (/^TOTAL\b/i.test(line)) {
      pushRecord();
      semester = null;
      continue;
    }

    if (isRecordStart(line)) {
      pushRecord();
      currentRecord = line;
      continue;
    }

    if (currentRecord) {
      currentRecord += ` ${line}`;
    }
  }

  pushRecord();
  return sections;
}

async function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(
      url,
      {
        agent: insecureAgent,
        headers: {
          "user-agent": "Mozilla/5.0"
        }
      },
      (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Unexpected status ${response.statusCode} for ${url}`));
          response.resume();
          return;
        }

        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => resolve(Buffer.concat(chunks)));
        response.on("error", reject);
      }
    ).on("error", reject);
  });
}

async function buildCatalog() {
  const catalog = {};

  for (const [department, source] of Object.entries(sources)) {
    const buffer = await fetchBuffer(source.url);
    const parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText();
    await parser.destroy();

    const semesters = extractSemesterRecords(textResult.text);
    catalog[department] = {
      department,
      regulation: source.regulation,
      sourceUrl: source.url,
      semesters
    };
  }

  fs.writeFileSync(outputPath, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`Wrote ${outputPath}`);
}

buildCatalog().catch((error) => {
  console.error(error);
  process.exit(1);
});
