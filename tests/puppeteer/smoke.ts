import puppeteer from "puppeteer";

async function main() {
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.goto(baseUrl);
  const content = await page.content();
  if (!content.includes("SOLON")) {
    throw new Error("Landing page missing SOLON title");
  }
  console.log("Puppeteer smoke OK");
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
