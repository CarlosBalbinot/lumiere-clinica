// Código de referência do App da Web (Google Apps Script) que recebe as inscrições.
// Ele roda no Google, vinculado à planilha — não é usado pelo GitHub Pages.

const NOME_ABA = 'Inscrições';
const TAMANHOS = ['P', 'M', 'G', 'GG'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const p = e.parameter || {};
    if (p.site) return resposta({ ok: true });

    const nome = limpar(p.nome).slice(0, 120);
    const telefone = String(p.telefone || '').replace(/\D/g, '');
    const tamanho = String(p.tamanho || '').trim().toUpperCase();

    if (nome.split(' ').length < 2) return resposta({ ok: false, erro: 'Nome inválido' });
    if (telefone.length < 10 || telefone.length > 11) return resposta({ ok: false, erro: 'Telefone inválido' });
    if (TAMANHOS.indexOf(tamanho) === -1) return resposta({ ok: false, erro: 'Tamanho inválido' });

    const aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NOME_ABA);
    aba.appendRow([new Date(), nome, formatarTelefone(telefone), tamanho, false]);
    return resposta({ ok: true });
  } catch (erro) {
    return resposta({ ok: false, erro: 'Erro interno' });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return resposta({ ok: true, status: 'Inscrições ELASCE funcionando' });
}

function limpar(texto) {
  let t = String(texto || '').trim().replace(/\s+/g, ' ');
  if (/^[=+\-@]/.test(t)) t = "'" + t;
  return t;
}

function formatarTelefone(n) {
  return n.length === 11
    ? '(' + n.slice(0, 2) + ') ' + n.slice(2, 7) + '-' + n.slice(7)
    : '(' + n.slice(0, 2) + ') ' + n.slice(2, 6) + '-' + n.slice(6);
}

function resposta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
