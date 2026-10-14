# User guide

## Start a workspace

1. Open the app and sign in or sign up.
2. Select an account card to open its workspace.
3. Use the new-project control to add another Instagram handle/profile URL.
4. Switch accounts from the navigation bar.

The dashboard shows account metadata and attached creator profiles. Its browser-style panel displays Posts/Reels and supports refresh and fullscreen. Cloud retrieval can be blocked by Instagram or fall back to cached information.

References, scripts, and boards are currently shared across accounts. Choosing another account changes the workspace context, not the entire creative library's visibility.

## Collect reference ideas

Scroll to the workflow studios and choose **Reference Ideas**. Add a reel/post link or an image reference, give it a useful title, and save it. Search and sorting help find saved inspiration; the initial sort is oldest first.

Open a reference to inspect its media, referring creator, reactions, and discussion. Use notes to identify the hook, a possible adaptation, or filming requirements. Playback depends on the available media URL/embed and external availability.

## Write a script

1. Choose **Scripts**, then create a new script.
2. Enter a title, opening hook, dialogue, visual beats, and call to action.
3. Optionally attach an existing reference or a custom reel URL.
4. Save the script.
5. Open a saved card in view mode. Choose **Edit Script** to revise it.
6. Use **Copy** or the download control to export the text.

The discussion panel collects feedback separately from the script body. Save changes before exporting to ensure the export uses the saved document.

## Sketch a storyboard

1. Choose **Storyboard**, then **New Storyboard**.
2. Give the board a title and optionally attach a reference.
3. Use pencil/brush, eraser, line, rectangle, circle, arrow, or text tools.
4. Choose a color and stroke size. Use undo/redo as needed.
5. Use **Add Pic** to import an image onto the canvas.
6. Save the board, or download its canvas as a PNG.

Saved boards open in view mode; **Edit Canvas / Paint** enters drawing mode. The scene discussion supports shot direction and pacing notes. Large imported images and PNG snapshots can fill local browser storage.

## Profile and appearance

Use the profile-settings control to manage creator details. The navigation theme toggle switches light/dark appearance. Phone layouts hide the desktop profile browser panel.

## Administrator views

The admin portal is accessed directly at `/admin`. Its views cover analytics, presence, permissions, and an activity timeline. Use a dedicated development database for evaluation. The application's local administrator fallback and public database policies are development conveniences, not production security. The final SQL no longer seeds an administrator password.

## Saving and deletion

The app uses local storage and attempts Supabase synchronization. A saved indicator alone does not prove that a cloud write succeeded. Local storage is specific to the browser and origin. Some **Clear All** operations apply to shared libraries rather than one selected account; use them only when you intend that broader deletion.
