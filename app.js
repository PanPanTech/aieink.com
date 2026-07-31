/* ===================================================================
   AiESL — shared script (app.js)
   =================================================================== */

var INQUIRY_ENDPOINT = 'https://inquiry.panpantechnology.com/api/inquiries';

/* ===== MOBILE DRAWER ===== */
function toggleDrawer() {
  var d = document.getElementById('drawer');
  if (d) d.classList.toggle('open');
}

/* ===== QUOTE MODAL ===== */
function openModal() {
  var m = document.getElementById('modalOverlay');
  if (!m) return;
  m.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  var m = document.getElementById('modalOverlay');
  if (!m) return;
  m.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(function () {
    var fs = document.getElementById('formStage');
    var ss = document.getElementById('successStage');
    if (fs) fs.style.display = 'block';
    if (ss) ss.style.display = 'none';
  }, 300);
}
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeModal();
});

function getQueryValue(name) {
  try {
    return new URLSearchParams(window.location.search).get(name) || '';
  } catch (e) {
    return '';
  }
}

function interestLabel(value) {
  var labels = {
    'esl-hardware': 'ESL hardware / price tags',
    'ai-pricing': 'AI dynamic pricing',
    'middleware': 'Open middleware platform',
    'full-solution': 'Full retail solution'
  };
  return labels[value] || value || 'Retail Data Platform';
}

function setSubmitLoading(form, loading) {
  var button = form ? form.querySelector('button[type="submit"]') : null;
  if (!button) return;
  if (!button.getAttribute('data-original-label')) {
    button.setAttribute('data-original-label', button.textContent);
  }
  button.disabled = loading;
  button.textContent = loading ? 'Sending...' : button.getAttribute('data-original-label');
}

/* ===== QUOTE FORM: VALIDATION + SUBMIT ===== */
function initQuoteForm() {
  var form = document.getElementById('quoteForm');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var fields = [
      { id: 'f-name', err: 'e-name', check: function (v) { return v.trim().length > 1; } },
      { id: 'f-email', err: 'e-email', check: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); } },
      { id: 'f-company', err: 'e-company', check: function (v) { return v.trim().length > 1; } }
    ];
    var valid = true;
    fields.forEach(function (f) {
      var el = document.getElementById(f.id);
      var errEl = document.getElementById(f.err);
      if (!f.check(el.value)) {
        el.classList.add('err'); errEl.classList.add('show'); valid = false;
      } else {
        el.classList.remove('err'); errEl.classList.remove('show');
      }
    });
    if (!valid) return;

    var data = {
      name: document.getElementById('f-name').value.trim(),
      email: document.getElementById('f-email').value.trim(),
      company: document.getElementById('f-company').value.trim(),
      country: document.getElementById('f-country').value.trim(),
      stores: document.getElementById('f-stores').value,
      interest: document.getElementById('f-interest').value,
      message: document.getElementById('f-message').value.trim()
    };

    var payload = {
      name: data.name,
      email: data.email,
      company: data.company,
      country: data.country,
      stores: data.stores,
      product_interest: interestLabel(data.interest),
      interest: data.interest,
      message: data.message,
      lead_brand: 'AiESL Global',
      site_domain: window.location.hostname,
      page_url: window.location.href,
      page_title: document.title,
      language: document.documentElement.lang || navigator.language || 'en',
      market: 'global',
      utm_source: getQueryValue('utm_source'),
      utm_medium: getQueryValue('utm_medium'),
      utm_campaign: getQueryValue('utm_campaign'),
      utm_term: getQueryValue('utm_term'),
      utm_content: getQueryValue('utm_content')
    };

    setSubmitLoading(form, true);
    fetch(INQUIRY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (body) {
          if (!response.ok || body.ok === false) {
            throw new Error(body.error || 'submit_failed');
          }
          return body;
        });
      })
      .then(function () {
        showSuccess();
      })
      .catch(function (error) {
        console.error('[AiESL quote request failed]', error);
        alert('Online submission is temporarily unavailable. Please email info@einksmart.com.');
      })
      .finally(function () {
        setSubmitLoading(form, false);
      });
  });
}
function showSuccess() {
  var fs = document.getElementById('formStage');
  var ss = document.getElementById('successStage');
  var form = document.getElementById('quoteForm');
  if (fs) fs.style.display = 'none';
  if (ss) ss.style.display = 'block';
  if (form) form.reset();
}

/* ===== ROI CALCULATOR ===== */
function initROI() {
  var ids = ['stores', 'skus', 'changes', 'wage'];
  var stores = document.getElementById('stores');
  if (!stores) return; // ROI only on home page
  var fmt = function (n) { return '$' + Math.round(n).toLocaleString('en-US'); };
  var fmtN = function (n) { return Math.round(n).toLocaleString('en-US'); };

  function calc() {
    var s = +document.getElementById('stores').value;
    var k = +document.getElementById('skus').value;
    var c = +document.getElementById('changes').value;
    var w = +document.getElementById('wage').value;
    document.getElementById('vStores').textContent = s;
    document.getElementById('vSkus').textContent = k.toLocaleString('en-US');
    document.getElementById('vChanges').textContent = c;
    document.getElementById('vWage').textContent = '$' + w;

    /* Conservative model — kept consistent with
       /esl-roi-calculator-payback.html:
         90 s per manual re-tag (print, walk, locate, swap)
         85% labour reduction (not 100% — some manual work remains)
         $9 all-in per labelled position (tags + gateways + software + install) */
    var secPerTag = 90;
    var labourReduction = 0.85;
    var costPerLabel = 9;
    var tagsPerYear = k * c; /* c = price changes per label per YEAR */
    var hoursPerYear = (tagsPerYear * secPerTag / 3600) * s * labourReduction;
    var laborSaved = hoursPerYear * w;
    var investment = k * s * costPerLabel;
    var paybackMonths = investment / (laborSaved / 12);
    var netSavings = laborSaved * 3 - investment;

    document.getElementById('payback').textContent =
      paybackMonths < 1 ? '<1 mo' : Math.round(paybackMonths) + ' mo';
    document.getElementById('laborSaved').textContent = fmt(laborSaved);
    document.getElementById('hoursSaved').textContent = fmtN(hoursPerYear) + ' hrs';
    document.getElementById('invest').textContent = fmt(investment);
    document.getElementById('netSavings').textContent = fmt(netSavings);

    /* Honesty guard: the site standardises on a 12–36 month payback range.
       If the sliders produce a result outside it, say so rather than let the
       headline number imply a promise we would not make in a proposal. */
    var caution = document.getElementById('roiCaution');
    if (caution) {
      var msg = '';
      if (paybackMonths < 12) {
        msg = 'Below the 12&ndash;36 month range commonly quoted in ESL business cases. Before trusting this, check your price-change frequency &mdash; most estates over-state how often an <em>individual</em> label changes.';
      } else if (paybackMonths > 36) {
        msg = 'Above the 12&ndash;36 month range commonly quoted in ESL business cases. Labour savings alone will not carry this case; accuracy and markdown benefits would have to be modelled explicitly.';
      }
      caution.innerHTML = msg;
      caution.style.display = msg ? 'block' : 'none';
    }

    var pb = document.querySelector('.roi-cbox.payback');
    if (pb) { pb.classList.remove('flash'); void pb.offsetWidth; pb.classList.add('flash'); }
  }
  ids.forEach(function (id) {
    document.getElementById(id).addEventListener('input', calc);
  });
  calc();
}

/* ===== FAQ ACCORDION ===== */
function initFAQ() {
  document.querySelectorAll('.faq-q').forEach(function (q) {
    q.addEventListener('click', function () {
      var item = q.parentElement;
      var a = item.querySelector('.faq-a');
      var isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(function (i) {
        i.classList.remove('open');
        i.querySelector('.faq-a').style.maxHeight = null;
      });
      if (!isOpen) { item.classList.add('open'); a.style.maxHeight = a.scrollHeight + 'px'; }
    });
  });
}

/* ===== ARTICLE SHARING ===== */
function getShareMeta(panel) {
  var canonical = document.querySelector('link[rel="canonical"]');
  var ogTitle = document.querySelector('meta[property="og:title"]');
  var ogImage = document.querySelector('meta[property="og:image"]');
  var url = panel.getAttribute('data-share-url') || (canonical && canonical.href) || window.location.href.split('#')[0];
  var title = panel.getAttribute('data-share-title') || (ogTitle && ogTitle.content) || document.title;
  var image = panel.getAttribute('data-share-image') || (ogImage && ogImage.content) || '';
  return { url: url, title: title, image: image };
}

function createShareIcon(channel) {
  var icon = document.createElement('span');
  icon.className = 'share-icon share-icon-' + channel.key;
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = channel.icon;
  return icon;
}

function setShareFeedback(button, text) {
  var label = button.querySelector('.share-label');
  if (!label) return;
  var original = button.getAttribute('data-original-label') || label.textContent;
  button.setAttribute('data-original-label', original);
  label.textContent = text;
  window.setTimeout(function () {
    label.textContent = original;
  }, 1800);
}

function fallbackCopy(text) {
  var area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.left = '-9999px';
  area.style.top = '0';
  document.body.appendChild(area);
  area.select();
  try {
    document.execCommand('copy');
  } finally {
    document.body.removeChild(area);
  }
  return Promise.resolve();
}

function copyShareUrl(url) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(url).catch(function () {
      return fallbackCopy(url);
    });
  }
  return fallbackCopy(url);
}

function createShareLink(channel, meta) {
  var url = encodeURIComponent(meta.url);
  var title = encodeURIComponent(meta.title);
  var image = encodeURIComponent(meta.image);
  var hrefs = {
    facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + url,
    linkedin: 'https://www.linkedin.com/sharing/share-offsite/?url=' + url,
    x: 'https://twitter.com/intent/tweet?url=' + url + '&text=' + title,
    pinterest: 'https://pinterest.com/pin/create/button/?url=' + url + '&description=' + title + (meta.image ? '&media=' + image : ''),
    whatsapp: 'https://api.whatsapp.com/send?text=' + title + '%20' + url,
    telegram: 'https://t.me/share/url?url=' + url + '&text=' + title,
    vk: 'https://vk.com/share.php?url=' + url + '&title=' + title,
    email: 'mailto:?subject=' + title + '&body=' + title + '%0A' + url
  };
  var link = document.createElement('a');
  link.className = 'share-pill';
  link.href = hrefs[channel.key];
  link.setAttribute('aria-label', 'Share on ' + channel.label);
  if (channel.key !== 'email') {
    link.target = '_blank';
    link.rel = 'noopener';
  }
  link.appendChild(createShareIcon(channel));
  var label = document.createElement('span');
  label.className = 'share-label';
  label.textContent = channel.label;
  link.appendChild(label);
  return link;
}

function createShareButton(channel, meta) {
  var button = document.createElement('button');
  button.type = 'button';
  button.className = 'share-pill';
  button.setAttribute('aria-label', channel.ariaLabel || channel.label);
  button.appendChild(createShareIcon(channel));
  var label = document.createElement('span');
  label.className = 'share-label';
  label.textContent = channel.label;
  button.appendChild(label);
  button.addEventListener('click', function () {
    if (channel.key === 'native' && navigator.share) {
      navigator.share({ title: meta.title, url: meta.url }).catch(function () {});
      return;
    }
    copyShareUrl(meta.url).then(function () {
      setShareFeedback(button, 'Copied');
    });
  });
  return button;
}

function initArticleShare() {
  var panels = document.querySelectorAll('[data-article-share]');
  if (!panels.length) return;
  var linkChannels = [
    { key: 'facebook', label: 'Facebook', icon: 'f' },
    { key: 'linkedin', label: 'LinkedIn', icon: 'in' },
    { key: 'x', label: 'X', icon: 'X' },
    { key: 'pinterest', label: 'Pinterest', icon: 'P' },
    { key: 'whatsapp', label: 'WhatsApp', icon: 'WA' },
    { key: 'telegram', label: 'Telegram', icon: 'TG' },
    { key: 'vk', label: 'VK', icon: 'VK' },
    { key: 'email', label: 'Email', icon: '@' }
  ];
  var buttonChannels = [
    { key: 'copy', label: 'Copy link', icon: 'URL', ariaLabel: 'Copy article link' },
    { key: 'native', label: 'Share', icon: '+', ariaLabel: 'Native Share' }
  ];

  panels.forEach(function (panel) {
    var actions = panel.querySelector('.article-share-actions');
    if (!actions || actions.children.length) return;
    var meta = getShareMeta(panel);
    linkChannels.forEach(function (channel) {
      actions.appendChild(createShareLink(channel, meta));
    });
    buttonChannels.forEach(function (channel) {
      actions.appendChild(createShareButton(channel, meta));
    });
  });
}

/* ===== SCROLL REVEAL ===== */
function initReveal() {
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
}

/* ===== INIT ALL ===== */
document.addEventListener('DOMContentLoaded', function () {
  initQuoteForm();
  initROI();
  initFAQ();
  initArticleShare();
  initReveal();
});
