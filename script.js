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
    
    // 1. Configura as abas primeiro para garantir a navegação livre
    configurarCliqueAbas();

    // 2. Inicializa o Firebase com tratamento correto para a versão COMPAT
    try {
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        console.log("FIREBASE: Conectado com sucesso!");
        
        // Conectar ouvintes em tempo real
        inicializarOuvintesFirebase();
    } catch (erro) {
        console.error("Erro ao conectar no Firebase: ", erro);
    }

    // 3. Ativa os escutadores dos formulários com segurança
    configurarFormularioCliente();
    configurarFormularioEntrega();

    // 4. Configuração dos demais elementos e botões da tela
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

// Sincronização em Tempo Real com o Firebase
function inicializarOuvintesFirebase() {
    if (!database) return;

    // 1. Escuta Clientes
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
                
                if(nomeCli) {
                    clientes.push({ fbKey: key, nome: nomeCli });
                }
            });
        }
        renderClientes();
    });

    // 2. Escuta Entregas Ativas
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

    // 3. Escuta Histórico de Fechamentos
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

// Configuração Isolada do Formulário de Clientes
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
            database.ref('clientes').push({
                nome: nomeInput
            }).then(() => {
                formCliente.reset();
                alert('Cliente cadastrado com sucesso!');
            }).catch((error) => {
                console.error("Erro ao salvar cliente: ", error);
            });
        } else if (existe) {
            alert('Este cliente já está cadastrado!');
        }
    });
}

// Configuração Isolada do Formulário de Entregas
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
            espera: document.getElementById('espera').value,
            valor: parseFloat(document.getElementById('valor').value)
        };
        
        if (database) {
            database.ref('entregas').push(novaEntrega).then(() => {
                alert('Entrega lançada com sucesso!');
                document.getElementById('end-coleta').value = '';
                document.getElementById('end-entrega').value = '';
                document.getElementById('valor').value = '';
            }).catch((error) => {
                console.error("Erro ao salvar entrega: ", error);
            });
        }
    });
}

// Renderiza a lista de clientes na aba de gerenciamento
function renderClientes() {
    const lista = document.getElementById('lista-clientes');
    if(!lista) return;

    lista.innerHTML = '';
    clientes.forEach((cli) => {
        let li = document.createElement('li');
        li.innerHTML = `<span><strong>${cli.nome}</strong></span> <button class="btn-acao-tabela btn-deletar" onclick="removerCliente('${cli.fbKey}')">Remover</button>`;
        lista.appendChild(li);
    });
    atualizarDropdowns();
}

function removerCliente(fbKey) {
    if(confirm("Tem certeza que deseja remover este cliente?") && database) {
        database.ref(`clientes/${fbKey}`).remove()
            .catch(err => console.error("Erro ao remover: ", err));
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

    if(clientes.some(c => c.nome === valEntregaAnterior)) {
        selectEntrega.value = valEntregaAnterior;
    }
    if(clientes.some(c => c.nome === valFiltroAnterior) || valFiltroAnterior === 'todos') {
        filtroCliente.value = valFiltroAnterior;
    }
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

// CORREÇÃO AQUI: Nome alterado para "executarTrocaAba" com X para bater com a chamada externa
function configurarCliqueAbas() {
    const abasConfig = [
        { botaoId: 'btn-aba-lancamentos', conteudoId: 'aba-lancamentos' },
        { botaoId: 'btn-aba-clientes',    conteudoId: 'aba-clientes' },
        { botaoId: 'btn-aba-relatorios',  conteudoId: 'aba-relatorios' }
    ];

    abasConfig.forEach(aba => {
        const elementoBotao = document.getElementById(aba.botaoId);
        if (elementoBotao) {
            elementoBotao.addEventListener('click', function() {
                executarTrocaAba(aba.conteudoId, elementoBotao);
            });
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
    let mapaBotoes = {
        'aba-lancamentos': 'btn-aba-lancamentos',
        'aba-clientes': 'btn-aba-clientes',
        'aba-relatorios': 'btn-aba-relatorios'
    };
    const bId = mapaBotoes[tabId];
    const btn = document.getElementById(bId);
    executarTrocaAba(tabId, btn);
}
window.switchTab = switchTab;

function obtenerNomeMes(dataString) {
    if (!dataString) return "MÊS";
    const partes = dataString.split('-');
    const mesIndex = parseInt(partes[1], 10) - 1;
    const meses = [
        "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
        "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"
    ];
    return meses[mesIndex] || "MÊS";
}

function construirDocumentoPDF(tituloFechamento, nomeMes, listaServicos) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    
    const corPrimaria = [22, 22, 26];    
    const corSecundaria = [255, 102, 0]; 
    const corAcento = [204, 0, 0];      
    const corFundoTabela = [245, 246, 248]; 
    const corLinha = [210, 215, 223];     
    
    let totalGeral = 0;
    let yPos = 55;
    let numeroPagina = 1;

    function desenharCabecalhoTimbrado() {
        doc.setFillColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
        doc.rect(0, 0, 210, 38, 'F');
        doc.setFillColor(corSecundaria[0], corSecundaria[1], corSecundaria[2]);
        doc.rect(0, 38, 210, 2, 'F');
        doc.setFillColor(corAcento[0], corAcento[1], corAcento[2]);
        doc.rect(0, 40, 210, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont("Helvetica", "Bold");
        doc.setFontSize(24);
        doc.text("SOARES EXPRESS", 15, 18);
        doc.setFont("Helvetica", "Oblique");
        doc.setFontSize(9);
        doc.setTextColor(180, 180, 180);
        doc.text("LOGÍSTICA INTELIGENTE & ENTREGAS RÁPIDAS", 15, 25);
        doc.setFillColor(35, 35, 40);
        doc.rect(130, 8, 65, 22, 'F');
        doc.setDrawColor(corSecundaria[0], corSecundaria[1], corSecundaria[2]);
        doc.setLineWidth(0.5);
        doc.rect(130, 8, 65, 22, 'S');
        doc.setTextColor(255, 255, 255);
        doc.setFont("Helvetica", "Bold");
        doc.setFontSize(8);
        doc.text("RELATÓRIO DE FECHAMENTO", 134, 14);
        doc.setFont("Helvetica", "Normal");
        doc.setFontSize(7);
        doc.setTextColor(200, 200, 200);
        doc.text(`Data Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 134, 20);
        doc.text(`Competência: ${nomeMes}/${new Date().getFullYear()}`, 134, 25);
    }

    function desenharRodape() {
        doc.setDrawColor(corLinha[0], corLinha[1], corLinha[2]);
        doc.setLineWidth(0.3);
        doc.line(15, 282, 195, 282);
        doc.setFont("Helvetica", "Normal");
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text("Soares Express Logística - Documento gerado via sistema oficial.", 15, 287);
        doc.text(`Página ${numeroPagina}`, 185, 287);
    }

    desenharCabecalhoTimbrado();
    desenharRodape();

    doc.setTextColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
    doc.setFont("Helvetica", "Bold");
    doc.setFontSize(13);
    doc.text(tituloFechamento.split(" (Fechado")[0], 15, yPos);
    
    yPos += 8;
    doc.setFillColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
    doc.rect(15, yPos, 180, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "Bold");
    doc.setFontSize(8.5);
    doc.text("DATA", 17, yPos + 5.5);
    doc.text("ROTA (COLETA -> ENTREGA)", 40, yPos + 5.5);
    doc.text("RETORNO", 130, yPos + 5.5);
    doc.text("ESPERA", 155, yPos + 5.5);
    doc.text("VALOR", 178, yPos + 5.5);
    yPos += 8;

    let listagemOrdenada = [...listaServicos];
    listagemOrdenada.sort((a,b) => new Date(a.data) - new Date(b.data));
    let alternarCorRow = false;

    listagemOrdenada.forEach((e) => {
        totalGeral += e.valor;
        if (yPos > 265) {
            numeroPagina++;
            doc.addPage();
            desenharCabecalhoTimbrado();
            desenharRodape();
            yPos = 50;
            doc.setFillColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
            doc.rect(15, yPos, 180, 8, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont("Helvetica", "Bold");
            doc.setFontSize(8.5);
            doc.text("DATA", 17, yPos + 5.5);
            doc.text("ROTA (COLETA -> ENTREGA)", 40, yPos + 5.5);
            doc.text("RETORNO", 130, yPos + 5.5);
            doc.text("ESPERA", 155, yPos + 5.5);
            doc.text("VALOR", 178, yPos + 5.5);
            yPos += 8;
        }

        if (alternarCorRow) {
            doc.setFillColor(corFundoTabela[0], corFundoTabela[1], corFundoTabela[2]);
            doc.rect(15, yPos, 180, 7.5, 'F');
        }
        alternarCorRow = !alternarCorRow;
        doc.setDrawColor(corLinha[0], corLinha[1], corLinha[2]);
        doc.setLineWidth(0.1);
        doc.line(15, yPos + 7.5, 195, yPos + 7.5);
        doc.setTextColor(40, 40, 40);
        doc.setFont("Helvetica", "Normal");
        doc.setFontSize(8);

        let dataFormatada = e.data.split('-').reverse().join('/');
        doc.text(dataFormatada, 17, yPos + 5);
        let rotaTexto = `${e.coleta} -> ${e.entrega}`;
        if (rotaTexto.length > 52) rotaTexto = rotaTexto.substring(0, 49) + "...";
        doc.text(rotaTexto, 40, yPos + 5);
        doc.text(e.retorno, 133, yPos + 5);
        let esperaPDF = e.espera === "Sem Espera" ? "-" : e.espera;
        doc.text(esperaPDF, 159, yPos + 5);
        let valorTexto = `R$ ${e.valor.toFixed(2)}`;
        doc.text(valorTexto, 176, yPos + 5);
        yPos += 7.5;
    });

    yPos += 6;
    if (yPos > 250) { 
        numeroPagina++;
        doc.addPage();
        desenharCabecalhoTimbrado();
        desenharRodape();
        yPos = 50;
    }
    doc.setFillColor(240, 242, 245);
    doc.rect(115, yPos, 80, 18, 'F');
    doc.setDrawColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
    doc.setLineWidth(0.4);
    doc.rect(115, yPos, 80, 18, 'S');
    doc.setFillColor(corSecundaria[0], corSecundaria[1], corSecundaria[2]);
    doc.rect(115, yPos, 2, 18, 'F');
    doc.setTextColor(80, 80, 80);
    doc.setFont("Helvetica", "Bold");
    doc.setFontSize(8);
    doc.text("TOTAL LÍQUIDO A PAGAR", 121, yPos + 5);
    doc.setTextColor(corAcento[0], corAcento[1], corAcento[2]);
    doc.setFont("Helvetica", "Bold");
    doc.setFontSize(14);
    doc.text(`R$ ${totalGeral.toFixed(2)}`, 121, yPos + 13);

    return doc;
}

function gerenciarPDF(acao) {
    const filtroCliente = document.getElementById('filtro-cliente').value;
    const entregasFiltradas = filtroCliente === 'todos' ? entregas : entregas.filter(e => e.cliente === filtroCliente);

    if (entregasFiltradas.length === 0) {
        alert("Não existem entregas lançadas neste mês para o filtro selecionado.");
        return;
    }
    
    const nomeMes = obtenerNomeMes(entregasFiltradas[0].data);
    const nomeClienteTitulo = filtroCliente === 'todos' ? "GERAL" : filtroCliente.toUpperCase();
    const identificadorFechamento = `FECHAMENTO ${nomeClienteTitulo} MÊS DE ${nomeMes}`;

    const doc = construirDocumentoPDF(identificadorFechamento, nomeMes, entregasFiltradas);
    const nomeArquivoSalvar = identificadorFechamento.replace(/\s+/g, '_') + '.pdf';

    if (acao === 'visualizar') {
        const blobUrl = doc.output('bloburl');
        if (window.cordova && window.cordova.InAppBrowser) {
            // Se estiver no aplicativo, baixa direto para a pasta de Downloads do celular
            doc.save(nomeArquivoSalvar);
        } else {
            // Se estiver no computador, abre na aba normal do Chrome
            window.open(blobUrl, '_blank');
        }
    }
    } 
    else if (acao === 'enviar') {
        doc.save(nomeArquivoSalvar);
        let totalAcumulado = entregasFiltradas.reduce((acc, current) => acc + current.valor, 0);
        let mensagemWhats = encodeURIComponent(`Olá, segue o relatório de serviços prestados: *${identificadorFechamento}* no valor total de *R$ ${totalAcumulado.toFixed(2)}*.`);
        window.open(`https://api.whatsapp.com/send?text=${mensagemWhats}`, '_blank');
    } 
    else if (acao === 'fechar') {
        if (!confirm(`Deseja realizar o FECHAMENTO DEFINITIVO?\nOs dados serão movidos para a nuvem definitiva.`)) {
            return;
        }
        
        doc.save(nomeArquivoSalvar);
        
        const novoFechamento = {
            id: `${identificadorFechamento} (Fechado em ${new Date().toLocaleDateString('pt-BR')})`,
            mesRef: nomeMes,
            dados: entregasFiltradas.map(e => ({ data: e.data, cliente: e.cliente, coleta: e.coleta, entrega: e.entrega, retorno: e.retorno, espera: e.espera, valor: e.valor }))
        };

        if(database) {
            database.ref('historico').push(novoFechamento);
            
            entregasFiltradas.forEach(ent => {
                if (ent.fbKey) {
                    database.ref(`entregas/${ent.fbKey}`).remove();
                }
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
        tabela.innerHTML = '<tr><td colspan="2" style="color: #666; text-align: center;">Nenhum mês fechado no histórico ainda.</td></tr>';
        return;
    }

    historicoFechamentos.forEach((hist, index) => {
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${hist.id}</strong></td>
            <td style="display: flex; gap: 8px; justify-content: flex-start; align-items: center;">
                <button class="btn-acao-tabela" style="background: #1a53ff; color: white;" onclick="gerarPdfHistorico(${index})">👁️ Ver PDF</button>
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
    const mesRef = itemHist.mesRef || "MÊS";
    const doc = construirDocumentoPDF(itemHist.id, mesRef, itemHist.dados);
    
    if (window.cordova && window.cordova.InAppBrowser) {
        const nomeArquivoSalvar = itemHist.id.replace(/\s+/g, '_') + '.pdf';
        doc.save(nomeArquivoSalvar);
    } else {
        window.open(doc.output('bloburl'), '_blank');
    }
}
}
window.gerarPdfHistorico = gerarPdfHistorico;

function restaurarMes(index) {
    if(confirm("Deseja reabrir este mês fechado? Os dados voltarão para edição na nuvem.") && database) {
        const item = historicoFechamentos[index];
        
        item.dados.forEach(ent => {
            database.ref('entregas').push(ent);
        });

        database.ref(`historico/${item.fbKey}`).remove();
        switchTab('aba-lancamentos');
        alert("Dados restaurados do Firebase com sucesso!");
    }
}
window.restaurarMes = restaurarMes;

function excluirHistorico(index) {
    if(confirm("Isso apagará este backup da nuvem permanentemente. Continuar?") && database) {
        const fbKey = historicoFechamentos[index].fbKey;
        database.ref(`historico/${fbKey}`).remove();
    }
}
window.excluirHistorico = excluirHistorico;
