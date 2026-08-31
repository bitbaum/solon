import puppeteer from "puppeteer";

async function main() {
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });

  await page.waitForSelector('nav [role="menubar"]', { timeout: 5000 });
  await page.waitForSelector('nav [role="menubar"] button');
  const clicked = await page.evaluate(() => {
    const btn = document.querySelector('nav [role="menubar"] button');
    if (!btn) return false;
    btn.click();
    return true;
  });
  if (!clicked) throw new Error("No dropdown button present");
  await page.waitForFunction(
    () => {
      const btn = document.querySelector('nav [role="menubar"] button');
      return btn && btn.getAttribute("aria-expanded") === "true";
    },
    { timeout: 5000 },
  );

  console.log("Mega menu hover OK");
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
