import { db } from "./db";
import { sql } from "drizzle-orm";
import { hashPassword } from "./auth/password";
import { promises as fs } from "fs";
import path from "path";
import { nanoid } from "nanoid";

async function seed() {
  console.log("🌱 [SEED] Iniciando seed do NuPIdentity...\n");
  
  try {
    // 1. Criar organização exemplo (NuPtechs)
    console.log("🏢 [SEED] Criando organização NuPtechs...");
    const orgId = nanoid();
    await db.execute(sql`
      INSERT INTO organizations (id, name, slug, parent_id, settings, status)
      VALUES (${orgId}, 'NuPtechs', 'nuptechs', NULL, '{"features": ["all"]}', 'active')
      ON CONFLICT (slug) DO NOTHING
    `);
    
    const orgResult = await db.execute(sql`SELECT id FROM organizations WHERE slug = 'nuptechs'`);
    const actualOrgId = orgResult.rows[0]?.id;
    console.log(`✅ [SEED] Organização NuPtechs criada (${actualOrgId})`);
    
    // 2. Registrar sistema NuP-Kan
    console.log("\n📦 [SEED] Registrando sistema NuP-Kan...");
    await db.execute(sql`
      INSERT INTO systems (id, name, description, api_url, is_active)
      VALUES ('nup-kan', 'NuP-Kan - Sistema Kanban', 'Sistema de gerenciamento de projetos com quadros Kanban', 'http://localhost:5000', true)
      ON CONFLICT (id) DO NOTHING
    `);
    console.log("✅ [SEED] Sistema NuP-Kan registrado");
    
    // 3. Associar sistema à organização
    console.log("\n🔗 [SEED] Associando NuP-Kan à organização...");
    await db.execute(sql`
      INSERT INTO organization_systems (id, organization_id, system_id, is_active, settings)
      VALUES (${nanoid()}, ${actualOrgId}, 'nup-kan', true, '{"features": ["boards", "tasks", "sprints"]}')
      ON CONFLICT DO NOTHING
    `);
    console.log("✅ [SEED] NuP-Kan associado à NuPtechs");
    
    // 4. Sincronizar funções do permissions.json
    console.log("\n🔄 [SEED] Sincronizando funções do permissions.json...");
    const permissionsPath = path.join(process.cwd(), "permissions.json");
    const permissionsData = JSON.parse(await fs.readFile(permissionsPath, "utf-8"));
    
    for (const func of permissionsData.functions) {
      const functionId = `nup-kan-${func.key}`;
      await db.execute(sql`
        INSERT INTO functions (id, system_id, function_key, name, category, description, endpoint)
        VALUES (${functionId}, 'nup-kan', ${func.key}, ${func.name}, ${func.category || ''}, ${func.description || ''}, ${func.endpoint || ''})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          description = EXCLUDED.description,
          endpoint = EXCLUDED.endpoint,
          updated_at = NOW()
      `);
    }
    console.log(`✅ [SEED] ${permissionsData.functions.length} funções sincronizadas`);
    
    // 5. Criar perfil "Administrador Global"
    console.log("\n👑 [SEED] Criando perfil Administrador Global...");
    const profileId = nanoid();
    await db.execute(sql`
      INSERT INTO identity_profiles (id, name, description, color, is_default, is_global, system_id)
      VALUES (${profileId}, 'Administrador Global', 'Acesso total a todos os sistemas', '#dc2626', false, true, NULL)
      ON CONFLICT (name) DO NOTHING
    `);
    console.log("✅ [SEED] Perfil Administrador Global criado");
    
    const profileResult = await db.execute(sql`SELECT id FROM identity_profiles WHERE name = 'Administrador Global'`);
    const actualProfileId = profileResult.rows[0]?.id;
    
    // 6. Atribuir todas as funções ao perfil admin
    console.log("\n🔗 [SEED] Atribuindo permissões ao perfil admin...");
    const functionsResult = await db.execute(sql`SELECT id FROM functions WHERE system_id = 'nup-kan'`);
    
    for (const func of functionsResult.rows) {
      await db.execute(sql`
        INSERT INTO identity_profile_functions (id, profile_id, function_id, granted)
        VALUES (${nanoid()}, ${actualProfileId}, ${func.id}, true)
        ON CONFLICT DO NOTHING
      `);
    }
    console.log(`✅ [SEED] ${functionsResult.rows.length} permissões atribuídas`);
    
    // 7. Criar usuário admin
    console.log("\n👤 [SEED] Criando usuário admin...");
    const adminEmail = "yfaf01@gmail.com";
    const adminPassword = "123456";
    const passwordHash = await hashPassword(adminPassword);
    
    await db.execute(sql`
      INSERT INTO identity_users (id, email, name, password, avatar, organization_id, status)
      VALUES (${nanoid()}, ${adminEmail}, 'Administrador', ${passwordHash}, '', ${actualOrgId}, 'active')
      ON CONFLICT (email) DO NOTHING
    `);
    
    const userResult = await db.execute(sql`SELECT id FROM identity_users WHERE email = ${adminEmail}`);
    const userId = userResult.rows[0]?.id;
    console.log(`✅ [SEED] Usuário admin criado (${adminEmail})`);
    
    // 8. Associar usuário admin ao perfil
    console.log("\n🔗 [SEED] Associando usuário admin ao perfil...");
    await db.execute(sql`
      INSERT INTO identity_user_profiles (id, user_id, profile_id)
      VALUES (${nanoid()}, ${userId}, ${actualProfileId})
      ON CONFLICT DO NOTHING
    `);
    console.log("✅ [SEED] Usuário admin associado ao perfil");
    
    // 9. Criar time exemplo
    console.log("\n👥 [SEED] Criando time Desenvolvimento...");
    const teamId = nanoid();
    await db.execute(sql`
      INSERT INTO teams (id, organization_id, name, description, color, is_active)
      VALUES (${teamId}, ${actualOrgId}, 'Desenvolvimento', 'Time de desenvolvimento de software', '#3b82f6', true)
      ON CONFLICT DO NOTHING
    `);
    
    const teamResult = await db.execute(sql`SELECT id FROM teams WHERE name = 'Desenvolvimento'`);
    const actualTeamId = teamResult.rows[0]?.id;
    console.log("✅ [SEED] Time Desenvolvimento criado");
    
    // 10. Adicionar admin ao time
    console.log("\n🔗 [SEED] Adicionando admin ao time...");
    await db.execute(sql`
      INSERT INTO user_teams (id, user_id, team_id, role)
      VALUES (${nanoid()}, ${userId}, ${actualTeamId}, 'admin')
      ON CONFLICT DO NOTHING
    `);
    console.log("✅ [SEED] Admin adicionado ao time");
    
    // Resumo
    console.log("\n" + "=".repeat(60));
    console.log("🎉 [SEED] Seed concluído com sucesso!");
    console.log("=".repeat(60));
    console.log(`
📊 Resumo:
   • Organização: NuPtechs (${actualOrgId})
   • Sistema: NuP-Kan - Sistema Kanban
   • Funções: ${permissionsData.functions.length}
   • Perfil: Administrador Global
   • Usuário: ${adminEmail}
   • Time: Desenvolvimento
   
🔐 Credenciais de acesso:
   Email: ${adminEmail}
   Senha: ${adminPassword}
   
🏗️ Estrutura Enterprise:
   ✅ Multi-tenancy (Organizations)
   ✅ Sistema associado à organização
   ✅ Usuário vinculado à organização
   ✅ Time criado dentro da organização
   ✅ Usuário membro do time
   
🚀 Próximos passos:
   1. Iniciar servidor: npm run dev
   2. Fazer login na Central
    `);
    
  } catch (error) {
    console.error("❌ [SEED] Erro durante seed:", error);
    throw error;
  }
}

seed()
  .then(() => {
    console.log("✅ [SEED] Processo finalizado");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ [SEED] Falha:", error);
    process.exit(1);
  });
