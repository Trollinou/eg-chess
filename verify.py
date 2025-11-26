
import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Add a listener for the 'console' event
        page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.type} {msg.text}"))

        try:
            # Check the main index.html
            print("Checking index.html")
            await page.goto("http://localhost:8080/index.html")
            await expect(page.locator(".cm-chessboard")).to_be_visible(timeout=15000)
            await expect(page.locator("g.piece[data-piece='wp'][data-square='e2']")).to_be_visible()
            print("index.html OK")

            # Check the build_example.html
            print("Checking build_example.html")
            await page.goto("http://localhost:8080/build_example.html")
            await expect(page.locator(".cm-chessboard")).to_be_visible()
            await expect(page.locator("g.piece[data-piece='br'][data-square='a8']")).to_be_visible()
            print("build_example.html OK")

            # Check the examples/basic.html
            print("Checking examples/basic.html")
            await page.goto("http://localhost:8080/examples/basic.html")
            await expect(page.locator(".cm-chessboard")).to_be_visible()
            await expect(page.locator("g.piece[data-piece='wq'][data-square='d1']")).to_be_visible()
            print("examples/basic.html OK")

        except Exception as e:
            print(f"An error occurred: {e}")
            # Take a screenshot on failure to help debug
            await page.screenshot(path="error_screenshot.png")
            print("Screenshot saved to error_screenshot.png")

        finally:
            await browser.close()

asyncio.run(main())
