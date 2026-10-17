# StyleMate Gmail purchase routine

Daily Claude cloud routine (Gmail connector attached) that finds clothing order
confirmations and posts the order lines to the StyleMate ingest API. New lines land
in StyleMate's "On the way" queue for approval. Dedupe lives server-side
(`source_ref = gmail:<message_id>:<name>:<size>`), so re-sending a message is safe.

- Schedule: `0 14 * * *` UTC (10:00 Eastern / Indiana, 9:00 in winter)
- Model: `claude-sonnet-5-5`
- Connector: Gmail
- Secret coupling: `STYLEMATE_INGEST_SECRET` must match in Vercel AND the prompt below,
  or every run 401s. The live prompt holds the real value; this copy uses a placeholder.

## Prompt

```
You run once a day for StyleMate, a private wardrobe app. Find new clothing purchases in Gmail and send them to the app.

1. Search Gmail (search_threads) with:
   newer_than:3d (subject:(order OR "order confirmation" OR "your order" OR "in the bag" OR purchase OR receipt OR "thanks for your order") OR category:purchases) -subject:(shipped OR dispatched OR delivered OR "out for delivery" OR return OR refund OR review)
   Page through every result. Skip marketing/promo emails (no order number or no line items).

2. For each order confirmation from a retailer that sells clothing, shoes, jewelry, watches, bags, hats, belts or other wearable accessories (e.g. boohooMAN, ASOS, Zara, H&M, Nike, Adidas, Amazon, Depop, Grailed, StockX, Shein, Uniqlo, PacSun, Urban Outfitters, Mejuri), open the message with get_message using FULL_CONTENT so the HTML body is available. Ignore non-wearable lines (electronics, food, books, gift cards, shipping protection).

3. Build one entry per order:
   {"message_id": "<Gmail message id>", "retailer": "<store name>", "ordered_at": "<ISO 8601 date from the email>",
    "lines": [{"name": "<product name exactly as listed>", "brand": "<brand if different from retailer, else null>",
               "color": "<color/colour>", "size": "<size>", "price": <number or null>,
               "image_url": "<https product image src for this line, or null>",
               "product_url": "<https product link for this line, or null>",
               "category_hint": "<top|bottom|outerwear|footwear|jewelry|accessory|bag>"}]}
   The product image is the <img> next to each line item in the HTML (for boohooMAN they look like https://mediahub.boohooman.com/cmm03928_white_xl?qlt=85&w=128...). Decode &amp; to &. Never use logos, icons, social or app-store images. If quantity is above 1, still send a single line.

4. If you found at least one wearable line, POST everything in one request:
   curl -sS -X POST https://stephenonochie.com/api/stylemate/ingest \
     -H "Authorization: Bearer STYLEMATE_INGEST_SECRET_VALUE" \
     -H "Content-Type: application/json" \
     --data @orders.json
   with orders.json = {"orders": [ ...entries... ]}. Write the JSON with a file, not inline, so quotes in product names stay intact.

5. Report the API response (inserted / skipped_duplicates / skipped_not_clothing / failed) and list the orders you sent. If nothing was found, say so and stop. Do not modify, label, archive or reply to any email. Do not change any files in the repository.
```
