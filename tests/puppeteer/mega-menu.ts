import puppeteer from "puppeteer";

async function main() {
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.goto(baseUrl);

  // Hover over a top-level item to open mega menu
  const selector = 'nav [role="menubar"] button, nav [role="menubar"] a';
  await page.waitForSelector(selector, { timeout: 5000 });
  const items = await page.$$(selector);
  if (items.length === 0) throw new Error("No navigation items found");

  // Prefer a button (has children)
  const button = await page.$('nav [role="menubar"] button');
  if (button) {
    await button.hover();
    // Wait for dropdown
    await page.waitForSelector('[role="menu"]', { timeout: 3000 });
  }

  console.log("Mega menu hover OK");
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
