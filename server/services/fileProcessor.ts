import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import csv from 'csv-parser';
import { pdf2jsonExtractor } from './pdf2jsonExtractor';
import mammoth from 'mammoth';

export interface ExtractedContent {
  text: string;
  metadata?: {
    pageCount?: number;
    sheetNames?: string[];
    rowCount?: number;
  };
}

export interface FileTypeInfo {
  extension: string;
  mimeType: string;
  supported: boolean;
}

export class FileProcessorService {
  
  private readonly supportedFileTypes: Map<string, FileTypeInfo> = new Map([
    ['.pdf', { extension: '.pdf', mimeType: 'application/pdf', supported: true }],
    ['.docx', { extension: '.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', supported: true }],
    ['.doc', { extension: '.doc', mimeType: 'application/msword', supported: true }],
    ['.xlsx', { extension: '.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', supported: true }],
    ['.xls', { extension: '.xls', mimeType: 'application/vnd.ms-excel', supported: true }],
    ['.csv', { extension: '.csv', mimeType: 'text/csv', supported: true }],
    ['.json', { extension: '.json', mimeType: 'application/json', supported: true }],
    ['.txt', { extension: '.txt', mimeType: 'text/plain', supported: true }],
  ]);

  /**
   * Verifica se um tipo de arquivo é suportado
   */
  isFileTypeSupported(filename: string): boolean {
    const extension = path.extname(filename).toLowerCase();
    return this.supportedFileTypes.has(extension) && 
           this.supportedFileTypes.get(extension)!.supported;
  }

  /**
   * Obtém informações sobre um tipo de arquivo
   */
  getFileTypeInfo(filename: string): FileTypeInfo | null {
    const extension = path.extname(filename).toLowerCase();
    return this.supportedFileTypes.get(extension) || null;
  }

  /**
   * Detecta o tipo de arquivo baseado na extensão
   */
  detectFileType(filename: string): 'pdf' | 'docx' | 'doc' | 'xlsx' | 'xls' | 'csv' | 'json' | 'txt' | 'unknown' {
    const extension = path.extname(filename).toLowerCase();
    
    switch (extension) {
      case '.pdf': return 'pdf';
      case '.docx': return 'docx';
      case '.doc': return 'doc';
      case '.xlsx': return 'xlsx';
      case '.xls': return 'xls';
      case '.csv': return 'csv';
      case '.json': return 'json';
      case '.txt': return 'txt';
      default: return 'unknown';
    }
  }

  /**
   * Processa um arquivo e extrai seu conteúdo textual
   */
  async processFile(filePath: string, fileName: string): Promise<ExtractedContent> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo não encontrado: ${filePath}`);
    }

    const fileType = this.detectFileType(fileName);
    
    if (fileType === 'unknown') {
      throw new Error(`Tipo de arquivo não suportado: ${fileName}`);
    }

    console.log(`📄 Processando arquivo ${fileType.toUpperCase()}: ${fileName}`);

    switch (fileType) {
      case 'pdf':
        return await this.processPDF(filePath);
      case 'docx':
      case 'doc':
        return await this.processWord(filePath);
      case 'xlsx':
      case 'xls':
        return await this.processExcel(filePath);
      case 'csv':
        return await this.processCSV(filePath);
      case 'json':
        return await this.processJSON(filePath);
      case 'txt':
        return await this.processText(filePath);
      default:
        throw new Error(`Processamento não implementado para tipo: ${fileType}`);
    }
  }

  /**
   * Processa arquivo PDF usando sistema hierárquico
   */
  private async processPDF(filePath: string): Promise<ExtractedContent> {
    try {
      const documentStructure = await pdf2jsonExtractor.extractDocumentStructure(filePath, 'document.pdf');
      const hierarchicalChunks = pdf2jsonExtractor.convertToHierarchicalChunks(documentStructure);
      const text = hierarchicalChunks.map(chunk => chunk.content).join('\n');
      
      return {
        text,
        metadata: {
          pageCount: documentStructure.totalPages
        }
      };
    } catch (error) {
      console.error('❌ Erro ao processar PDF:', error);
      throw new Error('Falha ao processar arquivo PDF');
    }
  }

  /**
   * Processa arquivos Word (.docx, .doc)
   */
  private async processWord(filePath: string): Promise<ExtractedContent> {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      
      if (result.messages.length > 0) {
        console.warn('⚠️ Avisos no processamento Word:', result.messages);
      }

      return {
        text: result.value,
        metadata: {}
      };
    } catch (error) {
      console.error('❌ Erro ao processar Word:', error);
      throw new Error('Falha ao processar arquivo Word');
    }
  }

  /**
   * Processa planilhas Excel (.xlsx, .xls)
   */
  private async processExcel(filePath: string): Promise<ExtractedContent> {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetNames = workbook.SheetNames;
      let allText = '';
      let totalRows = 0;

      // Processar cada planilha
      for (const sheetName of sheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Adicionar nome da planilha
        allText += `\n=== PLANILHA: ${sheetName} ===\n`;
        
        // Converter dados para texto
        for (const row of jsonData as any[][]) {
          if (row.length > 0) {
            const rowText = row.join(' | ');
            allText += rowText + '\n';
            totalRows++;
          }
        }
        allText += '\n';
      }

      return {
        text: allText.trim(),
        metadata: {
          sheetNames,
          rowCount: totalRows
        }
      };
    } catch (error) {
      console.error('❌ Erro ao processar Excel:', error);
      throw new Error('Falha ao processar arquivo Excel');
    }
  }

  /**
   * Processa arquivos CSV
   */
  private async processCSV(filePath: string): Promise<ExtractedContent> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      let allText = '';

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          results.push(data);
          // Converter objeto para linha de texto
          const row = Object.values(data).join(' | ');
          allText += row + '\n';
        })
        .on('end', () => {
          // Adicionar cabeçalhos se disponíveis
          if (results.length > 0) {
            const headers = Object.keys(results[0]).join(' | ');
            allText = `${headers}\n${allText}`;
          }

          resolve({
            text: allText.trim(),
            metadata: {
              rowCount: results.length
            }
          });
        })
        .on('error', (error) => {
          console.error('❌ Erro ao processar CSV:', error);
          reject(new Error('Falha ao processar arquivo CSV'));
        });
    });
  }

  /**
   * Processa arquivos JSON
   */
  private async processJSON(filePath: string): Promise<ExtractedContent> {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const jsonData = JSON.parse(fileContent);

      // Converter JSON para texto legível
      const text = this.jsonToText(jsonData);

      return {
        text,
        metadata: {}
      };
    } catch (error) {
      console.error('❌ Erro ao processar JSON:', error);
      throw new Error('Falha ao processar arquivo JSON');
    }
  }

  /**
   * Processa arquivos de texto simples
   */
  private async processText(filePath: string): Promise<ExtractedContent> {
    try {
      const text = fs.readFileSync(filePath, 'utf8');

      return {
        text,
        metadata: {}
      };
    } catch (error) {
      console.error('❌ Erro ao processar texto:', error);
      throw new Error('Falha ao processar arquivo de texto');
    }
  }

  /**
   * Converte objeto JSON para texto legível
   */
  private jsonToText(obj: any, indent: number = 0): string {
    const spacing = '  '.repeat(indent);
    let text = '';

    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        text += `${spacing}[${i}] ${this.jsonToText(obj[i], indent + 1)}\n`;
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object') {
          text += `${spacing}${key}:\n${this.jsonToText(value, indent + 1)}`;
        } else {
          text += `${spacing}${key}: ${value}\n`;
        }
      }
    } else {
      return String(obj);
    }

    return text;
  }

  /**
   * Lista os tipos de arquivo suportados
   */
  getSupportedFileTypes(): FileTypeInfo[] {
    return Array.from(this.supportedFileTypes.values()).filter(type => type.supported);
  }

  /**
   * Valida se o arquivo está dentro dos limites de tamanho
   */
  validateFileSize(fileSize: number, maxSizeMB: number = 50): boolean {
    const maxBytes = maxSizeMB * 1024 * 1024;
    return fileSize <= maxBytes;
  }

  /**
   * Obtém extensões suportadas para validação no multer
   */
  getSupportedExtensions(): string[] {
    return Array.from(this.supportedFileTypes.keys());
  }

  /**
   * Obtém MIME types suportados para validação no multer
   */
  getSupportedMimeTypes(): string[] {
    return Array.from(this.supportedFileTypes.values())
      .filter(type => type.supported)
      .map(type => type.mimeType);
  }
}

export const fileProcessorService = new FileProcessorService();