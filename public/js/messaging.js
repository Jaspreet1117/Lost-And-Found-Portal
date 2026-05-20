/* =====================================================
   MESSAGING SYSTEM — messaging.js  (Socket.io real-time)
   ===================================================== */

(function () {
  "use strict";

  /* ── Socket.io connection ──────────────────────── */
  const socket = io({ transports: ["websocket", "polling"] });

  socket.on("connect_error", (err) => {
    console.warn("Socket.io connect error:", err.message);
  });

  // Real-time: owner receives a new contact request
  socket.on("new_notification", ({ notification }) => {
    updateBadge("+"); // bump the badge
    showToast(`${notification.fromUser?.userId || "Someone"} says they found your item! 🎉`, "🔔");

    // If notification panel is open and on notifications tab, refresh
    if (msgPanel.classList.contains("open") && activeTab === "notifications") {
      loadNotifications();
    }
  });

  // Real-time: receive a new message from the other party
  socket.on("new_message", ({ requestId, message }) => {
    // If we're currently viewing this thread, render it live
    if (activeChatRequestId === requestId) {
      appendMessage(message, false);
      scrollChat();
      // Mark as read immediately
      fetch(`/messages/${requestId}`, { method: "GET" }).catch(() => {});
    } else {
      // Not viewing this chat — show a toast and bump badge on conversations tab
      const sender = message.sender?.userId || message.sender?.name || "Someone";
      showToast(`New message from ${sender}`, "💬");
      loadConversations(); // refresh conversation list
    }
  });

  /* ── State ─────────────────────────────────────── */
  let activeChatRequestId = null;
  let activeTab = "notifications";
  let badgeCount = 0;

  /* ── DOM refs ──────────────────────────────────── */
  const floatingBtn    = document.getElementById("floatingMsgBtn");
  const msgPanel       = document.getElementById("msgPanel");
  const msgOverlay     = document.getElementById("msgOverlay");
  const closePanelBtn  = document.getElementById("closePanelBtn");
  const notifBadge     = document.getElementById("notifBadge");
  const notifList      = document.getElementById("notifList");
  const convoList      = document.getElementById("convoList");
  const chatPanel      = document.getElementById("chatPanel");
  const chatBackBtn    = document.getElementById("chatBackBtn");
  const chatMessages   = document.getElementById("chatMessages");
  const chatTextInput  = document.getElementById("chatTextInput");
  const chatSendBtn    = document.getElementById("chatSendBtn");
  const chatUserName   = document.getElementById("chatUserName");
  const chatItemLabel  = document.getElementById("chatItemLabel");

  // "I Found" modal
  const foundItemModal    = document.getElementById("foundItemModal");
  const foundModalClose   = document.getElementById("foundModalClose");
  const foundModalOverlay = document.getElementById("foundModalOverlay");
  const foundModalItemTag = document.getElementById("foundModalItemTag");
  const foundModalItemId  = document.getElementById("foundModalItemId");
  const foundLocInput     = document.getElementById("foundLocInput");
  const foundContactInput = document.getElementById("foundContactInput");
  const foundMsgInput     = document.getElementById("foundMsgInput");
  const foundModalSubmit  = document.getElementById("foundModalSubmit");
  const foundModalForm    = document.getElementById("foundModalForm");
  const foundModalSuccess = document.getElementById("foundModalSuccess");

  /* ── Helpers ───────────────────────────────────── */
  function showToast(msg, emoji = "💬") {
    const el = document.createElement("div");
    el.className = "msg-toast";
    el.innerHTML = `<span>${emoji}</span> ${msg}`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3100);
  }

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  function avatarUrl(user) {
    if (user && user.profilePic && user.profilePic !== "/images/default.png") {
      return user.profilePic;
    }
    const name = encodeURIComponent((user && (user.userId || user.name)) || "User");
    return `https://ui-avatars.com/api/?name=${name}&background=1fbba6&color=fff`;
  }

  /* ── Badge ─────────────────────────────────────── */
  function updateBadge(countOrPlus) {
    if (countOrPlus === "+") badgeCount++;
    else badgeCount = countOrPlus;

    if (badgeCount > 0) {
      notifBadge.textContent = badgeCount > 99 ? "99+" : badgeCount;
      notifBadge.classList.remove("hidden");
    } else {
      notifBadge.classList.add("hidden");
    }
  }

  // Initial badge load
  fetch("/notifications/count")
    .then((r) => r.json())
    .then((d) => updateBadge(d.count || 0))
    .catch(() => {});

  /* ── Panel open / close ────────────────────────── */
  function openPanel() {
    msgPanel.classList.add("open");
    msgOverlay.classList.add("visible");
    hideChatPanel();
    loadNotifications();
    loadConversations();
  }

  function closePanel() {
    msgPanel.classList.remove("open");
    msgOverlay.classList.remove("visible");
    activeChatRequestId = null;
  }

  floatingBtn.addEventListener("click", openPanel);
  closePanelBtn.addEventListener("click", closePanel);
  msgOverlay.addEventListener("click", closePanel);

  /* ── Tabs ──────────────────────────────────────── */
  document.querySelectorAll(".panel-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      activeTab = tab.dataset.tab;
      document.querySelectorAll(".panel-tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
      tab.classList.add("active");
      const target = document.getElementById("tab-" + tab.dataset.tab);
      if (target) target.classList.add("active");
    });
  });

  /* ── Load Notifications ────────────────────────── */
  async function loadNotifications() {
    try {
      const res = await fetch("/notifications");
      if (!res.ok) return;
      const data = await res.json();
      renderNotifications(data.notifications || []);
      updateBadge(data.unreadCount || 0);
    } catch (e) {
      console.error("Failed to load notifications", e);
    }
  }

  function renderNotifications(notifications) {
    if (!notifications.length) {
      notifList.innerHTML = `
        <div class="panel-empty">
          <svg viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6V11c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
          <p>No notifications yet</p>
        </div>`;
      return;
    }

    notifList.innerHTML = notifications.map((n) => {
      const from = n.fromUser;
      const isPending = n.status === "pending";
      const isAccepted = n.status === "accepted";

      return `
        <div class="notif-item ${n.readByOwner ? "" : "unread"}" data-id="${n._id}">
          <div class="notif-meta">
            <img class="notif-avatar" src="${avatarUrl(from)}" alt="avatar" />
            <div class="notif-info">
              <div class="notif-name">${from?.userId || from?.name || "Someone"}</div>
              <div class="notif-time">${timeAgo(n.createdAt)}</div>
            </div>
            <span class="notif-status-pill ${n.status}">${n.status}</span>
          </div>
          <p class="notif-text">
            Says they found your <span class="notif-item-title">${n.lostItemTitle || "item"}</span>
            ${n.foundLocation ? `<br>📍 Found at: <strong>${n.foundLocation}</strong>` : ""}
            ${n.finderMessage ? `<br>💬 "${n.finderMessage}"` : ""}
          </p>
          <div class="notif-actions">
            ${isPending ? `
              <button class="btn-accept" onclick="acceptRequest('${n._id}')">✓ Accept</button>
              <button class="btn-reject" onclick="rejectRequest('${n._id}')">✕ Reject</button>
            ` : ""}
            ${isAccepted ? `
              <button class="btn-open-chat" onclick="openChat('${n._id}', '${(from?.userId || from?.name || "User").replace(/'/g,"\\'")}', '${(n.lostItemTitle || "").replace(/'/g,"\\'")}')">
                💬 Open Chat
              </button>` : ""}
          </div>
        </div>`;
    }).join("");
  }

  /* ── Load Conversations ────────────────────────── */
  async function loadConversations() {
    try {
      const res = await fetch("/conversations");
      if (!res.ok) return;
      const data = await res.json();
      renderConversations(data.conversations || []);
    } catch (e) {
      console.error("Failed to load conversations", e);
    }
  }

  function renderConversations(convos) {
    if (!convos.length) {
      convoList.innerHTML = `
        <div class="panel-empty">
          <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
          <p>No active chats yet</p>
        </div>`;
      return;
    }

    convoList.innerHTML = convos.map((c) => {
      const other = c.otherUser;
      const preview = c.lastMessage ? c.lastMessage.text : "Say hello! 👋";
      const name = (other?.userId || other?.name || "User").replace(/'/g, "\\'");
      const title = (c.lostItemTitle || "").replace(/'/g, "\\'");
      return `
        <div class="convo-item" onclick="openChat('${c._id}', '${name}', '${title}')">
          <img class="convo-avatar" src="${avatarUrl(other)}" alt="avatar" />
          <div class="convo-info">
            <div class="convo-name">${other?.userId || other?.name || "User"}</div>
            <div class="convo-preview">${preview}</div>
          </div>
          ${c.unreadCount ? `<span class="convo-unread">${c.unreadCount}</span>` : ""}
        </div>`;
    }).join("");
  }

  /* ── Accept / Reject ───────────────────────────── */
  window.acceptRequest = async function (id) {
    try {
      const res = await fetch(`/contact-request/${id}/accept`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      showToast("Request accepted! You can now chat. ✅", "✅");
      loadNotifications();
      loadConversations();
    } catch {
      showToast("Something went wrong.", "❌");
    }
  };

  window.rejectRequest = async function (id) {
    try {
      const res = await fetch(`/contact-request/${id}/reject`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      showToast("Request rejected.", "🚫");
      loadNotifications();
    } catch {
      showToast("Something went wrong.", "❌");
    }
  };

  /* ── Chat Panel ────────────────────────────────── */
  window.openChat = function (requestId, userName, itemTitle) {
    activeChatRequestId = requestId;
    chatUserName.textContent = userName;
    chatItemLabel.textContent = itemTitle ? `re: ${itemTitle}` : "";
    showChatPanel();
    loadMessages();
  };

  function showChatPanel() {
    const tabs = document.querySelector(".panel-tabs");
    const body = document.querySelector(".panel-body");
    if (tabs) tabs.style.display = "none";
    if (body) body.style.display = "none";
    chatPanel.classList.add("active");
  }

  function hideChatPanel() {
    if (chatPanel) chatPanel.classList.remove("active");
    const tabs = document.querySelector(".panel-tabs");
    const body = document.querySelector(".panel-body");
    if (tabs) tabs.style.display = "";
    if (body) body.style.display = "";
  }

  chatBackBtn.addEventListener("click", () => {
    activeChatRequestId = null;
    hideChatPanel();
    loadConversations();
  });

  async function loadMessages() {
    if (!activeChatRequestId) return;
    try {
      const res = await fetch(`/messages/${activeChatRequestId}`);
      if (!res.ok) return;
      const data = await res.json();
      renderMessages(data.messages || []);
      scrollChat();
    } catch (e) {
      console.error("Failed to load messages", e);
    }
  }

  function renderMessages(messages) {
    const myId = document.body.dataset.userId;

    if (!messages.length) {
      chatMessages.innerHTML = `<div style="text-align:center;color:#bbb;font-size:13px;margin-top:20px;font-family:'Segoe UI',sans-serif;">No messages yet. Say hi! 👋</div>`;
      return;
    }

    chatMessages.innerHTML = messages.map((m) => buildBubble(m, myId)).join("");
  }

  function buildBubble(m, myId) {
    myId = myId || document.body.dataset.userId;
    const senderId = m.sender?._id?.toString() || m.sender?.toString();
    const isMe = senderId === myId;
    const t = new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `<div class="msg-bubble ${isMe ? "me" : "them"}">${m.text}<div class="msg-time">${t}</div></div>`;
  }

  function appendMessage(m, scrollToBottom = true) {
    const myId = document.body.dataset.userId;
    const bubble = document.createElement("div");
    bubble.innerHTML = buildBubble(m, myId);
    chatMessages.appendChild(bubble.firstElementChild);
    if (scrollToBottom) scrollChat();
  }

  function scrollChat() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  /* ── Send message ──────────────────────────────── */
  async function sendMessage() {
    const text = chatTextInput.value.trim();
    if (!text || !activeChatRequestId) return;
    chatTextInput.value = "";

    // Optimistic: show our own bubble immediately
    appendMessage({
      sender: { _id: document.body.dataset.userId },
      text,
      createdAt: new Date().toISOString(),
    });
    scrollChat();

    try {
      await fetch(`/messages/${activeChatRequestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
    } catch {
      showToast("Couldn't send message.", "❌");
    }
  }

  chatSendBtn.addEventListener("click", sendMessage);
  chatTextInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  /* ── "I Found This Item" Modal ─────────────────── */
  window.openFoundItemModal = function (itemId, itemTitle) {
    foundModalItemId.value = itemId;
    foundModalItemTag.textContent = `"${itemTitle}"`;
    foundLocInput.value = "";
    foundContactInput.value = "";
    foundMsgInput.value = "";
    foundModalForm.style.display = "block";
    foundModalSuccess.style.display = "none";
    foundItemModal.classList.add("show");
  };

  function closeFoundModal() { foundItemModal.classList.remove("show"); }
  foundModalClose.addEventListener("click", closeFoundModal);
  foundModalOverlay.addEventListener("click", closeFoundModal);

  foundModalSubmit.addEventListener("click", async () => {
    const itemId   = foundModalItemId.value;
    const location = foundLocInput.value.trim();
    const contact  = foundContactInput.value.trim();
    const message  = foundMsgInput.value.trim();

    if (!location || !contact) {
      showToast("Please fill in location and contact fields.", "⚠️");
      return;
    }

    foundModalSubmit.textContent = "Sending…";
    foundModalSubmit.disabled = true;

    try {
      const res = await fetch("/contact-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lostItemId: itemId, foundLocation: location, finderContact: contact, finderMessage: message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");

      foundModalForm.style.display = "none";
      foundModalSuccess.style.display = "block";
      setTimeout(closeFoundModal, 3000);
    } catch (e) {
      showToast(e.message || "Something went wrong.", "❌");
    } finally {
      foundModalSubmit.textContent = "Send Contact Request";
      foundModalSubmit.disabled = false;
    }
  });

})();
