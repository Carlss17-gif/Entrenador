let datos = [];
let empleadoActual = null;

window.onload = () => {
  cargarEmpleados();
};

async function cargarEmpleados() {
  const sesion = JSON.parse(localStorage.getItem("sesion_entrenador")) || {};
  const nombreEntrenador = sesion.nombre || '';

  const { data: empleados, error: err1 } = await mysupabase
    .from("empleados")
    .select("nombre")
    .eq("entrenador", nombreEntrenador);

  if (err1) { console.error(err1); return; }

  const nombres = empleados.map(e => e.nombre);

  if (nombres.length === 0) {
    console.warn("Este entrenador no tiene empleados asignados");
    return;
  }

  const { data, error: err2 } = await mysupabase
    .from("resultados_examen")
    .select("*")
    .in("nombre", nombres);

  if (err2) { console.error(err2); return; }

  datos = data;

  const nombresUnicos = [...new Set(data.map(d => d.nombre))];
  const select = document.getElementById("empleadoSelect");
  select.innerHTML = `<option value="">Selecciona empleado</option>`;

  nombresUnicos.forEach(nombre => {
    const option = document.createElement("option");
    option.value = nombre;
    option.textContent = nombre;
    select.appendChild(option);
  });

  select.onchange = (e) => seleccionarEmpleado(e.target.value);
}

function seleccionarEmpleado(nombre) {
  empleadoActual = datos.filter(d => d.nombre === nombre);
  generarGrafica();
  generarBotonesAreas();
}

function procesarDatos() {
  const areasMap = {};
  empleadoActual.forEach(r => {
    areasMap[r.area] = (areasMap[r.area] || 0) + r.correctas;
  });
  const ordenado = Object.entries(areasMap).sort((a, b) => b[1] - a[1]);
  return {
    labels: ordenado.map(e => e[0]),
    valores: ordenado.map(e => e[1])
  };
}

function dibujarBarras(data) {
  const { labels, valores } = data;
  const canvas = document.getElementById("graficaBarra");
  const ctx    = canvas.getContext("2d");

  canvas.width  = canvas.offsetWidth  || 600;
  canvas.height = canvas.offsetHeight || 250;

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const max          = Math.max(...valores, 1);
  const barWidth     = w / valores.length;
  const paddingBottom = 30;

  valores.forEach((v, i) => {
    const barHeight = (v / max) * (h - paddingBottom - 10);

    ctx.fillStyle = `hsl(${i * 40}, 70%, 60%)`;
    ctx.fillRect(i * barWidth + 2, h - paddingBottom - barHeight, barWidth - 6, barHeight);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "center";
    ctx.fillText(v, i * barWidth + barWidth / 2, h - paddingBottom - barHeight - 4);

    ctx.fillStyle = "#aaa";
    ctx.font = "9px Arial";
    ctx.textAlign = "center";
    const label = labels[i].length > 12 ? labels[i].substring(0, 12) + "…" : labels[i];
    ctx.fillText(label, i * barWidth + barWidth / 2, h - 8);
  });
}

function dibujarPastel(areaSeleccionada) {
  const cardPastel = document.getElementById("cardPastel");

  if (!areaSeleccionada) { cardPastel.style.display = "none"; return; }

  cardPastel.style.display = "flex";

  setTimeout(() => {
    const canvas = document.getElementById("graficaPastel");
    const ctx    = canvas.getContext("2d");

    canvas.width  = canvas.offsetWidth  || 300;
    canvas.height = canvas.offsetHeight || 250;

    const w = canvas.width;
    const h = canvas.height;
    if (w === 0 || h === 0) return;
    ctx.clearRect(0, 0, w, h);

    const datosArea = empleadoActual.filter(r => r.area === areaSeleccionada);
    let correctas = 0, total = 0;
    datosArea.forEach(r => { correctas += r.correctas; total += r.total; });

    const malas    = total - correctas;
    const valores  = [correctas, malas];
    const etiquetas = ["Correctas", "Incorrectas"];
    const colores  = ["#ffde21", "#ef4444"];

    const cx = w / 2;
    const cy = (h - 30) / 2;
    const radio = Math.min(w, h - 30) / 2 - 15;
    let startAngle = -Math.PI / 2;

    valores.forEach((v, i) => {
      const sliceAngle = (v / total) * 2 * Math.PI;
      const midAngle   = startAngle + sliceAngle / 2;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radio, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = colores[i];
      ctx.fill();

      const pct = Math.round((v / total) * 100);
      const lx  = cx + (radio * 0.6) * Math.cos(midAngle);
      const ly  = cy + (radio * 0.6) * Math.sin(midAngle);

      ctx.fillStyle = "#fff";
      ctx.font = "bold 13px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${pct}%`, lx, ly);

      startAngle += sliceAngle;
    });

    const legendY    = h - 10;
    const totalLey   = 140;
    let lx = cx - totalLey / 2;
    etiquetas.forEach((label, i) => {
      ctx.fillStyle = colores[i];
      ctx.fillRect(lx, legendY - 12, 12, 12);
      ctx.fillStyle = "#fff";
      ctx.font = "11px Arial";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(label, lx + 16, legendY - 6);
      lx += 80;
    });
  }, 50);
}

function generarGrafica() {
  setTimeout(() => { const data = procesarDatos(); dibujarBarras(data); }, 50);
}


function generarBotonesAreas() {
  const select = document.getElementById("areaSelect");
  select.innerHTML = `<option value="">Área</option>`;

  document.getElementById("cardPastel").style.display = "none";
  document.getElementById("tituloExamen").innerText   = "";
  document.getElementById("detalleExamen").innerHTML  = "";

  const areasUnicas = [...new Set(empleadoActual.map(r => r.area))];
  areasUnicas.forEach(area => {
    const option = document.createElement("option");
    option.value = area;
    option.textContent = area;
    select.appendChild(option);
  });

  select.onchange = (e) => {
    const area = e.target.value;
    dibujarPastel(area);
    if (area) {
      const registro = empleadoActual.find(r => r.area === area);
      if (registro) verExamen(registro);
    } else {
      document.getElementById("tituloExamen").innerText  = "";
      document.getElementById("detalleExamen").innerHTML = "";
    }
  };
}

async function verExamen(registro) {
  document.getElementById("tituloExamen").innerText = "Área: " + registro.area;

  const res      = await fetch("examenes.json");
  const examenes = await res.json();
  const examenBase = examenes[registro.examen];

  const cont = document.getElementById("detalleExamen");
  cont.innerHTML = "";

  examenBase.preguntas.forEach((p, i) => {
    const div = document.createElement("div");
    let respuestaUsuario = registro.respuestas[i];
    let correcta = "";

    if (p.tipo === "opcion") {
      correcta         = p.opciones[p.correcta];
      respuestaUsuario = p.opciones[respuestaUsuario] || "Sin responder";
    } else {
      correcta = "Respuesta abierta";
    }

    const esCorrecta = respuestaUsuario === correcta;

    div.innerHTML = `
      <div class="pregunta">
        <b>${i + 1}. ${p.texto}</b><br><br>
        <span class="${esCorrecta ? 'correcta' : 'incorrecta'}">Tu respuesta: ${respuestaUsuario}</span><br>
        <span class="correcta">Correcta: ${correcta}</span>
      </div>
    `;
    cont.appendChild(div);
  });
}

function irAHabilidades() {
  window.location.href = "habilidades.html";
}
