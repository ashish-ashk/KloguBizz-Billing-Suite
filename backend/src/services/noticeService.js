const { GlobalSetting } = require('../models/Settings');
const { logger } = require('../utils/logger');

/**
 * The banners a tenant sees: their own operator-authored notice, plus any
 * platform-wide announcement.
 *
 * Both are read on `/auth/me` and `/organisations/current`, which is every page
 * load, so the platform one is cached for a minute — and both are filtered by
 * expiry *here* rather than in the browser. A client-side expiry check means a
 * lapsed banner keeps showing to any tab that was already open, and means an old
 * client shows it forever.
 */

const CACHE_TTL_MS = 60 * 1000;
let cache = { value: null, at: 0 };

function isLive(notice) {
  if (!notice || !notice.message) return false;
  if (!notice.expiresAt) return true;
  return new Date(notice.expiresAt).getTime() > Date.now();
}

async function platformNotice() {
  if (cache.value !== null && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;
  let notice = null;
  try {
    const setting = await GlobalSetting.findOne({ key: 'platformNotice' }).lean();
    notice = isLive(setting?.value) ? setting.value : null;
  } catch (error) {
    // A banner is not worth failing a page load over.
    logger.warn('platform notice unreadable', { err: error });
  }
  cache = { value: notice, at: Date.now() };
  return notice;
}

function invalidatePlatformNotice() {
  cache = { value: null, at: 0 };
}

/**
 * Both banners for one organisation, newest first, with expired ones removed.
 *
 * Returns an array because the tenant can legitimately be shown two at once (a
 * platform maintenance window *and* a message about their own account), and
 * collapsing them would mean silently dropping one.
 */
async function noticesFor(org) {
  const notices = [];
  const platform = await platformNotice();
  if (platform) notices.push({ ...platform, scope: 'platform' });
  const own = org?.notice;
  if (isLive(own)) {
    notices.push({
      message: own.message,
      level: own.level,
      expiresAt: own.expiresAt,
      createdAt: own.createdAt,
      scope: 'organisation'
    });
  }
  return notices;
}

module.exports = { noticesFor, platformNotice, invalidatePlatformNotice, isLive };
