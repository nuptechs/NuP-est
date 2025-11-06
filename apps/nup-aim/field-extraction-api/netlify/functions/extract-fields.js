// netlify/functions/extract-fields.js

exports.handler = async (event) => {
  const regexes = [
    /^([\wÀ-ú()\/\s\.:;-]{3,}):\s*(.+)$/i,
    /^([\wÀ-ú\s]{3,})\n+(.+)$/i,
    /^([\wÀ-ú\s]{3,})\s+([\wÀ-ú0-9\/-]{2,})$/i
  ];

  const termosIgnorados = [
    'cancelar', 'ações', 'ajuda', 'voltar', 'menu', 'visualizar',
    'arquivo', 'configuração', 'administração', 'painel', 'versão', 'sair'
  ];

  try {
    const body = JSON.parse(event.body);
    const texto = body.text || '';
    const linhas = texto.split(/\n+/).map(l => l.trim()).filter(Boolean);
    const campos = {};

    for (const linha of linhas) {
      if (linha.length < 4) continue;
      const textoNormalizado = linha.toLowerCase();
      if (termosIgnorados.some(t => textoNormalizado.includes(t))) continue;

      for (const regex of regexes) {
        const match = linha.match(regex);
        if (match) {
          const chave = match[1].trim();
          const valor = match[2].trim();
          if (chave.length < 3 || valor.length < 1) continue;
          if (termosIgnorados.includes(chave.toLowerCase())) continue;

          campos[chave] = valor;
          break;
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ fonte: 'regex', campos })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro interno na extração', detalhes: err.message })
    };
  }
};
