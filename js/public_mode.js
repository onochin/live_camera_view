(() => {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const forcedMode = params.get('public');
  const isGitHubPages = window.location.hostname.endsWith('.github.io');
  const publicMode = forcedMode === '1' || (forcedMode !== '0' && isGitHubPages);

  if (!publicMode) return;

  window.LIVE_CAMERA_PUBLIC_MODE = true;
  document.documentElement.dataset.publicMode = 'true';

  // 公開モードでは、Popup生成より前に外部画像通信そのものを禁止する。
  // 地理院タイルやTerrainはMapLibreのネットワーク取得であり、img-srcの対象外。
  const csp = document.createElement('meta');
  csp.httpEquiv = 'Content-Security-Policy';
  csp.content = "img-src 'self' data: blob:;";
  document.head.appendChild(csp);

  function isDirectImageUrl(href) {
    try {
      const url = new URL(href, window.location.href);
      return /\.(?:jpe?g|png|webp)$/i.test(url.pathname) || url.pathname.includes('/snapshot/');
    } catch {
      return false;
    }
  }

  function sanitizeCameraPopup(popup) {
    popup.querySelectorAll('img').forEach(img => img.remove());

    popup.querySelectorAll('.links a').forEach(link => {
      if (isDirectImageUrl(link.href)) link.remove();
    });

    const officialLink = [...popup.querySelectorAll('.links a')]
      .find(link => link.textContent.includes('公式'));
    if (officialLink && officialLink.textContent !== '公式ライブカメラを開く') {
      officialLink.textContent = '公式ライブカメラを開く';
    }
  }

  function sanitizeAllPopups(root = document) {
    root.querySelectorAll('.camera-popup').forEach(sanitizeCameraPopup);
  }

  function addPublicModeNotice() {
    if (document.getElementById('public-mode-notice')) return;
    const header = document.querySelector('.sidebar-header');
    if (!header) return;

    const notice = document.createElement('div');
    notice.id = 'public-mode-notice';
    notice.className = 'status';
    notice.innerHTML = '公開モード：外部ライブカメラ画像は取得・埋め込みせず、公式サイトへのリンクのみ表示します。<br><a href="docs/public_notice.html" target="_blank" rel="noopener">出典・利用上の注意</a>';
    header.insertAdjacentElement('afterend', notice);
  }

  const observer = new MutationObserver(() => sanitizeAllPopups());

  window.addEventListener('DOMContentLoaded', () => {
    addPublicModeNotice();
    sanitizeAllPopups();
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
