const bcrypt = require('bcryptjs');
const { connectDatabase } = require('../config/database');
const { env, assertSeedConfig } = require('../config/env');
const { Organisation } = require('../models/Organisation');
const { User } = require('../models/User');
const { Membership } = require('../models/Membership');
const { Client } = require('../models/Client');
const { Invoice } = require('../models/Invoice');
const { Payment } = require('../models/Payment');
const { Plan } = require('../models/Plan');
const { Subscription } = require('../models/Subscription');
const { Reminder, AuditLog, Master, GlobalSetting } = require('../models/Settings');
const { Item } = require('../models/Item');
const { calculateInvoiceTotals } = require('../services/gstService');

const plans = [
  { code: 'starter', name: 'Starter', monthlyPrice: 999, yearlyPrice: 9990, userLimit: 3, invoiceLimit: 100, sortOrder: 1, features: ['GST Invoicing', 'Bill Generator', 'Payment Tracking', 'Email Support'] },
  { code: 'growth', name: 'Growth', monthlyPrice: 2499, yearlyPrice: 24990, userLimit: 10, invoiceLimit: 500, sortOrder: 2, features: ['Everything in Starter', 'Multi-user & Roles', 'Client Portal', 'Priority Support', 'Custom Branding'] },
  { code: 'business', name: 'Business', monthlyPrice: 5999, yearlyPrice: 59990, userLimit: 25, invoiceLimit: 2000, sortOrder: 3, features: ['Everything in Growth', 'Advanced Reports', 'API Access', 'Dedicated Manager', 'SLA 99.9%'] },
  { code: 'enterprise', name: 'Enterprise', monthlyPrice: null, yearlyPrice: null, userLimit: 999, invoiceLimit: 999999, sortOrder: 4, features: ['Unlimited users', 'Custom integrations', 'On-premise option', '24/7 Phone Support', 'Custom contracts'] }
];

const masters = [
  { type: 'gstRate', rate: 0, label: 'Nil rated / exempt supplies', active: true, sortOrder: 0 },
  { type: 'gstRate', rate: 5, label: 'Essential goods and services', active: true, sortOrder: 1 },
  { type: 'gstRate', rate: 12, label: 'Standard goods', active: true, sortOrder: 2 },
  { type: 'gstRate', rate: 18, label: 'Standard services (default)', active: true, sortOrder: 3 },
  { type: 'gstRate', rate: 28, label: 'Luxury goods and services', active: true, sortOrder: 4 },
  { type: 'hsn', code: '998313', description: 'IT consulting and support services', rate: 18, active: true, sortOrder: 0 },
  { type: 'hsn', code: '998314', description: 'Software development services', rate: 18, active: true, sortOrder: 1 },
  { type: 'hsn', code: '998316', description: 'IT infrastructure provisioning', rate: 18, active: true, sortOrder: 2 },
  { type: 'hsn', code: '998361', description: 'Advertising and marketing services', rate: 18, active: true, sortOrder: 3 },
  { type: 'paymentMethod', label: 'Bank Transfer', active: true, sortOrder: 0 },
  { type: 'paymentMethod', label: 'UPI', active: true, sortOrder: 1 },
  { type: 'paymentMethod', label: 'NEFT', active: true, sortOrder: 2 },
  { type: 'paymentMethod', label: 'RTGS', active: true, sortOrder: 3 },
  { type: 'paymentMethod', label: 'Razorpay', active: true, sortOrder: 4 },
  { type: 'paymentMethod', label: 'Cheque', active: true, sortOrder: 5 },
  { type: 'paymentMethod', label: 'Cash', active: true, sortOrder: 6 },
  { type: 'unit', code: 'Nos', label: 'Numbers', active: true, sortOrder: 0 },
  { type: 'unit', code: 'Hrs', label: 'Hours', active: true, sortOrder: 1 },
  { type: 'unit', code: 'Days', label: 'Days', active: true, sortOrder: 2 },
  { type: 'unit', code: 'Kg', label: 'Kilograms', active: true, sortOrder: 3 },
  { type: 'unit', code: 'L', label: 'Litres', active: true, sortOrder: 4 },
  { type: 'unit', code: 'Pcs', label: 'Pieces', active: true, sortOrder: 5 },
  { type: 'unit', code: 'Set', label: 'Sets', active: true, sortOrder: 6 },
  { type: 'unit', code: 'MT', label: 'Metric Tonnes', active: false, sortOrder: 7 }
];

const settings = [
  { key: 'branding', value: { appName: 'Klogu Bizz', tagline: 'GST Billing Suite', primaryColor: '#4F46E5', secondaryColor: '#312E81', accentColor: '#818CF8', supportEmail: 'support@klogubizz.com', websiteUrl: 'https://klogubizz.com', logoUrl: '', faviconUrl: '' } },
  { key: 'email', value: { senderName: 'Klogu Bizz Billing', senderEmail: 'billing@klogubizz.com', replyTo: 'support@klogubizz.com', bcc: '', footer: 'Klogu Bizz — GST Billing Suite. This is an automated message.' } },
  { key: 'templateConfig', value: { paperSize: 'A4', fontSize: 'medium', watermark: 'DRAFT', accentColor: '#4F46E5', showLogo: true, showSignature: true, showBankDetails: true, showAmountInWords: true, showGstBreakdown: true, showQrCode: false } },
  { key: 'receipt', value: { autoSend: true, includeInvoiceCopy: true, subject: 'Payment received — thank you!', bodyIntro: 'We have received your payment. Please find the receipt details below.' } }
];

const bank = { bank: 'HDFC Bank', account: '50100123456789', ifsc: 'HDFC0001234' };

async function seed() {
  // Refuses to run with the default superadmin password, and refuses to touch a
  // production database at all without an explicit opt-in — the deleteMany
  // sweep below would erase every tenant's real data.
  assertSeedConfig();
  await connectDatabase();
  await Promise.all([
    Organisation.deleteMany({}),
    User.deleteMany({}),
    Membership.deleteMany({}),
    Client.deleteMany({}),
    Invoice.deleteMany({}),
    Payment.deleteMany({}),
    Plan.deleteMany({}),
    Subscription.deleteMany({}),
    Reminder.deleteMany({}),
    AuditLog.deleteMany({}),
    Master.deleteMany({}),
    GlobalSetting.deleteMany({}),
    Item.deleteMany({})
  ]);

  await Plan.insertMany(plans);
  await Master.insertMany(masters);
  await GlobalSetting.insertMany(settings);
  await Reminder.insertMany([
    // Placeholder names must match what emailService.renderTemplate substitutes
    // ({{invoiceNumber}}, {{clientName}}, {{amount}}, {{dueDate}}, {{dueState}},
    // {{overdueDays}}, {{orgName}}). The previous seed used {{invoice_id}} and
    // {{client_name}}, which were never recognised — they would have rendered as
    // empty strings in a real reminder.
    {
      name: 'Friendly Reminder',
      daysOffset: -3,
      enabled: true,
      subject: 'Invoice {{invoiceNumber}} is due soon',
      template: [
        'Dear {{clientName}},',
        '',
        'Invoice {{invoiceNumber}} for {{amount}} is due on {{dueDate}}.',
        '',
        'Warm regards,',
        '{{orgName}}'
      ].join('\n')
    },
    {
      name: 'Due Today',
      daysOffset: 0,
      enabled: true,
      subject: 'Invoice {{invoiceNumber}} is due today',
      template: [
        'Dear {{clientName}},',
        '',
        'Invoice {{invoiceNumber}} for {{amount}} is due today.',
        '',
        'Warm regards,',
        '{{orgName}}'
      ].join('\n')
    },
    {
      name: 'Overdue Notice',
      daysOffset: 3,
      enabled: true,
      subject: 'Invoice {{invoiceNumber}} is overdue',
      template: [
        'Dear {{clientName}},',
        '',
        'Invoice {{invoiceNumber}} for {{amount}} {{dueState}}.',
        '',
        'Please arrange payment at your earliest convenience.',
        '',
        'Warm regards,',
        '{{orgName}}'
      ].join('\n')
    },
    {
      name: 'Final Notice',
      daysOffset: 7,
      enabled: false,
      subject: 'Final notice — invoice {{invoiceNumber}}',
      template: [
        'Dear {{clientName}},',
        '',
        'This is a final notice for invoice {{invoiceNumber}}, now {{overdueDays}} days overdue',
        'with {{balanceDue}} still outstanding.',
        '',
        'Warm regards,',
        '{{orgName}}'
      ].join('\n')
    }
  ]);

  const org = await Organisation.create({
    name: 'TechSoft Solutions Pvt Ltd',
    adminEmail: 'admin@techsoft.local',
    gstin: '27AATFS1234A1ZK',
    pan: 'AATFS1234A',
    phone: '+91 98100 00001',
    address: 'Plot 12, Andheri East, Mumbai, Maharashtra 400069',
    state: 'Maharashtra',
    stateCode: '27',
    plan: 'business',
    status: 'active',
    brandingConfig: { invoicePrefix: 'KLG', primaryColor: '#4f46e5' },
    invoiceSequence: 10
  });

  await Item.insertMany([
    { orgId: org._id, itemCode: 'ITM-001', name: 'Dell Latitude Laptop', description: '14-inch business laptop, i5, 16GB RAM, 512GB SSD', type: 'goods', hsn: '8471', category: 'Hardware', unit: 'Nos', gstRate: 18, sellingPrice: 62000, mrp: 68000, purchasePrice: 55000, stockQty: 12, reorderLevel: 5, barcode: '8901234500011' },
    { orgId: org._id, itemCode: 'ITM-002', name: 'HP LaserJet Printer', description: 'Monochrome laser printer with duplex printing', type: 'goods', hsn: '8443', category: 'Hardware', unit: 'Nos', gstRate: 18, sellingPrice: 15500, mrp: 17500, purchasePrice: 13000, stockQty: 8, reorderLevel: 3, barcode: '8901234500028' },
    { orgId: org._id, itemCode: 'ITM-003', name: '24-inch LED Monitor', description: 'Full HD IPS display monitor', type: 'goods', hsn: '8528', category: 'Hardware', unit: 'Nos', gstRate: 18, sellingPrice: 9200, mrp: 10500, purchasePrice: 7800, stockQty: 20, reorderLevel: 8, barcode: '8901234500035' },
    { orgId: org._id, itemCode: 'ITM-004', name: 'Wireless Keyboard & Mouse Combo', description: 'Ergonomic wireless combo set', type: 'goods', hsn: '8471', category: 'Accessories', unit: 'Set', gstRate: 18, sellingPrice: 1450, mrp: 1699, purchasePrice: 1100, stockQty: 45, reorderLevel: 15, barcode: '8901234500042' },
    { orgId: org._id, itemCode: 'ITM-005', name: 'Cat6 Ethernet Cable (305m box)', description: 'Networking cable, copper, 305 metre box', type: 'goods', hsn: '8544', category: 'Networking', unit: 'Nos', gstRate: 18, sellingPrice: 5200, mrp: 6000, purchasePrice: 4300, stockQty: 30, reorderLevel: 10, barcode: '8901234500059' },
    { orgId: org._id, itemCode: 'ITM-006', name: '1TB External Hard Disk', description: 'USB 3.0 portable hard disk drive', type: 'goods', hsn: '8471', category: 'Storage', unit: 'Nos', gstRate: 18, sellingPrice: 4200, mrp: 4800, purchasePrice: 3500, stockQty: 25, reorderLevel: 10, barcode: '8901234500066' },
    { orgId: org._id, itemCode: 'SVC-001', name: 'Annual AMC — Desktop Support', description: 'Annual maintenance contract for desktop/laptop support', type: 'service', hsn: '998313', category: 'Support', unit: 'Nos', gstRate: 18, sellingPrice: 8000, stockQty: 0 },
    { orgId: org._id, itemCode: 'SVC-002', name: 'On-site Installation & Setup', description: 'On-site hardware installation and configuration service', type: 'service', hsn: '998316', category: 'Services', unit: 'Hrs', gstRate: 18, sellingPrice: 750, stockQty: 0 },
    { orgId: org._id, itemCode: 'SVC-003', name: 'Network Configuration Service', description: 'LAN/Wi-Fi setup and configuration', type: 'service', hsn: '998316', category: 'Services', unit: 'Hrs', gstRate: 18, sellingPrice: 950, stockQty: 0 },
    { orgId: org._id, itemCode: 'ITM-007', name: 'UPS 1KVA', description: 'Line-interactive UPS with surge protection', type: 'goods', hsn: '8504', category: 'Hardware', unit: 'Nos', gstRate: 18, sellingPrice: 6800, mrp: 7500, purchasePrice: 5600, stockQty: 15, reorderLevel: 5, barcode: '8901234500073' }
  ]);

  const [orgAdmin, orgAccountant, orgViewer, orgInvitee] = await User.create([
    { orgId: org._id, name: 'Arjun Mehta', email: 'admin@techsoft.local', passwordHash: await bcrypt.hash('Admin@123', 12), role: 'admin', status: 'active', lastLoginAt: new Date('2026-07-04') },
    { orgId: org._id, name: 'Sneha Kapoor', email: 'sneha@techsoft.local', passwordHash: await bcrypt.hash('Admin@123', 12), role: 'accountant', status: 'active', lastLoginAt: new Date('2026-07-02') },
    { orgId: org._id, name: 'Rohan Das', email: 'rohan@techsoft.local', passwordHash: await bcrypt.hash('Admin@123', 12), role: 'viewer', status: 'active', lastLoginAt: new Date('2026-06-28') },
    { orgId: org._id, name: 'Priya Nair', email: 'priya@techsoft.local', passwordHash: await bcrypt.hash('Admin@123', 12), role: 'accountant', status: 'invited' },
    { name: 'Super Admin', email: env.SUPER_ADMIN_EMAIL, passwordHash: await bcrypt.hash(env.SUPER_ADMIN_PASSWORD, 12), role: 'superadmin', status: 'active' }
  ]);
  org.ownerId = orgAdmin._id;
  await org.save();

  // Access is granted by Membership now, not User.orgId/User.role (#53, #54) —
  // without these, none of the seeded tenant users could actually sign in.
  await Membership.create([
    { userId: orgAdmin._id, orgId: org._id, role: 'admin', status: 'active' },
    { userId: orgAccountant._id, orgId: org._id, role: 'accountant', status: 'active' },
    { userId: orgViewer._id, orgId: org._id, role: 'viewer', status: 'active' },
    { userId: orgInvitee._id, orgId: org._id, role: 'accountant', status: 'invited' }
  ]);

  const clients = await Client.create([
    { orgId: org._id, companyName: 'Reliance Tech Pvt Ltd', email: 'billing@reliancetech.in', phone: '+91 98200 12345', gstin: '27AABCU9603R1ZX', address: 'BKC, Mumbai, Maharashtra 400051', state: 'Maharashtra', stateCode: '27' },
    { orgId: org._id, companyName: 'Skyline Constructions Pvt Ltd', email: 'finance@skyline.co', phone: '+91 80000 99001', gstin: '29AAGCS0197J1ZZ', address: 'Indiranagar, Bangalore, Karnataka 560038', state: 'Karnataka', stateCode: '29' },
    { orgId: org._id, companyName: 'MedVision Healthcare', email: 'accounts@medvision.in', phone: '+91 98765 43210', gstin: '07AAACM3888G1ZR', address: 'Connaught Place, New Delhi 110001', state: 'Delhi', stateCode: '07' },
    { orgId: org._id, companyName: 'Nexgen Solutions Ltd', email: 'billing@nexgen.in', phone: '+91 70000 55432', gstin: '33AAECN7081G1ZF', address: 'Anna Salai, Chennai, Tamil Nadu 600002', state: 'Tamil Nadu', stateCode: '33' },
    { orgId: org._id, companyName: 'Zaptech Innovations', email: 'accounts@zaptech.io', phone: '+91 91234 56789', gstin: '24AAGCZ1234G1ZK', address: 'SG Highway, Ahmedabad, Gujarat 380054', state: 'Gujarat', stateCode: '24' }
  ]);

  // Invoices spread over six months so the dashboard chart has a story.
  const defs = [
    { n: 1, client: 0, date: '2026-02-06', due: '2026-02-21', status: 'paid', paid: '2026-02-18', items: [{ desc: 'Backend API Development', hsn: '998314', qty: 1, rate: 65000, gstRate: 18 }] },
    { n: 2, client: 1, date: '2026-03-03', due: '2026-03-18', status: 'paid', paid: '2026-03-15', items: [{ desc: 'Cloud Infrastructure Setup', hsn: '998316', qty: 1, rate: 120000, gstRate: 18 }, { desc: 'Monthly Support', hsn: '998316', qty: 3, rate: 8000, gstRate: 18 }] },
    { n: 3, client: 2, date: '2026-03-20', due: '2026-04-04', status: 'paid', paid: '2026-04-02', items: [{ desc: 'Data Analytics Dashboard', hsn: '998314', qty: 1, rate: 55000, gstRate: 18 }] },
    { n: 4, client: 0, date: '2026-04-08', due: '2026-04-23', status: 'paid', paid: '2026-04-20', items: [{ desc: 'Web Development Services', hsn: '998314', qty: 1, rate: 85000, gstRate: 18 }, { desc: 'UI/UX Design', hsn: '998314', qty: 1, rate: 25000, gstRate: 18 }] },
    { n: 5, client: 3, date: '2026-05-05', due: '2026-05-20', status: 'paid', paid: '2026-05-19', items: [{ desc: 'Mobile App Development — Phase 1', hsn: '998314', qty: 1, rate: 75000, gstRate: 18 }] },
    { n: 6, client: 4, date: '2026-05-22', due: '2026-06-06', status: 'paid', paid: '2026-06-03', items: [{ desc: 'SEO & Digital Marketing', hsn: '998361', qty: 1, rate: 45000, gstRate: 18 }] },
    { n: 7, client: 1, date: '2026-06-10', due: '2026-06-25', status: 'paid', paid: '2026-06-22', items: [{ desc: 'DevOps Retainer — June', hsn: '998316', qty: 1, rate: 40000, gstRate: 18 }] },
    { n: 8, client: 2, date: '2026-06-15', due: '2026-06-30', status: 'overdue', items: [{ desc: 'Software Consulting', hsn: '998313', qty: 10, rate: 3500, gstRate: 18 }] },
    { n: 9, client: 3, date: '2026-06-28', due: '2026-07-13', status: 'pending', items: [{ desc: 'Mobile App Development — Phase 2', hsn: '998314', qty: 1, rate: 90000, gstRate: 18 }] },
    { n: 10, client: 4, date: '2026-07-02', due: '2026-07-17', status: 'draft', items: [{ desc: 'Social Media Management', hsn: '998361', qty: 2, rate: 12000, gstRate: 18 }, { desc: 'Content Marketing', hsn: '998361', qty: 1, rate: 18000, gstRate: 18 }] }
  ];

  const invoices = [];
  for (const d of defs) {
    const client = clients[d.client];
    invoices.push(await Invoice.create({
      orgId: org._id,
      clientId: client._id,
      invoiceNumber: `KLG-2026-${String(d.n).padStart(3, '0')}`,
      date: new Date(d.date),
      dueDate: new Date(d.due),
      status: d.status,
      paidDate: d.paid ? new Date(d.paid) : undefined,
      items: d.items,
      totals: calculateInvoiceTotals(d.items, org.stateCode, client.stateCode),
      notes: 'Thank you for your business!',
      paymentTerms: 'Net 15',
      bankDetails: bank
    }));
  }

  const methods = ['Bank Transfer', 'UPI', 'NEFT', 'Razorpay', 'Bank Transfer', 'UPI', 'RTGS'];
  let m = 0;
  for (const inv of invoices.filter(i => i.status === 'paid')) {
    await Payment.create({
      orgId: org._id,
      invoiceId: inv._id,
      clientId: inv.clientId,
      amount: inv.totals.total,
      method: methods[m % methods.length],
      reference: `TXN2026${String(100 + m)}`,
      status: 'success',
      date: inv.paidDate,
      note: 'Full payment received'
    });
    m += 1;
  }

  await Subscription.create({ orgId: org._id, planCode: 'business', status: 'active', billingCycle: 'monthly' });

  console.log('Seed complete');
  // Credentials are echoed for local convenience only. In production this would
  // put a live platform-owner password into the hosting provider's log stream,
  // where it is retained and readable by anyone with dashboard access.
  if (env.isProduction) {
    console.log(`Super Admin: ${env.SUPER_ADMIN_EMAIL} / (password as configured in SUPER_ADMIN_PASSWORD)`);
  } else {
    console.log(`Super Admin: ${env.SUPER_ADMIN_EMAIL} / ${env.SUPER_ADMIN_PASSWORD}`);
    console.log('Tenant Admin: admin@techsoft.local / Admin@123');
  }
  process.exit(0);
}

seed().catch(error => {
  console.error(error);
  process.exit(1);
});
