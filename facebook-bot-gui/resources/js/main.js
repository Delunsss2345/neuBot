let isRunning = false;
let browserOpened = false;

Neutralino.init();

document.addEventListener("DOMContentLoaded", () => {
  initializeApp();
});

function initializeApp() {
  // Event listeners
  document
    .getElementById("commentText")
    .addEventListener("input", updateCharCount);
  document
    .getElementById("toggleAdvanced")
    .addEventListener("click", toggleAdvanced);
  document
    .getElementById("saveConfig")
    .addEventListener("click", saveConfiguration);
  document.getElementById("openBrowser").addEventListener("click", openBrowser);
  document.getElementById("startBot").addEventListener("click", startBot);
  document.getElementById("stopBot").addEventListener("click", stopBot);
  document.getElementById("clearLogs").addEventListener("click", clearLogs);

  // Load config if exists
  loadConfiguration();

  addLog("✅ Ứng dụng đã sẵn sàng!", "success");
  addLog(
    'ℹ️ Nhập URL nhóm và nội dung comment, sau đó nhấn "Lưu cấu hình"',
    "info"
  );
}

function updateCharCount() {
  const text = document.getElementById("commentText").value;
  document.getElementById("charCount").textContent = text.length;
}

function toggleAdvanced() {
  const content = document.getElementById("advancedContent");
  const isVisible = content.style.display !== "none";
  content.style.display = isVisible ? "none" : "block";
}

async function saveConfiguration() {
  try {
    const config = getFormData();

    if (!validateForm(config)) {
      return;
    }

    const botConfig = {
      groupUrl: config.groupUrl,
      commentText: config.commentText,
      checkInterval: parseInt(config.checkInterval) * 1000,
      delayMin: parseInt(config.delayMin),
      delayMax: parseInt(config.delayMax),
    };

    // Save to Neutralino storage
    await Neutralino.storage.setData("botConfig", JSON.stringify(config));
    await Neutralino.storage.setData(
      "botConfigForBot",
      JSON.stringify(botConfig)
    );

    addLog("✅ Đã lưu cấu hình thành công!", "success");
    addLog('ℹ️ Bây giờ hãy nhấn "Mở Browser" để đăng nhập Facebook', "info");

    document.getElementById("openBrowser").disabled = false;

    await Neutralino.os.showNotification("Thành công", "Cấu hình đã được lưu!");
  } catch (error) {
    addLog(`❌ Lỗi khi lưu cấu hình: ${error.message}`, "error");
  }
}

async function loadConfiguration() {
  try {
    const configStr = await Neutralino.storage.getData("botConfig");
    if (configStr) {
      const config = JSON.parse(configStr);
      setFormData(config);
      addLog("📂 Đã tải cấu hình từ bộ nhớ", "info");
      document.getElementById("openBrowser").disabled = false;
    }
  } catch (error) {
    addLog("ℹ️ Chưa có cấu hình. Vui lòng nhập thông tin.", "info");
  }
}

function getFormData() {
  return {
    groupUrl: document.getElementById("groupUrl").value.trim(),
    commentText: document.getElementById("commentText").value.trim(),
    checkInterval: document.getElementById("checkInterval").value,
    delayMin: document.getElementById("delayMin").value,
    delayMax: document.getElementById("delayMax").value,
  };
}

function setFormData(config) {
  document.getElementById("groupUrl").value = config.groupUrl || "";
  document.getElementById("commentText").value = config.commentText || "";
  document.getElementById("checkInterval").value = config.checkInterval || 90;
  document.getElementById("delayMin").value = config.delayMin || 3000;
  document.getElementById("delayMax").value = config.delayMax || 7000;
  updateCharCount();
}

function validateForm(config) {
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

async function openBrowser() {
  try {
    addLog("🌐 Đang mở browser...", "info");

    const botConfigStr = await Neutralino.storage.getData("botConfigForBot");
    const botConfig = JSON.parse(botConfigStr);

    // Create config file
    const configContent = JSON.stringify(botConfig, null, 2);
    await Neutralino.filesystem.writeFile("./bot/config.json", configContent);

    // Start browser in manual mode
    const osInfo = await Neutralino.computer.getOSInfo();
    let command = "";

    if (osInfo.name === "Windows") {
      command = "cd bot && node bot-manual.js";
    } else {
      command = "cd bot && node bot-manual.js";
    }

    await Neutralino.os.execCommand(command, { background: true });

    browserOpened = true;
    updateStatus("waiting", "Chờ đăng nhập...");

    addLog("✅ Browser đã mở!", "success");
    addLog(
      "👉 Vui lòng đăng nhập Facebook trong cửa sổ Chrome vừa mở",
      "warning"
    );
    addLog('👉 Sau khi đăng nhập xong, nhấn "Chạy Bot"', "warning");

    document.getElementById("openBrowser").disabled = true;
    document.getElementById("startBot").disabled = false;

    await Neutralino.os.showNotification(
      "Browser đã mở",
      "Hãy đăng nhập Facebook trong cửa sổ Chrome!"
    );
  } catch (error) {
    addLog(`❌ Lỗi khi mở browser: ${error.message}`, "error");
  }
}

async function startBot() {
  try {
    addLog("▶️ Đang khởi động bot...", "info");

    // Send signal to start bot
    const osInfo = await Neutralino.computer.getOSInfo();
    let command = "";

    if (osInfo.name === "Windows") {
      command = "cd bot && node start-bot.js";
    } else {
      command = "cd bot && node start-bot.js";
    }

    await Neutralino.os.execCommand(command, { background: true });

    isRunning = true;
    updateStatus("active", "Bot đang chạy...");

    document.getElementById("startBot").disabled = true;
    document.getElementById("stopBot").disabled = false;
    document.getElementById("saveConfig").disabled = true;
    document.getElementById("openBrowser").disabled = true;

    addLog("✅ Bot đã bắt đầu hoạt động!", "success");
    addLog("📊 Bot đang theo dõi nhóm và tự động comment...", "info");

    await Neutralino.os.showNotification(
      "Bot đang chạy",
      "Bot đã bắt đầu tự động comment!"
    );
  } catch (error) {
    addLog(`❌ Lỗi khi khởi động bot: ${error.message}`, "error");
    isRunning = false;
  }
}

async function stopBot() {
  try {
    addLog("🛑 Đang dừng bot...", "warning");

    const osInfo = await Neutralino.computer.getOSInfo();

    if (osInfo.name === "Windows") {
      await Neutralino.os.execCommand("taskkill /F /IM node.exe");
    } else {
      await Neutralino.os.execCommand('pkill -f "node"');
    }

    isRunning = false;
    browserOpened = false;
    updateStatus("inactive", "Bot đã dừng");

    document.getElementById("startBot").disabled = true;
    document.getElementById("stopBot").disabled = true;
    document.getElementById("saveConfig").disabled = false;
    document.getElementById("openBrowser").disabled = false;

    addLog("✅ Bot đã được dừng!", "info");
    await Neutralino.os.showNotification("Đã dừng", "Bot đã dừng hoạt động");
  } catch (error) {
    addLog(`⚠️ Lỗi khi dừng bot: ${error.message}`, "warning");
  }
}

function updateStatus(state, text) {
  const indicator = document.getElementById("statusIndicator");
  const statusText = document.getElementById("statusText");

  indicator.className = `status-indicator ${state}`;
  statusText.textContent = text;
}

function addLog(message, type = "info") {
  const logsContainer = document.getElementById("logs");
  const logEntry = document.createElement("p");
  logEntry.className = `log-${type}`;

  const timestamp = new Date().toLocaleTimeString("vi-VN");
  logEntry.textContent = `[${timestamp}] ${message}`;

  logsContainer.appendChild(logEntry);
  logsContainer.scrollTop = logsContainer.scrollHeight;

  const logs = logsContainer.querySelectorAll("p");
  if (logs.length > 100) {
    logs[0].remove();
  }
}

function clearLogs() {
  const logsContainer = document.getElementById("logs");
  logsContainer.innerHTML = '<p class="log-info">Đã xóa logs</p>';
}

Neutralino.events.on("windowClose", async () => {
  if (isRunning) {
    await stopBot();
  }
  Neutralino.app.exit();
});
