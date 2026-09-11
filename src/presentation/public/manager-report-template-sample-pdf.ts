const object = (id: number, body: string): string => `${id} 0 obj\n${body}\nendobj\n`;

export const createManagerReportTemplateSamplePdf = (): Buffer => {
  const stream = [
    "BT",
    "/F1 24 Tf",
    "72 700 Td",
    "(TUVANSA) Tj",
    "0 -40 Td",
    "/F1 14 Tf",
    "(Reporte de cotizaciones de muestra) Tj",
    "0 -30 Td",
    "/F1 10 Tf",
    "(Periodo: 1 al 7 de septiembre de 2026) Tj",
    "0 -24 Td",
    "(Sucursal: Mexico) Tj",
    "0 -34 Td",
    "/F1 12 Tf",
    "(Resumen ejecutivo) Tj",
    "0 -24 Td",
    "/F1 10 Tf",
    "(Cotizaciones generadas: 48) Tj",
    "0 -20 Td",
    "(Total cotizado MXN: 1,850,430.00) Tj",
    "0 -20 Td",
    "(Total cotizado USD: 24,680.00) Tj",
    "0 -34 Td",
    "(Documento de muestra sin informacion comercial real.) Tj",
    "ET",
  ].join("\n");
  const objects = [
    object(1, "<< /Type /Catalog /Pages 2 0 R >>"),
    object(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    object(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>"),
    object(4, `<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}\nendstream`),
    object(5, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"),
  ];

  let pdf = "%PDF-1.4\n%TUVANSA\n";
  const offsets = [0];
  for (const entry of objects) {
    offsets.push(Buffer.byteLength(pdf, "ascii"));
    pdf += entry;
  }

  const xrefOffset = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "ascii");
};
