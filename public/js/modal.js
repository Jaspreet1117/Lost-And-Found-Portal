document.addEventListener("click", function (e) {
  const btn = e.target.closest(".view-details-btn");

  if (btn) {
    const card = btn.closest(".post");

    const itemData = {
      title: card.querySelector("h2").textContent,
      image: card.querySelector(".item-image img").src,
      location: card.querySelector(".info-row .value").textContent,
      // Date ko second value se utha rahe hain
      date: card.querySelectorAll(".info-row .value")[1].textContent,
      category: card.querySelector(".category-tag").textContent,
      status: card.querySelector(".status-badge").textContent.trim(),
      description: card.getAttribute("data-description"),
      
      // Card ke attributes se Poster ki ID aur Name nikalna
      posterId: card.getAttribute("data-posterid"),
      posterName: card.querySelector(".username h4").textContent.trim()
    };

    openItemModal(itemData);
  }
});

// Modal close functions
const closeBtn = document.getElementById("closeModal");
const modal = document.getElementById("itemModal");

if (closeBtn) {
  closeBtn.onclick = () => modal.style.display = "none";
}

window.onclick = (event) => {
  if (event.target == modal) modal.style.display = "none";
};

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") modal.style.display = "none";
});

function openItemModal(data) {
  const modal = document.getElementById("itemModal");
  // ... (baaki UI updates wahi rahenge) ...

  const contactBtn = document.getElementById("contactPosterBtn");
  if (contactBtn) {
    contactBtn.onclick = function () {
      modal.style.display = "none";
      // Jab user khud "Contact" click kare, tabhi chat khule
      startChat(data.posterId, data.posterName);
    };
  }

  const reportFoundBtn = document.querySelector(".item-found-btn-modal"); 
  if (reportFoundBtn) {
    if (data.status.toLowerCase() === 'lost') {
      reportFoundBtn.style.display = "block";
      reportFoundBtn.onclick = function(e) {
        e.stopPropagation(); // Event ko yahin roko
        modal.style.display = "none"; // Modal band karo
        
        // Sirf redirect karo, koi chat function call mat karo
        window.location.href = `/report-found?postedByOwnerId=${data.posterId}&itemTitle=${encodeURIComponent(data.title)}`;
      };
    } else {
      reportFoundBtn.style.display = "none";
    }
  }
  modal.style.display = "flex";
}