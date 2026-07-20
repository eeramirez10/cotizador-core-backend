import "dotenv/config";
import { hash } from "bcryptjs";
import { prisma } from "../src/infrastructure/database/prisma-client";

const DEMO_PASSWORD = "Demo2026!";
const TAX_RATE = 0.16;

const demoUsers = [
  { firstName: "Alicia", lastName: "Sanchez", username: "asanchez", email: "asanchez@tuvansa.com.mx", phone: "5510001001", erpUserCode: "DEMO-1001" },
  { firstName: "Arturo", lastName: "Navarro", username: "anavarro", email: "anavarro@tuvansa.com.mx", phone: "5510001002", erpUserCode: "DEMO-1002" },
  { firstName: "Blanca", lastName: "Loeza", username: "bloeza", email: "bloeza@tuvansa.com.mx", phone: "5510001003", erpUserCode: "DEMO-1003" },
] as const;

const demoCustomers = [
  { code: "DEMO-CLI-001", firstName: "Laura", lastName: "Mendoza", legalName: "CONSTRUCTORA DEL NORTE SA DE CV", email: "compras@constructoradelnorte.mx", whatsapp: "5511001001" },
  { code: "DEMO-CLI-002", firstName: "Jorge", lastName: "Salas", legalName: "INDUSTRIAS DEL BAJIO SA DE CV", email: "ventas@industriasbajio.mx", whatsapp: "5511001002" },
  { code: "DEMO-CLI-003", firstName: "Mariana", lastName: "Reyes", legalName: "PROYECTOS HORIZONTE SA DE CV", email: "contacto@proyectoshorizonte.mx", whatsapp: "5511001003" },
  { code: "DEMO-CLI-004", firstName: "Raul", lastName: "Gomez", legalName: "SERVICIOS TECNICOS DEL CENTRO SA DE CV", email: "compras@serviciostecnicos.mx", whatsapp: "5511001004" },
  { code: "DEMO-CLI-005", firstName: "Andrea", lastName: "Vega", legalName: null, email: "andrea.vega@example.com", whatsapp: "5511001005" },
  { code: "DEMO-CLI-006", firstName: "Ricardo", lastName: "Leon", legalName: "MANTENIMIENTO INDUSTRIAL MEXICANO SA DE CV", email: "operaciones@mantenimientoindustrial.mx", whatsapp: "5511001006" },
] as const;

const daysAgo = (days: number): Date => {
  const date = new Date();
  date.setHours(10, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
};

const dateOnly = (date: Date): Date => new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const run = async (): Promise<void> => {
  const branch = await prisma.branch.findUnique({ where: { code: "01" } });
  if (!branch) throw new Error("Missing branch 01. Run the base seed first.");

  const admin = await prisma.user.findUnique({ where: { username: "admin" } });
  if (!admin) throw new Error("Missing admin user. Run the base seed first.");

  const passwordHash = await hash(DEMO_PASSWORD, 10);
  const users = await Promise.all(
    demoUsers.map((user) =>
      prisma.user.upsert({
        where: { email: user.email },
        update: { ...user, role: "SELLER", branchId: branch.id, isActive: true, passwordHash },
        create: { ...user, role: "SELLER", branchId: branch.id, isActive: true, passwordHash },
      })
    )
  );

  const customers = await Promise.all(
    demoCustomers.map(async (customer) => {
      const existing = await prisma.customer.findFirst({ where: { code: customer.code } });
      const data = {
        source: "LOCAL" as const,
        code: customer.code,
        firstName: customer.firstName,
        lastName: customer.lastName,
        displayName: `${customer.firstName} ${customer.lastName}`,
        legalName: customer.legalName,
        email: customer.email,
        phone: customer.whatsapp,
        whatsapp: customer.whatsapp,
        profileStatus: customer.legalName ? "FISCAL_COMPLETED" as const : "PROSPECT" as const,
        isActive: true,
        createdByUserId: admin.id,
        updatedByUserId: admin.id,
      };

      return existing
        ? prisma.customer.update({ where: { id: existing.id }, data })
        : prisma.customer.create({ data });
    })
  );

  await prisma.quote.deleteMany({ where: { quoteNumber: { startsWith: "DEMO-" } } });

  const scenarios = [
    { status: "DRAFT" as const, days: 1, user: 0, customer: 0, currency: "MXN" as const, source: "PHONE" as const, total: 48600, delivery: false },
    { status: "DRAFT" as const, days: 4, user: 1, customer: 1, currency: "USD" as const, source: "EMAIL" as const, total: 8350, delivery: false },
    { status: "PENDING" as const, days: 3, user: 2, customer: 2, currency: "MXN" as const, source: "WHATSAPP" as const, total: 79200, delivery: false },
    { status: "PENDING" as const, days: 8, user: 0, customer: 3, currency: "MXN" as const, source: "AI_ASSISTANT" as const, total: 32100, delivery: false },
    { status: "QUOTED" as const, days: 2, user: 1, customer: 4, currency: "USD" as const, source: "EMAIL" as const, total: 12650, delivery: true },
    { status: "QUOTED" as const, days: 6, user: 2, customer: 5, currency: "MXN" as const, source: "IN_PERSON" as const, total: 114500, delivery: true },
    { status: "QUOTED" as const, days: 11, user: 0, customer: 1, currency: "MXN" as const, source: "PHONE" as const, total: 68400, delivery: true },
    { status: "APPROVED" as const, days: 5, user: 0, customer: 0, currency: "MXN" as const, source: "WHATSAPP" as const, total: 152000, delivery: true, order: true },
    { status: "APPROVED" as const, days: 9, user: 1, customer: 2, currency: "USD" as const, source: "EMAIL" as const, total: 9850, delivery: true, order: true },
    { status: "APPROVED" as const, days: 14, user: 2, customer: 3, currency: "MXN" as const, source: "AI_ASSISTANT" as const, total: 96300, delivery: true },
    { status: "APPROVED" as const, days: 20, user: 1, customer: 5, currency: "MXN" as const, source: "PHONE" as const, total: 74300, delivery: true },
    { status: "REJECTED" as const, days: 7, user: 0, customer: 4, currency: "MXN" as const, source: "EMAIL" as const, total: 45800, delivery: true, rejection: "PRICE_HIGH" as const },
    { status: "REJECTED" as const, days: 13, user: 1, customer: 0, currency: "USD" as const, source: "WHATSAPP" as const, total: 6420, delivery: true, rejection: "COMPETITOR_SELECTED" as const },
    { status: "REJECTED" as const, days: 17, user: 2, customer: 1, currency: "MXN" as const, source: "PHONE" as const, total: 37900, delivery: true, rejection: "DELIVERY_TIME" as const },
    { status: "CANCELLED" as const, days: 10, user: 0, customer: 2, currency: "MXN" as const, source: "OTHER" as const, origin: "TEXT_INPUT" as const, total: 21800, delivery: false, cancellation: "DUPLICATE_REQUEST" as const },
    { status: "CANCELLED" as const, days: 16, user: 1, customer: 3, currency: "USD" as const, source: "EMAIL" as const, total: 4150, delivery: false, cancellation: "INSUFFICIENT_INFORMATION" as const },
    { status: "CANCELLED" as const, days: 23, user: 2, customer: 5, currency: "MXN" as const, source: "OTHER" as const, total: 28600, delivery: false, cancellation: "REPLACED_BY_REVISION" as const },
    { status: "APPROVED" as const, days: 27, user: 0, customer: 4, currency: "MXN" as const, source: "IN_PERSON" as const, total: 129700, delivery: true },
  ];

  await Promise.all(
    scenarios.map(async (scenario, index) => {
      const createdAt = daysAgo(scenario.days);
      const quoteDate = dateOnly(createdAt);
      const subtotal = Number((scenario.total / (1 + TAX_RATE)).toFixed(4));
      const tax = Number((scenario.total - subtotal).toFixed(4));
      const actor = users[scenario.user];
      const customer = customers[scenario.customer];
      const quoteNumber = `DEMO-${quoteDate.toISOString().slice(0, 10).replaceAll("-", "")}-${String(index + 1).padStart(3, "0")}`;
      const unitPrice = Number((subtotal / 3).toFixed(4));

      await prisma.quote.create({
        data: {
          quoteNumber,
          status: scenario.status,
          deliveryStatus: scenario.delivery ? "SENT" : "NOT_SENT",
          firstSentAt: scenario.delivery ? addDays(createdAt, 1) : null,
          orderStatus: scenario.order ? "GENERATED" : "NOT_GENERATED",
          orderGeneratedAt: scenario.order ? addDays(createdAt, 3) : null,
          orderReference: scenario.order ? `PED-DEMO-${String(index + 1).padStart(3, "0")}` : null,
          origin: scenario.origin ?? (scenario.source === "AI_ASSISTANT" ? "FILE_UPLOAD" : "MANUAL"),
          sourceChannel: scenario.source,
          currency: scenario.currency,
          exchangeRate: scenario.currency === "USD" ? 17.25 : 1,
          exchangeRateDate: quoteDate,
          taxRate: TAX_RATE,
          subtotal,
          tax,
          total: scenario.total,
          deliveryPlace: "L.A.B. OBRA",
          paymentTerms: "60% DE ANTICIPO RESTO CONTRA ENTREGA",
          validityDays: 15,
          validUntil: addDays(quoteDate, 15),
          branchId: branch.id,
          customerId: customer.id,
          createdByUserId: actor.id,
          updatedByUserId: actor.id,
          providedByUserId: index % 4 === 0 ? admin.id : null,
          providedByNameSnapshot: index % 4 === 0 ? "System Admin" : null,
          providedByBranchNameSnapshot: index % 4 === 0 ? branch.name : null,
          providedAt: index % 4 === 0 ? createdAt : null,
          providedByAssignedByUserId: index % 4 === 0 ? admin.id : null,
          rejectionReason: scenario.rejection || null,
          rejectionComment: scenario.rejection ? "Dato demo para presentación comercial." : null,
          rejectedAt: scenario.rejection ? addDays(createdAt, 2) : null,
          rejectedByUserId: scenario.rejection ? actor.id : null,
          cancellationReason: scenario.cancellation || null,
          cancellationComment: scenario.cancellation ? "Dato demo para presentación interna." : null,
          cancelledAt: scenario.cancellation ? addDays(createdAt, 1) : null,
          cancelledByUserId: scenario.cancellation ? actor.id : null,
          notes: "Cotización generada como dato demo.",
          createdAt,
          items: {
            create: [
              { externalProductCode: `DEMO-P-${index + 1}-A`, ean: `750000${String(index + 1).padStart(6, "0")}`, erpDescription: "TUBO DE ACERO AL CARBON", unit: "TR", qty: 1, stock: 18, deliveryTime: "1-2 semanas", cost: Number((unitPrice * 0.7).toFixed(4)), costCurrency: scenario.currency, marginPct: 42.8571, unitPrice, subtotal: unitPrice, sourceRequiresReview: false, requiresReview: false },
              { externalProductCode: `DEMO-P-${index + 1}-B`, ean: `750001${String(index + 1).padStart(6, "0")}`, erpDescription: "VALVULA INDUSTRIAL DE PASO", unit: "PZA", qty: 1, stock: 12, deliveryTime: "Inmediato", cost: Number((unitPrice * 0.66).toFixed(4)), costCurrency: scenario.currency, marginPct: 51.5152, unitPrice, subtotal: unitPrice, sourceRequiresReview: false, requiresReview: false },
              { externalProductCode: `DEMO-P-${index + 1}-C`, ean: `750002${String(index + 1).padStart(6, "0")}`, erpDescription: "CONEXION ROSCADA GALVANIZADA", unit: "PZA", qty: 1, stock: 32, deliveryTime: "3-5 días", cost: Number((unitPrice * 0.62).toFixed(4)), costCurrency: scenario.currency, marginPct: 61.2903, unitPrice, subtotal: Number((subtotal - unitPrice * 2).toFixed(4)), sourceRequiresReview: false, requiresReview: false },
            ],
          },
          events: {
            create: [
              { status: "DRAFT", note: "Cotización demo creada.", actorUserId: actor.id, createdAt },
              ...(scenario.status !== "DRAFT" ? [{ status: scenario.status, note: `Cotización demo marcada como ${scenario.status}.`, actorUserId: actor.id, createdAt: addDays(createdAt, 1) }] : []),
            ],
          },
          deliveryAttempts: scenario.delivery
            ? { create: { channel: scenario.source === "WHATSAPP" ? "WHATSAPP" : "EMAIL", recipient: customer.email || customer.whatsapp, status: "SENT", providerMessageId: `demo-${index + 1}`, sentByUserId: actor.id, sentAt: addDays(createdAt, 1) } }
            : undefined,
          orderExports: scenario.order
            ? { create: { orderReference: `PED-DEMO-${String(index + 1).padStart(3, "0")}`, fileName: `${quoteNumber}.txt`, generatedByUserId: actor.id, generatedAt: addDays(createdAt, 3) } }
            : undefined,
        },
      });
    })
  );

  console.log(`Demo data created: ${users.length} sellers and ${scenarios.length} quotes.`);
  console.log(`Demo seller password: ${DEMO_PASSWORD}`);
};

run()
  .catch((error) => {
    console.error("Demo seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
