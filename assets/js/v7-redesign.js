/* Ministério Seven V7 — melhoria visual sem alterar banco/lógica */
(function(){
  const byPath = (window.location.pathname || "").split("/").pop() || "index.html";
  const pageData = {
    "musicas.html": { kicker: "Letras públicas", desc: "Repertório organizado para consultar letras, vídeos de apoio e acesso rápido às cifras." },
    "cifras.html": { kicker: "Cifras", desc: "Acordes, tons e ferramentas para ensaio, ministração e estudo musical." },
    "downloads-por-musica.html": { kicker: "Materiais por música", desc: "Encontre arquivos, materiais e recursos relacionados a cada canção." },
    "downloads.html": { kicker: "Central de recursos", desc: "Materiais úteis para apoiar repertórios, ensaios e programações do Ministério Seven." },
    "fotos.html": { kicker: "Memórias", desc: "Álbuns e registros visuais das programações e momentos do Ministério Seven." },
    "agenda.html": { kicker: "Programações", desc: "Acompanhe compromissos, eventos, ensaios e programações do Ministério Seven." },
    "ferramentas.html": { kicker: "Ferramentas musicais", desc: "Recursos práticos para afinação, estudo, tempo, tom e preparação do louvor." },
    "contato.html": { kicker: "Fale conosco", desc: "Envie sua mensagem, convite ou solicitação para o Ministério Seven." },
    "login.html": { kicker: "Acesso restrito", desc: "Área administrativa reservada para gerenciamento do conteúdo do site." },
    "notificacoes.html": { kicker: "Comunicados", desc: "Avisos, novidades e informações importantes do Ministério Seven." },
    "playlists.html": { kicker: "Organização pessoal", desc: "Crie listas pessoais de letras e cifras para estudo e ensaio." },
    "favoritos.html": { kicker: "Favoritos", desc: "Acesse rapidamente letras e cifras salvas na sua conta." },
    "conta.html": { kicker: "Minha conta", desc: "Gerencie suas informações e preferências dentro do site." },
    "musica.html": { kicker: "Letra da música", desc: "Leia a letra com conforto, veja o vídeo de apoio e acesse a cifra vinculada." },
    "cifra.html": { kicker: "Cifra interativa", desc: "Use transposição, foco, tela cheia, auto-rolagem e PDF para tocar com mais praticidade." },
    "404.html": { kicker: "Página não encontrada", desc: "O endereço acessado não foi encontrado no site Ministério Seven." }
  };

  function safeText(value){ return String(value || ""); }

  function enhancePageIntro(){
    const data = pageData[byPath];
    if (!data) return;
    const main = document.querySelector("main");
    const h1 = main?.querySelector("section.container > h1, .ferramentas-head > h1");
    if (!h1 || h1.dataset.v7Enhanced) return;
    h1.dataset.v7Enhanced = "1";
    const kicker = document.createElement("div");
    kicker.className = "v7-page-kicker";
    kicker.textContent = data.kicker;
    h1.parentNode.insertBefore(kicker, h1);
    if (!document.querySelector(".v7-page-description")) {
      const desc = document.createElement("p");
      desc.className = "v7-page-description";
      desc.textContent = data.desc;
      if (h1.parentElement?.classList.contains("ferramentas-head")) {
        const old = h1.parentElement.querySelector(".ferramentas-subtitle");
        if (old) old.textContent = data.desc;
      } else {
        h1.insertAdjacentElement("afterend", desc);
      }
    }
  }

  function enhanceHome(){
    const hero = document.getElementById("hero-banner");
    if (!hero || hero.querySelector(".v7-hero-content")) return;
    const content = document.createElement("div");
    content.className = "v7-hero-content";
    content.innerHTML = `
      <div class="v7-hero-kicker">Ministério Seven V7</div>
      <div class="v7-hero-title">Letras e cifras<br><span>para adoração.</span></div>
      <p class="v7-hero-text">Um espaço premium para consultar repertórios, estudar cifras, preparar ensaios vocais e apoiar cada ministração.</p>
      <div class="v7-hero-actions">
        <a class="primary" href="./musicas.html">Ver letras <span aria-hidden="true">→</span></a>
        <a class="secondary" href="./cifras.html">Abrir cifras <span aria-hidden="true">♯</span></a>
      </div>`;
    hero.appendChild(content);

    if (!document.querySelector(".v7-home-quick-grid")) {
      const quick = document.createElement("nav");
      quick.className = "v7-home-quick-grid";
      quick.setAttribute("aria-label", "Acessos rápidos");
      quick.innerHTML = [
        ["./musicas.html","♪","Músicas públicas","Letras organizadas para consulta e estudo."],
        ["./cifras.html","♯","Cifras","Acordes, tom, PDF e ferramentas para tocar."],
        ["./agenda.html","◷","Agenda","Programações, eventos e compromissos."],
        ["./ferramentas.html","⚙","Ferramentas","Afinador, metrônomo e apoio musical."]
      ].map(([href,icon,title,text]) => `<a class="v7-home-quick-card" href="${href}"><span class="icon">${icon}</span><strong>${title}</strong><small>${text}</small></a>`).join("");
      hero.insertAdjacentElement("afterend", quick);
    }
  }

  function setActiveNav(){
    const current = byPath === "index.html" ? "index.html" : byPath;
    document.querySelectorAll(".main-nav a, .mobile-menu-panel a").forEach((a) => {
      const href = (a.getAttribute("href") || "").split("?")[0].split("#")[0].replace(/^\.\//, "");
      if (href === current) a.classList.add("active");
    });
  }

  function improveControlTitles(){
    const labels = {
      "transpose-down":"Diminuir tom",
      "transpose-up":"Aumentar tom",
      "font-down":"Diminuir fonte",
      "font-up":"Aumentar fonte",
      "focus-toggle":"Modo foco",
      "fullscreen-toggle":"Tela cheia",
      "scroll-panel-toggle":"Auto-rolagem",
      "mini-metronome-floating-toggle":"Metrônomo",
      "pdf-toggle":"Baixar PDF"
    };
    Object.entries(labels).forEach(([id,label]) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.setAttribute("title", label);
      el.setAttribute("aria-label", label);
      el.dataset.v7Label = label;
    });
  }

  function enhanceAdminDashboard(){
    const adminCards = document.querySelector(".admin-cards-grid");
    if (!adminCards || document.querySelector(".v7-admin-dashboard-note")) return;
    const note = document.createElement("div");
    note.className = "v7-admin-dashboard-note admin-intro";
    note.textContent = "Painel visual V7: acesse apenas os módulos liberados para o seu perfil.";
    adminCards.insertAdjacentElement("beforebegin", note);
  }

  function run(){
    document.body.classList.add("v7-redesign-ready", `v7-page-${byPath.replace(/\.html$/,'').replace(/[^a-z0-9-]/gi,'-')}`);
    enhanceHome();
    enhancePageIntro();
    setActiveNav();
    improveControlTitles();
    enhanceAdminDashboard();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
