document.addEventListener("click", function (e) {
  const btn = e.target.closest(".view-details-btn");

  if (btn) {
    const card = btn.closest(".post");

    const itemData = {
      title: card.querySelector("h2").textContent,
      image: card.querySelector(".item-image img").src,
      location: card.querySelector(".info-row .value").textContent,
      // Grabbing the second .value for the date
      date: card.querySelectorAll(".info-row .value")[1].textContent,
      category: card.querySelector(".category-tag").textContent,
      status: card.querySelector(".status-badge").textContent.trim(),
      // TARGETING THE DESCRIPTION HERE:
      description: card.getAttribute("data-description"),
    };

    openItemModal(itemData);
  }
});
// 1. Click the 'X' button
const closeBtn = document.getElementById("closeModal");
const modal = document.getElementById("itemModal");

closeBtn.onclick = function () {
  modal.style.display = "none";
};

// 2. Click anywhere outside the modal content
window.onclick = function (event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
};

// 3. Press the 'Escape' key (Good for accessibility!)
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    modal.style.display = "none";
  }
});

function openItemModal(data) {
  const modal = document.getElementById("itemModal");

  // Injects the description into the <p id="modalDesc">
  document.getElementById("modalDesc").textContent =
    data.description || "No description provided.";

  // Rest of your existing modal update code...
  document.getElementById("modalTitle").textContent = data.title;
  document.getElementById("modalImg").src = data.image;
  document.getElementById("modalLocation").textContent = data.location;
  document.getElementById("modalDate").textContent = data.date;
  document.getElementById("modalCategory").textContent = data.category;

  const badge = document.getElementById("modalBadge");
  badge.textContent = data.status;
  badge.className = `status-pill ${data.status.toLowerCase()}`;

  modal.style.display = "flex";
}
