// ==========================================================================
// Escena 1 (Noche) + Escena 2 (Campo de día con Sol y flores decorativas)
// ==========================================================================

const SVG_NS = "http://www.w3.org/2000/svg";
const CENTRO_LUNA = { x: 500, y: 500 };
const RADIO_ZONA_PROHIBIDA_LUNA = 170;
const DISTANCIA_MIN_ESTRELLAS = 70;
const MARGEN_BORDE_X = 110;
const MARGEN_SUPERIOR_Y = 100;
const MARGEN_INFERIOR_Y = 855; // Evita que las estrellas-receta caigan sobre las puntas de las montañas

/**
 * Generador pseudoaleatorio determinista (Mulberry32).
 */
function crearPRNG(semilla) {
    let a = semilla >>> 0;
    return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Hash determinista FNV-1a de 32 bits.
 */
function hashTexto(texto) {
    let h = 0x811c9dc5;
    for (let i = 0; i < texto.length; i++) {
        h ^= texto.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

// --------------------------------------------------------------------------
// 0. Ajuste de escala para pantallas anchas (PC, ej. 1807x813) y celulares:
//    Garantiza que SIEMPRE se vea todo el alto (y: 0..1000, desde el sol hasta
//    las puntas de las montañas) sin recortar arriba ni abajo y sin deformar.
// --------------------------------------------------------------------------
function actualizarEscalaPantallas() {
    const svgs = document.querySelectorAll(".lienzo-svg");
    const modo = window.innerWidth >= window.innerHeight ? "xMidYMid meet" : "xMidYMid slice";
    for (const svg of svgs) {
        svg.setAttribute("preserveAspectRatio", modo);
    }
}

window.addEventListener("resize", actualizarEscalaPantallas);

// --------------------------------------------------------------------------
// 1. Estrellas decorativas de fondo (Escena 1: Noche)
// --------------------------------------------------------------------------
function renderizarEstrellasFondo(cantidad = 320) {
    const capa = document.getElementById("capa-estrellas-fondo");
    if (!capa) return;

    const rand = crearPRNG(20261120);
    const fragmento = document.createDocumentFragment();
    const tonos = ["#ffffff", "#fff7e0", "#e3ebff", "#ffe9c7"];

    let creadas = 0;
    while (creadas < cantidad) {
        const x = -850 + rand() * 2700;
        const y = rand() * 910;

        const distLuna = Math.hypot(x - CENTRO_LUNA.x, y - CENTRO_LUNA.y);
        if (distLuna < 122) continue;

        const r = 0.7 + Math.pow(rand(), 2) * 1.6;
        const opMin = (0.12 + rand() * 0.28).toFixed(2);
        const opMax = (0.65 + rand() * 0.35).toFixed(2);
        const duracion = (2.4 + rand() * 4.2).toFixed(2);
        const delay = (-rand() * 6).toFixed(2);
        const color = tonos[Math.floor(rand() * tonos.length)];

        const estrella = document.createElementNS(SVG_NS, "circle");
        estrella.setAttribute("class", "estrella-fondo");
        estrella.setAttribute("cx", x.toFixed(1));
        estrella.setAttribute("cy", y.toFixed(1));
        estrella.setAttribute("r", r.toFixed(2));
        estrella.setAttribute("fill", color);
        estrella.style.setProperty("--opacidad-min", opMin);
        estrella.style.setProperty("--opacidad-max", opMax);
        estrella.style.animationDuration = `${duracion}s`;
        estrella.style.animationDelay = `${delay}s`;

        fragmento.appendChild(estrella);
        creadas++;
    }

    capa.replaceChildren(fragmento);
}

// --------------------------------------------------------------------------
// 2. Estrellas-receta por hash (Escena 1: Noche)
// --------------------------------------------------------------------------
function calcularPosicionEstrella(id, posicionesOcupadas) {
    const rangoX = 1000 - MARGEN_BORDE_X * 2;
    const rangoY = MARGEN_INFERIOR_Y - MARGEN_SUPERIOR_Y;

    for (let salt = 0; salt < 500; salt++) {
        const semilla = hashTexto(`${id}#${salt}`);
        const rand = crearPRNG(semilla);

        const x = MARGEN_BORDE_X + rand() * rangoX;
        const y = MARGEN_SUPERIOR_Y + rand() * rangoY;

        const distLuna = Math.hypot(x - CENTRO_LUNA.x, y - CENTRO_LUNA.y);
        if (distLuna < RADIO_ZONA_PROHIBIDA_LUNA) continue;

        const choca = posicionesOcupadas.some(
            p => Math.hypot(x - p.x, y - p.y) < DISTANCIA_MIN_ESTRELLAS
        );
        if (choca) continue;

        return { x, y };
    }

    return { x: MARGEN_BORDE_X, y: MARGEN_SUPERIOR_Y };
}

function crearPathDestello4Puntas(radioExterior = 14, radioInterior = 3.2) {
    const R = radioExterior;
    const r = radioInterior;
    return [
        `M 0 ${-R}`,
        `Q ${r} ${-r} ${R} 0`,
        `Q ${r} ${r} 0 ${R}`,
        `Q ${-r} ${r} ${-R} 0`,
        `Q ${-r} ${-r} 0 ${-R}`,
        "Z"
    ].join(" ");
}

function mostrarAvisoTemporal(mensaje) {
    const aviso = document.getElementById("aviso-estrella");
    if (!aviso) return;
    aviso.textContent = mensaje;
    aviso.hidden = false;
    clearTimeout(mostrarAvisoTemporal._timer);
    mostrarAvisoTemporal._timer = setTimeout(() => {
        aviso.hidden = true;
    }, 2600);
}

/**
 * Determina un matiz estelar muy sutil para cada estrella-receta a partir del hash de su id.
 * Inspirado en colores reales de estrellas (blanco-azulado, champán cálido, rosa pálido,
 * lila plateado, menta celeste y durazno suave).
 */
function obtenerRasgosEstrella(receta) {
    const rand = crearPRNG(hashTexto(`color-estrella:${receta.id}`));
    const paletasEstelares = [
        {
            nombre: "azul-sirio",
            nucleo: "#ffffff",
            principal: "#f2f7ff",
            tinte: "#bfd8ff",
            acento: "#9ec2ff"
        },
        {
            nombre: "dorado-capella",
            nucleo: "#ffffff",
            principal: "#fffdf2",
            tinte: "#ffe8a8",
            acento: "#ffd778"
        },
        {
            nombre: "rosa-antares",
            nucleo: "#ffffff",
            principal: "#fff5f7",
            tinte: "#ffc9d4",
            acento: "#ffadbfe6"
        },
        {
            nombre: "lila-vega",
            nucleo: "#ffffff",
            principal: "#f8f4ff",
            tinte: "#dec9ff",
            acento: "#c6a6ff"
        },
        {
            nombre: "celeste-polar",
            nucleo: "#ffffff",
            principal: "#f2fffd",
            tinte: "#bceee7",
            acento: "#98e2d8"
        },
        {
            nombre: "durazno-arcturus",
            nucleo: "#ffffff",
            principal: "#fff8f2",
            tinte: "#ffd5b8",
            acento: "#ffbe94"
        }
    ];

    return paletasEstelares[Math.floor(rand() * paletasEstelares.length)];
}

function crearElementoEstrellaReceta(receta, pos) {
    const rasgos = obtenerRasgosEstrella(receta);

    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("class", "estrella-receta");
    g.setAttribute("transform", `translate(${pos.x.toFixed(1)}, ${pos.y.toFixed(1)})`);
    g.setAttribute("role", "button");
    g.setAttribute("tabindex", "0");
    g.setAttribute("aria-label", receta.titulo || receta.id);
    g.dataset.id = receta.id;
    g.style.setProperty("--estrella-sombra", rasgos.tinte);
    g.style.setProperty("--estrella-sombra-hover", rasgos.principal);

    const title = document.createElementNS(SVG_NS, "title");
    title.textContent = receta.titulo || receta.id;
    g.appendChild(title);

    const areaToque = document.createElementNS(SVG_NS, "circle");
    areaToque.setAttribute("r", "26");
    areaToque.setAttribute("fill", "transparent");
    g.appendChild(areaToque);

    // Halo difuso y muy tenue (sin borde circular marcado)
    const halo = document.createElementNS(SVG_NS, "circle");
    halo.setAttribute("class", "estrella-halo");
    halo.setAttribute("r", "14");
    halo.setAttribute("fill", rasgos.tinte);
    g.appendChild(halo);

    const cuerpo = document.createElementNS(SVG_NS, "g");
    cuerpo.setAttribute("class", "estrella-cuerpo");

    const destelloDiagonal = document.createElementNS(SVG_NS, "path");
    destelloDiagonal.setAttribute("d", crearPathDestello4Puntas(8.5, 1.8));
    destelloDiagonal.setAttribute("transform", "rotate(45)");
    destelloDiagonal.setAttribute("fill", rasgos.tinte);
    destelloDiagonal.setAttribute("opacity", "0.75");
    cuerpo.appendChild(destelloDiagonal);

    const destelloPrincipal = document.createElementNS(SVG_NS, "path");
    destelloPrincipal.setAttribute("d", crearPathDestello4Puntas(14, 3));
    destelloPrincipal.setAttribute("fill", rasgos.principal);
    cuerpo.appendChild(destelloPrincipal);

    const nucleo = document.createElementNS(SVG_NS, "circle");
    nucleo.setAttribute("r", "2.6");
    nucleo.setAttribute("fill", rasgos.nucleo);
    cuerpo.appendChild(nucleo);

    g.appendChild(cuerpo);

    const activar = () => {
        abrirModal(receta, "receta");
    };

    g.addEventListener("click", activar);
    g.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            activar();
        }
    });

    return g;
}

// --------------------------------------------------------------------------
// Utilidad para evaluar la altura Y del borde de una montaña (curvas cuadráticas)
// --------------------------------------------------------------------------
function evaluarCrestaMontana(x, segmentos) {
    for (const seg of segmentos) {
        const [x0, y0, cx, cy, x1, y1] = seg;
        if (x >= x0 && x <= x1) {
            const t = (x - x0) / (x1 - x0);
            const u = 1 - t;
            return u * u * y0 + 2 * u * t * cy + t * t * y1;
        }
    }
    return segmentos[0][1];
}

function crearFlorCitaDecorativa(f, colorTallo, colorCentro) {
    const gPos = document.createElementNS(SVG_NS, "g");
    gPos.setAttribute(
        "transform",
        `translate(${f.x.toFixed(1)}, ${f.y.toFixed(1)}) scale(${f.escala.toFixed(2)})`
    );

    const gBrisa = document.createElementNS(SVG_NS, "g");
    gBrisa.setAttribute("class", "flor-decorativa");
    gBrisa.style.animationDuration = `${f.duracion}s`;
    gBrisa.style.animationDelay = `${f.delay}s`;

    const tallo = document.createElementNS(SVG_NS, "path");
    tallo.setAttribute(
        "d",
        `M 0 0 Q ${(f.inclinacion * 0.4).toFixed(1)} -10 ${f.inclinacion.toFixed(1)} -18`
    );
    tallo.setAttribute("stroke", colorTallo);
    tallo.setAttribute("stroke-width", "1.6");
    tallo.setAttribute("stroke-linecap", "round");
    tallo.setAttribute("fill", "none");
    gBrisa.appendChild(tallo);

    const corola = document.createElementNS(SVG_NS, "g");
    corola.setAttribute("transform", `translate(${f.inclinacion.toFixed(1)}, -18)`);

    for (let p = 0; p < f.numPetalos; p++) {
        const angulo = (360 / f.numPetalos) * p;
        const petalo = document.createElementNS(SVG_NS, "ellipse");
        petalo.setAttribute("cx", "0");
        petalo.setAttribute("cy", "-3.4");
        petalo.setAttribute("rx", "2.1");
        petalo.setAttribute("ry", "3.6");
        petalo.setAttribute("transform", `rotate(${angulo.toFixed(1)})`);
        petalo.setAttribute("fill", f.color);
        petalo.setAttribute("opacity", "0.92");
        corola.appendChild(petalo);
    }

    const centro = document.createElementNS(SVG_NS, "circle");
    centro.setAttribute("r", "1.6");
    centro.setAttribute("fill", colorCentro);
    corola.appendChild(centro);

    gBrisa.appendChild(corola);
    gPos.appendChild(gBrisa);
    return gPos;
}

// --------------------------------------------------------------------------
// 3.0: Flores decorativas en las puntas de las montañas de la Escena 1 (Noche)
// --------------------------------------------------------------------------
function renderizarFloresMontanasNoche() {
    const capaLejana = document.getElementById("capa-flores-cumbre-lejana");
    const capaFrente = document.getElementById("capa-flores-cumbre-frente");
    if (!capaLejana || !capaFrente) return;

    const rand = crearPRNG(667788);
    const paletaNoche = [
        "#e6c8f5", // lila lunar
        "#f5c2d7", // rosa nocturno
        "#fff2c2", // crema brillante
        "#b8d8ff", // azul estelar
        "#d8b4e2"  // lavanda
    ];

    // Segmentos exactos de path.cumbre-lejana (-1000 a 2000)
    const segLejana = [
        [-1000, 938, -840, 884, -680, 936],
        [-680, 936, -510, 880, -340, 934],
        [-340, 934, -175, 882, -20, 948],
        [-20, 948, 95, 892, 215, 935],
        [215, 935, 345, 878, 485, 930],
        [485, 930, 635, 872, 780, 926],
        [780, 926, 905, 888, 1020, 938],
        [1020, 938, 1185, 880, 1350, 934],
        [1350, 934, 1520, 884, 1690, 936],
        [1690, 936, 1845, 888, 2000, 940]
    ];

    // Segmentos exactos de path.cumbre-frente (-1000 a 2000)
    const segFrente = [
        [-1000, 960, -800, 910, -600, 956],
        [-600, 956, -410, 906, -220, 956],
        [-220, 956, -115, 916, -20, 968],
        [-20, 968, 150, 916, 310, 956],
        [310, 956, 505, 902, 685, 952],
        [685, 952, 845, 914, 1020, 958],
        [1020, 958, 1210, 906, 1400, 954],
        [1400, 954, 1590, 912, 1780, 956],
        [1780, 956, 1890, 920, 2000, 960]
    ];

    // 1) Florecitas en la cumbre lejana
    const floresLejanas = [];
    for (let i = 0; i < 60; i++) {
        const x = -820 + rand() * 2640;
        const yCresta = evaluarCrestaMontana(x, segLejana);
        const y = yCresta + 3 + rand() * 24;
        const escala = 0.36 + rand() * 0.14;
        floresLejanas.push({
            x,
            y,
            escala,
            color: paletaNoche[Math.floor(rand() * paletaNoche.length)],
            numPetalos: rand() > 0.4 ? 5 : 4,
            inclinacion: (rand() - 0.5) * 7,
            duracion: (3.5 + rand() * 2.5).toFixed(2),
            delay: (-rand() * 5).toFixed(2)
        });
    }
    floresLejanas.sort((a, b) => a.y - b.y);
    const fragLejana = document.createDocumentFragment();
    for (const f of floresLejanas) {
        fragLejana.appendChild(crearFlorCitaDecorativa(f, "#2a4556", "#ffe599"));
    }
    capaLejana.replaceChildren(fragLejana);

    // 2) Florecitas en la cumbre frontal
    const floresFrente = [];
    for (let i = 0; i < 78; i++) {
        const x = -820 + rand() * 2640;
        const yCresta = evaluarCrestaMontana(x, segFrente);
        const y = Math.min(996, yCresta + 4 + rand() * 38);
        const escala = 0.46 + ((y - 920) / 80) * 0.22;
        floresFrente.push({
            x,
            y,
            escala,
            color: paletaNoche[Math.floor(rand() * paletaNoche.length)],
            numPetalos: rand() > 0.4 ? 5 : 4,
            inclinacion: (rand() - 0.5) * 8,
            duracion: (3.2 + rand() * 2.6).toFixed(2),
            delay: (-rand() * 5).toFixed(2)
        });
    }
    floresFrente.sort((a, b) => a.y - b.y);
    const fragFrente = document.createDocumentFragment();
    for (const f of floresFrente) {
        fragFrente.appendChild(crearFlorCitaDecorativa(f, "#244954", "#ffe599"));
    }
    capaFrente.replaceChildren(fragFrente);
}

// --------------------------------------------------------------------------
// 3. Escena 2 (Campo de día: pasto de fondo + flores decorativas + pasto de frente)
// --------------------------------------------------------------------------
function renderizarPaisajeCampo() {
    // 3.1a: Briznas de pasto de fondo (verdes soleados distribuidos por toda la pradera ancha)
    const capaPastoFondo = document.getElementById("capa-pasto-fondo");
    if (capaPastoFondo) {
        const randPasto = crearPRNG(445566);
        const fragPastoFondo = document.createDocumentFragment();
        const coloresPasto = ["#2e7037", "#3d8746", "#27612f"];

        for (let i = 0; i < 360; i++) {
            const x = -850 + randPasto() * 2700;
            const y = 480 + randPasto() * 480;
            const escala = 0.55 + ((y - 480) / 520) * 0.9;
            const alto = (16 + randPasto() * 18) * escala;
            const inclinacion = (randPasto() - 0.5) * 18 * escala;
            const grosor = (1.8 + randPasto() * 1.4) * escala;

            const brizna = document.createElementNS(SVG_NS, "path");
            const d = `M ${x.toFixed(1)} ${y.toFixed(1)} Q ${(x + inclinacion * 0.4).toFixed(1)} ${(y - alto * 0.55).toFixed(1)} ${(x + inclinacion).toFixed(1)} ${(y - alto).toFixed(1)}`;
            brizna.setAttribute("d", d);
            brizna.setAttribute("stroke", coloresPasto[Math.floor(randPasto() * coloresPasto.length)]);
            brizna.setAttribute("stroke-width", grosor.toFixed(2));
            brizna.setAttribute("stroke-linecap", "round");
            brizna.setAttribute("fill", "none");
            brizna.setAttribute("opacity", "0.8");
            fragPastoFondo.appendChild(brizna);
        }
        capaPastoFondo.replaceChildren(fragPastoFondo);
    }

    // 3.1b: Pasto de frente (siluetas verdes más grandes en el borde inferior de -1000 a 2000)
    const capaPastoFrente = document.getElementById("capa-pasto-frente");
    if (capaPastoFrente) {
        const randFrente = crearPRNG(778899);
        const fragFrente = document.createDocumentFragment();

        const base = document.createElementNS(SVG_NS, "path");
        base.setAttribute(
            "d",
            "M -1000,960 Q -500,945 -20,965 Q 250,945 500,960 T 1020,950 Q 1500,945 2000,960 L 2000,1020 L -1000,1020 Z"
        );
        base.setAttribute("fill", "url(#grad-pasto-frente)");
        fragFrente.appendChild(base);

        for (let i = 0; i < 200; i++) {
            const x = -850 + randFrente() * 2700;
            const yBase = 985 + randFrente() * 25;
            const alto = 45 + randFrente() * 65;
            const curva = (randFrente() - 0.5) * 42;
            const anchoBase = 3 + randFrente() * 3.5;

            const hoja = document.createElementNS(SVG_NS, "path");
            const d = [
                `M ${(x - anchoBase).toFixed(1)} ${yBase.toFixed(1)}`,
                `Q ${(x + curva * 0.35).toFixed(1)} ${(yBase - alto * 0.55).toFixed(1)} ${(x + curva).toFixed(1)} ${(yBase - alto).toFixed(1)}`,
                `Q ${(x + curva * 0.45 + anchoBase * 0.4).toFixed(1)} ${(yBase - alto * 0.5).toFixed(1)} ${(x + anchoBase).toFixed(1)} ${yBase.toFixed(1)}`,
                "Z"
            ].join(" ");
            hoja.setAttribute("d", d);
            hoja.setAttribute("fill", "url(#grad-pasto-frente)");
            hoja.setAttribute("opacity", (0.85 + randFrente() * 0.15).toFixed(2));
            fragFrente.appendChild(hoja);
        }

        capaPastoFrente.replaceChildren(fragFrente);
    }

    // 3.2: Flores decorativas en las montañas del fondo del campo y en la pradera
    renderizarFloresDecorativasCampo();
}

function renderizarFloresDecorativasCampo(cantidadPradera = 230) {
    const capaColinaLejana = document.getElementById("capa-flores-colina-lejana");
    const capaColinaMedia = document.getElementById("capa-flores-colina-media");
    const capaFloresFondo = document.getElementById("capa-flores-fondo");
    if (!capaFloresFondo) return;

    const rand = crearPRNG(334455);
    const paletaPetalos = [
        "#ffffff", // margarita blanca
        "#ffd6e0", // rosa suave
        "#fff099", // amarillo soleado
        "#e2c6ff", // lavanda
        "#b8e1ff"  // celeste flor
    ];

    // A) Flores pequeñitas en la cordillera más lejana del campo (-1000 a 2000)
    if (capaColinaLejana) {
        const segColinaLejana = [
            [-1000, 415, -820, 348, -650, 398],
            [-650, 398, -480, 345, -320, 402],
            [-320, 402, -170, 350, -20, 430],
            [-20, 430, 150, 340, 340, 395],
            [340, 395, 530, 450, 710, 375],
            [710, 375, 890, 300, 1020, 415],
            [1020, 415, 1190, 348, 1360, 400],
            [1360, 400, 1530, 348, 1700, 402],
            [1700, 402, 1850, 358, 2000, 415]
        ];
        const floresLejanas = [];
        for (let i = 0; i < 105; i++) {
            const x = -820 + rand() * 2640;
            const yCresta = evaluarCrestaMontana(x, segColinaLejana);
            const y = yCresta + 5 + rand() * 38;
            const escala = 0.24 + rand() * 0.11;
            floresLejanas.push({
                x,
                y,
                escala,
                color: paletaPetalos[Math.floor(rand() * paletaPetalos.length)],
                numPetalos: rand() > 0.45 ? 5 : 4,
                inclinacion: (rand() - 0.5) * 6,
                duracion: (3.6 + rand() * 2.6).toFixed(2),
                delay: (-rand() * 6).toFixed(2)
            });
        }
        floresLejanas.sort((a, b) => a.y - b.y);
        const fragLejana = document.createDocumentFragment();
        for (const f of floresLejanas) {
            fragLejana.appendChild(crearFlorCitaDecorativa(f, "#437a5f", "#ffb703"));
        }
        capaColinaLejana.replaceChildren(fragLejana);
    }

    // B) Flores en las colinas intermedias del fondo del campo (-1000 a 2000)
    if (capaColinaMedia) {
        const segColinaMedia = [
            [-1000, 445, -780, 392, -560, 440],
            [-560, 440, -360, 395, -180, 442],
            [-180, 442, -100, 410, -20, 455],
            [-20, 455, 210, 390, 460, 445],
            [460, 445, 710, 500, 880, 410],
            [880, 410, 960, 420, 1020, 440],
            [1020, 440, 1220, 392, 1420, 440],
            [1420, 440, 1620, 395, 1820, 442],
            [1820, 442, 1910, 418, 2000, 445]
        ];
        const floresMedias = [];
        for (let i = 0; i < 125; i++) {
            const x = -820 + rand() * 2640;
            const yCresta = evaluarCrestaMontana(x, segColinaMedia);
            const y = yCresta + 5 + rand() * 36;
            const escala = 0.32 + rand() * 0.12;
            floresMedias.push({
                x,
                y,
                escala,
                color: paletaPetalos[Math.floor(rand() * paletaPetalos.length)],
                numPetalos: rand() > 0.45 ? 5 : 4,
                inclinacion: (rand() - 0.5) * 7,
                duracion: (3.4 + rand() * 2.8).toFixed(2),
                delay: (-rand() * 6).toFixed(2)
            });
        }
        floresMedias.sort((a, b) => a.y - b.y);
        const fragMedia = document.createDocumentFragment();
        for (const f of floresMedias) {
            fragMedia.appendChild(crearFlorCitaDecorativa(f, "#356e44", "#ffb703"));
        }
        capaColinaMedia.replaceChildren(fragMedia);
    }

    // C) Flores en la pradera principal (-820 a 1820)
    const flores = [];
    for (let i = 0; i < cantidadPradera; i++) {
        const x = -820 + rand() * 2640;
        const t = Math.pow(rand(), 1.15);
        const y = 472 + t * 478;
        const escala = 0.42 + ((y - 472) / 478) * 0.65;
        const color = paletaPetalos[Math.floor(rand() * paletaPetalos.length)];
        const numPetalos = rand() > 0.45 ? 5 : 4;
        const inclinacion = (rand() - 0.5) * 8;
        const duracion = (3.4 + rand() * 2.8).toFixed(2);
        const delay = (-rand() * 6).toFixed(2);

        flores.push({ x, y, escala, color, numPetalos, inclinacion, duracion, delay });
    }

    flores.sort((a, b) => a.y - b.y);

    const frag = document.createDocumentFragment();
    for (const f of flores) {
        frag.appendChild(crearFlorCitaDecorativa(f, "#2b6e34", "#ffb703"));
    }

    capaFloresFondo.replaceChildren(frag);
}

// --------------------------------------------------------------------------
// 3.3: Flores-receta por hash (Tulipanes, Rosas, Orquídeas y Girasoles)
// --------------------------------------------------------------------------
const DISTANCIA_MIN_FLORES = 58;
const MARGEN_FLOR_X = 85;
const MARGEN_FLOR_Y_MIN = 515; // Parte baja de la pantalla (~60% inferior, dentro de la pradera)
const MARGEN_FLOR_Y_MAX = 920; // Arriba del pasto de primer plano

function calcularPosicionFlor(id, posicionesOcupadas) {
    const rangoX = 1000 - MARGEN_FLOR_X * 2;
    const rangoY = MARGEN_FLOR_Y_MAX - MARGEN_FLOR_Y_MIN;

    for (let salt = 0; salt < 500; salt++) {
        // Usamos un prefijo distinto al de la estrella para que su posición en el campo sea propia
        const semilla = hashTexto(`flor:${id}#${salt}`);
        const rand = crearPRNG(semilla);

        const x = MARGEN_FLOR_X + rand() * rangoX;
        const y = MARGEN_FLOR_Y_MIN + rand() * rangoY;

        const choca = posicionesOcupadas.some(
            p => Math.hypot(x - p.x, y - p.y) < DISTANCIA_MIN_FLORES
        );
        if (choca) continue;

        return { x, y };
    }

    return { x: 500, y: 740 };
}

/**
 * Determina especie y paleta de colores a partir del hash del id.
 * Especies: "tulipan", "rosa", "orquidea", "girasol"
 */
function obtenerRasgosFlor(receta) {
    const rand = crearPRNG(hashTexto(`rasgos-flor:${receta.id}`));
    const especies = ["tulipan", "rosa", "orquidea", "girasol"];

    // Si algún JSON define opcionalmente "flor": "rosa" (etc.), lo respeta; si no, sale del hash
    const especieForzada = (receta.flor || "").toLowerCase().trim();
    const especie = especies.includes(especieForzada)
        ? especieForzada
        : especies[Math.floor(rand() * especies.length)];

    const paletas = {
        tulipan: [
            { principal: "#ff4d6d", secundario: "#c9184a", luz: "#ff8fa3", centro: "#ffd166" },
            { principal: "#ff9e00", secundario: "#e07a00", luz: "#ffca3a", centro: "#fff3b0" },
            { principal: "#b5179e", secundario: "#7209b7", luz: "#f72585", centro: "#ffe66d" },
            { principal: "#ff758f", secundario: "#e63956", luz: "#ffb3c1", centro: "#fff0a5" }
        ],
        rosa: [
            { principal: "#e63946", secundario: "#9e1926", luz: "#ff8fa3", centro: "#6b0f1a" },
            { principal: "#ff85a1", secundario: "#d84a6e", luz: "#ffc2d1", centro: "#a32648" },
            { principal: "#ff9b71", secundario: "#d9653b", luz: "#ffd0b8", centro: "#9e3b18" },
            { principal: "#fff0f3", secundario: "#f4acb7", luz: "#ffffff", centro: "#d87a8d" }
        ],
        orquidea: [
            { principal: "#d972ff", secundario: "#8a2be2", luz: "#f2c6ff", centro: "#ffbe0b" },
            { principal: "#ffffff", secundario: "#e8ccf7", luz: "#fff9ff", centro: "#d9048e" },
            { principal: "#ff70a6", secundario: "#b5179e", luz: "#ffafd0", centro: "#ffd166" },
            { principal: "#b892ff", secundario: "#6c42c4", luz: "#e2d4ff", centro: "#ffca3a" }
        ],
        girasol: [
            { principal: "#ffbe0b", secundario: "#ee8902", luz: "#ffe169", centro: "#4a2c11" },
            { principal: "#ffca3a", secundario: "#e09100", luz: "#fff099", centro: "#3d220a" }
        ]
    };

    const listaPaletas = paletas[especie];
    const colores = listaPaletas[Math.floor(rand() * listaPaletas.length)];
    const inclinacion = (rand() - 0.5) * 9;
    const delay = (-rand() * 4).toFixed(2);

    return { especie, colores, inclinacion, delay };
}

function crearPathSVG(d, attrs = {}) {
    const p = document.createElementNS(SVG_NS, "path");
    p.setAttribute("d", d);
    for (const [k, v] of Object.entries(attrs)) {
        p.setAttribute(k, v);
    }
    return p;
}

/**
 * 1) DIBUJO DE TULIPÁN
 */
function construirCorolaTulipan(colores) {
    const g = document.createElementNS(SVG_NS, "g");

    // Pétalos traseros/laterales
    g.appendChild(
        crearPathSVG("M -2 2 C -19 0 -22 -24 -11 -35 C -4 -28 -1 -14 -2 2 Z", {
            fill: colores.secundario
        })
    );
    g.appendChild(
        crearPathSVG("M 2 2 C 19 0 22 -24 11 -35 C 4 -28 1 -14 2 2 Z", {
            fill: colores.secundario
        })
    );

    // Pétalos laterales envolventes
    g.appendChild(
        crearPathSVG("M 0 3 C -18 2 -19 -20 -13 -32 C -5 -26 2 -12 0 3 Z", {
            fill: colores.principal
        })
    );
    g.appendChild(
        crearPathSVG("M 0 3 C 18 2 19 -20 13 -32 C 5 -26 -2 -12 0 3 Z", {
            fill: colores.principal
        })
    );

    // Pétalo central frontal acampanado
    g.appendChild(
        crearPathSVG("M 0 4 C -13 3 -13 -22 0 -37 C 13 -22 13 3 0 4 Z", {
            fill: colores.luz
        })
    );
    g.appendChild(
        crearPathSVG("M 0 4 C -9 2 -9 -19 0 -33 C 9 -19 9 2 0 4 Z", {
            fill: colores.principal,
            opacity: "0.75"
        })
    );

    return g;
}

/**
 * 2) DIBUJO DE ROSA
 */
function construirCorolaRosa(colores) {
    const g = document.createElementNS(SVG_NS, "g");
    // Desplazamos el centro de la rosa a (0, -16) para que se siente sobre el cáliz
    const rosa = document.createElementNS(SVG_NS, "g");
    rosa.setAttribute("transform", "translate(0, -16)");

    // Sépalos verdes debajo de la corola
    rosa.appendChild(
        crearPathSVG("M -14 10 Q -6 5 0 13 Q 6 5 14 10 Q 5 15 0 17 Q -5 15 -14 10 Z", {
            fill: "#276932"
        })
    );

    // Capa exterior de 5 pétalos anchos redondeados
    for (let i = 0; i < 5; i++) {
        const ang = i * 72;
        rosa.appendChild(
            crearPathSVG("M 0 0 C -15 -6 -16 -22 0 -22 C 16 -22 15 -6 0 0 Z", {
                fill: colores.secundario,
                transform: `rotate(${ang})`
            })
        );
    }

    // Capa intermedia rotada (5 pétalos)
    for (let i = 0; i < 5; i++) {
        const ang = i * 72 + 36;
        rosa.appendChild(
            crearPathSVG("M 0 0 C -12 -5 -13 -17 0 -17 C 13 -17 12 -5 0 0 Z", {
                fill: colores.principal,
                transform: `rotate(${ang})`
            })
        );
    }

    // Capa interior (3 pétalos suaves)
    for (let i = 0; i < 3; i++) {
        const ang = i * 120 + 18;
        rosa.appendChild(
            crearPathSVG("M 0 0 C -9 -4 -10 -12 0 -12 C 10 -12 9 -4 0 0 Z", {
                fill: colores.luz,
                transform: `rotate(${ang})`
            })
        );
    }

    // Espiral central del botón de la rosa
    const boton = document.createElementNS(SVG_NS, "circle");
    boton.setAttribute("r", "5.2");
    boton.setAttribute("fill", colores.centro);
    rosa.appendChild(boton);

    rosa.appendChild(
        crearPathSVG("M -3.5 -1 A 3.8 3.8 0 1 1 3.2 2 A 2.2 2.2 0 1 0 -1.5 -0.5", {
            fill: "none",
            stroke: colores.luz,
            "stroke-width": "1.4",
            "stroke-linecap": "round"
        })
    );

    g.appendChild(rosa);
    return g;
}

/**
 * 3) DIBUJO DE ORQUÍDEA
 */
function construirCorolaOrquidea(colores) {
    const g = document.createElementNS(SVG_NS, "g");
    const orq = document.createElementNS(SVG_NS, "g");
    orq.setAttribute("transform", "translate(0, -18)");

    // 3 Sépalos estilizados (1 superior vertical, 2 inferiores diagonales)
    orq.appendChild(
        crearPathSVG("M 0 0 C -7 -8 -6 -25 0 -28 C 6 -25 7 -8 0 0 Z", {
            fill: colores.secundario
        })
    );
    orq.appendChild(
        crearPathSVG("M 0 0 C -7 -8 -6 -24 0 -26 C 6 -24 7 -8 0 0 Z", {
            fill: colores.secundario,
            transform: "rotate(128)"
        })
    );
    orq.appendChild(
        crearPathSVG("M 0 0 C -7 -8 -6 -24 0 -26 C 6 -24 7 -8 0 0 Z", {
            fill: colores.secundario,
            transform: "rotate(-128)"
        })
    );

    // 2 Pétalos laterales grandes tipo mariposa
    orq.appendChild(
        crearPathSVG("M 0 0 C -12 -14 -27 -13 -26 1 C -25 13 -10 11 0 2 Z", {
            fill: colores.principal
        })
    );
    orq.appendChild(
        crearPathSVG("M 0 0 C 12 -14 27 -13 26 1 C 25 13 10 11 0 2 Z", {
            fill: colores.principal
        })
    );

    // Brillo interior en los pétalos laterales
    orq.appendChild(
        crearPathSVG("M -2 0 C -10 -9 -20 -8 -19 1 C -18 8 -8 7 -2 1 Z", {
            fill: colores.luz,
            opacity: "0.7"
        })
    );
    orq.appendChild(
        crearPathSVG("M 2 0 C 10 -9 20 -8 19 1 C 18 8 8 7 2 1 Z", {
            fill: colores.luz,
            opacity: "0.7"
        })
    );

    // Labelo central (labio inferior característico de la orquídea)
    orq.appendChild(
        crearPathSVG("M 0 1 C -11 5 -14 19 -5 22 C 0 24 0 18 0 18 C 0 18 0 24 5 22 C 14 19 11 5 0 1 Z", {
            fill: colores.centro
        })
    );

    // Columna y motitas del labelo
    const columna = document.createElementNS(SVG_NS, "circle");
    columna.setAttribute("cy", "-1");
    columna.setAttribute("r", "3.2");
    columna.setAttribute("fill", "#fff9d6");
    orq.appendChild(columna);

    for (const [mx, my] of [[-3, 9], [3, 9], [0, 12], [-4, 14], [4, 14]]) {
        const mota = document.createElementNS(SVG_NS, "circle");
        mota.setAttribute("cx", String(mx));
        mota.setAttribute("cy", String(my));
        mota.setAttribute("r", "1");
        mota.setAttribute("fill", "#ffffff");
        mota.setAttribute("opacity", "0.85");
        orq.appendChild(mota);
    }

    g.appendChild(orq);
    return g;
}

/**
 * 4) DIBUJO DE GIRASOL
 */
function construirCorolaGirasol(colores) {
    const g = document.createElementNS(SVG_NS, "g");
    const gir = document.createElementNS(SVG_NS, "g");
    gir.setAttribute("transform", "translate(0, -20)");

    const numPetalos = 14;
    // Corona trasera de pétalos
    for (let i = 0; i < numPetalos; i++) {
        const ang = (360 / numPetalos) * i + 180 / numPetalos;
        gir.appendChild(
            crearPathSVG("M 0 -8 C -4.5 -15 -3.8 -26 0 -29 C 3.8 -26 4.5 -15 0 -8 Z", {
                fill: colores.secundario,
                transform: `rotate(${ang.toFixed(1)})`
            })
        );
    }

    // Corona frontal de pétalos dorados
    for (let i = 0; i < numPetalos; i++) {
        const ang = (360 / numPetalos) * i;
        gir.appendChild(
            crearPathSVG("M 0 -8 C -4.5 -14 -3.8 -25 0 -28 C 3.8 -25 4.5 -14 0 -8 Z", {
                fill: colores.principal,
                transform: `rotate(${ang.toFixed(1)})`
            })
        );
    }

    // Disco central oscuro
    const discoExterior = document.createElementNS(SVG_NS, "circle");
    discoExterior.setAttribute("r", "12.5");
    discoExterior.setAttribute("fill", colores.centro);
    gir.appendChild(discoExterior);

    const discoInterior = document.createElementNS(SVG_NS, "circle");
    discoInterior.setAttribute("r", "9.5");
    discoInterior.setAttribute("fill", "#2e1805");
    gir.appendChild(discoInterior);

    // Semillitas en espiral (filotaxis)
    for (let i = 0; i < 16; i++) {
        const r = 2 + Math.sqrt(i) * 2.1;
        const theta = i * 2.39996; // ángulo áureo
        const sx = (Math.cos(theta) * r).toFixed(1);
        const sy = (Math.sin(theta) * r).toFixed(1);
        const semilla = document.createElementNS(SVG_NS, "circle");
        semilla.setAttribute("cx", sx);
        semilla.setAttribute("cy", sy);
        semilla.setAttribute("r", "0.95");
        semilla.setAttribute("fill", colores.luz);
        semilla.setAttribute("opacity", "0.75");
        gir.appendChild(semilla);
    }

    g.appendChild(gir);
    return g;
}

function crearElementoFlorReceta(receta, pos) {
    const rasgos = obtenerRasgosFlor(receta);

    // Perspectiva: un poco más pequeñas para que quepan muchas más en la pradera
    const tAltura = (pos.y - MARGEN_FLOR_Y_MIN) / (MARGEN_FLOR_Y_MAX - MARGEN_FLOR_Y_MIN);
    const escala = 0.58 + tAltura * 0.36; // de 0.58 (arriba) a 0.94 (abajo)

    const gPos = document.createElementNS(SVG_NS, "g");
    gPos.setAttribute("class", "flor-receta");
    gPos.setAttribute(
        "transform",
        `translate(${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}) scale(${escala.toFixed(2)})`
    );
    gPos.setAttribute("role", "button");
    gPos.setAttribute("tabindex", "0");
    gPos.setAttribute("aria-label", `Carta de ${receta.titulo || receta.id}`);
    gPos.dataset.id = receta.id;
    gPos.dataset.especie = rasgos.especie;

    const nombresEspecie = {
        tulipan: "Tulipán",
        rosa: "Rosa",
        orquidea: "Orquídea",
        girasol: "Girasol"
    };

    const title = document.createElementNS(SVG_NS, "title");
    title.textContent = `${receta.titulo || receta.id} (${nombresEspecie[rasgos.especie]})`;
    gPos.appendChild(title);

    // Grupo con balanceo CSS
    const gMecedora = document.createElementNS(SVG_NS, "g");
    gMecedora.setAttribute("class", "flor-mecedora");
    gMecedora.style.setProperty("--delay-flor", `${rasgos.delay}s`);

    // Grupo que escala al hacer hover/focus
    const gCuerpo = document.createElementNS(SVG_NS, "g");
    gCuerpo.setAttribute("class", "flor-cuerpo");

    const inc = rasgos.inclinacion;

    // Hojas del tallo según la especie
    if (rasgos.especie === "tulipan") {
        // Hojas largas envolventes de tulipán
        gCuerpo.appendChild(
            crearPathSVG(`M 0 -4 C -18 -14 -20 -36 -8 -48 C -4 -34 -3 -16 0 -4 Z`, {
                fill: "#2b7a38"
            })
        );
        gCuerpo.appendChild(
            crearPathSVG(`M 0 -2 C 18 -12 22 -32 10 -44 C 5 -30 3 -14 0 -2 Z`, {
                fill: "#368f45"
            })
        );
    } else {
        // Hojas laterales clásicas en el tallo
        gCuerpo.appendChild(
            crearPathSVG(`M ${(inc * 0.35).toFixed(1)} -22 C -18 -26 -22 -38 -8 -36 C -2 -35 0 -27 ${(inc * 0.35).toFixed(1)} -22 Z`, {
                fill: "#2b7a38"
            })
        );
        gCuerpo.appendChild(
            crearPathSVG(`M ${(inc * 0.55).toFixed(1)} -32 C 18 -36 22 -48 8 -46 C 2 -45 0 -37 ${(inc * 0.55).toFixed(1)} -32 Z`, {
                fill: "#368f45"
            })
        );
    }

    // Tallo principal
    gCuerpo.appendChild(
        crearPathSVG(`M 0 0 Q ${(inc * 0.45).toFixed(1)} -30 ${inc.toFixed(1)} -58`, {
            stroke: "#256e31",
            "stroke-width": "3.4",
            "stroke-linecap": "round",
            fill: "none"
        })
    );

    // Corola en la punta del tallo (inc, -58)
    const gCorola = document.createElementNS(SVG_NS, "g");
    gCorola.setAttribute("transform", `translate(${inc.toFixed(1)}, -58)`);

    if (rasgos.especie === "tulipan") {
        gCorola.appendChild(construirCorolaTulipan(rasgos.colores));
    } else if (rasgos.especie === "rosa") {
        gCorola.appendChild(construirCorolaRosa(rasgos.colores));
    } else if (rasgos.especie === "orquidea") {
        gCorola.appendChild(construirCorolaOrquidea(rasgos.colores));
    } else {
        gCorola.appendChild(construirCorolaGirasol(rasgos.colores));
    }

    gCuerpo.appendChild(gCorola);

    // Área de toque invisible amplia (>= 44px) sobre la flor y su tallo
    const areaToque = document.createElementNS(SVG_NS, "circle");
    areaToque.setAttribute("cx", inc.toFixed(1));
    areaToque.setAttribute("cy", "-64");
    areaToque.setAttribute("r", "32");
    areaToque.setAttribute("fill", "transparent");
    gCuerpo.appendChild(areaToque);

    gMecedora.appendChild(gCuerpo);
    gPos.appendChild(gMecedora);

    const activar = () => {
        abrirModal(receta, "carta");
    };

    gPos.addEventListener("click", activar);
    gPos.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            activar();
        }
    });

    return gPos;
}

// --------------------------------------------------------------------------
// 4. Transición entre Noche y Campo de día:
//    - Click en montañas (noche): la luna baja y se oculta -> amanece en el campo
//    - Click en el sol (campo): el sol se oculta detrás de las colinas -> sube al cielo nocturno
// --------------------------------------------------------------------------
function configurarCambioEscena() {
    const escenaNoche = document.getElementById("escena-noche");
    const escenaCampo = document.getElementById("escena-campo");
    const navIrCampo = document.getElementById("nav-ir-campo");
    const navIrNoche = document.getElementById("nav-ir-noche");
    if (!escenaNoche || !escenaCampo) return;

    let enTransicion = false;

    function aplicarEscena(nombre) {
        const esCampo = nombre === "campo";
        escenaNoche.classList.remove("ocultando-luna");
        escenaCampo.classList.remove("ocultando-sol");
        escenaNoche.classList.toggle("activa", !esCampo);
        escenaCampo.classList.toggle("activa", esCampo);
    }

    function leerHash() {
        return window.location.hash === "#campo" ? "campo" : "noche";
    }

    function transicionarACampo() {
        if (enTransicion || leerHash() === "campo") return;
        enTransicion = true;
        // Primero se oculta la luna bajando hacia las montañas
        escenaNoche.classList.add("ocultando-luna");
        setTimeout(() => {
            window.location.hash = "#campo";
            enTransicion = false;
        }, 420);
    }

    function transicionarANoche() {
        if (enTransicion || leerHash() === "noche") return;
        enTransicion = true;
        // Primero el sol se oculta detrás de las montañas y luego sube al cielo nocturno
        escenaCampo.classList.add("ocultando-sol");
        setTimeout(() => {
            window.location.hash = "#noche";
            enTransicion = false;
        }, 460);
    }

    if (navIrCampo) {
        navIrCampo.addEventListener("click", transicionarACampo);
        navIrCampo.addEventListener("keydown", e => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                transicionarACampo();
            }
        });
    }

    if (navIrNoche) {
        navIrNoche.addEventListener("click", transicionarANoche);
        navIrNoche.addEventListener("keydown", e => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                transicionarANoche();
            }
        });
    }

    window.addEventListener("hashchange", () => {
        aplicarEscena(leerHash());
    });

    aplicarEscena(leerHash());
}

// --------------------------------------------------------------------------
// 5. Paso 3.4: Modal compartido + Cifrado César ROT1 + Pista del JSON
// --------------------------------------------------------------------------
const STORAGE_KEY_DESBLOQUEADAS = "recetario_desbloqueadas_v1";

function obtenerRecetasDesbloqueadas() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_DESBLOQUEADAS);
        const arr = raw ? JSON.parse(raw) : [];
        return new Set(Array.isArray(arr) ? arr : []);
    } catch {
        return new Set();
    }
}

function claveDesbloqueo(receta) {
    const cifrado = normalizarFrase(
        receta.contraseña ?? receta.contrasena ?? receta.password ?? ""
    );
    return `${receta.id}::${cifrado}`;
}

function guardarRecetaDesbloqueada(receta) {
    try {
        const set = obtenerRecetasDesbloqueadas();
        set.add(claveDesbloqueo(receta));
        localStorage.setItem(STORAGE_KEY_DESBLOQUEADAS, JSON.stringify([...set]));
    } catch {
        // Ignorar si el navegador bloquea localStorage
    }
}

const ALFABETO_ES = "abcdefghijklmnñopqrstuvwxyz";
const ALFABETO_EN = "abcdefghijklmnopqrstuvwxyz";

/**
 * Normaliza un texto: minúsculas, quita tildes de vocales (áéíóúü -> aeiouu)
 * pero CONSERVA la letra 'ñ', y colapsa espacios múltiples.
 */
function normalizarFrase(texto) {
    return String(texto || "")
        .trim()
        .toLowerCase()
        .replace(/[áàäâ]/g, "a")
        .replace(/[éèëê]/g, "e")
        .replace(/[íìïî]/g, "i")
        .replace(/[óòöô]/g, "o")
        .replace(/[úùüû]/g, "u")
        .replace(/\s+/g, " ");
}

/**
 * Aplica Cifrado César ROT1 con un alfabeto dado (por defecto el español de 27 letras: a..n->ñ->o..z->a).
 * Así "tu sonrisa" se cifra como "uv tpñsjtb".
 */
function cifrarROT1ConAlfabeto(frase, alfabeto = ALFABETO_ES) {
    const limpio = normalizarFrase(frase);
    const total = alfabeto.length;
    let resultado = "";

    for (let i = 0; i < limpio.length; i++) {
        const ch = limpio[i];
        const idx = alfabeto.indexOf(ch);
        if (idx !== -1) {
            resultado += alfabeto[(idx + 1) % total];
        } else if (ch >= "0" && ch <= "9") {
            const siguienteNum = ((ch.charCodeAt(0) - 48 + 1) % 10) + 48;
            resultado += String.fromCharCode(siguienteNum);
        } else {
            resultado += ch;
        }
    }

    return resultado;
}

function cifrarROT1(frase) {
    return cifrarROT1ConAlfabeto(frase, ALFABETO_ES);
}

window.cifrarROT1 = cifrarROT1;

/**
 * Verifica si la frase que escribió ella coincide con el texto cifrado ROT1 del JSON.
 * Acepta tanto ROT1 con abecedario español (27 letras, con 'ñ': n->ñ)
 * como abecedario sin 'ñ' (26 letras: n->o).
 */
function verificarPasswordROT1(fraseIngresada, cifradoEnJson) {
    const objetivo = normalizarFrase(cifradoEnJson);
    if (!objetivo) return true;

    const cifradoEs = cifrarROT1ConAlfabeto(fraseIngresada, ALFABETO_ES);
    const cifradoEn = cifrarROT1ConAlfabeto(fraseIngresada.replace(/ñ/g, "n"), ALFABETO_EN);

    return cifradoEs === objetivo || cifradoEn === objetivo;
}

let estadoModalActual = {
    receta: null,
    modo: "receta" // "receta" | "carta"
};

const MENSAJES_ERROR_TIERNOS = [
    "Casi, mi amor... lee la pista e inténtalo otra vez.",
    "Esa no es la frase secreta... piensa un poquito más.",
    "Todavía no se abre... tú sabes la respuesta."
];

function construirCorolaPorEspecie(especie, colores) {
    if (especie === "tulipan") return construirCorolaTulipan(colores);
    if (especie === "rosa") return construirCorolaRosa(colores);
    if (especie === "orquidea") return construirCorolaOrquidea(colores);
    return construirCorolaGirasol(colores);
}

/**
 * Dibuja un arreglo floral que abraza literalmente el borde de la esquina
 * superior izquierda de la tarjeta del modal.
 * En el viewBox (-55 -55 220 220), el vértice de la esquina de la tarjeta está cerca de (0, 0),
 * el borde superior corre hacia la derecha (+X) y el borde izquierdo baja hacia (+Y).
 */
function renderizarBuqueModal(rasgos) {
    const svgBuque = document.getElementById("modal-buque-svg");
    if (!svgBuque) return;

    const { especie, colores } = rasgos;
    const frag = document.createDocumentFragment();

    // 1. Ramas/tallos curvos que abrazan el borde superior (hacia +X) y el borde izquierdo (hacia +Y)
    const ramas = [
        "M -6 105 Q -12 45 4 4 Q 45 -12 118 -4",
        "M 4 82 Q -4 35 12 10 Q 52 -4 96 6"
    ];
    for (const d of ramas) {
        frag.appendChild(
            crearPathSVG(d, {
                stroke: "#23632d",
                "stroke-width": "3.6",
                "stroke-linecap": "round",
                fill: "none"
            })
        );
    }

    // 2. Hojas verdes repartidas a lo largo de ambos bordes de la esquina
    const hojas = [
        // Hojas hacia el borde superior
        { d: "M 18 -2 C 24 -22 48 -26 56 -10 C 42 -2 26 2 18 -2 Z", fill: "#2b7a38" },
        { d: "M 48 -4 C 60 -20 82 -22 92 -8 C 76 0 60 0 48 -4 Z", fill: "#368f45" },
        { d: "M 78 0 C 94 -14 116 -14 126 -2 C 110 6 92 4 78 0 Z", fill: "#2b7a38" },
        { d: "M 32 4 C 42 18 64 20 74 8 C 60 0 44 0 32 4 Z", fill: "#256e31" },
        // Hojas hacia el borde izquierdo
        { d: "M -2 18 C -22 24 -26 48 -10 56 C -2 42 2 26 -2 18 Z", fill: "#2b7a38" },
        { d: "M -4 48 C -20 60 -22 82 -8 92 C 0 76 0 60 -4 48 Z", fill: "#368f45" },
        { d: "M 0 78 C -14 94 -14 116 -2 126 C 6 110 4 92 0 78 Z", fill: "#2b7a38" },
        { d: "M 4 32 C 18 42 20 64 8 74 C 0 60 0 44 4 32 Z", fill: "#256e31" },
        // Hojas en el vértice exterior de la esquina
        { d: "M 2 2 C -24 -8 -36 -28 -26 -36 C -8 -28 -2 -10 2 2 Z", fill: "#368f45" },
        { d: "M 2 2 C -8 -24 -28 -36 -36 -26 C -28 -8 -10 -2 2 2 Z", fill: "#2b7a38" }
    ];
    for (const h of hojas) {
        frag.appendChild(crearPathSVG(h.d, { fill: h.fill }));
    }

    // 3. Flores dispuestas abrazando la esquina en "L" curva:
    //    - Extremos del borde superior e izquierdo (más pequeñas)
    //    - Intermedias sobre cada borde
    //    - Flor protagonista justo en el vértice de la esquina superior izquierda
    // Nota: cada construirCorola... dibuja su flor alrededor de (0, -18),
    // así que compensamos para que el centro visual de la flor quede en (x, y).
    const floresEsquina = [
        { x: 102, y: -4, rot: 72, esc: 0.62 },  // Extremo derecho sobre el borde superior
        { x: -4, y: 102, rot: -162, esc: 0.62 }, // Extremo inferior sobre el borde izquierdo
        { x: 56, y: -6, rot: 35, esc: 0.78 },   // Media sobre el borde superior
        { x: -6, y: 56, rot: -125, esc: 0.78 }, // Media sobre el borde izquierdo
        { x: 24, y: -6, rot: 12, esc: 0.86 },   // Cerca del vértice (arriba)
        { x: -6, y: 24, rot: -102, esc: 0.86 }, // Cerca del vértice (izquierda)
        { x: 4, y: 4, rot: -45, esc: 1.05 }     // Flor principal en la mera esquina
    ];

    for (const p of floresEsquina) {
        const gFlor = document.createElementNS(SVG_NS, "g");
        gFlor.setAttribute(
            "transform",
            `translate(${p.x}, ${p.y}) rotate(${p.rot}) scale(${p.esc}) translate(0, 18)`
        );
        gFlor.appendChild(construirCorolaPorEspecie(especie, colores));
        frag.appendChild(gFlor);
    }

    svgBuque.replaceChildren(frag);
}

/**
 * Dibuja un marco de constelación cuadrado (de líneas rectas y esquinas a 90°)
 * alrededor de los 4 bordes de la tarjeta del modal (modo Receta).
 */
function renderizarConstelacionModal(receta) {
    const svgConst = document.getElementById("modal-constelacion-svg");
    const tarjeta = document.getElementById("modal-tarjeta");
    if (!svgConst || !tarjeta) return;

    // Medimos la tarjeta para que el SVG tenga proporción 1:1 real y las estrellas no se deformen
    const W = Math.max(320, tarjeta.offsetWidth || 460);
    const H = Math.max(240, tarjeta.offsetHeight || 300);
    const pad = 18; // coincide con inset: -18px
    svgConst.setAttribute("viewBox", `${-pad} ${-pad} ${W + pad * 2} ${H + pad * 2}`);

    const rand = crearPRNG(hashTexto(`constelacion:${receta.id}`));
    const rasgosEst = obtenerRasgosEstrella(receta);
    const frag = document.createDocumentFragment();

    // Marco exterior recto (a 6px afuera del borde de la tarjeta) y marco interior sobre el borde (0..W, 0..H)
    const m = -6;
    const x0 = m;
    const y0 = m;
    const x1 = W - m;
    const y1 = H - m;

    // 1) Las 4 líneas rectas que forman el marco cuadrado de la constelación
    const ladosRectos = [
        [x0, y0, x1, y0], // Arriba
        [x1, y0, x1, y1], // Derecha
        [x1, y1, x0, y1], // Abajo
        [x0, y1, x0, y0]  // Izquierda
    ];

    for (const [lx1, ly1, lx2, ly2] of ladosRectos) {
        const linea = document.createElementNS(SVG_NS, "line");
        linea.setAttribute("class", "constelacion-linea");
        linea.setAttribute("x1", lx1.toFixed(1));
        linea.setAttribute("y1", ly1.toFixed(1));
        linea.setAttribute("x2", lx2.toFixed(1));
        linea.setAttribute("y2", ly2.toFixed(1));
        frag.appendChild(linea);
    }

    // 2) Escuadras / detalles rectos en las 4 esquinas para acentuar la forma cuadrada
    const largoEsquina = 28;
    const dInt = 6; // línea interior paralela en cada esquina
    const esquinasInternas = [
        // Superior izquierda
        [dInt, dInt + largoEsquina, dInt, dInt, dInt + largoEsquina, dInt],
        // Superior derecha
        [W - dInt - largoEsquina, dInt, W - dInt, dInt, W - dInt, dInt + largoEsquina],
        // Inferior derecha
        [W - dInt, H - dInt - largoEsquina, W - dInt, H - dInt, W - dInt - largoEsquina, H - dInt],
        // Inferior izquierda
        [dInt + largoEsquina, H - dInt, dInt, H - dInt, dInt, H - dInt - largoEsquina]
    ];

    for (const [ax, ay, bx, by, cx, cy] of esquinasInternas) {
        const poli = document.createElementNS(SVG_NS, "polyline");
        poli.setAttribute("class", "constelacion-linea-secundaria");
        poli.setAttribute("points", `${ax},${ay} ${bx},${by} ${cx},${cy}`);
        frag.appendChild(poli);
    }

    // 3) Estrellas colocadas exactamente sobre las 4 líneas rectas del marco cuadrado
    const nodos = [
        // Las 4 esquinas principales (siempre estrellas de 4 puntas)
        { x: x0, y: y0, principal: true, escala: 1.15 },
        { x: x1, y: y0, principal: true, escala: 1.15 },
        { x: x1, y: y1, principal: true, escala: 1.15 },
        { x: x0, y: y1, principal: true, escala: 1.15 }
    ];

    // Estrellas alineadas sobre los lados horizontales (arriba y abajo)
    const numHoriz = 5;
    for (let i = 1; i <= numHoriz; i++) {
        const t = (i / (numHoriz + 1)) + (rand() - 0.5) * 0.06;
        nodos.push({
            x: x0 + t * (x1 - x0),
            y: y0,
            principal: i % 2 === 1,
            escala: 0.85
        });
        nodos.push({
            x: x0 + (1 - t) * (x1 - x0),
            y: y1,
            principal: i % 2 === 1,
            escala: 0.85
        });
    }

    // Estrellas alineadas sobre los lados verticales (izquierda y derecha)
    const numVert = 3;
    for (let i = 1; i <= numVert; i++) {
        const t = (i / (numVert + 1)) + (rand() - 0.5) * 0.06;
        nodos.push({
            x: x1,
            y: y0 + t * (y1 - y0),
            principal: i === 2,
            escala: 0.85
        });
        nodos.push({
            x: x0,
            y: y0 + (1 - t) * (y1 - y0),
            principal: i === 2,
            escala: 0.85
        });
    }

    for (const n of nodos) {
        const gEst = document.createElementNS(SVG_NS, "g");
        gEst.setAttribute("class", "constelacion-estrella");
        gEst.setAttribute(
            "transform",
            `translate(${n.x.toFixed(1)}, ${n.y.toFixed(1)}) scale(${(n.escala || 1).toFixed(2)})`
        );
        gEst.style.animationDelay = `${(-rand() * 4).toFixed(2)}s`;

        if (n.principal) {
            const destello = document.createElementNS(SVG_NS, "path");
            destello.setAttribute("d", crearPathDestello4Puntas(7.5, 1.8));
            destello.setAttribute("fill", rasgosEst.principal);
            gEst.appendChild(destello);
        } else {
            const punto = document.createElementNS(SVG_NS, "circle");
            punto.setAttribute("r", "2.6");
            punto.setAttribute("fill", rasgosEst.tinte);
            gEst.appendChild(punto);
        }

        frag.appendChild(gEst);
    }

    svgConst.replaceChildren(frag);
}

function renderizarContenidoDesbloqueado(receta, modo) {
    const vistaLock = document.getElementById("modal-vista-lock");
    const vistaReceta = document.getElementById("modal-vista-receta");
    const vistaCarta = document.getElementById("modal-vista-carta");

    if (vistaLock) vistaLock.hidden = true;

    if (modo === "receta") {
        if (vistaCarta) vistaCarta.hidden = true;
        if (vistaReceta) vistaReceta.hidden = false;

        const ulIng = document.getElementById("modal-lista-ingredientes");
        const olPasos = document.getElementById("modal-lista-pasos");

        if (ulIng) {
            const fragIng = document.createDocumentFragment();
            const listaIng = (receta.receta && receta.receta.ingredientes) || [];
            for (const item of listaIng) {
                const li = document.createElement("li");
                li.textContent = item;
                fragIng.appendChild(li);
            }
            ulIng.replaceChildren(fragIng);
        }

        if (olPasos) {
            const fragPasos = document.createDocumentFragment();
            const listaPasos = (receta.receta && receta.receta.pasos) || [];
            for (const paso of listaPasos) {
                const li = document.createElement("li");
                li.textContent = paso;
                fragPasos.appendChild(li);
            }
            olPasos.replaceChildren(fragPasos);
        }

        requestAnimationFrame(() => renderizarConstelacionModal(receta));
    } else {
        if (vistaReceta) vistaReceta.hidden = true;
        if (vistaCarta) vistaCarta.hidden = false;

        const pCarta = document.getElementById("modal-texto-carta");
        if (pCarta) {
            pCarta.textContent = Array.isArray(receta.carta)
                ? receta.carta.join("\n\n")
                : String(receta.carta || "");
        }
    }
}

function abrirModal(receta, modo) {
    const overlay = document.getElementById("modal-overlay");
    const tarjeta = document.getElementById("modal-tarjeta");
    const buque = document.getElementById("modal-buque");
    const constelacion = document.getElementById("modal-constelacion");
    const titulo = document.getElementById("modal-titulo");
    const vistaLock = document.getElementById("modal-vista-lock");
    const vistaReceta = document.getElementById("modal-vista-receta");
    const vistaCarta = document.getElementById("modal-vista-carta");
    const cajaPista = document.getElementById("modal-caja-pista");
    const textoPista = document.getElementById("modal-texto-pista");
    const inputPass = document.getElementById("modal-input-password");
    const errorEl = document.getElementById("modal-error");

    if (!overlay || !tarjeta) return;

    estadoModalActual = { receta, modo };

    const esCarta = modo === "carta";
    tarjeta.classList.toggle("modo-carta", esCarta);
    tarjeta.classList.remove("sacudir");

    if (esCarta) {
        // Modo Carta: colores de la flor + flores abrazando la esquina superior izquierda
        const rasgos = obtenerRasgosFlor(receta);
        tarjeta.style.setProperty("--flor-principal", rasgos.colores.principal);
        tarjeta.style.setProperty("--flor-secundario", rasgos.colores.secundario);
        tarjeta.style.setProperty("--flor-luz", rasgos.colores.luz);
        tarjeta.style.setProperty("--flor-centro", rasgos.colores.centro);

        renderizarBuqueModal(rasgos);
        if (buque) buque.hidden = false;
        if (constelacion) constelacion.hidden = true;
    } else {
        // Modo Receta: toma el matiz sutil de la estrella y rodea el marco con su constelación
        const rasgosEst = obtenerRasgosEstrella(receta);
        tarjeta.style.setProperty("--estrella-principal", rasgosEst.principal);
        tarjeta.style.setProperty("--estrella-tinte", rasgosEst.tinte);
        tarjeta.style.setProperty("--estrella-acento", rasgosEst.acento);

        if (buque) buque.hidden = true;
        if (constelacion) constelacion.hidden = false;
    }

    if (titulo) {
        titulo.textContent = receta.titulo || receta.id;
    }

    // Tanto la Receta (estrella) como la Carta (flor) piden siempre la contraseña cifrada del JSON
    const cifradoJson = receta.contraseña ?? receta.contrasena ?? receta.password ?? "";
    const tienePassword = Boolean(String(cifradoJson).trim());

    if (!tienePassword) {
        renderizarContenidoDesbloqueado(receta, modo);
    } else {
        if (vistaLock) vistaLock.hidden = false;
        if (vistaReceta) vistaReceta.hidden = true;
        if (vistaCarta) vistaCarta.hidden = true;

        // Mostramos el campo "pista" que viene del JSON
        const pistaTexto = (receta.pista || "").trim();
        if (cajaPista && textoPista) {
            textoPista.textContent = pistaTexto || "Sin pista";
            cajaPista.hidden = !pistaTexto;
        }

        if (errorEl) {
            errorEl.hidden = true;
            errorEl.textContent = "";
        }

        if (inputPass) {
            inputPass.value = "";
            setTimeout(() => inputPass.focus(), 60);
        }
    }

    overlay.hidden = false;

    if (!esCarta) {
        renderizarConstelacionModal(receta);
    }
}

function cerrarModal() {
    const overlay = document.getElementById("modal-overlay");
    if (overlay) overlay.hidden = true;
}

function configurarModal() {
    const overlay = document.getElementById("modal-overlay");
    const tarjeta = document.getElementById("modal-tarjeta");
    const btnCerrar = document.getElementById("modal-cerrar");
    const form = document.getElementById("modal-form-password");
    const inputPass = document.getElementById("modal-input-password");
    const btnVer = document.getElementById("modal-btn-ver");
    const errorEl = document.getElementById("modal-error");

    if (!overlay || !tarjeta) return;

    if (btnCerrar) {
        btnCerrar.addEventListener("click", cerrarModal);
    }

    // Cerrar al hacer click fuera de la tarjeta
    overlay.addEventListener("click", e => {
        if (e.target === overlay) cerrarModal();
    });

    // Cerrar con Escape
    window.addEventListener("keydown", e => {
        if (e.key === "Escape" && !overlay.hidden) {
            cerrarModal();
        }
    });

    // Validación de la contraseña con Cifrado César ROT1
    if (form && inputPass) {
        form.addEventListener("submit", e => {
            e.preventDefault();
            const { receta, modo } = estadoModalActual;
            if (!receta) return;

            const cifradoJson = receta.contraseña ?? receta.contrasena ?? receta.password ?? "";
            const esCorrecta = verificarPasswordROT1(inputPass.value, cifradoJson);

            if (esCorrecta) {
                guardarRecetaDesbloqueada(receta);
                renderizarContenidoDesbloqueado(receta, modo);
            } else {
                // Sacudida suave y mensaje tierno
                tarjeta.classList.remove("sacudir");
                void tarjeta.offsetWidth; // Reinicia la animación CSS
                tarjeta.classList.add("sacudir");

                if (errorEl) {
                    const msg =
                        MENSAJES_ERROR_TIERNOS[
                            Math.floor(Math.random() * MENSAJES_ERROR_TIERNOS.length)
                        ];
                    errorEl.textContent = msg;
                    errorEl.hidden = false;
                }
                inputPass.select();
            }
        });
    }
}

// --------------------------------------------------------------------------
// 6. Carga de recetas desde recetas/index.json
// --------------------------------------------------------------------------
async function cargarRecetas() {
    try {
        const respIndex = await fetch("recetas/index.json", { cache: "no-cache" });
        if (!respIndex.ok) throw new Error("No se pudo leer recetas/index.json");
        const listaArchivos = await respIndex.json();

        const promesas = listaArchivos.map(async nombre => {
            const archivo = nombre.endsWith(".json") ? nombre : `${nombre}.json`;
            const resp = await fetch(`recetas/${archivo}`, { cache: "no-cache" });
            if (!resp.ok) throw new Error(`No se encontró recetas/${archivo}`);
            return resp.json();
        });

        const resultados = await Promise.allSettled(promesas);
        return resultados
            .filter(r => r.status === "fulfilled" && r.value && r.value.id)
            .map(r => r.value);
    } catch (err) {
        console.error("Error cargando recetas:", err);
        return [];
    }
}

async function iniciarApp() {
    actualizarEscalaPantallas();
    renderizarEstrellasFondo();
    renderizarFloresMontanasNoche();
    renderizarPaisajeCampo();
    configurarCambioEscena();
    configurarModal();

    const capaEstrellasReceta = document.getElementById("capa-estrellas-receta");
    const capaFloresReceta = document.getElementById("capa-flores-receta");

    const recetas = await cargarRecetas();

    // 1) Renderizar 1 estrella por cada JSON en la Noche
    if (capaEstrellasReceta) {
        const posicionesEstrellas = [];
        const fragEstrellas = document.createDocumentFragment();

        for (const receta of recetas) {
            const pos = calcularPosicionEstrella(receta.id, posicionesEstrellas);
            posicionesEstrellas.push(pos);
            fragEstrellas.appendChild(crearElementoEstrellaReceta(receta, pos));
        }
        capaEstrellasReceta.replaceChildren(fragEstrellas);
    }

    // 2) Renderizar 1 flor por cada JSON en el Campo (ordenadas por 'y' para perspectiva)
    if (capaFloresReceta) {
        const posicionesFlores = [];
        const listaFlores = [];

        for (const receta of recetas) {
            const pos = calcularPosicionFlor(receta.id, posicionesFlores);
            posicionesFlores.push(pos);
            listaFlores.push({ receta, pos });
        }

        // Las de más abajo (mayor 'y') se dibujan al final (encima y más grandes)
        listaFlores.sort((a, b) => a.pos.y - b.pos.y);

        const fragFlores = document.createDocumentFragment();
        for (const item of listaFlores) {
            fragFlores.appendChild(crearElementoFlorReceta(item.receta, item.pos));
        }
        capaFloresReceta.replaceChildren(fragFlores);
    }
}

iniciarApp();
