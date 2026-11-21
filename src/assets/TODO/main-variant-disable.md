scenario:

- There is a variant in which i uploaded a photo ( V-A )
- Then i created more variant ( V-B ) and shallow link from V-A so i can see the photo in both of them.
- Then when i am disabling the ( V-A ). By logic it would delete all the imagekit if uploaded or delink shallow linking
- But in this case the ( V-B ) in this case would now show be messed up.

what to do ( final approach )

- when ( V-A ) is disabled

1. it will delete the imagekit file
2. delete from database
3. whoever is using the image will be delinked
4. then we check who were using that image and if they currently have no image ( like 0 image ) via direct upload or / shallow linking then it means that product currently has ZERO image shown to the public
5. in this case we'll disable this variant.
