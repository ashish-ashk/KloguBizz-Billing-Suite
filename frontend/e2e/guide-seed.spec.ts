import { test, expect } from '@playwright/test';

/**
 * Sets up the tenant the user-guide screenshots are taken from.
 *
 * Realistic-but-fictional: a Mumbai fabrication business with customers in two
 * states (so the invoice shows both an intra-state CGST+SGST split and an
 * inter-state IGST one), a mix of goods and services, and a few months of
 * collections so the dashboard is not empty.
 */

const API = 'http://127.0.0.1:5000/api/v1';
const EMAIL = 'owner@auroraindustries.in';

test('seed the guide tenant', async ({ request }) => {
  test.setTimeout(300_000);
  const login = await request.post(`${API}/auth/login`, { data: { email: EMAIL, password: 'Password@123' } });
  expect(login.ok(), await login.text()).toBeTruthy();
  const auth = { Authorization: `Bearer ${(await login.json()).token}` };

  await request.put(`${API}/organisations/current`, {
    headers: auth,
    data: {
      gstin: '27AAPFU0939F1ZV', state: 'Maharashtra', stateCode: '27',
      address: 'Unit 4, Kalpataru Estate, Andheri East, Mumbai 400093',
      phone: '02248005000', email: 'accounts@auroraindustries.in',
      bankName: 'HDFC Bank', bankAccount: '50100123456789', bankIfsc: 'HDFC0001234',
      termsAndConditions: 'Goods once sold will not be taken back. Interest at 18% per annum on overdue amounts.'
    }
  });

  const CLIENTS = [
    { companyName: 'Bharat Logistics LLP', gstin: '27AAACT2727Q1ZW', stateCode: '27', state: 'Maharashtra',
      email: 'accounts@bharatlogistics.example', phone: '9820011223',
      address: 'Plot 14, MIDC Bhosari, Pune 411019' },
    { companyName: 'Chennai Silk House', gstin: '33AAACT2727Q1Z3', stateCode: '33', state: 'Tamil Nadu',
      email: 'billing@chennaisilk.example', phone: '9840055667',
      address: '22 Ranganathan Street, T Nagar, Chennai 600017' },
    { companyName: 'Deccan Hardware Stores', stateCode: '27', state: 'Maharashtra',
      email: 'deccan@hardware.example', phone: '9922334455',
      address: 'Shop 8, Laxmi Road, Pune 411030' }
  ];
  const clientIds: string[] = [];
  for (const c of CLIENTS) {
    const res = await request.post(`${API}/clients`, { headers: auth, data: c });
    if (res.ok()) clientIds.push((await res.json())._id);
    else console.log('client failed:', c.companyName, await res.text());
  }

  const ITEMS = [
    { itemCode: 'FAB-001', name: 'Structural steel fabrication', type: 'service', hsn: '998314',
      unit: 'Nos', gstRate: 18, sellingPrice: 45000, category: 'Fabrication' },
    { itemCode: 'AMC-001', name: 'Annual maintenance contract', type: 'service', hsn: '998729',
      unit: 'Nos', gstRate: 18, sellingPrice: 120000, category: 'Support' },
    { itemCode: 'MSA-016', name: 'MS Angle 50x50x6mm', type: 'goods', hsn: '7216',
      unit: 'Kg', gstRate: 18, sellingPrice: 82, purchasePrice: 66, stockQty: 2400, reorderLevel: 500, category: 'Raw material' },
    { itemCode: 'GIS-002', name: 'GI Sheet 2mm', type: 'goods', hsn: '7210',
      unit: 'Nos', gstRate: 18, sellingPrice: 3150, purchasePrice: 2600, stockQty: 140, reorderLevel: 40, category: 'Raw material' }
  ];
  for (const i of ITEMS) {
    const res = await request.post(`${API}/items`, { headers: auth, data: i });
    if (!res.ok()) console.log('item failed:', i.name, await res.text());
  }

  // A few months of invoices, most paid, one left overdue so the dashboard has
  // something in the Overdue tile — a guide screenshot of all-zeroes teaches nothing.
  const MONTHS = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08'];
  for (const [n, month] of MONTHS.entries()) {
    const clientId = clientIds[n % clientIds.length];
    const res = await request.post(`${API}/invoices`, {
      headers: auth,
      data: {
        clientId, date: `${month}-04`, dueDate: `${month}-19`,
        items: [
          { desc: 'Structural steel fabrication', hsn: '998314', qty: 3, rate: 45000, gstRate: 18 },
          { desc: 'MS Angle 50x50x6mm', hsn: '7216', qty: 200, rate: 82, gstRate: 18 }
        ]
      }
    });
    if (!res.ok()) { console.log('invoice failed', month, await res.text()); continue; }
    const inv = await res.json();
    console.log(month, inv.invoiceNumber, inv.totals.total);
    if (n < MONTHS.length - 2) {
      await request.post(`${API}/payments`, {
        headers: auth,
        data: { invoiceId: inv._id, amount: inv.totals.total, date: `${month}-15`, mode: 'bank_transfer', reference: `NEFT${month.replace('-', '')}` }
      });
    }
  }
});
