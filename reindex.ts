import { db } from './server/db';
import { materials } from './shared/schema';
import { eq } from 'drizzle-orm';
import { TextChunker } from './server/services/chunking/TextChunker';
import { bm25Service } from './server/services/rag/BM25Service';
import { pineconeService } from './server/services/pinecone';

const userId = '47117879';

async function reindex() {
  console.log(`\n🔄 Iniciando reindexação COMPLETA\n`);

  const allMaterials = await db
    .select()
    .from(materials)
    .where(eq(materials.userId, userId));
  
  if (allMaterials.length === 0) {
    console.log("❌ Nenhum material encontrado");
    process.exit(1);
  }

  console.log(`📚 Encontrados ${allMaterials.length} materiais totais\n`);

  let success = 0, failed = 0, skipped = 0, totalChunks = 0;
  let current = 1;

  for (const material of allMaterials) {
    console.log(`\n[${current}/${allMaterials.length}] ----------------------------------------`);
    current++;
    try {
      console.log(`📄 ${material.title}`);

      if (!material.content) {
        console.log(`⏭️  Pulando - sem conteúdo\n`);
        skipped++;
        continue;
      }

      const chunks = await TextChunker.chunk(material.content, 'rag-chat');
      console.log(`✂️  ${chunks.length} chunks`);

      const chunksForPinecone = chunks.map((chunk: any, index: number) => ({
        content: chunk.text,
        chunkIndex: index,
        keywords: bm25Service.extractKeywords(chunk.text, 15),
      }));

      await pineconeService.upsertDocument(
        material.id,
        chunksForPinecone,
        {
          userId: material.userId,
          title: material.title,
          category: material.subjectId || 'Geral',
          materialId: material.id,
        }
      );

      success++;
      totalChunks += chunks.length;
      console.log(`✅ Reindexado\n`);
    } catch (error: any) {
      console.error(`❌ ${error.message}\n`);
      failed++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎉 REINDEXAÇÃO COMPLETA!`);
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Sucesso: ${success}/${allMaterials.length}`);
  console.log(`❌ Falhas: ${failed}`);
  console.log(`⏭️  Pulados (sem conteúdo): ${skipped}`);
  console.log(`📦 Total de chunks reindexados: ${totalChunks.toLocaleString()}`);
  console.log(`${'='.repeat(60)}\n`);
  
  process.exit(0);
}

reindex().catch(err => {
  console.error("\n❌ Erro fatal:", err);
  process.exit(1);
});
