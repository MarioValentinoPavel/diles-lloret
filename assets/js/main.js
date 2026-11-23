/* Dile's Burger Centro: estado de apertura, pestañas de la carta, cabecera, menú móvil y apariciones.
   Sin dependencias. Todo funciona sin JS: la carta se ve entera y el horario está escrito en la página. */
(() => {
  "use strict";
  const d = document;
  const html = d.documentElement;
  const params = new URLSearchParams(location.search);
  const captura = params.has("captura");
  const reducir = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reducir && !captura) html.classList.add("anima");

  const datos = JSON.parse(d.getElementById("datos-web").textContent);

  /* ---------- estado de apertura (hora de Lloret: Europe/Madrid) ---------- */
  const DIAS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  function ahora() {
    // ?dia=5&hora=20:30 permite revisar cualquier momento
    if (params.has("dia") || params.has("hora")) {
      const [h, m] = (params.get("hora") || "12:00").split(":").map(Number);
      return { dia: Number(params.get("dia") ?? 3), min: h * 60 + (m || 0) };
    }
    const partes = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
    const p = Object.fromEntries(partes.map(x => [x.type, x.value]));
    return { dia: DIAS[p.weekday], min: Number(p.hour) * 60 + Number(p.minute) };
  }
  const aMin = s => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
  const fmt = h => h;
  const rellenar = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");
  const tipo = s => s.replace(/'/g, "’");

  function calcular() {
    const { dia, min } = ahora();
    const H = datos.horario, E = datos.estado;
    const hoy = H[dia];
    if (hoy) {
      const a = aMin(hoy[0]), c = aMin(hoy[1]);
      if (min >= a && min < c) return { dia, abierto: true, texto: hoy[1] === "24:00" ? E.abiertoMedianoche : rellenar(E.abierto, { hora: fmt(hoy[1]) }) };
      if (min < a) return { dia, abierto: false, texto: rellenar(E.abreHoy, { hora: fmt(hoy[0]) }) };
    }
    for (let k = 1; k <= 7; k++) {
      const dd = (dia + k) % 7;
      if (H[dd]) return { dia, abierto: false, texto: k === 1 ? rellenar(E.abreManana, { hora: fmt(H[dd][0]) }) : rellenar(E.abreDia, { dia: datos.dias[dd], hora: fmt(H[dd][0]) }) };
    }
    return { dia, abierto: false, texto: "" };
  }
  function pintarEstado() {
    const e = calcular();
    if (!e.texto) return;
    html.dataset.abierto = String(e.abierto);
    d.querySelectorAll("[data-estado-texto]").forEach(el => { el.textContent = tipo(e.texto); });
    d.querySelectorAll(".horario tr").forEach(tr => {
      const esHoy = tr.dataset.dia === String(e.dia);
      tr.classList.toggle("es-hoy", esHoy);
      if (esHoy) tr.setAttribute("aria-current", "date"); else tr.removeAttribute("aria-current");
    });
  }
  pintarEstado();
  setInterval(pintarEstado, 60 * 1000);

  /* ---------- pestañas de la carta (patrón ARIA tabs) ---------- */
  const lista = d.querySelector("[data-pestanas]");
  if (lista) {
    const tabs = [...lista.querySelectorAll('[role="tab"]')];
    const paneles = tabs.map(t => d.getElementById(t.getAttribute("aria-controls")));
    lista.hidden = false;
    d.querySelector(".carta").classList.add("con-pestanas");
    // pastilla negra que se desliza hasta la pestaña elegida
    const indicador = d.createElement("span");
    indicador.className = "pestanas__indicador";
    indicador.setAttribute("aria-hidden", "true");
    lista.prepend(indicador);
    lista.classList.add("con-indicador");
    let actual = 0;
    const colocar = animar => {
      const t = tabs[actual];
      if (!animar) indicador.style.transition = "none";
      indicador.style.width = `${t.offsetWidth}px`;
      indicador.style.height = `${t.offsetHeight}px`;
      indicador.style.transform = `translate(${t.offsetLeft}px, ${t.offsetTop}px)`;
      if (!animar) { void indicador.offsetWidth; indicador.style.transition = ""; }
    };
    const entrarFilas = panel => { panel.classList.remove("entra"); void panel.offsetWidth; panel.classList.add("entra"); };
    const elegir = (i, foco, desplazar = true, filas = true) => {
      actual = i;
      tabs.forEach((t, k) => {
        const si = k === i;
        t.setAttribute("aria-selected", String(si));
        t.tabIndex = si ? 0 : -1;
        paneles[k].hidden = !si;
        if (si && filas) entrarFilas(paneles[k]);
      });
      colocar(filas);
      if (foco) tabs[i].focus({ preventScroll: true });
      // en móvil la fila de pestañas se desplaza en horizontal: centra la elegida sin mover la página
      if (desplazar && lista.scrollWidth > lista.clientWidth) {
        const t = tabs[i];
        lista.scrollTo({ left: t.offsetLeft - (lista.clientWidth - t.offsetWidth) / 2, behavior: reducir ? "auto" : "smooth" });
      }
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => elegir(i, false));
      t.addEventListener("keydown", ev => {
        const n = tabs.length;
        const mapa = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 };
        if (ev.key in mapa) { ev.preventDefault(); elegir(mapa[ev.key], true); }
      });
    });
    elegir(0, false, false, false);
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(() => colocar(false));
    if ("ResizeObserver" in window) new ResizeObserver(() => colocar(false)).observe(lista);
    // los platos de la primera pestaña entran escalonados cuando la carta llega a la pantalla
    if (html.classList.contains("anima") && "IntersectionObserver" in window) {
      const zona = d.querySelector(".carta__paneles");
      zona.classList.add("espera");
      const ioCarta = new IntersectionObserver(([en]) => {
        if (!en.isIntersecting) return;
        zona.classList.remove("espera"); entrarFilas(paneles[actual]); ioCarta.disconnect();
      }, { threshold: 0.12 });
      ioCarta.observe(zona);
    }
    // un enlace a un plato (#plato-xxx) abre su pestaña
    const abrirDesdeHash = () => {
      const el = location.hash && d.querySelector(location.hash);
      const panel = el && el.closest("[data-panel]");
      if (panel) { const i = paneles.indexOf(panel); if (i >= 0) elegir(i, false); }
    };
    addEventListener("hashchange", abrirDesdeHash);
    abrirDesdeHash();
  }

  /* ---------- cabecera: transparente sobre el cartel, sólida después ---------- */
  const cabecera = d.querySelector("[data-cabecera]");
  const palabra = d.querySelector(".portada__marca");
  if (cabecera && palabra && "IntersectionObserver" in window) {
    cabecera.classList.add("cabecera--arriba");
    new IntersectionObserver(([en]) => {
      const pasado = !en.isIntersecting;
      cabecera.classList.toggle("cabecera--solida", pasado);
      cabecera.classList.toggle("cabecera--arriba", !pasado);
    }, { rootMargin: `-${parseInt(getComputedStyle(cabecera).height, 10) || 64}px 0px 0px 0px` }).observe(palabra);
  } else if (cabecera) cabecera.classList.add("cabecera--solida");

  /* ---------- menú móvil ---------- */
  const menu = d.querySelector("[data-menu]");
  const abrir = d.querySelector("[data-abrir-menu]");
  if (menu && abrir) {
    const cerrarBtn = menu.querySelector("[data-cerrar-menu]");
    const enfocables = () => [...menu.querySelectorAll("a[href], button")].filter(el => !el.hidden);
    const cerrar = (devolver = true) => {
      menu.hidden = true; abrir.setAttribute("aria-expanded", "false"); d.body.style.overflow = "";
      if (devolver) abrir.focus();
    };
    abrir.addEventListener("click", () => {
      menu.hidden = false; abrir.setAttribute("aria-expanded", "true"); d.body.style.overflow = "hidden";
      cerrarBtn.focus();
    });
    cerrarBtn.addEventListener("click", () => cerrar());
    menu.addEventListener("click", ev => { if (ev.target.closest("a[href^='#']")) cerrar(false); });
    menu.addEventListener("keydown", ev => {
      if (ev.key === "Escape") { cerrar(); return; }
      if (ev.key !== "Tab") return;
      const f = enfocables(), primero = f[0], ultimo = f[f.length - 1];
      if (ev.shiftKey && d.activeElement === primero) { ev.preventDefault(); ultimo.focus(); }
      else if (!ev.shiftKey && d.activeElement === ultimo) { ev.preventDefault(); primero.focus(); }
    });
    matchMedia("(min-width: 900px)").addEventListener("change", e => { if (e.matches && !menu.hidden) cerrar(false); });
  }

  /* ---------- Dilu mira hacia el puntero (solo con ratón y mientras se ve la portada) ---------- */
  const diluSvg = d.querySelector(".portada__dilu .dilu");
  if (diluSvg && html.classList.contains("anima") && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const caja = diluSvg.parentElement;
    let tx = 0, ty = 0, tr = 0, x = 0, y = 0, r = 0, raf = 0, activo = true;
    const paso = () => {
      x += (tx - x) * 0.12; y += (ty - y) * 0.12; r += (tr - r) * 0.12;
      diluSvg.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${r.toFixed(2)}deg)`;
      raf = Math.abs(tx - x) + Math.abs(ty - y) + Math.abs(tr - r) > 0.05 ? requestAnimationFrame(paso) : 0;
    };
    addEventListener("pointermove", ev => {
      if (!activo || ev.pointerType !== "mouse") return;
      const c = caja.getBoundingClientRect();
      const dx = ev.clientX - (c.left + c.width / 2), dy = ev.clientY - (c.top + c.height / 2);
      const dist = Math.hypot(dx, dy) || 1, k = Math.min(1, dist / 600);
      tx = (dx / dist) * 9 * k; ty = (dy / dist) * 7 * k; tr = Math.max(-12, Math.min(12, dx / 45));
      if (!raf) raf = requestAnimationFrame(paso);
    }, { passive: true });
    if ("IntersectionObserver" in window) new IntersectionObserver(([en]) => { activo = en.isIntersecting; }).observe(caja);
  }

  /* ---------- cifras que cuentan (la cifra real queda siempre para lectores de pantalla) ---------- */
  const contar = el => {
    const fin = parseFloat(el.dataset.contar), dec = Number(el.dataset.dec || 0);
    const f = new Intl.NumberFormat("es-ES", { minimumFractionDigits: dec, maximumFractionDigits: dec });
    const t0 = performance.now(), dur = 1300;
    const paso = t => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = f.format(fin * e);
      if (p < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  };

  /* ---------- apariciones al bajar ---------- */
  if (html.classList.contains("anima") && "IntersectionObserver" in window) {
    const marcar = (sel, clase) => d.querySelectorAll(sel).forEach((el, i) => { el.classList.add(clase); el.style.transitionDelay = `${(i % 4) * 70}ms`; });
    marcar(".bento__celda", "revela-foto");
    marcar(".cita", "revela");
    marcar(".tira__item", "revela");
    d.querySelectorAll(".menu__foto").forEach(el => el.classList.add("revela-foto"));
    d.querySelectorAll(".plano__mapa").forEach(el => el.classList.add("revela"));
    d.querySelectorAll(".plano__pin").forEach(el => { el.classList.add("revela"); el.style.transitionDelay = "450ms"; });
    // titulares de sección: el texto sube desde una máscara
    d.querySelectorAll(".carta__titulo, .menu__titulo, .local__titulo, .opiniones__titulo, .visita__titulo, .faq__titulo").forEach(h => {
      const mascara = d.createElement("span"), texto = d.createElement("span");
      mascara.className = "mascara"; texto.className = "mascara__texto";
      while (h.firstChild) texto.appendChild(h.firstChild);
      mascara.appendChild(texto); h.appendChild(mascara); h.classList.add("titulo-revela");
    });
    // la nota de Google: copia fija para lectores de pantalla y cifras desde cero en pantalla
    d.querySelectorAll(".opiniones__nota").forEach(nota => {
      const linea = nota.querySelector("[data-contar]")?.parentElement;
      if (linea) {
        const fija = d.createElement("span"); fija.className = "vh"; fija.textContent = linea.textContent;
        linea.before(fija); linea.setAttribute("aria-hidden", "true");
        linea.querySelectorAll("[data-contar]").forEach(c => { c.textContent = new Intl.NumberFormat("es-ES", { minimumFractionDigits: Number(c.dataset.dec || 0) }).format(0); });
      }
      nota.classList.add("observa");
    });
    d.querySelectorAll(".pie__marca").forEach(el => el.classList.add("observa"));
    const io = new IntersectionObserver(entradas => {
      entradas.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.classList.add("visto"); io.unobserve(en.target);
        if (en.target.matches(".opiniones__nota")) en.target.querySelectorAll("[data-contar]").forEach(contar);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });
    d.querySelectorAll(".revela, .revela-foto, .titulo-revela, .observa").forEach(el => io.observe(el));
  }

  /* ---------- Nebula: estado de la fiesta según la fecha (hora de Lloret) ----------
     Antes: cuenta los días. El día: «es hoy». Durante: «ahora mismo». Después: se quitan el aviso de la portada,
     el botón de entradas y las preguntas de esta edición, y se manda a su Instagram.
     ?nebula=2026-12-04T23:30 permite revisar cualquier momento (hora de Madrid). */
  const nebula = d.querySelector("[data-nebula]");
  if (nebula) {
    const N = {
      dia: "2026-12-04",
      inicio: Date.parse("2026-12-04T23:00:00+01:00"),
      finLista: Date.parse("2026-12-05T00:30:00+01:00"),
      fin: Date.parse("2026-12-05T03:00:00+01:00"),
    };
    const estadoN = nebula.querySelector("[data-nebula-estado]");
    const fechaMadrid = t => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(t);
    const diasEntre = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5);
    const pintarNebula = () => {
      const prueba = params.get("nebula");
      const t = prueba ? Date.parse(`${prueba}:00+01:00`) : Date.now();
      if (Number.isNaN(t)) return;
      const faltan = diasEntre(fechaMadrid(t), N.dia);
      let fase, texto;
      if (t >= N.fin) { fase = "pasado"; texto = "Nebula Vol. 1 ya pasó. Las próximas fechas, en @nebula.theroom"; }
      else if (t >= N.inicio) { fase = "ahora"; texto = t < N.finLista ? "Ahora mismo en Dile’s, hasta las 03:00. Lista gratis hasta las 00:30" : "Ahora mismo en Dile’s, hasta las 03:00"; }
      else if (faltan <= 0) { fase = "hoy"; texto = "Es hoy, a partir de las 23:00"; }
      else if (faltan === 1) { fase = "antes"; texto = "Es mañana, viernes 4 de diciembre, a las 23:00"; }
      else { fase = "antes"; texto = `Faltan ${faltan} días: viernes 4 de diciembre`; }
      nebula.dataset.fase = fase;
      if (estadoN) estadoN.textContent = texto;
      const pasado = fase === "pasado";
      d.querySelectorAll("[data-aviso-nebula], [data-nebula-entradas], [data-nebula-temporal]").forEach(el => { el.hidden = pasado; });
    };
    pintarNebula();
    setInterval(pintarNebula, 60 * 1000);

    // el platillo abduce a Dilu la primera vez que se ve; los bucles solo corren mientras está en pantalla
    const emblema = nebula.querySelector(".nebula__emblema");
    if (emblema && html.classList.contains("anima") && "IntersectionObserver" in window) {
      new IntersectionObserver(([en]) => {
        emblema.classList.toggle("en-pantalla", en.isIntersecting);
        if (en.isIntersecting) emblema.classList.add("visto");
      }, { rootMargin: "0px 0px -10% 0px", threshold: 0.35 }).observe(emblema);
    }
  }
})();
