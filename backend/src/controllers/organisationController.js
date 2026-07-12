const { Organisation } = require('../models/Organisation');
const { asyncHandler } = require('../utils/asyncHandler');
const { httpError } = require('../utils/httpError');

const getOrganisation = asyncHandler(async (req, res) => {
  const org = await Organisation.findById(req.orgId);
  if (!org) throw httpError(404, 'Organisation not found');
  res.json(org);
});

const updateOrganisation = asyncHandler(async (req, res) => {
  const org = await Organisation.findByIdAndUpdate(req.orgId, req.body, { new: true, runValidators: true });
  if (!org) throw httpError(404, 'Organisation not found');
  res.json(org);
});

module.exports = { getOrganisation, updateOrganisation };
