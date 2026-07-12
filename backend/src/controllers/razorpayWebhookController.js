const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');
const { verifyWebhookSignature } = require('../services/razorpayService');

const handleWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const raw = JSON.stringify(req.body);
  if (signature && !verifyWebhookSignature(raw, signature)) {
    throw httpError(400, 'Invalid Razorpay signature');
  }
  res.json({ received: true, event: req.body.event || 'unknown' });
});

module.exports = { handleWebhook };
