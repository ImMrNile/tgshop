// lib/formParser.ts
import { NextApiRequest } from 'next';
import Busboy from 'busboy';
import { IncomingMessage, IncomingHttpHeaders } from 'http';
import { ReadStream } from 'fs';
import os from 'os';
import fs from 'fs';
import path from 'path';

interface FormParseResult {
  fields: { [key: string]: string | string[] };
  files: {
    [key: string]: {
      filepath: string; // Временный путь к файлу
      originalFilename: string;
      mimetype: string;
      size: number; // Добавляем размер файла
    }[];
  };
}

export async function parseForm(req: NextApiRequest): Promise<FormParseResult> {
  return new Promise((resolve, reject) => {
    const fields: { [key: string]: string | string[] } = {};
    const files: { [key: string]: { filepath: string; originalFilename: string; mimetype: string; size: number }[] } = {};
    
    // ИСПРАВЛЕНИЕ: Отслеживаем количество активных файлов
    let pendingFiles = 0;
    let parsingFinished = false;

    console.log('=== Starting form parsing ===');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Content-Length:', req.headers['content-length']);

    const busboy = Busboy({ headers: req.headers as IncomingHttpHeaders });

    // ИСПРАВЛЕНИЕ: Функция для проверки завершения парсинга
    const checkComplete = () => {
      console.log(`Check complete: parsingFinished=${parsingFinished}, pendingFiles=${pendingFiles}`);
      if (parsingFinished && pendingFiles === 0) {
        console.log('=== Form parsing finished ===');
        console.log('Fields:', Object.keys(fields));
        console.log('Files:', Object.keys(files).map(key => `${key}: ${files[key].length} files`));
        
        // Логируем детали файлов
        Object.keys(files).forEach(key => {
          files[key].forEach((file, index) => {
            console.log(`File ${key}[${index}]: ${file.originalFilename} (${file.size} bytes, ${file.mimetype})`);
          });
        });
        
        resolve({ fields, files });
      }
    };

    busboy.on('file', (
      fieldname: string,
      file: ReadStream,
      filename: Busboy.FileInfo,
      encoding: string,
      mimetype: string
    ) => {
      console.log(`Processing file field: ${fieldname}`);
      console.log(`Filename: ${filename.filename}`);
      console.log(`MIME type: ${mimetype}`);
      console.log(`Encoding: ${encoding}`);

      // ИСПРАВЛЕНИЕ: Увеличиваем счетчик ожидающих файлов
      pendingFiles++;
      console.log(`Pending files incremented to: ${pendingFiles}`);

      // Создаем уникальное имя файла во временной директории
      const tempPath = path.join(os.tmpdir(), `${Date.now()}-${Math.random().toString(36).substring(7)}-${filename.filename}`);
      console.log(`Temporary file path: ${tempPath}`);

      const writableStream = fs.createWriteStream(tempPath);
      let fileSize = 0;

      file.on('data', (data) => {
        fileSize += data.length;
      });

      file.pipe(writableStream);

      writableStream.on('close', () => {
        console.log(`File written successfully: ${tempPath} (${fileSize} bytes)`);
        
        // Проверяем, что файл действительно создан
        if (fs.existsSync(tempPath)) {
          const stats = fs.statSync(tempPath);
          console.log(`File verified: size=${stats.size} bytes, isFile=${stats.isFile()}`);
          
          if (!files[fieldname]) {
            files[fieldname] = [];
          }
          
          files[fieldname].push({
            filepath: tempPath,
            originalFilename: filename.filename,
            mimetype,
            size: stats.size,
          });
          
          console.log(`File added to results: ${fieldname}[${files[fieldname].length - 1}]`);
        } else {
          console.error(`File was not created: ${tempPath}`);
        }
        
        // ИСПРАВЛЕНИЕ: Уменьшаем счетчик и проверяем завершение
        pendingFiles--;
        console.log(`Pending files decremented to: ${pendingFiles}`);
        checkComplete();
      });

      writableStream.on('error', (err: any) => {
        console.error('Error writing file stream:', err);
        pendingFiles--;
        reject(err);
      });

      file.on('error', (err: any) => {
        console.error('Error reading file stream:', err);
        pendingFiles--;
        reject(err);
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
      console.log(`Processing field: ${fieldname} = ${val}`);
      
      if (fieldname.endsWith('[]')) {
        // Обрабатываем массивы (например, existingImages[])
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
      console.log('Busboy finished parsing');
      parsingFinished = true;
      checkComplete();
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

    req.on('aborted', () => {
      console.error('Request was aborted');
      reject(new Error('Request was aborted'));
    });

    console.log('Piping request to busboy...');
    req.pipe(busboy);
  });
}