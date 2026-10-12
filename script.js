const $ = (id) => document.getElementById(id);

function loadData(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

let tasks = loadData("studyHubTasks");
let sessions = loadData("studyHubSessions");

function saveData() {
  try {
    localStorage.setItem("studyHubTasks", JSON.stringify(tasks));
    localStorage.setItem("studyHubSessions", JSON.stringify(sessions));
    return true;
  } catch {
    alert("Unable to save data. Check your browser storage settings.");
    return false;
  }
}

function makeElement(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

// Show today's date
$("today").textContent = new Date().toLocaleDateString(
  undefined,
  { weekday: "long", year: "numeric", month: "long", day: "numeric" }
);

// Dashboard counts
function updateStats() {
  const completed = tasks.filter(task => task.done).length;
  $("totalTasks").textContent = tasks.length;
  $("completedTasks").textContent = completed;
  $("progress").textContent = tasks.length
    ? Math.round(completed / tasks.length * 100) + "%"
    : "0%";
}

// Render assignments safely
function renderTasks() {
  const list = $("taskList");
  list.replaceChildren();

  if (!tasks.length) {
    list.append(makeElement("p", "muted", "No assignments yet. Add your first task!"));
  }

  tasks.forEach(task => {
    const card = makeElement("div", "task-item" + (task.done ? " done" : ""));
    const name = makeElement("div", "task-name", task.name);
    const due = makeElement("div", "task-meta", "Due: " + task.date);
    const actions = makeElement("div", "task-actions");
    const toggle = makeElement("button", "secondary", task.done ? "Undo" : "Complete");
    const remove = makeElement("button", "secondary", "Delete");

    toggle.type = "button";
    remove.type = "button";

    toggle.addEventListener("click", () => {
      task.done = !task.done;
      saveData();
      renderTasks();
      updateStats();
    });

    remove.addEventListener("click", () => {
      tasks = tasks.filter(item => item.id !== task.id);
      saveData();
      renderTasks();
      updateStats();
    });

    actions.append(toggle, remove);
    card.append(name, due, actions);
    list.append(card);
  });

  updateStats();
}

$("taskForm").addEventListener("submit", event => {
  event.preventDefault();

  const name = $("taskInput").value.trim();
  const date = $("taskDate").value;

  if (!name || !date) return;

  tasks.push({
    id: Date.now() + Math.random(),
    name,
    date,
    done: false
  });

  saveData();
  $("taskForm").reset();
  renderTasks();
});

// Render timetable
function renderSessions() {
  const list = $("scheduleList");
  list.replaceChildren();

  if (!sessions.length) {
    list.append(makeElement("p", "muted", "No study sessions yet."));
  }

  const days = [
    "Monday", "Tuesday", "Wednesday", "Thursday",
    "Friday", "Saturday", "Sunday"
  ];

  [...sessions]
    .sort((a, b) =>
      days.indexOf(a.day) - days.indexOf(b.day) ||
      a.time.localeCompare(b.time)
    )
    .forEach(session => {
      const card = makeElement("div", "task-item");
      const name = makeElement("div", "task-name", session.subject);
      const info = makeElement("div", "task-meta", session.day + " • " + session.time);
      const remove = makeElement("button", "secondary", "Remove");

      remove.type = "button";
      remove.addEventListener("click", () => {
        sessions = sessions.filter(item => item.id !== session.id);
        saveData();
        renderSessions();
      });

      card.append(name, info, remove);
      list.append(card);
    });
}

$("scheduleForm").addEventListener("submit", event => {
  event.preventDefault();

  const subject = $("subjectInput").value.trim();
  const day = $("dayInput").value;
  const time = $("timeInput").value;

  if (!subject || !time) return;

  sessions.push({
    id: Date.now() + Math.random(),
    subject,
    day,
    time
  });

  saveData();
  $("scheduleForm").reset();
  renderSessions();
});

// 25-minute focus timer
let remaining = 25 * 60;
let timerInterval = null;

function showTimer() {
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  $("timer").textContent =
    String(minutes).padStart(2, "0") + ":" +
    String(seconds).padStart(2, "0");
}

function pauseTimer() {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

$("startTimer").addEventListener("click", () => {
  if (timerInterval !== null || remaining <= 0) return;

  $("timerMessage").textContent = "Focus on your study session!";

  timerInterval = setInterval(() => {
    remaining--;
    showTimer();

    if (remaining <= 0) {
      pauseTimer();
      $("timerMessage").textContent = "Session complete! Time for a short break.";
      alert("Well done! Your 25-minute study session is complete.");
    }
  }, 1000);
});

$("pauseTimer").addEventListener("click", () => {
  pauseTimer();
  $("timerMessage").textContent = "Timer paused.";
});

$("resetTimer").addEventListener("click", () => {
  pauseTimer();
  remaining = 25 * 60;
  showTimer();
  $("timerMessage").textContent = "Ready when you are.";
});

// Load saved information on opening the website
renderTasks();
renderSessions();
showTimer();
