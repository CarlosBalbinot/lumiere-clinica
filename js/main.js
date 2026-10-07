// ELASCE · Outubro Rosa — interações
(function () {
  'use strict';

  var CONFIG = {
    planilhaUrl: 'https://script.google.com/macros/s/AKfycbx33uBiRuxvGa6TMwLnZdqYNOAQCgj5oZ7LeQa5-supQvozyn1N-t5LekpXCPxRAjuDYA/exec',
    timeoutMs: 30000,

    pix: {
      chave: 'anaclara1bosco@gmail.com', // e-mail · telefone: +55DDDNUMERO · CPF/CNPJ: só números
      nome: 'Ana Clara Bosco',
      cidade: 'Guapore',
      valor: 89.00,
      txid: 'ELASCE'
    },

    // WhatsApp da idealizadora (com DDI 55) para receber os comprovantes
    whatsapp: '5554996033946'
  };

  // Dados guardados em memória para a etapa do Pix
  var inscricao = { nome: '', tamanho: '' };

  var reduzMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =========================================================
     Fade-in ao rolar
     ========================================================= */
  (function revelar() {
    var items = document.querySelectorAll('.reveal');

    if (reduzMovimento || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    items.forEach(function (el) { observer.observe(el); });
  })();

  /* =========================================================
     Formulário de inscrição
     ========================================================= */
  var form = document.getElementById('form-inscricao');
  if (!form) return;

  var campoNome = form.elements.nome;
  var campoTelefone = form.elements.telefone;
  var radiosTamanho = form.querySelectorAll('input[name="tamanho"]');
  var grupoTamanho = form.querySelector('.campo--tamanho');
  var campoSite = form.elements.site;
  var status = document.getElementById('form-status');
  var botao = document.getElementById('btn-enviar');
  var textoBotao = botao.querySelector('.btn__texto');
  var enviando = false;

  var MENSAGENS = {
    nome: 'Conte pra gente seu nome e sobrenome, por favor.',
    telefone: 'Esse número parece incompleto. Confira o DDD e os dígitos?',
    tamanho: 'Escolha o tamanho da sua camiseta.',
    timeout: 'A conexão demorou mais que o esperado. Respire fundo e tente novamente, por favor.',
    rede: 'Não conseguimos enviar sua inscrição agora. Confira sua conexão e tente novamente.',
    servidor: 'Algo não saiu como esperado do nosso lado. Tente novamente em instantes.'
  };

  // Erros devolvidos pelo Apps Script → mensagens no tom do convite
  var ERROS_SERVIDOR = {
    'Nome inválido': MENSAGENS.nome,
    'Telefone inválido': MENSAGENS.telefone,
    'Tamanho inválido': MENSAGENS.tamanho
  };

  /* ---------- Utilitários ---------- */
  function normalizarNome(valor) {
    return String(valor || '').trim().replace(/\s+/g, ' ');
  }

  function somenteDigitos(valor) {
    return String(valor || '').replace(/\D/g, '');
  }

  function mascararTelefone(valor) {
    var d = somenteDigitos(valor).slice(0, 11);
    if (d.length === 0) return '';
    if (d.length <= 2) return '(' + d;
    if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  }

  function tamanhoSelecionado() {
    var marcado = form.querySelector('input[name="tamanho"]:checked');
    return marcado ? marcado.value : '';
  }

  function mostrarErro(campo, elementoInvalido, mensagem) {
    var erro = document.getElementById('erro-' + campo);
    erro.textContent = mensagem || '';
    elementoInvalido.setAttribute('aria-invalid', mensagem ? 'true' : 'false');
  }

  /* ---------- Validações ---------- */
  function validarNome() {
    var palavras = normalizarNome(campoNome.value).split(' ').filter(Boolean);
    var ok = palavras.length >= 2;
    mostrarErro('nome', campoNome, ok ? '' : MENSAGENS.nome);
    return ok;
  }

  function validarTelefone() {
    var n = somenteDigitos(campoTelefone.value).length;
    var ok = n === 10 || n === 11;
    mostrarErro('telefone', campoTelefone, ok ? '' : MENSAGENS.telefone);
    return ok;
  }

  function validarTamanho() {
    var ok = tamanhoSelecionado() !== '';
    mostrarErro('tamanho', grupoTamanho, ok ? '' : MENSAGENS.tamanho);
    return ok;
  }

  /* ---------- Eventos dos campos ---------- */
  campoTelefone.addEventListener('input', function () {
    campoTelefone.value = mascararTelefone(campoTelefone.value);
    if (campoTelefone.getAttribute('aria-invalid') === 'true') validarTelefone();
  });

  campoNome.addEventListener('input', function () {
    if (campoNome.getAttribute('aria-invalid') === 'true') validarNome();
  });

  // Valida ao sair do campo, só se algo foi digitado (sem broncas antecipadas)
  campoNome.addEventListener('blur', function () {
    if (campoNome.value.trim()) validarNome();
  });
  campoTelefone.addEventListener('blur', function () {
    if (campoTelefone.value.trim()) validarTelefone();
  });

  radiosTamanho.forEach(function (radio) {
    radio.addEventListener('change', validarTamanho);
  });

  /* ---------- Estado do botão ---------- */
  function definirCarregando(ativo) {
    enviando = ativo;
    botao.disabled = ativo;
    botao.classList.toggle('is-loading', ativo);
    botao.setAttribute('aria-busy', ativo ? 'true' : 'false');
    textoBotao.textContent = ativo ? 'Enviando…' : 'Confirmar inscrição';
  }

  function mostrarStatus(mensagem) {
    status.textContent = mensagem || '';
  }

  /* ---------- Envio ---------- */
  function enviar(dados) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, CONFIG.timeoutMs);

    // Corpo URLSearchParams e nenhum header customizado: requisição "simples", sem preflight de CORS
    return fetch(CONFIG.planilhaUrl, {
      method: 'POST',
      body: new URLSearchParams(dados),
      redirect: 'follow',
      signal: controller.signal
    })
      .then(function (resposta) {
        // A requisição chegou. Se o JSON não puder ser lido (CORS/opaco), consideramos sucesso.
        return resposta.json().catch(function () {
          return { ok: true, semLeitura: true };
        });
      })
      .finally(function () { clearTimeout(timer); });
  }

  form.addEventListener('submit', function (evento) {
    evento.preventDefault();
    if (enviando) return; // bloqueio contra duplo clique

    mostrarStatus('');

    var validos = [validarNome(), validarTelefone(), validarTamanho()];
    if (validos.indexOf(false) !== -1) {
      var primeiroInvalido = !validos[0] ? campoNome
        : !validos[1] ? campoTelefone
        : radiosTamanho[0];
      primeiroInvalido.focus();
      return;
    }

    var dados = {
      nome: normalizarNome(campoNome.value),
      telefone: somenteDigitos(campoTelefone.value),
      tamanho: tamanhoSelecionado(),
      site: campoSite.value
    };

    definirCarregando(true);

    enviar(dados)
      .then(function (resultado) {
        if (resultado && resultado.ok) {
          inscricao.nome = dados.nome;
          inscricao.tamanho = dados.tamanho;
          irParaPix();
          return;
        }
        var erro = resultado && resultado.erro;
        mostrarStatus(ERROS_SERVIDOR[erro] || MENSAGENS.servidor);
        definirCarregando(false);
      })
      .catch(function (erro) {
        mostrarStatus(erro && erro.name === 'AbortError' ? MENSAGENS.timeout : MENSAGENS.rede);
        definirCarregando(false);
      });
  });

  /* =========================================================
     Transição para a etapa do Pix
     ========================================================= */
  function irParaPix() {
    var etapaForm = document.getElementById('etapa-form');
    var etapaPix = document.getElementById('etapa-pix');
    var tituloPix = document.getElementById('titulo-pix');

    etapaPix.querySelector('[data-primeiro-nome]').textContent = inscricao.nome.split(' ')[0];
    prepararPix();

    function trocar() {
      etapaForm.hidden = true;
      etapaForm.classList.remove('is-saindo');
      etapaPix.hidden = false;
      if (!reduzMovimento) etapaPix.classList.add('is-entrando');

      var secao = document.getElementById('inscricao');
      secao.scrollIntoView({ behavior: reduzMovimento ? 'auto' : 'smooth', block: 'start' });
      tituloPix.focus({ preventScroll: true });
    }

    if (reduzMovimento) {
      trocar();
    } else {
      etapaForm.classList.add('is-saindo');
      setTimeout(trocar, 450);
    }
  }

  /* =========================================================
     Etapa do Pix
     ========================================================= */
  var codigoPix = '';
  var pixPronto = false;

  function formatarValor(valor) {
    return Number(valor).toFixed(2).replace('.', ',');
  }

  function prepararPix() {
    var avisoCopia = document.getElementById('pix-aviso-copia');
    var linkWhatsapp = document.getElementById('btn-whatsapp');

    // Link do WhatsApp sempre com os dados mais recentes da inscrição
    var mensagem = 'Olá! Sou ' + inscricao.nome + ', fiz minha inscrição no ELASCE (camiseta ' +
      inscricao.tamanho + ') e segue meu comprovante do Pix 🎀';
    linkWhatsapp.href = 'https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(mensagem);

    if (pixPronto) return;
    pixPronto = true;

    codigoPix = window.Pix.gerarBRCode(CONFIG.pix);
    var chave = window.Pix.normalizarChave(CONFIG.pix.chave);

    document.querySelector('[data-pix-valor]').textContent = formatarValor(CONFIG.pix.valor);
    document.getElementById('pix-qr').setAttribute('aria-label',
      'QR Code do Pix no valor de R$ ' + formatarValor(CONFIG.pix.valor));
    document.getElementById('pix-chave').textContent = chave;

    desenharQrCode(codigoPix);

    configurarCopia(document.getElementById('btn-copiar-codigo'), function () { return codigoPix; },
      'Código Pix copiado.', avisoCopia);
    configurarCopia(document.getElementById('btn-copiar-chave'), function () { return chave; },
      'Chave Pix copiada.', avisoCopia);
  }

  function desenharQrCode(texto) {
    var alvo = document.getElementById('pix-qr');
    var moldura = alvo.closest('.pix__moldura');
    try {
      if (typeof window.QRCode !== 'function') throw new Error('qrcodejs indisponível');
      new window.QRCode(alvo, {
        text: texto,
        width: 416,              // desenhado em 2x para ficar nítido; exibido em 208px
        height: 416,
        colorDark: '#9B4555',
        colorLight: '#FFF8F7',
        correctLevel: window.QRCode.CorrectLevel.M
      });
      alvo.removeAttribute('title'); // a biblioteca coloca o código inteiro como title
      var img = alvo.querySelector('img');
      if (img) img.alt = '';
    } catch (erro) {
      moldura.classList.add('sem-qr');
      document.getElementById('pix-qr-falha').hidden = false;
    }
  }

  function copiarTexto(texto) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(texto).catch(function () {
        return copiarComSelecao(texto);
      });
    }
    return copiarComSelecao(texto);
  }

  // Alternativa para navegadores antigos, páginas sem HTTPS ou permissão negada
  function copiarComSelecao(texto) {
    return new Promise(function (resolve, reject) {
      var area = document.createElement('textarea');
      area.value = texto;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.left = '-9999px';
      document.body.appendChild(area);
      area.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(area);
      ok ? resolve() : reject(new Error('cópia indisponível'));
    });
  }

  function configurarCopia(botao, obterTexto, mensagemLeitor, avisoCopia) {
    var texto = botao.querySelector('.btn__texto');
    var original = texto.textContent;
    var timer;

    botao.addEventListener('click', function () {
      copiarTexto(obterTexto())
        .then(function () {
          texto.textContent = 'Copiado ✓';
          botao.classList.add('is-copiado');
          avisoCopia.textContent = mensagemLeitor;
        })
        .catch(function () {
          texto.textContent = 'Não foi possível copiar';
          avisoCopia.textContent = 'Não foi possível copiar. Tente selecionar manualmente.';
        })
        .then(function () {
          clearTimeout(timer);
          timer = setTimeout(function () {
            texto.textContent = original;
            botao.classList.remove('is-copiado');
            avisoCopia.textContent = '';
          }, 2500);
        });
    });
  }

  // Dados da inscrição disponíveis para depuração no console
  window.ELASCE = { inscricao: inscricao };
})();
