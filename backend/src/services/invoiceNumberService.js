const { Organisation } = require('../models/Organisation');

async function nextInvoiceNumber(orgId) {
  const org = await Organisation.findByIdAndUpdate(
    orgId,
    { $inc: { invoiceSequence: 1 } },
    { new: true }
  );
  const year = new Date().getFullYear();
  const prefix = org.brandingConfig?.invoicePrefix || 'KLG';
  return `${prefix}-${year}-${String(org.invoiceSequence).padStart(3, '0')}`;
}

module.exports = { nextInvoiceNumber };
