// Teste direto do scraper Cebraspe usando Playwright
import { browserScraperService } from './server/services/browser-scraper.js';

async function testCebraspeScraper() {
  console.log('🚀 Iniciando teste do scraper Cebraspe...');
  
  const url = 'https://www.cebraspe.org.br/concursos/encerrado';
  
  try {
    console.log(`📄 Testando URL: ${url}`);
    
    const result = await browserScraperService.scrapeCebraspePage(url);
    
    console.log('\n📊 RESULTADOS:');
    console.log(`✅ Sucesso: ${result.success}`);
    console.log(`📝 Conteúdo extraído: ${result.content ? result.content.length : 0} caracteres`);
    console.log(`🎯 Concursos encontrados: ${result.concursos?.length || 0}`);
    
    if (result.concursos && result.concursos.length > 0) {
      console.log('\n🏛️ CONCURSOS EXTRAÍDOS:');
      result.concursos.slice(0, 5).forEach((concurso, index) => {
        console.log(`\n${index + 1}. ${concurso.titulo}`);
        console.log(`   📄 Texto: ${concurso.texto.substring(0, 100)}...`);
        console.log(`   🔗 Link: ${concurso.link}`);
      });
      
      if (result.concursos.length > 5) {
        console.log(`\n... e mais ${result.concursos.length - 5} concursos`);
      }
    } else {
      console.log('\n❌ Nenhum concurso foi extraído');
      if (result.error) {
        console.log(`💥 Erro: ${result.error}`);
      }
    }
    
  } catch (error) {
    console.error('💥 Erro no teste:', error);
  } finally {
    await browserScraperService.closeBrowser();
    console.log('\n🔒 Teste concluído!');
  }
}

testCebraspeScraper();