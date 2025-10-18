import fs from "fs/promises";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

class FacebookAutoCommentBot {
  constructor() {
    this.browser = null;
    this.page = null;
    this.processedPosts = new Set();
    this.config = null;
    this.isRunning = false;
  }

  async loadConfig() {
    try {
      const configData = await fs.readFile("config.json", "utf8");
      this.config = JSON.parse(configData);
    } catch (error) {
      console.error("❌ Lỗi đọc cấu hình:", error.message);
      process.exit(1);
    }
  }

  async randomDelay() {
    const delay =
      Math.random() * (this.config.delayMax - this.config.delayMin) +
      this.config.delayMin;
    await new Promise((resolve) => setTimeout(resolve, delay));
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
      userDataDir: "./user-data",
    });

    const pages = await this.browser.pages();
    this.page = pages[0] || (await this.browser.newPage());

    await this.page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    console.log("✅ Browser đã khởi động");
  }

  async checkLogin() {
    try {
      console.log("🔍 Đang kiểm tra đăng nhập...");

      await this.page.goto("https://www.facebook.com/", {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      await this.randomDelay();

      const isLoggedIn = await this.page.evaluate(() => {
        return (
          document.querySelector('[aria-label="Tài khoản"]') !== null ||
          document.querySelector('[aria-label="Account"]') !== null ||
          document.querySelector('[data-visualcompletion="ignore-dynamic"]') !==
            null
        );
      });

      if (isLoggedIn) {
        console.log("✅ Đã đăng nhập!");
        return true;
      } else {
        console.log("⚠️ Chưa đăng nhập. Vui lòng đăng nhập thủ công...");
        console.log("⏳ Chờ 60 giây để bạn đăng nhập...");

        await new Promise((resolve) => setTimeout(resolve, 60000));

        return await this.checkLogin();
      }
    } catch (error) {
      console.error("❌ Lỗi kiểm tra đăng nhập:", error.message);
      return false;
    }
  }

  async navigateToGroup() {
    try {
      console.log("📍 Đang vào nhóm...");
      await this.page.goto(this.config.groupUrl, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });
      await this.randomDelay();
      console.log("✅ Đã vào nhóm");
      return true;
    } catch (error) {
      console.error("❌ Lỗi khi vào nhóm:", error.message);
      return false;
    }
  }

  async getNewPosts() {
    try {
      await this.page.evaluate(() => window.scrollBy(0, 300));
      await this.randomDelay();

      const posts = await this.page.evaluate(() => {
        const postElements = document.querySelectorAll('div[role="article"]');
        const results = [];

        postElements.forEach((post, index) => {
          const postId =
            post.getAttribute("aria-posinset") ||
            post.getAttribute("data-ad-preview") ||
            `post-${index}`;
          results.push({ id: postId, element: index });
        });

        return results;
      });

      return posts;
    } catch (error) {
      console.error("❌ Lỗi khi lấy danh sách bài viết:", error.message);
      return [];
    }
  }

  async commentOnPost(postIndex) {
    try {
      console.log(`💬 Đang comment vào bài viết #${postIndex}...`);

      await this.page.waitForSelector('div[role="article"]', {
        timeout: 10000,
      });
      await this.randomDelay();

      await this.page.evaluate((index) => {
        const posts = document.querySelectorAll('div[role="article"]');
        if (posts[index]) {
          posts[index].scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, postIndex);

      await this.randomDelay();

      const commentBoxClicked = await this.page.evaluate((index) => {
        const posts = document.querySelectorAll('div[role="article"]');
        if (posts[index]) {
          const commentInputs = posts[index].querySelectorAll(
            'div[contenteditable="true"], div[role="textbox"]'
          );
          for (let input of commentInputs) {
            const ariaLabel = input.getAttribute("aria-label") || "";
            if (
              ariaLabel.includes("comment") ||
              ariaLabel.includes("bình luận") ||
              ariaLabel.includes("Comment")
            ) {
              input.click();
              return true;
            }
          }
        }
        return false;
      }, postIndex);

      if (!commentBoxClicked) {
        console.log("⚠️ Không tìm thấy ô comment");
        return false;
      }

      await this.randomDelay();
      await this.page.keyboard.type(this.config.commentText, { delay: 50 });
      await this.randomDelay();
      await this.page.keyboard.press("Enter");

      console.log("✅ Đã comment thành công!");
      await this.randomDelay();
      return true;
    } catch (error) {
      console.error("❌ Lỗi khi comment:", error.message);
      return false;
    }
  }

  async monitorGroup() {
    console.log("👀 Bắt đầu theo dõi nhóm...");
    console.log(`⏰ Kiểm tra mỗi ${this.config.checkInterval / 1000} giây`);

    this.isRunning = true;

    while (this.isRunning) {
      try {
        // Check if stop flag exists
        try {
          await fs.access("./bot-stop.flag");
          console.log("🛑 Nhận lệnh dừng bot");
          await fs.unlink("./bot-stop.flag");
          break;
        } catch {
          // File doesn't exist, continue
        }

        await this.page.reload({ waitUntil: "networkidle2" });
        await this.randomDelay();

        const posts = await this.getNewPosts();
        console.log(`📊 Tìm thấy ${posts.length} bài viết`);

        for (const post of posts) {
          if (!this.processedPosts.has(post.id)) {
            console.log(`🆕 Phát hiện bài viết mới: ${post.id}`);
            const success = await this.commentOnPost(post.element);
            if (success) {
              this.processedPosts.add(post.id);
              console.log(`✅ Đã xử lý bài viết ${post.id}`);
            }
            await this.randomDelay();
          }
        }

        console.log(
          `⏳ Chờ ${
            this.config.checkInterval / 1000
          } giây trước khi kiểm tra lại...`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, this.config.checkInterval)
        );
      } catch (error) {
        console.error("❌ Lỗi trong vòng lặp:", error.message);
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }
    }
  }

  async run() {
    try {
      await this.loadConfig();
      await this.initialize();

      const loginSuccess = await this.checkLogin();
      if (!loginSuccess) {
        console.error("❌ Không thể đăng nhập.");
        return;
      }

      const groupSuccess = await this.navigateToGroup();
      if (!groupSuccess) {
        console.error("❌ Không thể vào nhóm.");
        return;
      }

      await this.monitorGroup();
    } catch (error) {
      console.error("❌ Lỗi nghiêm trọng:", error);
    }
  }

  async stop() {
    this.isRunning = false;
    if (this.browser) {
      await this.browser.close();
      console.log("🛑 Bot đã dừng");
    }
  }
}

const bot = new FacebookAutoCommentBot();
bot.run();

process.on("SIGINT", async () => {
  console.log("\n🛑 Đang dừng bot...");
  await bot.stop();
  process.exit(0);
});
