const https = require("https");
const { PDFParse } = require("pdf-parse");

const insecureAgent = new https.Agent({ rejectUnauthorized: false });

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
          reject(new Error(`Unexpected status ${response.statusCode}`));
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

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error("Usage: node scripts/inspectAnnaPdf.js <pdf-url>");
    process.exit(1);
  }

  const buffer = await fetchBuffer(url);
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  console.log(result.text.slice(0, 10000));
  await parser.destroy();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
