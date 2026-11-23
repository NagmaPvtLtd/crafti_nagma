- I want you to update the `src\assets\docs\Project_Based\README_COLLECTIONS.md` or whatever related context file in the docs folder and the frontend files and backend files based on the scenario and stuff im telling you to do:

1. Th collection page & search page will always show the:
   name: base product name
   brief/full description: base product name
   review/stars: all total reviews + total stars etc etc from all the variants combined
   the thumbnail: the is_featured = true wala variant ka first image otherwise as fallback , the first variant's first_image
   price / compare price etc would be the same variant jisme is_feature = true hai / otherwise as fallback first variant ka price + compare price etc.
2. When we open the product and now we are in the public product page now we will:

- show the title: us variant ka product name, brief desc, description
- i do not then think we need a : You are currently viewing:

Crochet Handmade Small Roses

so we will replace it with:

3. Quantity management that increment and decrement whose max would be only 99 and going above this would show a notice on the frontend that , bulk-order subject to terms and condition and take long time to deliver
4. right side of this would be the Add to Cart button
5. ( step 3, step 4 ) these would show coming soon when clicked.
6. and right side of this would be: a small button square type with whatsapp logo ( find the component alreayd made in socialMediaIcons ig? ): and when clicked on that, it'll open the whatsapp with a message like this:
   `
   Hello, crafti nagma. I am interest in this product of yours!

Product Name: {variant_product_name}
Product ID: (variant_product_code)
`
