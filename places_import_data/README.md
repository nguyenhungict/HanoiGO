# HanoiGO Places Import Folder

Use this folder to prepare the descriptions and images for the existing heritage sites in the database.

## How to use:

1. **Place Images**: Put all your image files (.jpg, .png, etc.) inside the `images/` directory.
2. **Edit Data**: Edit `places_data.json` to fill in:
   - `descriptionEn`: Detailed English description of the place.
   - `coverImageFilename`: The exact filename of the main photo you put in `images/` (e.g., `hoan_kiem.jpg`).
   - `galleryFilenames`: A list of filenames for the gallery images you put in `images/` (e.g., `["hoan_kiem_1.jpg", "hoan_kiem_2.jpg"]`).
3. **Notify Antigravity**: When you are done filling the JSON and adding the images, reply **"OK"** or **"Proceed with import"**. Antigravity will automatically upload the images to the NestJS server uploads directory (`actions/public/uploads`) and update the database records.
