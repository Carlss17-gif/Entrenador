let examenesData = {};
let estacionActual = '';
let nombreEmpleado = '';

window.onload = () => {
  const empleado = JSON.parse(localStorage.getItem("empleado")) || {};
  nombreEmpleado = empleado.nombre || '';

  fetch('habilidades.json')
    .then(r => r.json())
    .then(data => {
      examenesData = data;
      poblarSelector();
    })
    .catch(() => {
      document.getElementById('contenido').innerHTML =
        '<div id="sinSeleccion">Error al cargar habilidades.json.</div>';
    });
};

function poblarSelector() {
  const sel = document.getElementById('selectEstacion');
  sel.innerHTML = '<option value="">— Elige una estación —</option>';

  Object.entries(examenesData).forEach(([key, val]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = val.area;
    sel.appendChild(opt);
  });

  sel.onchange = () => {
    estacionActual = sel.value;
    renderHabilidades();
  };
}

function renderHabilidades() {
  const cont = document.getElementById('contenido');

  if (!estacionActual) {
    cont.innerHTML = '<div id="sinSeleccion">Selecciona una estación para comenzar.</div>';
    return;
  }

  const examen = examenesData[estacionActual];

  let html = `
    <div class="examen-header">
      <h2>${examen.area}</h2>
      <span class="badge-puntaje">Pasar: ${examen.puntaje_aprobar} / ${examen.habilidades.length}</span>
    </div>
  `;

  examen.habilidades.forEach((hab, i) => {
    html += `
      <div class="habilidad-row" id="row-${i}">
        <div class="habilidad-numero">${i + 1}</div>
        <div class="habilidad-texto">${hab}</div>
        <div class="habilidad-btns">
          <button class="hab-btn" id="btn-cumple-${i}" onclick="seleccionar(${i}, 'cumple')">✓ Cumple</button>
          <button class="hab-btn" id="btn-mejora-${i}" onclick="seleccionar(${i}, 'mejora')">✗ Necesita mejorar</button>
        </div>
      </div>
    `;
  });

  html += `
    <div class="notas-area">
      <label>Plan de acción (para las áreas que necesitan mejorar)</label>
      <textarea id="plan-accion" placeholder="Escribe el plan de acción..."></textarea>
    </div>
    <div class="notas-area">
      <label>Comentarios del entrenador</label>
      <textarea id="comentarios" placeholder="Escribe los comentarios..."></textarea>
    </div>
    <button class="btn-resultado" onclick="guardarYMostrarResultado()">Guardar y ver resultado</button>
    <div id="resultado-box" style="display:none;"></div>
    <button class="btn-reiniciar" id="btn-reiniciar" style="display:none;" onclick="renderHabilidades()">Reiniciar evaluación</button>
  `;

  cont.innerHTML = html;
}

function seleccionar(i, tipo) {
  const btnCumple = document.getElementById(`btn-cumple-${i}`);
  const btnMejora = document.getElementById(`btn-mejora-${i}`);
  const row       = document.getElementById(`row-${i}`);

  const yaCumple = btnCumple.classList.contains('cumple-activo');
  const yaMejora = btnMejora.classList.contains('mejora-activo');

  btnCumple.classList.remove('cumple-activo');
  btnMejora.classList.remove('mejora-activo');
  row.classList.remove('cumple', 'mejora');

  if (tipo === 'cumple' && !yaCumple) {
    btnCumple.classList.add('cumple-activo');
    row.classList.add('cumple');
  } else if (tipo === 'mejora' && !yaMejora) {
    btnMejora.classList.add('mejora-activo');
    row.classList.add('mejora');
  }
}

async function guardarYMostrarResultado() {
  const examen = examenesData[estacionActual];
  let cumple      = 0;
  let mejora      = 0;
  let sinResponder = 0;
  const resultadoHabilidades = [];

  examen.habilidades.forEach((hab, i) => {
    if (document.getElementById(`btn-cumple-${i}`).classList.contains('cumple-activo')) {
      cumple++;
      resultadoHabilidades.push({ habilidad: hab, resultado: 'cumple' });
    } else if (document.getElementById(`btn-mejora-${i}`).classList.contains('mejora-activo')) {
      mejora++;
      resultadoHabilidades.push({ habilidad: hab, resultado: 'mejora' });
    } else {
      sinResponder++;
      resultadoHabilidades.push({ habilidad: hab, resultado: 'sin_evaluar' });
    }
  });

  if (sinResponder > 0) {
    const ok = confirm(`Hay ${sinResponder} habilidad(es) sin evaluar. ¿Deseas guardar de todas formas?`);
    if (!ok) return;
  }

  const planAccion  = document.getElementById('plan-accion').value;
  const comentarios = document.getElementById('comentarios').value;
  const aprueba     = cumple >= examen.puntaje_aprobar;

  const { error } = await mysupabase
    .from('resultados_habilidades')
    .insert([{
      nombre:      nombreEmpleado,
      area:        examen.area,
      habilidades: resultadoHabilidades,
      plan_accion: planAccion,
      comentarios: comentarios,
      cumple:      cumple,
      total:       examen.habilidades.length,
      aprobado:    aprueba
    }]);

  if (error) {
    console.error('Error al guardar:', error);
    alert('Error al guardar. Revisa la consola.');
    return;
  }

  const resDiv = document.getElementById('resultado-box');
  resDiv.innerHTML = `
    <div class="resultado-box">
      <div class="resultado-score">${cumple}<span> / ${examen.habilidades.length}</span></div>
      <div class="resultado-label">habilidades que cumplen con los estándares</div>
      <div class="resultado-estado ${aprueba ? 'aprobado' : 'reprobado'}">
        ${aprueba ? '✓ CERTIFICADO' : '✗ NECESITA MÁS PRÁCTICA'}
      </div>
      <div class="resultado-label" style="margin-top:10px;">
        Necesita mejorar: <strong>${mejora}</strong> &nbsp;|&nbsp; Sin evaluar: <strong>${sinResponder}</strong>
      </div>
      <div class="resultado-label" style="margin-top:6px; color:#22c55e;">✓ Guardado correctamente</div>
    </div>
  `;

  resDiv.style.display = 'block';
  document.getElementById('btn-reiniciar').style.display = 'block';
  resDiv.scrollIntoView({ behavior: 'smooth' });
}
