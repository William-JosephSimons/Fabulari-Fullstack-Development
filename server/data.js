import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFolder = path.dirname(fileURLToPath(import.meta.url));
const dataFolder = path.join(currentFolder, "data");
const dataFile = path.join(dataFolder, "fabulari.json");

function createEmptyData() {
  return {
    users: [],
    groups: [],
    rooms: [],
    requests: [],
    groupBans: [],
    systemBans: [],
    auditLogs: [],
  };
}

function loadData() {
  if (!fs.existsSync(dataFile)) {
    const emptyData = createEmptyData();
    saveData(emptyData);
    return emptyData;
  }

  const fileContents = fs.readFileSync(dataFile, "utf8");
  return JSON.parse(fileContents);
}

function saveData(data) {
  // Creating the folder here also handles a fresh copy without a data directory.
  fs.mkdirSync(dataFolder, { recursive: true });
  // stringify parameters allow for pretty printing of json
  // overwrite file rather than append to save valid json
  fs.writeFileSync(dataFile, `${JSON.stringify(data, null, 2)}\n`);
}

export { loadData, saveData };
