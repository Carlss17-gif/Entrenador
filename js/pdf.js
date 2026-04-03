
async function generarPDF() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  const empleado  = JSON.parse(localStorage.getItem("empleado")) || {};
  const marginX   = 15;
  const maxWidth  = 180;
  let y;

  
  pdf.setFillColor(0, 0, 0);
  pdf.rect(0, 0, 210, 297, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");

  pdf.setFontSize(26);
  pdf.text("REPORTE DE EVALUACIÓN", 105, 80, { align: "center" });

  pdf.setFontSize(18);
  pdf.text(empleado.nombre || '', 105, 110, { align: "center" });

  pdf.setFontSize(14);
  pdf.text(`Entrenador: ${empleado.entrenador || ''}`,     105, 125, { align: "center" });
  pdf.text(`Sucursal: ${empleado.sucursal || ''}`,         105, 140, { align: "center" });
  pdf.text(`Distrito: ${empleado.distrito || ''}`,         105, 155, { align: "center" });
  pdf.text(`Fecha de Ingreso: ${empleado.fecha_ingreso || ''}`, 105, 170, { align: "center" });
  const resExamenes = await fetch("examenes.json");
  const examenesJSON = await resExamenes.json();

  const { data: habilidadesData, error } = await mysupabase
    .from("resultados_habilidades")
    .select("*")
    .eq("nombre", empleado.nombre || '')
    .order("created_at", { ascending: false });

  if (error) console.warn("No se pudieron cargar habilidades:", error);

  const habilidadesPorArea = {};
  (habilidadesData || []).forEach(h => {
    if (!habilidadesPorArea[h.area]) habilidadesPorArea[h.area] = h;
  });

  const areasUnicas = [...new Map(empleadoActual.map(r => [r.area, r])).values()];

  for (let registro of areasUnicas) {

    const examenBase = examenesJSON[registro.examen];
    if (!examenBase) continue;

    pdf.addPage();
    y = 25;

    y = await agregarEncabezado(pdf, `Examen de Conocimientos — ${registro.area}`, marginX, maxWidth, y);

    pdf.setFontSize(9);
    pdf.setLineHeightFactor(1.1);

    examenBase.preguntas.forEach((p, i) => {
      let respuestaUsuario = registro.respuestas[i];
      let correcta = "";

      if (p.tipo === "opcion") {
        correcta         = p.opciones[p.correcta];
        respuestaUsuario = p.opciones[respuestaUsuario] || "Sin responder";
      } else {
        correcta = "Respuesta abierta";
      }

      const esCorrecta = respuestaUsuario === correcta;

      const preguntaSplit = pdf.splitTextToSize(`${i + 1}. ${p.texto}`, maxWidth);
      if (y + preguntaSplit.length * 4.5 + 12 > 255) { pdf.addPage(); y = 25; }

      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(0, 0, 0);
      pdf.text(preguntaSplit, marginX, y);
      y += preguntaSplit.length * 4.5 + 1;

      pdf.setFont("helvetica", "normal");
      const respSplit = pdf.splitTextToSize(`Tu respuesta: ${respuestaUsuario}`, maxWidth);
      pdf.setTextColor(esCorrecta ? 0 : 200, esCorrecta ? 0 : 38, esCorrecta ? 0 : 38);
      pdf.text(respSplit, marginX, y);
      y += respSplit.length * 4 + 1;

      pdf.setFont("helvetica", "italic");
      const corrSplit = pdf.splitTextToSize(`Correcta: ${correcta}`, maxWidth);
      pdf.setTextColor(0, 0, 0);
      pdf.text(corrSplit, marginX, y);
      y += corrSplit.length * 4 + 4;

      pdf.setFont("helvetica", "normal");
    });

    agregarPieDePagina(pdf, empleado, examenBase.preguntas.length);

    pdf.addPage();
    y = 25;

    y = await agregarEncabezado(pdf, `Evaluación de Habilidades — ${registro.area}`, marginX, maxWidth, y);

    const habRegistro = habilidadesPorArea[registro.area];

    if (!habRegistro) {
      pdf.setFontSize(10);
      pdf.setTextColor(150, 150, 150);
      pdf.text("Sin evaluación de habilidades registrada para esta área.", marginX, y);
      y += 10;
    } else {
      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0);

      pdf.setFont("helvetica", "bold");
      pdf.setFillColor(230, 230, 230);
      pdf.rect(marginX, y, 140, 7, "F");
      pdf.rect(155, y, 20, 7, "F");
      pdf.rect(176, y, 19, 7, "F");
      pdf.text("Habilidad", marginX + 2, y + 5);
      pdf.text("Cumple", 156, y + 5);
      pdf.text("Mejorar", 177, y + 5);
      y += 8;

      habRegistro.habilidades.forEach((h, i) => {
        if (y + 8 > 255) { pdf.addPage(); y = 25; }

        const esCumple = h.resultado === 'cumple';
        const esMejora = h.resultado === 'mejora';

        if (i % 2 === 0) {
          pdf.setFillColor(250, 250, 250);
          pdf.rect(marginX, y, 180, 7, "F");
        }

        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(0, 0, 0);
        const habTexto = h.habilidad.length > 70 ? h.habilidad.substring(0, 70) + "…" : h.habilidad;
        pdf.text(`${i + 1}. ${habTexto}`, marginX + 2, y + 5);

        if (esCumple) {
          pdf.setTextColor(34, 197, 94);
          pdf.setFont("helvetica", "bold");
          pdf.text("✓", 162, y + 5);
        }
        if (esMejora) {
          pdf.setTextColor(239, 68, 68);
          pdf.setFont("helvetica", "bold");
          pdf.text("✗", 183, y + 5);
        }

        pdf.setTextColor(0, 0, 0);
        y += 7;
      });

      y += 5;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Calificación Final: ${habRegistro.cumple} / ${habRegistro.total}`, marginX, y);
      pdf.text(`(Puntaje para pasar = ${habRegistro.total - 1})`, marginX + 80, y);
      y += 7;

      const estadoColor = habRegistro.aprobado ? [34, 197, 94] : [239, 68, 68];
      pdf.setTextColor(...estadoColor);
      pdf.text(habRegistro.aprobado ? "CERTIFICADO" : "NECESITA MÁS PRÁCTICA", marginX, y);
      pdf.setTextColor(0, 0, 0);
      y += 10;

      if (habRegistro.plan_accion) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.text("Plan de acción:", marginX, y);
        y += 5;
        pdf.setFont("helvetica", "normal");
        const planSplit = pdf.splitTextToSize(habRegistro.plan_accion, maxWidth);
        pdf.text(planSplit, marginX, y);
        y += planSplit.length * 4.5 + 4;
      }

      if (habRegistro.comentarios) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.text("Comentarios del entrenador:", marginX, y);
        y += 5;
        pdf.setFont("helvetica", "normal");
        const comSplit = pdf.splitTextToSize(habRegistro.comentarios, maxWidth);
        pdf.text(comSplit, marginX, y);
        y += comSplit.length * 4.5 + 4;
      }

      y += 5;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.line(marginX, y + 8, 90, y + 8);
      pdf.line(115, y + 8, 195, y + 8);
      pdf.text("Firma del Aprendiz", marginX, y + 13);
      pdf.text("Firma del Entrenador", 115, y + 13);
    }

    agregarPieDePagina(pdf, empleado, 0);
  }

  pdf.save(`Reporte_${empleado.nombre || 'empleado'}.pdf`);
}


async function agregarEncabezado(pdf, titulo, marginX, maxWidth, y) {
  const logoUrl   = "logo.png";
  const imgWidth  = 30;
  const imgHeight = 15;
  const lineH     = 6;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(0, 0, 0);

  const split      = pdf.splitTextToSize(titulo, maxWidth - 40);
  const textHeight = split.length * lineH;
  const blockH     = Math.max(textHeight, imgHeight);
  const textY      = y + (blockH - textHeight) / 2 + 4;
  const imgY       = y + (blockH - imgHeight) / 2;

  split.forEach((linea, idx) => pdf.text(linea, marginX, textY + idx * lineH));

  try {
    const img = await loadImageAsDataUrl(logoUrl);
    pdf.addImage(img, "PNG", 210 - marginX - imgWidth, imgY, imgWidth, imgHeight);
  } catch (_) {}

  y += blockH + 6;

  pdf.setDrawColor(0);
  pdf.setLineWidth(0.5);
  pdf.line(marginX, y, 210 - marginX, y);

  return y + 6;
}

function agregarPieDePagina(pdf, empleado, totalPreguntas) {
  const yPie    = 265;
  const marginX = 15;

  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.7);
  pdf.rect(marginX, yPie, 180, 30, "S");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);

  let y = yPie + 6;
  if (totalPreguntas > 0) {
    pdf.text(`Calificación Final: _______ (Puntaje aprobatorio = ${totalPreguntas - 1})`, marginX + 3, y);
    y += 6;
  }

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(`Nombre: ${empleado.nombre || ''}`,       marginX + 3, y);
  pdf.text(`Entrenador: ${empleado.entrenador || ''}`, marginX + 3, y + 6);

  const rx = 105;
  pdf.text(`Sucursal: ${empleado.sucursal || ''}`,        rx, y);
  pdf.text(`Distrito: ${empleado.distrito || ''}`,         rx, y + 6);
  pdf.text(`Fecha de Ingreso: ${empleado.fecha_ingreso || ''}`, rx, y + 12);
}

function loadImageAsDataUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width  = img.width;
      c.height = img.height;
      c.getContext("2d").drawImage(img, 0, 0);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = url;
  });
}
