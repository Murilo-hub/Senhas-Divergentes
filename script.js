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
  CSV_INICIAL: '',              // cole aqui um CSV para o painel já abrir com seus dados (senão abre com exemplo)
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
let DADOS = [];
let TEM_RESOLUCAO = false; // a planilha carregada tem a coluna opcional de resolução?
const SEM_CATEGORIA = '(sem categoria)';
const temCategoria = () => DADOS.some(d => d.categoria !== SEM_CATEGORIA); // alguma NF já tem categoria (da planilha ou escolhida)?
const visiveis = () => DADOS; // o filtro de CD agora é feito na leitura da planilha (CONFIG.CD)
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
function seletorCategoria(d){ // caixa de seleção da categoria de uma NF na Base detalhada
  const atual = d.categoria === SEM_CATEGORIA ? '' : d.categoria, opc = o => `<option value="${esc(o)}"${o === atual ? ' selected' : ''}>${esc(o)}</option>`;
  const naLista = Object.values(CONFIG.CATEGORIAS).some(l => l.includes(atual));
  return `<select class="sel-cat" data-cat="${esc(d.id)}" aria-label="Categoria da NF ${esc(d.nf)}" title="${esc(atual || 'Escolha a categoria')}">`
    + `<option value="">Escolha a categoria…</option>`
    + (atual && !naLista ? `<optgroup label="Da planilha">${opc(atual)}</optgroup>` : '') // valor da planilha fora da lista
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
  const nomeCD = CONFIG.CD.join(' / ');
  if(!validas.length) throw new Error('Nenhuma senha ' + (temStatus ? 'com STATUS "Divergente"' : 'divergente') + ' do CD ' + nomeCD + ' foi encontrada. CDs com divergência na planilha: ' + ([...cdsVistos].filter(Boolean).join(', ') || 'nenhum') + '.');
  return validas.map(r => {
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
    return { senha: String(g('senha')).trim(), nf: (String(g('nf')).match(/\d+/) || [''])[0].replace(/^0+/, ''), cd: String(g('cd')).trim() || '(sem CD)',
      fornecedor: String(g('fornecedor')).trim() || '(sem fornecedor)', categoria: String(g('categoria')).trim() || SEM_CATEGORIA,
      tipo, tipoArquivo: tipo, tipoPorColuna: !div && tipo !== 'nd', // tipoArquivo: o que a planilha disse ('nd' = nada)
      agenda: ag, inicio, resolucao: re, deArquivo: !!re, descricao: div };
  });
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
async function carregarArquivo(f){
  try{
    const buf = await f.arrayBuffer(), inicio = new TextDecoder('windows-1252').decode(buf.slice(0, 2048)).replace(/^﻿|^ï»¿/, '').trim();
    let rows;
    if(/\.csv$/i.test(f.name)) rows = lerCSV(decodificar(buf));
    else if(/^</.test(inicio) && /<(html|table)\b/i.test(inicio) || /\.html?$/i.test(f.name)) rows = lerTabelaHtml(decodificar(buf));
    else { // Excel de verdade: usa a primeira aba que tiver o cabeçalho
      const wb = XLSX.read(buf, {type:'array', cellDates:true});
      const abas = wb.SheetNames.map(n => XLSX.utils.sheet_to_json(wb.Sheets[n], {header:1, raw:true, defval:''}));
      rows = abas.find(r => acharCabecalho(r)) || abas[0];
    }
    definirDados(montarRegistros(rows), 'Arquivo: ' + f.name);
  } catch(e){ $('aviso').textContent = 'Não foi possível ler a planilha. ' + e.message; }
}

/* ===== 2) DADOS DE EXEMPLO (fictícios) ===== */
function exemplo(){
  let s = 7; const rnd = () => (s = s * 16807 % 2147483647) / 2147483647;
  const forn = ['Alfa Distribuidora','Beta Alimentos','Gama Embalagens','Delta Higiene','Ômega Bebidas','Sigma Limpeza','Atlas Papelaria','Nova Frios','Prime Hortifruti','Vértice Eletro','Lume Cosméticos','Terra Grãos'];
  const cats = Object.values(CONFIG.CATEGORIAS).flat().filter((c, i) => i % 3 === 0); // algumas categorias reais da lista
  const dc = ['Preço diferente do pedido','Quantidade divergente','Condição de pagamento'], dt = ['ICMS divergente','NCM incorreto','Alíquota de IPI'];
  const cdsEx = ['CD Guarulhos','CD Campinas','CD Arujá'];
  const rows = [['Senha','DATA/HORA AGENDA','CD','FORNECEDOR','DIVERGÊNCIA DOS PEDIDOS','Categoria','Data resolução','NF']];
  for(let i = 0; i < 160; i++){
    const com = rnd() < .55, ci = Math.floor(rnd() * cats.length), ab = new Date(2026, 0, 1 + Math.floor(rnd() * 300));
    const dur = Math.round(2 + rnd() * (com ? 14 : 28) * (1 + ci / 8)), re = rnd() < .12 ? '' : new Date(+ab + dur * 864e5);
    rows.push([String(41000 + i), ab, cdsEx[Math.floor(rnd() * 3)], forn[Math.floor(Math.pow(rnd(), 1.7) * forn.length)],
      (com ? dc : dt)[Math.floor(rnd() * 3)], cats[ci], re, String(1000 + i)]);
  }
  return rows;
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
function notasDaSenha(d){ // liga a senha à(s) nota(s) pelo número da NF; se o número se repete, desempata pelo fornecedor
  const c = NOTAS_POR_NF.get(d.nf) || []; return c.length <= 1 ? c : c.filter(n => mesmoFornecedor(n.emitente, d.fornecedor));
}
async function carregarXmls(files){
  let erros = 0;
  for(const f of files){ try{ const n = lerXmlNfe(await f.text()); NOTAS = NOTAS.filter(x => !n.chave || x.chave !== n.chave).concat(n); } catch(e){ erros++; } }
  indexarNotas(); desenharNotas(); desenharBase();
  if(erros) $('resumoNotas').textContent += ' ' + erros + ' arquivo(s) não são XML de NF-e e foram ignorados.';
}
function desenharNotas(){
  const itens = NOTAS.flatMap(n => n.itens.map(i => ({ n, i }))), lig = DADOS.filter(d => notasDaSenha(d).length).length;
  $('resumoNotas').textContent = NOTAS.length ? NOTAS.length + ' notas, ' + itens.length + ' itens. ' + lig + ' de ' + DADOS.length + ' senhas ligadas a uma nota.' : 'Nenhuma nota carregada ainda.';
  $('corpoNotas').innerHTML = itens.slice(0, CONFIG.MAX_LINHAS_BASE).map(({ n, i }) => `<tr><td>${esc(n.nf)}</td><td>${esc(n.emitente)}</td><td>${esc(i.cod)}</td><td>${esc(i.desc)}</td><td>${esc(i.ncm)}</td><td>${esc(i.qtd)}</td></tr>`).join('');
}

/* ===== 4) DESENHO DA TELA ===== */
function linha(rotulo, valor, max, texto, cls, extra){ // uma barra de ranking
  return `<div class="row"><div class="top"><span title="${esc(rotulo)}">${esc(rotulo)}</span><b>${texto}</b></div>
    <div class="tr"><div class="fl ${cls}" style="width:${max ? valor / max * 100 : 0}%"></div></div>${extra || ''}</div>`;
}
function desenharPainel(){
  const dv = visiveis(), abertas = dv.filter(d => horas(d) == null).length, res = dv.filter(d => horas(d) != null);
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
    return `<div class="row"><div class="top"><span title="${esc(x.nome)}">${esc(x.nome)}</span><b>${x.total}</b></div>${barra}${chips}</div>`;
  }).join('') : '<p class="vazio">Sem dados para este filtro.</p>';
  if(tipo === 'todos') $('pForn').insertAdjacentHTML('afterbegin', '<p class="vazio" style="margin:0 0 10px;font-size:13px">Azul: comerciais. Âmbar: tributárias.' + (dv.some(d => d.tipo === 'nd') ? ' Cinza: tipo não informado.' : '') + '</p>');

  for(const [id, t] of [['pCom','com'],['pTri','tri']]){
    const c = topCategoriasPorTempo(t), mx = c[0]?.valor || 0;
    $(id).innerHTML = c.length ? c.map(x => linha(x.nome, x.valor, mx, hh(x.valor), t,
      `<div class="vazio" style="font-size:12px">${x.n} ${x.n === 1 ? 'resolvida' : 'resolvidas'}</div>`)).join('')
      : '<p class="vazio">' + 'Nenhuma divergência resolvida deste tipo ainda. Marque “Resolvido” na Base detalhada.' + '</p>';
  }
}
function desenharBase(){
  const q = norm($('busca').value), agora = new Date();
  const l = visiveis().filter(d => !q || norm([d.senha, d.nf, d.fornecedor, d.categoria, d.descricao, NOME_TIPO[d.tipo]].join(' ')).includes(q));
  $('contaBase').textContent = l.length + ' de ' + DADOS.length + ' NFs divergentes' + (l.length > CONFIG.MAX_LINHAS_BASE ? ' (mostrando ' + CONFIG.MAX_LINHAS_BASE + ')' : '');
  $('corpo').innerHTML = l.slice(0, CONFIG.MAX_LINHAS_BASE).map(d => { const h = horas(d);
    const tempo = h != null ? hh(h) : (inicioDe(d) ? '<span class="vazio">' + hh(Math.max(0, (agora - inicioDe(d)) / 36e5)) + ' em aberto</span>' : '');
    return `<tr class="${d.resolucao ? '' : 'aberta'}"><td><input type="checkbox" data-id="${esc(d.id)}" ${d.resolucao ? 'checked' : ''} ${d.deArquivo ? 'disabled' : ''} aria-label="Marcar como resolvido"></td>
    <td>${esc(d.senha)}</td><td>${esc(d.nf)}</td><td>${d.tipoArquivo === 'nd' ? seletorTipo(d) : `<span class="tag ${d.tipo}" title="${d.tipoPorColuna ? 'Definido pelas colunas INI/FIM DIV (divergência sem texto)' : d.tipo === 'nd' ? 'DIVERGÊNCIA DOS PEDIDOS e colunas INI/FIM DIV vazias' : 'Definido pelo texto de DIVERGÊNCIA DOS PEDIDOS'}">${NOME_TIPO[d.tipo]}${d.tipoPorColuna ? '*' : ''}</span>`}</td>
    <td>${esc(d.fornecedor)}</td><td>${seletorCategoria(d)}</td><td>${dataHoraBR(d.agenda)}</td><td>${d.resolucao ? dataHoraBR(d.resolucao) : '<span class="selo-aberta">Aberta</span>'}</td>
    <td>${tempo}</td><td>${esc(d.descricao)}</td></tr>`; }).join('');
}
function definirDados(registros, origem){
  const salvo = lerSalvo(), cats = lerSalvo(CONFIG.CHAVE_CATEGORIAS), tps = lerSalvo(CONFIG.CHAVE_TIPOS); // devolve o que este navegador já tinha marcado
  for(const d of registros){ d.id = d.senha + '|' + d.nf; if(!d.resolucao && salvo[d.id]) d.resolucao = new Date(salvo[d.id]); if(cats[d.id]) d.categoria = cats[d.id];
    if(d.tipoArquivo === 'nd' && NOME_TIPO[tps[d.id]]) d.tipo = tps[d.id]; } // tipo escolhido à mão só vale se a planilha não disser o tipo
  DADOS = registros;
  const rep = registros.length - new Set(registros.map(d => d.id)).size; // mesma senha e mesma NF repetidas
  $('aviso').textContent = origem + ' · CD ' + CONFIG.CD.join(' / ') + ' · ' + registros.length + ' NFs divergentes' + (rep ? ' · atenção: ' + rep + ' linhas repetem uma senha e NF já listadas' : '');
  desenharPainel(); desenharBase(); desenharNotas();
}

/* ===== 5) EVENTOS E INÍCIO ===== */
document.querySelectorAll('.tab').forEach(b => b.onclick = () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === b));
  ['painel','base','notas','ajuda'].forEach(a => $('aba-' + a).classList.toggle('hidden', a !== b.dataset.aba));
});
$('btnArq').onclick = () => $('arq').click();
$('arq').onchange = e => e.target.files[0] && carregarArquivo(e.target.files[0]);
$('btnDemo').onclick = () => definirDados(montarRegistros(exemplo()), 'Dados de exemplo (fictícios)');
$('filtroTipo').onchange = desenharPainel;
$('corpo').onchange = e => {
  const c = e.target;
  if(c.dataset.tipo){ // seletor de tipo: grava a escolha neste navegador
    const d = DADOS.find(x => x.id === c.dataset.tipo); if(!d) return;
    const sv = lerSalvo(CONFIG.CHAVE_TIPOS);
    d.tipo = c.value; if(c.value !== 'nd') sv[d.id] = c.value; else delete sv[d.id];
    gravarSalvo(sv, CONFIG.CHAVE_TIPOS); c.className = 'sel-tipo ' + c.value; desenharPainel(); return;
  }
  if(c.dataset.cat){ // seletor de categoria: grava a escolha neste navegador
    const d = DADOS.find(x => x.id === c.dataset.cat); if(!d) return;
    const sv = lerSalvo(CONFIG.CHAVE_CATEGORIAS);
    d.categoria = c.value || SEM_CATEGORIA; if(c.value) sv[d.id] = c.value; else delete sv[d.id];
    gravarSalvo(sv, CONFIG.CHAVE_CATEGORIAS); c.title = c.value || 'Escolha a categoria'; desenharPainel(); return; // não redesenha a tabela para não perder a posição
  }
  // caixa "Resolvido": grava a data e a hora do clique
  const d = c.dataset.id && DADOS.find(x => x.id === c.dataset.id); if(!d) return;
  const sv = lerSalvo();
  if(c.checked){ d.resolucao = new Date(); sv[d.id] = d.resolucao.toISOString(); } else { d.resolucao = null; delete sv[d.id]; }
  gravarSalvo(sv); desenharPainel(); desenharBase();
};
$('busca').oninput = desenharBase;
$('btnXml').onclick = () => $('arqXml').click();
$('arqXml').onchange = e => carregarXmls([...e.target.files]);
$('chave').oninput = e => {
  const c = e.target.value.replace(/\D/g, ''), r = lerChave(c);
  $('chaveOut').textContent = !c ? '' : !r ? 'A chave tem 44 dígitos e você digitou ' + c.length + '.'
    : 'UF ' + r.uf + ', emissão ' + r.emissao + ', CNPJ do fornecedor ' + r.cnpj + ', modelo ' + r.modelo + ', série ' + r.serie + ', NF ' + r.nf + '. ' + (r.valida ? 'Dígito verificador confere.' : 'Dígito verificador não confere: confira a digitação.');
};
try{
  CONFIG.CSV_INICIAL.trim() ? definirDados(montarRegistros(lerCSV(CONFIG.CSV_INICIAL)), 'Dados embutidos na página')
                            : definirDados(montarRegistros(exemplo()), 'Dados de exemplo (fictícios). Carregue sua planilha para ver os números reais');
} catch(e){ $('aviso').textContent = e.message; }