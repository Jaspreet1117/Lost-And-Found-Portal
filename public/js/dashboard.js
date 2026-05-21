const latestListing = document.querySelector(".latest-listing");
const foundRadio = document.getElementById("found-filter");
const lostRadio = document.getElementById("lost-filter");
const allPost = document.querySelectorAll(".post");

// ─── Filter Logic ───
function updateHeading() {
  if (foundRadio.checked) {
    latestListing.textContent = "FOUND LISTINGS";
    allPost.forEach((post) => {
      const isLost = post.querySelector(".status-badge").classList.contains("lost");
      post.style.display = isLost ? "none" : "";
    });
  } else if (lostRadio.checked) {
    latestListing.textContent = "LOST LISTINGS";
    allPost.forEach((post) => {
      const isFound = post.querySelector(".status-badge").classList.contains("found");
      post.style.display = isFound ? "none" : "";
    });
  }
}

if(foundRadio && lostRadio) {
    foundRadio.addEventListener("change", updateHeading);
    lostRadio.addEventListener("change", updateHeading);
}

// ─── Modal & Details Logic ───
const modal = document.getElementById("itemModal");
const closeBtn = document.getElementById("closeModal");

if (closeBtn) {
  closeBtn.onclick = () => modal.style.display = "none";
}

window.onclick = (event) => {
  if (event.target == modal) modal.style.display = "none";
};

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") modal.style.display = "none";
});

// Event Delegation for "View Details"
document.addEventListener("click", function (e) {
  const btn = e.target.closest(".view-details-btn");
  if (btn) {
    const card = btn.closest(".post");
    const itemData = {
      title: card.querySelector("h2").textContent,
      image: card.querySelector(".item-image img").src,
      location: card.querySelector(".info-row .value").textContent,
      date: card.querySelectorAll(".info-row .value")[1].textContent,
      category: card.querySelector(".category-tag").textContent,
      status: card.querySelector(".status-badge").textContent.trim(),
      description: card.getAttribute("data-description"),
      posterId: card.getAttribute("data-posterid"),
      posterName: card.querySelector(".username h4").textContent.trim()
    };
    openItemModal(itemData);
  }
});

function openItemModal(data) {
  const modal = document.getElementById("itemModal");
  
  document.getElementById("modalTitle").textContent = data.title;
  document.getElementById("modalImg").src = data.image;
  document.getElementById("modalLocation").textContent = data.location;
  document.getElementById("modalDesc").textContent = data.description || "No description.";

  const badge = document.getElementById("modalBadge");
  badge.textContent = data.status;
  badge.className = `status-pill ${data.status.toLowerCase()}`;

  // 1. CONTACT POSTER: User click karega tabhi chat khulegi
  const contactBtn = document.getElementById("contactPosterBtn");
  if (contactBtn) {
    contactBtn.onclick = function () {
      modal.style.display = "none";
      startChat(data.posterId, data.posterName); // Yahan manually khol rahe hain
    };
  }

  // 2. REPORT FOUND: Sirf redirect, NO chat opening
  const reportFoundBtn = document.querySelector(".item-found-btn-modal"); 
  if (reportFoundBtn) {
    if (data.status.toLowerCase() === 'lost') {
      reportFoundBtn.style.display = "block";
      reportFoundBtn.onclick = function() {
        // Sirf page redirect, notification background se jayegi
        window.location.href = `/report-found?postedByOwnerId=${data.posterId}&itemTitle=${encodeURIComponent(data.title)}`;
      };
    } else {
      reportFoundBtn.style.display = "none";
    }
  }

  modal.style.display = "flex";
}

// Navbar "Report Found" button (Default behavior)
const navReportBtn = document.querySelector(".item-found-btn");
if (navReportBtn) {
    navReportBtn.onclick = () => window.location.href = "/report-found";
}

updateHeading();