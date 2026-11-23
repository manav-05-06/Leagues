/**
 * Export tactics board to 1080x1350 PNG for sharing on WhatsApp / Instagram.
 */

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function exportBoardToImage(svgElement, board) {
  if (!svgElement) return;

  const width = 1080;
  const height = 1350;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 1. Dark pitch background
  ctx.fillStyle = '#08170f';
  ctx.fillRect(0, 0, width, height);

  // Subtle border / frame
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  // 2. Header: Title & Teams
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(board.name || 'Tactics Board', width / 2, 75);

  const teamA = board.teams.a;
  const teamB = board.teams.b;

  // Logos
  const logoAUrl = teamA.logo || (teamA.teamId ? `https://a.espncdn.com/i/teamlogos/soccer/500/${teamA.teamId}.png` : null);
  const logoBUrl = teamB.logo || (teamB.teamId ? `https://a.espncdn.com/i/teamlogos/soccer/500/${teamB.teamId}.png` : null);

  const [imgA, imgB] = await Promise.all([loadImage(logoAUrl), loadImage(logoBUrl)]);

  // Draw Matchup Row
  const bannerY = 125;
  ctx.font = '600 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  // Team A (Left)
  ctx.textAlign = 'right';
  ctx.fillStyle = teamA.color || '#00ff87';
  ctx.fillText(`${teamA.name} (${teamA.formation})`, width / 2 - 60, bannerY + 22);
  if (imgA) {
    ctx.drawImage(imgA, width / 2 - 50 - 32, bannerY - 6, 32, 32);
  }

  // VS Badge (Centre)
  ctx.textAlign = 'center';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '800 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('VS', width / 2, bannerY + 20);

  // Team B (Right)
  ctx.textAlign = 'left';
  ctx.fillStyle = teamB.color || '#00f2fe';
  ctx.font = '600 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  if (imgB) {
    ctx.drawImage(imgB, width / 2 + 25, bannerY - 6, 32, 32);
  }
  ctx.fillText(`${teamB.name} (${teamB.formation})`, width / 2 + 65, bannerY + 22);

  // 3. Serialise Pitch SVG to Image
  const svgClone = svgElement.cloneNode(true);
  svgClone.setAttribute('width', '680');
  svgClone.setAttribute('height', '1050');

  const svgXml = new XMLSerializer().serializeToString(svgClone);
  const svgBlob = new Blob([svgXml], { type: 'image/svg+xml;charset=utf-8' });
  const blobUrl = URL.createObjectURL(svgBlob);

  const pitchImg = await loadImage(blobUrl);
  URL.revokeObjectURL(blobUrl);

  if (pitchImg) {
    // Pitch area: fit inside 700x1080 centred
    const pitchW = 700;
    const pitchH = (pitchW / 68) * 105;
    const pitchX = (width - pitchW) / 2;
    const pitchY = 180;
    ctx.drawImage(pitchImg, pitchX, pitchY, pitchW, pitchH);
  }

  // 4. Footer
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Made with Leagues · data: ESPN', width / 2, height - 40);

  // 5. Trigger download
  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `${(board.name || 'tactics-board').toLowerCase().replace(/\s+/g, '-')}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
