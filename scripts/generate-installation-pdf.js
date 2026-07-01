const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const outputDir = path.join(__dirname, "..", "docs");
const outputPath = path.join(outputDir, "ExamHall_Installation_Guide.pdf");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const doc = new PDFDocument({
  size: "A4",
  margin: 48
});

doc.pipe(fs.createWriteStream(outputPath));

function heading(text) {
  doc.moveDown(0.6);
  doc.font("Helvetica-Bold").fontSize(15).fillColor("#0f172a").text(text);
  doc.moveDown(0.2);
}

function body(text) {
  doc.font("Helvetica").fontSize(10.5).fillColor("#111827").text(text, {
    lineGap: 3
  });
}

function bullet(text) {
  doc.font("Helvetica").fontSize(10.5).fillColor("#111827").text(`- ${text}`, {
    indent: 12,
    lineGap: 2
  });
}

function codeBlock(lines) {
  const x = doc.x;
  const y = doc.y;
  const width = 500;
  const padding = 10;
  const text = Array.isArray(lines) ? lines.join("\n") : String(lines);
  const height = doc.heightOfString(text, {
    width: width - (padding * 2),
    lineGap: 2
  }) + (padding * 2);

  doc.roundedRect(x, y, width, height, 6).fillAndStroke("#f8fafc", "#cbd5e1");
  doc.fillColor("#0f172a").font("Courier").fontSize(9.5).text(text, x + padding, y + padding, {
    width: width - (padding * 2),
    lineGap: 2
  });
  doc.moveDown(0.6);
  doc.x = 48;
}

doc.font("Helvetica-Bold").fontSize(20).fillColor("#0f172a").text("Exam Hall Management System", {
  align: "center"
});
doc.font("Helvetica-Bold").fontSize(16).text("Installation and Running Guide", {
  align: "center"
});
doc.moveDown(0.4);
doc.font("Helvetica").fontSize(10).fillColor("#475569").text("Prepared for local setup on another machine", {
  align: "center"
});

heading("1. Software To Install");
bullet("Node.js from https://nodejs.org/en/download");
bullet("MongoDB Community Server from https://www.mongodb.com/try/download/community");
bullet("Visual Studio Code from https://code.visualstudio.com/");
bullet("Optional: MongoDB Compass from https://www.mongodb.com/products/tools/compass");

heading("2. Copy The Project Folder");
body("Copy the full project folder named examhall to the other machine. You can place it anywhere, for example D:\\Projects\\examhall.");

heading("3. Open The Project In VS Code");
body("Open Visual Studio Code and choose File > Open Folder, then select the copied examhall folder.");

heading("4. Create The Environment File");
body("Inside the examhall folder, create a file named .env and paste the following values:");
codeBlock([
  "PORT=5001",
  "MONGODB_URI=mongodb://127.0.0.1:27017/examhall_final",
  "JWT_SECRET=examhall_secret_2026"
]);

heading("5. Start MongoDB");
body("On Windows, press Win + R, type services.msc, find MongoDB, and click Start. If you installed MongoDB manually, start mongod before running the project.");

heading("6. Install Project Dependencies");
body("Open the VS Code terminal inside the examhall folder and run:");
codeBlock([
  "npm install"
]);

heading("7. Seed Initial Data");
body("Run the seed command once to create the sample admin, faculty, students, and halls:");
codeBlock([
  "npm run seed"
]);

heading("8. Start The Project");
body("Run the project server with:");
codeBlock([
  "npm start"
]);

heading("9. Open The Website");
body("Open your browser and go to:");
codeBlock([
  "http://localhost:5001"
]);
body("If you still see old content in the browser, press Ctrl + F5 for a hard refresh.");

heading("10. Demo Login Accounts");
bullet("Admin: ADMIN001 / Pass@123");
bullet("Faculty: FAC001 / Pass@123");
bullet("Faculty: FAC002 / Pass@123");
bullet("Faculty: FAC003 / Pass@123");
bullet("Faculty: FAC004 / Pass@123");
bullet("Student: 22CSE001 / Pass@123");
bullet("Student: 22IT001 / Pass@123");
bullet("Student: 22MSCIT001 / Pass@123");
bullet("Student: 22MSCCS001 / Pass@123");

heading("11. Basic Project Flow");
bullet("Login as Admin and create or edit halls.");
bullet("Create or assign faculty advisors from the admin portal.");
bullet("Login as Faculty and create exams.");
bullet("Assign a representative from the student list.");
bullet("Login as Representative through the student portal and create hall bookings.");
bullet("Login as Faculty and approve or reject the booking request.");
bullet("Login as Admin and confirm or reject the booking.");
bullet("Export booking data as CSV or PDF from the admin portal.");
bullet("Login as Student to view the exam schedule.");

heading("12. View The Database In MongoDB Compass");
body("Open MongoDB Compass and connect using the following connection string:");
codeBlock([
  "mongodb://127.0.0.1:27017"
]);
body("Then open the database named examhall_final. The main collections are users, exams, halls, bookings, notifications, and auditlogs.");

heading("13. If The Project Does Not Run");
bullet("Make sure MongoDB is running.");
bullet("Make sure the .env file exists.");
bullet("Run the commands again in this order:");
codeBlock([
  "npm install",
  "npm run seed",
  "npm start"
]);

heading("14. Minimum Commands Summary");
codeBlock([
  "npm install",
  "npm run seed",
  "npm start"
]);

doc.end();

doc.on("finish", () => {
  console.log(outputPath);
});
