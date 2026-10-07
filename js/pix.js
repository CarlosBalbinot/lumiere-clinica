// Gerador de BR Code do Pix estático (padrão EMV / Manual de Padrões do Banco Central)
// Sem dependências e sem backend. Expõe window.Pix.
(function (global) {
  'use strict';

  var LIMITES = { chave: 77, nome: 25, cidade: 15, txid: 25 };

  // Remove acentos e caracteres fora do conjunto aceito pelos bancos
  function semAcentos(texto) {
    return String(texto || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9 .,\-@+]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Campo EMV: ID (2) + tamanho (2) + valor
  function campo(id, valor) {
    var tamanho = String(valor.length);
    if (tamanho.length < 2) tamanho = '0' + tamanho;
    return id + tamanho + valor;
  }

  // CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF), hexadecimal maiúsculo com 4 dígitos
  function crc16(texto) {
    var crc = 0xFFFF;
    for (var i = 0; i < texto.length; i++) {
      crc ^= texto.charCodeAt(i) << 8;
      for (var b = 0; b < 8; b++) {
        crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
        crc &= 0xFFFF;
      }
    }
    return ('0000' + crc.toString(16).toUpperCase()).slice(-4);
  }

  // Normaliza a chave: telefone → +55DDDNUMERO; CPF/CNPJ → só números; e-mail/aleatória → como veio
  function normalizarChave(chave) {
    var c = String(chave || '').trim();
    if (/^\+/.test(c)) return '+' + c.replace(/\D/g, '');
    if (/^[\d.\-\/\s]+$/.test(c)) return c.replace(/\D/g, '');
    return c;
  }

  function gerarBRCode(opcoes) {
    var chave = normalizarChave(opcoes.chave).slice(0, LIMITES.chave);
    var nome = semAcentos(opcoes.nome).toUpperCase().slice(0, LIMITES.nome).trim();
    var cidade = semAcentos(opcoes.cidade).toUpperCase().slice(0, LIMITES.cidade).trim();
    var txid = semAcentos(opcoes.txid || '***').replace(/[^A-Za-z0-9*]/g, '').slice(0, LIMITES.txid) || '***';
    var valor = opcoes.valor != null ? Number(opcoes.valor).toFixed(2) : '';

    if (!chave) throw new Error('Pix: chave obrigatória');

    var payload =
      campo('00', '01') +
      campo('26', campo('00', 'br.gov.bcb.pix') + campo('01', chave)) +
      campo('52', '0000') +
      campo('53', '986') +
      (valor && Number(valor) > 0 ? campo('54', valor) : '') +
      campo('58', 'BR') +
      campo('59', nome) +
      campo('60', cidade) +
      campo('62', campo('05', txid)) +
      '6304';

    return payload + crc16(payload);
  }

  // Teste no console: Pix.testar()
  function testar() {
    // Exemplo do Manual de Padrões para Iniciação do Pix (Banco Central)
    var referencia = '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000' +
      '5204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D';
    var semCrc = referencia.slice(0, -4);
    var esperado = referencia.slice(-4);
    var calculado = crc16(semCrc);

    var casos = [
      { nome: 'CRC do BR Code de referência do Banco Central', ok: calculado === esperado, detalhe: calculado + ' = ' + esperado },
      { nome: 'CRC16-CCITT de "123456789" (check value 29B1)', ok: crc16('123456789') === '29B1', detalhe: crc16('123456789') }
    ];

    casos.forEach(function (c) {
      (c.ok ? console.log : console.error)((c.ok ? '✓ ' : '✗ ') + c.nome + ' — ' + c.detalhe);
    });
    return casos.every(function (c) { return c.ok; });
  }

  var Pix = { gerarBRCode: gerarBRCode, crc16: crc16, normalizarChave: normalizarChave, testar: testar };

  if (typeof module !== 'undefined' && module.exports) module.exports = Pix;
  else global.Pix = Pix;
})(typeof window !== 'undefined' ? window : this);
