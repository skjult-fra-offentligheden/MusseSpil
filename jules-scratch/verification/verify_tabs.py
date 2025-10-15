from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto("http://localhost:8080/")
        page.wait_for_selector('canvas', state='visible')

        # Click the "Play Game" button by simulating a mouse click on the canvas
        canvas = page.locator('canvas')
        box = canvas.bounding_box()
        if box:
            # More precise coordinates
            x = box['x'] + (box['width'] * 0.85)
            y = box['y'] + (box['height'] * 0.55)
            page.mouse.click(x, y)

        # Wait for the game to load, then press "J" to open the journal
        page.wait_for_timeout(5000) # Wait for scene transition
        page.keyboard.press('J')
        page.wait_for_timeout(2000) # Wait for journal to open

        page.screenshot(path="jules-scratch/verification/verification.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)