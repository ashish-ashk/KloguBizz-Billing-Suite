const { GlobalSetting } = require('../models/Settings');
const { asyncHandler } = require('../utils/asyncHandler');
const { platformAssetUrl } = require('../services/brandingAssetService');

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
  const setting = await GlobalSetting.findOne({ key: 'branding' }).lean();
  const branding = { ...DEFAULT_BRANDING, ...(setting?.value || {}) };
  // The logo and favicon go out as cacheable asset URLs rather than base64. This
  // endpoint is unauthenticated and is hit by *every* visitor to the login page,
  // so inlining them meant re-sending up to a megabyte of image to every visitor
  // on every visit, with no way for the browser to cache it.
  res.json({
    appName: branding.appName,
    tagline: branding.tagline,
    primaryColor: branding.primaryColor,
    secondaryColor: branding.secondaryColor,
    accentColor: branding.accentColor,
    // Either field may hold the image — an object-storage key once #45's
    // migration has run, the legacy inline data URI before that.
    logoAssetUrl: platformAssetUrl('logo', { key: branding.logoKey, dataUri: branding.logoUrl }),
    faviconAssetUrl: platformAssetUrl('favicon', { key: branding.faviconKey, dataUri: branding.faviconUrl }),
    // Kept in the shape for compatibility, but deliberately empty — the bytes
    // now come from the asset endpoints above.
    logoUrl: '',
    faviconUrl: ''
  });
});

module.exports = { publicBranding };
