// lib/formParser.ts
import { NextApiRequest } from 'next';
import Busboy from 'busboy';
import type { IncomingHttpHeaders } from 'http';
import os from 'os';
import fs from 'fs';
import path from 'path';

// Определяем и экспортируем тип для файла, чтобы его можно было использовать в других частях приложения
export interface FormidableFile {
  filepath: string;
  originalFilename: string;
  mimetype: string;
  size: number;
}

// Определяем тип для результата парсинга
interface FormParseResult {
  fields: { [key: string]: string | string[] };
  files: { [key: string]: FormidableFile[] };
}

export async function parseForm(req: NextApiRequest): Promise<FormParseResult> {
  return new Promise((resolve, reject) => {
    const fields: FormParseResult['fields'] = {};
    const files: FormParseResult['files'] = {};
    
    let pendingFiles = 0;
    let parsingFinished = false;

    const busboy = Busboy({ headers: req.headers as IncomingHttpHeaders });

    const checkComplete = () => {
      // Резолвим Promise только когда все поля обработаны И все файлы записаны на диск
      if (parsingFinished && pendingFiles === 0) {
        resolve({ fields, files });
      }
    };

    busboy.on('file', (fieldname, file, info) => {
      pendingFiles++;
      const tempPath = path.join(os.tmpdir(), `${Date.now()}-${info.filename}`);
      const writableStream = fs.createWriteStream(tempPath);

      file.pipe(writableStream);

      writableStream.on('close', () => {
        if (!files[fieldname]) {
          files[fieldname] = [];
        }
        const stats = fs.statSync(tempPath);
        files[fieldname].push({
          filepath: tempPath,
          originalFilename: info.filename,
          mimetype: info.mimeType,
          size: stats.size,
        });
        pendingFiles--;
        checkComplete();
      });

      writableStream.on('error', (err: unknown) => {
        pendingFiles--;
        reject(err);
      });
    });

    busboy.on('field', (fieldname, val) => {
      // Обрабатываем как обычные поля, так и поля-массивы (например, existingImages[])
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
      parsingFinished = true;
      checkComplete();
    });

    busboy.on('error', (err: unknown) => reject(err));

    req.pipe(busboy);
  });
}