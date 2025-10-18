import fs from "fs/promises";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

class FacebookBotManual {
  constructor() {
    this.browser = null;
    this.page = null;
    this.config = null;
  }

  async loadConfig() {
    try {
      const configData = await fs.readFile("config.json", "utf8");
      this.config = JSON.parse(configData);
      console.log("✅ Đã load cấu hình");
    } catch (error) {
      console.error("❌ Lỗi đọc cấu hình:", error.message);
      process.exit(1);
    }
  }

  async initialize() {
    console.log("🚀 Đang khởi động browser...");
    this.browser = await puppeteer.launch({
      headless: false,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-web-security",
        "--lang=vi-VN,vi",
      ],
      defaultViewport: { width: 1280, height: 800 },
      userDataDir: "./user-data", // Lưu session
    });

    this.page = await this.browser.newPage();
    await this.page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    console.log("✅ Browser đã khởi động");
  }

  async openFacebook() {
    try {
      console.log("🌐 Đang mở Facebook...");
      await this.page.goto("https://www.facebook.com/", {
        waitUntil: "networkidle2",
      });

      console.log("✅ Facebook đã mở");
      console.log("👉 VUI LÒNG ĐĂNG NHẬP FACEBOOK TRONG CỬA SỔ NÀY");
      console.log("👉 Sau khi đăng nhập xong, nhấn nút 'Chạy Bot' trong GUI");
      console.log("");
      console.log("⏳ Bot đang chờ lệnh từ GUI...");

      // Keep browser open and wait
      await this.waitForever();
    } catch (error) {
      console.error("❌ Lỗi:", error.message);
    }
  }

  async waitForever() {
    // Keep process running
    return new Promise(() => {});
  }

  async run() {
    await this.loadConfig();
    await this.initialize();
    await this.openFacebook();
  }
}

const bot = new FacebookBotManual();
bot.run();

process.on("SIGINT", async () => {
  console.log("\n🛑 Đang đóng browser...");
  process.exit(0);
});
