/**
 * Script de Migração: Learning Difficulties
 * 
 * Migra dados de users.customDifficulties (deprecated) para as tabelas relacionais:
 * - learningDifficultiesCatalog
 * - userLearningDifficulties
 * 
 * Executar com: tsx scripts/migrate-learning-difficulties.ts
 */

import { db } from "../server/db";
import { 
  users, 
  learningDifficultiesCatalog, 
  userLearningDifficulties 
} from "../shared/schema";
import { eq, isNotNull, and } from "drizzle-orm";

// Mapa de dificuldades conhecidas para o catálogo
const KNOWN_DIFFICULTIES: Record<string, { 
  displayName: string; 
  category: string; 
  description: string 
}> = {
  "ADHD": {
    displayName: "TDAH (Transtorno de Déficit de Atenção e Hiperatividade)",
    category: "neurological",
    description: "Dificuldade em manter atenção, hiperatividade e impulsividade"
  },
  "Dyslexia": {
    displayName: "Dislexia",
    category: "cognitive",
    description: "Dificuldade no processamento de linguagem escrita e leitura"
  },
  "Autism": {
    displayName: "Autismo (TEA)",
    category: "neurological",
    description: "Transtorno do Espectro Autista - dificuldades em comunicação e interação social"
  },
  "Dyscalculia": {
    displayName: "Discalculia",
    category: "cognitive",
    description: "Dificuldade em compreender números e conceitos matemáticos"
  },
  "Dysgraphia": {
    displayName: "Disgrafia",
    category: "cognitive",
    description: "Dificuldade na escrita manual e organização de texto escrito"
  },
  "Anxiety": {
    displayName: "Ansiedade",
    category: "emotional",
    description: "Transtorno de ansiedade que afeta concentração e desempenho"
  },
  "Depression": {
    displayName: "Depressão",
    category: "emotional",
    description: "Depressão que impacta motivação e capacidade de aprendizado"
  },
  "Visual Impairment": {
    displayName: "Deficiência Visual",
    category: "sensory",
    description: "Dificuldade visual que requer adaptações no material de estudo"
  },
  "Hearing Impairment": {
    displayName: "Deficiência Auditiva",
    category: "sensory",
    description: "Dificuldade auditiva que requer adaptações na apresentação do conteúdo"
  }
};

async function migrateLearningDifficulties() {
  console.log("🔄 Iniciando migração de Learning Difficulties...\n");

  try {
    // 1. Buscar usuários com customDifficulties
    const usersWithDifficulties = await db
      .select({
        id: users.id,
        customDifficulties: users.customDifficulties
      })
      .from(users)
      .where(isNotNull(users.customDifficulties));

    console.log(`📊 Encontrados ${usersWithDifficulties.length} usuários com customDifficulties\n`);

    if (usersWithDifficulties.length === 0) {
      console.log("✅ Nenhum usuário para migrar. Encerrando.");
      return;
    }

    // 2. Criar/buscar dificuldades no catálogo
    const catalogMap = new Map<string, string>(); // name -> id

    for (const [name, info] of Object.entries(KNOWN_DIFFICULTIES)) {
      const existing = await db
        .select()
        .from(learningDifficultiesCatalog)
        .where(eq(learningDifficultiesCatalog.name, name))
        .limit(1);

      if (existing.length > 0) {
        catalogMap.set(name.toLowerCase(), existing[0].id);
        console.log(`✓ Catálogo: ${name} já existe`);
      } else {
        const [newDifficulty] = await db
          .insert(learningDifficultiesCatalog)
          .values({
            name,
            displayName: info.displayName,
            category: info.category,
            description: info.description,
            commonStrategies: []
          })
          .returning();
        
        catalogMap.set(name.toLowerCase(), newDifficulty.id);
        console.log(`+ Catálogo: ${name} criado`);
      }
    }

    console.log(`\n📋 Catálogo preparado com ${catalogMap.size} dificuldades\n`);

    // 3. Migrar dados de cada usuário
    let migratedCount = 0;
    let skippedCount = 0;

    for (const user of usersWithDifficulties) {
      if (!user.customDifficulties) continue;

      console.log(`\n👤 Processando usuário ${user.id}...`);
      
      // Parse do campo customDifficulties
      // Pode ser: "ADHD,Dyslexia" ou "ADHD, Dyslexia" ou JSON array
      let difficulties: string[] = [];
      
      try {
        // Tentar parse como JSON primeiro
        const parsed = JSON.parse(user.customDifficulties);
        
        // Garantir que é array
        if (Array.isArray(parsed)) {
          difficulties = parsed.filter(d => typeof d === 'string' && d.trim().length > 0);
        } else if (typeof parsed === 'string') {
          // Se for string, tratar como CSV
          difficulties = parsed.split(',').map(d => d.trim()).filter(d => d.length > 0);
        }
      } catch {
        // Se falhar, tratar como CSV
        difficulties = user.customDifficulties
          .split(',')
          .map(d => d.trim())
          .filter(d => d.length > 0);
      }

      console.log(`  Dificuldades: ${difficulties.join(', ')}`);

      // Criar registros em userLearningDifficulties
      for (const diffName of difficulties) {
        const normalizedName = diffName.toLowerCase();
        const difficultyId = catalogMap.get(normalizedName);

        if (!difficultyId) {
          console.log(`  ⚠️  "${diffName}" não encontrado no catálogo - criando entrada específica`);
          
          // Criar entrada única para cada dificuldade desconhecida
          const uniqueName = `Other_${diffName.replace(/[^a-zA-Z0-9]/g, '_')}`;
          const uniqueKey = uniqueName.toLowerCase();
          
          let uniqueDiffId = catalogMap.get(uniqueKey);
          if (!uniqueDiffId) {
            // Verificar se já existe no banco (idempotência)
            const existingCatalog = await db
              .select()
              .from(learningDifficultiesCatalog)
              .where(eq(learningDifficultiesCatalog.name, uniqueName))
              .limit(1);
            
            if (existingCatalog.length > 0) {
              uniqueDiffId = existingCatalog[0].id;
            } else {
              const [newDiff] = await db
                .insert(learningDifficultiesCatalog)
                .values({
                  name: uniqueName,
                  displayName: `Outra: ${diffName}`,
                  category: 'other',
                  description: `Dificuldade personalizada migrada: ${diffName}`,
                  commonStrategies: []
                })
                .returning();
              uniqueDiffId = newDiff.id;
            }
            catalogMap.set(uniqueKey, uniqueDiffId);
          }
          
          // Verificar duplicatas antes de inserir (query específica)
          const existingUserDiff = await db
            .select()
            .from(userLearningDifficulties)
            .where(
              and(
                eq(userLearningDifficulties.userId, user.id),
                eq(userLearningDifficulties.difficultyId, uniqueDiffId)
              )
            )
            .limit(1);
          
          if (existingUserDiff.length > 0) {
            console.log(`  - "${diffName}" já migrado (desconhecida), pulando`);
            skippedCount++;
            continue;
          }
          
          // Criar registro
          await db.insert(userLearningDifficulties).values({
            userId: user.id,
            difficultyId: uniqueDiffId,
            severity: 'moderate',
            diagnosedBy: 'self_reported',
            notes: `Migrado automaticamente de: ${diffName}`
          });
          
          console.log(`  ✓ "${diffName}" migrado como entrada única`);
          migratedCount++;
          continue;
        }

        // Verificar se já existe (query específica com AND)
        const existing = await db
          .select()
          .from(userLearningDifficulties)
          .where(
            and(
              eq(userLearningDifficulties.userId, user.id),
              eq(userLearningDifficulties.difficultyId, difficultyId)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          console.log(`  - "${diffName}" já migrado, pulando`);
          skippedCount++;
          continue;
        }

        // Criar registro
        await db.insert(userLearningDifficulties).values({
          userId: user.id,
          difficultyId,
          severity: 'moderate', // default
          diagnosedBy: 'self_reported', // migração assume auto-relatado
          notes: 'Migrado automaticamente do campo customDifficulties'
        });

        console.log(`  ✓ "${diffName}" migrado`);
        migratedCount++;
      }

      // 4. Limpar campo deprecated (opcional - comentado por segurança)
      // await db.update(users)
      //   .set({ customDifficulties: null })
      //   .where(eq(users.id, user.id));
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ Migração concluída!");
    console.log(`📊 Estatísticas:`);
    console.log(`   - Usuários processados: ${usersWithDifficulties.length}`);
    console.log(`   - Dificuldades migradas: ${migratedCount}`);
    console.log(`   - Registros pulados (duplicados): ${skippedCount}`);
    console.log("=".repeat(60));

    console.log("\n⚠️  PRÓXIMO PASSO:");
    console.log("   Execute manualmente para limpar campos deprecated:");
    console.log("   UPDATE users SET custom_difficulties = NULL WHERE custom_difficulties IS NOT NULL;");

  } catch (error) {
    console.error("\n❌ Erro durante migração:", error);
    throw error;
  }
}

// Executar migração
migrateLearningDifficulties()
  .then(() => {
    console.log("\n✨ Script finalizado com sucesso");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Script finalizado com erro:", error);
    process.exit(1);
  });
