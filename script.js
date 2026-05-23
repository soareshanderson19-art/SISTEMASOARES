// =========================================================================
// CONFIGURAÇÃO REAL DO FIREBASE - SOARES EXPRESS
// =========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyB4geo_1lUH5FZaEufgVgiPAQU4ukV0e9Y",
    authDomain: "soares-express-dbfc9.firebaseapp.com",
    databaseURL: "https://soares-express-dbfc9-default-rtdb.firebaseio.com",
    projectId: "soares-express-dbfc9",
    storageBucket: "soares-express-dbfc9.firebasestorage.app",
    messagingSenderId: "818067128420",
    appId: "1:818067128420:web:538f7eb33636f4cfcbdf71"
};

let database = null;
let clientes = [];
let entregas = [];
let historicoFechamentos = [];

// Inicializador Geral do Sistema
document.addEventListener("DOMContentLoaded", function() {
    console.log("SISTEMA: Inicializando...");

    if(document.getElementById('date-input')) {
        document.getElementById('date-input').valueAsDate = new Date();
    }
    
    // Configura as abas primeiro para garantir o funcionamento
    configurarCliqueAbas();

    try {
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        console.log("FIREBASE: Conectado com sucesso!");
        inicializarOuvintesFirebase();
    } catch (erro) {
        console.error("Erro ao conectar no Firebase: ", erro);
    }

    configurarFormularioCliente();
    configurarFormularioEntrega();

    const filtroCliente = document.getElementById('filtro-cliente');
    if(filtroCliente) {
        filtroCliente.addEventListener('change', atualizarTabelaEntregas);
    }

    // Vinculação correta e segura dos botões do PDF usando os IDs reais do seu HTML
    const btnVisualizar = document.getElementById('btn-pdf-visualizar');
    const btnEnviar = document.getElementById('btn-pdf-enviar');
    const btnFechar = document.getElementById('btn-pdf-fechar');

    if(btnVisualizar) btnVisualizar.addEventListener('click', () => gerenciarPDF('visualizar'));
    if(btnEnviar) btnEnviar.addEventListener('click', () => gerenciarPDF('enviar'));
    if(btnFechar) btnFechar.addEventListener('click', () => gerenciarPDF('fechar'));
});

function inicializarOuvintesFirebase() {
    if (!database) return;

    database.ref('clientes').on('value', (snapshot) => {
        const dados = snapshot.val();
        clientes = [];
        if (dados) {
            Object.keys(dados).forEach(key => {
                let nomeCli = "";
                if (dados[key] && typeof dados[key] === 'object' && dados[key].nome) {
                    nomeCli = dados[key].nome;
                } else if (typeof dados[key] === 'string') {
                    nomeCli = dados[key];
                }
                if(nomeCli) clientes.push({ fbKey: key, nome: nomeCli });
            });
        }
        renderClientes();
    });

    database.ref('entregas').on('value', (snapshot) => {
        const dados = snapshot.val();
        entregas = [];
        if (dados) {
            Object.keys(dados).forEach(key => {
                entregas.push({ fbKey: key, ...dados[key] });
            });
        }
        atualizarTabelaEntregas();
    });

    database.ref('historico').on('value', (snapshot) => {
        const dados = snapshot.val();
        historicoFechamentos = [];
        if (dados) {
            Object.keys(dados).forEach(key => {
                historicoFechamentos.push({ fbKey: key, ...dados[key] });
            });
        }
        atualizarHistoricoFechados();
    });
}

function configurarFormularioCliente() {
    const formCliente = document.getElementById('form-cliente');
    if(!formCliente) return;

    formCliente.addEventListener('submit', function(e){
        e.preventDefault();
        const inputNome = document.getElementById('nome-cliente');
        if(!inputNome) return;

        const nomeInput = inputNome.value.trim();
        if(!nomeInput) return;
        
        const existe = clientes.some(c => c.nome.toLowerCase() === nomeInput.toLowerCase());

        if(!existe && database) {
            database.ref('clientes').push({ nome: nomeInput }).then(() => {
                formCliente.reset();
                alert('Cliente cadastrado com sucesso!');
            }).catch(error => console.error("Erro ao salvar cliente: ", error));
        } else if (existe) {
            alert('Este cliente já está cadastrado!');
        }
    });
}

function configurarFormularioEntrega() {
    const formEntrega = document.getElementById('form-entrega');
    if(!formEntrega) return;

    formEntrega.addEventListener('submit', function(e){
        e.preventDefault();
        const selectCliente = document.getElementById('select-cliente-entrega');
        if(!selectCliente || !selectCliente.value) {
            alert("Por favor, selecione um cliente válido!");
            return;
        }

        const novaEntrega = {
            id: Date.now(),
            cliente: selectCliente.value,
            data: document.getElementById('date-input').value,
            coleta: document.getElementById('end-coleta').value,
            entrega: document.getElementById('end-entrega').value,
            retorno: document.querySelector('input[name="retorno"]:checked').value,
            express: document.querySelector('input[name="express"]:checked').value,
            espera: document.getElementById('espera').value,
            valor: parseFloat(document.getElementById('valor').value)
        };
        
        if (database) {
            database.ref('entregas').push(novaEntrega).then(() => {
                alert('Entrega lançada com sucesso!');
                document.getElementById('end-coleta').value = '';
                document.getElementById('end-entrega').value = '';
                document.getElementById('valor').value = '';
            }).catch(error => console.error("Erro ao salvar entrega: ", error));
        }
    });
}

function renderClientes() {
    const lista = document.getElementById('lista-clientes');
    if(!lista) return;
    lista.innerHTML = '';
    clientes.forEach(cli => {
        let li = document.createElement('li');
        li.innerHTML = `<span><strong>${cli.nome}</strong></span> <button class="btn-acao-tabela btn-deletar" onclick="removerCliente('${cli.fbKey}')">Remover</button>`;
        lista.appendChild(li);
    });
    atualizarDropdowns();
}

function removerCliente(fbKey) {
    if(confirm("Tem certeza que deseja remover este cliente?") && database) {
        database.ref(`clientes/${fbKey}`).remove().catch(err => console.error("Erro ao remover: ", err));
    }
}

function atualizarDropdowns() {
    const selectEntrega = document.getElementById('select-cliente-entrega');
    const filtroCliente = document.getElementById('filtro-cliente');
    if(!selectEntrega || !filtroCliente) return;

    const valEntregaAnterior = selectEntrega.value;
    const valFiltroAnterior = filtroCliente.value;
    
    selectEntrega.innerHTML = '<option value="">-- Selecione um Cliente --</option>';
    filtroCliente.innerHTML = '<option value="todos">Todos os Clientes (Geral)</option>';
    
    clientes.forEach(cli => {
        let opt1 = document.createElement('option');
        opt1.value = cli.nome; opt1.textContent = cli.nome;
        selectEntrega.appendChild(opt1);
        
        let opt2 = document.createElement('option');
        opt2.value = cli.nome; opt2.textContent = cli.nome;
        filtroCliente.appendChild(opt2);
    });

    if(clientes.some(c => c.nome === valEntregaAnterior)) selectEntrega.value = valEntregaAnterior;
    if(clientes.some(c => c.nome === valFiltroAnterior) || valFiltroAnterior === 'todos') filtroCliente.value = valFiltroAnterior;
}

function atualizarTabelaEntregas() {
    const corpo = document.getElementById('tabela-corpo');
    const filtroSelect = document.getElementById('filtro-cliente');
    if(!corpo || !filtroSelect) return;

    const filtro = filtroSelect.value;
    corpo.innerHTML = '';
    let total = 0;
    const listagem = filtro === 'todos' ? entregas : entregas.filter(e => e.cliente === filtro);
    listagem.sort((a,b) => new Date(a.data) - new Date(b.data));

    listagem.forEach(ent => {
        total += ent.valor;
        let esperaTela = ent.espera;
        if(esperaTela !== "Sem Espera") {
            esperaTela = ent.espera === "1" ? "1 Espera" : `${ent.espera} Esperas`;
        }

        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${ent.data.split('-').reverse().join('/')}</td>
            <td><strong>${ent.cliente}</strong></td>
            <td>${ent.coleta}</td>
            <td>${ent.entrega}</td>
            <td>${ent.retorno}</td>
            <td><strong>${ent.express || 'Não'}</strong></td>
            <td>${esperaTela}</td>
            <td>R$ ${ent.valor.toFixed(2)}</td>
            <td><button class="btn-acao-tabela btn-deletar" onclick="removerEntrega('${ent.fbKey}')">Excluir</button></td>
        `;
        corpo.appendChild(tr);
    });
    document.getElementById('valor-total-mensal').textContent = `R$ ${total.toFixed(2)}`;
}

function removerEntrega(fbKey) {
    if(confirm("Deseja mesmo excluir esta entrega?") && database) {
        database.ref(`entregas/${fbKey}`).remove();
    }
}

function configurarCliqueAbas() {
    const abasConfig = [
        { botaoId: 'btn-aba-lancamentos', conteudoId: 'aba-lancamentos' },
        { botaoId: 'btn-aba-clientes',    conteudoId: 'aba-clientes' },
        { botaoId: 'btn-aba-relatorios',  conteudoId: 'aba-relatorios' }
    ];
    abasConfig.forEach(aba => {
        const elementoBotao = document.getElementById(aba.botaoId);
        if (elementoBotao) {
            elementoBotao.addEventListener('click', () => executarTrocaAba(aba.conteudoId, elementoBotao));
        }
    });
}

function executarTrocaAba(tabId, botaoAtivo) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    const abaAlvo = document.getElementById(tabId);
    if (abaAlvo) abaAlvo.classList.add('active');
    if (botaoAtivo) botaoAtivo.classList.add('active');
    
    if(tabId === 'aba-relatorios') {
        atualizarTabelaEntregas();
        atualizarHistoricoFechados();
    }
}

function switchTab(tabId) {
    let mapaBotoes = { 'aba-lancamentos': 'btn-aba-lancamentos', 'aba-clientes': 'btn-aba-clientes', 'aba-relatorios': 'btn-aba-relatorios' };
    executarTrocaAba(tabId, document.getElementById(mapaBotoes[tabId]));
}
window.switchTab = switchTab;

// MOTOR DE PDF PROFISSIONAL COM GRID FIXO TIMBRADO
function construirDocumentoPDF(tituloFechamento, mesReferencia, dadosEntregas) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    const COR_PRIMARIA = [25, 25, 25];     
    const COR_ACENTO = [255, 102, 0];     
    const COR_TEXTO = [60, 60, 60];       
    const COR_LINHA_ALT = [245, 245, 247]; 

    doc.setFillColor(COR_PRIMARIA[0], COR_PRIMARIA[1], COR_PRIMARIA[2]);
    doc.rect(0, 0, 210, 38, 'F');

    doc.setFillColor(COR_ACENTO[0], COR_ACENTO[1], COR_ACENTO[2]);
    doc.rect(0, 38, 210, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("SOARES EXPRESS", 14, 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(200, 200, 200);
    doc.text("Logística Integrada & Prestação de Serviços Urbanos", 14, 24);
    doc.text("Contato: soaresxpress2018@gmail.com", 14, 29);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`MÊS DE REF: ${mesReferencia.toUpperCase()}`, 196, 18, { align: 'right' });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, 196, 24, { align: 'right' });
    doc.text("Documento Oficial de Prestação de Contas", 196, 29, { align: 'right' });

    doc.setTextColor(COR_PRIMARIA[0], COR_PRIMARIA[1], COR_PRIMARIA[2]);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(tituloFechamento.toUpperCase(), 14, 52);

    const colunas = [
        { label: "Data", width: 18 },
        { label: "Origem (Coleta)", width: 44 },
        { label: "Destino (Entrega)", width: 44 },
        { label: "Ret.", width: 12 },
        { label: "Exp.", width: 12 },
        { label: "Espera", width: 28 },
        { label: "Valor (R$)", width: 24 }
    ];

    let posY = 58;

    doc.setFillColor(COR_PRIMARIA[0], COR_PRIMARIA[1], COR_PRIMARIA[2]);
    doc.rect(14, posY, 182, 7, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");

    let posX = 14;
    colunas.forEach(col => {
        const alignOption = col.label === "Valor (R$)" ? { align: 'right' } : undefined;
        const textX = col.label === "Valor (R$)" ? posX + col.width - 2 : posX + 2;
        doc.text(col.label, textX, posY + 5, alignOption);
        posX += col.width;
    });

    posY += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    let totalGeral = 0;

    dadosEntregas.forEach((item, index) => {
        if (posY > 270) {
            doc.addPage();
            posY = 20;
            doc.setFillColor(COR_PRIMARIA[0], COR_PRIMARIA[1], COR_PRIMARIA[2]);
            doc.rect(14, posY, 182, 7, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            let pX = 14;
            colunas.forEach(col => {
                const alignOption = col.label === "Valor (R$)" ? { align: 'right' } : undefined;
                const textX = col.label === "Valor (R$)" ? pX + col.width - 2 : pX + 2;
                doc.text(col.label, textX, posY + 5, alignOption);
                pX += col.width;
            });
            posY += 7;
            doc.setFont("helvetica", "normal");
        }

        if (index % 2 === 0) {
            doc.setFillColor(COR_LINHA_ALT[0], COR_LINHA_ALT[1], COR_LINHA_ALT[2]);
            doc.rect(14, posY, 182, 6.5, 'F');
        }

        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.1);
        doc.line(14, posY + 6.5, 196, posY + 6.5);

        doc.setTextColor(COR_TEXTO[0], COR_TEXTO[1], COR_TEXTO[2]);
        
        let pX = 14;
        const dataFormatada = item.data.split('-').reverse().join('/');
        const valorNum = parseFloat(item.valor) || 0;
        totalGeral += valorNum;

        const limitText = (txt, maxW) => doc.splitTextToSize(txt, maxW - 3)[0] || txt;

        doc.text(dataFormatada, pX + 2, posY + 4.5);
        pX += colunas[0].width;
        doc.text(limitText(item.coleta, colunas[1].width), pX + 2, posY + 4.5);
        pX += colunas[1].width;
        doc.text(limitText(item.entrega, colunas[2].width), pX + 2, posY + 4.5);
        pX += colunas[2].width;
        doc.text(item.retorno || "Não", pX + 2, posY + 4.5);
        pX += colunas[3].width;
        doc.text(item.express || "Não", pX + 2, posY + 4.5);
        pX += colunas[4].width;
        doc.text(item.espera === "Sem Espera" ? "-" : item.espera, pX + 2, posY + 4.5);
        pX += colunas[5].width;
        doc.text(valorNum.toFixed(2), pX + colunas[6].width - 2, posY + 4.5, { align: 'right' });

        posY += 6.5;
    });

    posY += 5;
    if (posY > 265) { doc.addPage(); posY = 20; }
    doc.setFillColor(COR_LINHA_ALT[0], COR_LINHA_ALT[1], COR_LINHA_ALT[2]);
    doc.setDrawColor(COR_PRIMARIA[0], COR_PRIMARIA[1], COR_PRIMARIA[2]);
    doc.setLineWidth(0.3);
    doc.rect(120, posY, 76, 14, 'DF');

    doc.setTextColor(COR_TEXTO[0], COR_TEXTO[1], COR_TEXTO[2]);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("VALOR LIQUIDO TOTAL:", 124, posY + 9);

    doc.setTextColor(COR_ACENTO[0], COR_ACENTO[1], COR_ACENTO[2]);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(`R$ ${totalGeral.toFixed(2)}`, 192, posY + 9.5, { align: 'right' });

    posY += 28;
    if (posY < 285) {
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.2);
        doc.line(14, posY, 80, posY);
        doc.line(130, posY, 196, posY);
        doc.setTextColor(120, 120, 120);
        doc.setFontSize(8);
        doc.text("Responsável Soares Express", 47, posY + 4, { align: 'center' });
        doc.text("Assinatura do Cliente / Carimbo", 163, posY + 4, { align: 'center' });
    }

    return doc;
}

// ABERTURA NATIVA COM PLUGINS NATIVOS OU DESKTOP
async function abrirPdfNoCelular(jsPdfDoc, nomeArquivo) {
    if (!window.Capacitor) {
        alert("Ambiente mobile não inicializado.");
        return;
    }

    const pdfBase64 = jsPdfDoc.output('datauristring').split(',')[1];

    try {
        const resultadoGravacao = await window.Capacitor.Plugins.Filesystem.writeFile({
            path: nomeArquivo,
            data: pdfBase64,
            directory: 'CACHE'
        });

        await window.Capacitor.Plugins.FileOpener.open({
            filePath: resultadoGravacao.uri,
            contentType: 'application/pdf'
        });

        console.log("CAPACITOR: PDF aberto perfeitamente na tela.");
    } catch (erro) {
        console.error("Erro interno do Capacitor:", erro);
        alert("Não foi possível abrir o PDF diretamente. Verifique se possui o Google Drive PDF ou Adobe Reader instalado.");
    }
}

function gerenciarPDF(acao) {
    const filtroCliente = document.getElementById('filtro-cliente').value;
    const entregasFiltradas = filtroCliente === 'todos' ? entregas : entregas.filter(e => e.cliente === filtroCliente);

    if (entregasFiltradas.length === 0) {
        alert("Não existem entregas lançadas neste período para este cliente.");
        return;
    }
    
    const campoMes = document.getElementById('selecao-mes-fechamento');
    const nomeMes = campoMes ? campoMes.value : "MÊS";
    
    const nomeClienteTitulo = filtroCliente === 'todos' ? "GERAL" : filtroCliente.toUpperCase();
    const identificadorFechamento = `FECHAMENTO ${nomeClienteTitulo} MÊS DE ${nomeMes}`;

    const doc = construirDocumentoPDF(identificadorFechamento, nomeMes, entregasFiltradas);
    const nomeArquivoSalvar = identificadorFechamento.replace(/\s+/g, '_') + '.pdf';

    const isMobile = window.Capacitor && window.Capacitor.isNativePlatform();

    if (acao === 'visualizar') {
        if (isMobile) abrirPdfNoCelular(doc, nomeArquivoSalvar);
        else window.open(doc.output('bloburl'), '_blank');
    } 
    else if (acao === 'enviar') {
        if (!isMobile) doc.save(nomeArquivoSalvar);
        let totalAcumulado = entregasFiltradas.reduce((acc, current) => acc + current.valor, 0);
        let mensagemWhats = encodeURIComponent(`Olá, segue o relatório de serviços prestados: *${identificadorFechamento}* no valor total de *R$ ${totalAcumulado.toFixed(2)}*.`);
        window.open(`https://api.whatsapp.com/send?text=${mensagemWhats}`, '_blank');
    } 
    else if (acao === 'fechar') {
        if (!confirm(`Deseja realizar o FECHAMENTO DEFINITIVO?\nOs dados serão arquivados na nuvem.`)) return;
        
        if (!isMobile) doc.save(nomeArquivoSalvar);
        else abrirPdfNoCelular(doc, nomeArquivoSalvar);
        
        const novoFechamento = {
            id: `${identificadorFechamento} (Fechado em ${new Date().toLocaleDateString('pt-BR')})`,
            mesRef: nomeMes,
            dados: entregasFiltradas.map(e => ({ data: e.data, cliente: e.cliente, coleta: e.coleta, entrega: e.entrega, retorno: e.retorno, express: e.express || 'Não', espera: e.espera, valor: e.valor }))
        };

        if(database) {
            database.ref('historico').push(novoFechamento);
            entregasFiltradas.forEach(ent => {
                if (ent.fbKey) database.ref(`entregas/${ent.fbKey}`).remove();
            });
            alert("Excelente! Fechamento sincronizado na nuvem com sucesso.");
        }
    }
}

function atualizarHistoricoFechados() {
    const tabela = document.getElementById('tabela-historico');
    if(!tabela) return;
    tabela.innerHTML = '';
    
    if(historicoFechamentos.length === 0) {
        tabela.innerHTML = '<tr><td colspan="2" style="color: #666; text-align: center;">Nenhum fechamento registrado no histórico.</td></tr>';
        return;
    }

    historicoFechamentos.forEach((hist) => {
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${hist.id}</strong></td>
            <td style="display: flex; gap: 8px; justify-content: flex-start; align-items: center;">
                <button class="btn-acao-tabela btn-vizualizar" onclick="restaurarMes('${hist.fbKey}')">🔄 Restaurar</button>
                <button class="btn-acao-tabela btn-deletar" onclick="excluirHistorico('${hist.fbKey}')">🗑️ Apagar</button>
            </td>
        `;
        tabela.appendChild(tr);
    });
}

function restaurarMes(fbKey) {
    if(confirm("Deseja reabrir este mês fechado? Os dados voltarão para a edição.") && database) {
        const item = historicoFechamentos.find(h => h.fbKey === fbKey);
        if(item && item.dados) {
            item.dados.forEach(ent => database.ref('entregas').push(ent));
            database.ref(`historico/${fbKey}`).remove();
            switchTab('aba-lancamentos');
            alert("Dados restaurados com sucesso!");
        }
    }
}
window.restaurarMes = restaurarMes;

function excluirHistorico(fbKey) {
    if(confirm("Isso apagará o histórico permanentemente da nuvem. Continuar?") && database) {
        database.ref(`historico/${fbKey}`).remove();
    }
}
window.excluirHistorico = excluirHistorico;
