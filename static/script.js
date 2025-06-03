document.addEventListener('DOMContentLoaded', function () {
  const characters = [
    {
      name: "Kiếm Khách",
      image: "https://via.placeholder.com/150/1abc9c",
      tag: "Tiên hiệp",
      isNew: true,
      isLicensed: true,
      description: "Kiếm Khách là một chiến binh dũng mãnh..."
    },
    {
      name: "Thần Tướng",
      image: "https://via.placeholder.com/150/3498db",
      tag: "Tiên hiệp",
      isNew: false,
      isLicensed: true,
      description: "Thần Tướng là những vị tướng uy nghiêm..."
    },
    {
      name: "Chiến Binh Bóng Tối",
      image: "https://via.placeholder.com/150/9b59b6",
      tag: "Hiện đại",
      isNew: false,
      isLicensed: true,
      description: "Chiến Binh Bóng Tối là những chiến binh bí ẩn..."
    },
    {
      name: "Pháp Sư",
      image: "https://via.placeholder.com/150/e67e22",
      tag: "Kỳ ảo",
      isNew: false,
      isLicensed: false,
      description: "Pháp Sư là bậc thầy của nguyên tố..."
    },
    {
      name: "Tiểu Thần Nữ",
      image: "https://via.placeholder.com/150/f1c40f",
      tag: "Tiên hiệp",
      isNew: true,
      isLicensed: false,
      description: "Tiểu Thần Nữ là một nhân vật đáng yêu..."
    },
  ];

  let isLoggedIn = false;
  let currentCharacterImageUrl = '';
  let currentUsername = '';
  let userDownloads = 0;
  let userUnlimited = false;

  // DOM elements
  const grid = document.getElementById("characterGrid");
  const searchInput = document.getElementById("searchInput");
  const filterButtons = document.querySelectorAll(".filters button");
  const characterDetailModal = document.getElementById("characterDetailModal");
  const closeCharacterDetailModal = document.getElementById("closeCharacterDetailModal");
  const modalCharacterImage = document.getElementById("modalCharacterImage");
  const modalCharacterTitle = document.getElementById("modalCharacterTitle");
  const modalCharacterDescription = document.getElementById("modalCharacterDescription");
  const modalCharacterCategory = document.getElementById("modalCharacterCategory");
  const modalNewTag = document.getElementById("modalNewTag");
  const modalLicensedTag = document.getElementById("modalLicensedTag");
  const downloadCharacterBtn = document.getElementById("downloadCharacterBtn");
  const customAlertOverlay = document.getElementById('customAlertOverlay');
  const customAlertMessage = document.getElementById('customAlertMessage');
  const customAlertCloseBtn = document.getElementById('customAlertCloseBtn');
  const loginBtn = document.getElementById("loginBtn");
  const loginPopup = document.getElementById("loginPopup");
  const submitLogin = document.getElementById("submitLogin");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const loginError = document.getElementById("loginError");
  const closePopup = document.getElementById("closePopup");

  // --- Custom Alert ---
  function showCustomAlert(message) {
    customAlertMessage.textContent = message;
    customAlertOverlay.style.display = 'flex';
  }

  customAlertCloseBtn.addEventListener('click', () => {
    customAlertOverlay.style.display = 'none';
  });

  customAlertOverlay.addEventListener('click', (event) => {
    if (event.target === customAlertOverlay) {
      customAlertOverlay.style.display = 'none';
    }
  });

  // --- Render Characters ---
  function renderCharacters(filter = "all", search = "") {
    grid.innerHTML = "";
    const filtered = characters.filter(char => {
      const matchFilter = filter === "all" || char.tag === filter;
      const matchSearch = char.name.toLowerCase().includes(search.toLowerCase());
      return matchFilter && matchSearch;
    });

    if (filtered.length === 0) {
      grid.innerHTML = "<p class='empty-message'>thứ này còn trống hơn ví của bạn.</p>";
      return;
    }

    for (const char of filtered) {
      const card = document.createElement("div");
      card.className = "card";
      card.dataset.character = JSON.stringify(char);

      card.innerHTML = `
        <img src="${char.image}" alt="${char.name}">
        <h3>${char.name}</h3>
        ${char.isNew ? `<span class="label new">Mới</span>` : ""}
        ${char.isLicensed ? `<span class="label licensed">Bản quyền</span>` : ""}
      `;
      grid.appendChild(card);

      card.addEventListener('click', function () {
        if (isLoggedIn) {
          showCharacterDetail(JSON.parse(this.dataset.character));
        } else {
          showCustomAlert('Vui lòng đăng nhập để xem thông tin chi tiết nhân vật!');
          loginPopup.style.display = 'flex';
          loginError.textContent = 'Bạn cần đăng nhập để xem chi tiết.';
        }
      });
    }
  }

  renderCharacters();

  // --- Filter & Search ---
  filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelector(".filters button.active")?.classList.remove("active");
      btn.classList.add("active");
      renderCharacters(btn.dataset.filter, searchInput.value.trim());
    });
  });

  searchInput.addEventListener("input", () => {
    const keyword = searchInput.value.trim();
    const activeFilter = document.querySelector(".filters button.active")?.dataset.filter || "all";
    renderCharacters(activeFilter, keyword);
  });

  // --- Login ---
  loginBtn.addEventListener("click", () => {
    loginPopup.style.display = "flex";
    loginError.textContent = "";
    const storedUsername = localStorage.getItem('lastLoginUsername');
    usernameInput.value = storedUsername || "";
    passwordInput.value = "";
  });

  closePopup.addEventListener("click", () => {
    loginPopup.style.display = "none";
  });

  window.addEventListener("click", (event) => {
    if (event.target === loginPopup) {
      loginPopup.style.display = "none";
      loginError.textContent = "";
    }
  });

  submitLogin.addEventListener("click", async () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    loginError.textContent = "";

    if (!username || !password) {
      loginError.textContent = "Vui lòng nhập đầy đủ tên và mật khẩu.";
      return;
    }

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const result = await response.json();

      if (response.ok && result.status === "success") {
        isLoggedIn = true;
        currentUsername = username;
        userDownloads = result.downloads || 0;
        userUnlimited = result.unlimited || false;

        loginBtn.textContent = `Xin chào, ${username}`;
        loginPopup.style.display = "none";
        localStorage.setItem("lastLoginUsername", username);

        showCustomAlert(
          userUnlimited
            ? "Đăng nhập thành công! Tài khoản VIP - Không giới hạn lượt tải."
            : `Đăng nhập thành công! Bạn còn ${3 - userDownloads} lượt tải.`
        );
      } else {
        loginError.textContent = result.message || "Đăng nhập thất bại.";
      }
    } catch (error) {
      loginError.textContent = "Không thể kết nối tới máy chủ. Vui lòng thử lại sau.";
      console.error("Lỗi:", error);
    }
  });

  // --- Chi tiết nhân vật ---
  function showCharacterDetail(char) {
    modalCharacterImage.src = char.image;
    modalCharacterImage.alt = char.name;
    modalCharacterTitle.textContent = char.name;
    modalCharacterDescription.textContent = char.description;
    modalCharacterCategory.textContent = char.tag;
    modalNewTag.style.display = char.isNew ? 'inline-block' : 'none';
    modalLicensedTag.style.display = char.isLicensed ? 'inline-block' : 'none';
    currentCharacterImageUrl = char.image;
    characterDetailModal.style.display = 'flex';
  }

  closeCharacterDetailModal.addEventListener('click', () => {
    characterDetailModal.style.display = 'none';
  });

  window.addEventListener("click", (event) => {
    if (event.target === characterDetailModal) {
      characterDetailModal.style.display = "none";
    }
  });

  // --- Tải file FLA ---
  downloadCharacterBtn.addEventListener('click', async () => {
    if (!isLoggedIn) {
      showCustomAlert('Bạn cần đăng nhập để tải file FLA.');
      return;
    }

    try {
      const res = await fetch(`/download_fla?username=${encodeURIComponent(currentUsername)}`);
      if (!res.ok) {
        const errData = await res.json();
        showCustomAlert(errData.message || 'Lỗi khi tải file.');
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'kiem_khach.fla';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      if (!userUnlimited) {
        userDownloads += 1;
        const remaining = 3 - userDownloads;
        if (remaining > 0) {
          showCustomAlert(`Tải thành công. Bạn còn ${remaining} lượt tải.`);
        } else {
          showCustomAlert(`Tải thành công. Bạn đã hết lượt tải.`);
        }
      } else {
        showCustomAlert('Tải thành công.');
      }
    } catch (error) {
      showCustomAlert('Lỗi khi tải file. Vui lòng thử lại.');
      console.error(error);
    }
  });

  loginBtn.textContent = "Đăng nhập";
});
