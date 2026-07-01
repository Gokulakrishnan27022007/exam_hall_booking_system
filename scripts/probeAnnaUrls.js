const https = require("https");
const insecureAgent = new https.Agent({ rejectUnauthorized: false });

const candidates = {
  CSE: [
    "https://cac.annauniv.edu/uddetails/udug_2023_revision/ICE/B.E.%20CSE.pdf",
    "https://cac.annauniv.edu/uddetails/udug_2023/ICE/B.E.%20CSE.pdf"
  ],
  IT: [
    "https://cac.annauniv.edu/uddetails/udug_2023_revision/ICE/B.Tech.%20IT.pdf",
    "https://cac.annauniv.edu/uddetails/udug_2023_revision/ICE/B.Tech.IT.pdf",
    "https://cac.annauniv.edu/uddetails/udug_2023/ICE/B.Tech.%20IT.pdf",
    "https://cac.annauniv.edu/uddetails/udug_2023/ICE/B.Tech.IT.pdf"
  ],
  ECE: [
    "https://cac.annauniv.edu/uddetails/udug_2023/ECE/B.E.%20ECE.pdf",
    "https://cac.annauniv.edu/uddetails/udug_2023_revision/ECE/B.E.%20ECE.pdf"
  ],
  EEE: [
    "https://cac.annauniv.edu/uddetails/udug_2023_revision/EEE/B.E.%20EEE.pdf",
    "https://cac.annauniv.edu/uddetails/udug_2023_revision/EEE/Version%20I/EEE%20R2023_6.8.2024.pdf",
    "https://cac.annauniv.edu/uddetails/udug_2023/EEE/B.E.%20EEE.pdf"
  ],
  CIVIL: [
    "https://cac.annauniv.edu/uddetails/udug_2023_revision/Civil/B.E.%20Civil.pdf",
    "https://cac.annauniv.edu/uddetails/udug_2023_revision/Civil/B.E.%20Civil%20Engineering.pdf",
    "https://cac.annauniv.edu/uddetails/udug_2023/Civil/B.E.%20Civil.pdf"
  ],
  MECH: [
    "https://cac.annauniv.edu/uddetails/udug_2023_revision/Mech/B.E.%20Mechanical.pdf",
    "https://cac.annauniv.edu/uddetails/udug_2023_revision/Mech/B.E.%20Mechanical%20Engineering.pdf",
    "https://cac.annauniv.edu/uddetails/udug_2023/Mech/B.E.%20Mechanical.pdf"
  ],
  AIDS: [
    "https://cac.annauniv.edu/uddetails/udug_2023/ICE/B.Tech.AIDS.pdf",
    "https://cac.annauniv.edu/uddetails/udug_2023_revision/ICE/B.Tech.AIDS.pdf"
  ],
  "M.Sc Computer Science (Integrated)": [
    "https://cac.annauniv.edu/uddetails/udpg_2023/SANDH/M.Sc.%20(5%20yrs)%20CS.pdf"
  ],
  "M.Sc Information Technology (Integrated)": [
    "https://cac.annauniv.edu/uddetails/udpg_2023/SANDH/M.Sc.%20(5%20yrs)%20IT.pdf"
  ],
  MCA: [
    "https://cac.annauniv.edu/uddetails/udpg_2023/FICE/M.C.A.pdf"
  ],
  "M.E CSE": [
    "https://cac.annauniv.edu/uddetails/udpg_2023/FICE/M.E.CSE.pdf"
  ],
  "M.Tech Information Technology": [
    "https://cac.annauniv.edu/uddetails/udpg_2023/FICE/M.Tech.IT.pdf"
  ],
  MBA: [
    "https://cac.annauniv.edu/uddetails/udpg_2023/MBA/1.%20MBA%20GM%202023.pdf"
  ]
};

async function probe() {
  for (const [program, urls] of Object.entries(candidates)) {
    console.log(`\n${program}`);
    for (const url of urls) {
      try {
        const result = await new Promise((resolve, reject) => {
          const request = https.get(
            url,
            {
              agent: insecureAgent,
              headers: {
                "user-agent": "Mozilla/5.0"
              }
            },
            (response) => {
              response.resume();
              resolve({
                status: response.statusCode,
                type: response.headers["content-type"]
              });
            }
          );
          request.on("error", reject);
        });
        console.log(`${result.status} ${result.type || "-"} ${url}`);
      } catch (error) {
        console.log(`ERR ${url} ${error.code || ""} ${error.message}`);
      }
    }
  }
}

probe();
