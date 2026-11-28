window.AppUtils = {
  getUser() {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  },

  saveAuth(user) {
    localStorage.setItem('user', JSON.stringify(user));
    this.updateNavbar();
  },

  clearAuth() {
    localStorage.removeItem('user');
    this.updateNavbar();
  },

  async syncCurrentUser() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (res.ok && data.success) {
        this.saveAuth(data.user);
        return data.user;
      }
    } catch (error) {
      // Ignore sync failures and fall back to guest UI.
    }

    this.clearAuth();
    return null;
  },

  async logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      // Clear client state even if the network request fails.
    }

    this.clearAuth();
    window.location.href = '/login';
  },

  esc(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: 'check_circle', error: 'error', info: 'info' };
    toast.innerHTML = `<span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1;font-size:20px">${icons[type] || 'info'}</span>${this.esc(message)}`;
    container.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  },

  formatPrice(price) {
    if (price === undefined || price === null || Number.isNaN(Number(price))) {
      return 'Liên hệ';
    }

    return `${new Intl.NumberFormat('vi-VN').format(price)}đ`;
  },

  formatBudgetRange(min, max) {
    const normalizedMin = min === undefined || min === null || min === '' ? undefined : Number(min);
    const normalizedMax = max === undefined || max === null || max === '' ? undefined : Number(max);

    if (Number.isFinite(normalizedMin) && Number.isFinite(normalizedMax)) {
      return `${this.formatPrice(normalizedMin)} - ${this.formatPrice(normalizedMax)}`;
    }

    if (Number.isFinite(normalizedMin)) {
      return `Từ ${this.formatPrice(normalizedMin)}`;
    }

    if (Number.isFinite(normalizedMax)) {
      return `Tối đa ${this.formatPrice(normalizedMax)}`;
    }

    return 'Ngân sách linh hoạt';
  },

  timeAgo(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 30) return `${days} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  },

  categoryLabel(category) {
    const labels = {
      sach: 'Sách & Tài liệu',
      'dien-tu': 'Điện tử',
      'do-dung': 'Đồ dùng',
      'thoi-trang': 'Thời trang',
      xe: 'Xe & Phương tiện',
      khac: 'Khác'
    };

    return labels[category] || 'Khác';
  },

  urgencyLabel(level) {
    const labels = {
      low: 'Chưa gấp',
      medium: 'Cần trong tuần',
      high: 'Cần gấp'
    };

    return labels[level] || 'Cần phản hồi';
  },

  listingTypeLabel(listingType) {
    return listingType === 'wanted' ? 'Đang cần' : 'Đang bán';
  },

  statusLabel(product) {
    const wantedLabels = {
      available: 'Đang cần',
      sold: 'Đã tìm được',
      reserved: 'Đang trao đổi'
    };
    const sellLabels = {
      available: 'Đang bán',
      sold: 'Đã bán',
      reserved: 'Đã đặt'
    };

    return (product.listingType === 'wanted' ? wantedLabels : sellLabels)[product.status] || product.status;
  },

  transactionStatusBadge(status) {
    const config = {
      available: { label: 'Đang bán', bg: 'bg-green-100', text: 'text-green-700', icon: 'sell', dot: false },
      negotiating: { label: 'Đang thương lượng', bg: 'bg-amber-100', text: 'text-amber-700', icon: 'handshake', dot: true },
      deposited: { label: 'Đã đặt cọc', bg: 'bg-orange-100', text: 'text-orange-700', icon: 'payments', dot: false },
      sold: { label: 'Đã bán', bg: 'bg-gray-100', text: 'text-gray-500', icon: 'check_circle', dot: false }
    };
    const s = config[status] || config.available;
    const dotHtml = s.dot ? '<span class="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mr-1"></span>' : '';
    return `<span class="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold ${s.bg} ${s.text}">${dotHtml}<span class="material-symbols-outlined text-xs">${s.icon}</span>${s.label}</span>`;
  },

  async contactListingOwner(ownerId, productId) {
    const user = this.getUser() || await this.syncCurrentUser();
    if (!user) {
      window.location.href = '/login';
      return;
    }

    if (!ownerId || ownerId === user._id) {
      this.showToast('Đây là bài đăng của bạn', 'info');
      return;
    }

    window.location.href = `/messages?userId=${ownerId}&productId=${productId}`;
  },

  productCard(product) {
    return product.listingType === 'wanted'
      ? this.wantedCard(product)
      : this.sellCard(product);
  },

  placeholderImage: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%23e8ece6'/%3E%3Cpath d='M20 12 10 17l10 5 10-5z' fill='%23c9d1cb'/%3E%3C/svg%3E",

  // Cloudinary can hand back a right-sized copy instead of the full upload.
  sizedImage(url, w) {
    return String(url || '').includes('/upload/') ? url.replace('/upload/', `/upload/w_${w},c_limit,f_auto,q_auto/`) : url;
  },

  shortPlace(product) {
    const points = product.meetingPoints && product.meetingPoints.length ? product.meetingPoints : [product.location];
    const names = [...new Set(points.filter(Boolean).map((p) => String(p).split(' - ')[0]))];
    if (!names.length) return 'Trong trường';
    return names.slice(0, 2).join(', ') + (names.length > 2 ? ` +${names.length - 2}` : '');
  },

  sellCard(product) {
    const image = product.images && product.images.length > 0
      ? this.esc(this.sizedImage(product.images[0], 600))
      : this.placeholderImage;
    const txStatus = product.transactionStatus || 'available';
    const txFlag = { negotiating: 'Đang thương lượng', deposited: 'Đã cọc', sold: 'Đã bán' }[txStatus];
    const isNew = Date.now() - new Date(product.createdAt).getTime() < 7 * 24 * 3600 * 1000;

    return `
      <a href="/product/${product._id}" class="pcard ${txStatus === 'sold' ? 'is-sold' : ''}">
        <div class="pcard__photo">
          <img src="${image}" alt="${this.esc(product.title)}" loading="lazy" width="600" height="600"/>
          <div class="pcard__flags">
            ${isNew ? '<span class="pcard__flag pcard__flag--new">Mới đăng</span>' : ''}
            ${txFlag ? `<span class="pcard__flag pcard__flag--warm">${txFlag}</span>` : ''}
          </div>
        </div>
        <div class="pcard__label">
          <h3 class="pcard__name">${this.esc(product.title)}</h3>
          <p class="pcard__row"><span class="pcard__price">${this.formatPrice(product.price)}</span><span class="pcard__cond">${product.condition === 'new' ? 'Còn mới' : 'Đã dùng'}</span></p>
          <p class="pcard__meta"><span><span class="material-symbols-outlined" aria-hidden="true">location_on</span>${this.esc(this.shortPlace(product))}</span><span>${this.timeAgo(product.createdAt)}</span></p>
        </div>
      </a>
    `;
  },

  wantedCard(product) {
    const sellerId = product.seller?._id || '';
    const contextTokens = [product.courseCode, product.faculty].filter(Boolean);
    const chips = contextTokens.map((t) => `<span class="chip-soft">${this.esc(t)}</span>`).join('');

    return `
      <div class="slipcard">
        <span class="slipcard__kicker">${this.urgencyLabel(product.urgency)} · ${this.timeAgo(product.createdAt)}</span>
        <a href="/product/${product._id}" class="slipcard__name hover:text-[#005f69]">${this.esc(product.title)}</a>
        <p class="slipcard__desc">${this.esc(product.description || 'Sinh viên UEH đang tìm món đồ này.')}</p>
        ${chips ? `<div class="slipcard__chips">${chips}</div>` : ''}
        <span class="slipcard__budget">${this.formatBudgetRange(product.budgetMin, product.budgetMax)}</span>
        <button type="button" onclick="window.AppUtils.contactListingOwner('${sellerId}', '${product._id}')" class="btn btn--primary w-full mt-1">Tôi có món này</button>
      </div>
    `;
  },

  dashboardCard(product) {
    const image = product.images && product.images.length > 0
      ? this.esc(product.images[0])
      : this.placeholderImage;
    const isWanted = product.listingType === 'wanted';
    const amountDisplay = isWanted
      ? this.formatBudgetRange(product.budgetMin, product.budgetMax)
      : this.formatPrice(product.price);
    const typeBadgeClass = isWanted
      ? 'bg-[#fbe3d3] text-[#a3421a]'
      : 'bg-[#d6eae8] text-[#004e57]';

    // Transaction status for sell listings
    const txStatus = product.transactionStatus || 'available';
    const txBadgeConfig = {
      available: 'bg-green-100 text-green-700',
      negotiating: 'bg-amber-100 text-amber-700',
      deposited: 'bg-orange-100 text-orange-700',
      sold: 'bg-gray-100 text-gray-500'
    };
    const txLabels = {
      available: 'Đang bán',
      negotiating: 'Thương lượng',
      deposited: 'Đã đặt cọc',
      sold: 'Đã bán'
    };

    // For wanted listings, use old status system
    const wantedStatusColors = {
      available: 'bg-green-100 text-green-700',
      sold: 'bg-gray-100 text-gray-500'
    };
    const wantedLabels = {
      available: 'Đang cần',
      sold: 'Đã tìm được'
    };

    const badgeClass = isWanted ? (wantedStatusColors[product.status] || '') : (txBadgeConfig[txStatus] || '');
    const badgeLabel = isWanted ? (wantedLabels[product.status] || product.status) : (txLabels[txStatus] || txStatus);

    // Status control: dropdown for sell, toggle for wanted
    let statusControl;
    if (isWanted) {
      const toggleLabel = product.status === 'available' ? 'Đánh dấu đã tìm được' : 'Mở lại nhu cầu';
      statusControl = `<button onclick="toggleStatus('${product._id}','${product.status}','wanted')" class="flex-1 text-xs py-2 bg-[#e8ece6] text-[#004e57] rounded-lg font-semibold hover:bg-[#d6ddd6] transition-colors">${toggleLabel}</button>`;
    } else {
      statusControl = `
        <select onchange="handleTxStatusChange('${product._id}', '${txStatus}', this)" class="flex-1 text-xs py-2 px-2 bg-[#e8ece6] text-[#004e57] rounded-lg font-semibold border-none focus:ring-2 focus:ring-primary cursor-pointer">
          <option value="available" ${txStatus === 'available' ? 'selected' : ''}>Đang bán</option>
          <option value="negotiating" ${txStatus === 'negotiating' ? 'selected' : ''}>Thương lượng</option>
          <option value="deposited" ${txStatus === 'deposited' ? 'selected' : ''}>Đã đặt cọc</option>
          <option value="sold" ${txStatus === 'sold' ? 'selected' : ''}>Đã bán</option>
        </select>`;
    }

    return `
      <div class="bg-white rounded-xl overflow-hidden shadow-sm ghost-border" data-product-id="${product._id}">
        <div class="h-40 overflow-hidden"><img class="w-full h-full object-cover" src="${image}" alt="${this.esc(product.title)}"/></div>
        <div class="p-4 space-y-2">
          <div class="flex items-center justify-between gap-2">
            <span class="tx-badge text-xs font-bold px-2 py-1 rounded ${badgeClass}">${badgeLabel}</span>
            <span class="text-xs px-2 py-1 rounded ${typeBadgeClass} font-bold">${this.listingTypeLabel(product.listingType)}</span>
          </div>
          <h3 class="font-bold text-sm line-clamp-2">${this.esc(product.title)}</h3>
          <div class="text-primary font-black">${amountDisplay}</div>
          <div class="text-xs text-[#6e8083]">${this.timeAgo(product.createdAt)}</div>
          <div class="flex gap-2 pt-2">
            ${statusControl}
            <button onclick="deleteProduct('${product._id}')" class="text-xs py-2 px-3 bg-red-50 text-red-600 rounded-lg font-semibold hover:bg-red-100 transition-colors">
              <span class="material-symbols-outlined text-sm">delete</span>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  updateNavbar() {
    const authDiv = document.getElementById('navbar-auth');
    if (!authDiv) return;

    const user = this.getUser();
    if (!user) return;
    document.querySelectorAll('.nav-guest-only').forEach((el) => el.remove());

    const adminLink = user.role === 'admin'
      ? `<a href="/admin" class="text-slate-600 hover:bg-[#eef1ec] p-2 rounded-lg transition-all" title="Admin"><span class="material-symbols-outlined text-red-500">admin_panel_settings</span></a>`
      : '';

    authDiv.innerHTML = `
      ${adminLink}
      <a href="/messages" class="relative text-slate-600 hover:bg-[#eef1ec] p-2 rounded-lg transition-all" title="Tin nhắn">
        <span id="unread-badge" class="hidden absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-[#C4511A] text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none z-10">0</span>
        <span class="material-symbols-outlined">chat</span>
      </a>
      <a href="/dashboard" class="hidden sm:inline-block text-slate-600 hover:bg-[#eef1ec] p-2 rounded-lg transition-all" title="Dashboard"><span class="material-symbols-outlined">dashboard</span></a>
      <a href="/profile" class="flex items-center gap-2 text-slate-600 hover:bg-[#eef1ec] px-2 sm:px-3 py-2 rounded-lg transition-all text-sm font-semibold" title="Hồ sơ">
        <span class="material-symbols-outlined text-[#004e57]">account_circle</span><span class="hidden sm:inline">${this.esc(user.name.split(' ').pop())}</span>
      </a>
      <a href="/post-ad" class="bg-[#C4511A] text-white px-4 py-2.5 rounded-lg font-bold hover:brightness-95 active:translate-y-px transition text-sm whitespace-nowrap">Đăng tin</a>
    `;
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  await window.AppUtils.syncCurrentUser();
  window.AppUtils.updateNavbar();

  // Start polling unread count after navbar is rendered
  if (document.querySelector('a[href="/messages"]')) {
    pollUnreadCount();
    setInterval(pollUnreadCount, 30000);
  }
});

// === Unread message badge polling ===
async function pollUnreadCount() {
  const badge = document.getElementById('unread-badge');
  if (!badge) return;
  try {
    const res = await fetch('/api/messages/unread-count', { credentials: 'include' });
    if (!res.ok) return;
    const { count = 0 } = await res.json();
    if (count > 0) {
      badge.textContent = count > 9 ? '9+' : String(count);
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  } catch (e) { /* silent fail — không break nếu user chưa đăng nhập */ }
}
