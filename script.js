const STORAGE_KEY = "test3";
let posts = [], idCounter = 1, currentFilter = "all";

// --- Local Storage ---
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}
function load() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    posts = JSON.parse(data);
    posts.forEach(p => p.date = new Date(p.date));
    idCounter = posts.length ? Math.max(...posts.map(p => p.id)) + 1 : 1;
  }
}

// --- Page Switching ---
function switchPage(page, btn) {
  document.querySelectorAll(".page").forEach(x => x.classList.remove("active"));
  document.getElementById(page).classList.add("active");
  document.querySelectorAll(".topbar button").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderFeed();
  renderAdmin();
  renderPreview();
}

// --- Submit Logic ---
function titleInput(id) {
  return document.getElementById(id).value.trim();
}
function submitPost() {
  const title = titleInput("title"),
        body = titleInput("body"),
        org = document.getElementById("org").value,
        fb = titleInput("fb"),
        submittedBy = titleInput("submittedBy"),
        urgent = document.getElementById("urgent").checked,
        pinned = document.getElementById("pinned") ? document.getElementById("pinned").checked : false;
        
  if (!title || !body || !org || !submittedBy) {
    showPopup("Please fill all required fields.");
    return;
  }

  posts.push({
    id: idCounter++,
    title,
    body,
    org,
    fb,
    submittedBy,
    status: "pending",
    urgent,
    pinned,
    date: new Date(),
    likes: 0
  });

  save();
  showPopup("Submitted! Waiting for admin approval.");

  // Clear form
  ["title","body","org","fb","submittedBy"].forEach(id => document.getElementById(id).value = "");
  document.getElementById("urgent").checked = false;
  if (document.getElementById("pinned")) document.getElementById("pinned").checked = false;

  renderPreview();
}

// --- Filter ---
function setFilter(org) {
  currentFilter = org;
  renderFeed();
}

// --- Render Feed ---
function renderFeed(query = "") {
  const q = query.toLowerCase();
  let list = posts.filter(p => p.status === "approved");
  list = list.filter(p =>
    (currentFilter === "all" || p.org === currentFilter) &&
    (p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q))
  );

  // Sort pinned first, then urgent, then newest
  list.sort((a, b) => (b.pinned - a.pinned) || (b.urgent - a.urgent) || (b.date - a.date));

  document.getElementById("feed-list").innerHTML = list.map(p => `
    <div class="card ${p.pinned ? 'pinned' : ''} ${p.urgent ? 'urgent' : ''}">
      <div class="card-tags">
        ${p.urgent ? '<span class="tag urgent">Urgent</span>' : ''}
        ${p.pinned ? '<span class="tag pinned">Pinned</span>' : ''}
      </div>
      <h3>${p.title} ${p.pinned ? '📌' : ''}</h3>
      <p>${p.body}</p>
      <small>${p.org} · ${p.submittedBy} · ${timeAgo(p.date)}</small>
      ${p.fb ? `<p>FB link: <a href="${p.fb}" target="_blank">${p.fb}</a></p>` : ''}
    </div>
  `).join("");
}

// --- Render Admin ---
function renderAdmin() {
  const pending = posts.filter(p => p.status === "pending");
  const approved = posts.filter(p => p.status === "approved");

  document.getElementById("total-count").textContent = posts.length;
  document.getElementById("pending-count").textContent = pending.length;
  document.getElementById("approved-count").textContent = approved.length;

  const renderCard = p => `
    <div class="card ${p.pinned ? 'pinned' : ''}">
      <h4>${p.title} ${p.pinned ? '📌' : ''}</h4>
      <p>${p.body}</p>
      <small>${p.org} · ${p.submittedBy} · ${timeAgo(p.date)}</small>
      ${p.fb ? `<p>FB link: <a href="${p.fb}" target="_blank">${p.fb}</a></p>` : ''}
      <div class="flex">
        ${p.status === 'pending' ? `<button class="btn btn-green" onclick="approve(${p.id})">Approve</button>` : ''}
        <button class="btn btn-red" onclick="del(${p.id})">Delete</button>
        <button class="btn" onclick="pin(${p.id})">${p.pinned ? 'Unpin' : 'Pin'}</button>
      </div>
    </div>
  `;

  document.getElementById("admin-pending").innerHTML = pending.map(renderCard).join("");
  document.getElementById("admin-approved").innerHTML = approved.map(renderCard).join("");
}

// --- Admin Actions ---
function approve(id) { posts.find(x => x.id === id).status = "approved"; save(); renderFeed(); renderAdmin(); }
function del(id) { posts = posts.filter(p => p.id !== id); save(); renderFeed(); renderAdmin(); }
function pin(id) { const p = posts.find(x => x.id === id); p.pinned = !p.pinned; save(); renderFeed(); renderAdmin(); }

// --- Popup ---
function showPopup(msg) {
  const popup = document.getElementById("popup");
  document.getElementById("popup-text").textContent = msg;
  popup.classList.add("show");
  setTimeout(() => { popup.classList.remove("show"); }, 2000);
}
function closePopup() { document.getElementById("popup").classList.remove("show"); }

// --- Live Preview ---
function renderPreview() {
  const title = titleInput("title"),
        body = titleInput("body"),
        org = document.getElementById("org").value,
        fb = titleInput("fb"),
        submittedBy = titleInput("submittedBy"),
        urgent = document.getElementById("urgent").checked,
        pinned = document.getElementById("pinned") ? document.getElementById("pinned").checked : false;

  document.getElementById("preview-container").innerHTML = title || body ? `
    <div class="card ${pinned ? 'pinned' : ''} ${urgent ? 'urgent' : ''}">
      <div class="card-tags">
        ${urgent ? '<span class="tag urgent">Urgent</span>' : ''}
        ${pinned ? '<span class="tag pinned">Pinned</span>' : ''}
      </div>
      <h3>${title} ${pinned ? '📌' : ''}</h3>
      <p>${body}</p>
      <small>${org}${submittedBy ? ` · ${submittedBy}` : ''} · just now</small>
      ${fb ? `<p>FB link: <a href="${fb}" target="_blank">${fb}</a></p>` : ''}
    </div>
  ` : '';
}

// --- Helpers ---
function timeAgo(date) {
  const now = new Date(), diff = Math.floor((now - date) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

// --- Event Listeners for Live Preview ---
['title','body','org','fb','submittedBy','urgent','pinned'].forEach(id => {
  const el = document.getElementById(id);
  if (el && el.type === 'checkbox') el.addEventListener('change', renderPreview);
  else if (el) el.addEventListener('input', renderPreview);
});

// --- Initial Load ---
load(); renderFeed(); renderAdmin(); renderPreview();