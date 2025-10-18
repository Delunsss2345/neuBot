import fs from "fs/promises";

// Signal to existing bot process to start working
async function startBot() {
  console.log("✅ Đã nhận lệnh chạy bot!");
  console.log("📊 Bot sẽ bắt đầu theo dõi nhóm...");

  // Create a flag file
  await fs.writeFile("./bot-running.flag", "true");
  console.log("✅ Bot đang hoạt động!");
}

startBot();
