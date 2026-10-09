import { createHmac, timingSafeEqual } from 'crypto';
import { NotFoundException } from '@nestjs/common';
import { requiredSecret } from './security';
export function claimToken(reward: { id: string; claimKeyVersion: string }) {
  const keys = JSON.parse(requiredSecret('SPORTS_CLAIM_KEYS'));
  const key = keys[reward.claimKeyVersion];
  if (typeof key !== 'string' || key.length < 32) throw new Error('Badge signing key unavailable');
  const signature = createHmac('sha256', key).update(`${reward.id}:${reward.claimKeyVersion}`).digest('base64url');
  return `${reward.id}.${signature}`;
}
export function verifyClaim(token: string, reward: any) {
  const expected = Buffer.from(claimToken(reward));
  const supplied = Buffer.from(token);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) throw new NotFoundException('Badge not found');
}
function escapeXml(value: any) {
  return String(value || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]!));
}
export function renderBadge(reward: any) {
  const s = reward.snapshot;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="700" viewBox="0 0 900 700" role="img" aria-label="Nature Backers participation badge"><rect width="900" height="700" rx="40" fill="#073b32"/><circle cx="450" cy="150" r="60" fill="#a7e8ae"/><text x="450" y="170" text-anchor="middle" font-size="50" fill="#073b32">NB</text><g fill="white" text-anchor="middle" font-family="sans-serif"><text x="450" y="280" font-size="40">Nature Backer</text><text x="450" y="345" font-size="25">${escapeXml(String(s.event).slice(0, 55))}</text><text x="450" y="400" font-size="22">${escapeXml(String(s.project.name).slice(0, 60))}</text><text x="450" y="455" font-size="18">Participation recorded · ${escapeXml(new Date(reward.issuedAt).toISOString().slice(0, 10))}</text><text x="450" y="525" font-size="15">Badge ${escapeXml(reward.id)}</text><text x="450" y="575" font-size="18">${s.fixture ? 'DEVELOPMENT FIXTURE — not a verified Atlas project' : 'Project data from Sustainability Atlas'}</text></g></svg>`;
}
