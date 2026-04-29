rsync -ar --progress --chmod=Du+rwx,Dgo+rx,Fu+rwx,Fgo+rx --exclude='.git' . sogni-api:/var/www/news.sogni.ai/sogni-sync/
