let isRunning = false;

// Khởi tạo Neutralino
Neutralino.init();

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  initializeApp();
});

function initializeApp() {
  // Toggle password visibility
  document
    .getElementById("togglePassword")
    .addEventListener("click", togglePassword);

  // Character counter
  document
    .getElementById("commentText")
    .addEventListener("input", updateCharCount);

  // Button handlers
  document
    .getElementById("saveConfig")
    .addEventListener("click", saveConfiguration);
  document
    .getElementById("loadConfig")
    .addEventListener("click", loadConfiguration);
  document.getElementById("startBot").addEventListener("click", startBot);
  document.getElementById("stopBot").addEventListener("click", stopBot);
  document.getElementById("clearLogs").addEventListener("click", clearLogs);

  // Load existing config if available
  loadConfiguration();

  addLog("✅ Ứng dụng đã sẵn sàng!", "success");
}

// Toggle password visibility
function togglePassword() {
  const passwordInput = document.getElementById("password");
  const type = passwordInput.type === "password" ? "text" : "password";
  passwordInput.type = type;
}

// Update character count
function updateCharCount() {
  const text = document.getElementById("commentText").value;
  document.getElementById("charCount").textContent = text.length;
}

// Save configuration
// Save configuration
async function saveConfiguration() {
  try {
    const config = getFormData();

    // Validate form
    if (!validateForm(config)) {
      return;
    }

    // Convert to bot config format
    const botConfig = {
      email: config.email,
      password: config.password,
      groupUrl: config.groupUrl,
      commentText: config.commentText,
      checkInterval: parseInt(config.checkInterval) * 1000,
      delayMin: parseInt(config.delayMin),
      delayMax: parseInt(config.delayMax),
    };

    // Save to storage for GUI (primary storage)
    await Neutralino.storage.setData("botConfig", JSON.stringify(config));

    // Try to save to file (secondary storage - optional)
    try {
      // Get current working directory
      const cwd = await Neutralino.os.execCommand("cd", { background: false });
      const configPath = "./bot/config.json";

      await Neutralino.filesystem.writeFile(
        configPath,
        JSON.stringify(botConfig, null, 2)
      );
      addLog("✅ Đã lưu cấu hình vào file!", "success");
    } catch (fileError) {
      // If file save fails, create config dynamically when starting bot
      addLog("ℹ️ Cấu hình sẽ được tạo khi chạy bot", "info");
    }

    addLog("✅ Đã lưu cấu hình thành công!", "success");
    document.getElementById("startBot").disabled = false;

    await Neutralino.os.showNotification("Thành công", "Cấu hình đã được lưu!");
  } catch (error) {
    addLog(`❌ Lỗi khi lưu cấu hình: ${error.message}`, "error");
    await Neutralino.os.showNotification("Lỗi", "Không thể lưu cấu hình!");
  }
}

// Load configuration
async function loadConfiguration() {
  try {
    const configStr = await Neutralino.storage.getData("botConfig");
    if (configStr) {
      const config = JSON.parse(configStr);
      setFormData(config);
      addLog("📂 Đã tải cấu hình từ bộ nhớ", "info");
      document.getElementById("startBot").disabled = false;
    }
  } catch (error) {
    addLog("ℹ️ Chưa có cấu hình. Vui lòng nhập thông tin.", "info");
  }
}

// Get form data
function getFormData() {
  return {
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value,
    groupUrl: document.getElementById("groupUrl").value.trim(),
    commentText: document.getElementById("commentText").value.trim(),
    checkInterval: document.getElementById("checkInterval").value,
    delayMin: document.getElementById("delayMin").value,
    delayMax: document.getElementById("delayMax").value,
  };
}

// Set form data
function setFormData(config) {
  document.getElementById("email").value = config.email || "";
  document.getElementById("password").value = config.password || "";
  document.getElementById("groupUrl").value = config.groupUrl || "";
  document.getElementById("commentText").value = config.commentText || "";
  document.getElementById("checkInterval").value = config.checkInterval || 60;
  document.getElementById("delayMin").value = config.delayMin || 2000;
  document.getElementById("delayMax").value = config.delayMax || 5000;
  updateCharCount();
}

// Validate form
function validateForm(config) {
  if (!config.email) {
    addLog("❌ Vui lòng nhập email!", "error");
    return false;
  }

  if (!config.password) {
    addLog("❌ Vui lòng nhập mật khẩu!", "error");
    return false;
  }

  if (!config.groupUrl || !config.groupUrl.includes("facebook.com/groups/")) {
    addLog("❌ URL nhóm không hợp lệ!", "error");
    return false;
  }

  if (!config.commentText) {
    addLog("❌ Vui lòng nhập nội dung comment!", "error");
    return false;
  }

  if (parseInt(config.delayMin) > parseInt(config.delayMax)) {
    addLog("❌ Delay tối thiểu phải nhỏ hơn delay tối đa!", "error");
    return false;
  }

  return true;
}

// Start bot
// Start bot
async function startBot() {
  try {
    addLog("🚀 Đang khởi động bot...", "info");

    // Get config from storage
    const configStr = await Neutralino.storage.getData("botConfig");
    const config = JSON.parse(configStr);

    // Convert to bot config format
    const botConfig = {
      email: config.email,
      password: config.password,
      groupUrl: config.groupUrl,
      commentText: config.commentText,
      checkInterval: parseInt(config.checkInterval) * 1000,
      delayMin: parseInt(config.delayMin),
      delayMax: parseInt(config.delayMax),
    };

    // Create config.json in bot folder
    try {
      await Neutralino.filesystem.writeFile(
        "./bot/config.json",
        JSON.stringify(botConfig, null, 2)
      );
      addLog("✅ Đã tạo file cấu hình cho bot", "success");
    } catch (error) {
      addLog("⚠️ Không thể tạo file config, sẽ dùng cách khác", "warning");
    }

    // Get OS info to determine command
    const osInfo = await Neutralino.computer.getOSInfo();
    let command = "";

    if (osInfo.name === "Windows") {
      command = "cd bot && node bot.js";
    } else {
      command = "cd bot && node bot.js";
    }

    // Execute bot script
    await Neutralino.os.execCommand(command, {
      background: true,
    });

    isRunning = true;
    updateStatus("active", "Bot đang chạy...");

    document.getElementById("startBot").disabled = true;
    document.getElementById("stopBot").disabled = false;
    document.getElementById("saveConfig").disabled = true;

    addLog("✅ Bot đã được khởi động!", "success");
    addLog("ℹ️ Một cửa sổ Chrome sẽ mở ra...", "info");
    await Neutralino.os.showNotification("Thành công", "Bot đã bắt đầu chạy!");
  } catch (error) {
    addLog(`❌ Lỗi khi khởi động bot: ${error.message}`, "error");
    await Neutralino.os.showNotification("Lỗi", "Không thể khởi động bot!");
    isRunning = false;

    document.getElementById("startBot").disabled = false;
    document.getElementById("stopBot").disabled = true;
    document.getElementById("saveConfig").disabled = false;
  }
}

// Stop bot
async function stopBot() {
  try {
    addLog("🛑 Đang dừng bot...", "warning");

    const osInfo = await Neutralino.computer.getOSInfo();

    if (osInfo.name === "Windows") {
      await Neutralino.os.execCommand(
        'taskkill /F /IM node.exe /FI "WINDOWTITLE eq facebook-bot*"'
      );
    } else {
      await Neutralino.os.execCommand('pkill -f "bot.js"');
    }

    isRunning = false;
    updateStatus("inactive", "Bot đã dừng");

    document.getElementById("startBot").disabled = false;
    document.getElementById("stopBot").disabled = true;
    document.getElementById("saveConfig").disabled = false;

    addLog("✅ Bot đã được dừng!", "info");
    await Neutralino.os.showNotification("Thông báo", "Bot đã dừng hoạt động");
  } catch (error) {
    addLog(`⚠️ Lỗi khi dừng bot: ${error.message}`, "warning");
  }
}

// Update status bar
function updateStatus(state, text) {
  const indicator = document.getElementById("statusIndicator");
  const statusText = document.getElementById("statusText");

  indicator.className = `status-indicator ${state}`;
  statusText.textContent = text;
}

// Add log message
function addLog(message, type = "info") {
  const logsContainer = document.getElementById("logs");
  const logEntry = document.createElement("p");
  logEntry.className = `log-${type}`;

  const timestamp = new Date().toLocaleTimeString("vi-VN");
  logEntry.textContent = `[${timestamp}] ${message}`;

  logsContainer.appendChild(logEntry);
  logsContainer.scrollTop = logsContainer.scrollHeight;

  // Keep only last 50 logs
  const logs = logsContainer.querySelectorAll("p");
  if (logs.length > 50) {
    logs[0].remove();
  }
}

// Clear logs
function clearLogs() {
  const logsContainer = document.getElementById("logs");
  logsContainer.innerHTML = '<p class="log-info">Đã xóa logs</p>';
}

// Handle window close
Neutralino.events.on("windowClose", async () => {
  if (isRunning) {
    await stopBot();
  }
  Neutralino.app.exit();
});
