rsync -ar --progress --chmod=Du+rwx,go+rx,Fu+rw,go+r --exclude='.git' . sogni-api:/var/www/news.sogni.ai/sogni-sync/
