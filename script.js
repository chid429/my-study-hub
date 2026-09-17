const defaultSubjects = [
  { name: "คณิตศาสตร์", icon: "📐", desc: "สูตร สมการ และโจทย์คณิตศาสตร์" },
  { name: "วิทยาศาสตร์", icon: "🔬", desc: "การทดลองและความรู้ทางวิทยาศาสตร์" },
  { name: "ภาษาไทย", icon: "📖", desc: "ภาษา วรรณคดี และการสื่อสาร" },
  { name: "ภาษาอังกฤษ", icon: "🇬🇧", desc: "คำศัพท์ Grammar และการสื่อสาร" },
  { name: "คอมพิวเตอร์", icon: "💻", desc: "Programming และเทคโนโลยี" },
  { name: "สังคมศึกษา", icon: "🌏", desc: "สังคม ประวัติศาสตร์ และภูมิศาสตร์" },
  { name: "ศิลปะ", icon: "🎨", desc: "งานศิลปะและความคิดสร้างสรรค์" },
  { name: "การงานอาชีพ", icon: "🛠️", desc: "ทักษะอาชีพและการทำงาน" }
];

const EMOJIS = ["📘", "📐", "🔬", "📖", "🇬🇧", "💻", "🌏", "🎨", "🛠️", "🎵", "🧪", "🧠", "⚽", "🌱", "⭐"];

let customSubjects = loadJson("customSubjects", []);
let subjects = [...defaultSubjects, ...customSubjects];
let images = loadJson("studyImages", {});
let notes = loadJson("studyNotes", {});
let works = loadJson("studyWorks", {});
let currentSubject = "";
let editingSubjectName = "";
let lightboxIndex = 0;
let notesTimer = null;

const grid = document.getElementById("subjectGrid");
const modal = document.getElementById("subjectModal");
const gallery = document.getElementById("gallery");
const createModal = document.getElementById("createSubjectModal");
const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxCaption = document.getElementById("lightboxCaption");
const toastEl = document.getElementById("toast");
const notesInput = document.getElementById("notesInput");
const workList = document.getElementById("workList");
const uploadArea = document.getElementById("uploadArea");

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    showToast("พื้นที่จัดเก็บเต็ม ลบรูปบางส่วนแล้วลองใหม่");
    return false;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.remove("hidden");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toastEl.classList.add("hidden"), 2400);
}

function setModalOpen(isOpen) {
  document.body.classList.toggle("modal-open", isOpen);
}

function refreshSubjects() {
  subjects = [...defaultSubjects, ...customSubjects];
}

function isCustomSubject(name) {
  return customSubjects.some(item => item.name === name);
}

function getSubject(name) {
  return subjects.find(item => item.name === name);
}

function countImages() {
  return Object.values(images).reduce((sum, list) => sum + (list?.length || 0), 0);
}

function countWorksDone() {
  return Object.values(works).flat().filter(item => item.done).length;
}

function renderHeroStats() {
  document.getElementById("heroStats").innerHTML = `
    <span class="stat-chip">${subjects.length} วิชา</span>
    <span class="stat-chip">${countImages()} รูปภาพ</span>
    <span class="stat-chip">${countWorksDone()} ผลงานที่ทำแล้ว</span>
  `;
}

function getFilteredSubjects() {
  const keyword = document.getElementById("searchInput").value.trim().toLowerCase();
  if (!keyword) return subjects;
  return subjects.filter(subject =>
    subject.name.toLowerCase().includes(keyword) ||
    subject.desc.toLowerCase().includes(keyword)
  );
}

function renderSubjects(list = subjects) {
  grid.innerHTML = "";
  if (!list.length) {
    grid.innerHTML = `<div class="empty-state">ไม่พบวิชาที่ค้นหา ลองสร้างวิชาใหม่ได้เลย</div>`;
    renderHeroStats();
    return;
  }

  list.forEach(subject => {
    const card = document.createElement("div");
    card.className = "subject-card";
    const imageCount = (images[subject.name] || []).length;
    const workCount = (works[subject.name] || []).length;
    const hasNotes = Boolean((notes[subject.name] || "").trim());
    card.innerHTML = `
      <div class="subject-icon">${escapeHtml(subject.icon)}</div>
      <h3>${escapeHtml(subject.name)}</h3>
      <p>${escapeHtml(subject.desc)}</p>
      <p class="card-meta">${imageCount} รูป • ${workCount} งาน • ${hasNotes ? "มีโน้ต" : "ยังไม่มีโน้ต"}</p>
      <div class="card-actions">
        <button class="open-btn" type="button">เปิดวิชา →</button>
        ${isCustomSubject(subject.name) ? '<button class="delete-subject" type="button">ลบวิชา</button>' : ""}
      </div>
    `;
    card.onclick = event => {
      if (event.target.closest(".delete-subject")) return;
      openSubject(subject);
    };
    const deleteBtn = card.querySelector(".delete-subject");
    if (deleteBtn) {
      deleteBtn.onclick = event => {
        event.stopPropagation();
        deleteSubject(subject.name);
      };
    }
    grid.appendChild(card);
  });
  renderHeroStats();
}

function openSubject(subject, tab = "images") {
  currentSubject = subject.name;
  document.getElementById("modalTitle").textContent = `${subject.icon} ${subject.name}`;
  document.getElementById("modalDescription").textContent = subject.desc;
  document.getElementById("editSubjectBtn").classList.toggle("hidden", !isCustomSubject(subject.name));
  modal.classList.remove("hidden");
  setModalOpen(true);
  switchTab(tab);
  renderGallery();
  notesInput.value = notes[currentSubject] || "";
  document.getElementById("notesStatus").textContent = "บันทึกอัตโนมัติ";
  renderWorks();
}

function closeModal() {
  modal.classList.add("hidden");
  if (createModal.classList.contains("hidden") && lightbox.classList.contains("hidden")) {
    setModalOpen(false);
  }
}

function switchTab(tabName) {
  document.querySelectorAll(".tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-panel").forEach(panel => {
    panel.classList.toggle("hidden", panel.id !== `panel-${tabName}`);
  });
}

function openCreateSubjectModal(subject = null) {
  editingSubjectName = subject?.name || "";
  document.getElementById("createSubjectTitle").textContent = subject ? "แก้ไขวิชา" : "สร้างวิชาใหม่";
  document.getElementById("subjectNameInput").value = subject?.name || "";
  document.getElementById("subjectIconInput").value = subject?.icon || "📘";
  document.getElementById("subjectDescInput").value = subject?.desc || "";
  createModal.classList.remove("hidden");
  setModalOpen(true);
  document.getElementById("subjectNameInput").focus();
}

function closeCreateSubjectModal() {
  createModal.classList.add("hidden");
  editingSubjectName = "";
  document.getElementById("createSubjectForm").reset();
  document.getElementById("subjectIconInput").value = "📘";
  if (modal.classList.contains("hidden") && lightbox.classList.contains("hidden")) {
    setModalOpen(false);
  }
}

function saveSubject(event) {
  event.preventDefault();
  const name = document.getElementById("subjectNameInput").value.trim();
  const icon = document.getElementById("subjectIconInput").value.trim() || "📘";
  const desc = document.getElementById("subjectDescInput").value.trim() || "วิชาที่สร้างเอง";
  if (!name) return;

  const duplicate = subjects.some(subject =>
    subject.name.toLowerCase() === name.toLowerCase() &&
    subject.name !== editingSubjectName
  );
  if (duplicate) {
    showToast("มีวิชานี้อยู่แล้ว กรุณาใช้ชื่ออื่น");
    return;
  }

  const wasEditing = Boolean(editingSubjectName);
  if (wasEditing) {
    const index = customSubjects.findIndex(item => item.name === editingSubjectName);
    if (index === -1) return;
    customSubjects[index] = { name, icon, desc };
    moveSubjectData(editingSubjectName, name);
    currentSubject = name;
  } else {
    customSubjects.push({ name, icon, desc });
  }

  if (!saveJson("customSubjects", customSubjects)) return;
  refreshSubjects();
  closeCreateSubjectModal();
  renderSubjects(getFilteredSubjects());
  const subject = getSubject(name);
  if (wasEditing && subject && !modal.classList.contains("hidden")) {
    openSubject(subject);
  }
  showToast(wasEditing ? "แก้ไขวิชาแล้ว" : "สร้างวิชาใหม่แล้ว");
}

function moveSubjectData(from, to) {
  if (from === to) return;
  if (images[from]) {
    images[to] = images[from];
    delete images[from];
    saveJson("studyImages", images);
  }
  if (notes[from]) {
    notes[to] = notes[from];
    delete notes[from];
    saveJson("studyNotes", notes);
  }
  if (works[from]) {
    works[to] = works[from];
    delete works[from];
    saveJson("studyWorks", works);
  }
}

function deleteSubject(name) {
  if (!confirm(`ลบวิชา "${name}" พร้อมรูป โน้ต และผลงานทั้งหมดหรือไม่?`)) return;
  customSubjects = customSubjects.filter(subject => subject.name !== name);
  delete images[name];
  delete notes[name];
  delete works[name];
  saveJson("customSubjects", customSubjects);
  saveJson("studyImages", images);
  saveJson("studyNotes", notes);
  saveJson("studyWorks", works);
  refreshSubjects();
  closeModal();
  renderSubjects(getFilteredSubjects());
  showToast("ลบวิชาแล้ว");
}

function addImages(files) {
  const imageFiles = [...files].filter(file => file.type.startsWith("image/"));
  if (!imageFiles.length || !currentSubject) return;
  if (!images[currentSubject]) images[currentSubject] = [];

  imageFiles.forEach(file => {
    const reader = new FileReader();
    reader.onload = event => {
      images[currentSubject].push(event.target.result);
      if (saveJson("studyImages", images)) {
        renderGallery();
        renderSubjects(getFilteredSubjects());
      }
    };
    reader.readAsDataURL(file);
  });
}

function renderGallery() {
  gallery.innerHTML = "";
  const subjectImages = images[currentSubject] || [];

  if (!subjectImages.length) {
    gallery.innerHTML = "<p style='color:#888'>ยังไม่มีรูปภาพสำหรับวิชานี้ 📷</p>";
    return;
  }

  subjectImages.forEach((src, index) => {
    const item = document.createElement("div");
    item.className = "gallery-item";
    const img = document.createElement("img");
    img.src = src;
    img.alt = `รูปภาพ ${index + 1}`;
    img.onclick = () => openLightbox(index);
    const button = document.createElement("button");
    button.className = "delete-img";
    button.type = "button";
    button.title = "ลบรูปภาพ";
    button.textContent = "×";
    button.onclick = event => {
      event.stopPropagation();
      if (!confirm("ลบรูปนี้หรือไม่?")) return;
      images[currentSubject].splice(index, 1);
      saveJson("studyImages", images);
      renderGallery();
      renderSubjects(getFilteredSubjects());
      if (!lightbox.classList.contains("hidden")) closeLightbox();
    };
    item.append(img, button);
    gallery.appendChild(item);
  });
}

function openLightbox(index) {
  const subjectImages = images[currentSubject] || [];
  if (!subjectImages[index]) return;
  lightboxIndex = index;
  lightboxImage.src = subjectImages[index];
  lightboxImage.classList.remove("zoomed");
  lightboxCaption.textContent = `รูปที่ ${index + 1} / ${subjectImages.length} — คลิกที่รูปเพื่อขยายอีกครั้ง`;
  const many = subjectImages.length > 1;
  document.querySelector(".lightbox-prev").classList.toggle("hidden", !many);
  document.querySelector(".lightbox-next").classList.toggle("hidden", !many);
  lightbox.classList.remove("hidden");
  setModalOpen(true);
}

function closeLightbox() {
  lightbox.classList.add("hidden");
  lightboxImage.src = "";
  lightboxImage.classList.remove("zoomed");
  if (modal.classList.contains("hidden") && createModal.classList.contains("hidden")) {
    setModalOpen(false);
  }
}

function showLightboxImage(step) {
  const subjectImages = images[currentSubject] || [];
  if (!subjectImages.length) return;
  lightboxIndex = (lightboxIndex + step + subjectImages.length) % subjectImages.length;
  openLightbox(lightboxIndex);
}

function renderWorks() {
  const items = works[currentSubject] || [];
  workList.innerHTML = "";
  if (!items.length) {
    workList.innerHTML = "<li class='work-item'>ยังไม่มีผลงานหรือการบ้าน</li>";
    return;
  }
  items.forEach(item => {
    const li = document.createElement("li");
    li.className = `work-item${item.done ? " done" : ""}`;
    li.innerHTML = `
      <input type="checkbox" ${item.done ? "checked" : ""}>
      <span>${escapeHtml(item.title)}</span>
      <button type="button">ลบ</button>
    `;
    li.querySelector("input").onchange = event => {
      item.done = event.target.checked;
      saveJson("studyWorks", works);
      renderWorks();
      renderSubjects(getFilteredSubjects());
    };
    li.querySelector("button").onclick = () => {
      works[currentSubject] = items.filter(entry => entry.id !== item.id);
      saveJson("studyWorks", works);
      renderWorks();
      renderSubjects(getFilteredSubjects());
    };
    workList.appendChild(li);
  });
}

function renderEmojiRow() {
  const row = document.getElementById("emojiRow");
  row.innerHTML = "";
  EMOJIS.forEach(emoji => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = emoji;
    button.onclick = () => {
      document.getElementById("subjectIconInput").value = emoji;
    };
    row.appendChild(button);
  });
}

document.getElementById("searchInput").addEventListener("input", () => {
  renderSubjects(getFilteredSubjects());
});

document.getElementById("addSubjectBtn").addEventListener("click", () => openCreateSubjectModal());
document.getElementById("createSubjectForm").addEventListener("submit", saveSubject);
document.getElementById("editSubjectBtn").addEventListener("click", () => {
  openCreateSubjectModal(getSubject(currentSubject));
});

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => switchTab(tab.dataset.tab));
});

document.getElementById("imageInput").addEventListener("change", event => {
  addImages(event.target.files);
  event.target.value = "";
});

["dragenter", "dragover"].forEach(type => {
  uploadArea.addEventListener(type, event => {
    event.preventDefault();
    uploadArea.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach(type => {
  uploadArea.addEventListener(type, event => {
    event.preventDefault();
    uploadArea.classList.remove("dragover");
  });
});

uploadArea.addEventListener("drop", event => {
  addImages(event.dataTransfer.files);
});

notesInput.addEventListener("input", () => {
  document.getElementById("notesStatus").textContent = "กำลังบันทึก...";
  clearTimeout(notesTimer);
  notesTimer = setTimeout(() => {
    notes[currentSubject] = notesInput.value;
    saveJson("studyNotes", notes);
    document.getElementById("notesStatus").textContent = "บันทึกแล้ว";
    renderSubjects(getFilteredSubjects());
  }, 250);
});

document.getElementById("workForm").addEventListener("submit", event => {
  event.preventDefault();
  const title = document.getElementById("workInput").value.trim();
  if (!title) return;
  if (!works[currentSubject]) works[currentSubject] = [];
  works[currentSubject].push({ id: Date.now(), title, done: false });
  saveJson("studyWorks", works);
  document.getElementById("workInput").value = "";
  renderWorks();
  renderSubjects(getFilteredSubjects());
});

modal.addEventListener("click", event => {
  if (event.target === modal) closeModal();
});

createModal.addEventListener("click", event => {
  if (event.target === createModal) closeCreateSubjectModal();
});

lightbox.addEventListener("click", event => {
  if (event.target === lightbox) closeLightbox();
});

document.querySelector(".lightbox-close").addEventListener("click", closeLightbox);
document.querySelector(".lightbox-prev").addEventListener("click", () => showLightboxImage(-1));
document.querySelector(".lightbox-next").addEventListener("click", () => showLightboxImage(1));
lightboxImage.addEventListener("click", () => lightboxImage.classList.toggle("zoomed"));

document.addEventListener("keydown", event => {
  if (!lightbox.classList.contains("hidden")) {
    if (event.key === "Escape") closeLightbox();
    if (event.key === "ArrowLeft") showLightboxImage(-1);
    if (event.key === "ArrowRight") showLightboxImage(1);
    return;
  }
  if (event.key === "Escape") {
    closeCreateSubjectModal();
    closeModal();
  }
});

renderEmojiRow();
renderSubjects();
