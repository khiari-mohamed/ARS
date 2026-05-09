# Database Update Instructions

## Step 1: Push schema changes (remove default value)
cd d:\ARS\server
npx prisma db push

## Step 2: The field is now nullable with NO default
- New clients: modeRecuperation will be NULL until user selects a value
- Existing clients: modeRecuperation is already NULL (or has a value if manually set)

## Step 3: Frontend now shows:
- Empty dropdown with "Sélectionner un mode" placeholder
- User MUST select a value (field is required)
- No confusion with automatic defaults

## Result:
✅ No default value in database
✅ No default value in frontend forms
✅ User must explicitly choose mode de récupération
✅ Finance dashboard shows "-" for NULL values (clients without mode set)
✅ Finance dashboard shows proper label for clients with mode set
