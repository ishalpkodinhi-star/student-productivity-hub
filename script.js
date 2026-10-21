const $ = (id) => document.getElementById(id);

const STORAGE_KEY = "ishalStudentHubV2";

function loadData() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      tasks: Array.isArray(data.tasks) ? data.tasks : [],
      sessions: Array.isArray(data.sessions) ? data.sessions : []
    };
  } catch {
    return { tasks: [], sessions: [] };
  }
}

let data = loadData();

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    alert("Could not save data. Please export a backup.");
  }
}

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function makeId() {
  return Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8);
}

let selectedDate = dateKey(new Date());
let displayedMonth = new Date(
  new Date().getFullYear(),
  new Date().getMonth(),
  1
);

// ---------- CALENDAR ----------

function renderCalendar() {
  const grid = $("calendarGrid");
  const label = $("monthLabel");

  if (!grid || !label) return;

  const year = displayedMonth.getFullYear();
  const month = displayedMonth.getMonth();

  label.textContent = displayedMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });

  grid.innerHTML = "";

  // JavaScript Sunday = 0. Convert to Monday-first calendar.
  const firstWeekday = new Date(year, month, 1).getDay();
  const blanks = (firstWeekday + 6) % 7;
  const totalDays = new Date(year, month + 1, 0).getDate();
  const today = dateKey(new Date());

  for (let i = 0; i < blanks; i++) {
    const empty = document.createElement("div");
    empty.className = "calendar-day empty";
    empty.setAttribute("aria-hidden", "true");
    grid.appendChild(empty);
  }

  for (let day = 1; day <= totalDays; day++) {
    const current = new Date(year, month, day);
    const key = dateKey(current);
    const button = document.createElement("button");

    button.type = "button";
    button.className = "calendar-day";
    button.textContent = day;

    if (key === today) button.classList.add("today");
    if (key === selectedDate) button.classList.add("selected");

    if (data.tasks.some(task => task.due === key && !task.done)) {
      button.classList.add("has-task");
    }

    button.setAttribute("aria-label", current.toDateString());

    button.addEventListener("click", () => {
      selectedDate = key;
      renderCalendar();
      renderTasks();
    });

    grid.appendChild(button);
  }

  $("selectedDate").textContent =
    "Selected date: " +
    new Date(year, month, Number(selectedDate.slice(8, 10)))
      .toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });

  // Correct the selected-date label when selected date is in another month.
  const parts = selectedDate.split("-").map(Number);
  $("selectedDate").textContent =
    "Selected date: " +
    new Date(parts[0], parts[1] - 1, parts[2])
      .toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });

  renderDateTasks();
}

$("prevMonth").addEventListener("click", () => {
  displayedMonth = new Date(
    displayedMonth.getFullYear(),
    displayedMonth.getMonth() - 1,
    1
  );
  renderCalendar();
});

$("nextMonth").addEventListener("click", () => {
  displayedMonth = new Date(
    displayedMonth.getFullYear(),
    displayedMonth.getMonth() + 1,
    1
  );
  renderCalendar();
});

$("todayBtn").addEventListener("click", () => {
  const today = new Date();
  selectedDate = dateKey(today);
  displayedMonth = new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  );
  renderCalendar();
  renderTasks();
});

function renderDateTasks() {
  const box = $("dateTasks");
  const matching = data.tasks.filter(task => task.due === selectedDate);

  if (!matching.length) {
    box.innerHTML = '<p class="empty-message">No assignments for this date.</p>';
    return;
  }

  box.innerHTML = matching.map(task => `
    <p class="empty-message">
      ${task.done ? "✓" : "•"}
      ${escapeHTML(task.title)} — ${escapeHTML(task.subject)}
      ${task.done ? "(Completed)" : "(Pending)"}
    </p>
  `).join("");
}

// ---------- ASSIGNMENTS ----------

$("taskForm").addEventListener("submit", event => {
  event.preventDefault();

  const title = $("taskTitle").value.trim();
  const subject = $("taskSubject").value.trim();
  const due = $("taskDue").value;

  if (!title || !subject || !due) {
    alert("Please fill in all assignment fields.");
    return;
  }

  data.tasks.push({
    id: makeId(),
    title,
    subject,
    due,
    priority: $("taskPriority").value,
    done: false
  });

  selectedDate = due;
  const parts = due.split("-").map(Number);
  displayedMonth = new Date(parts[0], parts[1] - 1, 1);

  saveData();
  $("taskForm").reset();
  renderAll();
});

$("taskSearch").addEventListener("input", renderTasks);
$("taskFilter").addEventListener("change", renderTasks);

function renderTasks() {
  const search = $("taskSearch").value.trim().toLowerCase();
  const filter = $("taskFilter").value;
  const list = $("taskList");

  const tasks = data.tasks.filter(task => {
    const matchesSearch =
      task.title.toLowerCase().includes(search) ||
      task.subject.toLowerCase().includes(search);

    const matchesFilter =
      filter === "all" ||
      (filter === "pending" && !task.done) ||
      (filter === "completed" && task.done);

    return matchesSearch && matchesFilter;
  });

  if (!tasks.length) {
    list.innerHTML = '<p class="empty-message">No assignments found. Add your first task above!</p>';
  } else {
    list.innerHTML = tasks.map(task => `
      <article class="task-item ${task.done ? "done" : ""}">
        <div class="task-info">
          <h3>${escapeHTML(task.title)}</h3>
          <p>${escapeHTML(task.subject)} · Due: ${escapeHTML(task.due)}</p>
          <p class="priority">Priority: ${escapeHTML(task.priority)}</p>
        </div>
        <div class="task-actions">
          <button class="small-btn" data-action="toggle"
            data-id="${task.id}" type="button">
            ${task.done ? "Undo" : "Complete"}
          </button>
          <button class="small-btn delete-btn" data-action="delete"
            data-id="${task.id}" type="button">Delete</button>
        </div>
      </article>
    `).join("");
  }

  $("totalCount").textContent = data.tasks.length;
  $("completedCount").textContent =
    data.tasks.filter(task => task.done).length;

  renderDateTasks();
}

$("taskList").addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const task = data.tasks.find(t => t.id === button.dataset.id);
  if (!task) return;

  if (button.dataset.action === "toggle") {
    task.done = !task.done;
  } else if (button.dataset.action === "delete") {
    if (!confirm("Delete this assignment?")) return;
    data.tasks = data.tasks.filter(t => t.id !== task.id);
  }

  saveData();
  renderAll();
});

// ---------- STUDY SESSIONS ----------

$("sessionForm").addEventListener("submit", event => {
  event.preventDefault();

  const subject = $("sessionSubject").value.trim();
  const date = $("sessionDate").value;
  const duration = Number($("sessionDuration").value);

  if (!subject || !date || !Number.isFinite(duration) ||
      duration < 1 || duration > 1440) {
    alert("Enter a valid subject, date and duration.");
    return;
  }

  data.sessions.unshift({
    id: makeId(),
    subject,
    date,
    duration
  });

  saveData();
  $("sessionForm").reset();
  $("sessionDate").value = dateKey(new Date());
  $("sessionDuration").value = 30;
  renderSessions();
});

function renderSessions() {
  $("sessionCount").textContent = data.sessions.length;
  const list = $("sessionList");

  if (!data.sessions.length) {
    list.innerHTML = '<p class="empty-message">No study sessions yet. Start studying!</p>';
    return;
  }

  list.innerHTML = data.sessions.map(session => `
    <article class="session-item">
      <div>
        <strong>${escapeHTML(session.subject)}</strong>
        <p>${escapeHTML(session.date)} · ${session.duration} minutes</p>
      </div>
      <button type="button" class="small-btn delete-btn"
        data-session-delete="${session.id}">Delete</button>
    </article>
  `).join("");
}

$("sessionList").addEventListener("click", event => {
  const button = event.target.closest("[data-session-delete]");
  if (!button) return;

  data.sessions = data.sessions.filter(
    session => session.id !== button.dataset.sessionDelete
  );

  saveData();
  renderSessions();
});

// ---------- EXPORT BACKUP ----------

$("exportBtn").addEventListener("click", () => {
  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ishal-study-hub-backup.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

// ---------- INITIALISE ----------

function renderAll() {
  renderTasks();
  renderCalendar();
  renderSessions();
}

$("sessionDate").value = dateKey(new Date());
renderAll();
/* ---------- STUDY TIMER ---------- */

let timerDuration = 25 * 60;
let timerRemaining = timerDuration;
let timerInterval = null;
let timerEndTime = null;

const timerDisplay = document.getElementById("timerDisplay");
const timerStatus = document.getElementById("timerStatus");

function updateTimerDisplay() {
  const minutes = Math.floor(timerRemaining / 60);
  const seconds = timerRemaining % 60;

  timerDisplay.textContent =
    String(minutes).padStart(2, "0") + ":" +
    String(seconds).padStart(2, "0");

  document.title = timerInterval
    ? `${timerDisplay.textContent} - Study Hub`
    : "Student Productivity Hub";
}

function stopTimer() {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  timerEndTime = null;
  updateTimerDisplay();
}

function tickTimer() {
  if (timerEndTime === null) return;

  timerRemaining = Math.max(
    0,
    Math.ceil((timerEndTime - Date.now()) / 1000)
  );

  updateTimerDisplay();

  if (timerRemaining <= 0) {
    stopTimer();
    timerStatus.textContent = "🎉 Focus session complete!";
    alert("Great job! Your study timer is complete.");
  }
}

document.querySelectorAll(".timer-preset").forEach(button => {
  button.addEventListener("click", () => {
    stopTimer();

    timerDuration = Number(button.dataset.minutes) * 60;
    timerRemaining = timerDuration;

    document.querySelectorAll(".timer-preset").forEach(item => {
      item.classList.toggle("active", item === button);
    });

    timerStatus.textContent = "Ready to focus";
    updateTimerDisplay();
  });
});

document.getElementById("timerStart").addEventListener("click", () => {
  if (timerInterval !== null) return;

  if (timerRemaining <= 0) {
    timerRemaining = timerDuration;
  }

  timerEndTime = Date.now() + timerRemaining * 1000;
  timerStatus.textContent = "🔥 Focus time — keep going!";

  timerInterval = setInterval(tickTimer, 250);
  tickTimer();
});

document.getElementById("timerPause").addEventListener("click", () => {
  if (timerInterval === null) return;

  tickTimer();

  if (timerInterval !== null) {
    stopTimer();
    timerStatus.textContent = "Timer paused";
  }
});

document.getElementById("timerReset").addEventListener("click", () => {
  stopTimer();
  timerRemaining = timerDuration;
  timerStatus.textContent = "Ready to focus";
  updateTimerDisplay();
});

document.querySelector('.timer-preset[data-minutes="25"]')
  .classList.add("active");

updateTimerDisplay();
