// lib/formParser.ts
import { NextApiRequest } from 'next';
import Busboy from 'busboy';
import { IncomingMessage, IncomingHttpHeaders } from 'http'; // Импортируем IncomingHttpHeaders
import { ReadStream } from 'fs';
import os from 'os';

interface FormParseResult {
  fields: { [key: string]: string | string[] };
  files: {
    [key: string]: {
      filepath: string; // Временный путь к файлу
      originalFilename: string;
      mimetype: string;
    }[];
  };
}

export async function parseForm(req: NextApiRequest): Promise<FormParseResult> {
  return new Promise((resolve, reject) => {
    const fields: { [key: string]: string | string[] } = {};
    const files: { [key: string]: { filepath: string; originalFilename: string; mimetype: string }[] } = {};

    // ИСПРАВЛЕНИЕ: Используем IncomingHttpHeaders для заголовков Busboy
    const busboy = Busboy({ headers: req.headers as IncomingHttpHeaders }); 

    busboy.on('file', (
      fieldname: string,
      file: ReadStream,
      filename: Busboy.FileInfo, // Busboy.FileInfo все еще корректен
      encoding: string,
      mimetype: string
    ) => {
     const tempPath = `${os.tmpdir()}/${Date.now()}-${filename.filename}`; // <--- ИСПРАВЛЕНИЕ: Использование системной временной директории
      const fs = require('fs');
      const writableStream = fs.createWriteStream(tempPath);
      file.pipe(writableStream);

      writableStream.on('close', () => {
        if (!files[fieldname]) {
          files[fieldname] = [];
        }
        files[fieldname].push({
          filepath: tempPath,
          originalFilename: filename.filename,
          mimetype,
        });
      });

      writableStream.on('error', (err: any) => {
        console.error('Error writing file stream:', err);
      });
    });

    busboy.on('field', (
      fieldname: string,
      val: string,
      fieldnameTruncated: boolean,
      valTruncated: boolean,
      encoding: string,
      mimetype: string
    ) => {
      if (fieldname.endsWith('[]')) {
        const key = fieldname.slice(0, -2);
        if (!fields[key]) {
          fields[key] = [];
        }
        (fields[key] as string[]).push(val);
      } else {
        fields[fieldname] = val;
      }
    });

    busboy.on('finish', () => {
      resolve({ fields, files });
    });

    busboy.on('error', (err: any) => {
      console.error('Busboy error:', err);
      req.unpipe(busboy);
      reject(err);
    });

    req.on('error', (err: any) => {
      console.error('Request stream error:', err);
      reject(err);
    });

    req.pipe(busboy);
  });
}