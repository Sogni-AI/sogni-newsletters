# sogni-newsletters

This is an archive of all Sogni Newsletters found at https://news.sogni.ai/sogni-sync/

# Webmaster tips:

For each new newsletter:

1. Create new file at `./sogni-sync/3.html` where 3 is the edition of the newsletter. Copy HTML of newsletter there.
2. In this folder run `node rewrite-images.js 3.html` in terminal which will download all 3rd party referenced images locally to the `./assets` folder and rewrite all references to those local downloaded files.
3. Open this new html file to ensure all media links still work.
4. Git checkin the updates. Run `./sync.sh` in the same folder to push the changes to the server.
