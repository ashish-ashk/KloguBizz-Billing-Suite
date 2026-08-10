/**
 * The reference data a KloguBizz platform needs before it can take a customer.
 *
 * Extracted from `seed.js` so `bootstrap.js` can insert exactly the same plans,
 * masters, settings and reminder templates **without** also inserting the demo
 * tenant that `seed.js` exists to create. Two copies of this list would drift,
 * and the drift would surface as a production platform missing a payment method
 * or a GST rate that every developer machine has.
 *
 * Data only — no database calls, so either caller decides whether it is writing
 * into an empty database or upserting into a live one.
 */

const PLANS = [
  { code: 'starter', name: 'Starter', monthlyPrice: 999, yearlyPrice: 9990, userLimit: 3, invoiceLimit: 100, sortOrder: 1, features: ['GST Invoicing', 'Bill Generator', 'Payment Tracking', 'Email Support'] },
  { code: 'growth', name: 'Growth', monthlyPrice: 2499, yearlyPrice: 24990, userLimit: 10, invoiceLimit: 500, sortOrder: 2, features: ['Everything in Starter', 'Multi-user & Roles', 'Client Portal', 'Priority Support', 'Custom Branding'] },
  { code: 'business', name: 'Business', monthlyPrice: 5999, yearlyPrice: 59990, userLimit: 25, invoiceLimit: 2000, sortOrder: 3, features: ['Everything in Growth', 'Advanced Reports', 'API Access', 'Dedicated Manager', 'SLA 99.9%'] },
  { code: 'enterprise', name: 'Enterprise', monthlyPrice: null, yearlyPrice: null, userLimit: 999, invoiceLimit: 999999, sortOrder: 4, features: ['Unlimited users', 'Custom integrations', 'On-premise option', '24/7 Phone Support', 'Custom contracts'] }
];

const MASTERS = [
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

const SETTINGS = [
  { key: 'branding', value: { appName: 'Klogu Bizz', tagline: 'GST Billing Suite', primaryColor: '#4F46E5', secondaryColor: '#312E81', accentColor: '#818CF8', supportEmail: 'support@klogubizz.com', websiteUrl: 'https://klogubizz.com', logoUrl: '', faviconUrl: '' } },
  { key: 'email', value: { senderName: 'Klogu Bizz Billing', senderEmail: 'billing@klogubizz.com', replyTo: 'support@klogubizz.com', bcc: '', footer: 'Klogu Bizz — GST Billing Suite. This is an automated message.' } },
  { key: 'templateConfig', value: { paperSize: 'A4', fontSize: 'medium', watermark: 'DRAFT', accentColor: '#4F46E5', showLogo: true, showSignature: true, showBankDetails: true, showAmountInWords: true, showGstBreakdown: true, showQrCode: false } },
  { key: 'receipt', value: { autoSend: true, includeInvoiceCopy: true, subject: 'Payment received — thank you!', bodyIntro: 'We have received your payment. Please find the receipt details below.' } }
];

const REMINDERS = [
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
  ];

module.exports = { PLANS, MASTERS, SETTINGS, REMINDERS };
