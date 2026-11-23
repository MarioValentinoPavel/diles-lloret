/* Nebula · la noche verde de Dile’s
   Fondo de nebulosa (WebGL), el logo real con reflejo y gotas, cuenta atrás, cintas que aceleran con el scroll, vinilo y tracklist,
   pases colgantes con física de péndulo, platillo que abduce a Dilu y el viaje de vuelta a Dile’s.
   Sin dependencias. Sin JS todo se lee; con «reducir movimiento» no se mueve nada. */
(() => {
  "use strict";
  const d = document;
  const html = d.documentElement;
  const params = new URLSearchParams(location.search);
  const captura = params.has("captura");
  const reducir = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const anima = !reducir && !captura;
  if (anima) html.classList.add("anima");
  const fino = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const io = (el, fn, opts) => { if (!el || !("IntersectionObserver" in window)) return null; const o = new IntersectionObserver(fn, opts); o.observe(el); return o; };

  /* ---------- fechas (hora de Madrid) ---------- */
  const INICIO = Date.parse("2026-12-04T23:00:00+01:00");
  const FIN_LISTA = Date.parse("2026-12-05T00:30:00+01:00");
  const FIN = Date.parse("2026-12-05T03:00:00+01:00");
  const ahora = () => {
    const p = params.get("nebula");
    const t = p ? Date.parse(`${p}:00+01:00`) : NaN;
    return Number.isNaN(t) ? Date.now() : t + (performance.now() - T0);
  };
  const T0 = performance.now();

  /* ---------- cabecera: sólida al bajar ---------- */
  const cab = d.querySelector("[data-n-cabecera]");
  const ponerCabecera = () => cab && cab.classList.toggle("solida", scrollY > 40);
  ponerCabecera();
  addEventListener("scroll", ponerCabecera, { passive: true });

  /* ---------- cuenta atrás y estado ---------- */
  const cuenta = d.querySelector("[data-cuenta]");
  const texto = d.querySelector("[data-cuenta-texto]");
  const reloj = cuenta && cuenta.querySelector(".n-cuenta__reloj");
  const unidades = reloj ? Object.fromEntries([...reloj.querySelectorAll("[data-u]")].map(b => [b.dataset.u, b])) : {};
  const dos = n => String(n).padStart(2, "0");
  const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;
  let ultimoTexto = "";
  const pintarCuenta = () => {
    if (!cuenta) return;
    const t = ahora();
    let frase;
    if (t < INICIO) {
      const s = Math.floor((INICIO - t) / 1000);
      const v = { d: Math.floor(s / 86400), h: Math.floor(s / 3600) % 24, m: Math.floor(s / 60) % 60, s: s % 60 };
      reloj.hidden = false; texto.classList.add("vh");
      for (const k in v) {
        const b = unidades[k], nuevo = dos(v[k]);
        if (b && b.textContent !== nuevo) { b.textContent = nuevo; if (anima) { b.classList.remove("tic"); void b.offsetWidth; b.classList.add("tic"); } }
      }
      frase = `Faltan ${plural(v.d, "día", "días")}, ${plural(v.h, "hora", "horas")} y ${plural(v.m, "minuto", "minutos")} para Nebula`;
    } else {
      reloj.hidden = true; texto.classList.remove("vh");
      if (t < FIN) frase = t < FIN_LISTA ? "Está pasando ahora, hasta las 03:00. Lista gratis hasta las 00:30" : "Está pasando ahora, hasta las 03:00";
      else frase = "Nebula Vol. 1 ya pasó. Las próximas fechas, en @nebula.theroom";
    }
    if (frase !== ultimoTexto) { texto.textContent = frase; ultimoTexto = frase; }
    const pasado = t >= FIN;
    d.querySelectorAll("[data-n-entradas]").forEach(el => { el.hidden = pasado; });
    const nota = d.querySelector("[data-n-nota]");
    if (nota && pasado) nota.textContent = "La primera edición ya pasó. Las próximas fechas, en @nebula.theroom.";
  };
  pintarCuenta();
  setInterval(pintarCuenta, 1000);

  /* ---------- ¡pum! de entrada: estrellas desde el logo ---------- */
  const chispas = (x, y, n, molde, clase) => {
    if (!molde) return;
    for (let i = 0; i < n; i++) {
      const e = molde.cloneNode(true);
      e.setAttribute("class", `estrella ${clase}`);
      e.removeAttribute("style");
      d.body.appendChild(e);
      const ang = (i / n) * Math.PI * 2 + Math.random() * 0.5, dist = 180 + Math.random() * 320, giro = (Math.random() - 0.5) * 600;
      e.animate([
        { transform: `translate(${x - 17}px, ${y - 17}px) scale(0.2)`, opacity: 1 },
        { transform: `translate(${x - 17 + Math.cos(ang) * dist}px, ${y - 17 + Math.sin(ang) * dist}px) scale(${0.5 + Math.random()}) rotate(${giro}deg)`, opacity: 0 },
      ], { duration: 900 + Math.random() * 400, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "forwards" }).finished.then(() => e.remove());
    }
  };
  if (anima) {
    setTimeout(() => {
      const t = d.querySelector(".n-titulo");
      if (!t) return;
      const r = t.getBoundingClientRect();
      chispas(r.left + r.width / 2, r.top + r.height * 0.55, 16, d.querySelector(".n-cielo .estrella"), "chispa");
    }, 420);
  }

  /* ---------- fondo de nebulosa (WebGL) ---------- */
  const lienzo = d.querySelector(".n-fondo");
  const portada = d.querySelector(".n-portada");
  (() => {
    if (!lienzo) return;
    const gl = lienzo.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) return;
    const vs = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
    const fs = `precision mediump float;
uniform vec2 r;uniform float t;uniform vec2 m;
float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),u.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 q=mat2(.8,-.6,.6,.8);for(int i=0;i<5;i++){v+=a*n(p);p=q*p*2.03+.17;a*=.5;}return v;}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*r)/r.y+m*.05;
 float s=t*.04;
 vec2 q=vec2(fbm(uv*1.5+s),fbm(uv*1.5-s+3.1));
 float f=fbm(uv*1.7+1.8*q+vec2(s*1.2,-s));
 vec3 noche=vec3(.027,.043,.031),verde=vec3(.08,.24,.045),lima=vec3(.78,.95,.11);
 vec3 c=mix(noche,verde,smoothstep(.3,.9,f));
 c=mix(c,lima*.6,smoothstep(.66,1.05,f)*.8);
 c+=lima*.07*smoothstep(.55,.95,q.y);
 c*=smoothstep(1.35,.2,length(uv*vec2(.8,1.15)))*1.1+.04;
 float e=h(floor(gl_FragCoord.xy));
 c+=vec3(.85,1.,.6)*step(.9978,e)*(.55+.45*sin(t*1.7+e*80.));
 gl_FragColor=vec4(c,1.);
}`;
    const sh = (tipo, src) => { const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
    const v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return;
    const pr = gl.createProgram(); gl.attachShader(pr, v); gl.attachShader(pr, f); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
    gl.useProgram(pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uR = gl.getUniformLocation(pr, "r"), uT = gl.getUniformLocation(pr, "t"), uM = gl.getUniformLocation(pr, "m");
    const escala = Math.min(devicePixelRatio || 1, 1.5) * (innerWidth < 700 ? 0.45 : 0.55);
    const medir = () => {
      const w = Math.max(1, Math.round(lienzo.clientWidth * escala)), hh = Math.max(1, Math.round(lienzo.clientHeight * escala));
      if (lienzo.width !== w || lienzo.height !== hh) { lienzo.width = w; lienzo.height = hh; gl.viewport(0, 0, w, hh); }
      gl.uniform2f(uR, w, hh);
    };
    let mx = 0, my = 0, tx = 0, ty = 0, raf = 0, visible = true;
    const t0 = performance.now();
    const pintar = now => {
      medir();
      mx += (tx - mx) * 0.04; my += (ty - my) * 0.04;
      gl.uniform2f(uM, mx, my);
      gl.uniform1f(uT, anima ? (now - t0) / 1000 + 8 : 12);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = anima && visible && !d.hidden ? requestAnimationFrame(pintar) : 0;
    };
    const arrancar = () => { if (!raf) raf = requestAnimationFrame(pintar); };
    if (fino) addEventListener("pointermove", e => { tx = e.clientX / innerWidth - 0.5; ty = 0.5 - e.clientY / innerHeight; }, { passive: true });
    addEventListener("resize", () => { if (!anima) requestAnimationFrame(pintar); }, { passive: true });
    d.addEventListener("visibilitychange", () => { if (!d.hidden && visible) arrancar(); });
    io(portada, ([en]) => {
      visible = en.isIntersecting;
      portada.classList.toggle("quieta", !visible);
      if (visible) arrancar();
    });
    arrancar();
  })();

  /* ---------- cintas: aceleran con la velocidad del scroll ---------- */
  const cintas = d.querySelector(".n-cintas");
  if (anima && cintas) {
    const pistas = [...cintas.querySelectorAll(".n-cinta__pista")];
    let ultimoY = scrollY, vel = 0, raf = 0;
    const paso = () => {
      vel *= 0.92;
      const rate = 1 + Math.min(6, Math.abs(vel) * 0.06);
      pistas.forEach(p => p.getAnimations().forEach(a => { a.playbackRate = rate; }));
      raf = Math.abs(vel) > 0.3 ? requestAnimationFrame(paso) : 0;
      if (!raf) pistas.forEach(p => p.getAnimations().forEach(a => { a.playbackRate = 1; }));
    };
    addEventListener("scroll", () => { vel += scrollY - ultimoY; ultimoY = scrollY; if (!raf) raf = requestAnimationFrame(paso); }, { passive: true });
    io(cintas, ([en]) => cintas.classList.toggle("quieta", !en.isIntersecting));
  }

  /* ---------- vinilo y tracklist: suena la fila que pasa por el centro ---------- */
  const vinilo = d.querySelector(".n-vinilo");
  io(vinilo, ([en]) => vinilo.classList.toggle("sonando", en.isIntersecting), { threshold: 0.3 });
  const pistas = [...d.querySelectorAll(".n-pista")];
  if (pistas.length) {
    pistas[0].classList.add("sonando");
    if ("IntersectionObserver" in window) {
      const o = new IntersectionObserver(ens => ens.forEach(en => {
        if (!en.isIntersecting) return;
        pistas.forEach(p => p.classList.toggle("sonando", p === en.target));
      }), { rootMargin: "-46% 0px -46% 0px" });
      pistas.forEach(p => o.observe(p));
    }
    if (fino) pistas.forEach(p => p.addEventListener("pointerenter", () => pistas.forEach(q => q.classList.toggle("sonando", q === p))));
  }

  /* ---------- pases colgantes: péndulo con muelle ---------- */
  const pases = [...d.querySelectorAll("[data-pase]")].map((el, i) => ({ el, th: 0, w: 0, lado: i % 2 ? 1 : -1 }));
  if (pases.length) {
    if (!anima) pases.forEach(p => p.el.classList.add("colgado"));
    else {
      let raf = 0, ultimo = 0;
      const K = 38, C = 2.1;
      const paso = now => {
        const dt = Math.min(0.033, ultimo ? (now - ultimo) / 1000 : 0.016); ultimo = now;
        let vivo = false;
        pases.forEach(p => {
          p.w += (-K * p.th - C * p.w) * dt;
          p.th += p.w * dt;
          if (Math.abs(p.th) > 0.04 || Math.abs(p.w) > 0.04) vivo = true;
          p.el.style.transform = `rotate(${p.th.toFixed(3)}deg)`;
        });
        raf = vivo ? requestAnimationFrame(paso) : 0;
        if (!raf) ultimo = 0;
      };
      const empujar = (p, dw) => { p.w += dw; if (!raf) raf = requestAnimationFrame(paso); };
      // al llegar: caen desde un lado y se balancean
      io(d.querySelector(".n-pases"), ([en], o) => {
        if (!en.isIntersecting) return;
        o.disconnect();
        pases.forEach((p, i) => setTimeout(() => { p.el.classList.add("colgado"); p.th = 26 * p.lado; p.w = 0; if (!raf) raf = requestAnimationFrame(paso); }, i * 160));
      }, { threshold: 0.25 });
      // el ratón los empuja; un toque también
      pases.forEach(p => {
        let px = null, pt = 0;
        p.el.addEventListener("pointermove", e => {
          if (e.pointerType !== "mouse") return;
          const t = performance.now();
          if (px !== null) empujar(p, Math.max(-60, Math.min(60, ((e.clientX - px) / Math.max(8, t - pt)) * 22)));
          px = e.clientX; pt = t;
        });
        p.el.addEventListener("pointerleave", () => { px = null; });
        p.el.addEventListener("pointerdown", e => { if (e.pointerType !== "mouse") empujar(p, 70 * p.lado); });
      });
      // y el scroll los mece un poco
      let yAnt = scrollY;
      addEventListener("scroll", () => { const dy = scrollY - yAnt; yAnt = scrollY; if (Math.abs(dy) > 2) pases.forEach(p => empujar(p, Math.max(-14, Math.min(14, dy * 0.35)) * p.lado)); }, { passive: true });
    }
  }

  /* ---------- apariciones: títulos, cartel y platillo ---------- */
  if (anima && "IntersectionObserver" in window) {
    const o = new IntersectionObserver(ens => ens.forEach(en => { if (en.isIntersecting) { en.target.classList.add("visto"); o.unobserve(en.target); } }), { rootMargin: "0px 0px -12% 0px", threshold: 0.15 });
    d.querySelectorAll(".n-h2").forEach(h => { h.classList.add("revela"); o.observe(h); });
    d.querySelectorAll(".n-poster").forEach(el => o.observe(el));
    const emblema = d.querySelector(".nebula__emblema");
    io(emblema, ([en]) => { emblema.classList.toggle("en-pantalla", en.isIntersecting); if (en.isIntersecting) emblema.classList.add("visto"); }, { rootMargin: "0px 0px -10% 0px", threshold: 0.35 });
  }

  /* ---------- volver a Dile’s: amarillo y noche desde el botón; Dile’s se abre girando su logo ---------- */
  const radioHasta = (x, y) => Math.ceil(Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))) + 2;
  let yendo = false;
  d.querySelectorAll("[data-volver]").forEach(a => a.addEventListener("click", ev => {
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button > 0 || yendo) return;
    try { sessionStorage.setItem("diles-vuelta", "1"); } catch (e) { /* sin almacenamiento: vuelve sin animación */ }
    if (!anima) return;
    ev.preventDefault();
    yendo = true;
    let ido = false;
    const ir = () => { if (!ido) { ido = true; location.href = a.href; } };
    const r = a.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, R = radioHasta(x, y);
    const p = d.createElement("div"); p.className = "portal"; p.setAttribute("aria-hidden", "true");
    p.innerHTML = '<span class="portal__amarillo"></span><span class="portal__noche"></span>';
    d.body.appendChild(p);
    const [am, no] = p.children, de = `circle(0px at ${x}px ${y}px)`, hasta = `circle(${R}px at ${x}px ${y}px)`;
    am.animate([{ clipPath: de }, { clipPath: hasta }], { duration: 520, easing: "cubic-bezier(0.7, 0, 0.84, 0)", fill: "forwards" });
    no.animate([{ clipPath: de }, { clipPath: hasta }], { duration: 520, delay: 160, easing: "cubic-bezier(0.7, 0, 0.84, 0)", fill: "forwards" })
      .finished.then(ir);
    setTimeout(ir, 1100);
  }));
  addEventListener("pageshow", ev => { if (ev.persisted) { yendo = false; d.querySelectorAll(".portal, .chispa").forEach(el => el.remove()); } });
})();
