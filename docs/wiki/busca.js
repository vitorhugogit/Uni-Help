(function(){
  const openBtn = document.getElementById('open-find');
  const findBar = document.getElementById('findBar');
  const input = document.getElementById('findInput');
  const nextBtn = document.getElementById('nextBtn');
  const prevBtn = document.getElementById('prevBtn');
  const closeBtn = document.getElementById('closeBtn');
  const info = document.getElementById('findInfo');

  let marks = [];        // array de elementos <mark>
  let current = -1;      // índice atual
  let lastQuery = '';

  // função pra obter todos os nós de texto sob um nó
  function getTextNodes(node) {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
      acceptNode: function(n){
        // evitar nós dentro de script, style e dentro da própria find-bar
        if (!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const parent = n.parentNode;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.nodeName.toLowerCase();
        if (['script','style','noscript'].includes(tag)) return NodeFilter.FILTER_REJECT;
        if (parent.closest && parent.closest('#findBar')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    }, false);
    const nodes = [];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    return nodes;
  }

  // remove highlights antigos
  function removeHighlights(){
    marks.forEach(mark=>{
      const parent = mark.parentNode;
      if (!parent) return;
      parent.replaceChild(document.createTextNode(mark.textContent), mark);
      parent.normalize(); // junta nós de texto adjacentes
    });
    marks = [];
    current = -1;
    updateInfo();
  }

  // cria highlights para query (case-insensitive)
  function highlightQuery(query){
    removeHighlights();
    if (!query) return;
    const q = query;
    const textNodes = getTextNodes(document.body);
    const regex = new RegExp(escapeRegExp(q), 'gi');

    textNodes.forEach(node=>{
      const frag = document.createDocumentFragment();
      let lastIndex = 0;
      const text = node.nodeValue;
      let match;
      let any = false;
      while ((match = regex.exec(text)) !== null){
        any = true;
        const before = text.slice(lastIndex, match.index);
        if (before) frag.appendChild(document.createTextNode(before));
        const mark = document.createElement('mark');
        mark.className = 'custom-find';
        mark.textContent = match[0];
        frag.appendChild(mark);
        marks.push(mark);
        lastIndex = match.index + match[0].length;
      }
      if (any){
        const after = text.slice(lastIndex);
        if (after) frag.appendChild(document.createTextNode(after));
        node.parentNode.replaceChild(frag, node);
      }
    });

    // foco no primeiro se houver
    if (marks.length) {
      current = 0;
      updateCurrent();
    }
    updateInfo();
  }

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function updateInfo(){
    info.textContent = marks.length ? ( (current+1) + ' / ' + marks.length ) : '0 / 0';
  }

  function scrollToCurrent(){
    if (current >= 0 && marks[current]) {
      // rolar suavemente e dar foco visual
      marks[current].scrollIntoView({behavior:'smooth', block:'center', inline:'nearest'});
      // pequeno flash via classe current
      marks.forEach(m => m.classList.remove('current'));
      marks[current].classList.add('current');
      updateInfo();
    }
  }

  function updateCurrent(){
    if (marks.length === 0) { current = -1; updateInfo(); return; }
    if (current < 0) current = 0;
    if (current >= marks.length) current = marks.length -1;
    scrollToCurrent();
  }

  // navegadores: próximo/anterior
  function next(){
    if (!marks.length) return;
    current = (current + 1) % marks.length;
    updateCurrent();
  }
  function prev(){
    if (!marks.length) return;
    current = (current - 1 + marks.length) % marks.length;
    updateCurrent();
  }

  // handlers
  input.addEventListener('input', (e)=>{
    const q = input.value.trim();
    lastQuery = q;
    highlightQuery(q);
  });

  nextBtn.addEventListener('click', (e)=>{
    e.preventDefault();
    next();
  });
  prevBtn.addEventListener('click', (e)=>{
    e.preventDefault();
    prev();
  });

  closeBtn.addEventListener('click', ()=>{
    hideFindBar();
  });

  openBtn.addEventListener('click', ()=>{
    showFindBar();
  });

  // teclas: Enter = próximo, Shift+Enter = anterior, Escape fecha
  input.addEventListener('keydown', (e)=>{
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) prev(); else next();
    } else if (e.key === 'Escape') {
      hideFindBar();
    }
  });

  // mostrar / esconder
  function showFindBar(prefill){
    findBar.style.display = 'flex';
    input.focus();
    if (prefill) {
      input.value = prefill;
      lastQuery = prefill;
      highlightQuery(prefill);
    }
  }
  function hideFindBar(){
    findBar.style.display = 'none';
    removeHighlights();
    input.value = '';
    lastQuery = '';
    // devolve foco ao body (ou você pode focar algum elemento específico)
    document.activeElement && document.activeElement.blur();
  }

  // opcional: capturar Ctrl+F para abrir sua barra (padrão do browser será evitado)
  // AVISO: sobrescrever Ctrl+F pode confundir usuários que esperam a busca do navegador.
  // Se quiser habilitar, remova o comentário do bloco abaixo.

  /*
  window.addEventListener('keydown', function(e){
    // Win: Ctrl+F, Mac: Meta(⌘)+F
    const isMac = navigator.platform.toUpperCase().indexOf('MAC')>=0;
    const modifier = isMac ? e.metaKey : e.ctrlKey;
    if (modifier && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      showFindBar();
      // opcional: pré preencher com seleção de texto atual, se houver
      const sel = window.getSelection().toString().trim();
      if (sel) {
        input.value = sel;
        lastQuery = sel;
        highlightQuery(sel);
      }
    }
  });
  */

  // Se o usuário clicar fora da barra e ela estiver aberta, fecha (comportamento comum)
  document.addEventListener('click', (e) => {
    if (!findBar.contains(e.target) && findBar.style.display === 'flex' && e.target !== openBtn) {
      // fechar apenas se clique em área de conteúdo (evita fechar ao clicar em botões etc.)
      hideFindBar();
    }
  });

  // Ao carregar, opcionalmente detectar seleção do usuário e abrir a barra com essa seleção
  document.addEventListener('selectionchange', function(){
    // manter simples — não abrir automaticamente, apenas ready para pré-fill se usuário abrir
  });

  // Limpeza ao navegar/atualizar
  window.addEventListener('beforeunload', removeHighlights);

})();