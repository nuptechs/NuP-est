import fs from 'fs';
import path from 'path';

/**
 * Utilitário para limpeza e organização de arquivos de upload
 */
export class FileCleanup {
  private static uploadDir = path.join(process.cwd(), 'uploads');

  /**
   * Remove arquivos temporários mais antigos que X dias
   */
  static async cleanOldTempFiles(maxAgeInDays: number = 7): Promise<void> {
    const tempDir = path.join(this.uploadDir, 'temp-files');
    if (!fs.existsSync(tempDir)) return;

    const now = Date.now();
    const maxAge = maxAgeInDays * 24 * 60 * 60 * 1000; // Convert to milliseconds

    try {
      const files = fs.readdirSync(tempDir);
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          deletedCount++;
          console.log(`🗑️ Arquivo temporário removido: ${file}`);
        }
      }

      if (deletedCount > 0) {
        console.log(`✅ Limpeza concluída: ${deletedCount} arquivos removidos`);
      }
    } catch (error) {
      console.error('❌ Erro na limpeza de arquivos:', error);
    }
  }

  /**
   * Garante que a estrutura de diretórios está correta
   */
  static ensureDirectoryStructure(): void {
    const dirs = [
      'editais',
      'materials', 
      'knowledge-base',
      'temp-files'
    ];

    for (const dir of dirs) {
      const fullPath = path.join(this.uploadDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`📁 Diretório criado: uploads/${dir}`);
      }
    }
  }

  /**
   * Move arquivo para diretório temporário quando há erro no processamento
   */
  static moveToTempFiles(filePath: string): void {
    if (!fs.existsSync(filePath)) return;

    const fileName = path.basename(filePath);
    const tempDir = path.join(this.uploadDir, 'temp-files');
    const newPath = path.join(tempDir, fileName);

    try {
      this.ensureDirectoryStructure();
      fs.renameSync(filePath, newPath);
      console.log(`📦 Arquivo movido para temp-files: ${fileName}`);
    } catch (error) {
      console.error('❌ Erro ao mover arquivo:', error);
    }
  }

  /**
   * Obtém estatísticas de uso de armazenamento
   */
  static getStorageStats(): {
    editais: { count: number; size: number };
    materials: { count: number; size: number };
    knowledgeBase: { count: number; size: number };
    tempFiles: { count: number; size: number };
    total: { count: number; size: number };
  } {
    const dirs = ['editais', 'materials', 'knowledge-base', 'temp-files'];
    const stats = {
      editais: { count: 0, size: 0 },
      materials: { count: 0, size: 0 },
      knowledgeBase: { count: 0, size: 0 },
      tempFiles: { count: 0, size: 0 },
      total: { count: 0, size: 0 }
    };

    for (const dir of dirs) {
      const fullPath = path.join(this.uploadDir, dir);
      if (fs.existsSync(fullPath)) {
        const files = fs.readdirSync(fullPath);
        const dirStats = { count: files.length, size: 0 };

        for (const file of files) {
          const filePath = path.join(fullPath, file);
          const fileStats = fs.statSync(filePath);
          dirStats.size += fileStats.size;
        }

        const statKey = dir === 'knowledge-base' ? 'knowledgeBase' : 
                       dir === 'temp-files' ? 'tempFiles' : dir as keyof typeof stats;
        stats[statKey] = dirStats;
        stats.total.count += dirStats.count;
        stats.total.size += dirStats.size;
      }
    }

    return stats;
  }
}