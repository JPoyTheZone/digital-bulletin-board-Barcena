let posts = [];
let currentFilter = "all";

/* ---------------- PAGE SWITCHING (FIXED) ---------------- */
function switchPage(page, btn) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(page).classList.add("active");

  document.querySelectorAll(".topbar button").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
}

/* ---------------- REALTIME LOAD ---------------- */
function loadPosts() {
  db.collection("posts").orderBy("date", "desc")
    .onSnapshot(snapshot => {
      posts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate()
      }));

      renderFeed();
      renderAdmin();
    });
}

/* ---------------- SUBMIT ---------------- */
function submitPost() {
  const title = val("title"),
        body = val("body"),
        org = document.getElementById("org").value,
        fb = val("fb"),
        submittedBy = val("submittedBy"),
        urgent = document.getElementById("urgent").checked,
        pinned = document.getElementById("pinned").checked;

  if (!title || !body || !org || !submittedBy) {
    showPopup("Please fill all required fields.");
    return;
  }

  db.collection("posts").add({
    title,
    body,
    org,
    fb,
    submittedBy,
    status: "pending",
    urgent,
    pinned,
    likes: 0,
    date: firebase.firestore.FieldValue.serverTimestamp()
  });

  showPopup("Submitted! Waiting for admin approval.");

  // reset form
  ["title","body","org","fb","submittedBy"].forEach(id => document.getElementById(id).value = "");
  document.getElementById("urgent").checked = false;
  document.getElementById("pinned").checked = false;

  renderPreview();
}

/* ---------------- FILTER ---------------- */
function setFilter(org) {
  currentFilter = org;
  renderFeed();
}

/* ---------------- FEED ---------------- */
function renderFeed(query = "") {
  const q = query.toLowerCase();

  let list = posts.filter(p => p.status === "approved");

  list = list.filter(p =>
    (currentFilter === "all" || p.org === currentFilter) &&
    (p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q))
  );

  list.sort((a, b) =>
    (b.pinned - a.pinned) ||
    (b.urgent - a.urgent) ||
    (b.date - a.date)
  );

  document.getElementById("feed-list").innerHTML = list.map(p => `
    <div class="card ${p.pinned ? 'pinned' : ''} ${p.urgent ? 'urgent' : ''}">
      <div class="card-tags">
        ${p.urgent ? '<span class="tag urgent">Urgent</span>' : ''}
        ${p.pinned ? '<span class="tag pinned">Pinned</span>' : ''}
      </div>

      <h3>${p.title} ${p.pinned ? '📌' : ''}</h3>
      <p>${p.body}</p>

      <small>${p.org} · ${p.submittedBy} · ${timeAgo(p.date)}</small>

      ${p.fb ? `<p>FB: <a href="${p.fb}" target="_blank">${p.fb}</a></p>` : ''}
    </div>
  `).join("");
}

/* ---------------- ADMIN ---------------- */
function renderAdmin() {
  const pending = posts.filter(p => p.status === "pending");
  const approved = posts.filter(p => p.status === "approved");

  document.getElementById("total-count").textContent = posts.length;
  document.getElementById("pending-count").textContent = pending.length;
  document.getElementById("approved-count").textContent = approved.length;

  const card = p => `
    <div class="card ${p.pinned ? 'pinned' : ''}">
      <h4>${p.title} ${p.pinned ? '📌' : ''}</h4>
      <p>${p.body}</p>
      <small>${p.org} · ${p.submittedBy} · ${timeAgo(p.date)}</small>

      ${p.fb ? `<p>FB: <a href="${p.fb}" target="_blank">${p.fb}</a></p>` : ''}

      <div class="flex">
        ${p.status === "pending" ? `<button class="btn btn-green" onclick="approve('${p.id}')">Approve</button>` : ''}
        <button class="btn btn-red" onclick="del('${p.id}')">Delete</button>
        <button class="btn" onclick="pin('${p.id}')">${p.pinned ? 'Unpin' : 'Pin'}</button>
      </div>
    </div>
  `;

  document.getElementById("admin-pending").innerHTML = pending.map(card).join("");
  document.getElementById("admin-approved").innerHTML = approved.map(card).join("");
}

/* ---------------- ADMIN ACTIONS ---------------- */
function approve(id) {
  db.collection("posts").doc(id).update({ status: "approved" });
}

function del(id) {
  db.collection("posts").doc(id).delete();
}

function pin(id) {
  const p = posts.find(x => x.id === id);
  db.collection("posts").doc(id).update({ pinned: !p.pinned });
}

/* ---------------- PREVIEW ---------------- */
function renderPreview() {
  const title = val("title"),
        body = val("body"),
        org = document.getElementById("org").value,
        fb = val("fb"),
        submittedBy = val("submittedBy"),
        urgent = document.getElementById("urgent").checked,
        pinned = document.getElementById("pinned").checked;

  document.getElementById("preview-container").innerHTML = title || body ? `
    <div class="card ${pinned ? 'pinned' : ''} ${urgent ? 'urgent' : ''}">
      <div class="card-tags">
        ${urgent ? '<span class="tag urgent">Urgent</span>' : ''}
        ${pinned ? '<span class="tag pinned">Pinned</span>' : ''}
      </div>

      <h3>${title}</h3>
      <p>${body}</p>
      <small>${org} · ${submittedBy || ''} · just now</small>

      ${fb ? `<p>FB: <a href="${fb}" target="_blank">${fb}</a></p>` : ''}
    </div>
  ` : '';
}

/* ---------------- UTIL ---------------- */
function val(id) {
  return document.getElementById(id).value.trim();
}

function showPopup(msg) {
  const popup = document.getElementById("popup");
  document.getElementById("popup-text").textContent = msg;
  popup.classList.add("show");
  setTimeout(() => popup.classList.remove("show"), 2000);
}

function timeAgo(date) {
  if (!date) return "just now";
  const diff = Math.floor((new Date() - date) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/* ---------------- LIVE PREVIEW LISTENERS ---------------- */
['title','body','org','fb','submittedBy','urgent','pinned'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;

  if (el.type === "checkbox") el.addEventListener("change", renderPreview);
  else el.addEventListener("input", renderPreview);
});

/* ---------------- INIT ---------------- */
loadPosts();
renderPreview();