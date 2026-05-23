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

    if(document.getElementById('btn-pdf-visualizar')) {
        document.getElementById('btn-pdf-visualizar').addEventListener('click', () => gerenciarPDF('visualizar'));
    }
    if(document.getElementById('btn-pdf-enviar')) {
        document.getElementById('btn-pdf-enviar').addEventListener('click', () => gerenciarPDF('enviar'));
    }
    if(document.getElementById('btn-pdf-fechar')) {
        document.getElementById('btn-pdf-fechar').addEventListener('click', () => gerenciarPDF('fechar'));
    }
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
    express: document.querySelector('input[name="express"]:checked').value, // PEGA SE É EXPRESS
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

function atualizarTabela(entregasParaExibir) {
    const tabelaCorpo = document.getElementById('tabela-corpo');
    if (!tabelaCorpo) return;
    tabelaCorpo.innerHTML = '';

    entregasParaExibir.forEach((entrega, index) => {
        const tr = document.createElement('tr');
        
        // Formatando a data de YYYY-MM-DD para DD/MM/YYYY
        const dataFormatada = entrega.data.split('-').reverse().join('/');

        tr.innerHTML = `
            <td>${dataFormatada}</td>
            <td>${entrega.cliente.toUpperCase()}</td>
            <td>${entrega.coleta}</td>
            <td>${entrega.entrega}</td>
            <td><span class="badge-${entrega.retorno === 'Sim' ? 'sim' : 'nao'}">${entrega.retorno}</span></td>
            <td><span class="badge-${entrega.express === 'Sim' ? 'express' : 'nao'}">${entrega.express || 'Não'}</span></td>
            <td>${entrega.espera}</td>
            <td><strong>R$ ${parseFloat(entrega.valor).toFixed(2)}</strong></td>
            <td>
                <button class="btn-deletar-entrega" onclick="deletarEntrega('${entrega.fbKey || index}')">🗑️</button>
            </td>
        `;
        tabelaCorpo.appendChild(tr);
    });
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

function obtenerNomeMes(dataString) {
    if (!dataString) return "MÊS";
    const partes = dataString.split('-');
    const meses = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
    return meses[parseInt(partes[1], 10) - 1] || "MÊS";
}

function construirDocumentoPDF(tituloFechamento, mesReferencia, dadosEntregas) {
    const { jsPDF } = window.jspdf;
    // Criando documento no formato A4, unidade em milímetros (mm)
    const doc = new jsPDF('p', 'mm', 'a4');

    // --- CONFIGURAÇÃO DE CORES (PALETA CORPORATIVA) ---
    const COR_PRIMARIA = [25, 25, 25];     // Cinza Escuro Executivo
    const COR_ACENTO = [255, 102, 0];     // Laranja Soares Express
    const COR_TEXTO = [60, 60, 60];       // Grafite para leitura confortável
    const COR_LINHA_ALT = [245, 245, 247]; // Fundo cinza suave para linhas pares

    // --- CABEÇALHO DO DOCUMENTO ---
    // Faixa estilizada no topo
    doc.setFillColor(COR_PRIMARIA[0], COR_PRIMARIA[1], COR_PRIMARIA[2]);
    doc.rect(0, 0, 210, 38, 'F');

    // Linha de detalhe em Laranja
    doc.setFillColor(COR_ACENTO[0], COR_ACENTO[1], COR_ACENTO[2]);
    doc.rect(0, 38, 210, 2, 'F');

    // Nome da Empresa
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("SOARES EXPRESS", 14, 18);

    // Subtítulo do Cabeçalho
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(200, 200, 200);
    doc.text("Logística Integrada & Prestação de Serviços Urbanos", 14, 24);
    doc.text("Contato: financeiro@soaresexpress.com", 14, 29);

    // Metadados do Fechamento (Alinhado à Direita)
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`MÊS DE REF: ${mesReferencia.toUpperCase()}`, 196, 18, { align: 'right' });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, 196, 24, { align: 'right' });
    doc.text("Documento Oficial de Prestação de Contas", 196, 29, { align: 'right' });

    // --- TÍTULO DO RELATÓRIO ---
    doc.setTextColor(COR_PRIMARIA[0], COR_PRIMARIA[1], COR_PRIMARIA[2]);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(tituloFechamento.toUpperCase(), 14, 52);

    // --- TABELA DE PRESTAÇÃO DE SERVIÇOS ---
    // Definição das Colunas e Larguras Fixas (Totalizando 182mm para caber na página com margem)
    const colunas = [
        { label: "Data", width: 18 },
        { label: "Origem (Coleta)", width: 44 },
        { label: "Destino (Entrega)", width: 44 },
        { label: "Ret.", width: 12 },
        { label: "Exp.", width: 12 },
        { label: "Espera", width: 28 },
        { label: "Valor (R$)", width: 24 }
    ];

    let posY = 58; // Posição inicial da tabela

    // Desenhando o Cabeçalho da Tabela
    doc.setFillColor(COR_PRIMARIA[0], COR_PRIMARIA[1], COR_PRIMARIA[2]);
    doc.rect(14, posY, 182, 7, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");

    let posX = 14;
    colunas.forEach(col => {
        // Alinha o texto do valor à direita, os demais à esquerda
        const alignOption = col.label === "Valor (R$)" ? { align: 'right' } : undefined;
        const textX = col.label === "Valor (R$)" ? posX + col.width - 2 : posX + 2;
        doc.text(col.label, textX, posY + 5, alignOption);
        posX += col.width;
    });

    posY += 7; // Avança para a primeira linha de dados

    // Desenhando as Linhas de Dados
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    let totalGeral = 0;

    dadosEntregas.forEach((item, index) => {
        // Controle de quebra de página caso o relatório seja muito longo
        if (posY > 270) {
            doc.addPage();
            posY = 20;
            // Replica o cabeçalho da tabela na nova página
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

        // Fundo alternado (Efeito zebrado)
        if (index % 2 === 0) {
            doc.setFillColor(COR_LINHA_ALT[0], COR_LINHA_ALT[1], COR_LINHA_ALT[2]);
            doc.rect(14, posY, 182, 6.5, 'F');
        }

        // Borda inferior bem fina para separar os registros
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.1);
        doc.line(14, posY + 6.5, 196, posY + 6.5);

        doc.setTextColor(COR_TEXTO[0], COR_TEXTO[1], COR_TEXTO[2]);
        
        let pX = 14;
        const dataFormatada = item.data.split('-').reverse().join('/');
        const valorNum = parseFloat(item.valor) || 0;
        totalGeral += valorNum;

        // Limita o texto para não estourar a largura da célula caso o endereço seja gigante
        const limitText = (txt, maxW) => doc.clipToConstraints ? txt : doc.splitTextToSize(txt, maxW - 3)[0] || txt;

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
        doc.text(item.espera || "Sem Espera", pX + 2, posY + 4.5);
        pX += colunas[5].width;
        doc.text(valorNum.toFixed(2), pX + colunas[6].width - 2, posY + 4.5, { align: 'right' });

        posY += 6.5;
    });

    // --- BLOCO DE FECHAMENTO FINANCEIRO ---
    posY += 5; // Margemzinha de distanciamento da tabela
    
    // Caixa de resumo totalizador
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

    // --- ASSINATURAS / RODAPÉ ---
    posY += 28;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.2);
    // Linha de assinatura da Soares Express
    doc.line(14, posY, 80, posY);
    // Linha de assinatura do Cliente contratante
    doc.line(130, posY, 196, posY);

    doc.setTextColor(120, 120, 120);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Responsável Soares Express", 47, posY + 4, { align: 'center' });
    doc.text("Assinatura do Cliente / Carimbo", 163, posY + 4, { align: 'center' });

    return doc;
}
    
    // AGORA PEGA O MÊS SELECIONADO MANUALMENTE PELO USUÁRIO
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
            dados: entregasFiltradas.map(e => ({ data: e.data, cliente: e.cliente, coleta: e.coleta, entrega: e.entrega, retorno: e.retorno, espera: e.espera, valor: e.valor }))
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

    historicoFechamentos.forEach((hist, index) => {
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${hist.id}</strong></td>
            <td style="display: flex; gap: 8px; justify-content: flex-start; align-items: center;">
                <button class="btn-acao-tabela btn-vizualizar" onclick="restaurarMes(${index})">🔄 Restaurar</button>
                <button class="btn-acao-tabela btn-deletar" onclick="excluirHistorico(${index})">🗑️ Apagar</button>
            </td>
        `;
        tabela.appendChild(tr);
    });
}

function gerarPdfHistorico(index) {
    const itemHist = historicoFechamentos[index];
    if (!itemHist || !itemHist.dados || itemHist.dados.length === 0) {
        alert("Erro ao recuperar os dados deste fechamento.");
        return;
    }
    const doc = construirDocumentoPDF(itemHist.id, itemHist.mesRef || "MÊS", itemHist.dados);
    const nomeArquivoSalvar = itemHist.id.replace(/\s+/g, '_') + '.pdf';

    const isMobile = window.Capacitor && window.Capacitor.isNativePlatform();

    if (isMobile) abrirPdfNoCelular(doc, nomeArquivoSalvar);
    else window.open(doc.output('bloburl'), '_blank');
}
window.gerarPdfHistorico = gerarPdfHistorico;

function restaurarMes(index) {
    if(confirm("Deseja reabrir este mês fechado? Os dados voltarão para a edição.") && database) {
        const item = historicoFechamentos[index];
        item.dados.forEach(ent => database.ref('entregas').push(ent));
        database.ref(`historico/${item.fbKey}`).remove();
        switchTab('aba-lancamentos');
        alert("Dados restaurados com sucesso!");
    }
}
window.restaurarMes = restaurarMes;

function excluirHistorico(index) {
    if(confirm("Isso apagará o histórico permanentemente da nuvem. Continuar?") && database) {
        database.ref(`historico/${historicoFechamentos[index].fbKey}`).remove();
    }
}
window.excluirHistorico = excluirHistorico;
