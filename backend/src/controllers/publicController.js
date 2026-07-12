const { GlobalSetting } = require('../models/Settings');
const { asyncHandler } = require('../utils/asyncHandler');

const DEFAULT_BRANDING = {
  appName: 'Klogu Bizz',
  tagline: 'GST Billing Suite',
  primaryColor: '#4F46E5',
  secondaryColor: '#312E81',
  accentColor: '#818CF8',
  logoUrl: '',
  faviconUrl: ''
};

// Unauthenticated: the login/register screens need the platform's branding
// before anyone has signed in, so this only exposes the safe display fields.
const publicBranding = asyncHandler(async (req, res) => {
  const setting = await GlobalSetting.findOne({ key: 'branding' });
  const branding = { ...DEFAULT_BRANDING, ...(setting?.value || {}) };
  res.json({
    appName: branding.appName,
    tagline: branding.tagline,
    primaryColor: branding.primaryColor,
    secondaryColor: branding.secondaryColor,
    accentColor: branding.accentColor,
    logoUrl: branding.logoUrl,
    faviconUrl: branding.faviconUrl
  });
});

module.exports = { publicBranding };
