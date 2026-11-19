/* script.js: lógica do painel (configuração, leitura da planilha, cálculos e desenho da tela). */
/* =====================================================================
   CONFIG: ajustes simples. Mexa aqui antes de mexer no resto do código.
   ===================================================================== */
const CONFIG = {
  TOP_N: 10,                    // quantos itens mostrar em cada ranking
  METRICA_TEMPO: 'media',       // 'media' ou 'mediana' (tempo de resolução por categoria, em horas)
  CD: ['910', 'Arujá'],         // só aparecem linhas destes CDs (número ou nome; compara sem acento e sem maiúsculas)
  STATUS_DIVERGENTE: ['divergente'], // só entram as senhas com um destes textos na coluna STATUS
  SEM_DIVERGENCIA: ['sem divergencia','ok'], // se a planilha não tiver STATUS: textos de "DIVERGÊNCIA DOS PEDIDOS" que contam como sem divergência
  CHAVE_RESOLUCOES: 'painel-senhas-resolucoes', // nome do espaço onde o navegador guarda as resoluções marcadas
  CHAVE_CATEGORIAS: 'painel-senhas-categorias', // nome do espaço onde o navegador guarda as categorias escolhidas
  CHAVE_TIPOS: 'painel-senhas-tipos',           // nome do espaço onde o navegador guarda os tipos escolhidos à mão
  CHAVE_CHAMADOS: 'painel-senhas-chamados',     // nome do espaço onde o navegador guarda os números de chamado digitados
  CHAVE_REGRAS: 'painel-senhas-regras-fornecedor', // nome do espaço onde o navegador guarda as regras "fornecedor -> categoria"
  // Turnos do filtro do topo, pela hora da DATA/HORA AGENDA. Quando fim é menor que ini, o turno passa da meia-noite.
  TURNOS: [
    { nome: '1º turno (06h às 14h)', ini: 6,  fim: 14 },
    { nome: '2º turno (14h às 22h)', ini: 14, fim: 22 },
    { nome: '3º turno (22h às 06h)', ini: 22, fim: 6 }
  ],
  // Categoria pelo fornecedor: parte do nome do fornecedor : categoria.
  // Vale para as NFs sem categoria na planilha e sem escolha manual. As regras criadas na aba Categorias somam-se a estas.
  FORNECEDOR_CATEGORIA: {
    'AMBEV': 'LÍQUIDA 4 – CERVEJA, CIGARROS'
  },
  // Categorias do seletor da Base detalhada. Grupo : lista de "CATEGORIA – SUB-CATEGORIA".
  // Para incluir, tirar ou renomear, edite aqui. Uma categoria escolhida e depois renomeada continua aparecendo na NF com o nome antigo.
  CATEGORIAS: {
    'MERCEARIA I': [
      'MERCEARIA – LEITE EM PÓ, ALIM. INFANTIL, ACHOCOLATADO, LEITE COND, CREME DE LEITE, BOMBOM E BEBIDA PROTEICA',
      'MERCEARIA 3 – SALGADINHOS, SNACKS',
      'MERCEARIA – MATINAIS, CHÁ, CONFEITARIA',
      'MERCEARIA – BOMBONIERE E CHOCOLATES'
    ],
    'MERCEARIA II': [
      'MERCEARIA 7 – BISCOITOS, MASSAS',
      'MERCEARIA 8 – COND, MOLHOS, ENLATADOS',
      'MERCEARIA 9 – FARINÁCEOS, TEMPEROS, SAL',
      'MERCEARIA 10 – INSTITUCIONAIS',
      'MERCEARIA 11 – CONSERVAS, AZEITE'
    ],
    'LÍQUIDA': [
      'LÍQUIDA 1 – REFRIGERANTES, TÔNICA',
      'LÍQUIDA 2 – SUCOS, CHÁ, SOJA',
      'LÍQUIDA 3 – DESTILADOS, VINHOS',
      'LÍQUIDA 4 – CERVEJA, CIGARROS',
      'LÍQUIDA 5 – ENERGÉTICO, ÁGUA MINERAL, ISOTÔNICOS'
    ],
    'BAZAR': [
      'BAZAR 1 – DESCARTÁVEIS',
      'BAZAR 3 – PET',
      'BAZAR 5 – UTENSÍLIOS DOMÉSTICOS',
      'BAZAR 8 – PLÁSTICOS/LAZER',
      'BAZAR 9 – UTILIDADES DE LIMPEZA'
    ],
    'DPH I – PERFUMARIA': [
      'DPH 1 – PAPEL HIG, FRALDAS',
      'DPH 2 – HIGIENE BUCAL',
      'DPH 3 – CUIDADOS COM A PELE',
      'DPH 4 – CABELO',
      'DPH 5 – SABONETES E LÂMINAS'
    ],
    'DPH II – LIMPEZA': [
      'DPH 5 – LAVA ROUPAS, AMACIANTE E LIMPADORES',
      'DPH 6 – DET, ESPONJA, INSET, ÁLCOOL, SABÃO BARRA',
      'DPH 7 – ÁGUA SANIT, LIMPEZA DE SUPERFÍCIES, DESINFETANTE'
    ],
    'COMMODITIES': [
      'BÁSICO 1 – AÇÚCAR, LEITE UHT, TRIGO',
      'BÁSICO 2 – ARROZ, FEIJÃO, ÓLEO DE SOJA E ESPECIAIS, CESTA BÁSICA',
      'BÁSICO 1 E 2 – ÓLEO DE SOJA E TRIGO',
      'BÁSICO 3 – CAFÉ E CHÁ'
    ]
  },
  // Se o texto de "DIVERGÊNCIA DOS PEDIDOS" casar com esta expressão (minúsculo, sem acento), a senha é tributária. O resto é comercial.
  REGEX_TRIBUTARIA: '\\b(tribut\\w*|aliquot\\w*|imposto\\w*|icms|ipi|pis|cofins|ncm|cfop|cst|fiscal)\\b',
  MAX_LINHAS_BASE: 300,         // limite de linhas desenhadas na Base detalhada
  CSV_INICIAL: '',              // cole aqui um CSV para o painel já abrir com seus dados (senão abre vazio, esperando a planilha)
  // nome interno : nomes aceitos no cabeçalho (sem acento, minúsculo, sem símbolos: "DATA/HORA AGENDA" vira "data hora agenda")
  COLUNAS: {
    senha:       ['senha'],
    agenda:      ['data hora agenda','data agenda','agenda'],
    cd:          ['cd','centro de distribuicao'],
    fornecedor:  ['fornecedor'],
    divergencia: ['divergencia dos pedidos','divergencia'],
    // opcionais: se não existirem na planilha, o painel avisa o que falta
    status:      ['status','situacao'],
    // início e fim da tratativa de cada tipo: definem o tipo (se a divergência vier vazia), a resolução e o tempo
    iniCom:      ['ini div com','inicio div com','inicio divergencia comercial'],
    fimCom:      ['fim div com','fim divergencia comercial'],
    iniTri:      ['ini div trib','inicio div trib','inicio divergencia tributaria'],
    fimTri:      ['fim div trib','fim divergencia tributaria'],
    nf:          ['nf','nota fiscal','numero nf','numero da nf','n nf'],
    categoria:   ['categoria','categoria do produto'],
    resolucao:   ['data resolucao','data de resolucao','resolucao','data solucao']
  },
  OBRIGATORIAS: ['senha','agenda','cd','fornecedor','divergencia'],
  // Arquivo de produtos (Excel ou CSV) da aba Categorias: liga o EAN/PLU dos itens da NF, ou o fornecedor, a uma categoria.
  // Em cada coluna vale o primeiro nome da lista que existir no arquivo. É preciso ter Categoria e pelo menos PLU, EAN ou Fornecedor.
  COLUNAS_PRODUTOS: {
    plu:        ['plu','cod plu','codigo plu','codigo','cod produto','codigo produto','codigo do produto','codigo interno','cod interno','sku'],
    ean:        ['ean','ean13','gtin','cod barras','codigo de barras','codigo barras'],
    fornecedor: ['fornecedor','nome fornecedor','fornecedor principal','razao social'],
    categoria:  ['categoria','categoria produto','sub categoria','subcategoria','secao','departamento','familia']
  },
  LINHAS_PARA_ACHAR_CABECALHO: 30  // exportações às vezes têm linhas de título antes do cabeçalho
};

/* ===== Utilitários ===== */
const $ = id => document.getElementById(id);
const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const nf = n => n.toLocaleString('pt-BR', {maximumFractionDigits: 1});
const dataBR = d => d ? d.toLocaleDateString('pt-BR') : '';
const dataHoraBR = d => d ? d.toLocaleString('pt-BR', {dateStyle:'short', timeStyle:'short'}) : '';
const NOME_TIPO = {com: 'Comercial', tri: 'Tributária', nd: 'Não informada'}; // nd: DIVERGÊNCIA DOS PEDIDOS vazia
let DADOS = [];            // senhas da base carregada agora
let BASE_REAL = false;     // a base carregada veio de um arquivo (e não do CSV_INICIAL)?
const HIST = new Map();    // histórico do banco de dados: id (senha|NF) -> registro
let VISAO = 'base';        // o que o painel mostra: 'base' (base carregada) ou 'hist' (histórico completo)
let TEM_RESOLUCAO = false; // a planilha carregada tem a coluna opcional de resolução?
const SEM_CATEGORIA = '(sem categoria)';
const todas = () => VISAO === 'hist' && BANCO.ok ? [...HIST.values()] : DADOS; // senhas da visão escolhida (base ou histórico)
const visiveis = () => todas().filter(passaFiltro); // senhas que o painel mostra: as da visão, com os filtros do topo
const temCategoria = () => visiveis().some(d => d.categoria !== SEM_CATEGORIA); // alguma NF já tem categoria (da planilha ou escolhida)?
const acharRegistro = id => HIST.get(id) || DADOS.find(x => x.id === id);
// Cada registro guarda o que veio da planilha (…Arquivo) e o que foi escolhido na tela (…Manual).
// Esta função calcula o que aparece: o que a planilha diz vale mais que a escolha manual.
function aplicar(d){
  d.tipo = d.tipoArquivo !== 'nd' ? d.tipoArquivo : (d.tipoManual || 'nd');
  d.categoriaAuto = d.categoriaManual || d.categoriaArquivo ? null : categoriaAutomatica(d); // sugestão (itens da NF, regra ou cadastro)
  d.categoria = d.categoriaManual || d.categoriaArquivo || d.categoriaAuto?.cat || SEM_CATEGORIA;
  d.categoriaOrigem = d.categoriaManual ? 'manual' : d.categoriaArquivo ? 'planilha' : d.categoriaAuto?.origem || '';
  d.chamado = d.chamadoManual || '';
  d.resolucao = d.resolucaoArquivo || d.resolucaoManual || null;
  d.deArquivo = !!d.resolucaoArquivo;
  return d;
}
const inicioDe = d => d.inicio || d.agenda; // conta do INI DIV da planilha; sem ele, da data/hora da agenda
const horas = d => inicioDe(d) && d.resolucao ? Math.max(0, (d.resolucao - inicioDe(d)) / 36e5) : null; // tempo de resolução em horas
const hh = n => nf(n) + ' h';
// O que é marcado na tela (resoluções e categorias) fica guardado só neste navegador
function lerSalvo(chave = CONFIG.CHAVE_RESOLUCOES){ try{ return JSON.parse(localStorage.getItem(chave) || '{}'); }catch(e){ return {}; } }
function gravarSalvo(o, chave = CONFIG.CHAVE_RESOLUCOES){ try{ localStorage.setItem(chave, JSON.stringify(o)); }catch(e){} }
function seletorTipo(d){ // lista de tipo, só para NFs em que a planilha não diz se é comercial ou tributária
  return `<select class="sel-tipo ${d.tipo}" data-tipo="${esc(d.id)}" aria-label="Tipo da divergência da NF ${esc(d.nf)}" title="A planilha não informa o tipo: escolha aqui">`
    + ['nd', 'com', 'tri'].map(v => `<option value="${v}"${v === d.tipo ? ' selected' : ''}>${v === 'nd' ? 'Escolha o tipo…' : NOME_TIPO[v]}</option>`).join('')
    + '</select>';
}
const ORIGEM_AUTO = { nf: 'pelos itens da NF no cadastro de produtos', regra: 'pela regra do fornecedor', cadastro: 'pelo fornecedor no cadastro de produtos' };
function seletorCategoria(d){ // caixa de seleção da categoria de uma NF na Base detalhada
  const atual = d.categoria === SEM_CATEGORIA ? '' : d.categoria, opc = o => `<option value="${esc(o)}"${o === atual ? ' selected' : ''}>${esc(o)}</option>`;
  const naLista = Object.values(CONFIG.CATEGORIAS).some(l => l.includes(atual)), auto = ORIGEM_AUTO[d.categoriaOrigem];
  const titulo = auto ? 'Sugerida ' + auto + ': ' + atual + '. Escolha na lista para confirmar ou trocar.' : (atual || 'Escolha a categoria');
  return `<select class="sel-cat${auto ? ' auto' : ''}" data-cat="${esc(d.id)}" aria-label="Categoria da NF ${esc(d.nf)}" title="${esc(titulo)}">`
    + `<option value="">Escolha a categoria…</option>`
    + (atual && !naLista ? `<optgroup label="${d.categoriaOrigem === 'planilha' ? 'Da planilha' : 'Outras'}">${opc(atual)}</optgroup>` : '') // valor fora da lista
    + Object.entries(CONFIG.CATEGORIAS).map(([g, l]) => `<optgroup label="${esc(g)}">${l.map(opc).join('')}</optgroup>`).join('')
    + '</select>';
}

/* ===== 1) LEITURA DA PLANILHA ===== */
function paraData(v){ // aceita Date, número do Excel, 15/03/2026 14:30 e 2026-03-15
  if(v === '' || v == null) return null;
  if(v instanceof Date) return isNaN(v) ? null : new Date(Math.round(+v / 6e4) * 6e4); // arredonda ao minuto
  if(typeof v === 'number'){ const u = new Date(Math.round((v - 25569) * 864e5)); return new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate(), u.getUTCHours(), u.getUTCMinutes()); }
  const s = String(v).trim(), m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[ T]+(\d{1,2}):(\d{2}))?/);
  if(m){ let a = +m[3]; if(a < 100) a += 2000; return new Date(a, m[2]-1, m[1], +(m[4] || 0), +(m[5] || 0)); }
  const d = new Date(s); return isNaN(d) ? null : d;
}
function lerCSV(t){ // leitor de CSV simples: separador ; ou , e campos entre aspas
  const l1 = t.split('\n')[0], sep = (l1.match(/;/g)||[]).length > (l1.match(/,/g)||[]).length ? ';' : ',';
  const rows = []; let r = [], c = '', q = false;
  for(let i = 0; i < t.length; i++){ const ch = t[i];
    if(q){ if(ch === '"'){ if(t[i+1] === '"'){ c += '"'; i++; } else q = false; } else c += ch; }
    else if(ch === '"') q = true;
    else if(ch === sep){ r.push(c); c = ''; }
    else if(ch === '\n' || ch === '\r'){ if(ch === '\r' && t[i+1] === '\n') i++; r.push(c); c = ''; rows.push(r); r = []; }
    else c += ch; }
  if(c || r.length){ r.push(c); rows.push(r); }
  return rows;
}
function acharCabecalho(rows){ // procura a linha que tem todas as colunas obrigatórias
  for(let i = 0; i < Math.min(rows.length, CONFIG.LINHAS_PARA_ACHAR_CABECALHO); i++){
    const cab = rows[i].map(norm), idx = {};
    for(const k in CONFIG.COLUNAS) idx[k] = cab.findIndex(h => CONFIG.COLUNAS[k].map(norm).includes(h));
    if(CONFIG.OBRIGATORIAS.every(k => idx[k] >= 0)) return { linha: i, idx };
  }
  return null;
}
function montarRegistros(rows){ // converte linhas da planilha em objetos padronizados
  const c = acharCabecalho(rows);
  if(!c) throw new Error('Não encontrei o cabeçalho com as colunas Senha, DATA/HORA AGENDA, CD, FORNECEDOR e DIVERGÊNCIA DOS PEDIDOS. Confira os nomes ou ajuste COLUNAS no código.');
  const idx = c.idx, reTrib = new RegExp(CONFIG.REGEX_TRIBUTARIA);
  TEM_RESOLUCAO = idx.resolucao >= 0;
  const sem = CONFIG.SEM_DIVERGENCIA.map(norm), stDiv = CONFIG.STATUS_DIVERGENTE.map(norm), cdsAlvo = CONFIG.CD.map(norm), cdsVistos = new Set();
  const temStatus = idx.status >= 0;
  const validas = rows.slice(c.linha + 1).filter(r => {
    if(String(r[idx.senha] ?? '').trim() === '') return false;   // linha sem senha (rodapé, total) é ignorada
    if(temStatus){ if(!stDiv.includes(norm(r[idx.status]))) return false; } // com STATUS: só as senhas "Divergente"
    else { const dv = String(r[idx.divergencia] ?? '').trim(); if(!dv || sem.includes(norm(dv))) return false; } // sem STATUS: usa o texto da divergência
    cdsVistos.add(String(r[idx.cd] ?? '').trim());
    const cd = norm(r[idx.cd]); return cdsAlvo.some(a => cd === a || cd.includes(a)); // só os CDs configurados
  });
  // Linhas do CD que NÃO estão divergentes hoje: servem só para atualizar senhas que já estão no histórico (ex.: virou FINALIZADO com FIM DIV)
  const outras = temStatus ? rows.slice(c.linha + 1).filter(r => String(r[idx.senha] ?? '').trim() && !stDiv.includes(norm(r[idx.status]))
    && cdsAlvo.some(a => norm(r[idx.cd]) === a || norm(r[idx.cd]).includes(a))) : [];
  const lista = validas.map(r => converter(r));
  lista.outras = outras.map(r => converter(r));
  lista.semDivergentes = !validas.length && ('Nenhuma senha ' + (temStatus ? 'com STATUS "Divergente"' : 'divergente') + ' do CD ' + CONFIG.CD.join(' / ')
    + ' nesta planilha. CDs com divergência: ' + ([...cdsVistos].filter(Boolean).join(', ') || 'nenhum') + '.');
  return lista;
  function converter(r){
    const g = k => idx[k] < 0 ? '' : (r[idx[k]] ?? '');
    const ag = paraData(g('agenda')), div = String(g('divergencia')).trim();
    const ic = paraData(g('iniCom')), fc = paraData(g('fimCom')), it = paraData(g('iniTri')), ft = paraData(g('fimTri'));
    const temCom = !!(ic || fc), temTri = !!(it || ft);
    // Tipo: 1º pelo texto de DIVERGÊNCIA DOS PEDIDOS; vazio, pelas colunas INI/FIM DIV preenchidas.
    // Se as duas estiverem preenchidas, vale a que ainda está aberta (sem FIM); empate fica tributária.
    const tipo = div ? (reTrib.test(norm(div)) ? 'tri' : 'com')
      : temCom && temTri ? (fc && !ft ? 'tri' : ft && !fc ? 'com' : 'tri')
      : temTri ? 'tri' : temCom ? 'com' : 'nd';
    const inicio = (tipo === 'tri' ? it : tipo === 'com' ? ic : null) || it || ic; // início da tratativa (sem ele, conta da agenda)
    const re = paraData(g('resolucao')) || (tipo === 'tri' ? ft : tipo === 'com' ? fc : null); // resolução: coluna própria ou FIM DIV do tipo
    const senha = String(g('senha')).trim(), nfTexto = String(g('nf')).replace(/\s+/g, ' ').trim(); // texto inteiro da célula (ex.: "1602192 a 195")
    const nfNum = (nfTexto.match(/\d+/) || [''])[0].replace(/^0+/, ''); // 1º número: só para a identificação (mantém o que já foi salvo)
    return aplicar({ id: senha + '|' + nfNum, senha, nf: nfTexto, cd: String(g('cd')).trim() || '(sem CD)', status: String(g('status')).trim(),
      fornecedor: String(g('fornecedor')).trim() || '(sem fornecedor)', categoriaArquivo: String(g('categoria')).trim(),
      tipoArquivo: tipo, tipoPorColuna: !div && tipo !== 'nd', // tipoArquivo: o que a planilha disse ('nd' = nada)
      agenda: ag, inicio, resolucaoArquivo: re, descricao: div });
  }
}
function decodificar(buf){ // texto: tenta UTF-8 e cai para Windows-1252 (Excel antigo)
  try{ return new TextDecoder('utf-8', {fatal:true}).decode(buf); } catch(e){ return new TextDecoder('windows-1252').decode(buf); }
}
function lerTabelaHtml(t){ // .xls que na verdade é página HTML (comum em exportações de sistemas)
  const doc = new DOMParser().parseFromString(t, 'text/html');
  const tab = [...doc.querySelectorAll('table')].sort((a,b) => b.rows.length - a.rows.length)[0]; // a maior tabela da página
  if(!tab){
    const capa = doc.querySelector('link#shLink[href]') || /Excel Workbook Frameset/i.test(t); // "capa" de uma Página da Web do Excel
    throw new Error(capa
      ? 'Este arquivo é só a “capa” de uma página do Excel: os dados ficam na pasta “' + ((doc.querySelector('link#shLink[href]')?.getAttribute('href') || '').split('/')[0] || 'de mesmo nome, terminada em _arquivos') + '”, no arquivo sheet001.htm. Carregue esse sheet001.htm, ou abra o .xls no Excel e use Salvar como > Pasta de Trabalho do Excel (.xlsx).'
      : 'O arquivo não tem nenhuma tabela.');
  }
  return [...tab.rows].map(r => [...r.cells].flatMap(c => { // mantém o alinhamento quando há células mescladas
    const v = c.textContent.replace(/\s+/g, ' ').trim(); return [v, ...Array(Math.max(0, (c.colSpan || 1) - 1)).fill('')]; }));
}
async function lerPlanilha(f, achar){ // linhas de um CSV, página HTML ou Excel (no Excel, a 1ª aba em que achar() encontra o cabeçalho)
  const buf = await f.arrayBuffer(), inicio = new TextDecoder('windows-1252').decode(buf.slice(0, 2048)).replace(/^﻿|^ï»¿/, '').trim();
  if(/\.csv$/i.test(f.name)) return lerCSV(decodificar(buf));
  if(/^</.test(inicio) && /<(html|table)\b/i.test(inicio) || /\.html?$/i.test(f.name)) return lerTabelaHtml(decodificar(buf));
  const wb = XLSX.read(buf, {type:'array', cellDates:true});
  const abas = wb.SheetNames.map(n => XLSX.utils.sheet_to_json(wb.Sheets[n], {header:1, raw:true, defval:''}));
  return abas.find(r => achar(r)) || abas[0];
}
async function carregarArquivo(f){
  try{ await definirDados(montarRegistros(await lerPlanilha(f, acharCabecalho)), 'Arquivo: ' + f.name, true); }
  catch(e){ $('aviso').textContent = 'Não foi possível ler a planilha. ' + e.message; }
}

/* ===== 2) FILTROS DO TOPO (período, turno e categoria) ===== */
const FILTRO = { periodo: 'tudo', de: null, ate: null, turno: '', cat: '' };
const diaSoma = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
function lerFiltros(){ // lê os campos do topo e calcula o intervalo de datas (de: inclusive, ate: exclusive)
  const p = $('fPeriodo').value, hoje = diaSoma(new Date(), 0), amanha = diaSoma(hoje, 1);
  const deCampo = v => v ? new Date(v + 'T00:00') : null;
  const faixas = { tudo: [null, null], hoje: [hoje, amanha], ontem: [diaSoma(hoje, -1), hoje], d7: [diaSoma(hoje, -6), amanha], d30: [diaSoma(hoje, -29), amanha],
    mes: [new Date(hoje.getFullYear(), hoje.getMonth(), 1), amanha], mesant: [new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1), new Date(hoje.getFullYear(), hoje.getMonth(), 1)],
    custom: [deCampo($('fDe').value), $('fAte').value ? diaSoma(deCampo($('fAte').value), 1) : null] };
  [FILTRO.de, FILTRO.ate] = faixas[p] || faixas.tudo;
  Object.assign(FILTRO, { periodo: p, turno: $('fTurno').value, cat: $('fCat').value });
  $('fDatas').classList.toggle('hidden', p !== 'custom');
}
const filtroAtivo = () => !!(FILTRO.de || FILTRO.ate || FILTRO.turno !== '' || FILTRO.cat);
function noTurno(data, t){ const h = data.getHours(); return t.ini < t.fim ? h >= t.ini && h < t.fim : h >= t.ini || h < t.fim; }
function passaFiltro(d){ // a senha entra nos filtros do topo? (datas e turno pela DATA/HORA AGENDA)
  const f = FILTRO, ag = d.agenda;
  if((f.de || f.ate) && (!ag || (f.de && ag < f.de) || (f.ate && ag >= f.ate))) return false;
  if(f.turno !== '' && (!ag || !noTurno(ag, CONFIG.TURNOS[+f.turno]))) return false;
  if(f.cat){
    if(f.cat === SEM_CATEGORIA) return d.categoria === SEM_CATEGORIA;
    if(f.cat.startsWith('grupo:')){ const g = f.cat.slice(6); return d.categoria === g || (CONFIG.CATEGORIAS[g] || []).includes(d.categoria); }
    return d.categoria === f.cat;
  }
  return true;
}
function desenharFiltros(){ // monta as listas de turno e categoria (mantém o que estava escolhido)
  const t = $('fTurno'), c = $('fCat'), vt = t.value, vc = c.value, opc = (v, txt) => `<option value="${esc(v)}">${esc(txt)}</option>`;
  if(!t.options.length) t.innerHTML = opc('', 'Todos os turnos') + CONFIG.TURNOS.map((x, i) => opc(i, x.nome)).join('');
  const lista = Object.values(CONFIG.CATEGORIAS).flat(), grupos = Object.keys(CONFIG.CATEGORIAS);
  const outras = [...new Set(todas().map(d => d.categoria))].filter(x => x !== SEM_CATEGORIA && !lista.includes(x) && !grupos.includes(x)).sort();
  c.innerHTML = opc('', 'Todas as categorias') + opc(SEM_CATEGORIA, 'Sem categoria')
    + Object.entries(CONFIG.CATEGORIAS).map(([g, l]) => `<optgroup label="${esc(g)}">${opc('grupo:' + g, 'Todo o grupo ' + g)}${l.map(x => opc(x, x)).join('')}</optgroup>`).join('')
    + (outras.length ? `<optgroup label="Outras">${outras.map(x => opc(x, x)).join('')}</optgroup>` : '');
  t.value = vt; c.value = [...c.options].some(o => o.value === vc) ? vc : '';
  lerFiltros();
  $('fLimpar').classList.toggle('hidden', !filtroAtivo());
  $('fVisao').innerHTML = !BANCO.ok ? '' : '<span class="visao" role="group" aria-label="O que mostrar">'
    + [['base', 'Base carregada'], ['hist', 'Histórico completo']].map(([v, txt]) => `<button type="button" data-visao="${v}" class="${VISAO === v ? 'on' : ''}">${txt}</button>`).join('') + '</span>';
}

/* ===== 3) CÁLCULOS ===== */
function contar(lista, chave){ const m = new Map(); for(const x of lista) m.set(chave(x), (m.get(chave(x)) || 0) + 1); return m; }
function topFornecedores(tipo){ // fornecedores com mais senhas divergentes
  const dv = visiveis(), base = tipo === 'todos' ? dv : dv.filter(d => d.tipo === tipo), por = new Map();
  for(const d of base){ if(!por.has(d.fornecedor)) por.set(d.fornecedor, []); por.get(d.fornecedor).push(d); }
  return [...por].map(([nome, l]) => ({ nome, total: l.length, com: l.filter(x => x.tipo === 'com').length,
      tri: l.filter(x => x.tipo === 'tri').length, nd: l.filter(x => x.tipo === 'nd').length,
      cats: [...contar(l, x => x.categoria)].sort((a,b) => b[1] - a[1]).slice(0, 4) }))
    .sort((a,b) => b.total - a.total).slice(0, CONFIG.TOP_N);
}
function topCategoriasPorTempo(tipo){ // categorias com maior tempo de resolução (só senhas resolvidas)
  const por = new Map();
  for(const d of visiveis()) if(d.tipo === tipo && horas(d) != null){ if(!por.has(d.categoria)) por.set(d.categoria, []); por.get(d.categoria).push(horas(d)); }
  return [...por].map(([nome, v]) => { v.sort((a,b) => a - b);
      const media = v.reduce((a,b) => a + b, 0) / v.length, mediana = v.length % 2 ? v[(v.length-1)/2] : (v[v.length/2-1] + v[v.length/2]) / 2;
      return { nome, n: v.length, valor: CONFIG.METRICA_TEMPO === 'mediana' ? mediana : media }; })
    .sort((a,b) => b.valor - a.valor).slice(0, CONFIG.TOP_N);
}

/* ===== 3b) NOTAS FISCAIS (XML de NF-e) ===== */
let NOTAS = [], NOTAS_POR_NF = new Map(); // notas carregadas e índice por número da NF
const UFS = {11:'RO',12:'AC',13:'AM',14:'RR',15:'PA',16:'AP',17:'TO',21:'MA',22:'PI',23:'CE',24:'RN',25:'PB',26:'PE',27:'AL',28:'SE',29:'BA',
  31:'MG',32:'ES',33:'RJ',35:'SP',41:'PR',42:'SC',43:'RS',50:'MS',51:'MT',52:'GO',53:'DF'};
function digitoVerificador(c){ // módulo 11 sobre os 43 primeiros dígitos da chave
  let s = 0, p = 2; for(let i = 42; i >= 0; i--){ s += +c[i] * p; p = p === 9 ? 2 : p + 1; }
  const r = s % 11; return r < 2 ? 0 : 11 - r;
}
function lerChave(c){ // a chave de acesso tem 44 dígitos e carrega dados da nota (mas não os produtos)
  c = String(c).replace(/\D/g, ''); if(c.length !== 44) return null;
  return { uf: UFS[+c.slice(0, 2)] || c.slice(0, 2), emissao: c.slice(4, 6) + '/20' + c.slice(2, 4), cnpj: c.slice(6, 20),
    modelo: c.slice(20, 22), serie: String(+c.slice(22, 25)), nf: String(+c.slice(25, 34)), valida: digitoVerificador(c) === +c[43] };
}
const lerTag = (el, tag) => el?.getElementsByTagName(tag)[0]?.textContent.trim() ?? '';
function lerXmlNfe(xml){ // extrai nota, fornecedor e itens de um XML de NF-e (com ou sem o envelope nfeProc)
  const inf = new DOMParser().parseFromString(xml, 'text/xml').getElementsByTagName('infNFe')[0];
  if(!inf) throw new Error('não é um XML de NF-e');
  const ide = inf.getElementsByTagName('ide')[0], emit = inf.getElementsByTagName('emit')[0];
  return { chave: (inf.getAttribute('Id') || '').replace(/^NFe/, ''), nf: String(+lerTag(ide, 'nNF')), serie: lerTag(ide, 'serie'),
    emissao: paraData(lerTag(ide, 'dhEmi') || lerTag(ide, 'dEmi')), cnpj: lerTag(emit, 'CNPJ'), emitente: lerTag(emit, 'xNome'),
    itens: [...inf.getElementsByTagName('det')].map(d => ({ cod: lerTag(d, 'cProd'), ean: lerTag(d, 'cEAN'), desc: lerTag(d, 'xProd'),
      ncm: lerTag(d, 'NCM'), qtd: lerTag(d, 'qCom'), valor: lerTag(d, 'vProd') })) };
}
function indexarNotas(){ NOTAS_POR_NF = new Map(); for(const n of NOTAS){ if(!NOTAS_POR_NF.has(n.nf)) NOTAS_POR_NF.set(n.nf, []); NOTAS_POR_NF.get(n.nf).push(n); } }
function mesmoFornecedor(a, b){ // compara nomes ignorando acento e caixa; aceita um conter o outro ou começarem igual
  const x = norm(a), y = norm(b), ini = s => s.split(' ').slice(0, 2).join(' ');
  return !!x && !!y && (x.includes(y) || y.includes(x) || ini(x) === ini(y));
}
function numerosDaNf(texto){ // "1602192 a 195" -> 1602192..1602195; "1602192/193" -> 1602192 e 1602193
  const partes = String(texto ?? '').split(/(\d+)/), nums = [];
  let ant = null, intervalo = false;
  for(let i = 1; i < partes.length; i += 2){
    let n = partes[i].replace(/^0+/, '') || '0';
    if(ant && n.length < ant.length) n = ant.slice(0, ant.length - n.length) + n; // final abreviado: completa com o começo do anterior
    if(intervalo && ant && +n > +ant && +n - +ant <= 200) for(let k = +ant + 1; k < +n; k++) nums.push(String(k));
    nums.push(n); ant = n;
    intervalo = /^\s*(a|ate|até|-|–|à)\s*$/i.test(partes[i + 1] || ''); // separador seguinte indica faixa?
  }
  return [...new Set(nums)];
}
function notasDaSenha(d){ // liga a senha à(s) nota(s) pelo(s) número(s) da NF; se o número se repete, desempata pelo fornecedor
  return numerosDaNf(d.nf).flatMap(num => { const c = NOTAS_POR_NF.get(num) || []; return c.length <= 1 ? c : c.filter(n => mesmoFornecedor(n.emitente, d.fornecedor)); });
}

/* ===== 3c) CATEGORIA AUTOMÁTICA (cadastro de produtos e regras por fornecedor) =====
   Ordem: 1) itens das NFs ligadas à senha (EAN ou PLU no cadastro de produtos); 2) regra do fornecedor; 3) fornecedor no cadastro.
   A categoria da planilha e a escolhida na tela sempre valem mais que a sugerida. */
let PRODUTOS = { nome: '', total: 0, porPlu: new Map(), porEan: new Map(), porForn: new Map() };
let REGRAS = lerSalvo(CONFIG.CHAVE_REGRAS); if(!Array.isArray(REGRAS)) REGRAS = []; // [{ forn, cat, origem: 'tela'|'aprendida', alterado, removida }]
const CACHE_FORN = new Map(); // fornecedor -> categoria mais comum no cadastro (evita refazer a busca a cada desenho)
const codigo = v => { const t = String(v ?? '').trim().toUpperCase(); return /^\d+$/.test(t) ? t.replace(/^0+(?=\d)/, '') : t; }; // compara códigos sem zeros à esquerda
const maisFrequente = m => [...m].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
function mapearCategoria(t){ // texto do cadastro -> categoria da lista (pelo nome completo ou só pelo começo, ex.: "LIQUIDA 4"); senão, o próprio texto
  const n = norm(t); if(!n) return '';
  for(const [g, l] of Object.entries(CONFIG.CATEGORIAS)){
    if(n === norm(g)) return g;
    for(const c of l) if(n === norm(c) || n === norm(c.split('–')[0])) return c;
  }
  return String(t).trim();
}
function acharCabecalhoProdutos(rows){ // mesma ideia de acharCabecalho, mas cada coluna pega o primeiro nome da lista que existir
  for(let i = 0; i < Math.min(rows.length, CONFIG.LINHAS_PARA_ACHAR_CABECALHO); i++){
    const cab = rows[i].map(norm), idx = {};
    for(const [k, nomes] of Object.entries(CONFIG.COLUNAS_PRODUTOS)) idx[k] = nomes.map(norm).map(x => cab.indexOf(x)).find(x => x >= 0) ?? -1;
    if(idx.categoria >= 0 && (idx.plu >= 0 || idx.ean >= 0 || idx.fornecedor >= 0)) return { linha: i, idx };
  }
  return null;
}
function indexarProdutos(nome, lista){ // lista: [plu, ean, fornecedor, categoria]
  const porPlu = new Map(), porEan = new Map(), porForn = new Map();
  for(const [plu, ean, fo, cat] of lista){ if(!cat) continue;
    if(plu) porPlu.set(plu, cat); if(ean) porEan.set(ean, cat);
    if(fo){ const k = norm(fo); if(!porForn.has(k)) porForn.set(k, new Map()); const m = porForn.get(k); m.set(cat, (m.get(cat) || 0) + 1); } }
  PRODUTOS = { nome, total: lista.length, porPlu, porEan, porForn }; CACHE_FORN.clear();
}
async function carregarProdutos(f){
  try{
    const rows = await lerPlanilha(f, acharCabecalhoProdutos), c = acharCabecalhoProdutos(rows);
    if(!c) throw new Error('Não encontrei as colunas. O arquivo precisa de uma coluna Categoria e de pelo menos uma destas: PLU (ou Código), EAN ou Fornecedor.');
    const g = (r, k) => c.idx[k] < 0 ? '' : r[c.idx[k]];
    const lista = rows.slice(c.linha + 1).map(r => [codigo(g(r, 'plu')), codigo(g(r, 'ean')), String(g(r, 'fornecedor') ?? '').trim(), mapearCategoria(g(r, 'categoria'))])
      .filter(x => x[3] && (x[0] || x[1] || x[2]));
    if(!lista.length) throw new Error('Nenhuma linha com categoria.');
    indexarProdutos(f.name, lista); await idbGravar('produtos', { nome: f.name, lista }); $('erroProdutos').textContent = '';
    redesenhar();
  } catch(e){ $('erroProdutos').textContent = 'Não foi possível ler o arquivo de produtos. ' + e.message; }
}
async function removerProdutos(){ indexarProdutos('', []); await idbGravar('produtos', null); redesenhar(); }
function regraDoFornecedor(f){ // regra cujo texto está contido no nome do fornecedor; a mais específica (texto mais longo) ganha
  const n = norm(f); if(!n) return null; let melhor = null;
  const lista = REGRAS.filter(r => !r.removida).concat(Object.entries(CONFIG.FORNECEDOR_CATEGORIA).map(([forn, cat]) => ({ forn, cat, origem: 'config' })));
  for(const r of lista){ const k = norm(r.forn); if(k && n.includes(k) && (!melhor || k.length > norm(melhor.forn).length)) melhor = r; }
  return melhor;
}
function categoriaDoCadastro(f){ // categoria mais comum dos produtos do fornecedor no cadastro
  const n = norm(f); if(!n || !PRODUTOS.porForn.size) return '';
  if(!CACHE_FORN.has(n)){ let m = PRODUTOS.porForn.get(n);
    if(!m){ const ini = s => s.split(' ').slice(0, 2).join(' '); for(const [k, v] of PRODUTOS.porForn) if(k.includes(n) || n.includes(k) || ini(k) === ini(n)){ m = v; break; } }
    CACHE_FORN.set(n, m ? maisFrequente(m) : ''); }
  return CACHE_FORN.get(n);
}
function categoriaAutomatica(d){
  if(PRODUTOS.total && NOTAS.length){ const cont = new Map();
    for(const n of notasDaSenha(d)) for(const i of n.itens){
      const c = PRODUTOS.porEan.get(codigo(i.ean)) || PRODUTOS.porPlu.get(codigo(i.cod)); if(c) cont.set(c, (cont.get(c) || 0) + 1); }
    const c = maisFrequente(cont); if(c) return { cat: c, origem: 'nf' }; }
  const r = regraDoFornecedor(d.fornecedor); if(r) return { cat: r.cat, origem: 'regra' };
  const c = categoriaDoCadastro(d.fornecedor); return c ? { cat: c, origem: 'cadastro' } : null;
}
function recalcularCategorias(){ for(const d of DADOS) aplicar(d); for(const d of HIST.values()) aplicar(d); }
function salvarRegra(forn, cat, origem){ // cria ou troca a regra deste fornecedor (cat vazio = remove)
  const k = norm(forn); if(!k) return; let r = REGRAS.find(x => norm(x.forn) === k);
  if(!r){ if(!cat) return; r = { forn: String(forn).trim() }; REGRAS.push(r); }
  Object.assign(r, { cat: cat || r.cat, origem: cat ? origem : r.origem, removida: !cat, alterado: new Date().toISOString() });
  gravarSalvo(REGRAS, CONFIG.CHAVE_REGRAS); if(BANCO.ok) salvarBanco();
}
function juntarRegras(lista){ // regras vindas do banco: em cada fornecedor vale a alteração mais recente
  let mudou = 0;
  for(const r of Array.isArray(lista) ? lista : []){ const h = REGRAS.find(x => norm(x.forn) === norm(r.forn));
    if(!h){ REGRAS.push({ ...r }); mudou++; } else if((r.alterado || '') > (h.alterado || '')){ Object.assign(h, r); mudou++; } }
  if(mudou) gravarSalvo(REGRAS, CONFIG.CHAVE_REGRAS);
  return mudou;
}
function desenharCategorias(){ // aba Categorias: resumo do cadastro, regras e quantas NFs receberam categoria sugerida
  const vs = todas(), conta = o => vs.filter(d => d.categoriaOrigem === o).length;
  $('resumoProdutos').innerHTML = PRODUTOS.total ? `<b>${esc(PRODUTOS.nome)}</b>: ${PRODUTOS.total} produtos (${PRODUTOS.porEan.size} com EAN, ${PRODUTOS.porPlu.size} com PLU), ${PRODUTOS.porForn.size} fornecedores.` : 'Nenhum arquivo de produtos carregado.';
  $('btnTirarProdutos').classList.toggle('hidden', !PRODUTOS.total);
  $('resumoAuto').textContent = vs.length ? `Categoria sugerida em ${conta('nf') + conta('regra') + conta('cadastro')} de ${vs.length} NFs: ${conta('nf')} pelos itens da NF, ${conta('regra')} pela regra do fornecedor, ${conta('cadastro')} pelo cadastro. ${vs.filter(d => d.categoria === SEM_CATEGORIA).length} continuam sem categoria.` : '';
  const sel = $('regraCat'); if(!sel.options.length) sel.innerHTML = '<option value="">Escolha a categoria…</option>' + Object.entries(CONFIG.CATEGORIAS).map(([g, l]) => `<optgroup label="${esc(g)}">${l.map(c => `<option>${esc(c)}</option>`).join('')}</optgroup>`).join('');
  $('listaFornecedores').innerHTML = [...new Set(vs.map(d => d.fornecedor))].sort().map(f => `<option value="${esc(f)}">`).join('');
  const nomeOrigem = { config: 'Fixa (CONFIG)', tela: 'Criada na tela', aprendida: 'Aprendida de uma escolha' };
  const regras = REGRAS.filter(r => !r.removida).concat(Object.entries(CONFIG.FORNECEDOR_CATEGORIA).map(([forn, cat]) => ({ forn, cat, origem: 'config' })));
  $('corpoRegras').innerHTML = regras.length ? regras.map(r => `<tr><td>${esc(r.forn)}</td><td>${esc(r.cat)}</td><td><span class="vazio">${nomeOrigem[r.origem] || ''}</span></td>`
    + `<td>${vs.filter(d => d.categoriaOrigem === 'regra' && norm(regraDoFornecedor(d.fornecedor)?.forn) === norm(r.forn)).length}</td>`
    + `<td>${r.origem === 'config' ? '' : `<button type="button" class="link" data-tirar-regra="${esc(r.forn)}">Remover</button>`}</td></tr>`).join('')
    : '<tr><td colspan="5" class="vazio">Nenhuma regra ainda.</td></tr>';
}

async function carregarXmls(files){
  let erros = 0;
  for(const f of files){ try{ const n = lerXmlNfe(await f.text()); NOTAS = NOTAS.filter(x => !n.chave || x.chave !== n.chave).concat(n); } catch(e){ erros++; } }
  indexarNotas(); redesenhar(); // os itens das notas podem trazer a categoria
  if(erros) $('resumoNotas').textContent += ' ' + erros + ' arquivo(s) não são XML de NF-e e foram ignorados.';
}
function desenharNotas(){
  const vs = visiveis(), itens = NOTAS.flatMap(n => n.itens.map(i => ({ n, i }))), lig = vs.filter(d => notasDaSenha(d).length).length;
  $('resumoNotas').textContent = NOTAS.length ? NOTAS.length + ' notas, ' + itens.length + ' itens. ' + lig + ' de ' + vs.length + ' senhas ligadas a uma nota.' : 'Nenhuma nota carregada ainda.';
  $('corpoNotas').innerHTML = itens.slice(0, CONFIG.MAX_LINHAS_BASE).map(({ n, i }) => `<tr><td>${esc(n.nf)}</td><td>${esc(n.emitente)}</td><td>${esc(i.cod)}</td><td>${esc(i.desc)}</td><td>${esc(i.ncm)}</td><td>${esc(i.qtd)}</td></tr>`).join('');
}

/* ===== 3c) BANCO DE DADOS (histórico num arquivo .json, ex.: numa pasta do OneDrive) =====
   Cada base carregada é juntada ao histórico, sem repetir a mesma senha e NF.
   As escolhas da tela (tipo, categoria, resolvido) também vão para o arquivo, então todos que usam o mesmo arquivo veem o mesmo.
   Funciona no Edge e no Chrome. O navegador pede permissão para mexer no arquivo uma vez por sessão. */
const BANCO = { handle: null, ok: false, nome: '', lido: 0, atualizado: null, timer: null };
const temSuporteBanco = () => 'showOpenFilePicker' in window;
const CAMPOS_ARQUIVO = ['senha','nf','cd','status','fornecedor','categoriaArquivo','tipoArquivo','tipoPorColuna','agenda','inicio','resolucaoArquivo','descricao'];
const CAMPOS_MANUAIS = ['tipoManual','categoriaManual','resolucaoManual','chamadoManual'];
const CAMPOS_DATA = ['agenda','inicio','resolucaoArquivo','resolucaoManual','primeiraVez','ultimaVez'];
// Guarda o "endereço" do arquivo escolhido no navegador, para reconectar sem procurar de novo
function idb(modo, fn){ return new Promise((ok, erro) => { const r = indexedDB.open('painel-senhas', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onerror = () => erro(r.error);
  r.onsuccess = () => { try{ const t = r.result.transaction('kv', modo), q = fn(t.objectStore('kv'));
    t.oncomplete = () => ok(q?.result); t.onerror = t.onabort = () => erro(t.error); } catch(e){ erro(e); } }; }); } // erro na hora também encerra
const idbLer = k => idb('readonly', s => s.get(k)).catch(() => null);
const idbGravar = (k, v) => idb('readwrite', s => s.put(v, k)).catch(() => null);

function paraJson(d){ const o = { id: d.id, alterado: d.alterado };
  for(const k of [...CAMPOS_ARQUIVO, ...CAMPOS_MANUAIS, 'primeiraVez', 'ultimaVez']) if(d[k] != null && d[k] !== '') o[k] = d[k] instanceof Date ? d[k].toISOString() : d[k];
  return o; }
function deJson(o){ const d = { ...o }; for(const k of CAMPOS_DATA) d[k] = d[k] ? new Date(d[k]) : null;
  d.tipoArquivo = d.tipoArquivo || 'nd'; return aplicar(d); }
const marcar = d => { d.alterado = new Date().toISOString(); };

async function lerArquivoBanco(){ // lê o arquivo e devolve a lista de registros (arquivo vazio = banco novo)
  const f = await BANCO.handle.getFile(); BANCO.lido = f.lastModified;
  const t = (await f.text()).trim(); if(!t) return [];
  const j = JSON.parse(t); if(!Array.isArray(j.registros)) throw new Error('o arquivo não é um banco deste painel');
  BANCO.atualizado = j.atualizado ? new Date(j.atualizado) : null;
  BANCO.regrasMudaram = juntarRegras(j.regras); // regras "fornecedor -> categoria" do time
  if(BANCO.regrasMudaram) CACHE_FORN.clear();
  return j.registros.map(deJson);
}
function juntarDoArquivo(regs){ // junta o que está no arquivo com o que está na tela: em cada senha vale a alteração mais recente
  let mudou = 0;
  for(const r of regs){ const h = HIST.get(r.id);
    if(!h){ HIST.set(r.id, r); mudou++; }
    else if((r.alterado || '') > (h.alterado || '')){ Object.assign(h, r); aplicar(h); mudou++; } } // mantém o mesmo objeto (a tabela aponta para ele)
  return mudou;
}
function juntarBase(regs, outras){ // junta a base carregada ao histórico; devolve quantas senhas são novas e quantas foram atualizadas
  const agora = new Date(); let novas = 0, atualizadas = 0;
  regs.forEach((r, i) => { const h = HIST.get(r.id);
    if(!h){ r.primeiraVez = agora; r.ultimaVez = agora; marcar(r); HIST.set(r.id, r); novas++; return; }
    const resolvida = !!h.resolucaoArquivo;
    for(const k of CAMPOS_ARQUIVO){ // o que veio da planilha é atualizado, mas vazio não apaga o que o banco já sabe (ex.: base antiga carregada depois)
      const vazio = r[k] == null || r[k] === '' || (k === 'tipoArquivo' && r[k] === 'nd');
      if(vazio || (k === 'status' && resolvida)) continue;
      if(k === 'tipoPorColuna' && r.tipoArquivo === 'nd') continue;
      h[k] = r[k]; }
    for(const k of CAMPOS_MANUAIS) if(h[k] == null && r[k] != null) h[k] = r[k]; // escolha manual: mantém a do banco
    h.ultimaVez = agora; marcar(h); aplicar(h); regs[i] = h; atualizadas++; });
  for(const o of outras || []){ const h = HIST.get(o.id); if(!h) continue; // senha do histórico que hoje não está mais divergente
    h.status = o.status;
    if(o.resolucaoArquivo && !h.resolucaoArquivo){ h.resolucaoArquivo = o.resolucaoArquivo; h.inicio = h.inicio || o.inicio; }
    if(h.tipoArquivo === 'nd' && o.tipoArquivo !== 'nd'){ h.tipoArquivo = o.tipoArquivo; h.tipoPorColuna = o.tipoPorColuna; h.inicio = h.inicio || o.inicio; }
    h.ultimaVez = agora; marcar(h); aplicar(h); atualizadas++; }
  return { novas, atualizadas };
}
async function gravarBanco(){ // relê o arquivo (alguém pode ter mexido), junta e grava
  if(!BANCO.ok) return;
  try{
    juntarDoArquivo(await lerArquivoBanco());
    BANCO.atualizado = new Date();
    const w = await BANCO.handle.createWritable();
    await w.write(JSON.stringify({ versao: 1, atualizado: BANCO.atualizado.toISOString(), registros: [...HIST.values()].map(paraJson), regras: REGRAS }, null, 1));
    await w.close(); BANCO.lido = (await BANCO.handle.getFile()).lastModified;
    desenharBanco();
  } catch(e){ falhaBanco(e); }
}
let esperaGravar = null;
const salvarBanco = () => { clearTimeout(esperaGravar); esperaGravar = setTimeout(gravarBanco, 600); }; // junta cliques seguidos numa gravação só
async function conectarBanco(handle){ // passa a usar este arquivo como banco
  BANCO.handle = handle; BANCO.nome = handle.name;
  try{
    HIST.clear(); juntarDoArquivo(await lerArquivoBanco());
    BANCO.ok = true; VISAO = 'hist'; await idbGravar('banco', handle);
    if(BASE_REAL){ juntarBase(DADOS, DADOS.outras); } // a base que já estava aberta entra no histórico
    await gravarBanco(); vigiarBanco(); redesenhar();
  } catch(e){ falhaBanco(e); }
}
function falhaBanco(e){ BANCO.ok = false; desenharBanco('Não foi possível usar o banco: ' + (e?.message || e) + '.'); redesenhar(); }
function vigiarBanco(){ // a cada minuto, confere se alguém do time gravou algo novo no arquivo
  clearInterval(BANCO.timer);
  BANCO.timer = setInterval(async () => { if(!BANCO.ok) return;
    try{ const f = await BANCO.handle.getFile(); if(f.lastModified !== BANCO.lido && (juntarDoArquivo(await lerArquivoBanco()) + BANCO.regrasMudaram)) redesenhar(); }
    catch(e){ falhaBanco(e); } }, 60000);
}
async function criarBanco(){
  try{ conectarBanco(await window.showSaveFilePicker({ suggestedName: 'historico-senhas.json', types: [{ description: 'Banco do painel (JSON)', accept: { 'application/json': ['.json'] } }] })); }
  catch(e){ if(e.name !== 'AbortError') falhaBanco(e); }
}
async function abrirBanco(){
  try{ const [h] = await window.showOpenFilePicker({ types: [{ description: 'Banco do painel (JSON)', accept: { 'application/json': ['.json'] } }] }); conectarBanco(h); }
  catch(e){ if(e.name !== 'AbortError') falhaBanco(e); }
}
async function reconectarBanco(){ // precisa de um clique: o navegador pergunta se pode mexer no arquivo
  try{ if(await BANCO.handle.requestPermission({ mode: 'readwrite' }) === 'granted') conectarBanco(BANCO.handle); else desenharBanco('Permissão negada. O histórico não será salvo.'); }
  catch(e){ falhaBanco(e); }
}
async function iniciarBanco(){ // ao abrir a página: tenta voltar ao arquivo usado da última vez
  if(!temSuporteBanco()){ desenharBanco(); return; }
  const h = await idbLer('banco'); if(!h){ desenharBanco(); return; }
  BANCO.handle = h; BANCO.nome = h.name;
  try{ if(await h.queryPermission({ mode: 'readwrite' }) === 'granted') return conectarBanco(h); } catch(e){}
  desenharBanco(); // sem permissão ainda: mostra o botão Reconectar
}
function desenharBanco(msg){ // indicador pequeno no topo; clicar abre os detalhes e os botões
  const el = $('banco'), aberto = el.querySelector('details')?.open, btn = (id, t, cls = '') => `<button type="button" id="${id}" class="${cls}">${t}</button>`;
  let estado, rotulo, corpo;
  if(!temSuporteBanco()){ estado = 'off'; rotulo = 'Sem banco'; corpo = '<p><b>Banco de dados indisponível neste navegador.</b> Abra o painel no Edge ou no Chrome para guardar o histórico.</p>'; }
  else if(BANCO.ok){
    const n = HIST.size, ab = [...HIST.values()].filter(d => !d.resolucao).length;
    estado = 'on'; rotulo = 'Banco conectado';
    corpo = `<p><b>${esc(BANCO.nome)}</b><br>${n} ${n === 1 ? 'senha' : 'senhas'} no histórico, ${ab} em aberto.` + (BANCO.atualizado ? `<br><span class="vazio">Gravado ${dataHoraBR(BANCO.atualizado)}</span>` : '') + '</p>'
      + '<div class="pop-acoes">' + btn('bTrocar', 'Trocar arquivo') + '</div>';
  } else if(BANCO.handle){ estado = 'espera'; rotulo = 'Reconectar banco';
    corpo = `<p><b>${esc(BANCO.nome)}</b> precisa da sua permissão para ser usado nesta sessão.</p><div class="pop-acoes">${btn('bRecon', 'Reconectar', 'primario')}${btn('bAbrir', 'Abrir outro')}</div>`; }
  else { estado = 'off'; rotulo = 'Banco desconectado';
    corpo = '<p>O histórico não está sendo salvo. Crie o banco numa pasta compartilhada do OneDrive ou abra o que o time já usa.</p><div class="pop-acoes">' + btn('bCriar', 'Criar banco', 'primario') + btn('bAbrir', 'Abrir banco existente') + '</div>'; }
  if(msg) estado = 'erro';
  el.innerHTML = `<details class="banco ${estado}"${aberto || msg ? ' open' : ''}><summary title="Banco de dados (histórico)"><span class="ponto"></span>${rotulo}</summary>`
    + `<div class="banco-pop">${corpo}${msg ? `<p class="erro">${esc(msg)}</p>` : ''}</div></details>`;
  const liga = (id, fn) => { const b = $(id); if(b) b.onclick = fn; };
  liga('bCriar', criarBanco); liga('bAbrir', abrirBanco); liga('bTrocar', abrirBanco); liga('bRecon', reconectarBanco);
}

/* ===== 4) DESENHO DA TELA ===== */
function redesenhar(){ recalcularCategorias(); desenharBanco(); desenharFiltros(); desenharPainel(); desenharBase(); desenharNotas(); desenharCategorias(); }
function linha(rotulo, valor, max, texto, cls, extra){ // uma barra de ranking
  return `<div class="row"><div class="top"><span title="${esc(rotulo)}">${esc(rotulo)}</span><b>${texto}</b></div>
    <div class="tr"><div class="fl ${cls}" style="width:${max ? valor / max * 100 : 0}%"></div></div>${extra || ''}</div>`;
}
function desenharPainel(){
  const dv = visiveis(), abertas = dv.filter(d => horas(d) == null).length, res = dv.filter(d => horas(d) != null);
  $('estadoVazio').classList.toggle('hidden', todas().length > 0);
  $('avisoCat').textContent = temCategoria() ? '' : 'Nenhuma NF tem categoria ainda. Escolha a categoria de cada NF na Base detalhada. Os rankings por fornecedor já funcionam.';
  const med = res.length ? res.reduce((a,d) => a + horas(d), 0) / res.length : 0;
  $('kpis').innerHTML = [[dv.length,'NFs divergentes'],[dv.filter(d => d.tipo === 'com').length,'comerciais'],
    [dv.filter(d => d.tipo === 'tri').length,'tributárias'],
    [abertas,'ainda abertas'],[res.length ? hh(med) : '–','tempo médio de resolução'],
    [dv.filter(d => d.tipo === 'nd').length,'tipo não informado']]
    .filter(([v,t], i) => i < 5 || v > 0) // "tipo não informado" só aparece quando existe
    .map(([v,t]) => `<div class="kpi"><b>${v}</b><span>${t}</span></div>`).join('');

  const tipo = $('filtroTipo').value, f = topFornecedores(tipo), maxF = f[0]?.total || 0;
  $('pForn').innerHTML = f.length ? f.map(x => {
    const chips = !temCategoria() ? '' : '<div class="chips">' + x.cats.map(([c,n]) => `<span class="chip">${esc(c)} (${n})</span>`).join('') + '</div>';
    const barra = tipo === 'todos'
      ? `<div class="tr" style="display:flex;width:${x.total / maxF * 100}%">` + [['com', x.com], ['tri', x.tri], ['nd', x.nd]]
          .filter(([, n]) => n).map(([c, n]) => `<div class="fl ${c}" style="width:${n / x.total * 100}%;border-radius:0"></div>`).join('') + '</div>'
      : `<div class="tr"><div class="fl ${tipo}" style="width:${x.total / maxF * 100}%"></div></div>`;
    const partes = tipo !== 'todos' ? '' : '<span class="por-tipo">' + [['com', x.com, 'com.'], ['tri', x.tri, 'trib.'], ['nd', x.nd, 'sem tipo']]
      .filter(([, n]) => n).map(([c, n, t]) => `<i class="${c}">${n} ${t}</i>`).join('') + '</span>';
    return `<div class="row"><div class="top"><span title="${esc(x.nome)}">${esc(x.nome)}</span><span class="dir">${partes}<b>${x.total}</b></span></div>${barra}${chips}</div>`;
  }).join('') : '<p class="vazio">Sem dados para este filtro.</p>';
  const datas = dv.map(d => d.agenda).filter(Boolean).sort((a, b) => a - b);
  const escopo = (VISAO === 'hist' && BANCO.ok ? '<b>Histórico completo</b>' : '<b>Base carregada</b>') + (filtroAtivo() ? ' (com filtros)' : '') + `: ${dv.length} ${dv.length === 1 ? 'senha' : 'senhas'}`
    + (datas.length ? (dataBR(datas[0]) === dataBR(datas.at(-1)) ? ' de ' + dataBR(datas[0]) : ` de ${dataBR(datas[0])} a ${dataBR(datas.at(-1))}`) : '') + '.';
  $('pForn').insertAdjacentHTML('afterbegin', `<p class="vazio legenda">${escopo}` + (tipo === 'todos' ? ' Azul: comerciais. Âmbar: tributárias.' + (dv.some(d => d.tipo === 'nd') ? ' Cinza: sem tipo.' : '') : '') + '</p>');

  for(const [id, t] of [['pCom','com'],['pTri','tri']]){
    const c = topCategoriasPorTempo(t), mx = c[0]?.valor || 0;
    $(id).innerHTML = c.length ? c.map(x => linha(x.nome, x.valor, mx, hh(x.valor), t,
      `<div class="vazio" style="font-size:12px">${x.n} ${x.n === 1 ? 'resolvida' : 'resolvidas'}</div>`)).join('')
      : '<p class="vazio">' + 'Nenhuma divergência resolvida deste tipo ainda. Marque “Resolvido” na Base detalhada.' + '</p>';
  }
}
function desenharBase(){
  const q = norm($('busca').value), agora = new Date();
  const vs = visiveis(), l = vs.filter(d => !q || norm([d.senha, d.nf, d.fornecedor, d.categoria, d.descricao, d.chamado, NOME_TIPO[d.tipo]].join(' ')).includes(q));
  $('contaBase').textContent = l.length + ' de ' + vs.length + ' NFs divergentes' + (VISAO === 'hist' && BANCO.ok ? ' (histórico completo)' : '') + (filtroAtivo() ? ' (com filtros)' : '') + (l.length > CONFIG.MAX_LINHAS_BASE ? ' (mostrando ' + CONFIG.MAX_LINHAS_BASE + ')' : '');
  $('corpo').innerHTML = l.slice(0, CONFIG.MAX_LINHAS_BASE).map(d => { const h = horas(d);
    const tempo = h != null ? hh(h) : (inicioDe(d) ? '<span class="vazio">' + hh(Math.max(0, (agora - inicioDe(d)) / 36e5)) + ' em aberto</span>' : '');
    return `<tr class="${d.resolucao ? '' : 'aberta'}"><td><input type="checkbox" data-id="${esc(d.id)}" ${d.resolucao ? 'checked' : ''} ${d.deArquivo ? 'disabled' : ''} aria-label="Marcar como resolvido"></td>
    <td>${esc(d.senha)}</td><td>${esc(d.nf)}</td><td>${d.tipoArquivo === 'nd' ? seletorTipo(d) : `<span class="tag ${d.tipo}" title="${esc((d.descricao ? 'Divergência: ' + d.descricao + '\n' : '') + (d.tipoPorColuna ? 'Definido pelas colunas INI/FIM DIV (divergência sem texto)' : d.tipo === 'nd' ? 'DIVERGÊNCIA DOS PEDIDOS e colunas INI/FIM DIV vazias' : 'Definido pelo texto de DIVERGÊNCIA DOS PEDIDOS'))}">${NOME_TIPO[d.tipo]}${d.tipoPorColuna ? '*' : ''}</span>`}</td>
    <td>${esc(d.fornecedor)}</td><td>${seletorCategoria(d)}</td><td>${dataHoraBR(d.agenda)}</td><td>${d.resolucao ? dataHoraBR(d.resolucao) : '<span class="selo-aberta">Aberta</span>'}</td>
    <td>${tempo}</td><td><input type="text" class="in-chamado" inputmode="numeric" data-chamado="${esc(d.id)}" value="${esc(d.chamado)}" placeholder="Nº do chamado" aria-label="Número do chamado da NF ${esc(d.nf)}"></td></tr>`; }).join('');
}
function aplicarSalvosLocais(d){ // devolve o que este navegador já tinha marcado (vale também sem banco de dados)
  const res = lerSalvo(), cats = lerSalvo(CONFIG.CHAVE_CATEGORIAS), tps = lerSalvo(CONFIG.CHAVE_TIPOS), chs = lerSalvo(CONFIG.CHAVE_CHAMADOS);
  if(chs[d.id]) d.chamadoManual = chs[d.id];
  if(res[d.id]) d.resolucaoManual = new Date(res[d.id]);
  if(cats[d.id]) d.categoriaManual = cats[d.id];
  if(NOME_TIPO[tps[d.id]] && tps[d.id] !== 'nd') d.tipoManual = tps[d.id];
  return aplicar(d);
}
async function definirDados(registros, origem, real = false){ // real: veio de um arquivo (entra no banco); o CSV_INICIAL não entra
  registros.forEach(aplicarSalvosLocais);
  DADOS = registros; BASE_REAL = real;
  let noBanco = '';
  if(real && BANCO.ok){ const r = juntarBase(DADOS, registros.outras); noBanco = ` · banco: ${r.novas} ${r.novas === 1 ? 'nova' : 'novas'}, ${r.atualizadas} ${r.atualizadas === 1 ? 'atualizada' : 'atualizadas'}`; }
  if(!real) VISAO = 'base'; // dados embutidos nunca se misturam com o histórico
  const rep = registros.length - new Set(registros.map(d => d.id)).size; // mesma senha e mesma NF repetidas
  $('aviso').textContent = registros.semDivergentes || (origem + ' · CD ' + CONFIG.CD.join(' / ') + ' · ' + registros.length + ' NFs divergentes'
    + (rep ? ' · atenção: ' + rep + ' linhas repetem uma senha e NF já listadas' : '')) + noBanco;
  redesenhar();
  if(real && BANCO.ok) await gravarBanco();
}
function alterou(d){ // depois de uma escolha na tela: recalcula, guarda no banco e redesenha o painel
  marcar(d); aplicar(d); if(BANCO.ok && HIST.has(d.id)) salvarBanco(); desenharPainel(); desenharBanco();
}

/* ===== 5) EVENTOS E INÍCIO ===== */
document.querySelectorAll('.tab').forEach(b => b.onclick = () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === b));
  ['painel','base','notas','categorias','ajuda'].forEach(a => $('aba-' + a).classList.toggle('hidden', a !== b.dataset.aba));
  $('filtros').classList.toggle('hidden', !['painel','base'].includes(b.dataset.aba)); // filtros só no Painel e na Base detalhada
});
$('btnArq').onclick = () => $('arq').click();
$('arq').onchange = e => e.target.files[0] && carregarArquivo(e.target.files[0]);
$('btnVazio').onclick = () => $('arq').click();
['fPeriodo','fDe','fAte','fTurno','fCat'].forEach(id => $(id).onchange = () => { lerFiltros(); redesenhar(); });
$('fLimpar').onclick = () => { $('fPeriodo').value = 'tudo'; $('fDe').value = $('fAte').value = $('fTurno').value = $('fCat').value = ''; lerFiltros(); redesenhar(); };
$('fVisao').onclick = e => { const v = e.target.dataset?.visao; if(v){ VISAO = v; redesenhar(); } };
document.addEventListener('click', e => { const b = $('banco').querySelector('details[open]'); if(b && !b.contains(e.target)) b.open = false; }); // fecha o quadro do banco ao clicar fora
$('filtroTipo').onchange = desenharPainel;
$('corpo').onchange = e => {
  const c = e.target;
  if(c.dataset.tipo){ // seletor de tipo: grava a escolha (navegador e banco)
    const d = acharRegistro(c.dataset.tipo); if(!d) return;
    const sv = lerSalvo(CONFIG.CHAVE_TIPOS);
    d.tipoManual = c.value !== 'nd' ? c.value : null; if(d.tipoManual) sv[d.id] = c.value; else delete sv[d.id];
    gravarSalvo(sv, CONFIG.CHAVE_TIPOS); c.className = 'sel-tipo ' + c.value; alterou(d); return;
  }
  if(c.dataset.cat){ // seletor de categoria: grava a escolha (navegador e banco)
    const d = acharRegistro(c.dataset.cat); if(!d) return;
    const sv = lerSalvo(CONFIG.CHAVE_CATEGORIAS);
    d.categoriaManual = c.value || null; if(c.value) sv[d.id] = c.value; else delete sv[d.id];
    gravarSalvo(sv, CONFIG.CHAVE_CATEGORIAS); c.title = c.value || 'Escolha a categoria'; c.classList.remove('auto');
    if(c.value && !regraDoFornecedor(d.fornecedor)){ // 1ª escolha para este fornecedor: vira regra e sugere a mesma categoria nas outras NFs dele
      salvarRegra(d.fornecedor, c.value, 'aprendida'); const w = c.closest('.tab-wrap'), y = w.scrollTop;
      alterou(d); redesenhar(); w.scrollTop = y; return; }
    alterou(d); return; // não redesenha a tabela para não perder a posição
  }
  if('chamado' in c.dataset){ // número do chamado: grava o que foi digitado (navegador e banco)
    const d = acharRegistro(c.dataset.chamado); if(!d) return;
    const sv = lerSalvo(CONFIG.CHAVE_CHAMADOS), v = c.value.trim();
    d.chamadoManual = v || null; if(v) sv[d.id] = v; else delete sv[d.id];
    gravarSalvo(sv, CONFIG.CHAVE_CHAMADOS); c.value = v; alterou(d); return;
  }
  // caixa "Resolvido": grava a data e a hora do clique
  const d = c.dataset.id && acharRegistro(c.dataset.id); if(!d) return;
  const sv = lerSalvo();
  if(c.checked){ d.resolucaoManual = new Date(); sv[d.id] = d.resolucaoManual.toISOString(); } else { d.resolucaoManual = null; delete sv[d.id]; }
  gravarSalvo(sv); alterou(d); desenharBase();
};
$('corpo').onkeydown = e => { if(e.key === 'Enter' && e.target.classList.contains('in-chamado')) e.target.blur(); }; // Enter confirma o chamado
$('busca').oninput = desenharBase;
$('btnProdutos').onclick = () => $('arqProdutos').click();
$('arqProdutos').onchange = e => { if(e.target.files[0]) carregarProdutos(e.target.files[0]); e.target.value = ''; };
$('btnTirarProdutos').onclick = removerProdutos;
$('formRegra').onsubmit = e => { e.preventDefault(); const f = $('regraForn').value.trim(), c = $('regraCat').value;
  if(!f || !c) return; salvarRegra(f, c, 'tela'); $('regraForn').value = ''; $('regraCat').value = ''; redesenhar(); };
$('corpoRegras').onclick = e => { const f = e.target.dataset?.tirarRegra; if(f != null){ salvarRegra(f, '', 'tela'); redesenhar(); } };
$('btnXml').onclick = () => $('arqXml').click();
$('arqXml').onchange = e => carregarXmls([...e.target.files]);
$('chave').oninput = e => {
  const c = e.target.value.replace(/\D/g, ''), r = lerChave(c);
  $('chaveOut').textContent = !c ? '' : !r ? 'A chave tem 44 dígitos e você digitou ' + c.length + '.'
    : 'UF ' + r.uf + ', emissão ' + r.emissao + ', CNPJ do fornecedor ' + r.cnpj + ', modelo ' + r.modelo + ', série ' + r.serie + ', NF ' + r.nf + '. ' + (r.valida ? 'Dígito verificador confere.' : 'Dígito verificador não confere: confira a digitação.');
};
try{
  if(CONFIG.CSV_INICIAL.trim()) definirDados(montarRegistros(lerCSV(CONFIG.CSV_INICIAL)), 'Dados embutidos na página'); else redesenhar();
} catch(e){ $('aviso').textContent = e.message; }
idbLer('produtos').then(p => { if(p?.lista?.length){ indexarProdutos(p.nome, p.lista); redesenhar(); } }); // volta o cadastro de produtos usado da última vez
iniciarBanco(); // volta ao banco usado da última vez (se o navegador ainda tiver permissão)
