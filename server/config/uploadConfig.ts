import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileProcessorService } from '../services/fileProcessor';

// Configuração centralizada de uploads
export class UploadConfig {
  private static baseUploadDir = path.join(process.cwd(), "uploads");

  // Criar diretório se não existir
  private static ensureDirectoryExists(dir: string) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Função para gerar nome único de arquivo
  private static generateFileName(file: Express.Multer.File): string {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    return `${path.basename(file.originalname, ext)}-${uniqueSuffix}${ext}`;
  }

  // Configuração para editais (mais permissiva)
  static createEditalUpload() {
    const uploadDir = path.join(this.baseUploadDir, 'editais');
    this.ensureDirectoryExists(uploadDir);

    return multer({
      storage: multer.diskStorage({
        destination: uploadDir,
        filename: (req, file, cb) => {
          cb(null, this.generateFileName(file));
        }
      }),
      fileFilter: (req, file, cb) => {
        const isSupported = fileProcessorService.isFileTypeSupported(file.originalname);
        const supportedMimeTypes = fileProcessorService.getSupportedMimeTypes();
        
        if (isSupported && supportedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          const supportedExtensions = fileProcessorService.getSupportedExtensions().join(', ');
          cb(new Error(`Tipo de arquivo não suportado. Tipos aceitos: ${supportedExtensions}`));
        }
      },
      limits: {
        fileSize: 50 * 1024 * 1024 // 50MB - mais generoso para editais
      }
    });
  }

  // Configuração para materiais de estudo
  static createMaterialUpload() {
    this.ensureDirectoryExists(this.baseUploadDir);

    return multer({
      storage: multer.diskStorage({
        destination: this.baseUploadDir,
        filename: (req, file, cb) => {
          cb(null, this.generateFileName(file));
        }
      }),
      fileFilter: (req, file, cb) => {
        const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.md'];
        const ext = path.extname(file.originalname).toLowerCase();
        
        if (allowedTypes.includes(ext)) {
          cb(null, true);
        } else {
          cb(new Error(`Tipo de arquivo não suportado. Tipos aceitos: ${allowedTypes.join(', ')}`));
        }
      },
      limits: {
        fileSize: 50 * 1024 * 1024 // 50MB padronizado
      }
    });
  }

  // Configuração para base de conhecimento (PDFs)
  static createKnowledgeBaseUpload() {
    this.ensureDirectoryExists(this.baseUploadDir);

    return multer({
      storage: multer.diskStorage({
        destination: this.baseUploadDir,
        filename: (req, file, cb) => {
          cb(null, this.generateFileName(file));
        }
      }),
      fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.pdf') {
          cb(null, true);
        } else {
          cb(new Error('Apenas arquivos PDF são aceitos para a base de conhecimento'));
        }
      },
      limits: {
        fileSize: 50 * 1024 * 1024 // 50MB padronizado
      }
    });
  }
}