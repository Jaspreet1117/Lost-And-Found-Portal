const latestListing = document.querySelector(".latest-listing");
const foundRadio = document.getElementById("found-filter");
const lostRadio = document.getElementById("lost-filter");
const allPost = document.querySelectorAll(".post");
// const lost = document.querySelectorAll(".lost");
// const found = document.querySelectorAll(".found");
function updateHeading() {
  if (foundRadio.checked) {
    latestListing.textContent = "FOUND LISTINGS";
    allPost.forEach((post) => {
      const isLost = post
        .querySelector(".status-badge")
        .classList.contains("lost");
      post.style.display = isLost ? "none" : "";
    });
  } else if (lostRadio.checked) {
    latestListing.textContent = "LOST LISTINGS";
    allPost.forEach((post) => {
      const isFound = post
        .querySelector(".status-badge")
        .classList.contains("found");
      post.style.display = isFound ? "none" : "";
    });
  }
}

foundRadio.addEventListener("change", updateHeading);
lostRadio.addEventListener("change", updateHeading);

document
  .querySelector(".item-found-btn")
  .addEventListener("click", function () {
    window.location.href = "/report-found";
  });
updateHeading();
// function displayPosts() {
//   if (foundRadio.checked) {
//     lost.style.display = "none";
//   } else {
//     found.style.display = "none";
//   }
// }
