db = db.getSiblingDB('klogubizz');

db.organisations.createIndex({ adminEmail: 1 });
db.organisations.createIndex({ status: 1, plan: 1 });

db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ orgId: 1, role: 1 });

db.clients.createIndex({ orgId: 1, companyName: 1 });
db.clients.createIndex({ orgId: 1, gstin: 1 });

db.invoices.createIndex({ orgId: 1, invoiceNumber: 1 }, { unique: true });
db.invoices.createIndex({ orgId: 1, status: 1, date: -1 });
db.invoices.createIndex({ orgId: 1, clientId: 1 });

db.payments.createIndex({ orgId: 1, date: -1 });
db.payments.createIndex({ orgId: 1, status: 1 });
db.payments.createIndex({ invoiceId: 1 });

db.subscriptions.createIndex({ orgId: 1, status: 1 });
db.subscriptions.createIndex({ razorpaySubscriptionId: 1 });

db.plans.createIndex({ code: 1 }, { unique: true });
db.auditlogs.createIndex({ orgId: 1, createdAt: -1 });
