import fs from "fs/promises";
import path from "path";

const LOG_PATH = "./log.log";

export const log = async ({
  message,
  code = "INFO",
}: {
  message: any;
  code?: string;
}) => {
  if (message == null || !message) {
    return;
  }

  const _path = path.resolve(LOG_PATH);

  const date = new Date().toISOString();

  const log = `[${code}][${date}] ${message.toString()}\n`;
  console.log(log);

  try {
    await fs.appendFile(_path, log);
  } catch (error) {
    console.log(error);
  }
};
